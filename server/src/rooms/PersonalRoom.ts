// Personal timers (user rule 2026-11-03, and how v1 worked): in your room, a friend's room and the library nobody
// has to focus at the same time. Each person starts, pauses, skips and stops their own pomodoro; the server keeps
// every timer, pays each person for their own focus and keeps chat closed only for the person who is focusing.
// "Birlikte" = join a friend's running timer (v1 followPeer).
import { validate, type Client } from '@colyseus/core';
import { z } from 'zod';
import {
  presetById, startTimer, settle, pauseTimer, resumeTimer, skipPhase, isPaused, canSkip, chatOpenFor, durationOf, parseJoin,
  type Phase, type Preset, type TimerState,
} from '@pw/shared';
import { StudyRoom } from './StudyRoom';
import { Timer } from './state';

const TimerMsg = z.object({ action: z.enum(['start', 'stop', 'pause', 'resume', 'skip']), preset: z.string().max(8).optional() });
const FollowMsg = z.object({ id: z.string().max(40) });
/** a running timer brought from the previous room */
const Carried = z.object({ phase: z.enum(['focus', 'short_break', 'long_break']), phaseEndsAt: z.number(), round: z.number().int().min(0).max(999), pausedLeft: z.number().min(0) });
const IDLE: TimerState = { phase: 'idle', phaseEndsAt: 0, round: 0 };

