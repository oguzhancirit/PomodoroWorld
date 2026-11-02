import { describe, it, expect } from 'vitest';
import { PRESETS, presetById, startTimer, advance, remainingMs, isChatAllowed, durationOf, settle } from '../src/timer';

const p25 = presetById('p25');
const MIN = 60_000;

describe('presets', () => {
  it('has the classic 25/5 with a 15 min long break every 4 rounds', () => {
    expect(p25).toMatchObject({ focusMin: 25, shortMin: 5, longMin: 15, roundsPerLong: 4 });
  });
  it('falls back to 25/5 for an unknown id', () => {
    expect(presetById('nope').id).toBe('p25');
  });
  it('every preset has positive durations', () => {
    for (const p of PRESETS) { expect(p.focusMin).toBeGreaterThan(0); expect(p.shortMin).toBeGreaterThan(0); expect(p.longMin).toBeGreaterThanOrEqual(p.shortMin); }
  });
});

describe('timer phases', () => {
  it('starts with a focus phase ending after focus minutes', () => {
    const t = startTimer(1000, p25);
    expect(t).toEqual({ phase: 'focus', phaseEndsAt: 1000 + 25 * MIN, round: 0 });
  });
  it('focus → short break, round counted', () => {
    const t = advance(startTimer(0, p25), p25);
    expect(t.phase).toBe('short_break'); expect(t.round).toBe(1); expect(t.phaseEndsAt).toBe(25 * MIN + 5 * MIN);
  });
  it('break → focus keeps the round', () => {
    const t = advance(advance(startTimer(0, p25), p25), p25);
    expect(t.phase).toBe('focus'); expect(t.round).toBe(1); expect(t.phaseEndsAt).toBe(30 * MIN + 25 * MIN);
  });
  it('every 4th focus ends in a long break', () => {
    let t = startTimer(0, p25);
    const seen: string[] = [];
    for (let i = 0; i < 8; i++) { t = advance(t, p25); seen.push(t.phase); }
    expect(seen).toEqual(['short_break', 'focus', 'short_break', 'focus', 'short_break', 'focus', 'long_break', 'focus']);
    expect(t.round).toBe(4);
  });
  it('schedules from the planned end, so a late server tick does not drift', () => {
    const t = advance(startTimer(0, p25), p25);
    expect(t.phaseEndsAt).toBe(25 * MIN + 5 * MIN);
  });
  it('idle timer does not advance', () => {
    const idle = { phase: 'idle' as const, phaseEndsAt: 0, round: 0 };
    expect(advance(idle, p25)).toEqual(idle);
  });
  it('settle() catches up over several missed phases (e.g. room asleep)', () => {
    const t = settle(startTimer(0, p25), p25, 25 * MIN + 5 * MIN + 1);
    expect(t.phase).toBe('focus'); expect(t.round).toBe(1); expect(t.phaseEndsAt).toBe(55 * MIN);
  });
  it('settle() leaves a running phase alone', () => {
    const t0 = startTimer(0, p25); expect(settle(t0, p25, 10)).toBe(t0);
  });
});

describe('derived values', () => {
  it('remaining time never negative', () => {
    const t = startTimer(0, p25);
    expect(remainingMs(t, 0)).toBe(25 * MIN);
    expect(remainingMs(t, 30 * MIN)).toBe(0);
    expect(remainingMs({ phase: 'idle', phaseEndsAt: 0, round: 0 }, 5)).toBe(0);
  });
  it('chat closed only during focus', () => {
    expect(isChatAllowed('focus')).toBe(false);
    expect(isChatAllowed('short_break')).toBe(true);
    expect(isChatAllowed('long_break')).toBe(true);
    expect(isChatAllowed('idle')).toBe(true);
  });
  it('duration per phase', () => {
    expect(durationOf('focus', p25)).toBe(25 * MIN);
    expect(durationOf('short_break', p25)).toBe(5 * MIN);
    expect(durationOf('long_break', p25)).toBe(15 * MIN);
    expect(durationOf('idle', p25)).toBe(0);
  });
});
