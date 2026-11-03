// Player profiles (wallet: XP, coins, inventory). Kept on the server so nobody can edit their own coins.
// Stored as one JSON file; only a hash of each player's secret is kept.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { newWallet, sanitizeWallet, cleanName, encodeAvatar, decodeAvatar, defaultRoom, roomAllowedFor, PlayerId, PlayerSecret, emptySocial, sanitizeSocial, type Wallet, type Room, type Social } from '@pw/shared';

/** look: name + avatar code, kept for Google accounts so the same character opens on every device */
export interface Look { name: string; avatar: string }
/** social: friends and blocks (step 4e) */
export interface Profile { pid: string; hash: string; wallet: Wallet; room: Room; created: number; seen: number; social: Social; look?: Look }
const hashOf = (secret: string) => crypto.createHash('sha256').update('pw:' + secret).digest('hex');

export class ProfileStore {
  private map = new Map<string, Profile>();
  private timer: NodeJS.Timeout | null = null;
  constructor(private file: string) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Profile[];
      for (const p of Array.isArray(raw) ? raw : []) if (p && PlayerId.safeParse(p.pid).success && typeof p.hash === 'string') { const wallet = sanitizeWallet(p.wallet); this.map.set(p.pid, { ...p, wallet, room: roomAllowedFor(wallet, p.room ?? defaultRoom()), social: sanitizeSocial(p.social) }); }
    } catch { /* first start or broken file: begin empty */ }
  }
  /** Returns the profile, creating it on first use; null when the id or secret is invalid or wrong. */
  open(pid: unknown, secret: unknown): Profile | null {
    if (!PlayerId.safeParse(pid).success || !PlayerSecret.safeParse(secret).success) return null;
    const h = hashOf(secret as string);
    let p = this.map.get(pid as string);
    if (!p) { p = { pid: pid as string, hash: h, wallet: newWallet(), room: defaultRoom(), created: Date.now(), seen: Date.now(), social: emptySocial() }; this.map.set(p.pid, p); this.save(); }
    if (!crypto.timingSafeEqual(Buffer.from(p.hash), Buffer.from(h))) return null;
    p.seen = Date.now();
    return p;
  }
  /** Gives this id a new secret (Google sign-in: the account is proven by Google, not by an old secret).
   *  A missing profile is made, copying a guest's progress when one is given. */
  rekey(pid: string, secret: string, from?: Profile | null): { p: Profile; isNew: boolean } {
    let p = this.map.get(pid); const isNew = !p;
    if (!p) {
      p = { pid, hash: '', wallet: from ? sanitizeWallet(structuredClone(from.wallet)) : newWallet(), room: from ? structuredClone(from.room) : defaultRoom(), created: Date.now(), seen: Date.now(), social: from ? structuredClone(from.social) : emptySocial(), look: from?.look ? { ...from.look } : undefined };
      this.map.set(pid, p);
    }
    p.hash = hashOf(secret); p.seen = Date.now(); this.save();
    return { p, isNew };
  }
  /** name + avatar; a bad name or avatar code is ignored */
  setLook(p: Profile, look: { name?: unknown; avatar?: unknown }) {
    const name = cleanName(typeof look.name === 'string' ? look.name : '') || p.look?.name || '';
    const avatar = typeof look.avatar === 'string' && encodeAvatar(decodeAvatar(look.avatar)) === look.avatar ? look.avatar : p.look?.avatar || '';
    if (name && avatar) { p.look = { name, avatar }; this.save(); }
  }
  update(p: Profile, wallet: Wallet) { p.wallet = wallet; this.save(); }
  setSocial(p: Profile, social: Social) { p.social = social; this.save(); }
  /** an existing profile (no secret: only for server-side reads such as showing a room) */
  get(pid: string): Profile | null { return this.map.get(pid) ?? null; }
  /** Stores the room as this player may show it (only owned things, level-gated surfaces). */
  setRoom(p: Profile, room: unknown) { p.room = roomAllowedFor(p.wallet, room); this.save(); return p.room; }
  save() { if (!this.timer) this.timer = setTimeout(() => { this.timer = null; this.saveNow(); }, 1000); }
  saveNow() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify([...this.map.values()]));
    fs.renameSync(tmp, this.file);
  }
}

export const profiles = new ProfileStore(process.env.PW_DATA || path.resolve('data/profiles.json'));
