// Retargets Quaternius "Universal Animation Library" clips (CC0) onto the Quaternius
// "Ultimate Modular Men / Women" rig (CC0), so the modular characters can sit, walk and talk.
// Method: per bone, keep the source's world-space rotation *change* from its rest pose
// (targetWorld = srcWorld * inv(srcRestWorld) * targetRestWorld). Hips height is scaled by leg length.
// The target rig keeps its feet under Root (IK style), so feet are placed by forward kinematics.
// Usage: node retarget.mjs  → writes ../client/public/avatars/clips-m.json and clips-f.json
import fs from 'node:fs';
import * as THREE from 'three';
import { load } from './inspect.mjs';
import { encodeClip } from '../client/src/avatar/clipCodec.js';

const FPS = 24;
const MAP = {
  pelvis: 'Hips', spine_01: 'Abdomen', spine_02: 'Torso', spine_03: 'Chest', neck_01: 'Neck', Head: 'Head',
  thigh_l: 'UpperLegL', calf_l: 'LowerLegL', foot_l: 'FootL', thigh_r: 'UpperLegR', calf_r: 'LowerLegR', foot_r: 'FootR',
  clavicle_l: 'ShoulderL', upperarm_l: 'UpperArmL', lowerarm_l: 'LowerArmL', hand_l: 'WristL',
  clavicle_r: 'ShoulderR', upperarm_r: 'UpperArmR', lowerarm_r: 'LowerArmR', hand_r: 'WristR',
};
for (const s of ['l', 'r']) {
  const S = s.toUpperCase();
  for (const [a, b] of [['index', 'Index'], ['middle', 'Middle'], ['ring', 'Ring'], ['pinky', 'Pinky']]) for (const i of [1, 2, 3]) MAP[`${a}_0${i}_${s}`] = `${b}${i}${S}`;
  for (const i of [1, 2, 3]) MAP[`thumb_0${i}_${s}`] = `Thumb${i}${S}`;
}
// name in our game → [UAL source clip, derived desk work (see DESK), duration override]
export const CLIPS = {
  SitDown: ['Sitting_Enter'], Sit: ['Sitting_Idle_Loop'], SitTalk: ['Sitting_Talking_Loop'], StandUp: ['Sitting_Exit'],
  Talk: ['Idle_Talking_Loop'], Dance: ['Dance_Loop'], Interact: ['Interact'],
  SitType: ['Sitting_Idle_Loop', 'type', 4], SitWrite: ['Sitting_Idle_Loop', 'write', 4], SitRead: ['Sitting_Idle_Loop', 'read', 6],
  // reactions (user, 2026-11-03: the emoji buttons must do something, sitting or standing)
  SitWave: ['Sitting_Idle_Loop', 'wave', 2], SitClap: ['Sitting_Idle_Loop', 'clap', 2], Clap: ['Idle_Loop', 'clap', 2],
  SitCheer: ['Sitting_Idle_Loop', 'cheer', 2], Cheer: ['Idle_Loop', 'cheer', 2], SitHeart: ['Sitting_Idle_Loop', 'heart', 2], Heart: ['Idle_Loop', 'heart', 2],
  SitDrink: ['Sitting_Idle_Loop', 'drink', 3], Drink: ['Idle_Loop', 'drink', 3],
};
const EMOTE = ['wave', 'clap', 'cheer', 'heart', 'drink'];
// Native clips of the modular rig that look better than a retarget
const NATIVE = ['Idle', 'Walk', 'Wave', 'Interact'];
// desk top height in metres in the room; the female rig is drawn at 0.9 scale (it is modelled taller)
export const SCALE = { m: 1, f: 0.9 };
const DESK_Y = 0.76;

const bones = (root) => { const m = {}; root.traverse((o) => { if (o.isBone) m[o.name] = o; }); return m; };
// rest pose = the glTF node transforms (skeleton.pose() is unreliable for the UAL file's bind matrices)
const restPose = (root) => { root.updateMatrixWorld(true); };
const wq = (o) => o.getWorldQuaternion(new THREE.Quaternion());
const wp = (o) => o.getWorldPosition(new THREE.Vector3());

