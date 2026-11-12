// "Arkadaşını çağır" (user 2026-11-09): call an online friend into your room; they accept or decline on their screen.
// When a called friend arrives, both get the one-time welcome (pack + a week of double XP).
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
  const pid = `cl${name.toLowerCase().padEnd(6, 'x')}${String(++n).padStart(4, '0')}`.slice(0, 16), secret = 'c'.repeat(32);
  const prof = await colyseus.http.post('/api/profile', { body: { pid, secret } });
  return { pid, secret, name, coins: prof.data.wallet.coins as number };
}
type P = Awaited<ReturnType<typeof player>>;
const home = (p: P, owner: string) => colyseus.sdk.joinOrCreate('home', { pid: p.pid, secret: p.secret, name: p.name, owner });
const library = (p: P) => colyseus.sdk.joinOrCreate('library', { pid: p.pid, secret: p.secret, name: p.name, preset: 'p25' });
const befriend = (a: P, b: P) => colyseus.http.post('/api/friends', { body: { pid: a.pid, secret: a.secret, op: 'add', target: b.pid, name: b.name } });
/** collect messages of one type */
function inbox(room: { onMessage(t: string, cb: (m: unknown) => void): void }, type: string) { const got: any[] = []; room.onMessage(type, (m) => got.push(m)); return got; }

describe('calling a friend into your room', () => {
  it('owner calls, friend accepts, joins with the invite it got, both get the welcome once', async () => {
    const a = await player('Oguz'), b = await player('Ayse');
    await befriend(a, b);
    // the room is invite-only: the call itself lets the friend in
    await colyseus.http.post('/api/room', { body: { pid: a.pid, secret: a.secret, room: { open: false, items: [{ id: 'f_desk_wood', x: 0.2, z: -1.15, r: 0 }, { id: 'f_chair_wood', x: 0.2, z: -1.9, r: 0 }, { id: 'f_chair_wood', x: 1.2, z: -1.9, r: 0 }] } } });
    const ca = await home(a, a.pid), cb = await library(b);
    const status = inbox(ca, 'call_status'), called = inbox(cb, 'called'), go = inbox(cb, 'call_go'), bonusA = inbox(ca, 'bonus');
    await wait(60);
    ca.send('call', { target: b.pid }); await wait(120);
    expect(status.at(-1)).toMatchObject({ status: 'sent', name: 'Ayse' });
    expect(called[0]).toMatchObject({ fromName: 'Oguz', owner: a.pid });
    cb.send('call_reply', { id: called[0].id, accept: true }); await wait(120);
    expect(status.at(-1)).toMatchObject({ status: 'coming', name: 'Ayse' });
    expect(go[0].code).toMatch(new RegExp(`^${a.pid}-`));
    const [owner, token] = go[0].code.split('-');
    const cb2 = await colyseus.sdk.joinOrCreate('home', { pid: b.pid, secret: b.secret, name: b.name, owner, token });
    const bonusB = inbox(cb2, 'bonus');
    await wait(200);
    expect(bonusA[0]).toMatchObject({ got: true, with: 'Ayse' });
    expect(bonusB[0]).toMatchObject({ got: true, with: 'Oguz' });
    const wa = (await colyseus.http.post('/api/profile', { body: { pid: a.pid, secret: a.secret } })).data.wallet;
    const wb = (await colyseus.http.post('/api/profile', { body: { pid: b.pid, secret: b.secret } })).data.wallet;
    expect(wa.coins).toBe(a.coins + 300); expect(wb.coins).toBe(b.coins + 300);
    expect(wa.boostUntil).toBeGreaterThan(Date.now() + 6 * 86_400_000);
    expect(wb.owned.f_cushion).toBe(1);
  });

  it('a decline is told to the caller; nobody gets anything', async () => {
    const a = await player('Kaan'), b = await player('Lale');
    await befriend(a, b);
    const ca = await home(a, a.pid), cb = await library(b);
    const status = inbox(ca, 'call_status'), called = inbox(cb, 'called');
    await wait(60);
    ca.send('call', { target: b.pid }); await wait(120);
    cb.send('call_reply', { id: called[0].id, accept: false }); await wait(120);
    expect(status.at(-1)).toMatchObject({ status: 'declined', name: 'Lale' });
    const wb = (await colyseus.http.post('/api/profile', { body: { pid: b.pid, secret: b.secret } })).data.wallet;
    expect(wb.coins).toBe(b.coins);
  });

  it('only friends, only online ones, only from your own room, and not twice in a row', async () => {
    const a = await player('Mert'), b = await player('Nil'), c = await player('Oya');
    const ca = await home(a, a.pid); const status = inbox(ca, 'call_status');
    await library(b); await wait(60);
    ca.send('call', { target: b.pid }); await wait(100);
    expect(status.at(-1)).toMatchObject({ status: 'not_friend' });
    await befriend(a, c);
    ca.send('call', { target: c.pid }); await wait(100);
    expect(status.at(-1)).toMatchObject({ status: 'offline' });
    await befriend(a, b);
    ca.send('call', { target: b.pid }); await wait(100);
    ca.send('call', { target: b.pid }); await wait(100);
    expect(status.at(-1)).toMatchObject({ status: 'wait' });
    // a guest in someone else's room cannot call people into it
    const d = await player('Pera'); await befriend(d, b);
    const cd = await home(d, a.pid).catch(() => null);
    if (cd) { const sd = inbox(cd, 'call_status'); cd.send('call', { target: b.pid }); await wait(100); expect(sd.at(-1)).toMatchObject({ status: 'not_owner' }); }
  });

  it('a stale or someone else\'s call cannot be answered', async () => {
    const a = await player('Rana'), b = await player('Sila'), c = await player('Tan');
    await befriend(a, b);
    const ca = await home(a, a.pid), cb = await library(b), cc = await library(c);
    const called = inbox(cb, 'called'), goC = inbox(cc, 'call_go');
    await wait(60);
    ca.send('call', { target: b.pid }); await wait(120);
    cc.send('call_reply', { id: called[0].id, accept: true }); await wait(120);
    expect(goC).toHaveLength(0);
  });
});
