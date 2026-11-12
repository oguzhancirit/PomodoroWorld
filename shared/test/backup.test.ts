import { describe, it, expect } from 'vitest';
import { makeBackup, readBackup, BACKUP_KEYS, BACKUP_MAX } from '../src/backup';

const id = JSON.stringify({ pid: 'oguzxxxxxxxx0001', secret: 'S'.repeat(40) });
const store = { 'pw2.identity': id, 'pw2.profile': JSON.stringify({ name: 'Oğuzhan' }), 'pw2.todos': JSON.stringify({ list: [{ id: 'a', t: 'Fizik' }] }), 'pw2.sound': null, 'other.key': '"x"' };

describe('backup (step 5, v1 "Yedeği indir / Yedekten yükle")', () => {
  it('writes the game keys only, with a header', () => {
    const o = JSON.parse(makeBackup(store, Date.UTC(2026, 10, 3)));
    expect(o).toMatchObject({ app: 'pomodoro-world', v: 2, at: '2026-11-03T00:00:00.000Z' });
    expect(Object.keys(o.data).sort()).toEqual(['pw2.identity', 'pw2.profile', 'pw2.todos']);
    expect(o.data['pw2.profile']).toEqual({ name: 'Oğuzhan' });
    expect(BACKUP_KEYS).toContain('pw2.todos'); // to-dos were browser-only: now they are in the backup
  });
  it('reads it back to the same stored strings', () => {
    const r = readBackup(makeBackup(store, 0));
    expect(r.ok && r.data).toEqual({ 'pw2.identity': id, 'pw2.profile': store['pw2.profile'], 'pw2.todos': store['pw2.todos'] });
  });
  it('refuses what is not a backup', () => {
    expect(readBackup('not json')).toEqual({ ok: false, reason: 'json' });
    expect(readBackup(JSON.stringify({ app: 'other' }))).toEqual({ ok: false, reason: 'app' });
    expect(readBackup('x'.repeat(BACKUP_MAX + 1))).toEqual({ ok: false, reason: 'size' });
  });
  it('knows a v1 backup but does not take coins from a file (the server keeps them)', () => {
    expect(readBackup(JSON.stringify({ app: 'pomodoro-world', exported: 'x', uid: 'abcd1234', wallet: { coins: 99999 } }))).toEqual({ ok: false, reason: 'old' });
  });
  it('needs a valid account key; drops unknown keys and broken values', () => {
    const bad = JSON.stringify({ app: 'pomodoro-world', v: 2, data: { 'pw2.identity': { pid: 'x', secret: 'y' } } });
    expect(readBackup(bad)).toEqual({ ok: false, reason: 'identity' });
    const extra = JSON.stringify({ app: 'pomodoro-world', v: 2, data: { 'pw2.identity': JSON.parse(id), 'evil.key': 1, 'pw2.todos': 'not an object' } });
    const r = readBackup(extra);
    expect(r.ok && Object.keys(r.data)).toEqual(['pw2.identity']);
  });
});
