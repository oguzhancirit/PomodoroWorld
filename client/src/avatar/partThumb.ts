// Shop pictures for outfit parts: dress the player's own character in that part, pose it, and take a small photo
// focused on the part (head = face, body = torso, legs, feet). One hidden renderer, photos are cached.
import * as THREE from 'three';
import { useEffect, useState } from 'react';
import { decodeAvatar, encodeAvatar, type Item } from '@pw/shared';
import { loadRig, buildAvatar, disposeAvatar } from './assets';

const W = 256, H = 168; // same shape as the shop card picture
let R: THREE.WebGLRenderer | null = null, S: THREE.Scene, C: THREE.PerspectiveCamera;
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
let queue = Promise.resolve(); // one photo at a time, so the shared renderer is never busy twice

function setup() {
  R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  R.setPixelRatio(1); R.setSize(W, H); R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
  S = new THREE.Scene();
  S.add(new THREE.HemisphereLight('#fff6ec', '#4a3f5e', 1.6));
  const key = new THREE.DirectionalLight('#fff1e0', 2.2); key.position.set(2, 4, 4); S.add(key);
  const rim = new THREE.DirectionalLight('#9db7ff', 0.9); rim.position.set(-3, 2, -2); S.add(rim);
  C = new THREE.PerspectiveCamera(26, W / H, 0.05, 50);
}

const at = (root: THREE.Object3D, bone: string) => root.getObjectByName(bone)!.getWorldPosition(new THREE.Vector3());
const y = (root: THREE.Object3D, bone: string) => at(root, bone).y;
/** bottom and top of the photo for each slot, from the bones of the posed body */
function span(root: THREE.Object3D, slot: Item['slot'], top: number): [number, number] {
  const head = y(root, 'Head'), neck = y(root, 'Neck'), hips = y(root, 'Hips'), knee = y(root, 'LowerLegL'), foot = y(root, 'FootL');
  const tall = head; // body size, so men and women are framed the same way
  if (slot === 'head') return [neck - tall * 0.02, Math.min(top + tall * 0.02, head + tall * 0.3)];
  if (slot === 'body') return [hips - tall * 0.04, neck + tall * 0.03];
  if (slot === 'legs') return [foot - tall * 0.02, hips + tall * 0.05];
  return [-tall * 0.015, foot + (knee - foot) * 0.55];
}

async function shoot(it: Item, base: string): Promise<string> {
  if (!R) setup();
  const rig = await loadRig(it.g!);
  const own = decodeAvatar(base); // keep the player's colours, swap only this part
  const code = encodeAvatar({ ...(own.g === it.g ? own : decodeAvatar(`${it.g}.0.0.0.0.${own.skin}.${own.hair}.${own.top}.${own.bottom}`)), [it.slot!]: it.part! });
  const { root } = buildAvatar(rig, code);
  const idle = rig.clips.Idle;
  const mixer = new THREE.AnimationMixer(root);
  if (idle) { mixer.clipAction(idle).play(); mixer.update(0.4); }
  root.rotation.y = it.slot === 'feet' ? -0.25 : 0.35;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root, true);
  const [lo, hi] = span(root, it.slot, box.max.y);
  const mid = (lo + hi) / 2, half = ((hi - lo) / 2) * 1.08;
  const dist = half / Math.tan(THREE.MathUtils.degToRad(C.fov / 2));
  // shoes: aim at the middle of both feet (toes included) and look down at them a little
  const c = it.slot === 'feet' ? ['FootL', 'FootR', 'PTL', 'PTR'].reduce((v, b) => v.add(at(root, b)), new THREE.Vector3()).multiplyScalar(0.25) : new THREE.Vector3();
  const lift = it.slot === 'feet' ? half * 0.6 : half * 0.15;
  C.position.set(c.x, mid + lift, c.z + dist);
  C.lookAt(c.x, mid, c.z);
  S.add(root); R!.render(S, C); S.remove(root);
  mixer.stopAllAction(); disposeAvatar(root);
  return R!.domElement.toDataURL('image/png');
}

/** Photo of an outfit part on the player's character; '' until it is ready. */
export function partThumb(it: Item, base: string): Promise<string> {
  const key = `${it.id}|${base}`;
  const hit = cache.get(key); if (hit) return Promise.resolve(hit);
  let p = pending.get(key);
  if (!p) {
    p = queue.then(() => shoot(it, base)).then((url) => { cache.set(key, url); return url; }, () => '');
    queue = p.then(() => undefined); pending.set(key, p);
  }
  return p;
}

export function usePartThumb(it: Item, base: string) {
  const key = `${it.id}|${base}`;
  const [url, setUrl] = useState(() => cache.get(key) ?? '');
  useEffect(() => {
    let live = true; const hit = cache.get(key);
    if (hit) { setUrl(hit); return; }
    setUrl(''); partThumb(it, base).then((u) => { if (live) setUrl(u); });
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return url;
}
