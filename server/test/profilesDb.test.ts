import { describe, it, expect } from 'vitest';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ProfileStore, type Db } from '../src/profiles';

/** a tiny in-memory stand-in for Postgres that understands the store's three queries */
class FakeDb implements Db {
  rows = new Map<string, { pid: string; hash: string; data: any }>();
  writes = 0; failLoad = false;
  async query(sql: string, params: unknown[] = []) {
    if (/^CREATE TABLE/i.test(sql)) return { rows: [] };
    if (/^SELECT/i.test(sql)) { if (this.failLoad) throw new Error('db down'); return { rows: [...this.rows.values()] }; }
    if (/^INSERT/i.test(sql)) {
      this.writes++;
      const [pid, hash, data] = params as [string, string, string];
      const old = this.rows.get(pid);
      if (!old || old.hash === hash) this.rows.set(pid, { pid, hash, data: JSON.parse(data) }); // ON CONFLICT ... WHERE hash matches
      return { rows: [] };
    }
    throw new Error('unexpected sql ' + sql);
  }
}

describe('ProfileStore with a database (profiles survive a server restart)', () => {
  it('saves to the database and loads it back in a fresh store', async () => {
    const db = new FakeDb();
    const a = new ProfileStore({ db }); await a.ready;
    const p = a.open('piddb0000001', 'd'.repeat(32))!; a.update(p, { ...p.wallet, coins: 777 }); await a.flush();
    const b = new ProfileStore({ db }); await b.ready;
    expect(b.open('piddb0000001', 'd'.repeat(32))?.wallet.coins).toBe(777);
    expect(b.open('piddb0000001', 'x'.repeat(32))).toBeNull();
  });
  it('writes only the players that changed', async () => {
    const db = new FakeDb(); const s = new ProfileStore({ db }); await s.ready;
    s.open('piddb0000001', 'd'.repeat(32)); s.open('piddb0000002', 'd'.repeat(32)); await s.flush();
    const before = db.writes; const p = s.open('piddb0000001', 'd'.repeat(32))!; s.update(p, p.wallet); await s.flush();
    expect(db.writes - before).toBe(1);
  });
  it('never stores the secret itself', async () => {
    const db = new FakeDb(); const s = new ProfileStore({ db }); await s.ready;
    s.open('piddb0000001', 's'.repeat(32)); await s.flush();
    expect(JSON.stringify([...db.rows.values()])).not.toContain('s'.repeat(32));
  });
  it('refuses to start when the database cannot be read (an empty start would let strangers claim old ids)', async () => {
    const db = new FakeDb(); db.failLoad = true;
    await expect(new ProfileStore({ db }).ready).rejects.toThrow();
  });
  it('a stranger cannot overwrite a stored player even if the store was empty', async () => {
    const db = new FakeDb(); const a = new ProfileStore({ db }); await a.ready;
    a.open('piddb0000001', 'o'.repeat(32)); await a.flush();
    const evil = new ProfileStore({ db }); await evil.ready;
    (evil as any).map.clear(); // pretend it lost what it loaded
    evil.open('piddb0000001', 'e'.repeat(32)); await evil.flush();
    const c = new ProfileStore({ db }); await c.ready;
    expect(c.open('piddb0000001', 'o'.repeat(32))).not.toBeNull();
  });
});

describe('ProfileStore with a file', () => {
  it('keeps a copy of a broken file instead of silently overwriting it', async () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pw-')), 'profiles.json');
    fs.writeFileSync(file, '{broken');
    const s = new ProfileStore({ file }); await s.ready;
    s.open('pidfile000001', 'f'.repeat(32)); await s.flush();
    const copies = fs.readdirSync(path.dirname(file)).filter((f) => f.includes('.broken'));
    expect(copies.length).toBe(1);
  });
});
