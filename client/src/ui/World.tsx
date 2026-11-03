// "Dünya": the way out of your room, like the old game's world screen (js/ui.js renderWorld):
// your invite link, a friend's code, open rooms, then the bigger places (library, social spaces).
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { inviteCode, homeCapacity, parseFriendCode } from '@pw/shared';
import { useStore } from '../store';
import { identity } from '../identity';
import { HTTP_BASE, DEMO_ONLY } from '../config';
import { visitHome, joinStudyRoom } from '../net';
import { useFriends, friendsCall, ago, type FriendView } from '../friends';

const useWorld = create<{ open: boolean }>(() => ({ open: false }));
const close = () => useWorld.setState({ open: false });

export function WorldButton() {
  return <button className="ghost world-btn" onClick={() => useWorld.setState({ open: true })}>Dünya</button>;
}

interface OpenRoom { owner: string; ownerName: string; name: string; cat: string; n: number; cap: number }
const SOCIAL = [
  ['Meydan Kafe', 'Moladayken uğra, sohbet et, tanış.'],
  ['Çatı Terası', 'Gün batımında sohbet köşesi.'],
  ['Oyun Salonu', 'Neonlar, pikap ve dans pisti.'],
];

export function WorldPanel() {
  const open = useWorld((s) => s.open);
  const room = useStore((s) => s.room), mode = useStore((s) => s.mode);
  const [code, setCode] = useState('');
  const [rooms, setRooms] = useState<OpenRoom[] | null>(null);
  const [copied, setCopied] = useState(false);
  const demo = DEMO_ONLY || mode === 'demo';
  useEffect(() => {
    if (!open || demo) return;
    let live = true; setRooms(null);
    fetch(`${HTTP_BASE}/api/world`).then((r) => r.json()).then((d) => { if (live) setRooms((d.rooms as OpenRoom[]).filter((r) => r.owner !== identity().pid)); }).catch(() => live && setRooms([]));
    return () => { live = false; };
  }, [open, demo]);
  if (!open) return null;
  const link = room ? `${location.origin}${location.pathname}${location.search}#oda-${inviteCode(identity().pid, room.token)}` : '';
  const go = async (c: string) => { if (await visitHome(c)) close(); };
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Dünya" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="sheet world">
        <header><div><h2>Dünya</h2><p>Odandan çık: arkadaşlarınla çalış, yeni yerler gez.</p></div><button className="x" aria-label="Kapat" onClick={close}>×</button></header>
        <Friends go={go} />
        <section>
          <h3>Arkadaşını odana çağır <small>{room ? `${homeCapacity(room)} sandalye · ${room.open ? 'açık oda' : 'yalnız davetle'}` : ''}</small></h3>
          {demo ? <p className="muted">Deneme modunda davet çalışmaz; sunucuya bağlıyken arkadaşın bu linkle odana gelir.</p> : (
            <div className="row">
              <input readOnly value={link} aria-label="Davet linkin" onFocus={(e) => e.target.select()} />
              <button onClick={() => { navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }).catch(() => {}); }}>{copied ? 'Kopyalandı' : 'Kopyala'}</button>
            </div>
          )}
          <p className="muted">Odana kaç kişi sığacağını sandalyeler belirler (en fazla 5). Mağazadan sandalye ya da kanepe alıp odana koy.</p>
        </section>
        <section>
          <h3>Davet kodun mu var?</h3>
          <form className="row" onSubmit={(e) => { e.preventDefault(); if (code.trim()) go(code); }}>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ör. ab12cd34ef56-x7k2p9 ya da davet linki" aria-label="Davet kodu" autoComplete="off" />
            <button disabled={!code.trim() || demo}>Git</button>
          </form>
        </section>
        <section>
          <h3>Açık odalar <small>{rooms && rooms.length ? `${rooms.length} oda` : ''}</small></h3>
          {demo ? <p className="muted">Sunucuya bağlıyken burada açık odalar görünür.</p>
            : rooms === null ? <p className="muted">Yükleniyor…</p>
            : rooms.length === 0 ? <p className="muted">Şu an boş sandalyesi olan açık oda yok.</p>
            : <div className="world-list">{rooms.map((r) => (
              <button key={r.owner} className="world-card" onClick={() => go(r.owner)}>
                <b>{r.name}</b><small>{r.ownerName} · {r.cat}</small><span>{r.n}/{r.cap}</span>
              </button>))}</div>}
        </section>
        <section>
          <h3>Çalışma alanları</h3>
          <div className="world-list">
            <button className="world-card" onClick={() => { close(); joinStudyRoom(); }}><b>Ortak çalışma salonu</b><small>Herkes aynı sayaçla çalışır. Yakında 10 kişilik kütüphane olacak.</small></button>
          </div>
        </section>
        <section>
          <h3>Sosyal alanlar <small>Molada gez, sohbet et, yeni insanlarla tanış.</small></h3>
          <div className="world-list">{SOCIAL.map(([n, d]) => <button key={n} className="world-card soon" disabled><b>{n}</b><small>{d}</small><span>yakında</span></button>)}</div>
        </section>
      </div>
    </div>
  );
}