export class PersonalRoom extends StudyRoom {
  constructor() {
    super();
    this.messages = {
      ...this.messages,
      timer: validate(TimerMsg, (client: Client, { action, preset }) => this.timerAction(client.sessionId, action, preset)),
      // "Birlikte": take over a friend's running timer (same length, same end)
      follow: validate(FollowMsg, (client: Client, { id }) => {
        const me = this.state.players.get(client.sessionId), them = this.state.players.get(id);
        if (!me || !them || id === client.sessionId) return;
        const t = this.timerOf(id); if (t.phase === 'idle') return;
        me.preset = them.preset;
        this.setPlayerTimer(client.sessionId, t);
        const now = Date.now(), focusing = t.phase === 'focus' && !isPaused(t);
        // joined midway: the minutes count, the "full pomodoro" bonus does not
        this.track.set(client.sessionId, { since: focusing ? now : null, accMs: 0, fromStart: false, intact: true });
      }),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  onCreate(options: unknown) {
    this.scale = Number(process.env.PW_TIME_SCALE) || 1;
    this.usePreset(parseJoin(options).preset);
    // the room clock is not used: every player has their own
    this.setTimer(IDLE);
    this.clock.setInterval(() => this.tickPlayers(), 250);
  }

  onJoin(client: Client, options: unknown) {
    super.onJoin(client, options);
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    p.timer = new Timer();
    p.timer.phase = 'idle'; p.timer.phaseEndsAt = 0; p.timer.round = 0; p.timer.pausedLeft = 0;
    p.preset = presetById(parseJoin(options).preset).id;
    // my timer comes with me (v1: the timer belonged to the player, not to the room); only a sane one is accepted
    const c = Carried.safeParse((options as { timer?: unknown } | undefined)?.timer);
    if (c.success) {
      const t = c.data, now = Date.now(), max = durationOf(t.phase as Phase, this.presetOf(client.sessionId)) + 2000;
      const left = t.pausedLeft > 0 ? t.pausedLeft : t.phaseEndsAt - now;
      if (left > 0 && left <= max) {
        this.setPlayerTimer(client.sessionId, t.pausedLeft > 0 ? { ...t, phaseEndsAt: 0 } : { ...t, pausedLeft: 0 });
        // minutes count from now on; the full-pomodoro bonus needs the whole focus in one room
        const focusing = t.phase === 'focus' && !(t.pausedLeft > 0);
        this.track.set(client.sessionId, { since: focusing ? now : null, accMs: 0, fromStart: false, intact: true });
      }
    }
  }

  protected chatOpen(id: string) { return chatOpenFor(this.timerOf(id)); }
  protected focusingNow(id: string) { const t = this.timerOf(id); return t.phase === 'focus' && !isPaused(t); }

  /* ---------- one person's timer ---------- */
  protected timerOf(id: string): TimerState {
    const s = this.state.players.get(id)?.timer;
    if (!s || !s.phase) return IDLE;
    return s.pausedLeft > 0
      ? { phase: s.phase as Phase, phaseEndsAt: s.phaseEndsAt, round: s.round, pausedLeft: s.pausedLeft }
      : { phase: s.phase as Phase, phaseEndsAt: s.phaseEndsAt, round: s.round };
  }
  protected setPlayerTimer(id: string, t: TimerState) {
    const s = this.state.players.get(id)?.timer; if (!s) return;
    s.phase = t.phase; s.phaseEndsAt = t.phaseEndsAt; s.round = t.round; s.pausedLeft = t.pausedLeft ?? 0;
  }
  /** this person's length (sped up only in tests / ops with PW_TIME_SCALE) */
  protected presetOf(id: string): Preset {
    const p = presetById(this.state.players.get(id)?.preset), k = this.scale;
    return k === 1 ? p : { ...p, focusMin: p.focusMin / k, shortMin: p.shortMin / k, longMin: p.longMin / k };
  }
  private freshTrack(id: string, now: number) {
    // a locked phone (dropped, seat still waiting) is still studying: its next focus counts too
    this.track.set(id, { since: now, accMs: 0, fromStart: true, intact: true });
  }
  private tell(id: string, t: TimerState) { this.clients.getById(id)?.send('phase', { phase: t.phase, round: t.round, endsAt: t.phaseEndsAt }); }

  private timerAction(id: string, action: z.infer<typeof TimerMsg>['action'], preset?: string) {
    const p = this.state.players.get(id); if (!p) return;
    const now = Date.now(), cur = this.timerOf(id);
    if (action === 'start') {
      if (cur.phase !== 'idle') return;
      if (preset) p.preset = presetById(preset).id;
      const t = startTimer(now, this.presetOf(id));
      this.setPlayerTimer(id, t); this.freshTrack(id, now); this.tell(id, t);
    } else if (action === 'stop') {
      if (cur.phase === 'idle') return;
      this.setPlayerTimer(id, IDLE); this.track.set(id, { since: null, accMs: 0, fromStart: false, intact: true }); this.tell(id, IDLE);
    } else if (action === 'pause' || action === 'resume') {
      const next = action === 'pause' ? pauseTimer(cur, now) : resumeTimer(cur, now);
      if (next === cur) return;
      // paused minutes are not focus minutes
      const tr = this.track.get(id);
      if (tr && cur.phase === 'focus') {
        if (action === 'pause') { if (tr.since) tr.accMs += now - tr.since; tr.since = null; }
        else tr.since = now;
      }
      this.setPlayerTimer(id, next);
    } else if (action === 'skip') {
      // a started focus is never skipped, only paused (user 2026-11-05); a break can be ended early
      if (!canSkip(cur)) return;
      const next = skipPhase(cur, this.presetOf(id), now);
      this.setPlayerTimer(id, next); this.tell(id, next);
    }
  }

  /** every quarter second: whose phase ended? */
  private tickPlayers() {
    const now = Date.now();
    this.state.players.forEach((p, id) => {
      const cur = this.timerOf(id);
      if (cur.phase === 'idle' || isPaused(cur) || cur.phaseEndsAt > now) return;
      const next = settle(cur, this.presetOf(id), now);
      if (cur.phase === 'focus') this.payFocusOf(id, cur, true, Math.min(now, cur.phaseEndsAt + 5000));
      this.setPlayerTimer(id, next);
      if (next.phase === 'focus') this.freshTrack(id, now);
      // a fresh focus closes this person's chat: no bubble left over
      if (next.phase === 'focus') p.bubble = '';
      this.tell(id, next);
    });
  }

  private payFocusOf(id: string, ended: TimerState, full: boolean, now: number) {
    const tr = this.track.get(id);
    const ms = tr ? tr.accMs + (tr.since ? Math.max(0, now - tr.since) : 0) : 0;
    const completed = full && !!tr && tr.fromStart && tr.intact;
    if (tr) { tr.accMs = 0; tr.since = null; }
    let others = 0; this.state.players.forEach((_p, o) => { if (o !== id && this.focusingNow(o)) others++; });
    this.payPlayer(id, ms, completed, ended.round + 1, others, durationOf('focus', this.presetOf(id)) * this.scale / 60_000, now);
  }

  /** a friend's own phase, for the friends list ("odakta") */
  phaseOfCode(code: string): string {
    let out = 'idle';
    this.state.players.forEach((p, id) => { if (p.code === code) { const t = this.timerOf(id); out = isPaused(t) ? 'paused' : t.phase; } });
    return out;
  }

  /* ---------- test helpers (not reachable from clients) ---------- */
  endPlayerPhaseIn(id: string, ms: number) { const s = this.state.players.get(id)?.timer; if (s) s.phaseEndsAt = Date.now() + ms; }
}
