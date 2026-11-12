// Step 4g: social spaces — meet people in breaks. Chat is always open there; timers stay personal.
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
  const pid = `sc${name.toLowerCase().padEnd(6, 'x')}${String(++n).padStart(4, '0')}`.slice(0, 16), secret = 's'.repeat(32);
  await colyseus.http.post('/api/profile', { body: { pid, secret } });
  return { pid, secret, name };
}
const enter = (p: { pid: string; secret: string; name: string }, space: string) =>
  colyseus.sdk.joinOrCreate('social', { pid: p.pid, secret: p.secret, name: p.name, space });

describe('social spaces', () => {
  it('each space is its own room; people in the same space meet', async () => {
    const a = await enter(await player('Ali'), 'meydan'), b = await enter(await player('Bade'), 'meydan'), c = await enter(await player('Cem'), 'teras');
    await wait(60);
    expect(a.roomId).toBe(b.roomId);
    expect(c.roomId).not.toBe(a.roomId);
  });

  it('an unknown space is refused', async () => {
    await expect(enter(await player('Dila'), 'nowhere')).rejects.toThrow();
  });

  it('chat is open even while my own focus runs (it is the place to talk)', async () => {
    const a = await enter(await player('Emre'), 'oyun'), b = await enter(await player('Fulya'), 'oyun'); await wait(60);
    const lines: string[] = []; b.onMessage('chat', (m) => lines.push(m.text));
    a.send('timer', { action: 'start' }); await wait(60);
    a.send('chat', { text: 'selam' }); await wait(120);
    expect(lines).toEqual(['selam']);
  });

  it('chatting there counts for the social quest', async () => {
    const p = await player('Gaye'); const a = await enter(p, 'meydan'); await wait(60);
    let wallet: { q: { daily: Record<string, { p: number }> } } | null = null; a.onMessage('wallet', (m) => { wallet = m.wallet; });
    a.send('chat', { text: 'merhaba' }); await wait(150);
    expect(wallet!.q.daily.d_social?.p ?? 0).toBeGreaterThan(0);
  });

  it('friends list and world list know about the spaces', async () => {
    const a = await player('Hilal'), b = await player('Ilgaz');
    const cb = await enter(b, 'teras'); await wait(60);
    const r = (await colyseus.http.post('/api/friends', { body: { pid: a.pid, secret: a.secret, op: 'add', target: b.pid } })).data;
    expect(r.friends[0].where).toMatchObject({ kind: 'social', space: 'teras', roomId: cb.roomId, name: 'Çatı Terası', open: true });
    const w = (await colyseus.http.get('/api/world')).data;
    expect(w.social).toMatchObject({ teras: 1 });
  });
});
