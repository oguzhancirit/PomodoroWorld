// Shared study room: the server is the referee. It owns the pomodoro clock, decides when chat is open,
// gives out seats and cleans every message. Clients only ask; they never write the state themselves.
import { Room, validate, type Client } from '@colyseus/core';
import { z } from 'zod';
import {
  presetById, startTimer, settle, isChatAllowed, type Phase, type TimerState,
  cleanText, censor, cleanName, CHAT_MAX, RateLimiter,
  decodeAvatar, encodeAvatar, firstFreeSeat, isSeatFree, STUDY_ROOM,
  ChatMsg, EmoteMsg, SitMsg, ActivityMsg, parseJoin,
} from '@pw/shared';
import { StudyRoomState, Player } from './state';

const BUBBLE_MS = 6000;
const RECONNECT_SECONDS = 30;

export class StudyRoom extends Room {
  maxClients = STUDY_ROOM.maxClients;
  state = new StudyRoomState();

  private preset = presetById('p25');
  private phaseTimer: { clear(): void } | null = null;
  private chatLimit = new RateLimiter(1, 3000);       // 1 message / 3 s per player
  private emoteLimit = new RateLimiter(6, 10_000);
  private timeLimit = new RateLimiter(5, 10_000);

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
    }),
    emote: validate(EmoteMsg, (client: Client, { e }) => {
      if (!this.state.players.has(client.sessionId)) return;
      if (!this.emoteLimit.allow(client.sessionId, Date.now())) return;
      this.broadcast('emote', { id: client.sessionId, e });
    }),
    sit: validate(SitMsg, (client: Client, { seatIndex }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || !isSeatFree(seatIndex, this.takenSeats(client.sessionId), STUDY_ROOM.seats.length)) return;
      p.seatIndex = seatIndex;
    }),
    activity: validate(ActivityMsg, (client: Client, { activity }) => {
      const p = this.state.players.get(client.sessionId);
      if (p) p.activity = activity;
    }),
    time: validate(z.object({ t0: z.number() }), (client: Client, { t0 }) => {
      if (!this.timeLimit.allow(client.sessionId, Date.now())) return;
      client.send('time', { t0, server: Date.now() });
    }),
  };

  onCreate(options: unknown) {
    this.preset = presetById(parseJoin(options).preset);
    // ops/testing only: PW_TIME_SCALE=60 makes a 25-minute focus last 25 seconds (never set in production)
    const scale = Number(process.env.PW_TIME_SCALE) || 1;
    if (scale !== 1) this.preset = { ...this.preset, focusMin: this.preset.focusMin / scale, shortMin: this.preset.shortMin / scale, longMin: this.preset.longMin / scale };
    this.state.preset = this.preset.id;
    this.setTimer(startTimer(Date.now(), this.preset));
    this.setMetadata({ preset: this.preset.id });
  }

  onJoin(client: Client, options: unknown) {
    const o = parseJoin(options);
    const p = new Player();
    p.name = cleanName(o.name) || 'Misafir';
    p.avatar = encodeAvatar(decodeAvatar(o.avatar));
    p.activity = o.activity ?? 'type';
    p.seatIndex = firstFreeSeat(this.takenSeats(), STUDY_ROOM.seats.length);
    p.pose = 'sit';
    p.bubble = '';
    p.connected = true;
    this.state.players.set(client.sessionId, p);
  }

  onDrop(client: Client) {
    const p = this.state.players.get(client.sessionId);
    if (p) p.connected = false;
    this.allowReconnection(client, RECONNECT_SECONDS);
  }

  onReconnect(client: Client) {
    const p = this.state.players.get(client.sessionId);
    if (p) p.connected = true;
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.chatLimit.forget(client.sessionId); this.emoteLimit.forget(client.sessionId); this.timeLimit.forget(client.sessionId);
  }

  onDispose() { this.phaseTimer?.clear(); }

  /* ---------- timer ---------- */
  private setTimer(t: TimerState) {
    this.state.timer.phase = t.phase;
    this.state.timer.phaseEndsAt = t.phaseEndsAt;
    this.state.timer.round = t.round;
    this.schedule();
  }

  private current(): TimerState {
    const s = this.state.timer;
    return { phase: s.phase as Phase, phaseEndsAt: s.phaseEndsAt, round: s.round };
  }

  private schedule() {
    this.phaseTimer?.clear();
    const t = this.current();
    if (t.phase === 'idle') return;
    this.phaseTimer = this.clock.setTimeout(() => this.onPhaseEnd(), Math.max(0, t.phaseEndsAt - Date.now()));
  }

  private onPhaseEnd() {
    const before = this.current();
    const next = settle(before, this.preset, Date.now());
    this.setTimer(next);
    if (next.phase !== before.phase || next.round !== before.round) {
      // a fresh focus closes the chat: clear the bubbles so nobody is left "talking"
      if (next.phase === 'focus') this.state.players.forEach((p) => { p.bubble = ''; });
      this.broadcast('phase', { phase: next.phase, round: next.round, endsAt: next.phaseEndsAt });
    }
  }

  private takenSeats(exceptId?: string): number[] {
    const out: number[] = [];
    this.state.players.forEach((p, id) => { if (id !== exceptId) out.push(p.seatIndex); });
    return out;
  }

  /* ---------- test / admin helpers (not reachable from clients) ---------- */
  /** End the current phase after `ms` milliseconds. */
  endPhaseIn(ms: number) { this.state.timer.phaseEndsAt = Date.now() + ms; this.schedule(); }
  /** Jump straight into a phase (used by tests). */
  forcePhase(phase: Phase) { this.setTimer({ phase, phaseEndsAt: Date.now() + 60_000, round: this.state.timer.round }); }
}
