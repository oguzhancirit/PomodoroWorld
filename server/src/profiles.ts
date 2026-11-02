// Player profiles (wallet: XP, coins, inventory). Kept on the server so nobody can edit their own coins.
// Stored as one JSON file; only a hash of each player's secret is kept.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { newWallet, sanitizeWallet, PlayerId, PlayerSecret, type Wallet } from '@pw/shared';

export interface Profile { pid: string; hash: string; wallet: Wallet; created: number; seen: number }
const hashOf = (secret: string) => crypto.createHash('sha256').update('pw:' + secret).digest('hex');

export class ProfileStore {
  private map = new Map<string, Profile>();
  private timer: NodeJS.Timeout | null = null;
  constructor(private file: string) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Profile[];
      for (const p of Array.isArray(raw) ? raw : []) if (p && PlayerId.safeParse(p.pid).success && typeof p.hash === 'string') this.map.set(p.pid, { ...p, wallet: sanitizeWallet(p.wallet) });
    } catch { /* first start or broken file: begin empty */ }
  }
  /** Returns the profile, creating it on first use; null when the id or secret is invalid or wrong. */
  open(pid: unknown, secret: unknown): Profile | null {
    if (!PlayerId.safeParse(pid).success || !PlayerSecret.safeParse(secret).success) return null;
    const h = hashOf(secret as string);
    let p = this.map.get(pid as string);
    if (!p) { p = { pid: pid as string, hash: h, wallet: newWallet(), created: Date.now(), seen: Date.now() }; this.map.set(p.pid, p); this.save(); }
    if (!crypto.timingSafeEqual(Buffer.from(p.hash), Buffer.from(h))) return null;
    p.seen = Date.now();
    return p;
  }
  update(p: Profile, wallet: Wallet) { p.wallet = wallet; this.save(); }
  save() { if (!this.timer) this.timer = setTimeout(() => { this.timer = null; this.saveNow(); }, 1000); }
  saveNow() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify([...this.map.values()]));
    fs.renameSync(tmp, this.file);
  }
}

export const profiles = new ProfileStore(process.env.PW_DATA || path.resolve('data/profiles.json'));
