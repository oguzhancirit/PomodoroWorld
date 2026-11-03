// v1 person card (ui.openPerson): click someone in the room → who they are and what you can do with them.
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { titleFor } from '@pw/shared';
import { useStore, serverNow } from '../store';
import { sendEmote, sendKick, sendFollow } from '../net';
import { isRunning } from './FocusScreen';
import { useFriends, friendsCall } from '../friends';

export const usePerson = create<{ id: string }>(() => ({ id: '' }));
export const openPerson = (id: string) => usePerson.setState({ id });
const close = () => usePerson.setState({ id: '' });
const tag = (code: string) => '#' + code.slice(0, 4).toUpperCase();

export function PersonCard({ canKick }: { canKick: boolean }) {
  const id = usePerson((s) => s.id);
  const p = useStore((s) => (id ? s.players[id] : undefined));
  const myPhase = useStore((s) => s.timer.phase);
  const phase = p?.phase ?? 'idle';
  const friends = useFriends((s) => s.friends);
  if (!id || !p) return null;
  const code = p.code ?? '';
  const friend = friends.some((f) => f.pid === code);
  const lv = p.level ?? 1;
  const status = !p.connected ? 'Bağlantısı koptu' : phase === 'focus' ? 'Odakta' : phase === 'idle' ? 'Boşta' : 'Molada';
  const flash = useStore.getState().flash;
  const act = async (fn: () => Promise<string> | void, ok: string) => { const err = await fn(); close(); flash(err || ok, 3500); };
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={p.name} onClick={(e) => e.target === e.currentTarget && close()}
      onKeyDown={(e) => e.key === 'Escape' && close()}>
      <div className="sheet person">
        <header><div><h2>{p.name}{code && <small className="tagid"> {tag(code)}</small>}</h2><p>Seviye {lv} · {titleFor(lv)}</p></div><button className="x" aria-label="Kapat" onClick={close} autoFocus>×</button></header>
        <p className="ps-status"><i className={phase === 'focus' ? 'focus' : phase === 'idle' ? '' : 'break'} />{status}{friend && <span className="fr">Arkadaşın</span>}</p>
        <div className="ps-acts">
          {isRunning(p) && myPhase === 'idle' && <button className="primary" onClick={() => act(() => sendFollow(id), `${p.name} ile aynı sayaçtasınız.`)}>⏱ Sayacına katıl</button>}
          <button onClick={() => act(() => sendEmote('wave'), `${p.name} için el salladın.`)}>👋 El salla</button>
          {code && <button onClick={() => act(() => friendsCall(friend ? 'remove' : 'add', code, p.name), friend ? 'Arkadaşlıktan çıkardın.' : `${p.name} artık arkadaşın. Dünya'da nerede olduğunu görürsün.`)}>{friend ? 'Arkadaşlıktan çıkar' : '＋ Arkadaş ekle'}</button>}
          {canKick && <button className="warn" onClick={() => act(() => sendKick(id), `${p.name} odandan çıkarıldı. Bir daha giremez.`)}>Odamdan çıkar</button>}
          {code && <button className="warn" onClick={() => act(() => friendsCall('block', code, p.name), `${p.name} engellendi. Mesajlarını ve kendisini görmezsin.`)}>Engelle</button>}
        </div>
      </div>
    </div>
  );
}

/** v1 "Kişiler": who is in this room, their own timer, and a tap opens their card (add friend, remove, block…) */
export const usePeople = create<{ open: boolean }>(() => ({ open: false }));
export function PeopleSheet() {
  const open = usePeople((s) => s.open);
  const players = useStore((s) => s.players), me = useStore((s) => s.me);
  const friends = useFriends((s) => s.friends);
  const [, tick] = useState(0);
  useEffect(() => { if (!open) return; const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, [open]);
  if (!open) return null;
  const close = () => usePeople.setState({ open: false });
  const list = Object.values(players).sort((a, b) => Number(b.id === me) - Number(a.id === me) || a.name.localeCompare(b.name, 'tr'));
  const status = (p: (typeof list)[number]) => {
    if (!p.phase || p.phase === 'idle') return 'Boşta';
    if (p.pausedLeft) return 'Duraklattı';
    const left = Math.max(0, Math.ceil(((p.phaseEndsAt ?? 0) - serverNow()) / 60_000));
    return `${p.phase === 'focus' ? 'Odakta' : 'Molada'} · ${left} dk kaldı`;
  };
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Kişiler" onClick={(e) => e.target === e.currentTarget && close()} onKeyDown={(e) => e.key === 'Escape' && close()}>
      <div className="sheet people">
        <header><div><h2>Kişiler</h2><p>Birine dokun: arkadaş ekle, sayacına katıl, odandan çıkar.</p></div><button className="x" aria-label="Kapat" onClick={close} autoFocus>×</button></header>
        <div className="people-list">{list.map((p) => {
          const self = p.id === me, friend = !!p.code && friends.some((f) => f.pid === p.code);
          return (
            <button key={p.id} className="person-row" disabled={self} onClick={() => { close(); openPerson(p.id); }}>
              <span className={`dot ${p.phase === 'focus' && !p.pausedLeft ? 'focus' : p.phase && p.phase !== 'idle' ? 'break' : ''}`} aria-hidden="true" />
              <span className="ini" aria-hidden="true">{p.name.slice(0, 1).toLocaleUpperCase('tr')}</span>
              <span className="who"><b>{p.name}{self && <em> (sen)</em>}</b><small>Seviye {p.level ?? 1} · {status(p)}</small></span>
              {friend && <span className="fr">Arkadaşın</span>}
              {!self && <span className="chev" aria-hidden="true">›</span>}
            </button>
          );
        })}</div>
      </div>
    </div>
  );
}
