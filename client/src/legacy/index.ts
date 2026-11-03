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
  measureSeats(this);
  if (r && typeof r.then === 'function') r.then(() => measureSeats(this));
  return r;
};
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
