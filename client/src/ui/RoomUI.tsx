import { useEffect, useRef, useState } from 'react';
import { isChatAllowed, presetById, remainingMs, CHAT_MAX, CATEGORIES, activityFor, type Phase } from '@pw/shared';
import { useStore, serverNow } from '../store';
import { leaveRoom, sendChat, sendEmote, sendActivity } from '../net';

const PHASE: Record<Phase, string> = { focus: 'Odak', short_break: 'Mola', long_break: 'Uzun mola', idle: 'Hazır' };
const fmt = (ms: number) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

export function RoomUI() {
  return (
    <div className="room-ui">
      <TopBar />
      <TimerCard />
      <ChatPanel />
      <EmoteBar />
      <NetBanner />
      <Notice />
    </div>
  );
}

function TopBar() {
  const n = useStore((s) => Object.keys(s.players).length);
  const preset = presetById(useStore((s) => s.preset));
  const profile = useStore((s) => s.profile), setProfile = useStore((s) => s.setProfile);
  return (
    <header className="topbar">
      <div className="brand"><span className="dot" />Çalışma odası · {preset.name}</div>
      <div className="people-pill">{n} / 12 kişi</div>
      <select aria-label="Ne çalışıyorsun?" value={profile.category} onChange={(e) => { setProfile({ category: e.target.value }); sendActivity(activityFor(e.target.value)); }}>
        {CATEGORIES.map(([id, nm]) => <option key={id} value={id}>{nm}</option>)}
      </select>
      <button className="ghost" onClick={leaveRoom}>Çık</button>
    </header>
  );
}

function TimerCard() {
  const timer = useStore((s) => s.timer);
  const preset = presetById(useStore((s) => s.preset));
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 250); return () => clearInterval(t); }, []);
  const left = remainingMs(timer, serverNow());
  const total = (timer.phase === 'focus' ? preset.focusMin : timer.phase === 'long_break' ? preset.longMin : preset.shortMin) * 60_000;
  const k = total ? 1 - left / total : 0;
  useEffect(() => { document.title = `${fmt(left)} · ${PHASE[timer.phase]} · Pomodoro World`; });
  return (
    <section className={`timer-card ${timer.phase}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" className="trk" /><circle cx="50" cy="50" r="44" className="bar" pathLength={100} strokeDasharray="100" strokeDashoffset={100 - k * 100} /></svg>
      <div className="t-in"><span className="ph">{PHASE[timer.phase]} · {timer.phase === 'focus' ? timer.round + 1 : Math.max(1, timer.round)}. tur</span><b>{fmt(left)}</b>
        <small>{isChatAllowed(timer.phase) ? 'Sohbet açık' : 'Sohbet kapalı'}</small></div>
    </section>
  );
}

function ChatPanel() {
  const chat = useStore((s) => s.chat);
  const phase = useStore((s) => s.timer.phase);
  const [text, setText] = useState('');
  // on phones the chat starts folded so the room stays visible
  const [open, setOpen] = useState(() => typeof innerWidth === 'undefined' || innerWidth > 860);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => { log.current?.scrollTo({ top: 1e9 }); }, [chat.length, open]);
  const allowed = isChatAllowed(phase);
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
function EmoteBar() {
  return <nav className="emotes" aria-label="Tepkiler">{EMOTES.map(([id, e, t]) => <button key={id} title={t} aria-label={t} onClick={() => sendEmote(id)}>{e}</button>)}</nav>;
}

function NetBanner() {
  const net = useStore((s) => s.net), error = useStore((s) => s.error);
  if (net === 'reconnecting') return <div className="banner">Bağlantı koptu, yeniden bağlanıyor… Yerin 30 saniye korunuyor.</div>;
  if (net === 'offline') return <div className="banner err">{error} <button onClick={leaveRoom}>Lobiye dön</button></div>;
  return null;
}

function Notice() {
  const n = useStore((s) => s.notice);
  const [, tick] = useState(0);
  useEffect(() => { if (!n) return; const t = setTimeout(() => tick((x) => x + 1), n.until - Date.now() + 50); return () => clearTimeout(t); }, [n]);
  if (!n || n.until < Date.now()) return null;
  return <div className="notice">{n.text}</div>;
}
