import { describe, it, expect } from 'vitest';
import { presetById, customPresetId, startTimer, remainingMs, settle, pauseTimer, resumeTimer, skipPhase, isPaused, canSkip, chatOpenFor, timerStatus, STATUS_LABEL } from '../src/timer';

const p25 = presetById('p25');
const MIN = 60_000;

describe('custom preset (v1 "Özel": focus 5..180, break 1..60, long = max(15, 3×break))', () => {
  it('encodes and reads back focus / break minutes', () => {
    const id = customPresetId(40, 8);
    expect(id).toBe('c40-8');
    expect(id.length).toBeLessThanOrEqual(8);
    expect(presetById(id)).toMatchObject({ id: 'c40-8', focusMin: 40, shortMin: 8, longMin: 24, roundsPerLong: 4 });
  });
  it('clamps to the v1 limits', () => {
    expect(customPresetId(500, 0)).toBe('c180-1');
    expect(customPresetId(1, 99)).toBe('c5-60');
    expect(presetById('c5-2').longMin).toBe(15);
  });
  it('rejects broken ids (falls back to 25/5)', () => {
    expect(presetById('c999-1').id).toBe('c180-1');
    expect(presetById('cx-1').id).toBe('p25');
  });
});

describe('pause / resume / skip', () => {
  const t0 = 1_000_000;
  it('pausing keeps the time left and stops the clock', () => {
    const t = startTimer(t0, p25);
    const p = pauseTimer(t, t0 + 5 * MIN);
    expect(isPaused(p)).toBe(true);
    expect(remainingMs(p, t0 + 60 * MIN)).toBe(20 * MIN);
    // a paused timer never advances by itself
    expect(settle(p, p25, t0 + 999 * MIN)).toEqual(p);
  });
  it('resuming continues from where it stopped', () => {
    const p = pauseTimer(startTimer(t0, p25), t0 + 5 * MIN);
    const r = resumeTimer(p, t0 + 30 * MIN);
    expect(isPaused(r)).toBe(false);
    expect(r.phaseEndsAt).toBe(t0 + 50 * MIN);
    expect(remainingMs(r, t0 + 30 * MIN)).toBe(20 * MIN);
  });
  it('pause and resume do nothing when idle or already in that state', () => {
    const idle = { phase: 'idle' as const, phaseEndsAt: 0, round: 0 };
    expect(pauseTimer(idle, t0)).toEqual(idle);
    const run = startTimer(t0, p25);
    expect(resumeTimer(run, t0 + MIN)).toEqual(run);
    const p = pauseTimer(run, t0 + MIN);
    expect(pauseTimer(p, t0 + 2 * MIN)).toEqual(p);
  });
  it('a started focus cannot be skipped, running or paused (user 2026-11-05: only pause)', () => {
    const f = startTimer(t0, p25);
    expect(skipPhase(f, p25, t0 + 3 * MIN)).toEqual(f);
    const paused = pauseTimer(f, t0 + MIN);
    expect(skipPhase(paused, p25, t0 + 2 * MIN)).toEqual(paused);
    expect(canSkip(f)).toBe(false); expect(canSkip(paused)).toBe(false);
  });
  it('skipping a break stops the timer, like v1 (even when paused)', () => {
    const b = settle(startTimer(t0, p25), p25, t0 + 25 * MIN);
    expect(b.phase).toBe('short_break'); expect(canSkip(b)).toBe(true);
    expect(skipPhase(pauseTimer(b, t0 + 26 * MIN), p25, t0 + 27 * MIN)).toEqual({ phase: 'idle', phaseEndsAt: 0, round: 0 });
    expect(canSkip({ phase: 'idle', phaseEndsAt: 0, round: 0 })).toBe(false);
  });
  it('chat: closed while a focus runs, open when it is paused, in breaks and when idle', () => {
    const f = startTimer(t0, p25);
    expect(chatOpenFor(f)).toBe(false);
    expect(chatOpenFor(pauseTimer(f, t0 + MIN))).toBe(true);
    expect(chatOpenFor(settle(f, p25, t0 + 25 * MIN))).toBe(true);
    expect(chatOpenFor({ phase: 'idle', phaseEndsAt: 0, round: 0 })).toBe(true);
  });
  it('status shown to others: Odakta / Bekliyor (paused) / Molada / Boşta', () => {
    const f = startTimer(t0, p25);
    expect(timerStatus(f)).toBe('focus');
    expect(timerStatus(pauseTimer(f, t0 + MIN))).toBe('paused');
    const b = settle(f, p25, t0 + 25 * MIN);
    expect(timerStatus(b)).toBe('break');
    expect(timerStatus(pauseTimer(b, t0 + 26 * MIN))).toBe('paused');
    expect(timerStatus({ phase: 'idle', phaseEndsAt: 0, round: 0 })).toBe('idle');
    expect(STATUS_LABEL).toEqual({ idle: 'Boşta', focus: 'Odakta', paused: 'Bekliyor', break: 'Molada' });
  });
});
