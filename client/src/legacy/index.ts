// The original room engine: catalog (data.js), procedural furniture (models.js), avatars (avatar.js),
// room + editor + moods (world.js) and its rendering layer (render.js).
import './shim';
import '../../../js/util.js';
import '../../../js/data.js';
import '../../../js/models.js';
import '../../../js/avatar.js';
import '../../../js/world.js';
import '../../../js/render.js';

export const PW = (window as any).PW;

// Decision (b): the new character everywhere. The old engine builds avatars with `new PW.Avatar(cfg)`;
// from now on cfg is the avatar code and the adapter draws the new model. The old class stays for reference.
import { NewAvatar } from './avatarAdapter';
import './placement';
PW.OldAvatar = PW.Avatar;
PW.Avatar = NewAvatar;

// The state gem (v1 render.js updateGem) sat at the same height as the name tag, so the tag covered it
// (user, 2026-11-03). The tag is a screen-space pill, so put the gem a fixed number of pixels above it
// whatever the camera distance: project the tag's anchor, move it up on screen, unproject at the same depth.
const GEM_UP_PX = 40;
const oldUpdateGem = PW.World.prototype.updateGem;
PW.World.prototype.updateGem = function (this: any, dt: number) {
  oldUpdateGem.call(this, dt);
  const me = this.avatars.get('me'), gem = this.gem;
  if (!me || !gem || !gem.visible || !this.h) return;
  const v = me.av.headWorld(this.tmpV); v.y += 0.1; // same anchor as the tag (world.js)
  v.project(this.camera);
  v.y += (GEM_UP_PX / this.h) * 2;
  v.unproject(this.camera);
  gem.position.set(v.x, v.y + Math.sin(this.time * 2.2) * 0.02, v.z);
};

// Seat heights: v1 PW.seatsFor has fixed heights (sofa 0.48) but the drawn cushions are higher (sofa 0.59,
// armchair 0.60), so people sank into the sofa (user, 2026-11-03). Measure each seat on the drawn item instead:
// cast a ray straight down at the seat point and sit on the cushion that is really there.
const T = (window as any).THREE;
const down = new T.Vector3(0, -1, 0), probe = new T.Raycaster();
const oldLoadRoom = PW.World.prototype.loadRoom;
function measureSeats(w: any) {
  for (const s of w.seats ?? []) {
    const g = w.itemGroups?.find((x: any) => x.userData.itemIndex === s.itemIndex); if (!g) continue;
    g.updateWorldMatrix(true, true);
    probe.set(new T.Vector3(s.x, 1.2, s.z), down);
    const hit = probe.intersectObject(g, true).find((h: any) => h.point.y > 0.12 && h.point.y < 0.95);
    if (hit) s.h = +hit.point.y.toFixed(3);
  }
  // anyone already seated takes the measured height too
  for (const a of w.avatars?.values?.() ?? []) if (a.seatIdx != null && w.seats?.[a.seatIdx]) a.av.seatH = w.seats[a.seatIdx].h;
}
PW.World.prototype.loadRoom = function (this: any, def: unknown) {
  const r = oldLoadRoom.call(this, def);
  measureSeats(this); setRoomFx(this, (def as { fx?: string } | null)?.fx);
  if (r && typeof r.then === 'function') r.then(() => { measureSeats(this); setRoomFx(this, (def as { fx?: string } | null)?.fx); });
  return r;
};

