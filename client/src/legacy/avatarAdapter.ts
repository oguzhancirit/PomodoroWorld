// The new Quaternius character, wearing the old engine's avatar "plug" (js/avatar.js API), so the old room engine
// (js/world.js: Odam, library, social spaces) can draw it without changes:
//   root, build(cfg), setState(state, act), act, seatH, doEmote(e, ms), update(dt, t), headWorld(v), cfg.ht
// `cfg` is the short avatar code string from @pw/shared (encodeAvatar).
import * as THREE from 'three';
import { decodeAvatar } from '@pw/shared';
import { loadRig, buildAvatar, disposeAvatar, type Rig } from '../avatar/assets';

type State = 'stand' | 'walk' | 'sit';
const SIT: Record<string, string> = { write: 'SitWrite', type: 'SitType', read: 'SitRead', talk: 'SitTalk' };
const STAND: Record<string, string> = { wave: 'Wave', dance: 'Dance', clap: 'Wave', cheer: 'Wave' };
/** hips sit this far above the seat surface */
const HIP_OVER_SEAT = 0.08;

export class NewAvatar {
  root = new THREE.Group();
  state: State = 'stand';
  act = 'idle';
  seatH = 0.5;
  mood: string | null = null;
  cfg = { ht: 1 };
  private emote: string | null = null;
  private emoteUntil = 0;
  private talkUntil = 0;
  private body: THREE.Object3D | null = null;
  private head: THREE.Object3D | null = null;
  private rig: Rig | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private action: THREE.AnimationAction | null = null;
  private clip = '';
  private code = '';
  private gen = 0;

  constructor(code: unknown) { this.build(code); }

  /** (re)dress the character; the model loads in the background, the tag works meanwhile */
  build(code: unknown) {
    const c = typeof code === 'string' ? code : '';
    if (c && c === this.code && this.body) return;
    this.code = c;
    const gen = ++this.gen;
    loadRig(decodeAvatar(c).g).then((rig) => {
      if (gen !== this.gen) return;
      this.clear();
      const built = buildAvatar(rig, c);
      this.rig = rig; this.body = built.root; this.root.add(built.root);
      this.mixer = new THREE.AnimationMixer(built.root);
      this.head = null; built.root.traverse((o) => { if (!this.head && (o as THREE.Bone).isBone && /^head$/i.test(o.name)) this.head = o; });
      this.clip = '';
    }).catch((e) => console.warn('avatar load failed', e));
  }

  private clear() {
    this.mixer?.stopAllAction(); this.mixer = null; this.action = null;
    if (this.body) { this.root.remove(this.body); disposeAvatar(this.body); this.body = null; }
  }
  dispose() { this.gen++; this.clear(); }

  setState(state: State, act?: string) { this.state = state; if (act) this.act = act; }
  doEmote(e: string, ms = 3000) { this.emote = e; this.emoteUntil = performance.now() + ms; }
  /** a chat bubble appeared: talk for a while (old engine calls this from World.bubble) */
  say(ms = 3500) { this.talkUntil = performance.now() + ms; }

  /** which clip fits what the old engine asks for */
  private want(): string {
    const act = this.emote ?? this.act;
    if (this.state === 'walk') return 'Walk';
    if (this.state === 'sit') return SIT[act] ?? (performance.now() < this.talkUntil ? 'SitTalk' : 'Sit');
    return STAND[act] ?? 'Idle';
  }

  update(dt: number) {
    if (this.emote && performance.now() > this.emoteUntil) this.emote = null;
    const rig = this.rig, mixer = this.mixer, body = this.body;
    if (!rig || !mixer || !body) return;
    const name = this.want();
    if (name !== this.clip) {
      const clip = rig.clips[name] ?? rig.clips.Idle;
      if (clip) {
        const next = mixer.clipAction(clip);
        next.reset().setEffectiveWeight(1);
        next.time = Math.random() * clip.duration; // people should not move in lockstep
        next.fadeIn(this.clip ? 0.3 : 0).play();
        if (this.action && this.action !== next) this.action.fadeOut(0.3);
        this.action = next;
      }
      this.clip = name;
    }
    // the sitting clips put the hips at rig.meta.sitHipY; lift or lower the body so they rest on this seat
    body.position.y = this.state === 'sit' ? Math.max(-0.3, Math.min(0.3, this.seatH + HIP_OVER_SEAT - (rig.meta.sitHipY || 0))) : 0;
    mixer.update(Math.min(dt, 0.1));
  }

  headWorld(v: THREE.Vector3) {
    // world units: the rig's bones may be scaled, so add the offset after converting
    if (this.head) { this.head.getWorldPosition(v); v.y += 0.25; return v; }
    this.root.updateWorldMatrix(true, false);
    return this.root.localToWorld(v.set(0, this.state === 'sit' ? 1.3 : 1.75, 0));
  }
}
