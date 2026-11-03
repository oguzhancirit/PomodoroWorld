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