// still tracks are kept (stored once by the codec): a still bone can still be far from its rest pose
const dropStatic = (tracks) => tracks;

/* ---------- desk work: two-bone IK puts the hands on the desk ---------- */
const V = () => new THREE.Vector3();
function aimBone(bone, childPos, target) {
  // rotate `bone` (world space) so the direction to its child points at `target`
  const p = wp(bone);
  const from = childPos.clone().sub(p).normalize(), to = target.clone().sub(p).normalize();
  const dq = new THREE.Quaternion().setFromUnitVectors(from, to);
  const w = dq.multiply(wq(bone));
  bone.quaternion.copy(wq(bone.parent).invert().multiply(w));
  bone.updateMatrixWorld(true);
}
// hand orientation on the desk: fingers point `fwd` (world), back of the hand faces up. The rig's rest pose
// has fingers along ±X with the back of the hand up (+Y), so map that rest basis onto the wanted one.
const REST_W = {};
function basis(f, up) {
  const x = f.clone().normalize(), z = new THREE.Vector3().crossVectors(x, up).normalize(), y = new THREE.Vector3().crossVectors(z, x);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}
function placeHand(TB, side, fwd, up = new THREE.Vector3(0, 1, 0)) {
  const wr = TB['Wrist' + side];
  const rest = basis(new THREE.Vector3(side === 'L' ? 1 : -1, 0, 0), new THREE.Vector3(0, 1, 0)), want = basis(fwd, up);
  const w = want.multiply(rest.invert()).multiply(REST_W[side]);
  wr.quaternion.copy(wq(wr.parent).invert().multiply(w)); wr.updateMatrixWorld(true);
}
/** fingers forward, turned `inward` (rad) toward the body's middle and tipped `down` toward the desk */
const handDir = (side, inward, down) => {
  const s = side === 'L' ? -1 : 1; // left hand sits at +X, so inward is -X
  return new THREE.Vector3(s * Math.sin(inward), -Math.sin(down), Math.cos(inward)).normalize();
};
function armIK(TB, side, target, pole) {
  const up = TB['UpperArm' + side], lo = TB['LowerArm' + side], wr = TB['Wrist' + side];
  const a = wp(up), b = wp(lo), c = wp(wr);
  const l1 = a.distanceTo(b), l2 = b.distanceTo(c);
  const d = Math.min(l1 + l2 - 1e-3, Math.max(1e-3, a.distanceTo(target)));
  const dir = target.clone().sub(a).normalize();
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const n = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  const elbow = a.clone().add(dir.clone().multiplyScalar(cosA * l1)).add(n.multiplyScalar(sinA * l1));
  aimBone(up, b, elbow);
  aimBone(lo, wp(wr), a.clone().add(dir.multiplyScalar(d)));
}
function tilt(bone, axis, angle) { bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axis, angle)); bone.updateMatrixWorld(true); }
function curl(TB, side, amount) {
  for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) for (const i of [1, 2, 3]) { const b = TB[f + i + side]; if (b) tilt(b, new THREE.Vector3(1, 0, 0), -amount * (i === 1 ? 0.6 : 1)); }
}
/* ---------- reactions: hands placed by IK on top of the sitting / standing idle ---------- */
function emotePose(TB, kind, t) {
  const C = wp(TB.Chest), Hd = wp(TB.Head), v = (x, y, z) => new THREE.Vector3(x, y, z);
  const pole = (s) => v(s * 0.9, -0.6, -0.4).normalize();
  const out = (side) => v(side === 'L' ? 1 : -1, 0, 0);
  if (kind === 'clap') {
    // hands meet in front of the chest about three times a second
    const open = 0.5 + 0.5 * Math.cos(2 * Math.PI * t * 1.5), gap = 0.035 + 0.11 * open;
    for (const [side, sx] of [['L', 1], ['R', -1]]) {
      armIK(TB, side, v(C.x + sx * gap, C.y + 0.02, C.z + 0.3), pole(sx));
      placeHand(TB, side, v(0, 0.55, 1), out(side)); curl(TB, side, 0.1);
    }
  } else if (kind === 'cheer') {
    // both arms up, bouncing
    const b = 0.05 * Math.abs(Math.sin(2 * Math.PI * t));
    for (const [side, sx] of [['L', 1], ['R', -1]]) {
      armIK(TB, side, v(C.x + sx * 0.28, Hd.y + 0.3 + b, C.z + 0.06), pole(sx));
      placeHand(TB, side, v(sx * 0.2, 1, 0.1), v(0, 0, -1)); curl(TB, side, 0.75);
    }
  } else if (kind === 'heart') {
    // fingertips together in front of the chest, a small beat
    const k = 1 + 0.06 * Math.max(0, Math.sin(2 * Math.PI * t * 1.2)) ** 4;
    for (const [side, sx] of [['L', 1], ['R', -1]]) {
      armIK(TB, side, v(C.x + sx * 0.05 * k, C.y + 0.04, C.z + 0.28), pole(sx));
      placeHand(TB, side, v(-sx * 0.7, 0.75, 0.15), v(0, 0, 1)); curl(TB, side, 0.55);
    }
  } else if (kind === 'drink') {
    // the right hand brings a cup up to the mouth twice
    const sip = Math.max(0, Math.sin(2 * Math.PI * (t / 1.5))) ** 2;
    const rest = v(C.x - 0.12, C.y - 0.06, C.z + 0.26), mouth = v(Hd.x - 0.03, Hd.y - 0.06, Hd.z + 0.13);
    armIK(TB, 'R', rest.clone().lerp(mouth, sip), pole(-1));
    placeHand(TB, 'R', v(1, 0.2, 0.3), v(0, 0, 1)); curl(TB, 'R', 0.95);
    tilt(TB.Head, new THREE.Vector3(1, 0, 0), -0.25 * sip);
  } else if (kind === 'wave') {
    // right hand up by the head, swinging
    const sw = 0.09 * Math.sin(2 * Math.PI * t * 1.5);
    armIK(TB, 'R', v(C.x - 0.3 + sw, Hd.y + 0.08, C.z + 0.12), pole(-1));
    placeHand(TB, 'R', v(sw * 2, 1, 0.05), v(0, 0, -1)); curl(TB, 'R', 0.05);
  }
}
function deskPose(TB, kind, t, deskY) {
  if (EMOTE.includes(kind)) return emotePose(TB, kind, t);
  const H = wp(TB.Hips);
  const X = new THREE.Vector3(1, 0, 0);
  // lean in and look down at the desk
  tilt(TB.Abdomen, X, 0.06); tilt(TB.Chest, X, 0.08); tilt(TB.Head, X, kind === 'read' ? 0.38 : 0.32);
  const pole = (s) => new THREE.Vector3(s * 0.9, -0.6, -0.4).normalize();
  const tap = (ph) => 0.012 * Math.max(0, Math.sin(2 * Math.PI * (t * 3.2 + ph)));
  if (kind === 'type') {
    armIK(TB, 'L', new THREE.Vector3(H.x + 0.15, deskY + 0.05 + tap(0), H.z + 0.42), pole(1));
    armIK(TB, 'R', new THREE.Vector3(H.x - 0.15, deskY + 0.05 + tap(0.5), H.z + 0.42), pole(-1));
    placeHand(TB, 'L', handDir('L', 0.3, 0.12)); placeHand(TB, 'R', handDir('R', 0.3, 0.12));
    curl(TB, 'L', 0.35 + 3 * tap(0.25)); curl(TB, 'R', 0.35 + 3 * tap(0.75));
  } else if (kind === 'write') {
    const wx = 0.035 * Math.sin(2 * Math.PI * t * 0.75), wz = 0.012 * Math.sin(2 * Math.PI * t * 3);
    armIK(TB, 'R', new THREE.Vector3(H.x - 0.1 + wx, deskY + 0.045, H.z + 0.4 + wz), pole(-1));
    armIK(TB, 'L', new THREE.Vector3(H.x + 0.22, deskY + 0.035, H.z + 0.34), pole(1));
    placeHand(TB, 'R', handDir('R', 0.45, 0.2)); placeHand(TB, 'L', handDir('L', 0.5, 0.05));
    curl(TB, 'R', 0.85); curl(TB, 'L', 0.2);
  } else if (kind === 'read') {
    // a book lying open on the desk, a hand on each side of it; the right hand turns a page every few seconds
    const turn = Math.max(0, Math.sin(2 * Math.PI * (t / 6))) ** 8;
    armIK(TB, 'L', new THREE.Vector3(H.x + 0.17, deskY + 0.03, H.z + 0.36), pole(1));
    armIK(TB, 'R', new THREE.Vector3(H.x - 0.17 + 0.15 * turn, deskY + 0.03 + 0.05 * turn, H.z + 0.36 + 0.03 * turn), pole(-1));
    placeHand(TB, 'L', handDir('L', 0.45, 0.08)); placeHand(TB, 'R', handDir('R', 0.45 + 0.5 * turn, 0.08 - 0.3 * turn));
    curl(TB, 'L', 0.25); curl(TB, 'R', 0.25 + 0.35 * turn);
  }
}

