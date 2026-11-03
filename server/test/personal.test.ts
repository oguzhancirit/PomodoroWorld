// User rule (2026-11-03): nobody has to focus at the same time. Everyone runs their own timer, in their own room,
// a friend's room or the library; the server pays each person for their own focus. "Birlikte" = join a friend's
// timer (v1 followPeer).
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
async function player(name: string) {
  const pid = `pt${name.toLowerCase().padEnd(6, 'x')}${String(++n).padStart(4, '0')}`.slice(0, 16), secret = 'p'.repeat(32);
  await colyseus.http.post('/api/profile', { body: { pid, secret } });
  return { pid, secret, name };
}
const join = (p: { pid: string; secret: string; name: string }, owner: string, extra: object = {}) =>
  colyseus.sdk.joinOrCreate('home', { pid: p.pid, secret: p.secret, name: p.name, owner, ...extra });
const roomOf = async (owner: string) => {
  const [r] = await matchMaker.query({ name: 'home', owner } as never);
  return colyseus.getRoomById<HomeRoom>(r.roomId);
};
async function duo() {
  const a = await player('Asli'), b = await player('Baris');
  const ca = await join(a, a.pid), cb = await join(b, a.pid); await wait(60);
  return { a, b, ca, cb, room: await roomOf(a.pid) };
}
const tm = (room: HomeRoom, id: string) => room.state.players.get(id)!.timer;

describe('personal timers', () => {
  it('starting my timer starts only mine, with my own length', async () => {
    const { ca, cb, room } = await duo();
    ca.send('timer', { action: 'start', preset: 'p50' }); await wait(80);
    expect(tm(room, ca.sessionId).phase).toBe('focus');
    expect(room.state.players.get(ca.sessionId)!.preset).toBe('p50');
    expect(tm(room, ca.sessionId).phaseEndsAt - Date.now()).toBeGreaterThan(49 * 60_000);
    expect(tm(room, cb.sessionId).phase).toBe('idle');
    // the other one sees it too (status over the head)
    expect(cb.state.players.get(ca.sessionId)!.timer.phase).toBe('focus');
  });

  it('two people run different timers; pausing or stopping mine does not touch yours', async () => {
    const { ca, cb, room } = await duo();
    ca.send('timer', { action: 'start', preset: 'p25' }); cb.send('timer', { action: 'start', preset: 'c40-8' }); await wait(80);
    ca.send('timer', { action: 'pause' }); await wait(80);
    expect(tm(room, ca.sessionId).pausedLeft).toBeGreaterThan(0);
    expect(tm(room, cb.sessionId).pausedLeft).toBe(0);
    cb.send('timer', { action: 'stop' }); await wait(80);
    expect(tm(room, cb.sessionId).phase).toBe('idle');
    expect(tm(room, ca.sessionId).phase).toBe('focus');
  });

  it('a finished focus pays only the person whose focus it was', async () => {
    const { ca, cb, room } = await duo();
    const got: string[] = [];
    ca.onMessage('reward', () => got.push('a')); cb.onMessage('reward', () => got.push('b'));
    ca.send('timer', { action: 'start' }); await wait(60);
    room.endPlayerPhaseIn(ca.sessionId, 50); await wait(1300);
    expect(got).toEqual(['a']);
    expect(tm(room, ca.sessionId).phase).toBe('short_break');
  });

  it('chat is closed only for the person who is focusing', async () => {
    const { ca, cb } = await duo();
    const notes: string[] = []; ca.onMessage('notice', (m) => notes.push(m.code));
    const lines: string[] = []; cb.onMessage('chat', (m) => lines.push(m.text));
    ca.send('timer', { action: 'start' }); await wait(60);
    ca.send('chat', { text: 'selam' }); cb.send('chat', { text: 'merhaba' }); await wait(120);
    expect(notes).toContain('chat_closed');
    expect(lines).toEqual(['merhaba']);
  });

  it('"Birlikte": I join a friend\'s running timer (same length, same end)', async () => {
    const { ca, cb, room } = await duo();
    ca.send('timer', { action: 'start', preset: 'p50' }); await wait(80);
    cb.send('follow', { id: ca.sessionId }); await wait(80);
    expect(tm(room, cb.sessionId).phase).toBe('focus');
    expect(tm(room, cb.sessionId).phaseEndsAt).toBe(tm(room, ca.sessionId).phaseEndsAt);
    expect(room.state.players.get(cb.sessionId)!.preset).toBe('p50');
  });

  it('the library: everyone starts idle and runs their own timer', async () => {
    const a = await player('Cansu'), b = await player('Doruk');
    const ca = await colyseus.sdk.joinOrCreate('library', { pid: a.pid, secret: a.secret, name: 'Cansu', preset: 'p25' });
    const cb = await colyseus.sdk.joinOrCreate('library', { pid: b.pid, secret: b.secret, name: 'Doruk', preset: 'p25' });
    await wait(60);
    expect(ca.roomId).toBe(cb.roomId);
    expect(ca.state.players.get(ca.sessionId)!.timer.phase).toBe('idle');
    ca.send('timer', { action: 'start' }); await wait(80);
    expect(cb.state.players.get(ca.sessionId)!.timer.phase).toBe('focus');
    expect(cb.state.players.get(cb.sessionId)!.timer.phase).toBe('idle');
  });

  it('libraries are shared by everyone, whatever length they chose', async () => {
    const a = await player('Ebru'), b = await player('Fatih');
    const ca = await colyseus.sdk.joinOrCreate('library', { pid: a.pid, secret: a.secret, name: 'Ebru', preset: 'p25' });
    const cb = await colyseus.sdk.joinOrCreate('library', { pid: b.pid, secret: b.secret, name: 'Fatih', preset: 'p90' });
    expect(ca.roomId).toBe(cb.roomId);
  });

  it('my running timer comes with me to another room (checked by the server)', async () => {
    const a = await player('Gul');
    const now = Date.now();
    const timer = { phase: 'focus', phaseEndsAt: now + 10 * 60_000, round: 1, pausedLeft: 0 };
    const c = await colyseus.sdk.joinOrCreate('library', { pid: a.pid, secret: a.secret, name: 'Gul', preset: 'p25', timer });
    await wait(60);
    const t = c.state.players.get(c.sessionId)!.timer;
    expect(t).toMatchObject({ phase: 'focus', phaseEndsAt: timer.phaseEndsAt, round: 1 });
  });

  it('a carried timer that is longer than its length allows is refused (starts idle)', async () => {
    const a = await player('Hale');
    const timer = { phase: 'focus', phaseEndsAt: Date.now() + 99 * 60_000, round: 0, pausedLeft: 0 };
    const c = await colyseus.sdk.joinOrCreate('library', { pid: a.pid, secret: a.secret, name: 'Hale', preset: 'p25', timer });
    await wait(60);
    expect(c.state.players.get(c.sessionId)!.timer.phase).toBe('idle');
  });
});
