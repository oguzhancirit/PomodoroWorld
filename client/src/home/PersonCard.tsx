// v1 person card (ui.openPerson): click someone in the room → who they are and what you can do with them.
import { create } from 'zustand';
import { titleFor } from '@pw/shared';
import { useStore } from '../store';
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
