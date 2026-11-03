// The v1 focus screen ("openFocus"), ported: a big ring, what you work on, kind of work, length (presets or
// "Özel"), one main button (Başlat / Duraklat / Devam et), and tools: to-dos, sounds, reset, skip, back to the room.
// Alone it is your own timer; with a friend in the room the same timer is shared ("Birlikte").
import { useEffect, useRef, useState } from 'react';
import { PRESETS, CATEGORIES, presetById, customPresetId, remainingMs, activityFor, isPaused, type Phase } from '@pw/shared';
import { useStore, serverNow } from '../store';
import { sendTimer, sendActivity, sendFollow } from '../net';
import { usePanel, CAT_COLOR } from '../ui/Panels';
import { useTodos } from '../todos';

const ICO: Record<string, string> = {
  Ders: '<path d="M4 6l8-3 8 3-8 3z"/><path d="M7 7.5V12c0 1.5 2.2 3 5 3s5-1.5 5-3V7.5"/><path d="M20 6v5"/>',
  Okuma: '<path d="M3 6c3-1.5 6-1.5 9 0v13c-3-1.5-6-1.5-9 0zM21 6c-3-1.5-6-1.5-9 0v13c3-1.5 6-1.5 9 0z"/>',
  Kodlama: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
  Proje: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
  Yazı: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  Dil: '<path d="M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M11 5c-1 4-4 7-7 8"/><path d="M13 21l4-9 4 9M14.5 18h5"/>',
  Diğer: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>',
};
const PHASE: Record<Phase, string> = { focus: 'Odak', short_break: 'Mola', long_break: 'Uzun mola', idle: 'Odak' };
const fmt = (ms: number) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
/** 60 tick marks along a rounded square (watch-face style, user 2026-11-03), clockwise from the top middle */
const TICKS = (() => {
  const S = 300, m = 15, r = 58, a = m, b = S - m, straight = b - a - 2 * r, arc = (Math.PI / 2) * r, per = 4 * straight + 4 * arc;
  const at = (d: number): [number, number, number, number] => { // point + inward normal at distance d from the top middle
    d = ((d % per) + per) % per;
    const segs: [number, (t: number) => [number, number, number, number]][] = [
      [straight / 2, (t) => [S / 2 + t, a, 0, 1]],
      [arc, (t) => { const th = -Math.PI / 2 + t / r; return [b - r + r * Math.cos(th), a + r + r * Math.sin(th), -Math.cos(th), -Math.sin(th)]; }],
      [straight, (t) => [b, a + r + t, -1, 0]],
      [arc, (t) => { const th = t / r; return [b - r + r * Math.cos(th), b - r + r * Math.sin(th), -Math.cos(th), -Math.sin(th)]; }],
      [straight, (t) => [b - r - t, b, 0, -1]],
      [arc, (t) => { const th = Math.PI / 2 + t / r; return [a + r + r * Math.cos(th), b - r + r * Math.sin(th), -Math.cos(th), -Math.sin(th)]; }],
      [straight, (t) => [a, b - r - t, 1, 0]],
      [arc, (t) => { const th = Math.PI + t / r; return [a + r + r * Math.cos(th), a + r + r * Math.sin(th), -Math.cos(th), -Math.sin(th)]; }],
      [straight / 2, (t) => [a + r + t, a, 0, 1]],
    ];
    for (const [len, f] of segs) { if (d <= len) return f(d); d -= len; }
    return [S / 2, a, 0, 1];
  };
  return Array.from({ length: 60 }, (_, i) => { const [x, y, nx, ny] = at((i / 60) * per), L = i % 5 === 0 ? 16 : 9; return { x1: x, y1: y, x2: x + nx * L, y2: y + ny * L, big: i % 5 === 0 }; });
})();
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const Svg = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />;

/** the other people in this room */
export function useCompanions() {
  const players = useStore((s) => s.players), me = useStore((s) => s.me);
  return Object.values(players).filter((p) => p.id !== me && p.connected);
}
/** someone in the room whose own timer runs: you can join it ("Birlikte", v1 followPeer) */
export const isRunning = (p: { phase?: string; pausedLeft?: number }) => !!p.phase && p.phase !== 'idle' && !(p.pausedLeft ?? 0);

