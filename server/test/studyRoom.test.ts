import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import { server } from '../src/app.config';
import type { StudyRoom } from '../src/rooms/StudyRoom';
import { encodeAvatar, defaultAvatar } from '@pw/shared';
import { CloseCode } from '@colyseus/core';

let colyseus: ColyseusTestServer;
beforeAll(async () => { colyseus = await boot(server); });
afterAll(async () => { await colyseus.shutdown(); });
beforeEach(async () => { await colyseus.cleanup(); });

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('StudyRoom', () => {
  it('starts the shared timer as soon as the room exists', async () => {
    const room = await colyseus.createRoom<StudyRoom>('study_room', { preset: 'p50' });
    expect(room.state.timer.phase).toBe('focus');
    expect(room.state.preset).toBe('p50');
    const left = room.state.timer.phaseEndsAt - Date.now();
    expect(left).toBeGreaterThan(49 * 60_000);
    expect(left).toBeLessThanOrEqual(50 * 60_000);
  });

  it('everyone sees the same timer and gets their own seat', async () => {
    const room = await colyseus.createRoom<StudyRoom>('study_room', {});
    const a = await colyseus.connectTo(room, { name: 'Ayşe', avatar: encodeAvatar(defaultAvatar('f')) });
    const b = await colyseus.connectTo(room, { name: 'Mert', avatar: encodeAvatar(defaultAvatar('m')) });
    await wait(100);
    expect(a.state.timer.phaseEndsAt).toBe(b.state.timer.phaseEndsAt);
    const pa = room.state.players.get(a.sessionId)!, pb = room.state.players.get(b.sessionId)!;
    expect(pa.name).toBe('Ayşe'); expect(pb.name).toBe('Mert');
    expect(pa.seatIndex).not.toBe(pb.seatIndex);
    expect(pa.pose).toBe('sit');
  });

  it('cleans bad names and rejects broken avatar codes', async () => {
    const room = await colyseus.createRoom<StudyRoom>('study_room', {});
    const c = await colyseus.connectTo(room, { name: '<b>siktir</b>', avatar: 'zzz.999' });
    await c.waitForNextPatch();
    const p = room.state.players.get(c.sessionId)!;
    expect(p.name).toBe('Oyuncu');
    expect(p.avatar).toBe(encodeAvatar(defaultAvatar('f')));
  });

  it('chat is closed during focus', async () => {
    const room = await colyseus.createRoom<StudyRoom>('study_room', {});
    const c = await colyseus.connectTo(room, { name: 'Ali' });
    const notice = c.waitForMessage('notice');
    c.send('chat', { text: 'selam' });
    expect(await notice).toMatchObject({ code: 'chat_closed' });
    expect(room.state.players.get(c.sessionId)!.bubble).toBe('');
  });

  it('chat in a break shows a cleaned bubble and is rate limited', async () => {
    const room = await colyseus.createRoom<StudyRoom>('study_room', {});
    room.forcePhase('short_break');
    const c = await colyseus.connectTo(room, { name: 'Ali' });
    const got = c.waitForMessage('chat');
    c.send('chat', { text: '  selam   amk  ' });
    expect(await got).toMatchObject({ name: 'Ali', text: 'selam a**' });
    await room.waitForNextPatch();
    expect(room.state.players.get(c.sessionId)!.bubble).toBe('selam a**');
    const limited = c.waitForMessage('notice');
    c.send('chat', { text: 'ikinci' });
    expect(await limited).toMatchObject({ code: 'slow_down' });
  });

  it('malformed messages change nothing; the sender is dropped, the room keeps running', async () => {
    const room = await colyseus.createRoom<StudyRoom>('study_room', {});
    room.forcePhase('short_break');
    const good = await colyseus.connectTo(room, { name: 'Ali' });
    const bad = await colyseus.connectTo(room, { name: 'Kötü' });
    await wait(50);
    const seatBefore = room.state.players.get(bad.sessionId)!.seatIndex;
    bad.send('chat', { text: 42 }); bad.send('sit', { seatIndex: 'x' }); bad.send('emote', { e: 'nuke' });
    await wait(200);
    const p = room.state.players.get(bad.sessionId);
    expect(p === undefined || (p.bubble === '' && p.seatIndex === seatBefore)).toBe(true);
    expect(room.state.players.has(good.sessionId)).toBe(true);
    const got = good.waitForMessage('chat');
    good.send('chat', { text: 'hala buradayım' });
    expect(await got).toMatchObject({ text: 'hala buradayım' });
  });

  it('phase change is decided by the server and announced', async () => {
    const room = await colyseus.createRoom<StudyRoom>('study_room', {});
    const c = await colyseus.connectTo(room, { name: 'Ali' });
    const phase = c.waitForMessage('phase');
    room.endPhaseIn(30);
    expect(await phase).toMatchObject({ phase: 'short_break', round: 1 });
    expect(room.state.timer.phase).toBe('short_break');
    expect(room.state.timer.round).toBe(1);
  });

  it('switching seats only works for a free seat', async () => {
    const room = await colyseus.createRoom<StudyRoom>('study_room', {});
    const a = await colyseus.connectTo(room, { name: 'A' });
    const b = await colyseus.connectTo(room, { name: 'B' });
    await wait(50);
    const seatA = room.state.players.get(a.sessionId)!.seatIndex;
    b.send('sit', { seatIndex: seatA }); await wait(100);
    expect(room.state.players.get(b.sessionId)!.seatIndex).not.toBe(seatA);
    b.send('sit', { seatIndex: 7 }); await wait(100);
    expect(room.state.players.get(b.sessionId)!.seatIndex).toBe(7);
  });

  it('each player picks what they work on (desk animation), validated by the server', async () => {
    const room = await colyseus.createRoom<StudyRoom>('study_room', {});
    const a = await colyseus.connectTo(room, { name: 'A', activity: 'read' });
    await wait(50);
    expect(room.state.players.get(a.sessionId)!.activity).toBe('read');
    a.send('activity', { activity: 'write' }); await wait(80);
    expect(room.state.players.get(a.sessionId)!.activity).toBe('write');
    const b = await colyseus.connectTo(room, { name: 'B', activity: 'hack' as never });
    await wait(50);
    expect(room.state.players.get(b.sessionId)!.activity).toBe('type');
  });

  it('emotes are broadcast to the room', async () => {
    const room = await colyseus.createRoom<StudyRoom>('study_room', {});
    const a = await colyseus.connectTo(room, { name: 'A' });
    const b = await colyseus.connectTo(room, { name: 'B' });
    const got = b.waitForMessage('emote');
    a.send('emote', { e: 'wave' });
    expect(await got).toMatchObject({ id: a.sessionId, e: 'wave' });
  });

  it('answers a time sync request with the server clock', async () => {
    const room = await colyseus.createRoom<StudyRoom>('study_room', {});
    const a = await colyseus.connectTo(room, { name: 'A' });
    const got = a.waitForMessage('time');
    a.send('time', { t0: 123 });
    const m = await got;
    expect(m.t0).toBe(123); expect(Math.abs(m.server - Date.now())).toBeLessThan(1000);
  });

  it('a dropped connection keeps the seat and comes back (reconnection)', async () => {
    const room = await colyseus.createRoom<StudyRoom>('study_room', {});
    const c = await colyseus.connectTo(room, { name: 'Wifi' });
    await wait(50);
    const seat = room.state.players.get(c.sessionId)!.seatIndex;
    let sawDisconnected = false;
    const watch = setInterval(() => { const p = room.state.players.get(c.sessionId); if (p && !p.connected) sawDisconnected = true; }, 5);
    c.reconnection.minUptime = 0; // the SDK normally waits a few seconds before it allows auto-reconnect
    const back = new Promise<void>((r) => c.onReconnect(() => r()));
    c.connection.close(CloseCode.MAY_TRY_RECONNECT, 'network glitch');
    await back; await wait(100); clearInterval(watch);
    const p = room.state.players.get(c.sessionId)!;
    expect(sawDisconnected).toBe(true);
    expect(p.connected).toBe(true);
    expect(p.seatIndex).toBe(seat);
  });

  it('a player who leaves frees the seat', async () => {
    const room = await colyseus.createRoom<StudyRoom>('study_room', {});
    const a = await colyseus.connectTo(room, { name: 'A' });
    await wait(50);
    await a.leave(); await wait(100);
    expect(room.state.players.size).toBe(0);
  });

  it('a full focus pays XP and coins to the player, decided by the server', async () => {
    const room = await colyseus.createRoom<StudyRoom>('study_room', {});
    const c = await colyseus.connectTo(room, { name: 'Ali', pid: 'pidreward0001', secret: 'r'.repeat(32) });
    await wait(50);
    room.forcePhase('focus');                 // a fresh focus with Ali present from the start
    const got = c.waitForMessage('reward');
    room.endPhaseIn(30);
    const m = await got;
    expect(m.gained.xp).toBeGreaterThanOrEqual(10);
    expect(m.wallet.stats.pomos).toBe(1);
    expect(room.state.players.get(c.sessionId)!.level).toBeGreaterThanOrEqual(1);
  });

  it('joining in the middle of a focus pays minutes but not the pomodoro bonus', async () => {
    const room = await colyseus.createRoom<StudyRoom>('study_room', {});
    const c = await colyseus.connectTo(room, { name: 'Geç', pid: 'pidreward0002', secret: 'r'.repeat(32) });
    const got = c.waitForMessage('reward');
    room.endPhaseIn(30);
    expect((await got).wallet.stats.pomos).toBe(0);
  });

  it('a wrong secret for a known player id is refused', async () => {
    const room = await colyseus.createRoom<StudyRoom>('study_room', {});
    await colyseus.connectTo(room, { name: 'A', pid: 'pidsecret0001', secret: 'a'.repeat(32) });
    await expect(colyseus.connectTo(room, { name: 'B', pid: 'pidsecret0001', secret: 'b'.repeat(32) })).rejects.toBeTruthy();
  });

  it('wearing a paid part you do not own falls back to the default look', async () => {
    const room = await colyseus.createRoom<StudyRoom>('study_room', {});
    const c = await colyseus.connectTo(room, { name: 'A', pid: 'pidwear000001', secret: 'w'.repeat(32), avatar: 'f.0.4.0.0.0.0.0.0' });
    await wait(50);
    expect(room.state.players.get(c.sessionId)!.avatar).toBe(encodeAvatar(defaultAvatar('f')));
  });

  it('the shop sells over HTTP with the server price list', async () => {
    const id = 'pidshop000001', secret = 'q'.repeat(32);
    const prof = await colyseus.http.post('/api/profile', { body: { pid: id, secret } });
    expect(prof.data.wallet.coins).toBe(150);
    const ok = await colyseus.http.post('/api/buy', { body: { pid: id, secret, itemId: 'furn.lamp_table' } });
    expect(ok.data.ok).toBe(true); expect(ok.data.wallet.coins).toBe(110);
    const no = await colyseus.http.post('/api/buy', { body: { pid: id, secret, itemId: 'furn.couch_pillows' } }).catch((e) => e);
    expect(no.data?.ok ?? no.response?.data?.ok).toBe(false);
    const bad = await colyseus.http.post('/api/buy', { body: { pid: id, secret: 'z'.repeat(32), itemId: 'furn.lamp_table' } }).catch((e) => e);
    expect(bad.statusCode ?? bad.status).toBe(403);
  });

  it('rooms are grouped by preset', async () => {
    const r25 = await colyseus.sdk.joinOrCreate('study_room', { preset: 'p25', name: 'x' });
    const r50 = await colyseus.sdk.joinOrCreate('study_room', { preset: 'p50', name: 'y' });
    const r25b = await colyseus.sdk.joinOrCreate('study_room', { preset: 'p25', name: 'z' });
    expect(r25.roomId).not.toBe(r50.roomId);
    expect(r25.roomId).toBe(r25b.roomId);
    await Promise.all([r25.leave(), r50.leave(), r25b.leave()]);
  });
});
