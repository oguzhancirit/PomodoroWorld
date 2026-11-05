import { FlipClock } from './FlipClock';
import { useEffect, useRef, useState } from 'react';
import { chatOpenFor, isPaused, presetById, remainingMs, CHAT_MAX, CATEGORIES, activityFor, ECON, type Phase } from '@pw/shared';
import { useStore, serverNow } from '../store';
import { leaveRoom, sendChat, sendEmote, sendActivity, sendTimer } from '../net';
import { WalletChip, ShopModal, RewardToast } from './Wallet';
import { LevelUp } from './LevelUp';
import { ToolButtons, Panels, TodoChip } from './Panels';
import { myClock } from '../economy';
import { useBreaks, breakMinToday } from '../breaks';
import { flashing } from '../alerts';

const PHASE: Record<Phase, string> = { focus: 'Odak', short_break: 'Mola', long_break: 'Uzun mola', idle: 'Hazır' };
const fmt = (ms: number) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

export function RoomUI() {
  return (
    <div className="room-ui">
      <TopBar />
      <TimerCard />
      <ChatPanel />
      <EmoteBar /><DaySummary />
      <NetBanner />
      <Notice />
      <RewardToast /><LevelUp />
      <ShopModal />
      <Panels />
    </div>
  );
}

function TopBar() {
  const n = useStore((s) => Object.keys(s.players).length);
  const preset = presetById(useStore((s) => s.preset));
  const profile = useStore((s) => s.profile), setProfile = useStore((s) => s.setProfile);
  const demo = useStore((s) => s.mode === 'demo');
  // what I work on (chosen here or by picking a job in Yapılacaklar) → desk animation and statistics
  useEffect(() => { sendActivity(activityFor(profile.category), profile.category); }, [profile.category]);
  return (
    <header className="topbar">
      <div className="brand"><span className="dot" />Çalışma odası · {preset.name}</div>
      {demo && <div className="people-pill demo" title="Sunucu olmadan, bot arkadaşlarla">Deneme modu{profile.fast ? ' · hızlı' : ''}</div>}
      <div className="people-pill">{n} / 12 kişi</div>
      <WalletChip />
      <ToolButtons />
      <select aria-label="Ne çalışıyorsun?" value={profile.category} onChange={(e) => setProfile({ category: e.target.value })}>
        {CATEGORIES.map(([id, nm]) => <option key={id} value={id}>{nm}</option>)}
      </select>
      <button className="ghost" onClick={leaveRoom}>Çık</button>
    </header>
  );
}

/** `onOpen` (your room): the button opens the v1 focus screen; alone it says "Odaklan", with a friend "Birlikte odaklan" */
export function TimerCard({ onOpen, together = false }: { onOpen?: () => void; together?: boolean }) {
  const timer = useStore((s) => s.timer);
  const preset = presetById(useStore((s) => s.preset));
  const chosen = presetById(useStore((s) => s.profile.preset));
  // v1 HUD "Bugün n/4": today's finished pomodoros against the daily goal
  const today = useStore((s) => s.wallet?.stats.dayPomos[myClock().day] ?? 0);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 250); return () => clearInterval(t); }, []);
  const idle = timer.phase === 'idle';
  const paused = isPaused({ ...timer, pausedLeft: timer.pausedLeft ?? 0 });
  // idle: the length you are about to start; running: what is left
  const left = idle ? chosen.focusMin * 60_000 : remainingMs({ ...timer, pausedLeft: timer.pausedLeft ?? 0 }, serverNow());
  const total = (timer.phase === 'focus' ? preset.focusMin : timer.phase === 'long_break' ? preset.longMin : preset.shortMin) * 60_000;
  const k = idle || !total ? 0 : 1 - left / total;
  useEffect(() => { if (flashing) return; document.title = idle ? 'Pomodoro World' : `${fmt(left)} · ${paused ? 'Bekliyor' : PHASE[timer.phase]} · Pomodoro World`; });
  const label = idle ? PHASE.idle : paused ? 'Bekliyor · duraklattın' : `${PHASE[timer.phase]} · ${timer.phase === 'focus' ? timer.round + 1 : Math.max(1, timer.round)}. tur`;
  return (
    <section className={`timer-card ${timer.phase} ${paused ? 'paused' : ''}`}>
      <div className="t-head"><span className="ph"><i />{label}</span><small className={`t-goal ${today >= ECON.dailyGoal ? 'done' : ''}`} title={`Günlük hedef: ${ECON.dailyGoal} pomodoro (+${ECON.dailyGoalCoin} jeton)`}>Bugün {Math.min(today, ECON.dailyGoal)}/{ECON.dailyGoal}{today >= ECON.dailyGoal ? ' ✓' : ''}</small></div>
      <FlipClock text={fmt(left)} className="t-flip" />
      <div className="t-bar" aria-hidden="true"><i style={{ width: `${Math.round(k * 1000) / 10}%` }} /></div>
      <TodoChip />
      {onOpen && <button className={idle ? 't-go' : 't-stop'} onClick={onOpen}>{!idle ? 'Odak ekranı' : together ? 'Birlikte odaklan' : 'Odaklan'}</button>}
    </section>
  );
}

