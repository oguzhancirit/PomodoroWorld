// Going public (2026-11-04): the free server sleeps when nobody is online and needs about a minute to wake.
// Before the first call we knock on /health until it answers, and a small banner says why we are waiting,
// so nobody thinks the game is broken (and nobody lands in an offline room while it is only waking up).
import { create } from 'zustand';
import { HTTP_BASE, DEMO_ONLY, CONFIGURED } from './config';

export type WakeState = 'idle' | 'waking' | 'awake' | 'down';
export const useWake = create<{ state: WakeState }>(() => ({ state: DEMO_ONLY ? 'awake' : 'idle' }));

let job: Promise<boolean> | null = null;
/** resolves true once the server answers; false after giving up (a local dev server gets one quick try) */
export function wakeServer(): Promise<boolean> {
  if (DEMO_ONLY || useWake.getState().state === 'awake') return Promise.resolve(true);
  return (job ??= (async () => {
    const until = Date.now() + (CONFIGURED ? 150_000 : 3_000);
    // a quick answer never shows the banner
    const slow = setTimeout(() => useWake.setState({ state: 'waking' }), 1500);
    try {
      for (;;) {
        try {
          const c = new AbortController(), t = setTimeout(() => c.abort(), 15_000);
          const r = await fetch(`${HTTP_BASE}/health`, { signal: c.signal, cache: 'no-store' }).finally(() => clearTimeout(t));
          if (r.ok) { useWake.setState({ state: 'awake' }); return true; }
        } catch { /* still asleep or no internet: knock again */ }
        if (Date.now() > until) { useWake.setState({ state: 'down' }); return false; }
        await new Promise((ok) => setTimeout(ok, 2500));
      }
    } finally { clearTimeout(slow); job = null; }
  })());
}

/** the strip at the top while the server wakes (or cannot be reached) */
export function WakeBanner() {
  const s = useWake((x) => x.state);
  if (s === 'waking') return <div className="wake-bar" role="status"><i aria-hidden="true" />Sunucu uyanıyor… Kimse yokken uyur, ilk girişte yaklaşık 1 dakika sürer.</div>;
  if (s === 'down') return <div className="wake-bar down" role="status">Sunucuya ulaşılamadı. Odan bu cihazda açık; internetini kontrol edip sayfayı yenile.<button type="button" onClick={() => location.reload()}>Yenile</button></div>;
  return null;
}
