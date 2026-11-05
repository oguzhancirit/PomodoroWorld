import { describe, it, expect } from 'vitest';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ProfileStore } from '../src/profiles';

const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pw-')), 'profiles.json');

describe('ProfileStore', () => {
  it('creates a profile on first use and checks the secret afterwards', () => {
    const s = new ProfileStore(tmp());
    const a = s.open('pid12345abcd', 'x'.repeat(32));
    expect(a?.wallet.coins).toBe(150);
    expect(s.open('pid12345abcd', 'x'.repeat(32))).toBe(a);
    expect(s.open('pid12345abcd', 'y'.repeat(32))).toBeNull();
  });
  it('rejects malformed ids and secrets', () => {
    const s = new ProfileStore(tmp());
    expect(s.open('a', 'x'.repeat(32))).toBeNull();
    expect(s.open('pid12345abcd', 'short')).toBeNull();
    expect(s.open('../../etc', 'x'.repeat(32))).toBeNull();
  });
  it('persists to disk and never stores the secret itself', () => {
    const file = tmp(); const s = new ProfileStore(file);
    const p = s.open('pid12345abcd', 's'.repeat(32))!; p.wallet.coins = 999; s.saveNow();
    const raw = fs.readFileSync(file, 'utf8');
    expect(raw).not.toContain('s'.repeat(32));
    const again = new ProfileStore(file).open('pid12345abcd', 's'.repeat(32));
    expect(again?.wallet.coins).toBe(999);
  });
  it('survives a broken file', () => {
    const file = tmp(); fs.writeFileSync(file, '{broken');
    expect(new ProfileStore(file).open('pid12345abcd', 's'.repeat(32))?.wallet.coins).toBe(150);
  });
});

// Going public (2026-11-04): the free server forgets its files on every restart, so profiles also live in a
// database. The store keeps working from memory; it loads everything once and writes back only what changed.
describe('ProfileStore with a database', () => {
  const fakeDb = () => {
    const rows = new Map<string, string>(); let writes = 0;
    return {
      rows, writes: () => writes,
      async load() { return [...rows.values()].map((r) => JSON.parse(r)); },
      async write(list: { pid: string }[]) { writes++; for (const p of list) rows.set(p.pid, JSON.stringify(p)); },
    };
  };
  it('loads saved players and writes back only changed ones', async () => {
    const db = fakeDb();
    const s = new ProfileStore(); await s.attach(db);
    const a = s.open('pid12345abcd', 's'.repeat(32))!; s.open('pid99999abcd', 't'.repeat(32));
    await s.flush();
    expect(db.rows.size).toBe(2);
    a.wallet.coins = 777; s.update(a, a.wallet);
    const before = db.writes(); db.rows.clear();
    await s.flush();
    expect(db.writes()).toBe(before + 1);
    expect([...db.rows.keys()]).toEqual(['pid12345abcd']);
    const again = new ProfileStore(); await again.attach(db);
    expect(again.open('pid12345abcd', 's'.repeat(32))?.wallet.coins).toBe(777);
    expect(again.open('pid12345abcd', 'x'.repeat(32))).toBeNull();
  });
  it('a failed write is tried again later instead of being lost', async () => {
    const db = fakeDb(); let fail = true;
    const s = new ProfileStore(); await s.attach({ load: db.load, async write(l: { pid: string }[]) { if (fail) throw new Error('db down'); return db.write(l); } });
    s.open('pid12345abcd', 's'.repeat(32));
    await s.flush().catch(() => {});
    expect(db.rows.size).toBe(0);
    fail = false; await s.flush();
    expect(db.rows.size).toBe(1);
  });
});
