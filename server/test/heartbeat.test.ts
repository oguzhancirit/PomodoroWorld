// User 2026-11-12: "arka planda kalınca 'Bağlantı koptu' çıkıyor". A background tab freezes its timers, so the
// client's own 50 s "time" message stops; after 5 silent minutes the host's door closes the line. The server's
// clock never sleeps: it sends every player a tiny "beat" so the line is never silent.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import { server } from '../src/app.config';
import { BEAT } from '../src/rooms/StudyRoom';

let colyseus: ColyseusTestServer;
beforeAll(async () => { BEAT.ms = 80; colyseus = await boot(server); });
afterAll(async () => { BEAT.ms = 40_000; await colyseus.shutdown(); });
beforeEach(async () => { await colyseus.cleanup(); });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('server heartbeat', () => {
  it('a player who sends nothing still hears from the server regularly (home room)', async () => {
    const pid = 'hbeatplayer00001', secret = 'h'.repeat(32);
    await colyseus.http.post('/api/profile', { body: { pid, secret } });
    const c = await colyseus.sdk.joinOrCreate('home', { pid, secret, name: 'Beat', owner: pid });
    let beats = 0; c.onMessage('beat', () => { beats++; });
    await wait(400);
    expect(beats).toBeGreaterThanOrEqual(3);
  });

  it('the shared study room beats too', async () => {
    const c = await colyseus.sdk.joinOrCreate('study_room', { name: 'Beat', preset: 'p25' });
    let beats = 0; c.onMessage('beat', () => { beats++; });
    await wait(400);
    expect(beats).toBeGreaterThanOrEqual(3);
  });
});
