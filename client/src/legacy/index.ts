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
