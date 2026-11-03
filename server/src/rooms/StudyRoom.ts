// Shared study room: the server is the referee. It owns the pomodoro clock, decides when chat is open,
// gives out seats and cleans every message. Clients only ask; they never write the state themselves.
import { Room, validate, type Client } from '@colyseus/core';
import { z } from 'zod';
import {
  presetById, startTimer, settle, isChatAllowed, type Phase, type TimerState,
  cleanText, censor, cleanName, CHAT_MAX, RateLimiter,
  decodeAvatar, encodeAvatar, firstFreeSeat, isSeatFree, STUDY_ROOM,
  ChatMsg, EmoteMsg, SitMsg, ActivityMsg, parseJoin,
  rewardFocus, avatarAllowed, levelFromXP, defaultAvatar, durationOf, clock, noteChat,
} from '@pw/shared';
import { StudyRoomState, Player } from './state';
import { profiles, type Profile } from '../profiles';

// how long each player was really here during the current focus
interface FocusTrack { since: number | null; accMs: number; fromStart: boolean; intact: boolean }

const BUBBLE_MS = 6000;
const RECONNECT_SECONDS = 30;

export class StudyRoom extends Room {
  maxClients = STUDY_ROOM.maxClients;
  state = new StudyRoomState();

  protected preset = presetById('p25');
  private phaseTimer: { clear(): void } | null = null;
  private chatLimit = new RateLimiter(1, 3000);       // 1 message / 3 s per player
  private emoteLimit = new RateLimiter(6, 10_000);
  private timeLimit = new RateLimiter(5, 10_000);
  protected scale = 1;
  protected track = new Map<string, FocusTrack>();
  protected profileOf = new Map<string, Profile>();
  /** what each player works on (Ders, Kodlama…), for their statistics */
  private categoryOf = new Map<string, string>();

  messages = {
    chat: validate(ChatMsg, (client: Client, { text }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      if (!isChatAllowed(this.state.timer.phase as Phase)) { client.send('notice', { code: 'chat_closed' }); return; }
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

  onJoin(client: Client, options: unknown) {
    const o = parseJoin(options);
    let prof: Profile | null = null;
    if (o.pid) { prof = profiles.open(o.pid, o.secret); if (!prof) throw new Error('Oyuncu kimliği doğrulanamadı.'); this.profileOf.set(client.sessionId, prof); }
    const p = new Player();
    p.name = cleanName(o.name) || 'Misafir';
    // you can only wear parts you own (free ones are always yours)
    const look = decodeAvatar(o.avatar);
    p.avatar = encodeAvatar(prof && !avatarAllowed(prof.wallet, look) ? defaultAvatar(look.g) : look);
    p.level = prof ? levelFromXP(prof.wallet.xp).level : 1;
    p.activity = o.activity ?? 'type';
    if (o.category) this.categoryOf.set(client.sessionId, cleanText(o.category, 20) || 'Diğer');
    p.seatIndex = firstFreeSeat(this.takenSeats(), this.seatCount());
    p.pose = 'sit';
    p.bubble = '';
    p.connected = true;
    this.state.players.set(client.sessionId, p);
    const inFocus = this.state.timer.phase === 'focus';
    this.track.set(client.sessionId, { since: inFocus ? Date.now() : null, accMs: 0, fromStart: false, intact: true });
    if (prof) client.send('wallet', { wallet: prof.wallet });
  }

  onDrop(client: Client) {
    const p = this.state.players.get(client.sessionId);
    if (p) p.connected = false;
    const t = this.track.get(client.sessionId);
    if (t) { if (t.since) t.accMs += Date.now() - t.since; t.since = null; t.intact = false; }
    this.allowReconnection(client, RECONNECT_SECONDS);
  }

  onReconnect(client: Client) {
    const p = this.state.players.get(client.sessionId);
    if (p) p.connected = true;
    const t = this.track.get(client.sessionId);
    if (t && this.state.timer.phase === 'focus') t.since = Date.now();
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.track.delete(client.sessionId); this.profileOf.delete(client.sessionId); this.categoryOf.delete(client.sessionId);
    this.chatLimit.forget(client.sessionId); this.emoteLimit.forget(client.sessionId); this.timeLimit.forget(client.sessionId);
  }

  onDispose() { this.phaseTimer?.clear(); }

  /** how many chairs this room has (seat indexes 0..n-1) */
  protected seatCount() { return STUDY_ROOM.seats.length; }

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
    this.schedule();
  }

  protected current(): TimerState {
    const s = this.state.timer;
    return { phase: s.phase as Phase, phaseEndsAt: s.phaseEndsAt, round: s.round };
  }

  private schedule() {
    this.phaseTimer?.clear();
    const t = this.current();
    if (t.phase === 'idle') return;
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
    this.state.players.forEach((p, id) => this.track.set(id, { since: p.connected ? now : null, accMs: 0, fromStart: p.connected, intact: p.connected }));
  }

  /** the server decides the reward: only time really spent in the room counts */
  private payFocus(ended: TimerState) {
    const now = Math.min(Date.now(), ended.phaseEndsAt + 5000);
    const results: [string, number, boolean][] = [];
    this.track.forEach((t, id) => {
      const ms = t.accMs + (t.since ? Math.max(0, now - t.since) : 0);
      results.push([id, ms, t.fromStart && t.intact]);
      t.accMs = 0; t.since = null;
    });
    const focusMin = durationOf('focus', this.preset) * this.scale / 60_000;
    for (const [id, ms, completed] of results) {
      const prof = this.profileOf.get(id); if (!prof) continue;
      const others = results.filter(([o, oms]) => o !== id && oms > 30_000 / this.scale).length;
      const minutes = (ms * this.scale) / 60_000;
      // the player's own calendar: their day, week and the minute their counted time began
      const k = clock(now, prof.wallet.tz), start = clock(now - minutes * 60_000, prof.wallet.tz);
      const r = rewardFocus(prof.wallet, { minutes, completed, round: ended.round + 1, others, day: k.day, week: k.week, startMin: start.minute, cat: this.categoryOf.get(id) ?? 'Diğer', longFocus: focusMin >= 90 });
      profiles.update(prof, r.wallet);
      const pl = this.state.players.get(id); if (pl) pl.level = levelFromXP(r.wallet.xp).level;
      this.clients.getById(id)?.send('reward', { gained: r.gained, lines: r.lines, levelUp: r.levelUp, wallet: r.wallet, completed, minutes: Math.floor(minutes) });
    }
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
