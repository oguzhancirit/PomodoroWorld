// "Arkadaşını çağır" (user 2026-11-09): from your own room call an online friend; on their screen a card says
// "Oğuzhan seni odasına çağırıyor" with Kabul et / Reddet. Accept takes them straight to your room.
// When a called friend arrives, both get the one-time welcome: a pack and a week of double XP.
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { BOOST_DAYS, WELCOME_NAMES, boostActive } from '@pw/shared';
import { useStore } from './store';
import { useFriends, friendsCall, ago } from './friends';

export interface IncomingCall { id: string; fromName: string; owner: string; roomName: string; until: number }
interface CallState { incoming: IncomingCall | null; panel: boolean; sent: Record<string, number>; bonus: { with: string; boostUntil: number; pack: string[] } | null }
export const useCalls = create<CallState>(() => ({ incoming: null, panel: false, sent: {}, bonus: null }));

type Sender = (type: string, msg: unknown) => void;
type Visit = (code: string) => unknown;
const STATUS: Record<string, (n: string) => string> = {
  sent: (n) => `${n || 'Arkadaşın'} çağrıldı. Cevap bekleniyor…`,
  coming: (n) => `${n || 'Arkadaşın'} geliyor!`,
  declined: (n) => `${n || 'Arkadaşın'} şimdi gelemiyor.`,
  offline: (n) => `${n || 'Arkadaşın'} şu an çevrimiçi değil.`,
  not_friend: () => 'Önce arkadaş olarak eklemelisin.',
  here: (n) => `${n || 'Arkadaşın'} zaten odanda.`,
  full: () => 'Odan dolu: yeni biri için sandalye ya da minder ekle.',
  wait: (n) => `${n || 'Arkadaşın'} az önce çağrıldı, biraz bekle.`,
  not_owner: () => 'Arkadaşlarını yalnız kendi odana çağırabilirsin.',
};

/** hooks the call messages of a live room (net.ts wire) */
export function wireCalls(r: { onMessage(type: string, cb: (m: any) => void): void }, visit: Visit) { // eslint-disable-line @typescript-eslint/no-explicit-any
  r.onMessage('called', (m: { id: string; fromName: string; owner: string; roomName: string; ttl: number }) => {
    useCalls.setState({ incoming: { id: m.id, fromName: m.fromName, owner: m.owner, roomName: m.roomName, until: Date.now() + (m.ttl || 90_000) } });
    try { navigator.vibrate?.(120); } catch { /* ignore */ }
  });
  r.onMessage('call_status', (m: { status: string; name: string }) => useStore.getState().flash((STATUS[m.status] ?? (() => m.status))(m.name), 4500));
  r.onMessage('call_go', (m: { code: string; name: string }) => { useCalls.setState({ incoming: null }); void visit(m.code); });
  r.onMessage('call_gone', (m: { name: string }) => { useCalls.setState({ incoming: null }); useStore.getState().flash(`${m.name || 'Arkadaşın'} odasından ayrılmış, çağrı geçersiz.`, 4500); });
  r.onMessage('bonus', (m: { with: string; boostUntil: number; pack: string[] }) => useCalls.setState({ bonus: { with: m.with, boostUntil: m.boostUntil, pack: m.pack?.length ? m.pack : WELCOME_NAMES } }));
}

/** the card on the called friend's screen */
export function IncomingCallCard({ send }: { send: Sender }) {
  const c = useCalls((s) => s.incoming);
  const [, tick] = useState(0);
  useEffect(() => { if (!c) return; const t = setInterval(() => { if (Date.now() > c.until) useCalls.setState({ incoming: null }); else tick((x) => x + 1); }, 500); return () => clearInterval(t); }, [c]);
  if (!c) return null;
  const left = Math.max(0, Math.ceil((c.until - Date.now()) / 1000));
  const answer = (accept: boolean) => { send('call_reply', { id: c.id, accept }); if (!accept) useCalls.setState({ incoming: null }); };
  return (
    <div className="call-card" role="alertdialog" aria-labelledby="call-t">
      <div className="call-ring" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg></div>
      <div className="call-txt"><b id="call-t">{c.fromName} seni odasına çağırıyor</b><small>{c.roomName} · {left} sn</small></div>
      <div className="call-btns"><button className="ghost" onClick={() => answer(false)}>Reddet</button><button className="acc" onClick={() => answer(true)}>Kabul et</button></div>
    </div>
  );
}

