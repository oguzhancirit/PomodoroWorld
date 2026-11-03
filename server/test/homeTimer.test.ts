// The v1 focus screen in your room: pause / resume, skip, your own focus / break length.
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
  const pid = `tm${name.toLowerCase().padEnd(6, 'x')}${String(++n).padStart(4, '0')}`.slice(0, 16), secret = 't'.repeat(32);
  await colyseus.http.post('/api/profile', { body: { pid, secret } });
  return { pid, secret, name };
}
const join = (p: { pid: string; secret: string; name: string }) =>
  colyseus.sdk.joinOrCreate('home', { pid: p.pid, secret: p.secret, name: p.name, owner: p.pid });
const roomOf = async (owner: string) => {
  const [r] = await matchMaker.query({ name: 'home', owner } as never);
  return colyseus.getRoomById<HomeRoom>(r.roomId);
};

describe('HomeRoom timer controls', () => {
  it('a custom focus / break length is used', async () => {
    const me = await player('Deniz'); const c = await join(me); await wait(50);
    const room = await roomOf(me.pid);
    c.send('timer', { action: 'start', preset: 'c40-8' }); await wait(80);
    expect(room.state.preset).toBe('c40-8');
    expect(room.state.timer.phaseEndsAt - Date.now()).toBeGreaterThan(39 * 60_000);
  });

  it('pause freezes the time left (shown to everyone); resume continues; paused time is not paid', async () => {
    const me = await player('Ece'); const c = await join(me); await wait(50);
    const room = await roomOf(me.pid);
    c.send('timer', { action: 'start' }); await wait(80);
    c.send('timer', { action: 'pause' }); await wait(80);
    expect(room.state.timer.pausedLeft).toBeGreaterThan(24 * 60_000);
    expect(c.state.timer.pausedLeft).toBe(room.state.timer.pausedLeft);
    const t = (room as any).track.get(c.sessionId);
    expect(t.since).toBeNull();
    const acc = t.accMs;
    await wait(120);
    expect((room as any).track.get(c.sessionId).accMs).toBe(acc);
    c.send('timer', { action: 'resume' }); await wait(80);
    expect(room.state.timer.pausedLeft).toBe(0);
    expect(room.state.timer.phaseEndsAt).toBeGreaterThan(Date.now() + 24 * 60_000);
    expect((room as any).track.get(c.sessionId).since).not.toBeNull();
  });

  it('a paused timer never ends by itself', async () => {
    const me = await player('Mert'); const c = await join(me); await wait(50);
    const room = await roomOf(me.pid);
    c.send('timer', { action: 'start' }); await wait(60);
    room.endPhaseIn(150);
    c.send('timer', { action: 'pause' }); await wait(300);
    expect(room.state.timer.phase).toBe('focus');
  });

  it('skip focus: the break starts now and the minutes so far count, but not as a full pomodoro', async () => {
    const me = await player('Ada'); const c = await join(me); await wait(50);
    const room = await roomOf(me.pid);
    let reward: { completed: boolean; minutes: number } | null = null; c.onMessage('reward', (m) => { reward = m; });
    c.send('timer', { action: 'start' }); await wait(60);
    (room as any).track.get(c.sessionId).accMs = 10 * 60_000;
    c.send('timer', { action: 'skip' }); await wait(120);
    expect(room.state.timer.phase).toBe('short_break');
    expect(reward!.completed).toBe(false);
    expect(reward!.minutes).toBe(10);
    // skipping the break stops the timer (v1)
    c.send('timer', { action: 'skip' }); await wait(80);
    expect(room.state.timer.phase).toBe('idle');
  });
});
