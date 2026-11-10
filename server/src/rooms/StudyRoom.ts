// Shared study room: the server is the referee. It owns the pomodoro clock, decides when chat is open,
// gives out seats and cleans every message. Clients only ask; they never write the state themselves.
import { Room, validate, type Client } from '@colyseus/core';
import { z } from 'zod';
import {
  presetById, startTimer, settle, chatOpenFor, isPaused, type Phase, type TimerState,
  cleanText, censor, cleanName, CHAT_MAX, RateLimiter,
  decodeAvatar, encodeAvatar, firstFreeSeat, isSeatFree, STUDY_ROOM,
  ChatMsg, EmoteMsg, SitMsg, ActivityMsg, parseJoin,
  rewardFocus, avatarAllowed, levelFromXP, defaultAvatar, durationOf, clock, noteChat, inviteCode,
} from '@pw/shared';
import { StudyRoomState, Player } from './state';
import { profiles, type Profile } from '../profiles';
import { sessions } from '../sessions';
import { calls } from '../calls';

const CallReply = z.object({ id: z.string().max(40), accept: z.boolean() });

// how long each player was really here during the current focus
interface FocusTrack { since: number | null; accMs: number; fromStart: boolean; intact: boolean }

const BUBBLE_MS = 6000;
/** how long a dropped seat waits. A phone that locks its screen freezes the page and the line drops; the user
 *  report 2026-11-09 ("ekran açık kalmadığında bağlantı hatası") showed 30 s was far too short. */
export const RECONNECT_SECONDS = 5 * 60;

export class StudyRoom extends Room {
  maxClients = STUDY_ROOM.maxClients;
  // a slow phone may need longer than the default 15 s to open its connection after a seat is reserved
  seatReservationTimeout = 45;
  state = new StudyRoomState();

  protected preset = presetById('p25');
  private phaseTimer: { clear(): void } | null = null;
  private chatLimit = new RateLimiter(1, 3000);       // 1 message / 3 s per player
  private emoteLimit = new RateLimiter(6, 10_000);
  private timeLimit = new RateLimiter(5, 10_000);
  protected scale = 1;
  protected track = new Map<string, FocusTrack>();
  protected profileOf = new Map<string, Profile>();
  /** sent away by the owner: no reconnection window */
  protected gone = new Set<string>();
  /** what each player works on (Ders, Kodlama…), for their statistics */
  private categoryOf = new Map<string, string>();
  /** dropped players' reconnection seats, so a replaced one can be cancelled */
  private waiting = new Map<string, { reject(e?: unknown): void }>();

