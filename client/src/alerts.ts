// What the browser does when your own timer changes phase (v1 js/app.js): start/done sounds, a desktop
// notification while the tab is hidden, a blinking tab title at break time, and keeping the screen awake
// during a focus. The rule itself is shared/timer.ts phaseAlert.
import { phaseAlert, type Phase } from '@pw/shared';
import { useStore } from './store';
import { sfx } from './sound';

let wake: { release(): Promise<void> } | null = null;
async function keepAwake(on: boolean) {
  try {
    if (on && !wake) wake = await (navigator as unknown as { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock?.request('screen') ?? null;
    if (!on && wake) { await wake.release(); wake = null; }
  } catch { /* not allowed (hidden tab, old browser) */ }
}
// the lock drops when the tab is hidden; take it again when you come back mid-focus
document.addEventListener('visibilitychange', () => { if (!document.hidden && wake) { wake = null; keepAwake(true); } });

export let flashing = false;
function flashTitle(t: string) {
  flashing = true; let n = 0;
  const iv = setInterval(() => { document.title = n % 2 ? 'Pomodoro World' : t; if (++n > 8) { clearInterval(iv); flashing = false; } }, 700);
}

function notify(t: string, b: string) {
  try {
    if (!useStore.getState().profile.notify || !document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
    new Notification(t, { body: b, tag: 'pw-timer' });
  } catch { /* some phones only allow notifications from a service worker */ }
}
export function askNotify() {
  try { if (useStore.getState().profile.notify && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch { /* ignore */ }
}

let prev: Phase = 'idle', where = '';
useStore.subscribe((s) => {
  const here = s.place ? `${s.place.kind ?? 'home'}:${s.place.owner}` : s.screen;
  const next = s.timer.phase;
  // arriving somewhere (or a reload mid-focus) is not a phase change: just remember it
  if (here !== where) { where = here; prev = next; keepAwake(next === 'focus'); return; }
  if (next === prev) return;
  const a = phaseAlert(prev, next, s.timer.round); prev = next;
  if (!a) return;
  if (a.sound) sfx(a.sound);
  keepAwake(a.wake);
  if (a.ask) askNotify();
  if (a.title) flashTitle(a.title);
  if (a.note) notify(a.note.t, a.note.b);
});
