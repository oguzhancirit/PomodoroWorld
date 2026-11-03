// Break minutes per day (user, 2026-11-03: the day summary shows how long you focused and how long you rested).
// Kept in this browser: a break is counted from when it started until the timer leaves it.
import { create } from 'zustand';
import { useStore } from './store';
import { myClock } from './economy';

const KEY = 'pw2.breaks';
const load = (): Record<string, number> => { try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch { return {}; } };
export const useBreaks = create<{ days: Record<string, number>; since: number }>(() => ({ days: load(), since: 0 }));

const isBreak = (p: string) => p === 'short_break' || p === 'long_break';
let prev = useStore.getState().timer.phase;
if (isBreak(prev)) useBreaks.setState({ since: Date.now() });
useStore.subscribe((s) => {
  const next = s.timer.phase; if (next === prev) return;
  const was = prev; prev = next;
  const { since, days } = useBreaks.getState();
  if (isBreak(was) && since) {
    const day = myClock().day, min = (Date.now() - since) / 60_000;
    const out = { ...days, [day]: Math.round(((days[day] ?? 0) + min) * 10) / 10 };
    // keep two months
    for (const k of Object.keys(out).sort().slice(0, -60)) delete out[k];
    try { localStorage.setItem(KEY, JSON.stringify(out)); } catch { /* ignore */ }
    useBreaks.setState({ days: out, since: 0 });
  }
  if (isBreak(next)) useBreaks.setState({ since: Date.now() });
});

/** today's break minutes, the running break included */
export function breakMinToday(now = Date.now()) {
  const { days, since } = useBreaks.getState();
  return (days[myClock().day] ?? 0) + (since ? (now - since) / 60_000 : 0);
}
