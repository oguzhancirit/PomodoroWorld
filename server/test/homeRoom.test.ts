// Step 4: your own room is the place to study with friends (small rooms, 2..5 seats).
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import { matchMaker } from '@colyseus/core';
import { server } from '../src/app.config';
import type { HomeRoom } from '../src/rooms/HomeRoom';

let colyseus: ColyseusTestServer;
beforeAll(async () => { colyseus = await boot(server); });
afterAll(async () => { await colyseus.shutdown(); });
beforeEach(async () => { await colyseus.cleanup(); });

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let n = 0;
/** a fresh player with a server profile */
async function player(name: string) {
  const pid = `${name.toLowerCase().padEnd(8, 'x')}${String(++n).padStart(4, '0')}`.slice(0, 16), secret = 's'.repeat(32);
  const prof = await colyseus.http.post('/api/profile', { body: { pid, secret } });
  return { pid, secret, name, room: prof.data.room };
}
const join = (p: { pid: string; secret: string; name: string }, owner: string, extra: object = {}) =>
  colyseus.sdk.joinOrCreate('home', { pid: p.pid, secret: p.secret, name: p.name, owner, ...extra });
const roomOf = async (owner: string) => {
  const [r] = await matchMaker.query({ name: 'home', owner } as never);
  return colyseus.getRoomById<HomeRoom>(r.roomId);
};

describe('HomeRoom', () => {
  it('the owner opens their room: their saved layout, 2 chairs = you + 1 friend, timer waits until someone starts it', async () => {
    const own = await player('Oguz');
    const c = await join(own, own.pid); await wait(50);
    const room = await roomOf(own.pid);
    expect(JSON.parse(room.state.layout).items).toEqual(own.room.items);
    expect(room.state.owner).toBe(own.pid);
    expect(room.state.ownerName).toBe('Oguz');
    expect(room.capacity).toBe(2);
    expect(room.state.timer.phase).toBe('idle');
    expect(room.metadata).toMatchObject({ owner: own.pid, name: 'Odam', open: true, n: 1, cap: 2 });
    expect(room.state.players.get(c.sessionId)!.seatIndex).toBe(0);
  });

  it('nobody else can open a room in your name', async () => {
    const own = await player('Ayse'), g = await player('Mert');
    await expect(join(g, own.pid)).rejects.toThrow(/çevrimiçi değil/);
  });

  it('friends join an open room, one per chair; when the chairs are taken it is full', async () => {
    const own = await player('Ece'), f = await player('Can'), y = await player('Yeliz');
    await join(own, own.pid);
    const cf = await join(f, own.pid); await wait(50);
    const room = await roomOf(own.pid);
    expect(room.state.players.get(cf.sessionId)!.seatIndex).toBe(1);
    expect(room.metadata.n).toBe(2);
    await expect(join(y, own.pid)).rejects.toThrow(/dolu/);
  });

  it('opening the game again (a reload, a second tab) replaces your old self instead of adding a copy (live, 2026-11-04)', async () => {
    const own = await player('Ozi'), f = await player('Arkadas');
    const first = await join(own, own.pid); await wait(50);
    let replaced = false; first.onMessage('replaced', () => { replaced = true; });
    await join(own, own.pid); await join(own, own.pid); await wait(80);
    const room = await roomOf(own.pid);
    expect(room.state.players.size).toBe(1);
    expect(replaced).toBe(true);
    // a friend who reloads in a full room is let back in: their old copy does not hold the chair
    await join(f, own.pid); await wait(50);
    await join(f, own.pid); await wait(80);
    expect(room.state.players.size).toBe(2);
    expect([...room.state.players.values()].map((p) => p.code).sort()).toEqual([f.pid, own.pid].sort());
  });

  it('a closed room needs the invite token; a banned player never gets in', async () => {
    const own = await player('Deniz'), f = await player('Bora'), b = await player('Kotu');
    await colyseus.http.post('/api/room', { body: { pid: own.pid, secret: own.secret, room: { ...own.room, open: false, ban: [b.pid] } } });
    await join(own, own.pid);
    await expect(join(f, own.pid)).rejects.toThrow(/davet/);
    await expect(join(b, own.pid, { token: own.room.token })).rejects.toThrow(/giremezsin/);
    const cf = await join(f, own.pid, { token: own.room.token });
    expect(cf.sessionId).toBeTruthy();
  });

  it('a focus in your room pays like the study room', async () => {
    const own = await player('Sena'); const c = await join(own, own.pid); await wait(50);
    const room = await roomOf(own.pid);
    let reward: { gained: { coins: number } } | null = null; c.onMessage('reward', (m) => { reward = m; });
    c.send('timer', { action: 'start' }); await wait(50);
    (room as any).track.get(c.sessionId).accMs = 25 * 60_000; (room as any).track.get(c.sessionId).since = null;
    room.endPlayerPhaseIn(c.sessionId, 10); await wait(600);
    expect(reward!.gained.coins).toBeGreaterThan(0);
  });

  it('saving the room changes the live room: new layout and more seats', async () => {
    const own = await player('Kaan'); await join(own, own.pid); await wait(50);
    // a sofa: 2 more seats (bought first)
    await colyseus.http.post('/api/buy', { body: { pid: own.pid, secret: own.secret, itemId: 'f_stool' } });
    const items = [...own.room.items, { id: 'f_stool', x: 1, z: 1, r: 0 }];
    await colyseus.http.post('/api/room', { body: { pid: own.pid, secret: own.secret, room: { ...own.room, name: 'Kütüphanem', items } } });
    await wait(50);
    const room = await roomOf(own.pid);
    expect(JSON.parse(room.state.layout).items).toHaveLength(4);
    expect(room.capacity).toBe(3);
    expect(room.metadata).toMatchObject({ name: 'Kütüphanem', cap: 3 });
  });

  it('the world list shows open rooms with free seats, never closed ones', async () => {
    const a = await player('Acik'), b = await player('Kapali');
    await colyseus.http.post('/api/room', { body: { pid: b.pid, secret: b.secret, room: { ...b.room, open: false } } });
    await join(a, a.pid); await join(b, b.pid); await wait(50);
    const w = await colyseus.http.get('/api/world');
    const owners = w.data.rooms.map((r: { owner: string }) => r.owner);
    expect(owners).toContain(a.pid); expect(owners).not.toContain(b.pid);
    expect(w.data.rooms.find((r: { owner: string }) => r.owner === a.pid)).toMatchObject({ ownerName: 'Acik', n: 1, cap: 2 });
  });
});
