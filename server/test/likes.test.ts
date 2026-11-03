// Room likes: a visitor likes a friend's room once; the owner sees the count.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import { server } from '../src/app.config';

let c: ColyseusTestServer;
beforeAll(async () => { c = await boot(server); });
afterAll(async () => { await c.shutdown(); });
const post = (body: object) => c.http.post('/api/like', { body }).then((r) => r.data, (e) => ({ status: e.statusCode, ...(e.data ?? {}) }));
const owner = { pid: 'likeowner0001', secret: 'o'.repeat(32) }, guest = { pid: 'likeguest0001', secret: 'g'.repeat(32) };

describe('/api/like', () => {
  it('counts a like once and tells the visitor they liked it', async () => {
    await c.http.post('/api/profile', { body: owner });
    expect(await post({ ...guest, owner: owner.pid, op: 'get' })).toMatchObject({ ok: true, n: 0, liked: false });
    expect(await post({ ...guest, owner: owner.pid, op: 'like' })).toMatchObject({ ok: true, n: 1, liked: true });
    expect(await post({ ...guest, owner: owner.pid, op: 'like' })).toMatchObject({ ok: true, n: 1, liked: true });
    expect(await post({ ...owner, owner: owner.pid, op: 'get' })).toMatchObject({ ok: true, n: 1 });
  });
  it('refuses a wrong secret and an unknown room', async () => {
    expect((await post({ pid: guest.pid, secret: 'w'.repeat(32), owner: owner.pid, op: 'like' })).status).toBe(403);
    expect((await post({ ...guest, owner: 'nobody0000001', op: 'like' })).status).toBe(404);
  });
});
