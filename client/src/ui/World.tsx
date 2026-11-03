// "Dünya": the way out of your room, like the old game's world screen (js/ui.js renderWorld):
// your invite link, a friend's code, open rooms, then the bigger places (library, social spaces).
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { inviteCode, homeCapacity } from '@pw/shared';
import { useStore } from '../store';
import { identity } from '../identity';
import { HTTP_BASE, DEMO_ONLY } from '../config';
import { visitHome, joinStudyRoom } from '../net';

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
