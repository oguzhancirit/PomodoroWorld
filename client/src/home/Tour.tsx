// Guided tour (v1 js/ui.js TOUR): once, right after the first-run film (user, 2026-11-03: no help window,
// the tour only the first time). A spotlight walks over the main buttons of your room.
import { useEffect, useLayoutEffect, useState } from 'react';
import { useStore } from '../store';
import { sfx } from '../sound';

type Step = { sel?: string; icon: string; t: string; p?: string };
const STEPS: Step[] = [
  { icon: '🏠', t: 'Burası senin odan', p: '{name}, hoş geldin!' },
  { sel: '.timer-card .t-go', icon: '⏱️', t: 'Başlat, odaklan', p: 'Ne çalışacağını ve süreyi seç: 25/5, 50/10, 90/20…' },
  { sel: '.home-top .wallet', icon: '🪙', t: 'Dakika = XP + jeton', p: 'Odaklandıkça seviye atlar, jeton kazanırsın.' },
  { sel: '.home-top .acc.ico-btn', icon: '🛋️', t: 'Jetonlarla odanı kur', p: 'Mağazadan eşya al, buradan yerleştir.' },
  { sel: '.home-top .people-btn', icon: '👋', t: 'Odandakiler', p: 'Arkadaş ekle, sayacına katıl.' },
  { sel: '.home-top .world-btn', icon: '🌍', t: 'Molada dünyayı gez', p: 'Kütüphane, kafe ve arkadaşlarının odaları.' },
];
const PAD = 8;

export function Tour({ run }: { run: boolean }) {
  const toured = useStore((s) => s.profile.toured), name = useStore((s) => s.profile.name);
  const [i, setI] = useState(0);
  const [box, setBox] = useState<DOMRect | null>(null);
  const [vw, setVw] = useState(() => [innerWidth, innerHeight]);
  const on = run && !toured;
  const st = STEPS[i];

  useEffect(() => { if (!on) return; const r = () => setVw([innerWidth, innerHeight]); addEventListener('resize', r); return () => removeEventListener('resize', r); }, [on]);
  useLayoutEffect(() => {
    if (!on) return;
    const el = st.sel ? document.querySelector<HTMLElement>(st.sel) : null;
    setBox(el && el.offsetParent !== null ? el.getBoundingClientRect() : null);
    sfx('pop');
  }, [on, i, vw, st.sel]);
  if (!on) return null;

  const end = () => useStore.getState().setProfile({ toured: true });
  const next = () => (i + 1 >= STEPS.length ? end() : setI(i + 1));
  const [W, H] = vw, cw = Math.min(340, W - 32);
  let left = (W - cw) / 2, top = H * 0.58;
  if (box) {
    left = Math.min(Math.max(16, box.left + box.width / 2 - cw / 2), W - cw - 16);
    top = box.bottom + 18; if (top + 200 > H) top = Math.max(16, box.top - 210);
  }
  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label="Kısa tur" onKeyDown={(e) => e.key === 'Escape' && end()}>
      <div className={`tour-spot ${box ? '' : 'none'}`} style={box ? { left: box.left - PAD, top: box.top - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 } : undefined} />
      <div className="tour-card" key={i} style={{ left, top, width: cw }} aria-live="polite">
        <div className="tour-hd"><span className="tour-ico" aria-hidden="true">{st.icon}</span><h3>{st.t}</h3></div>
        {st.p && <p>{st.p.replace('{name}', name || '')}</p>}
        <div className="tour-ft">
          <div className="tour-dots" aria-hidden="true">{STEPS.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
          <div className="tour-btns"><button className="tour-skip" onClick={end}>Geç</button><button className="tour-next" autoFocus onClick={next}>{i === STEPS.length - 1 ? 'Hadi başlayalım' : 'İleri'}</button></div>
        </div>
      </div>
    </div>
  );
}
