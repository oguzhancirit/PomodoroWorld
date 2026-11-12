import { describe, it, expect } from 'vitest';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ProfileStore } from '../src/profiles';
import { verifyGoogle, googleLogin, googlePid } from '../src/auth';

const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pw-')), 'profiles.json');
const CID = 'client-123.apps.googleusercontent.com';
const now = 1_800_000_000_000;
const token = (over: Record<string, unknown> = {}) => ({ aud: CID, iss: 'https://accounts.google.com', sub: '1099', exp: String(now / 1000 + 600), name: 'Oğuzhan Cirit', given_name: 'Oğuzhan', picture: 'https://lh3.googleusercontent.com/a/x', ...over });
const fakeFetch = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

describe('verifyGoogle', () => {
  it('accepts a token made for our app and returns who it is', async () => {
    const v = await verifyGoogle('tok', CID, fakeFetch(token()), now);
    expect(v).toEqual({ sub: '1099', name: 'Oğuzhan Cirit', given: 'Oğuzhan', picture: 'https://lh3.googleusercontent.com/a/x' });
  });
  it('rejects tokens for another app, from another issuer, expired, or that Google refuses', async () => {
    expect(await verifyGoogle('tok', CID, fakeFetch(token({ aud: 'someone-else' })), now)).toBeNull();
    expect(await verifyGoogle('tok', CID, fakeFetch(token({ iss: 'https://evil.example' })), now)).toBeNull();
    expect(await verifyGoogle('tok', CID, fakeFetch(token({ exp: String(now / 1000 - 1) })), now)).toBeNull();
    expect(await verifyGoogle('tok', CID, fakeFetch({ error: 'invalid_token' }, false), now)).toBeNull();
    expect(await verifyGoogle('', CID, fakeFetch(token()), now)).toBeNull();
    expect(await verifyGoogle('tok', '', fakeFetch(token()), now)).toBeNull();
  });
});

describe('googleLogin', () => {
  it('gives the same player id for the same Google account, and a new working secret each time', () => {
    const s = new ProfileStore(tmp());
    const a = googleLogin(s, { sub: '1099' });
    const b = googleLogin(s, { sub: '1099' });
    expect(a.pid).toBe(googlePid('1099')); expect(b.pid).toBe(a.pid);
    expect(a.pid).toMatch(/^[a-z0-9]{12,24}$/);
    expect(a.isNew).toBe(true); expect(b.isNew).toBe(false);
    expect(s.open(b.pid, b.secret)).not.toBeNull();
    expect(s.open(a.pid, a.secret)).toBeNull(); // the old secret no longer works
    expect(googlePid('2000')).not.toBe(a.pid);
  });
  it('moves a guest\'s progress into a brand-new Google account', () => {
    const s = new ProfileStore(tmp());
    const guest = s.open('guest12345ab', 'g'.repeat(32))!; guest.wallet.coins = 777; guest.wallet.xp = 420;
    s.setLook(guest, { name: 'Ozi', avatar: 'm.1.0.0.0.2.3.0.0' });
    const r = googleLogin(s, { sub: '1099' }, { pid: 'guest12345ab', secret: 'g'.repeat(32) });
    expect(r.moved).toBe(true);
    const p = s.open(r.pid, r.secret)!;
    expect(p.wallet.coins).toBe(777); expect(p.wallet.xp).toBe(420);
    expect(r.look).toEqual({ name: 'Ozi', avatar: 'm.1.0.0.0.2.3.0.0' });
  });
  it('keeps an existing account as it is (a guest never overwrites it) and ignores a wrong guest secret', () => {
    const s = new ProfileStore(tmp());
    const first = googleLogin(s, { sub: '1099' }); s.open(first.pid, first.secret)!.wallet.coins = 5;
    const guest = s.open('guest12345ab', 'g'.repeat(32))!; guest.wallet.coins = 999;
    const r = googleLogin(s, { sub: '1099' }, { pid: 'guest12345ab', secret: 'g'.repeat(32) });
    expect(r.moved).toBe(false); expect(s.open(r.pid, r.secret)!.wallet.coins).toBe(5);
    const r2 = googleLogin(s, { sub: '3000' }, { pid: 'guest12345ab', secret: 'w'.repeat(32) });
    expect(r2.moved).toBe(false); expect(s.open(r2.pid, r2.secret)!.wallet.coins).toBe(150);
  });
  it('remembers the look (name + avatar code) on the account, cleaned', () => {
    const s = new ProfileStore(tmp());
    const r = googleLogin(s, { sub: '1099' });
    expect(r.look).toBeNull();
    const p = s.open(r.pid, r.secret)!;
    s.setLook(p, { name: '  Oğuzhan  ', avatar: 'f.0.0.0.0.0.0.0.0' });
    expect(googleLogin(s, { sub: '1099' }).look).toEqual({ name: 'Oğuzhan', avatar: 'f.0.0.0.0.0.0.0.0' });
    s.setLook(p, { name: '', avatar: 'f.0.0.0.0.0.0.0.0' });
    expect(googleLogin(s, { sub: '1099' }).look?.name).toBe('Oğuzhan'); // an empty name is ignored
  });
});

describe('auth routes', async () => {
  const { boot } = await import('@colyseus/testing');
  const { server } = await import('../src/app.config');
  const { beforeAll, afterAll } = await import('vitest');
  let c: Awaited<ReturnType<typeof boot>>;
  beforeAll(async () => { c = await boot(server); });
  afterAll(async () => { await c.shutdown(); });
  const post = (url: string, body: object) => c.http.post(url, { body }).then((r) => r.data, (e) => ({ status: e.statusCode, ...(e.data ?? {}) }));

  it('says Google sign-in is off when the server has no client id', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    expect((await post('/api/auth/google', { credential: 'x' })).status).toBe(503);
  });
  it('refuses a token Google does not accept', async () => {
    process.env.GOOGLE_CLIENT_ID = CID;
    expect((await post('/api/auth/google', { credential: 'not-a-real-token' })).status).toBe(401);
    delete process.env.GOOGLE_CLIENT_ID;
  });
  it('stores the look and returns it with the profile', async () => {
    const id = { pid: 'look12345abc', secret: 'l'.repeat(32) };
    expect((await post('/api/look', { ...id, name: 'Ozi', avatar: 'f.0.0.0.0.0.0.0.0' })).look).toEqual({ name: 'Ozi', avatar: 'f.0.0.0.0.0.0.0.0' });
    expect((await post('/api/profile', id)).look).toEqual({ name: 'Ozi', avatar: 'f.0.0.0.0.0.0.0.0' });
    expect((await post('/api/look', { pid: id.pid, secret: 'w'.repeat(32), name: 'X' })).status).toBe(403);
  });
});
