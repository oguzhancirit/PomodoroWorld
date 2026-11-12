// "Dünya": the way out of your room (v1 js/ui.js renderWorld). User, 2026-11-03: less text, more picture —
// big place cards, friends as faces, and the invite tools tucked into one small row.
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { inviteCode, homeCapacity, parseFriendCode, SOCIAL_AT, hallOf } from '@pw/shared';
import { useStore } from '../store';
import { identity } from '../identity';
import { HTTP_BASE, DEMO_ONLY } from '../config';
import { visitHome, joinLibrary, joinHall, joinSocial, currentRoomId, leaveRoom } from '../net';
import { useFriends, friendsCall, ago, type FriendView } from '../friends';

const useWorld = create<{ open: boolean }>(() => ({ open: false }));
const close = () => useWorld.setState({ open: false });

export function WorldButton() {
  return (
    <button className="ghost world-btn" onClick={() => useWorld.setState({ open: true })}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" /></svg><span className="lbl">Dünya</span>
    </button>
  );
}

interface OpenRoom { owner: string; ownerName: string; name: string; cat: string; n: number; cap: number }

/** the picture on each place card */
const ART: Record<string, string> = {
  home: '<path d="M10 30 32 12l22 18v22a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3z" fill="#ffd8a8"/><path d="M6 32 32 9l26 23" fill="none" stroke="#e8553d" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><rect x="26" y="38" width="12" height="17" rx="2" fill="#b0623e"/><rect x="15" y="34" width="8" height="8" rx="1.5" fill="#7cc6ff"/><rect x="41" y="34" width="8" height="8" rx="1.5" fill="#7cc6ff"/>',
  library: '<rect x="8" y="14" width="10" height="38" rx="2" fill="#e8553d"/><rect x="19" y="10" width="9" height="42" rx="2" fill="#f2c14e"/><rect x="29" y="16" width="11" height="36" rx="2" fill="#6cbf6a"/><rect x="41" y="12" width="8" height="40" rx="2" fill="#8fb8ff" transform="rotate(8 45 32)"/><rect x="6" y="52" width="50" height="4" rx="2" fill="#c9a35a"/>',
  cafe: '<path d="M14 26h30v14a12 12 0 0 1-12 12h-6a12 12 0 0 1-12-12z" fill="#fff4e6"/><path d="M44 30h4a6 6 0 0 1 0 12h-5" fill="none" stroke="#fff4e6" stroke-width="4"/><path d="M22 10c-3 4 3 6 0 10M30 8c-3 4 3 6 0 10M38 10c-3 4 3 6 0 10" fill="none" stroke="#ffd8a8" stroke-width="3" stroke-linecap="round"/><rect x="10" y="54" width="40" height="4" rx="2" fill="#c98a5a"/>',
  terrace: '<circle cx="32" cy="34" r="14" fill="#ffb36b"/><rect x="4" y="34" width="56" height="26" fill="#2c2754"/><path d="M4 40h56M4 47h56" stroke="#ffb36b" stroke-opacity=".5" stroke-width="2"/><path d="M12 34V22M52 34V20" stroke="#6cbf6a" stroke-width="4" stroke-linecap="round"/><circle cx="12" cy="20" r="6" fill="#6cbf6a"/><circle cx="52" cy="18" r="7" fill="#6cbf6a"/>',
  // Pist 25: a jet climbing off a runway at dusk
  pist25: '<rect x="4" y="6" width="56" height="52" rx="10" fill="#2c2754"/><circle cx="44" cy="34" r="9" fill="#ffb36b"/><path d="M24 58 30 36h4l6 22z" fill="#3a3f47"/><path d="M32 40v4M32 47v4M32 54v3" stroke="#f6f4ef" stroke-width="1.6"/><path d="M10 30l34-14 6 1-3 4-31 12-5 2z" fill="#e9ecf2"/><path d="M26 24l-6-9h4l10 7zM24 28l-2 9h3l7-11z" fill="#c9ced6"/><path d="M45 17l4-7h3l-2 8z" fill="#e8553d"/>',
  arcade: '<rect x="12" y="20" width="40" height="26" rx="13" fill="#8a5bb0"/><path d="M22 28v10M17 33h10" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="41" cy="30" r="3" fill="#f2c14e"/><circle cx="46" cy="36" r="3" fill="#e8553d"/><path d="M14 12l4 5M50 12l-4 5M32 8v6" stroke="#ff8ad8" stroke-width="3" stroke-linecap="round"/>',
};
const Art = ({ id }: { id: string }) => <svg viewBox="0 0 64 64" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ART[id] }} />;

