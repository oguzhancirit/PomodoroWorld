// First page (user, 2026-11-03, laid out like the sign-in screen they showed): three tilted cards on the left
// (the focus screen with its timer lengths, making your character, a full room, making friends) and the sign-in on the right: Google, Apple (later),
// guest. A live "people focusing now" line shows you will not be alone.
import { useEffect, useRef, useState } from 'react';
import { continueAsGuest, googleReady, mountGoogleButton, GOOGLE_CLIENT_ID } from '../account';
import { HTTP_BASE, DEMO_ONLY } from '../config';
import { DEMO_PEOPLE } from '../demoHosts';

const ASSET = (f: string) => `${import.meta.env.BASE_URL}login/${f}`;

function useLiveCount() {
  const [n, setN] = useState<number | null>(DEMO_ONLY ? DEMO_PEOPLE : null);
  useEffect(() => {
    if (DEMO_ONLY) return;
    let live = true;
    const get = () => fetch(`${HTTP_BASE}/api/world`).then((r) => r.json()).then((d) => {
      const social = Object.values((d.social ?? {}) as Record<string, number>).reduce((a, b) => a + (Number(b) || 0), 0);
      const homes = ((d.rooms ?? []) as { n: number }[]).reduce((a, r) => a + (Number(r.n) || 0), 0);
      if (live) setN(homes + (Number(d.library) || 0) + social);
    }).catch(() => live && setN(null));
    get(); const t = setInterval(get, 30_000);
    return () => { live = false; clearInterval(t); };
  }, []);
  return n;
}