/* ---------- floating room effects (user 2026-11-03: the room's own vibe): snow, petals, fireflies… ---------- */
type FxKind = 'snow' | 'sakura' | 'fireflies' | 'leaves' | 'stardust' | 'bubbles';
const FX_LOOK: Record<FxKind, { n: number; size: number; add: boolean; draw: (c: CanvasRenderingContext2D, s: number) => void; vy: number; sway: number; pulse?: boolean }> = {
  snow: { n: 140, size: 0.2, add: false, vy: -0.25, sway: 0.25, draw: (c, s) => { const g = c.createRadialGradient(s / 2, s / 2, 1, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, s, s); } },
  sakura: { n: 90, size: 0.32, add: false, vy: -0.22, sway: 0.5, draw: (c, s) => { c.fillStyle = '#FF7FA8'; c.beginPath(); c.ellipse(s / 2, s / 2, s * 0.4, s * 0.24, 0.6, 0, 7); c.fill(); c.fillStyle = '#FFC2D6'; c.beginPath(); c.ellipse(s * 0.45, s * 0.45, s * 0.16, s * 0.08, 0.6, 0, 7); c.fill(); } },
  fireflies: { n: 45, size: 0.4, add: true, vy: 0, sway: 0.35, pulse: true, draw: (c, s) => { const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,250,170,1)'); g.addColorStop(0.3, 'rgba(220,255,120,.6)'); g.addColorStop(1, 'rgba(200,255,100,0)'); c.fillStyle = g; c.fillRect(0, 0, s, s); } },
  leaves: { n: 70, size: 0.34, add: false, vy: -0.3, sway: 0.6, draw: (c, s) => { c.fillStyle = ['#E8803A', '#C7432F', '#E8B04A'][Math.floor(Math.random() * 3)]; c.beginPath(); c.moveTo(s / 2, s * 0.1); c.quadraticCurveTo(s * 0.95, s * 0.5, s / 2, s * 0.9); c.quadraticCurveTo(s * 0.05, s * 0.5, s / 2, s * 0.1); c.fill(); } },
  stardust: { n: 110, size: 0.24, add: true, vy: 0.08, sway: 0.15, pulse: true, draw: (c, s) => { c.fillStyle = '#FFF4C2'; c.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, r = i % 2 ? s * 0.12 : s * 0.48; c.lineTo(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r); } c.fill(); } },
  bubbles: { n: 50, size: 0.36, add: false, vy: 0.22, sway: 0.3, draw: (c, s) => { c.strokeStyle = 'rgba(200,235,255,.9)'; c.lineWidth = s * 0.07; c.beginPath(); c.arc(s / 2, s / 2, s * 0.4, 0, 7); c.stroke(); c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(s * 0.38, s * 0.36, s * 0.08, 0, 7); c.fill(); } },
};
function setRoomFx(w: any, kind?: string) {
  if (w._roomFx) { w.scene.remove(w._roomFx); w._roomFx.traverse((o: any) => { o.geometry?.dispose?.(); o.material?.map?.dispose?.(); o.material?.dispose?.(); }); w._roomFx = null; }
  const look = FX_LOOK[kind as FxKind]; if (!look || !w.scene) return;
  const half = (w.half || 3.5) - 0.3, H = 2.9;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; look.draw(cv.getContext('2d')!, 64);
  const tex = new T.CanvasTexture(cv);
  const pos = new Float32Array(look.n * 3), seed: number[][] = [];
  for (let i = 0; i < look.n; i++) { const x = (Math.random() * 2 - 1) * half, y = Math.random() * H, z = (Math.random() * 2 - 1) * half; pos.set([x, y, z], i * 3); seed.push([x, y, z, Math.random() * 6.3, 0.6 + Math.random() * 0.8]); }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  const m = new T.PointsMaterial({ size: look.size, map: tex, transparent: true, depthWrite: false, blending: look.add ? T.AdditiveBlending : T.NormalBlending, opacity: 0.95 });
  const pts = new T.Points(geo, m); pts.frustumCulled = false; pts.renderOrder = 6;
  const holder = new T.Group(); holder.add(pts); w.scene.add(holder); w._roomFx = holder;
  let last = 0;
  holder.userData.update = (t: number) => {
    const dt = Math.min(0.1, last ? t - last : 0.016); last = t;
    for (let i = 0; i < look.n; i++) {
      const sd = seed[i];
      sd[1] += look.vy * sd[4] * dt;
      if (look.vy === 0) { sd[0] += Math.sin(t * 0.5 + sd[3]) * 0.004; sd[2] += Math.cos(t * 0.4 + sd[3]) * 0.004; sd[1] += Math.sin(t * 0.8 + sd[3] * 2) * 0.003; }
      if (sd[1] < 0) sd[1] = H; if (sd[1] > H) sd[1] = 0.1;
      pos[i * 3] = Math.max(-half, Math.min(half, sd[0] + Math.sin(t * 0.7 + sd[3]) * look.sway * 0.3));
      pos[i * 3 + 1] = Math.max(0.05, sd[1]);
      pos[i * 3 + 2] = Math.max(-half, Math.min(half, sd[2] + Math.cos(t * 0.6 + sd[3]) * look.sway * 0.2));
    }
    geo.attributes.position.needsUpdate = true;
    if (look.pulse) m.opacity = 0.65 + Math.sin(t * 2.2) * 0.3;
  };
  if (!w.animated.includes(holder)) w.animated.push(holder);
}
const oldSit = PW.World.prototype.sitAvatar;
PW.World.prototype.sitAvatar = function (this: any, id: string, idx: number) {
  const ok = oldSit.apply(this, arguments as any);
  const a = this.avatars.get(id); if (ok && a && this.seats[idx]) a.av.seatH = this.seats[idx].h;
  return ok;
};