export function WorldPanel() {
  const open = useWorld((s) => s.open);
  const room = useStore((s) => s.room), mode = useStore((s) => s.mode), place = useStore((s) => s.place), flash = useStore((s) => s.flash);
  const [rooms, setRooms] = useState<OpenRoom[] | null>(null);
  const [library, setLibrary] = useState(0);
  const [halls, setHalls] = useState<Record<string, number>>({});
  const [social, setSocial] = useState<Record<string, number>>({});
  const [joinCode, setJoinCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const demo = DEMO_ONLY || mode === 'demo';
  useEffect(() => {
    if (!open || demo) return;
    let live = true; setRooms(null);
    fetch(`${HTTP_BASE}/api/world`).then((r) => r.json()).then((d) => { if (live) { setRooms((d.rooms as OpenRoom[]).filter((r) => r.owner !== identity().pid)); setLibrary(Number(d.library) || 0); setHalls(d.halls && typeof d.halls === 'object' ? d.halls : {}); setSocial(d.social && typeof d.social === 'object' ? d.social : {}); } }).catch(() => live && setRooms([]));
    return () => { live = false; };
  }, [open, demo]);
  if (!open) return null;
  const link = room ? `${location.origin}${location.pathname}${location.search}#oda-${inviteCode(identity().pid, room.token)}` : '';
  // the trip screen covers everything: close the panel first
  const go = (c: string) => { close(); void visitHome(c); };
  const atHome = !!place?.mine, inLibrary = place?.kind === 'library' && (place.hall ?? 'library') === 'library', inPist = place?.kind === 'library' && place.hall === 'pist25';
  const copy = (text: string, msg: string) => navigator.clipboard?.writeText(text).then(() => flash(msg, 2500)).catch(() => flash('Kopyalanamadı, elle seç.', 2500));
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Dünya" onClick={(e) => e.target === e.currentTarget && close()} onKeyDown={(e) => e.key === 'Escape' && close()}>
      <div className="sheet world">
        <header><h2>Dünya</h2><button className="x" aria-label="Kapat" onClick={close}>×</button></header>

        <div className="places">
          <button className="place home" disabled={atHome} onClick={() => { close(); leaveRoom(); }}>
            <Art id="home" /><b>Odam</b><small>{atHome ? 'Buradasın' : 'Geri dön'}</small>
          </button>
          <button className="place library" disabled={inLibrary} onClick={() => { close(); void joinLibrary(); }}>
            <Art id="library" /><b>Kütüphane</b><small>{inLibrary ? 'Buradasın' : demo ? '10 kişilik' : library ? `${library} kişi çalışıyor` : 'Boş, ilk sen gel'}</small>
          </button>
          <button className="place pist25" disabled={inPist} onClick={() => { close(); void joinHall('pist25'); }}>
            <Art id="pist25" /><b>Pist 25</b><small>{inPist ? 'Buradasın' : demo ? 'Havacılar için' : halls.pist25 ? `${halls.pist25} kişi uçuşta` : 'Kokpit seni bekliyor'}</small>
          </button>
          {[['cafe', 'meydan', 'Meydan Kafe'], ['terrace', 'teras', 'Çatı Terası'], ['arcade', 'oyun', 'Oyun Salonu']].map(([art, id, n]) => {
            const here = place?.owner === 'social:' + id, count = social[id] ?? 0;
            return <button key={id} className={`place ${art}`} disabled={here} onClick={() => { close(); void joinSocial(id); }}><Art id={art} /><b>{n}</b><small>{here ? 'Buradasın' : demo ? 'Sohbet et' : count ? `${count} kişi` : 'Sohbet et'}</small></button>;
          })}
        </div>

        <Friends go={go} />

        {!demo && rooms && rooms.length > 0 && (
          <section className="w-sec">
            <h3>Açık odalar</h3>
            <div className="open-rooms">{rooms.map((r) => (
              <button key={r.owner} className="open-room" onClick={() => go(r.owner)}>
                <b>{r.name}</b><small>{r.ownerName}</small><span>{r.n}/{r.cap}</span>
              </button>))}</div>
          </section>
        )}

        <div className="w-tools">
          <button className="chip" disabled={demo || !link} onClick={() => copy(link, 'Davet linki kopyalandı. Arkadaşına gönder!')} title={room ? `${homeCapacity(room)} sandalye` : ''}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>Arkadaşını çağır
          </button>
          <button className="chip" onClick={() => setShowCode(!showCode)} aria-expanded={showCode}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>Davet koduyla git
          </button>
        </div>
        {showCode && (
          <form className="row join-code" onSubmit={(e) => { e.preventDefault(); if (joinCode.trim()) go(joinCode); }}>
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Davet kodu ya da linki" aria-label="Davet kodu" autoComplete="off" autoFocus />
            <button disabled={!joinCode.trim() || demo}>Git</button>
          </form>
        )}
        {demo && <p className="w-note">Deneme modu: davet ve arkadaş konumu sunucuyla çalışır.</p>}
      </div>
    </div>
  );
}