export function Login() {
  const gRef = useRef<HTMLDivElement>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const count = useLiveCount();
  const ready = googleReady();
  useEffect(() => {
    if (!ready || !gRef.current) return;
    mountGoogleButton(gRef.current, (err) => { setBusy(false); setMsg(err); }, Math.min(360, gRef.current.clientWidth || 320))
      .catch(() => setMsg('Google girişi yüklenemedi. Misafir olarak devam edebilirsin.'));
  }, [ready]);
  const fakeGoogle = () => {
    // the demo has no server, and a real server needs a Google client id first
    if (DEMO_ONLY) { setMsg('Demoda Google girişi kapalı: misafir olarak açılıyor…'); setBusy(true); setTimeout(continueAsGuest, 1400); }
    else setMsg(GOOGLE_CLIENT_ID ? 'Google girişi yüklenemedi.' : 'Google girişi bu sürümde henüz açık değil. Misafir olarak devam edebilirsin.');
  };

  return (
    <main className="login">
      <div className="lg-logo"><span className="dot" />Pomodoro<b>World</b></div>

      <section className="lg-art" aria-label="Pomodoro World'den görüntüler">
        <div className="lg-glow" aria-hidden="true"><i /><i /><i /></div>
        <div className="lg-rings" aria-hidden="true"><i /><i /><i /></div>
        <figure className="lg-card c1">
          <header><span>Odaklan</span><small>01</small></header>
          <div className="lg-media"><img src={ASSET('focus.webp')} alt="Odak ekranı: büyük sayaç, ne çalışacağın ve süre seçenekleri" /><span className="lg-tag">Odak ekranı</span></div>
          <Durations />
          <figcaption>Süreni sen seç: kısa ısınma ya da uzun maraton.</figcaption>
        </figure>
        <figure className="lg-card c2">
          <header><span>Kendi modelini yarat</span><small>02</small></header>
          <div className="lg-media"><img src={ASSET('avatar.webp')} alt="Karakter yaratma ekranı: saç, kıyafet ve renk seçenekleri" /><span className="lg-tag">Karakterin</span></div>
          <div className="lg-row"><span className="lg-sw" style={{ background: '#e58bb0' }} /><span className="lg-sw" style={{ background: '#3e7cb1' }} /><span className="lg-sw" style={{ background: '#f2c14e' }} /><b>Tarzını seç</b><em>🎲 Şansıma</em></div>
          <figcaption>Saçını, kıyafetini ve renklerini seç; tarzın senin olsun.</figcaption>
        </figure>
        <figure className="lg-card c3">
          <header><span>Odanı kur</span><small>03</small></header>
          <div className="lg-media"><img src={ASSET('room.webp')} alt="Eşyalarla dolu bir oda: kanepe, kilim, neon yazı, akvaryum, kedi, bitkiler" /><span className="lg-tag">Oğuzhan'ın odası</span></div>
          <div className="lg-row lg-feats"><span>🛋️ 100+ eşya</span><span>✨ Neon</span><span>🍂 Efekt</span><span>🎨 Renk</span></div>
          <figcaption>Eşyanı seç, rengini ver, adını yaz: oda senin tarzın olsun.</figcaption>
        </figure>
        <figure className="lg-card c4">
          <header><span>Sosyalleşmeyi unutma</span><small>04</small></header>
          <div className="lg-media"><img src={ASSET('friends.webp')} alt="Sosyal alanda bir arada duran beş oyuncu" /><span className="lg-tag">Meydan Kafe · 5 kişi</span></div>
          <div className="lg-row ok"><span className="av">E</span><b>Elif</b> Mola! Kahve? ☕<em>az önce</em></div>
          <figcaption>Molada kütüphanede ya da kafede arkadaşlarınla buluş.</figcaption>
        </figure>
      </section>

      <section className="lg-side">
        <p className="lg-kicker">Sana ait bir oda</p>
        <h1>Hemen gir ve<br /><em>birlikte odaklanmaya başla.</em></h1>
        <p className="lg-sub">25 dakika odaklan, molada arkadaşlarınla konuş.<br />Her pomodoro jeton kazandırır; jetonlarla odanı ve karakterini güzelleştir.</p>
        {count !== null && count > 0 && <p className="lg-live"><i aria-hidden="true" />Şu an <b>{count}</b> kişi odaklanıyor{DEMO_ONLY ? ' (demo botları)' : ''}</p>}

        <div className="lg-btns">
          {ready ? <div className="lg-google" ref={gRef} aria-busy={busy} />
            : <button type="button" className="lg-btn google" onClick={fakeGoogle} disabled={busy}><GoogleG />Google ile devam et</button>}
          <button type="button" className="lg-btn apple" disabled title="Yakında"><AppleLogo />Apple ile devam et<em>Yakında</em></button>
          <button type="button" className="lg-btn guest" onClick={continueAsGuest} disabled={busy}><PersonIcon />Misafir olarak devam et</button>
        </div>
        <p className="lg-note">Kayıt olmadan dene. İlerlemen bu tarayıcıda kalır; sonra Google'a bağlarsan hiçbiri kaybolmaz.</p>
        {msg && <p className="lg-msg" role="status">{msg}</p>}
        <div className="lg-lock"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
          <span>Şifre oluşturman gerekmiyor.<br />Karakterin, odan ve ilerlemen sana ait.</span></div>
      </section>
      <p className="lg-tagline">Odaklan. Kazan. Odanı kur.</p>
    </main>
  );
}

/* the timer lengths you can pick (same as @pw/shared PRESETS; written out so the first page stays light) */
const DURS = [[25, 5], [45, 15], [50, 10], [90, 20]] as const;
function Durations() {
  const [on, setOn] = useState(0);
  return (
    <div className="lg-row lg-durs" role="radiogroup" aria-label="Odak / mola süresi">
      {DURS.map(([f, b], i) => <button key={f} type="button" role="radio" aria-checked={on === i} className={on === i ? 'on' : ''} onClick={() => setOn(i)}><b>{f}</b>/{b}</button>)}
      <span className="lg-own">+ sana özel</span>
    </div>
  );
}

function PersonIcon() {
  return <svg className="lg-ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>;
}

function GoogleG() {
  return <svg className="lg-ico" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>;
}
function AppleLogo() {
  return <svg className="lg-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.9-3-.9C7 7.3 5.6 8.2 4.8 9.6c-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 2.9 2.4 1.2-.1 1.6-.8 3-.8s1.8.8 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.7 0 0-2.6-1-2.6-3.8zM14.2 5.8c.6-.8 1.1-1.8 1-2.8-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.7-1 2.7 1 .1 2-.5 2.7-1.3z" /></svg>;
}
