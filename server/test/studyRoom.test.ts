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
    const ok = await colyseus.http.post('/api/buy', { body: { pid: id, secret, itemId: 'f_cactus' } });
    expect(ok.data.ok).toBe(true); expect(ok.data.wallet.coins).toBe(100); // f_cactus costs 50, as in the original shop
    const no = await colyseus.http.post('/api/buy', { body: { pid: id, secret, itemId: 'f_sofa_l' } }).catch((e) => e);
    expect(no.data?.ok ?? no.response?.data?.ok).toBe(false);
    const bad = await colyseus.http.post('/api/buy', { body: { pid: id, secret: 'z'.repeat(32), itemId: 'f_cactus' } }).catch((e) => e);
    expect(bad.statusCode ?? bad.status).toBe(403);
  });

  it('saves the personal room, keeping only what the player owns', async () => {
    const id = 'pidroom000001', secret = 'r'.repeat(32);
    const prof = await colyseus.http.post('/api/profile', { body: { pid: id, secret } });
    expect(prof.data.room.items.map((i: { id: string }) => i.id)).toEqual(['f_desk_wood', 'f_chair_wood', 'f_chair_wood']);
    const items = [{ id: 'f_desk_wood', x: 1, z: 1, r: 1 }, { id: 'f_sofa', x: 0, z: 0, r: 0 }, ...Array.from({ length: 300 }, () => ({ id: 'f_chair_wood', x: 0, z: 0, r: 0 }))];
    const saved = await colyseus.http.post('/api/room', { body: { pid: id, secret, room: { name: 'Benim <b>odam</b>', theme: 'th_space', items } } });
    expect(saved.data.ok).toBe(true);
    expect(saved.data.room.name).not.toContain('<');
    expect(saved.data.room.theme).toBe('th_wood');
    expect(saved.data.room.items).toEqual([{ id: 'f_desk_wood', x: 1, z: 1, r: 1 }, { id: 'f_chair_wood', x: 0, z: 0, r: 0 }, { id: 'f_chair_wood', x: 0, z: 0, r: 0 }]);
    const again = await colyseus.http.post('/api/profile', { body: { pid: id, secret } });
    expect(again.data.room.items[0]).toEqual({ id: 'f_desk_wood', x: 1, z: 1, r: 1 });
    const bad = await colyseus.http.post('/api/room', { body: { pid: id, secret: 'z'.repeat(32), room: {} } }).catch((e) => e);
    expect(bad.statusCode ?? bad.status).toBe(403);
  });

  it('logging in moves the login quest; quests and the login reward pay over HTTP, once', async () => {
    const id = 'pidquest00001', secret = 'q'.repeat(32);
    const prof = await colyseus.http.post('/api/profile', { body: { pid: id, secret, tz: 180 } });
    expect(prof.data.wallet.tz).toBe(180);
    expect(prof.data.wallet.q.daily.d_login).toEqual({ p: 1, c: false });
    const login = await colyseus.http.post('/api/quest', { body: { pid: id, secret, action: 'login' } });
    expect(login.data.ok).toBe(true); expect(login.data.wallet.coins).toBe(150 + 15);
    const q = await colyseus.http.post('/api/quest', { body: { pid: id, secret, action: 'claim', id: 'd_login' } });
    expect(q.data.ok).toBe(true); expect(q.data.wallet.xp).toBe(10);
    const twice = await colyseus.http.post('/api/quest', { body: { pid: id, secret, action: 'claim', id: 'd_login' } }).catch((e) => e);
    expect(twice.data?.ok ?? twice.response?.data?.ok).toBe(false);
    const notYet = await colyseus.http.post('/api/quest', { body: { pid: id, secret, action: 'claim', id: 'd_pomo' } }).catch((e) => e);
    expect(notYet.data?.ok ?? notYet.response?.data?.ok).toBe(false);
    const pl = await colyseus.http.post('/api/quest', { body: { pid: id, secret, action: 'pledge', min: 25, days: 3 } });
    expect(pl.data.wallet.q.pledge).toMatchObject({ min: 25, days: 3 });
    const un = await colyseus.http.post('/api/quest', { body: { pid: id, secret, action: 'unpledge' } });
    expect(un.data.wallet.q.pledge).toBeNull();
    const bad = await colyseus.http.post('/api/quest', { body: { pid: id, secret: 'z'.repeat(32), action: 'login' } }).catch((e) => e);
    expect(bad.statusCode ?? bad.status).toBe(403);
  });

  it('a focus is logged with what the player works on; break chat counts for the social quest', async () => {
    const room = await colyseus.createRoom<StudyRoom>('study_room', {});
    const c = await colyseus.connectTo(room, { name: 'Ali', pid: 'pidstats00001', secret: 's'.repeat(32), category: 'Kodlama' });
    await wait(50);
    room.forcePhase('focus');
    (room as any).track.get(c.sessionId).accMs = 25 * 60_000; // as if 25 minutes went by
    const got = c.waitForMessage('reward');
    room.endPhaseIn(30);
    const m = await got;
    expect(m.completed).toBe(true); expect(m.minutes).toBe(25);
    expect(m.wallet.stats.log.at(-1).c).toBe('Kodlama');
    expect(m.wallet.q.daily.d_pomo.p).toBe(1);
    c.send('activity', { activity: 'read', category: 'Okuma' }); await wait(50);
    room.forcePhase('short_break');
    const w = c.waitForMessage('wallet');
    c.send('chat', { text: 'selam' });
    expect((await w).wallet.q.daily.d_social.p).toBe(1);
  });

  it('placing new furniture in the room counts for the decorator quest', async () => {
    const id = 'pidroom000002', secret = 'r'.repeat(32);
    await colyseus.http.post('/api/profile', { body: { pid: id, secret } });
    await colyseus.http.post('/api/buy', { body: { pid: id, secret, itemId: 'f_cactus' } });
    const items = [{ id: 'f_desk_wood', x: 0, z: 0, r: 0 }, { id: 'f_chair_wood', x: 0, z: 1, r: 0 }, { id: 'f_cactus', x: 1, z: 1, r: 0 }];
    const saved = await colyseus.http.post('/api/room', { body: { pid: id, secret, room: { items } } });
    expect(saved.data.wallet.q.weekly.w_decor.p).toBe(1);
    const same = await colyseus.http.post('/api/room', { body: { pid: id, secret, room: { items } } });
    expect(same.data.wallet.q.weekly.w_decor.p).toBe(1);
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