export async function buildFor(targetFile, srcGltf, scale = 1) {
  const deskYModel = DESK_Y / scale;
  const tgt = await load(targetFile);
  const src = srcGltf;
  // the source may still be posed by a previous run: put every node back to its glTF rest transform
  src.scene.traverse((o) => { if (o.userData.rest) { o.position.copy(o.userData.rest.p); o.quaternion.copy(o.userData.rest.q); } else o.userData.rest = { p: o.position.clone(), q: o.quaternion.clone() }; });
  restPose(src.scene); restPose(tgt.scene);
  const SB = bones(src.scene), TB = bones(tgt.scene);
  const tRoot = TB.Root;
  // rest data
  const srcRestQ = {}, tgtRestQ = {}, tgtRestLocal = {};
  for (const [s, t] of Object.entries(MAP)) { if (!SB[s] || !TB[t]) throw new Error('missing ' + s + '/' + t); srcRestQ[s] = wq(SB[s]); tgtRestQ[t] = wq(TB[t]); }
  for (const [n, b] of Object.entries(TB)) tgtRestLocal[n] = { q: b.quaternion.clone(), p: b.position.clone() };
  REST_W.L = wq(TB.WristL); REST_W.R = wq(TB.WristR);
  const srcPelvis0 = wp(SB.pelvis), tgtHips0 = wp(TB.Hips), body0 = wp(TB.Body);
  const ratio = tgtHips0.y / srcPelvis0.y;
  // foot offset relative to the lower leg in rest pose (for forward kinematics)
  const footOff = {};
  for (const s of ['L', 'R']) footOff[s] = new THREE.Matrix4().copy(TB['LowerLeg' + s].matrixWorld).invert().multiply(TB['Foot' + s].matrixWorld);
  const inv = Object.fromEntries(Object.entries(MAP).map(([s, t]) => [t, s]));
  // DFS order, feet last
  const order = []; tRoot.traverse((o) => { if (o.isBone) order.push(o); });
  order.sort((a, b) => (a.name.startsWith('Foot') ? 1 : 0) - (b.name.startsWith('Foot') ? 1 : 0));

  const mixer = new THREE.AnimationMixer(src.scene);
  const out = [];
  let sitHipY = null;
  for (const [name, [srcName, desk, durOverride]] of Object.entries(CLIPS)) {
    if (NATIVE.includes(name)) continue;
    const clip = src.animations.find((c) => c.name === srcName); if (!clip) throw new Error('no clip ' + srcName);
    mixer.stopAllAction(); const act = mixer.clipAction(clip); act.play();
    const duration = durOverride || clip.duration;
    const n = Math.max(2, Math.round(duration * FPS) + 1);
    const times = [], tracksQ = {}, bodyPos = [], footPos = { L: [], R: [] };
    for (let i = 0; i < n; i++) {
      const t = Math.min(duration, i / FPS); times.push(+t.toFixed(4));
      mixer.setTime(t % clip.duration); src.scene.updateMatrixWorld(true);
      for (const b of order) {
        const rest = tgtRestLocal[b.name];
        if (b.name.startsWith('Foot')) {
          const s = b.name.slice(4);
          const m = new THREE.Matrix4().copy(TB['LowerLeg' + s].matrixWorld).multiply(footOff[s]);
          const p = new THREE.Vector3().setFromMatrixPosition(m);
          b.position.copy(b.parent.worldToLocal(p.clone()));
        } else if (b.name === 'Body') {
          const d = wp(SB.pelvis).sub(srcPelvis0).multiplyScalar(ratio);
          const p = body0.clone().add(d);
          b.position.copy(b.parent.worldToLocal(p));
        } else b.position.copy(rest.p);
        const s = inv[b.name];
        if (s) {
          const desired = wq(SB[s]).multiply(srcRestQ[s].clone().invert()).multiply(tgtRestQ[b.name]);
          const parentQ = wq(b.parent);
          b.quaternion.copy(parentQ.invert().multiply(desired));
        } else b.quaternion.copy(rest.q);
        b.updateWorldMatrix(false, false);
      }
      if (desk) { deskPose(TB, desk, t, deskYModel); tRoot.updateMatrixWorld(true); }
      for (const b of order) {
        const s = inv[b.name];
        if (s || b.name.startsWith('Foot') || (desk && /Index|Middle|Ring|Pinky/.test(b.name))) (tracksQ[b.name] ||= []).push(...b.quaternion.toArray().map((v) => +v.toFixed(4)));
        if (b.name === 'Body') bodyPos.push(...b.position.toArray().map((v) => +v.toFixed(4)));
        if (b.name.startsWith('Foot')) footPos[b.name.slice(4)].push(...b.position.toArray().map((v) => +v.toFixed(4)));
      }
      if (name === 'Sit' && i === 0) sitHipY = wp(TB.Hips).y;
    }
    const tracks = Object.entries(tracksQ).map(([bn, values]) => ({ name: bn + '.quaternion', values }));
    tracks.push({ name: 'Body.position', values: bodyPos });
    for (const s of ['L', 'R']) tracks.push({ name: `Foot${s}.position`, values: footPos[s] });
    out.push(encodeClip(name, duration, FPS, n, dropStatic(tracks)));
    // reset target to rest for the next clip
    for (const [nme, b] of Object.entries(TB)) { b.quaternion.copy(tgtRestLocal[nme].q); b.position.copy(tgtRestLocal[nme].p); }
    tgt.scene.updateMatrixWorld(true);
  }
  // keep the rig's own clips (rotation tracks only)
  for (const keep of NATIVE) {
    const c = tgt.animations.find((a) => a.name === keep); if (!c) continue;
    const n = Math.max(2, Math.round(c.duration * FPS) + 1);
    const tracks = c.tracks.filter((t) => t.name.endsWith('.quaternion') || /^(Body|Foot[LR])\.position$/.test(t.name)).map((t) => {
      const it = t.createInterpolant(); const values = [];
      for (let i = 0; i < n; i++) values.push(...it.evaluate(Math.min(c.duration, i / FPS)));
      return { name: t.name, values };
    });
    out.push(encodeClip(keep, c.duration, FPS, n, dropStatic(tracks)));
  }
  return { clips: out, meta: { sitHipY: +(sitHipY * scale).toFixed(4), hipY: +tgtHips0.y.toFixed(4), ratio: +ratio.toFixed(4), fps: FPS } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const src = await load('avatar-src/UAL1_Standard.glb');
  fs.mkdirSync('../client/public/avatars', { recursive: true });
  for (const g of ['m', 'f']) {
    const r = await buildFor(`avatar-src/${g === 'm' ? 'men' : 'women'}.glb`, src, SCALE[g]);
    r.meta.scale = SCALE[g];
    const file = `../client/public/avatars/clips-${g}.json`;
    fs.writeFileSync(file, JSON.stringify(r));
    console.log(file, (fs.statSync(file).size / 1024).toFixed(0) + ' KB', r.meta);
  }
}
