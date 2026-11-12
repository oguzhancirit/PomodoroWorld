// Accessories drawn on the character's head (user 2026-11-03: your own style). The Quaternius models have no
// glasses or hats, so they are simple shapes fixed to the Head bone. Measured on the rig in its rest pose:
// the Head bone sits at the neck top with no rotation; the face front is ~0.11 m ahead of it, eyes ~0.10 m above,
// the skull top ~0.25 m above, and the head is ~0.23 m wide. All numbers below are in that head space.
import * as THREE from 'three';
import { ACCESSORIES } from '@pw/shared';

const std = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...o });
const add = (g: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; g.add(me); return me; };

const BUILD: Record<string, (g: THREE.Group) => void> = {
  glasses(g) {
    const frame = std('#2A2B33', { metalness: 0.3, roughness: 0.4 }), lens = std('#CFE6F5', { transparent: true, opacity: 0.25, roughness: 0.05 });
    for (const sx of [-1, 1]) {
      add(g, new THREE.TorusGeometry(0.03, 0.0045, 8, 24), frame, sx * 0.045, 0.1, 0.122);
      add(g, new THREE.CircleGeometry(0.029, 20), lens, sx * 0.045, 0.1, 0.121);
      const arm = add(g, new THREE.BoxGeometry(0.004, 0.004, 0.12), frame, sx * 0.104, 0.104, 0.065); arm.rotation.y = sx * 0.06;
    }
    add(g, new THREE.BoxGeometry(0.03, 0.004, 0.004), frame, 0, 0.106, 0.124);
  },
  sunglasses(g) {
    const frame = std('#141218', { roughness: 0.3 }), lens = std('#1C2030', { roughness: 0.08, metalness: 0.6 });
    for (const sx of [-1, 1]) {
      const l = add(g, new THREE.BoxGeometry(0.07, 0.038, 0.008), lens, sx * 0.045, 0.1, 0.122); l.rotation.y = -sx * 0.12;
      const arm = add(g, new THREE.BoxGeometry(0.005, 0.006, 0.12), frame, sx * 0.105, 0.108, 0.065); arm.rotation.y = sx * 0.06;
    }
    add(g, new THREE.BoxGeometry(0.17, 0.008, 0.01), frame, 0, 0.122, 0.124);
  },
  catears(g) {
    const fur = std('#2A2440', { roughness: 0.9 }), inner = std('#F2A0B4', { roughness: 0.9 });
    for (const sx of [-1, 1]) {
      const e = add(g, new THREE.ConeGeometry(0.045, 0.09, 4), fur, sx * 0.075, 0.27, 0.0); e.rotation.set(0, Math.PI / 4, -sx * 0.35);
      const i = add(g, new THREE.ConeGeometry(0.026, 0.055, 4), inner, sx * 0.075, 0.262, 0.014); i.rotation.set(0, Math.PI / 4, -sx * 0.35);
    }
    const band = add(g, new THREE.TorusGeometry(0.122, 0.006, 6, 30, Math.PI), fur, 0, 0.12, 0.0); band.rotation.y = Math.PI / 2;
  },
  headphones(g) {
    const body = std('#2A2B33', { roughness: 0.4 }), pad = std('#E8553D', { roughness: 0.7 });
    const band = add(g, new THREE.TorusGeometry(0.135, 0.012, 8, 32, Math.PI), body, 0, 0.12, 0.0); band.rotation.y = Math.PI / 2;
    for (const sx of [-1, 1]) {
      const c = add(g, new THREE.CylinderGeometry(0.045, 0.045, 0.035, 20), body, sx * 0.13, 0.11, 0.0); c.rotation.z = Math.PI / 2;
      const p = add(g, new THREE.CylinderGeometry(0.038, 0.038, 0.012, 20), pad, sx * 0.152, 0.11, 0.0); p.rotation.z = Math.PI / 2;
    }
  },
  beanie(g) {
    const knit = std('#C7432F', { roughness: 0.95 }), fold = std('#A8352A', { roughness: 0.95 });
    const top = add(g, new THREE.SphereGeometry(0.14, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), knit, 0, 0.14, 0.025); top.scale.set(1, 1.05, 1.08);
    add(g, new THREE.CylinderGeometry(0.142, 0.142, 0.055, 24), fold, 0, 0.14, 0.025);
    add(g, new THREE.SphereGeometry(0.032, 12, 10), std('#F4F1EC', { roughness: 1 }), 0, 0.29, 0.025);
  },
  cap(g) {
    const cloth = std('#3E7CB1', { roughness: 0.8 });
    const top = add(g, new THREE.SphereGeometry(0.138, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), cloth, 0, 0.15, 0.02); top.scale.set(1, 0.85, 1.08);
    const brim = add(g, new THREE.CylinderGeometry(0.105, 0.105, 0.01, 24, 1, false, -Math.PI / 2, Math.PI), cloth, 0, 0.152, 0.12); brim.scale.set(1, 1, 0.9); brim.rotation.x = 0.08;
    add(g, new THREE.SphereGeometry(0.012, 8, 6), std('#F2C14E'), 0, 0.268, 0.02);
  },
  flowers(g) {
    const cols = ['#E58BB0', '#F2C14E', '#FFFFFF', '#8E6CC1', '#E8553D'];
    const ring = add(g, new THREE.TorusGeometry(0.118, 0.006, 6, 32), std('#4F9A55'), 0, 0.2, 0.02); ring.rotation.x = Math.PI / 2 - 0.15;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2, x = Math.cos(a) * 0.118, z = 0.02 + Math.sin(a) * 0.118, y = 0.2 + Math.sin(a) * 0.017;
      add(g, new THREE.SphereGeometry(0.022, 10, 8), std(cols[i % cols.length], { roughness: 0.7 }), x, y, z).scale.set(1, 0.6, 1);
      add(g, new THREE.SphereGeometry(0.008, 6, 4), std('#F2C14E'), x, y + 0.012, z);
    }
  },
  crown(g) {
    const gold = std('#E8B04A', { metalness: 0.8, roughness: 0.25 });
    add(g, new THREE.CylinderGeometry(0.09, 0.085, 0.05, 20, 1, true), gold, 0, 0.25, 0.015);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add(g, new THREE.ConeGeometry(0.02, 0.055, 4), gold, Math.cos(a) * 0.085, 0.3, 0.015 + Math.sin(a) * 0.085); }
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + Math.PI / 2; add(g, new THREE.SphereGeometry(0.012, 8, 6), std(['#C7432F', '#3E7CB1', '#2F7D5B'][i], { roughness: 0.2 }), Math.cos(a) * 0.09, 0.25, 0.015 + Math.sin(a) * 0.09); }
  },
};

/** puts accessory number `acc` on the avatar's head (no-op for 0 / unknown) */
export function addAccessory(root: THREE.Object3D, acc: number | undefined) {
  const kind = acc ? ACCESSORIES[acc] : undefined; const build = kind && BUILD[kind];
  const head = root.getObjectByName('Head');
  if (!build || !head) return;
  const g = new THREE.Group(); g.name = 'accessory'; build(g); head.add(g);
}