/** "Arkadaş çağır": online friends first, one tap calls */
export function CallPanel({ send, here }: { send: Sender; here: string[] }) {
  const open = useCalls((s) => s.panel), sent = useCalls((s) => s.sent);
  const { friends, loaded } = useFriends();
  const demo = useStore((s) => s.mode === 'demo');
  useEffect(() => { if (open) void friendsCall('list'); }, [open]);
  if (!open) return null;
  const close = () => useCalls.setState({ panel: false });
  const list = [...friends].sort((a, b) => Number(b.online) - Number(a.online));
  const call = (pid: string) => { send('call', { target: pid }); useCalls.setState((s) => ({ sent: { ...s.sent, [pid]: Date.now() } })); };
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Arkadaş çağır" onClick={(e) => e.target === e.currentTarget && close()} onKeyDown={(e) => e.key === 'Escape' && close()}>
      <div className="sheet call-sheet">
        <header><h2>Arkadaşını çağır</h2><button className="x" aria-label="Kapat" onClick={close}>×</button></header>
        <p className="call-gift"><b>Hoş geldin hediyesi:</b> çağırdığın arkadaş odana gelirse ikinize de <b>{BOOST_DAYS} gün 2x XP</b> ve hoş geldin paketi ({WELCOME_NAMES.join(', ')}). Herkes bir kez alır.</p>
        {demo && <p className="w-note">Deneme modu: çağırma, sunucuya bağlıyken çalışır.</p>}
        {!loaded ? <p className="w-note">Arkadaşlar yükleniyor…</p> : !list.length ? <p className="w-note">Henüz arkadaşın yok. Dünya → Arkadaşlar → Ekle ile kodunu paylaş.</p> : (
          <ul className="call-list">{list.map((f) => {
            const inHere = here.includes(f.pid), wait = Date.now() - (sent[f.pid] ?? 0) < 20_000;
            return (
              <li key={f.pid} className={f.online ? 'on' : ''}>
                <span className="ini">{f.n.slice(0, 1).toLocaleUpperCase('tr')}</span>
                <span className="who"><b>{f.n}</b><small>{inHere ? 'Odanda' : f.online ? 'Çevrimiçi' : ago(f.seen)}</small></span>
                <button className="acc sm" disabled={demo || !f.online || inHere || wait} onClick={() => call(f.pid)}>{wait ? 'Çağrıldı' : 'Çağır'}</button>
              </li>);
          })}</ul>)}
      </div>
    </div>
  );
}

/** both people see this when the called friend arrives */
export function BonusCard() {
  const b = useCalls((s) => s.bonus);
  if (!b) return null;
  const close = () => useCalls.setState({ bonus: null });
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="bonus-t" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="sheet bonus-sheet">
        <div className="bonus-badge" aria-hidden="true">2x</div>
        <h2 id="bonus-t">Hoş geldin paketi!</h2>
        <p>{b.with ? `${b.with} ile birlikte çalıştığınız için` : 'Arkadaşınla birlikte çalıştığınız için'} ikinize de:</p>
        <ul className="bonus-list"><li><b>{BOOST_DAYS} gün 2x XP</b> · odak XP’n iki katı</li>{b.pack.map((p) => <li key={p}>{p}</li>)}</ul>
        <p className="w-note">Eşyalar envanterinde: Odayı düzenle → Eşyalar.</p>
        <button className="acc" onClick={close}>Harika!</button>
      </div>
    </div>
  );
}

/** "2x XP · 5 gün" next to the wallet while the week lasts */
export function BoostBadge() {
  const w = useStore((s) => s.wallet);
  if (!w || !boostActive(w, Date.now())) return null;
  const days = Math.max(1, Math.ceil(((w.boostUntil ?? 0) - Date.now()) / 86_400_000));
  return <span className="boost-badge" title="Arkadaş bonusu: odak XP’n iki katı">2x XP · {days} gün</span>;
}