  messages = {
    // "Arkadaşını çağır": the called friend answers from whatever room they are in (user 2026-11-09)
    call_reply: validate(CallReply, (client: Client, { id, accept }) => {
      const prof = this.profileOf.get(client.sessionId); if (!prof) return;
      const c = calls.answer(id, prof.pid); if (!c) return;
      const owner = profiles.get(c.owner);
      if (!accept || !owner || !sessions.roomOf(c.owner)) {
        calls.drop(c.id);
        if (accept) client.send('call_gone', { name: c.ownerName });
        else sessions.sendTo(c.owner, 'call_status', { status: 'declined', name: c.targetName });
        return;
      }
      calls.accept(c);
      client.send('call_go', { code: inviteCode(c.owner, owner.room.token), name: c.ownerName });
      sessions.sendTo(c.owner, 'call_status', { status: 'coming', name: c.targetName });
    }),
    chat: validate(ChatMsg, (client: Client, { text }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      if (!this.chatOpen(client.sessionId)) { client.send('notice', { code: 'chat_closed' }); return; }
      const clean = censor(cleanText(text, CHAT_MAX));
      if (!clean) return;
      if (!this.chatLimit.allow(client.sessionId, Date.now())) { client.send('notice', { code: 'slow_down' }); return; }
      p.bubble = clean;
      this.broadcast('chat', { id: client.sessionId, name: p.name, text: clean, at: Date.now() });
      this.clock.setTimeout(() => { if (p.bubble === clean) p.bubble = ''; }, BUBBLE_MS);
      const prof = this.profileOf.get(client.sessionId);
      if (prof) { profiles.update(prof, noteChat(prof.wallet, clock(Date.now(), prof.wallet.tz))); client.send('wallet', { wallet: prof.wallet }); }
    }),
    emote: validate(EmoteMsg, (client: Client, { e }) => {
      if (!this.state.players.has(client.sessionId)) return;
      if (!this.emoteLimit.allow(client.sessionId, Date.now())) return;
      this.broadcast('emote', { id: client.sessionId, e });
    }),
    sit: validate(SitMsg, (client: Client, { seatIndex }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || !isSeatFree(seatIndex, this.takenSeats(client.sessionId), this.seatCount())) return;
      p.seatIndex = seatIndex;
    }),
    activity: validate(ActivityMsg, (client: Client, { activity, category }) => {
      const p = this.state.players.get(client.sessionId);
      if (p) p.activity = activity;
      if (p && category) this.categoryOf.set(client.sessionId, cleanText(category, 20) || 'Diğer');
    }),
    time: validate(z.object({ t0: z.number() }), (client: Client, { t0 }) => {
      if (!this.timeLimit.allow(client.sessionId, Date.now())) return;
      client.send('time', { t0, server: Date.now() });
    }),
  };

  onCreate(options: unknown) {
    // ops/testing only: PW_TIME_SCALE=60 makes a 25-minute focus last 25 seconds (never set in production)
    this.scale = Number(process.env.PW_TIME_SCALE) || 1;
    this.usePreset(parseJoin(options).preset);
    this.setTimer(startTimer(Date.now(), this.preset));
    this.startTracking();
    this.setMetadata({ preset: this.preset.id });
  }

  /** one player, one body (live 2026-11-04: every reload added a copy of you, even in a full room). A reload looks
   *  like a dropped line, so the old self waited 30 s for a comeback; when the same player arrives again, the old
   *  copies leave at once. An old tab that is still open is told why, so it does not jump back in. */
  protected replaceTwins(pid: string) {
    for (const [sid, prof] of [...this.profileOf]) if (prof.pid === pid) this.dropTwin(sid);
  }

  /** this seat's player opened the game somewhere else (here or in another room): it earns nothing more,
   *  keeps no reconnection seat and is told why, so the old tab does not jump back in */
  private dropTwin(sid: string) {
    this.gone.add(sid);
    const c = this.clients.getById(sid);
    // cancel a waiting reconnection seat first (onLeave forgets it)
    const w = this.waiting.get(sid);
    if (w) { this.waiting.delete(sid); w.reject(new Error('replaced')); }
    c?.send('replaced', {});
    this.onLeave(c ?? ({ sessionId: sid } as Client));
    c?.leave();
  }

  /** "come back to my place" after a long drop (client sends resume): if the player has since opened the game in
   *  another window that is online, this old one must not push it out again (two windows would fight forever) */
  protected guardResume(options: unknown) {
    const o = parseJoin(options);
    if (o.pid && (options as { resume?: unknown } | undefined)?.resume === true && profiles.open(o.pid, o.secret) && sessions.liveSeat(o.pid)) throw new Error('Oyun başka bir pencerede açıldı.');
  }

  onJoin(client: Client, options: unknown) {
    const o = parseJoin(options);
    let prof: Profile | null = null;
    this.guardResume(options);
    if (o.pid) { prof = profiles.open(o.pid, o.secret); if (!prof) throw new Error('Oyuncu kimliği doğrulanamadı.'); this.replaceTwins(prof.pid); this.profileOf.set(client.sessionId, prof); }
    // one account, one place across the whole server: another room (other timer length, library, Odam…) lets go of you
    if (prof) { const sid = client.sessionId; sessions.claim(prof.pid, { room: this.roomId, sessionId: sid, kick: () => this.dropTwin(sid), send: (t, m) => this.clients.getById(sid)?.send(t, m), live: () => !!this.state.players.get(sid)?.connected }); }
    const p = new Player();
    p.name = cleanName(o.name) || 'Misafir';
    // you can only wear parts you own (free ones are always yours)
    const look = decodeAvatar(o.avatar);
    p.avatar = encodeAvatar(prof && !avatarAllowed(prof.wallet, look) ? defaultAvatar(look.g) : look);
    p.level = prof ? levelFromXP(prof.wallet.xp).level : 1;
    p.code = prof ? prof.pid : '';
    p.activity = o.activity ?? 'type';
    if (o.category) this.categoryOf.set(client.sessionId, cleanText(o.category, 20) || 'Diğer');
    p.seatIndex = firstFreeSeat(this.takenSeats(), this.seatCount());
    p.pose = 'sit';
    p.bubble = '';
    p.connected = true;
    this.state.players.set(client.sessionId, p);
    const inFocus = this.focusingNow(client.sessionId);
    this.track.set(client.sessionId, { since: inFocus ? Date.now() : null, accMs: 0, fromStart: false, intact: true });
    if (prof) client.send('wallet', { wallet: prof.wallet });
  }

  onDrop(client: Client) {
    if (this.gone.has(client.sessionId)) return;
    const p = this.state.players.get(client.sessionId);
    if (p) p.connected = false;
    const t = this.track.get(client.sessionId);
    // the focus keeps running while the screen is off (that is how a pomodoro is used); the minutes count only if
    // the player comes back to this seat: a seat that runs out takes its track with it (onLeave)
    const d = this.allowReconnection(client, RECONNECT_SECONDS) as unknown as Promise<unknown> & { reject(e?: unknown): void };
    this.waiting.set(client.sessionId, d);
    const done = () => { this.waiting.delete(client.sessionId); };
    d.then?.(done, done);
  }

  onReconnect(client: Client) {
    const p = this.state.players.get(client.sessionId);
    if (p) p.connected = true;
    const t = this.track.get(client.sessionId);
    if (t && this.focusingNow(client.sessionId) && !t.since) t.since = Date.now();
  }

  onLeave(client: Client) {
    const prof = this.profileOf.get(client.sessionId);
    if (prof) sessions.release(prof.pid, this.roomId, client.sessionId);
    this.waiting.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.track.delete(client.sessionId); this.profileOf.delete(client.sessionId); this.categoryOf.delete(client.sessionId);
    this.chatLimit.forget(client.sessionId); this.emoteLimit.forget(client.sessionId); this.timeLimit.forget(client.sessionId);
  }

  onDispose() { this.phaseTimer?.clear(); }

  /** may this player chat now? (the shared hall: the room's phase; personal rooms: their own) */
  protected chatOpen(_id: string) { return chatOpenFor(this.current()); }
  /** is this player's focus time running right now? */
  protected focusingNow(_id: string) { return this.state.timer.phase === 'focus' && !isPaused(this.current()); }

  /** how many chairs this room has (seat indexes 0..n-1) */
  protected seatCount() { return STUDY_ROOM.seats.length; }

  /** who is here: player id → name (friends list "where") */
  whoIsHere(): Map<string, string> {
    const out = new Map<string, string>();
    this.state.players.forEach((p) => { if (p.code && p.connected) out.set(p.code, p.name); });
    return out;
  }

  /* ---------- timer ---------- */
  protected usePreset(id: string | undefined) {
    const p = presetById(id), k = this.scale;
    this.preset = k === 1 ? p : { ...p, focusMin: p.focusMin / k, shortMin: p.shortMin / k, longMin: p.longMin / k };
    this.state.preset = this.preset.id;
  }
  protected setTimer(t: TimerState) {
    this.state.timer.phase = t.phase;
    this.state.timer.phaseEndsAt = t.phaseEndsAt;
    this.state.timer.round = t.round;
    this.state.timer.pausedLeft = t.pausedLeft ?? 0;
    this.schedule();
  }

  protected current(): TimerState {
    const s = this.state.timer;
    return s.pausedLeft > 0
      ? { phase: s.phase as Phase, phaseEndsAt: s.phaseEndsAt, round: s.round, pausedLeft: s.pausedLeft }
      : { phase: s.phase as Phase, phaseEndsAt: s.phaseEndsAt, round: s.round };
  }

  private schedule() {
    this.phaseTimer?.clear();
    const t = this.current();
    if (t.phase === 'idle' || isPaused(t)) return;
    this.phaseTimer = this.clock.setTimeout(() => this.onPhaseEnd(), Math.max(0, t.phaseEndsAt - Date.now()));
  }

  protected onPhaseEnd() {
    const before = this.current();
    const next = settle(before, this.preset, Date.now());
    if (before.phase === 'focus' && next.phaseEndsAt !== before.phaseEndsAt) this.payFocus(before);
    this.setTimer(next);
    if (next.phase === 'focus' && before.phase !== 'focus') this.startTracking();
    if (next.phase !== before.phase || next.round !== before.round) {
      // a fresh focus closes the chat: clear the bubbles so nobody is left "talking"
      if (next.phase === 'focus') this.state.players.forEach((p) => { p.bubble = ''; });
      this.broadcast('phase', { phase: next.phase, round: next.round, endsAt: next.phaseEndsAt });
    }
  }

  /** everyone present right now starts a fresh focus "from the start" */
  protected startTracking() {
    const now = Date.now();
    this.state.players.forEach((_p, id) => this.track.set(id, { since: now, accMs: 0, fromStart: true, intact: true }));
  }

  /** the server decides the reward: only time really spent in the room counts */
  protected payFocus(ended: TimerState, full = true) {
    const now = Math.min(Date.now(), ended.phaseEndsAt + 5000);
    const results: [string, number, boolean][] = [];
    this.track.forEach((t, id) => {
      const ms = t.accMs + (t.since ? Math.max(0, now - t.since) : 0);
      results.push([id, ms, full && t.fromStart && t.intact]);
      t.accMs = 0; t.since = null;
    });
    const focusMin = durationOf('focus', this.preset) * this.scale / 60_000;
    for (const [id, ms, completed] of results) {
      const others = results.filter(([o, oms]) => o !== id && oms > 30_000 / this.scale).length;
      this.payPlayer(id, ms, completed, ended.round + 1, others, focusMin, now);
    }
  }

  /** one person's reward for `ms` of focus (the server decides; minutes go to their daily statistics) */
  protected payPlayer(id: string, ms: number, completed: boolean, round: number, others: number, focusMin: number, now: number) {
    const prof = this.profileOf.get(id); if (!prof) return;
    const minutes = (ms * this.scale) / 60_000;
    // the player's own calendar: their day, week and the minute their counted time began
    const k = clock(now, prof.wallet.tz), start = clock(now - minutes * 60_000, prof.wallet.tz);
    const r = rewardFocus(prof.wallet, { minutes, completed, round, others, day: k.day, week: k.week, startMin: start.minute, cat: this.categoryOf.get(id) ?? 'Diğer', longFocus: focusMin >= 90, now });
    profiles.update(prof, r.wallet);
    const pl = this.state.players.get(id); if (pl) pl.level = levelFromXP(r.wallet.xp).level;
    this.clients.getById(id)?.send('reward', { gained: r.gained, lines: r.lines, levelUp: r.levelUp, wallet: r.wallet, completed, minutes: Math.floor(minutes) });
  }

  protected takenSeats(exceptId?: string): number[] {
    const out: number[] = [];
    this.state.players.forEach((p, id) => { if (id !== exceptId) out.push(p.seatIndex); });
    return out;
  }

  /* ---------- test / admin helpers (not reachable from clients) ---------- */
  /** End the current phase after `ms` milliseconds. */
  endPhaseIn(ms: number) { this.state.timer.phaseEndsAt = Date.now() + ms; this.schedule(); }
  /** Jump straight into a phase (used by tests). */
  forcePhase(phase: Phase) { this.setTimer({ phase, phaseEndsAt: Date.now() + 60_000, round: this.state.timer.round }); if (phase === 'focus') this.startTracking(); }
}
