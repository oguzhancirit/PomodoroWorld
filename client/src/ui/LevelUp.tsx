// Level-up window with confetti (v1 js/ui.js ui.levelUp + index.html #m-level): big level number, new title,
// what just opened in the shop, a cheer emote and the "done" sound.
import { useEffect, useMemo, useState } from 'react';
import { titleFor, unlocksAt } from '@pw/shared';
import { useStore } from '../store';
import { sendEmote } from '../net';
import { sfx } from '../sound';
import { thumb } from '../home/engine';

const SLOT: Record<string, string> = { head: 'saç', body: 'üst', legs: 'alt', feet: 'ayakkabı' };
const COLORS = ['#E8553D', '#F2C14E', '#6CBF6A', '#8FB8FF', '#E58BB0'];

export function LevelUp() {
  const r = useStore((s) => s.reward);
  const [lv, setLv] = useState(0);
  useEffect(() => {
    if (!r?.levelUp) return;
    setLv(r.levelUp); sfx('done');
    try { sendEmote('cheer'); } catch { /* not in a room */ }
  }, [r?.at]); // eslint-disable-line react-hooks/exhaustive-deps
  const bits = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 0.6, col: COLORS[i % COLORS.length], rot: Math.random() * 360 })), [lv]);
  if (!lv) return null;
  const close = () => setLv(0);
  const items = unlocksAt(lv);
  return (
    <div className="modal lvl-modal" role="dialog" aria-modal="true" aria-label={`Seviye ${lv}`} onClick={(e) => e.target === e.currentTarget && close()} onKeyDown={(e) => e.key === 'Escape' && close()}>
      <div className="confetti" aria-hidden="true">{bits.map((b, i) => <i key={i} style={{ left: b.left + '%', background: b.col, animationDelay: b.delay + 's', rotate: b.rot + 'deg' }} />)}</div>
      <div className="sheet lvl-sheet">
        <p className="lvl-kicker">Seviye atladın!</p>
        <div className="lvl-num">{lv}</div>
        <h2>{titleFor(lv)}</h2>
        <ul className="lvl-unlocks">
          {items.length ? items.map((it) => (
            <li key={it.id}>{it.cat !== 'avatar' ? <img alt="" src={thumb(it.id)} /> : <span className="lvl-ico">👕</span>}<span>{it.cat === 'avatar' ? `${it.name} ${SLOT[it.slot!] ?? ''}` : it.name}</span></li>
          )) : <li className="none">Mağazada yeni fiyatlar seni bekliyor.</li>}
        </ul>
        <button className="t-go lvl-ok" autoFocus onClick={close}>Harika!</button>
      </div>
    </div>
  );
}
