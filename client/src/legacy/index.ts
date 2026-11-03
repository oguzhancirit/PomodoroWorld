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
