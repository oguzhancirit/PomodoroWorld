// Player profiles (wallet: XP, coins, inventory). Kept on the server so nobody can edit their own coins.
// Stored in Postgres when DATABASE_URL is set (survives restarts on free hosting), otherwise in one JSON file.
// Only a hash of each player's secret is kept.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import { newWallet, sanitizeWallet, defaultRoom, roomAllowedFor, PlayerId, PlayerSecret, type Wallet, type Room } from '@pw/shared';

export interface Profile { pid: string; hash: string; wallet: Wallet; room: Room; created: number; seen: number }
/** the small part of a Postgres client the store needs (pg.Pool fits) */
export interface Db { query(sql: string, params?: unknown[]): Promise<{ rows: any[] }> }
const hashOf = (secret: string) => crypto.createHash('sha256').update('pw:' + secret).digest('hex');

const CREATE = 'CREATE TABLE IF NOT EXISTS pw_profiles (pid text PRIMARY KEY, hash text NOT NULL, data jsonb NOT NULL, updated timestamptz NOT NULL DEFAULT now())';
const LOAD = 'SELECT pid, hash, data FROM pw_profiles';
// a row is only ever changed by the owner of its secret: an empty or confused server cannot hand an old id to a stranger
const UPSERT = 'INSERT INTO pw_profiles (pid, hash, data) VALUES ($1, $2, $3::jsonb) ON CONFLICT (pid) DO UPDATE SET data = EXCLUDED.data, updated = now() WHERE pw_profiles.hash = EXCLUDED.hash';

export class ProfileStore {
  private map = new Map<string, Profile>();
  private dirty = new Set<string>();
  private timer: NodeJS.Timeout | null = null;
  private writing: Promise<void> = Promise.resolve();
  private file: string | null; private db: Db | null;
  /** resolves when stored profiles are loaded; rejects (and the server must not start) if the database cannot be read */
  readonly ready: Promise<void>;

  constructor(where: string | { file: string } | { db: Db }) {
    const w = typeof where === 'string' ? { file: where } : where;
    this.file = 'file' in w ? w.file : null; this.db = 'db' in w ? w.db : null;
    if (this.db) { this.ready = this.loadDb(this.db); return; }
    this.loadFile(this.file!); this.ready = Promise.resolve();
  }

  private add(p: Partial<Profile> | null | undefined) {
    if (!p || !PlayerId.safeParse(p.pid).success || typeof p.hash !== 'string') return;
    const wallet = sanitizeWallet(p.wallet);
    this.map.set(p.pid!, { created: Date.now(), seen: Date.now(), ...p, wallet, room: roomAllowedFor(wallet, p.room ?? defaultRoom()) } as Profile);
  }
  private loadFile(file: string) {
    let text: string;
    try { text = fs.readFileSync(file, 'utf8'); } catch { return; /* first start */ }
    try { const raw = JSON.parse(text); for (const p of Array.isArray(raw) ? raw : []) this.add(p); }
    catch { try { fs.copyFileSync(file, `${file}.broken-${Date.now()}`); } catch { /* keep going */ } } // keep it for repair, start empty
  }
  private async loadDb(db: Db) {
    await db.query(CREATE);
    const { rows } = await db.query(LOAD);
    for (const r of rows) { const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data; this.add({ ...d, pid: r.pid, hash: r.hash }); }
  }

  /** Returns the profile, creating it on first use; null when the id or secret is invalid or wrong. */
  open(pid: unknown, secret: unknown): Profile | null {
    if (!PlayerId.safeParse(pid).success || !PlayerSecret.safeParse(secret).success) return null;
    const h = hashOf(secret as string);
    let p = this.map.get(pid as string);
    if (!p) { p = { pid: pid as string, hash: h, wallet: newWallet(), room: defaultRoom(), created: Date.now(), seen: Date.now() }; this.map.set(p.pid, p); this.save(p); }
    if (!crypto.timingSafeEqual(Buffer.from(p.hash), Buffer.from(h))) return null;
    p.seen = Date.now();
    return p;
  }
  update(p: Profile, wallet: Wallet) { p.wallet = wallet; this.save(p); }
  /** Stores the room as this player may show it (only owned things, level-gated surfaces). */
  setRoom(p: Profile, room: unknown) { p.room = roomAllowedFor(p.wallet, room); this.save(p); return p.room; }

  save(p?: Profile) {
    if (p) this.dirty.add(p.pid);
    if (!this.timer) this.timer = setTimeout(() => { this.timer = null; void this.flush(); }, 1000);
  }
  /** Writes pending changes now (also used on shutdown). */
  flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.writing = this.writing.then(() => this.write()).catch((e) => console.error('profile save failed', e));
    return this.writing;
  }
  private async write() {
    if (!this.db) { this.dirty.clear(); this.saveNow(); return; }
    const ids = [...this.dirty]; this.dirty.clear();
    try {
      for (const id of ids) {
        const p = this.map.get(id); if (!p) continue;
        const { pid, hash, ...data } = p;
        await this.db.query(UPSERT, [pid, hash, JSON.stringify(data)]);
      }
    } catch (e) { ids.forEach((id) => this.dirty.add(id)); this.save(); throw e; } // try again in a second
  }
  saveNow() {
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify([...this.map.values()]));
    fs.renameSync(tmp, this.file);
  }
}

function makeStore(): ProfileStore {
  const url = process.env.DATABASE_URL;
  if (!url) return new ProfileStore({ file: process.env.PW_DATA || path.resolve('data/profiles.json') });
  return new ProfileStore({ db: new pg.Pool({ connectionString: url, max: 3, ssl: /@(localhost|127\.0\.0\.1)[:/]/.test(url) ? false : { rejectUnauthorized: true } }) });
}
export const profiles = makeStore();
