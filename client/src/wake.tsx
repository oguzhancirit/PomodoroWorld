// Going public (2026-11-04): the free server sleeps when nobody is online and needs about a minute to wake.
// Before the first call we knock on /health until it answers, and a small banner says why we are waiting,
// so nobody thinks the game is broken (and nobody lands in an offline room while it is only waking up).
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { HTTP_BASE, DEMO_ONLY, CONFIGURED } from './config';

export type WakeState = 'idle' | 'waking' | 'awake' | 'down';
// curtain: the full-screen wait card is up, so the small strip stays away (one message, not two)
export const useWake = create<{ state: WakeState; curtain: boolean }>(() => ({ state: DEMO_ONLY ? 'awake' : 'idle', curtain: false }));

let job: Promise<boolean> | null = null;
/** resolves true once the server answers; false after giving up (a local dev server gets one quick try) */
export function wakeServer(): Promise<boolean> {
  if (DEMO_ONLY || useWake.getState().state === 'awake') return Promise.resolve(true);
  return (job ??= (async () => {
    // a free server that was just updated can need a few minutes the first time
    const until = Date.now() + (CONFIGURED ? 240_000 : 3_000);
    // a quick answer never shows the banner
    const slow = setTimeout(() => useWake.setState({ state: 'waking' }), 1500);
    try {
      for (;;) {
        try {
          // some phones (in-app browsers, a switch between Wi-Fi and mobile data) leave a request hanging and ignore
          // "stop": we stop waiting ourselves after 15 s (live 2026-11-04: a friend's card counted to 500 s)
          const c = new AbortController(); let t = 0;
          const late = new Promise<never>((_, no) => { t = window.setTimeout(() => { c.abort(); no(new Error('timeout')); }, 15_000); });
          const r = await Promise.race([fetch(`${HTTP_BASE}/health`, { signal: c.signal, cache: 'no-store' }), late]).finally(() => clearTimeout(t));
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
  const s = useWake((x) => x.state), curtain = useWake((x) => x.curtain);
  if (curtain) return null;
  if (s === 'waking') return <div className="wake-bar" role="status"><i aria-hidden="true" />Sunucuya bağlanılıyor… Sunucu uyuyorsa ya da güncelleniyorsa 1 dakika kadar sürer.</div>;
  if (s === 'down') return <div className="wake-bar down" role="status">Sunucuya ulaşılamadı. Odan bu cihazda açık; internetini kontrol edip sayfayı yenile.<button type="button" onClick={() => location.reload()}>Yenile</button></div>;
  return null;
}

/** your room before it arrives (live, 2026-11-04): a dark empty room with buttons looked broken, and the buttons
 *  opened screens meant for later. Until the room is here, one calm card covers everything: why we wait, for how long,
 *  and "Tekrar dene" if the server does not answer. */
export function WakeCurtain({ show }: { show: boolean }) {
  const s = useWake((x) => x.state);
  const [sec, setSec] = useState(0);
  useEffect(() => { useWake.setState({ curtain: show }); return () => useWake.setState({ curtain: false }); }, [show]);
  useEffect(() => {
    if (!show) return setSec(0);
    const t0 = Date.now(), t = setInterval(() => setSec(Math.round((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(t);
  }, [show]);
  if (!show) return null;
  // the server answered but the room still has not come: after a while say so instead of waiting forever
  // and by its own clock too, whatever a stuck request is doing (live 2026-11-04: counted to 500 s and never gave up)
  const down = s === 'down' || (s === 'awake' && sec > 30) || sec > 240;
  return (
    <div className="wake-curtain" role="status">
      {down ? <>
        <b>Sunucuya ulaşılamadı</b>
        <p>İnternetini kontrol et, sonra tekrar dene. Linki WhatsApp/Instagram içinde açtıysan Chrome ya da Safari'de açmayı dene.</p>
        <button type="button" onClick={() => location.reload()}>Tekrar dene</button>
      </> : s === 'waking' ? <>
        <i aria-hidden="true" />
        <b>Sunucu uyanıyor… {sec} sn</b>
        <p>Kimse yokken uyur ya da güncellenir. 1 dakika kadar sürer, sonra odan açılır.</p>
        {sec > 60 && <><p>Uzun sürdü. Sayfayı yenilemeyi dene; olmazsa Wi-Fi ile mobil veri arasında geçiş yap ya da linki Chrome/Safari'de aç.</p>
          <button type="button" onClick={() => location.reload()}>Tekrar dene</button></>}
      </> : <span className="dot" aria-label="Yükleniyor" />}
    </div>
  );
}
