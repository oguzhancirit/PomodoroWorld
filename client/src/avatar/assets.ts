// Loads the modular character files and the compact animation clips once, then hands out clones.
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { decodeAvatar, SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, type Avatar, type Gender } from '@pw/shared';
// @ts-ignore plain JS module shared with the build tool
import { decodeClip } from './clipCodec.js';
import { addAccessory } from './accessories';

const BASE = import.meta.env.BASE_URL;
// the artifact build ships each model as base64 inside a .json file (artifacts do not serve .glb files)
const PACKED = import.meta.env.VITE_MODEL_EXT === 'glb.json';
async function loadModel(path: string): Promise<GLTF> {
  if (!PACKED) return loader.loadAsync(`${BASE}${path}.glb`);
  const { glb } = await fetch(`${BASE}${path}.glb.json`).then((r) => r.json());
  const bin = atob(glb); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return loader.parseAsync(bytes.buffer, BASE);
}
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);

export interface Rig { gltf: GLTF; clips: Record<string, THREE.AnimationClip>; meta: { sitHipY: number; scale: number } }
const rigs: Partial<Record<Gender, Promise<Rig>>> = {};

export function loadRig(g: Gender): Promise<Rig> {
  return (rigs[g] ??= (async () => {
    const [gltf, json] = await Promise.all([
      loadModel(`avatars/body-${g}`),
      fetch(`${BASE}avatars/clips-${g}.json`).then((r) => r.json()),
    ]);
    gltf.scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    const clips: Record<string, THREE.AnimationClip> = {};
    for (const c of json.clips) { const clip = decodeClip(c) as THREE.AnimationClip; clips[clip.name] = clip; }
    return { gltf, clips, meta: json.meta };
  })());
}

const SLOTS = ['head', 'body', 'legs', 'feet'] as const;
const isSkin = (n: string) => /^Skin/i.test(n);
const isHair = (n: string) => /Hair|Eyebrow|Moustache|Beard/i.test(n);
const isFace = (n: string) => /^Eye(\.|$|\d)/i.test(n) || /Earring|Gold|Visor/i.test(n);

/** A dressed, coloured copy of the rig for one player. */
export function buildAvatar(rig: Rig, code: string) {
  const a: Avatar = decodeAvatar(code);
  const root = cloneSkinned(rig.gltf.scene) as THREE.Object3D;
  const keep = new Set(SLOTS.map((s) => a[s]));
  const armature = root.children[0];
  for (const part of armature.children) if (!(part as THREE.Bone).isBone) part.visible = keep.has(part.name);
  const tint = (m: THREE.MeshStandardMaterial, hex: string, mix = 1) => { m.color.lerp(new THREE.Color(hex), mix); };
  root.traverse((o) => {
    const mesh = o as THREE.Mesh; if (!mesh.isMesh || !mesh.visible) return;
    // which part does this mesh belong to?
    let p: THREE.Object3D | null = mesh; while (p && p.parent !== armature) p = p.parent;
    const slot = p ? SLOTS.find((s) => a[s] === p!.name) : undefined;
    const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
      const c = (m as THREE.MeshStandardMaterial).clone(); c.roughness = Math.max(c.roughness, 0.75); c.metalness = 0;
      const n = m.name;
      if (isSkin(n)) { if (a.skin > 0) tint(c, SKIN_TONES[a.skin], /Darker/i.test(n) ? 0.85 : 1); }
      else if (isHair(n)) { if (a.hair > 0) c.color.set(HAIR_COLORS[a.hair]); }
      else if (!isFace(n)) {
        if ((slot === 'body') && a.top > 0) tint(c, CLOTH_COLORS[a.top], 0.85);
        if ((slot === 'legs' || slot === 'feet') && a.bottom > 0 && slot === 'legs') tint(c, CLOTH_COLORS[a.bottom], 0.85);
      }
      return c;
    });
    mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
  });
  addAccessory(root, a.acc); // glasses, hats… drawn on the Head bone
  root.scale.setScalar(rig.meta.scale || 1);
  return { root, avatar: a };
}

export function disposeAvatar(root: THREE.Object3D) {
  root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose()); });
}

/* furniture (KayKit Furniture Bits, CC0) */
let furniture: Promise<GLTF> | null = null;
export const loadFurniture = () => (furniture ??= loadModel('models/furniture').then((g) => {
  g.scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}));
export function piece(g: GLTF, name: string): THREE.Object3D {
  const src = g.scene.getObjectByName(name); if (!src) return new THREE.Group();
  // keep the node's own transform: with mesh quantization it carries the geometry's real size
  const wrap = new THREE.Group(); wrap.add(src.clone(true)); return wrap;
}
