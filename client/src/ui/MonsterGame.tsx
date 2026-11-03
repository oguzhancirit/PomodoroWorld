// "Pomo Canavarları" screen (user, 2026-11-03): the console in the Oyun Salonu opens a small handheld-style battle
// game. One player for now: pick a starter, fight wild creatures, level up, keep a win streak. Rules: @pw/shared monsters.
import { useEffect, useRef, useState } from 'react';
import { MONSTERS, MOVES, TYPE_NAME, makeMon, turn, enemyFor, gainXp, xpForWin, xpToNext, newSave, sanitizeSave, monDef, type Mon, type MonSave, type MoveId, type MonType } from '@pw/shared';
import { sfx } from '../sound';

const KEY = 'pw2.monsters';
const load = (): MonSave | null => { try { return sanitizeSave(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { return null; } };
const store = (s: MonSave) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } };
const rnd = Math.random;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Phase = 'pick' | 'intro' | 'menu' | 'busy' | 'won' | 'lost';

export function MonsterGame({ onClose }: { onClose: () => void }) {
  const [save, setSave] = useState<MonSave | null>(load);
  const [phase, setPhase] = useState<Phase>(() => (load() ? 'intro' : 'pick'));
  const [me, setMe] = useState<Mon | null>(null);
  const [foe, setFoe] = useState<Mon | null>(null);
  const [hp, setHp] = useState({ me: 0, foe: 0 });
  const [line, setLine] = useState('');
  const [shake, setShake] = useState<'' | 'me' | 'foe'>('');
  const [result, setResult] = useState<{ xp: number; leveled: boolean } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const start = (s: MonSave) => {
    const m = makeMon(s.starter, s.lv), f = enemyFor(s.streak, rnd, s.lv);
    setMe(m); setFoe(f); setHp({ me: m.hp, foe: f.hp }); setResult(null);
    setLine(`Vahşi ${f.name} çıktı! (Sv ${f.lv})`); setPhase('intro');
    setTimeout(() => { setLine(`${m.name}, ne yapsın?`); setPhase('menu'); }, 1400);
  };
  useEffect(() => { if (save && phase === 'intro' && !me) start(save); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { closeRef.current?.focus(); }, []);

  const pick = (id: string) => { const s = newSave(id); store(s); setSave(s); sfx('done'); start(s); };

  const play = async (mv: MoveId) => {
    if (!me || !foe || !save || phase !== 'menu') return;
    setPhase('busy');
    const r = turn(me, foe, mv, rnd);
    for (const st of r.steps) {
      for (const [i, l] of st.lines.entries()) {
        setLine(l);
        if (i === 0 && st.hit) { await wait(380); setShake(st.hit); setHp({ me: st.meHp, foe: st.foeHp }); sfx('pop'); setTimeout(() => setShake(''), 420); }
        else if (i === 0) setHp({ me: st.meHp, foe: st.foeHp });
        await wait(900);
      }
    }
    setMe(r.me); setFoe(r.foe);
    if (r.winner === 'me') {
      const gained = xpForWin(r.foe.lv);
      const up = gainXp({ ...save, wins: save.wins + 1, streak: save.streak + 1, best: Math.max(save.best, save.streak + 1) }, gained);
      const { leveled, ...next } = up; store(next); setSave(next);
      setResult({ xp: gained, leveled }); setLine(leveled ? `${r.me.name} seviye ${next.lv} oldu!` : `${gained} XP kazandın!`);
      sfx('done'); setPhase('won');
    } else if (r.winner === 'foe') {
      const next = { ...save, streak: 0 }; store(next); setSave(next);
      setLine(`${r.me.name} yoruldu… Seri sıfırlandı.`); setPhase('lost');
    } else { setLine(`${r.me.name}, ne yapsın?`); setPhase('menu'); }
  };

  const reset = () => { if (confirm('Yaratığını değiştirmek istiyor musun? Seviyen sıfırlanır.')) { try { localStorage.removeItem(KEY); } catch { /* ignore */ } setSave(null); setMe(null); setFoe(null); setPhase('pick'); } };

  return (
    <div className="modal mg-modal" role="dialog" aria-modal="true" aria-label="Pomo Canavarları" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="mg-console">
        <div className="mg-top"><span className="mg-led" /><b>POMO CANAVARLARI</b><button ref={closeRef} className="mg-x" onClick={onClose} aria-label="Oyunu kapat">×</button></div>
        <div className="mg-screen">
          {phase === 'pick' ? (
            <div className="mg-pick">
              <p className="mg-h">Yol arkadaşını seç!</p>
              <div className="mg-starters">
                {MONSTERS.filter((m) => m.starter).map((m) => (
                  <button key={m.id} className={`mg-starter t-${m.type}`} onClick={() => pick(m.id)}>
                    <Sprite id={m.id} /><b>{m.name}</b><small>{TYPE_NAME[m.type]}</small>
                  </button>
                ))}
              </div>
              <p className="mg-tip">Ateş yaprağı, yaprak suyu, su ateşi yener.</p>
            </div>
          ) : me && foe && (
            <div className="mg-field">
              <div className="mg-foe">
                <Bar mon={foe} hp={hp.foe} />
                <div className={`mg-spr foe ${shake === 'foe' ? 'hit' : ''} ${phase === 'won' ? 'faint' : ''}`}><Sprite id={foe.id} /></div>
              </div>
              <div className="mg-me">
                <div className={`mg-spr me ${shake === 'me' ? 'hit' : ''} ${phase === 'lost' ? 'faint' : ''}`}><Sprite id={me.id} back /></div>
                <Bar mon={me} hp={hp.me} xp={save ? save.xp / xpToNext(save.lv) : 0} />
              </div>
            </div>
          )}
          {phase !== 'pick' && <div className="mg-text" aria-live="polite">{line}</div>}
        </div>
        <div className="mg-pad">
          {phase === 'menu' && me && (
            <div className="mg-moves">
              {me.moves.map((m) => {
                const mv = MOVES[m], left = me.pp[m] ?? 0;
                return <button key={m} className={`mg-move t-${mv.type}`} disabled={left <= 0} onClick={() => play(m)}><b>{mv.name}</b><small>{mv.kind === 'hit' ? TYPE_NAME[mv.type] : mv.kind === 'heal' ? 'Can' : 'Güç'} · {left}/{mv.pp}</small></button>;
              })}
            </div>
          )}
          {(phase === 'won' || phase === 'lost') && save && (
            <div className="mg-after">
              <p>{phase === 'won' ? <>Seri: <b>{save.streak}</b> · En iyi: <b>{save.best}</b>{result?.leveled ? ' · Seviye atladın!' : ''}</> : <>En iyi serin: <b>{save.best}</b> · Toplam galibiyet: <b>{save.wins}</b></>}</p>
              <div className="row"><button className="mg-go" autoFocus onClick={() => start(save)}>{phase === 'won' ? 'Sonraki rakip' : 'Tekrar dene'}</button><button className="mg-ghost" onClick={onClose}>Odaya dön</button></div>
            </div>
          )}
          {(phase === 'intro' || phase === 'busy') && <div className="mg-wait">…</div>}
          {phase === 'pick' && <p className="mg-foot">Mola oyunu: tek kişilik. Yakında arkadaşınla da oynayabileceksin.</p>}
          {save && phase !== 'pick' && <button className="mg-link" onClick={reset}>Yaratığı değiştir</button>}
        </div>
      </div>
    </div>
  );
}

function Bar({ mon, hp, xp }: { mon: Mon; hp: number; xp?: number }) {
  const k = Math.max(0, hp / mon.max);
  return (
    <div className="mg-bar">
      <div className="mg-name"><b>{mon.name}</b><span>Sv {mon.lv}</span></div>
      <div className="mg-hp"><small>CAN</small><span><i className={k < 0.25 ? 'low' : k < 0.5 ? 'mid' : ''} style={{ width: `${k * 100}%` }} /></span></div>
      <div className="mg-num">{hp}/{mon.max}{mon.boost ? <em> · güç +{mon.boost}</em> : null}</div>
      {xp !== undefined && <div className="mg-xp"><i style={{ width: `${Math.min(1, xp) * 100}%` }} /></div>}
    </div>
  );
}

/* our own little creatures, drawn in SVG: a round body in the creature's colour plus a feature for its type */
const FEATURE: Record<MonType, (c: string) => JSX.Element> = {
  ates: (c) => <path d="M50 6c6 10 16 14 12 26-2-6-6-8-8-8 2 6-2 12-6 14 0-8-6-10-10-6 0-12 10-14 12-26z" fill={c} stroke="#00000030" strokeWidth="1.5" />,
  su: () => <path d="M50 4c8 12 14 18 14 26a14 14 0 0 1-28 0c0-8 6-14 14-26z" fill="#A9DDFB" stroke="#00000025" strokeWidth="1.5" />,
  yaprak: () => <g><path d="M50 30c-2-12 4-22 18-24-2 14-8 22-18 24z" fill="#3E9F4E" /><path d="M50 30c0-10-6-18-18-20 2 12 8 18 18 20z" fill="#6CCB78" /></g>,
  normal: () => <g fill="#8C8273"><path d="M30 34l6-14 8 12z" /><path d="M46 30l6-16 7 15z" /><path d="M62 33l8-12 3 15z" /></g>,
};
function Sprite({ id, back = false }: { id: string; back?: boolean }) {
  const d = monDef(id)!;
  return (
    <svg viewBox="0 0 100 100" className="mg-svg" style={back ? { transform: 'scaleX(-1)' } : undefined} aria-label={d.name}>
      <ellipse cx="50" cy="92" rx="30" ry="5" fill="#00000030" />
      {FEATURE[d.type](d.color)}
      <path d="M50 26c22 0 34 16 34 36 0 18-14 28-34 28S16 80 16 62c0-20 12-36 34-36z" fill={d.color} stroke="#00000035" strokeWidth="2" />
      <ellipse cx="50" cy="70" rx="18" ry="13" fill="#ffffff40" />
      {!back && <>
        <ellipse cx="40" cy="54" rx="5" ry="6.5" fill="#1d1a2b" /><ellipse cx="60" cy="54" rx="5" ry="6.5" fill="#1d1a2b" />
        <circle cx="41.6" cy="51.6" r="1.8" fill="#fff" /><circle cx="61.6" cy="51.6" r="1.8" fill="#fff" />
        <path d="M45 64q5 5 10 0" stroke="#1d1a2b" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <ellipse cx="31" cy="63" rx="5" ry="3" fill="#ff7aa855" /><ellipse cx="69" cy="63" rx="5" ry="3" fill="#ff7aa855" />
      </>}
      <ellipse cx="34" cy="88" rx="8" ry="4" fill={d.color} stroke="#00000030" /><ellipse cx="66" cy="88" rx="8" ry="4" fill={d.color} stroke="#00000030" />
    </svg>
  );
}
