// Step 4e: friends (code, online, where), the person card's "Odamdan çıkar", blocks kept on the profile.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import { matchMaker } from '@colyseus/core';
import { server } from '../src/app.config';
import type { HomeRoom } from '../src/rooms/HomeRoom';
import { profiles } from '../src/profiles';
import { clock, levelFromXP } from '@pw/shared';

let colyseus: ColyseusTestServer;
beforeAll(async () => { colyseus = await boot(server); });
afterAll(async () => { await colyseus.shutdown(); });
beforeEach(async () => { await colyseus.cleanup(); });

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let n = 0;
async function player(name: string) {
  const pid = `fr${name.toLowerCase().padEnd(6, 'x')}${String(++n).padStart(4, '0')}`.slice(0, 16), secret = 'f'.repeat(32);
  const prof = await colyseus.http.post('/api/profile', { body: { pid, secret } });
  return { pid, secret, name, room: prof.data.room };
}
const join = (p: { pid: string; secret: string; name: string }, owner: string, extra: object = {}) =>
  colyseus.sdk.joinOrCreate('home', { pid: p.pid, secret: p.secret, name: p.name, owner, ...extra });
const roomOf = async (owner: string) => {
  const [r] = await matchMaker.query({ name: 'home', owner } as never);
  return colyseus.getRoomById<HomeRoom>(r.roomId);
};
const friends = (p: { pid: string; secret: string }, body: object = {}) =>
  colyseus.http.post('/api/friends', { body: { pid: p.pid, secret: p.secret, op: 'list', ...body } }).then((r) => r.data, (e) => e.data ?? { ok: false, status: e.statusCode });

describe('friends', () => {
  it('everyone in a room can see each other\'s friend code (for the person card)', async () => {
    const a = await player('Ayse'), b = await player('Bora');
    const ca = await join(a, a.pid), cb = await join(b, a.pid); await wait(80);
    expect(ca.state.players.get(cb.sessionId)!.code).toBe(b.pid);
  });

  it('add by code; the list says who is online, where, and whether you can go there', async () => {
    const a = await player('Cem'), b = await player('Duru'), c = await player('Eda');
    await join(b, b.pid, { name: 'Duru' }); await wait(60);
    let r = await friends(a, { op: 'add', target: b.pid });
    expect(r.ok).toBe(true);
    r = await friends(a, { op: 'add', target: c.pid, name: 'Eda' });
    expect(r.code).toBe(a.pid.toUpperCase());
    const duru = r.friends.find((f: { pid: string }) => f.pid === b.pid), eda = r.friends.find((f: { pid: string }) => f.pid === c.pid);
    // the name is learned from the live room (v1 friendSeen)
    expect(duru).toMatchObject({ n: 'Duru', online: true, where: { owner: b.pid, ownerName: 'Duru', open: true, phase: 'idle' } });
    expect(eda).toMatchObject({ n: 'Eda', online: false });
    expect(eda.where).toBeUndefined();
    // online friends first
    expect(r.friends[0].pid).toBe(b.pid);
  });

  it('each friend comes with level and this week\'s XP (weekly board)', async () => {
    const a = await player('Gul'), b = await player('Hale');
    await friends(a, { op: 'add', target: b.pid, name: 'Hale' });
    const pb = profiles.get(b.pid)!, week = clock(Date.now(), 0).week;
    profiles.update(pb, { ...pb.wallet, xp: 500, stats: { ...pb.wallet.stats, weekXP: { [week]: 120, '2001-W01': 999 } } });
    const r = await friends(a);
    expect(r.friends[0]).toMatchObject({ pid: b.pid, lv: levelFromXP(500).level, wx: 120 });
  });

  it('cannot add yourself; a wrong secret is refused', async () => {
    const a = await player('Ferhat');
    expect((await friends(a, { op: 'add', target: a.pid })).ok).toBe(false);
    expect(await friends({ pid: a.pid, secret: 'x'.repeat(32) })).toMatchObject({ ok: false });
  });

  it('blocks are kept on the profile; adding unblocks', async () => {
    const a = await player('Gizem'), b = await player('Hakan');
    let r = await friends(a, { op: 'block', target: b.pid, name: 'Hakan' });
    expect(r.blocked).toEqual([{ pid: b.pid, n: 'Hakan' }]);
    r = await friends(a, { op: 'add', target: b.pid });
    expect(r.blocked).toEqual([]);
    expect(r.friends[0]).toMatchObject({ pid: b.pid, n: 'Hakan' });
  });
});

describe('Odamdan çıkar (owner only)', () => {
  it('the owner removes a guest: they are told, leave, and cannot come back', async () => {
    const own = await player('Ilker'), g = await player('Jale');
    const co = await join(own, own.pid), cg = await join(g, own.pid); await wait(80);
    let kicked = false; cg.onMessage('kicked', () => { kicked = true; });
    co.send('kick', { id: cg.sessionId }); await wait(150);
    expect(kicked).toBe(true);
    const room = await roomOf(own.pid);
    expect(room.state.players.has(cg.sessionId)).toBe(false);
    expect(profiles.get(own.pid)!.room.ban).toContain(g.pid);
    await expect(join(g, own.pid)).rejects.toThrow(/giremezsin/);
  });

  it('a guest cannot remove anyone', async () => {
    const own = await player('Kerem'), g = await player('Lale');
    const co = await join(own, own.pid), cg = await join(g, own.pid); await wait(80);
    cg.send('kick', { id: co.sessionId }); await wait(120);
    const room = await roomOf(own.pid);
    expect(room.state.players.has(co.sessionId)).toBe(true);
    expect(profiles.get(own.pid)!.room.ban).toEqual([]);
  });
});