/** v1 friendsHTML, as faces: who is online and where; tap to go to them */
function Friends({ go }: { go(code: string): void }) {
  const { code, friends, loaded, blocked } = useFriends();
  const place = useStore((s) => s.place), flash = useStore((s) => s.flash);
  const libraryId = currentRoomId();
  const [adding, setAdding] = useState(false);
  const [add, setAdd] = useState('');
  useEffect(() => { void friendsCall('list'); }, []);
  const submit = async () => {
    const pid = parseFriendCode(add);
    if (!pid) return flash('Bu bir arkadaş kodu değil (16 harf ve rakam).', 3500);
    const err = await friendsCall('add', pid);
    flash(err || 'Arkadaş eklendi.', 3000);
    if (!err) { setAdd(''); setAdding(false); }
  };
  const where = (f: FriendView) => {
    const w = f.where;
    if (!w) return ago(f.seen);
    const st = w.phase === 'focus' ? ' · odakta' : w.phase === 'paused' ? ' · bekliyor' : w.phase === 'short_break' || w.phase === 'long_break' ? ' · molada' : '';
    if (w.kind === 'social') return (place?.owner === 'social:' + w.space && w.roomId === libraryId ? 'Yanında' : SOCIAL_AT[w.space ?? ''] ?? 'Sosyal alanda') + st;
    if (w.kind === 'library') return (place?.kind === 'library' && w.roomId === libraryId ? 'Yanında' : hallOf(w.hall).at) + st;
    if (place && w.owner === place.owner) return 'Yanında' + st;
    return (w.owner === f.pid ? 'Kendi odasında' : `${w.ownerName} odasında`) + st;
  };
  const canGo = (f: FriendView) => !!f.where && f.where.open && f.where.n < f.where.cap && (f.where.kind === 'library' || f.where.kind === 'social' ? f.where.roomId !== libraryId : f.where.owner !== place?.owner);
  const visit = (f: FriendView) => { if (!canGo(f)) return; const w = f.where!; if (w.kind === 'library' || w.kind === 'social') { useWorld.setState({ open: false }); void (w.kind === 'library' ? joinHall(hallOf(w.hall).id, w.roomId) : joinSocial(w.space ?? '', w.roomId)); } else go(w.owner); };
  const online = friends.filter((f) => f.online).length;
  return (
    <section className="w-sec">
      <h3>Arkadaşlar {online > 0 && <small>{online} çevrimiçi</small>}</h3>
      <div className="faces">
        {friends.map((f) => (
          <button key={f.pid} className={`face ${f.online ? 'on' : ''} ${canGo(f) ? 'go' : ''}`} onClick={() => visit(f)} title={canGo(f) ? `${f.n} yanına git` : f.n}>
            <span className="ini">{f.n.slice(0, 1).toLocaleUpperCase('tr')}</span>
            <b>{f.n}</b><small>{f.online ? where(f) : ago(f.seen)}</small>
            {canGo(f) && <em>Git</em>}
          </button>
        ))}
        <button className="face add" onClick={() => setAdding(!adding)} aria-expanded={adding}><span className="ini">+</span><b>Ekle</b><small>kod ile</small></button>
      </div>
      {loaded && friends.length === 0 && !adding && <p className="w-note">Odada birine dokun → “Arkadaş ekle”. Ya da kodunu paylaş.</p>}
      {adding && (
        <div className="add-friend">
          <form className="row" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            <input value={add} onChange={(e) => setAdd(e.target.value)} placeholder="Arkadaşının kodu" aria-label="Arkadaş kodu" autoComplete="off" autoFocus />
            <button disabled={!add.trim()}>Ekle</button>
          </form>
          <button type="button" className="mycode" onClick={() => code && navigator.clipboard?.writeText(code).then(() => flash('Kodun kopyalandı.', 2000)).catch(() => {})}>Senin kodun: <b>{code || '…'}</b> <span>Kopyala</span></button>
          {blocked.length > 0 && <div className="blocked"><small>Engellediklerin</small>{blocked.map((b) => <button key={b.pid} type="button" onClick={() => void friendsCall('unblock', b.pid)}>{b.n} · engeli kaldır</button>)}</div>}
        </div>
      )}
    </section>
  );
}