/** everyone keeps their own timer; "Birlikte" joins a friend's running one */
export function FocusScreen({ onClose }: { onClose(): void }) {
  const timer = useStore((s) => s.timer), roomPreset = useStore((s) => s.preset);
  const profile = useStore((s) => s.profile), setProfile = useStore((s) => s.setProfile);
  const others = useCompanions();
  const { list, sel } = useTodos();
  const todo = list.find((t) => t.id === sel);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 250); return () => clearInterval(t); }, []);
  const go = useRef<HTMLButtonElement>(null);
  useEffect(() => { go.current?.focus({ preventScroll: true }); }, []);

  const idle = timer.phase === 'idle', paused = isPaused({ ...timer, pausedLeft: timer.pausedLeft ?? 0 });
  // while idle the ring shows the length you are about to start; afterwards the room's running length
  const preset = presetById(idle ? profile.preset : roomPreset);
  const total = (timer.phase === 'focus' || idle ? preset.focusMin : timer.phase === 'long_break' ? preset.longMin : preset.shortMin) * 60_000;
  const left = idle ? total : remainingMs({ ...timer, pausedLeft: timer.pausedLeft ?? 0 }, serverNow());
  const k = idle || !total ? 0 : 1 - left / total;
  const dots = timer.round % 4;
  const cat = CATEGORIES.find((c) => c[0] === profile.category) ?? CATEGORIES[0];
  const custom = profile.preset.startsWith('c');

  const main = () => {
    if (idle) {
      const t = profile.task.trim();
      if (t) setProfile({ recent: [t, ...profile.recent.filter((x) => x !== t)].slice(0, 6) });
      sendTimer('start');
    } else sendTimer(paused ? 'resume' : 'pause');
  };
  // v1 keys: Space = main button, Escape = back to the room
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      // a panel opened from here (to-dos, sounds) closes first
      if (e.key === 'Escape') { if (!usePanel.getState().open) { e.preventDefault(); onClose(); } return; }
      const el = e.target as HTMLElement;
      if (usePanel.getState().open) return;
      if (e.code === 'Space' && !/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName)) { e.preventDefault(); main(); }
    };
    addEventListener('keydown', on, true); return () => removeEventListener('keydown', on, true);
  });
  const pickCat = (id: string) => { setProfile({ category: id }); sendActivity(activityFor(id), id); };
  const setCustom = (f: number, b: number) => { const c = { f: clamp(f, 5, 180), b: clamp(b, 1, 60) }; setProfile({ custom: c, preset: customPresetId(c.f, c.b) }); };
  const label = idle ? 'Başlat' : paused ? 'Devam et' : 'Duraklat';
  // people on the very same timer as me (I joined theirs, or they joined mine)
  const withMe = idle ? [] : others.filter((p) => p.phase === timer.phase && p.phaseEndsAt === timer.phaseEndsAt).map((p) => p.name);
  const shared = withMe.length ? ` · ${withMe.slice(0, 2).join(', ')}${withMe.length > 2 ? ` +${withMe.length - 2}` : ''} ile` : '';
  const joinable = idle ? others.filter(isRunning).slice(0, 3) : [];

  return (
    <div className={`focus-screen ${timer.phase}`} role="dialog" aria-modal="true" aria-label="Odak ekranı">
      <button className="fx-icon fx-close" onClick={onClose} title="Odaya dön" aria-label="Odaya dön"><Svg d='<path d="M6 6l12 12M18 6L6 18"/>' /></button>
      <div className="fx-center">
        <div className="fx-phase"><span>{paused ? 'Duraklatıldı' : PHASE[timer.phase]}{shared}</span><span className="fx-dots">{[0, 1, 2, 3].map((i) => <i key={i} className={i < dots ? 'on' : ''} />)}</span></div>
        <div className="fx-ring">
          <svg viewBox="0 0 300 300" aria-hidden="true">
            <rect className="fx-face" x="3" y="3" width="294" height="294" rx="70" />
            {TICKS.map((t, i) => <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} className={`${t.big ? 'big' : ''} ${!idle && i < Math.round(k * 60) ? 'on' : ''}`} />)}
          </svg>
          <div className="fx-in">
            <div className="fx-time" aria-live="off">{fmt(left)}</div>
            <span className="fx-catlbl" style={{ ['--c' as string]: CAT_COLOR[todo?.c ?? cat[0]] ?? '#FF8466' }}><i />{todo ? todo.t : cat[1]}</span>
          </div>
        </div>
        {idle && (
          <div className="fx-setup">
            <div className="fx-sec"><span className="fx-h">Ne çalışacaksın?</span>
              <div className="fx-cats" role="radiogroup" aria-label="Çalışma türü">
                {CATEGORIES.map(([id, nm]) => <button key={id} type="button" role="radio" aria-checked={profile.category === id} className="fx-cat" style={{ ['--c' as string]: CAT_COLOR[id] ?? '#FF8466' }} onClick={() => pickCat(id)}><Svg d={ICO[id] ?? ICO.Diğer} />{nm}</button>)}
              </div>
            </div>
            <div className="fx-sec"><span className="fx-h">Süre · odak / mola</span>
              <div className="fx-durs" role="radiogroup" aria-label="Süre">
                {PRESETS.map((p) => <button key={p.id} type="button" role="radio" aria-checked={profile.preset === p.id} className="fx-dur" onClick={() => setProfile({ preset: p.id })}><b>{p.focusMin}<small> / {p.shortMin}</small></b><span>{p.hint}</span></button>)}
                <button type="button" role="radio" aria-checked={custom} className="fx-dur" onClick={() => setCustom(profile.custom.f, profile.custom.b)}><b>{profile.custom.f}<small> / {profile.custom.b}</small></b><span>Sana özel</span></button>
              </div>
              {custom && (
                <div className="fx-custom">
                  <label>Odak<span className="stepper"><button type="button" aria-label="Odak 5 dakika az" onClick={() => setCustom(profile.custom.f - 5, profile.custom.b)}>−</button><b>{profile.custom.f} dk</b><button type="button" aria-label="Odak 5 dakika çok" onClick={() => setCustom(profile.custom.f + 5, profile.custom.b)}>+</button></span></label>
                  <label>Mola<span className="stepper"><button type="button" aria-label="Mola 1 dakika az" onClick={() => setCustom(profile.custom.f, profile.custom.b - 1)}>−</button><b>{profile.custom.b} dk</b><button type="button" aria-label="Mola 1 dakika çok" onClick={() => setCustom(profile.custom.f, profile.custom.b + 1)}>+</button></span></label>
                </div>
              )}
            </div>
            {joinable.length > 0 && (
              <div className="fx-sec"><span className="fx-h">Birlikte odaklan</span>
                <div className="fx-join">{joinable.map((p) => (
                  <button key={p.id} type="button" onClick={() => sendFollow(p.id)}>
                    <b>{p.name}</b><span>{p.phase === 'focus' ? 'odakta' : 'molada'} · {fmt(remainingMs({ phase: p.phase as never, phaseEndsAt: p.phaseEndsAt ?? 0, round: 0 }, serverNow()))} kaldı</span><em>Sayacına katıl</em>
                  </button>))}</div>
              </div>
            )}
          </div>
        )}
        {<button ref={go} className={`fx-go ${!idle && !paused ? 'run' : ''}`} onClick={main} data-min={idle ? `${preset.focusMin} dk` : ''}>
          <span className="pl">{!idle && !paused ? <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg> : <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M8 5v14l11-7z" /></svg>}</span>
          <span>{label}</span>
        </button>}
        <div className="fx-tools">
          <button className="fx-icon" title="Yapılacaklar" aria-label="Yapılacaklar" onClick={() => usePanel.getState().set('todo')}><Svg d='<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>' /></button>
          <button className="fx-icon" title="Ortam sesleri" aria-label="Ortam sesleri" onClick={() => usePanel.getState().set('sound')}><Svg d='<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>' /></button>
          {!idle && <button className="fx-icon" title="Sıfırla" aria-label="Sıfırla" onClick={() => sendTimer('stop')}><Svg d='<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.6"/><path d="M4 4v4.6h4.6"/>' /></button>}
          {!idle && <button className="fx-icon" title="Bu aşamayı atla" aria-label="Atla" onClick={() => sendTimer('skip')}><Svg d='<path d="M5 5l9 7-9 7zM17 5v14"/>' /></button>}
          <button className="fx-icon" title="Odayı göster" aria-label="Odayı göster" onClick={onClose}><Svg d='<path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1z"/>' /></button>
        </div>
      </div>
    </div>
  );
}