// Real footprints: the build mode checks overlaps with the catalog's `fp`, but several drawn models are bigger
// (sofa 1.94 m vs 1.8, double bed 2.92 vs 1.7…), so a sofa could be put into a fridge (user, 2026-11-03).
// Measure each model once, from its parts near the floor (plant leaves high up do not count), and widen `fp`
// to a box around it; the overlap check, the wall clamp and the green/red ghost all use `fp`.
const LOW = 0.6, measured = new Set<string>();
function measureFp(id: string) {
  if (measured.has(id)) return;
  const d = PW.ITEM[id]; if (!d || d.wall || d.rug || d.top || !d.fp) { measured.add(id); return; }
  const g = PW.buildItem(id, { seed: 1 }); g.updateMatrixWorld(true);
  const low = d.cat === 'Bitki' || d.sub === 'Bitki' ? 0.3 : LOW; // a plant: only the pot stands on the floor
  const v = new T.Vector3(); let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, n = 0;
  g.traverse((o: any) => {
    const pos = o.isMesh && o.geometry?.attributes?.position; if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); if (v.y > low) continue;
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); z0 = Math.min(z0, v.z); z1 = Math.max(z1, v.z); n++;
    }
  });
  if (!n) return; // model not loaded yet: try again next time
  measured.add(id);
  // a box centred on the item that holds the real footprint
  const w = 2 * Math.max(Math.abs(x0), Math.abs(x1)), dd = 2 * Math.max(Math.abs(z0), Math.abs(z1));
  d.fp = [Math.max(d.fp[0], Math.round(w * 20) / 20), Math.max(d.fp[1], Math.round(dd * 20) / 20)];
}
const oldMoveGhost = PW.World.prototype.moveGhost;
PW.World.prototype.moveGhost = function (this: any) {
  if (this.edit?.ghostDef) measureFp(this.edit.ghostDef.id);
  for (const it of this.items ?? []) measureFp(it.id);
  return oldMoveGhost.call(this);
};
(PW as any).measureFp = measureFp;

// L sofa seats (v1 numbers) did not match the drawn model: one sat on the armrest and the chaise seat put the
// legs inside its long cushion. Seats on the two cushion middles and on the front end of the chaise, facing out.
const oldSeatsFor = PW.seatsFor;
PW.seatsFor = function (id: string) {
  if (id === 'f_sofa_l') return [{ x: -0.55, z: 0.1, h: 0.48 }, { x: 0.15, z: 0.1, h: 0.48 }, { x: 0.86, z: 0.8, h: 0.48 }];
  // office and gaming chairs (user 2026-11-04): their backrest stands close to the seat, so the back went through it.
  // Sit a little further forward (the cushion height is still measured on the drawn model).
  if (id === 'f_chair_office' || id === 'f_chair_gaming') return [{ x: 0, z: 0.13, h: 0.49 }];
  return oldSeatsFor(id);
};