/** v1 friendsHTML: your code, add by code, who is online and where, go to them */
function Friends({ go }: { go(code: string): void }) {
  const { code, friends, blocked, loaded, offline } = useFriends();
  const place = useStore((s) => s.place), flash = useStore((s) => s.flash);
  const [add, setAdd] = useState('');
  const [copied, setCopied] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  useEffect(() => { void friendsCall('list'); }, []);
  const submit = async () => {
    const pid = parseFriendCode(add);
    if (!pid) return flash('Bu bir arkadaş kodu değil. Kod 16 harf ve rakamdan oluşur.', 4000);
    const err = await friendsCall('add', pid);
    flash(err || 'Arkadaş eklendi. Çevrimiçi olunca nerede olduğunu burada görürsün.', 4000);
    if (!err) setAdd('');
  };
  const where = (f: FriendView) => {
    const w = f.where;
    if (!w) return `Son görülme ${ago(f.seen)}`;
    const focus = w.phase === 'focus' ? ' · odakta' : '';
    if (place && w.owner === place.owner) return 'Seninle aynı odada' + focus;
    return (w.owner === f.pid ? `Kendi odasında · ${w.name}` : `${w.ownerName} odasında`) + focus;
  };
  const canGo = (f: FriendView) => !!f.where && f.where.open && f.where.n < f.where.cap && f.where.owner !== place?.owner;
  return (
    <section>
      <h3>Arkadaşların <small>{friends.filter((f) => f.online).length ? `${friends.filter((f) => f.online).length} çevrimiçi` : ''}</small></h3>
      <div className="row"><span className="muted" style={{ margin: 0 }}>Senin kodun:</span><b className="mycode">{code || '…'}</b>
        <button className="ghost" style={{ marginLeft: 'auto' }} disabled={!code} onClick={() => navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }).catch(() => {})}>{copied ? 'Kopyalandı' : 'Kopyala'}</button></div>
      <form className="row" style={{ marginTop: 8 }} onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <input value={add} onChange={(e) => setAdd(e.target.value)} placeholder="Arkadaşının kodu" aria-label="Arkadaş kodu" autoComplete="off" />
        <button disabled={!add.trim()}>Ekle</button>
      </form>
      {offline && <p className="muted">Sunucuya bağlı değilsin: arkadaşların sadece bu tarayıcıda kayıtlı, nerede oldukları görünmez.</p>}
      {loaded && friends.length === 0 && <p className="muted">Kodunu paylaş ya da odada birinin üstüne tıklayıp “Arkadaş ekle” de.</p>}
      {friends.length > 0 && <div className="friend-list" style={{ marginTop: 8 }}>{friends.map((f) => (
        <div key={f.pid} className="friend-row">
          <span className={`ini ${f.online ? 'on' : ''}`} aria-hidden="true">{f.n.slice(0, 1).toLocaleUpperCase('tr')}</span>
          <span className="who"><b>{f.n} <span className="tagid">#{f.code.slice(0, 4)}</span></b><small>{f.online ? where(f) : `Son görülme ${ago(f.seen)}`}</small></span>
          {canGo(f) && <button onClick={() => go(f.where!.owner)}>{f.where!.owner === f.pid ? 'Odasına git' : 'Yanına git'}</button>}
          <button className="ghost" aria-label={`${f.n} arkadaşlıktan çıkar`} title="Arkadaşlıktan çıkar" onClick={() => void friendsCall('remove', f.pid)}>Kaldır</button>
        </div>))}</div>}
      {blocked.length > 0 && <p className="muted"><button className="ghost" onClick={() => setShowBlocked(!showBlocked)}>Engellediklerin ({blocked.length})</button></p>}
      {showBlocked && <div className="friend-list">{blocked.map((b) => (
        <div key={b.pid} className="friend-row"><span className="who"><b>{b.n} <span className="tagid">#{b.pid.slice(0, 4).toUpperCase()}</span></b></span>
          <button className="ghost" onClick={() => void friendsCall('unblock', b.pid)}>Engeli kaldır</button></div>))}</div>}
    </section>
  );
}
