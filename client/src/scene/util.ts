import * as THREE from 'three';

/** scale an object so its bounding box becomes w × h × d (any of them may be null = keep ratio) and stand it on y=0 */
export function fitTo(o: THREE.Object3D, w: number | null, h: number | null, d: number | null) {
  const box = new THREE.Box3().setFromObject(o); const size = box.getSize(new THREE.Vector3());
  const sx = w ? w / size.x : null, sy = h ? h / size.y : null, sz = d ? d / size.z : null;
  const u = sx ?? sy ?? sz ?? 1;
  o.scale.set(sx ?? u, sy ?? u, sz ?? u);
  const b2 = new THREE.Box3().setFromObject(o); const c = b2.getCenter(new THREE.Vector3());
  o.position.x -= c.x; o.position.z -= c.z; o.position.y -= b2.min.y;
  const g = new THREE.Group(); g.add(o); return g;
}

/** small procedural textures so the room needs no image downloads */
export function plankTexture(base = '#b98a5e') {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d')!;
  const col = new THREE.Color(base);
  for (let row = 0; row < 8; row++) {
    let off = (row % 2) * 128 + ((row * 97) % 60);
    for (let i = -1; i < 3; i++) {
      const shade = col.clone().offsetHSL(0, 0, ((row * 7 + i * 13) % 9 - 4) * 0.012);
      x.fillStyle = `#${shade.getHexString()}`; x.fillRect(off + i * 256, row * 64, 256, 64);
      x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(off + i * 256, row * 64, 2, 64);
    }
    x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(0, row * 64, 512, 2);
    for (let k = 0; k < 40; k++) { x.fillStyle = `rgba(60,30,10,${0.03 + (k % 5) * 0.01})`; x.fillRect((k * 53 + row * 31) % 512, row * 64 + 8 + (k * 7) % 48, 60 + (k % 4) * 30, 1); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function plasterTexture(base = '#efe6d8') {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d')!;
  x.fillStyle = base; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) { x.fillStyle = `rgba(${i % 2 ? '255,255,255' : '90,70,50'},${0.025 + (i % 7) * 0.004})`; x.fillRect((i * 73) % 256, (i * 151) % 256, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
