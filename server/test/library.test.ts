// Step 4f: the library, a public study room for 10. Full → the next person gets a second library.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import { server } from '../src/app.config';

let colyseus: ColyseusTestServer;
beforeAll(async () => { colyseus = await boot(server); });
afterAll(async () => { await colyseus.shutdown(); });
beforeEach(async () => { await colyseus.cleanup(); });

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let n = 0;
async function player(name: string) {
  const pid = `lb${name.toLowerCase().padEnd(6, 'x')}${String(++n).padStart(4, '0')}`.slice(0, 16), secret = 'l'.repeat(32);
  await colyseus.http.post('/api/profile', { body: { pid, secret } });
  return { pid, secret, name };
}
const enter = (p: { pid: string; secret: string; name: string }, extra: object = {}) =>
  colyseus.sdk.joinOrCreate('library', { pid: p.pid, secret: p.secret, name: p.name, preset: 'p25', ...extra });

describe('library', () => {
  it('10 people get 10 different chairs; the 11th gets a new library', async () => {
    const cs = [];
    for (let i = 0; i < 11; i++) cs.push(await enter(await player(`K${i}`)));
    await wait(100);
    const first = cs[0].roomId;
    expect(cs.slice(0, 10).every((c) => c.roomId === first)).toBe(true);
    expect(cs[10].roomId).not.toBe(first);
    const seats = [...cs[0].state.players.values()].map((p) => p.seatIndex).sort((a, b) => a - b);
    expect(seats).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('a friend in the library shows up in the friends list with a way to join that library', async () => {
    const a = await player('Pelin'), b = await player('Rana');
    const cb = await enter(b); await wait(60);
    cb.send('timer', { action: 'start' }); await wait(80);
    const r = (await colyseus.http.post('/api/friends', { body: { pid: a.pid, secret: a.secret, op: 'add', target: b.pid } })).data;
    expect(r.friends[0]).toMatchObject({ online: true, where: { kind: 'library', roomId: cb.roomId, open: true, n: 1, cap: 10, phase: 'focus' } });
  });

  it('the world list says how many people study in the library', async () => {
    await enter(await player('Seda')); await enter(await player('Tuna')); await wait(80);
    const w = (await colyseus.http.get('/api/world')).data;
    expect(w.library).toBe(2);
  });

  it('Pist 25 is its own hall: 8 cockpit seats, never mixed with the library, counted on its own in the world list', async () => {
    const pl = (p: { pid: string; secret: string; name: string }) => colyseus.sdk.joinOrCreate('pist25', { pid: p.pid, secret: p.secret, name: p.name, preset: 'p25' });
    const cs = [];
    for (let i = 0; i < 9; i++) cs.push(await pl(await player(`P${i}`)));
    const lib = await enter(await player('Lale'));
    await wait(100);
    expect(cs.slice(0, 8).every((c) => c.roomId === cs[0].roomId)).toBe(true);
    expect(cs[8].roomId).not.toBe(cs[0].roomId);
    expect(lib.roomId).not.toBe(cs[0].roomId);
    const w = (await colyseus.http.get('/api/world')).data;
    expect(w.library).toBe(1);
    expect(w.halls).toMatchObject({ library: 1, pist25: 9 });
  });

  it('a friend in Pist 25 shows up with the hall name', async () => {
    const a = await player('Umut'), b = await player('Veli');
    const cb = await colyseus.sdk.joinOrCreate('pist25', { pid: b.pid, secret: b.secret, name: b.name, preset: 'p25' }); await wait(60);
    const r = (await colyseus.http.post('/api/friends', { body: { pid: a.pid, secret: a.secret, op: 'add', target: b.pid } })).data;
    expect(r.friends[0]).toMatchObject({ online: true, where: { kind: 'library', hall: 'pist25', name: 'Pist 25', roomId: cb.roomId, cap: 8 } });
  });
});
