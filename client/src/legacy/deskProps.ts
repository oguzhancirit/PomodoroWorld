// What a sitting character works with (user, 2026-11-03: "okumada kitap çıksın"): an open book on the desk,
// a notebook and a pen for writing, a laptop for typing. Placed from the character's own wrists, so the props always
// sit under (or in) the hands whatever the chair, the desk or the body size.
import * as THREE from 'three';

export type DeskAct = 'read' | 'write' | 'type';
const COVERS = ['#B5463A', '#2F6E8F', '#3E7D4F', '#8A5BB0', '#C98A2E', '#2D3A5C'];
const mat = (c: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0, ...extra });
const box = (w: number, h: number, d: number, m: THREE.Material) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.castShadow = true; return o; };

/** an open book, spine along x = 0, pages facing +y */
function book(cover: string) {
  const g = new THREE.Group();
  const cm = mat(cover), pm = mat('#F4EFE4');
  for (const s of [-1, 1]) {
    const half = new THREE.Group();
    const c = box(0.135, 0.006, 0.2, cm); c.position.set(s * 0.0675, 0, 0); half.add(c);
    const p = box(0.128, 0.016, 0.19, pm); p.position.set(s * 0.064, 0.01, 0); half.add(p);
    // the two halves open in a shallow V
    half.rotation.z = -s * 0.1; g.add(half);
  }
  // a few lines of text on each page
  const lm = mat('#9C948A');
  for (const s of [-1, 1]) for (let i = 0; i < 8; i++) { const l = box(0.095, 0.001, 0.004, lm); l.position.set(s * 0.066, 0.025, -0.07 + i * 0.02); l.rotation.z = -s * 0.1; g.add(l); }
  return g;
}

/** an open notebook lying flat, and a pen */
function notebook(cover: string) {
  const g = new THREE.Group();
  const cm = mat(cover), pm = mat('#FBF8F1'), lm = mat('#A9C4DE');
  const c = box(0.25, 0.006, 0.18, cm); g.add(c);
  const p = box(0.238, 0.006, 0.17, pm); p.position.y = 0.006; g.add(p);
  for (let i = 0; i < 7; i++) { const l = box(0.22, 0.001, 0.0025, lm); l.position.set(0, 0.0095, -0.065 + i * 0.02); g.add(l); }
  const spine = box(0.006, 0.009, 0.17, mat('#C8C2B4')); spine.position.y = 0.007; g.add(spine);
  return g;
}
function pen() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.12, 8), mat('#1F2A44')); g.add(body);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0045, 0.014, 8), mat('#D9D2C3')); tip.position.y = -0.067; tip.rotation.x = Math.PI; g.add(tip);
  return g;
}
/** an open laptop: keyboard towards the person (−z), screen at the back */
function laptop() {
  const g = new THREE.Group();
  const shell = mat('#B9BEC6', { metalness: 0.3, roughness: 0.45 });
  const base = box(0.3, 0.014, 0.2, shell); g.add(base);
  const keys = box(0.25, 0.002, 0.09, mat('#2B2F36')); keys.position.set(0, 0.008, 0.02); g.add(keys);
  const pad = box(0.08, 0.002, 0.05, mat('#9EA3AB')); pad.position.set(0, 0.008, -0.065); g.add(pad);
  const lid = new THREE.Group(); lid.position.set(0, 0.007, 0.1); lid.rotation.x = 0.3; // opened a little past upright, away from the person
  const back = box(0.3, 0.19, 0.01, shell); back.position.y = 0.095; lid.add(back);
  const screen = box(0.27, 0.165, 0.002, mat('#203A5C', { emissive: '#3C6FA8', emissiveIntensity: 0.55 })); screen.position.set(0, 0.097, -0.006); lid.add(screen);
  g.add(lid);
  return g;
}

/** props for one character; `update` places them from the wrists (root-local) every frame */
export class DeskProps {
  readonly group = new THREE.Group();
  private book: THREE.Group; private note: THREE.Group; private pen: THREE.Group; private lap: THREE.Group;
  private act: DeskAct | null = null;
  private since = 0;
  private placed = false;
  private tmpL = new THREE.Vector3(); private tmpR = new THREE.Vector3();

  constructor(seed: number) {
    const cover = COVERS[Math.abs(seed) % COVERS.length];
    this.book = book(cover); this.note = notebook(COVERS[(Math.abs(seed) + 2) % COVERS.length]); this.pen = pen(); this.lap = laptop();
    for (const o of [this.book, this.note, this.pen, this.lap]) { o.visible = false; this.group.add(o); }
  }

  /** `act` null hides everything; wrists are bones of this character, root is the character's root */
  update(act: DeskAct | null, root: THREE.Object3D, wristL: THREE.Object3D | null, wristR: THREE.Object3D | null, dt: number) {
    const now = performance.now();
    if (act !== this.act) { this.act = act; this.since = now; this.placed = false; }
    // sitting down and blending into the desk clip takes about a second: show the props once the hands are near
    const show = !!act && !!wristL && !!wristR && now - this.since > 900;
    this.book.visible = show && act === 'read';
    this.note.visible = this.pen.visible = show && act === 'write';
    this.lap.visible = show && act === 'type';
    if (!show) return;
    root.updateMatrixWorld(true);
    const L = root.worldToLocal(wristL!.getWorldPosition(this.tmpL)), R = root.worldToLocal(wristR!.getWorldPosition(this.tmpR));
    const mid = L.clone().add(R).multiplyScalar(0.5);
    // on the desk under the hands; follows the settling hands slowly, so typing taps and page turns do not shake it
    const deskY = Math.min(L.y, R.y) - 0.045;
    const k = this.placed ? Math.min(1, dt * 2.5) : 1;
    if (act === 'read') { this.book.position.lerp(new THREE.Vector3(mid.x, deskY + 0.012, mid.z + 0.07), k); this.book.rotation.set(0.12, 0, 0); }
    else if (act === 'type') this.lap.position.lerp(new THREE.Vector3(mid.x, deskY, mid.z + 0.05), k);
    else { this.note.position.lerp(new THREE.Vector3(mid.x + 0.03, deskY + 0.004, mid.z + 0.01), k); this.note.rotation.y = -0.12; }
    this.placed = true;
    if (act === 'write') {
      // the pen sits in the right hand, leaning back like a real grip
      this.pen.position.set(R.x + 0.012, R.y - 0.01, R.z + 0.045);
      this.pen.rotation.set(0.75, 0, -0.35);
    }
  }

  dispose() {
    this.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } });
  }
}
