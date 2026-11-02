// Pomodoro rules shared by the server (which owns the clock) and the client (which only displays it).
// Pure functions: no Date.now() inside, the caller passes the time in, so everything is testable.

export type Phase = 'idle' | 'focus' | 'short_break' | 'long_break';

export interface Preset {
  id: string;
  name: string;
  hint: string;
  focusMin: number;
  shortMin: number;
  longMin: number;
  roundsPerLong: number;
}

export interface TimerState {
  phase: Phase;
  /** server time (ms) when the current phase ends; 0 while idle */
  phaseEndsAt: number;
  /** completed focus rounds */
  round: number;
}

export const PRESETS: readonly Preset[] = [
  { id: 'p15', name: '15 / 3', hint: 'Isınma', focusMin: 15, shortMin: 3, longMin: 10, roundsPerLong: 4 },
  { id: 'p25', name: '25 / 5', hint: 'Dengeli', focusMin: 25, shortMin: 5, longMin: 15, roundsPerLong: 4 },
  { id: 'p45', name: '45 / 15', hint: 'Etüt', focusMin: 45, shortMin: 15, longMin: 25, roundsPerLong: 4 },
  { id: 'p50', name: '50 / 10', hint: 'Derin', focusMin: 50, shortMin: 10, longMin: 20, roundsPerLong: 4 },
  { id: 'p90', name: '90 / 20', hint: 'Maraton', focusMin: 90, shortMin: 20, longMin: 30, roundsPerLong: 4 },
];

const MIN = 60_000;

export function presetById(id: string | undefined): Preset {
  return PRESETS.find((p) => p.id === id) ?? (PRESETS.find((p) => p.id === 'p25') as Preset);
}

export function durationOf(phase: Phase, p: Preset): number {
  switch (phase) {
    case 'focus': return p.focusMin * MIN;
    case 'short_break': return p.shortMin * MIN;
    case 'long_break': return p.longMin * MIN;
    default: return 0;
  }
}

export function startTimer(now: number, p: Preset): TimerState {
  return { phase: 'focus', phaseEndsAt: now + durationOf('focus', p), round: 0 };
}

/** Move to the next phase. The next phase is scheduled from the planned end, never from "now",
 *  so a late tick does not make the room drift. */
export function advance(t: TimerState, p: Preset): TimerState {
  if (t.phase === 'idle') return t;
  if (t.phase === 'focus') {
    const round = t.round + 1;
    const phase: Phase = round % p.roundsPerLong === 0 ? 'long_break' : 'short_break';
    return { phase, phaseEndsAt: t.phaseEndsAt + durationOf(phase, p), round };
  }
  return { phase: 'focus', phaseEndsAt: t.phaseEndsAt + durationOf('focus', p), round: t.round };
}

/** Catch up when one or more phases ended while nobody ticked (sleeping server, paused tab). */
export function settle(t: TimerState, p: Preset, now: number): TimerState {
  let cur = t;
  for (let i = 0; i < 1000 && cur.phase !== 'idle' && cur.phaseEndsAt <= now; i++) cur = advance(cur, p);
  return cur;
}

export function remainingMs(t: TimerState, now: number): number {
  return t.phase === 'idle' ? 0 : Math.max(0, t.phaseEndsAt - now);
}

/** Odakoo-style rule: chat is closed while the room focuses, open in breaks. */
export function isChatAllowed(phase: Phase): boolean {
  return phase !== 'focus';
}