export function ChatPanel() {
  const chat = useStore((s) => s.chat);
  const timer = useStore((s) => s.timer);
  const [text, setText] = useState('');
  // the chat starts folded; the player opens it when they want (user, 2026-11-03)
  const [open, setOpen] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => { log.current?.scrollTo({ top: 1e9 }); }, [chat.length, open]);
  // social spaces are the place to talk: chat stays open there
  const social = useStore((s) => s.place?.kind === 'social');
  const allowed = social || chatOpenFor({ ...timer, pausedLeft: timer.pausedLeft ?? 0 });
  return (
    <aside className={`chat ${open ? '' : 'closed'}`}>
      <header onClick={() => setOpen(!open)}><b>Sohbet</b><span>{allowed ? 'açık' : 'odakta kapalı'}</span></header>
      {open && <>
        <div className="log" ref={log}>
          {chat.length === 0 && <p className="sys">Molada buraya yaz; mesajın karakterinin üstünde balon olur.</p>}
          {chat.map((m, i) => m.system ? <p key={i} className="sys">{m.text}</p> : <p key={i}><b>{m.name}</b> {m.text}</p>)}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); const t = text.trim(); if (!t) return; sendChat(t); setText(''); }}>
          <input value={text} maxLength={CHAT_MAX} disabled={!allowed} placeholder={allowed ? 'Bir şey yaz…' : 'Odak sırasında sohbet kapalı'} onChange={(e) => setText(e.target.value)} />
          <button disabled={!allowed || !text.trim()}>Gönder</button>
        </form>
      </>}
    </aside>
  );
}

const EMOTES: [string, string, string][] = [['wave', '👋', 'El salla'], ['clap', '👏', 'Alkışla'], ['cheer', '🎉', 'Kutla'], ['heart', '❤️', 'Kalp'], ['coffee', '☕', 'Kahve molası']];
/** one smiley on the left; the reactions open from it (user, 2026-11-03: the bar took too much room) */
export function EmoteBar() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const off = (e: Event) => { if (!(e.target as HTMLElement).closest?.('.emote-pick')) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    addEventListener('pointerdown', off); addEventListener('keydown', esc);
    return () => { removeEventListener('pointerdown', off); removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="emote-pick">
      {open && <nav className="emote-pop" aria-label="Tepkiler">{EMOTES.map(([id, e, t]) => <button key={id} title={t} aria-label={t} onClick={() => { sendEmote(id); setOpen(false); }}>{e}</button>)}</nav>}
      <button className={`emote-btn ${open ? 'on' : ''}`} aria-label="Tepki gönder" aria-expanded={open} title="Tepki gönder" onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2" /><circle cx="9" cy="10" r=".9" fill="currentColor" /><circle cx="15" cy="10" r=".9" fill="currentColor" /></svg>
      </button>
    </div>
  );
}

/** the day at a glance: pomodoros, focus and break minutes today */
export function DaySummary() {
  const w = useStore((s) => s.wallet);
  useBreaks((s) => s.days); useBreaks((s) => s.since);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 15_000); return () => clearInterval(t); }, []);
  const day = myClock().day;
  const focus = w?.stats.days[day] ?? 0, pomos = w?.stats.dayPomos[day] ?? 0, rest = Math.round(breakMinToday());
  const fm = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} sa ${m % 60 ? `${m % 60} dk` : ''}`.trim() : `${m} dk`);
  return (
    <div className="day-sum" aria-label="Bugünün özeti">
      <span><b>{pomos}</b> pomodoro</span><i />
      <span className="f"><b>{fm(focus)}</b> odak</span><i />
      <span className="m"><b>{fm(rest)}</b> mola</span>
    </div>
  );
}

export function NetBanner() {
  const net = useStore((s) => s.net), error = useStore((s) => s.error);
  if (net === 'reconnecting') return <div className="banner">Bağlantı koptu, yeniden bağlanıyor… Yerin 30 saniye korunuyor.</div>;
  if (net === 'offline') return <div className="banner err">{error} <button onClick={leaveRoom}>{/başka bir pencerede/.test(error) ? 'Burada devam et' : 'Odama dön'}</button></div>;
  return null;
}

export function Notice() {
  const n = useStore((s) => s.notice);
  const [, tick] = useState(0);
  useEffect(() => { if (!n) return; const t = setTimeout(() => tick((x) => x + 1), n.until - Date.now() + 50); return () => clearTimeout(t); }, [n]);
  if (!n || n.until < Date.now()) return null;
  return <div className="notice">{n.text}</div>;
}
