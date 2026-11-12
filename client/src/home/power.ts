// Battery (user 2026-11-05: "arka planda çok enerji tüketiyor"). The 3D room drew 60 frames a second all the time,
// even while you work in another window or sit in a long focus. The old engine has a frame cap (render.js
// "frame governor": fpsCap, paused); here we set it from what you are doing:
//   tab hidden (minimised, another tab)       → paused (the browser also stops drawing)
//   page visible but you are in another window → 6 fps   (the room still moves, slowly)
//   no touch / key / mouse for a minute        → 12 fps
//   focus screen open                          → 20 fps  (the camera sits still)
//   playing                                    → no cap
// The intro film and any input bring full speed back at once.
type World = { fpsCap?: number; paused?: boolean };
export const POWER = { away: 6, idle: 12, focus: 20, idleAfterMs: 60_000 };

export function capFor(s: { hidden: boolean; blurred: boolean; idle: boolean; focus: boolean; film: boolean }): number | 'pause' {
  if (s.hidden) return 'pause';
  if (s.film) return 0;
  if (s.blurred) return POWER.away;
  if (s.idle) return POWER.idle;
  if (s.focus) return POWER.focus;
  return 0;
}

/** keep the engine's frame cap up to date; returns a cleanup and a way to say the focus screen is open */
export function attachPower(w: World, isFilm: () => boolean) {
  let blurred = typeof document.hasFocus === 'function' ? !document.hasFocus() : false;
  let focus = false, lastInput = Date.now();
  const apply = () => {
    const c = capFor({ hidden: document.hidden, blurred, idle: Date.now() - lastInput > POWER.idleAfterMs, focus, film: isFilm() });
    w.paused = c === 'pause';
    w.fpsCap = c === 'pause' ? 0 : c;
  };
  const input = () => { const was = Date.now() - lastInput > POWER.idleAfterMs; lastInput = Date.now(); if (was || blurred) { blurred = false; apply(); } };
  const onBlur = () => { blurred = true; apply(); };
  const onFocus = () => { blurred = false; lastInput = Date.now(); apply(); };
  const evs = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const;
  for (const e of evs) addEventListener(e, input, { passive: true });
  addEventListener('blur', onBlur); addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', apply);
  const t = setInterval(apply, 5000);
  apply();
  return {
    setFocus(v: boolean) { focus = v; apply(); },
    stop() {
      clearInterval(t);
      for (const e of evs) removeEventListener(e, input);
      removeEventListener('blur', onBlur); removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', apply);
      w.paused = false; w.fpsCap = 0;
    },
  };
}
