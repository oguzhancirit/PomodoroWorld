// The original game's side tools, now in v2: Görevler (quests, login reward, promise), Yapılacaklar (to-dos),
// Ortam sesleri (ambient sounds) and İstatistik (focus calendar, categories, hours of the day).
import { useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import { QUESTS, LOGIN_REWARDS, PLEDGE_MIN, PLEDGE_DAYS, CATEGORIES, questView, questsReady, shiftDay, ACHIEVEMENTS, levelFromXP, leagueFor, nextLeague, weekBoard, type QuestDef, type QuestProgress } from '@pw/shared';
import { useStore } from '../store';
import { questAction, myClock } from '../economy';
import { useTodos, type Todo } from '../todos';
import { useFriends, friendsCall } from '../friends';
import { LAYERS, applySound, soundOk, suggest, sfx } from '../sound';

export type Panel = '' | 'quests' | 'todo' | 'sound' | 'stats';
export const usePanel = create<{ open: Panel; set(p: Panel): void }>((set) => ({ open: '', set: (open) => set({ open }) }));
const close = () => usePanel.getState().set('');

export const CAT_COLOR: Record<string, string> = { Ders: '#E8553D', Proje: '#8FB8FF', Okuma: '#F2C14E', Kodlama: '#6CBF6A', Dil: '#E58BB0', Yazı: '#B48AFF', Diğer: '#C9C2DA' };
const catName = (id: string) => CATEGORIES.find((c) => c[0] === id)?.[1] ?? id;
const fmtMin = (m: number) => (m < 60 ? `${m} dk` : `${Math.floor(m / 60)} sa${m % 60 ? ` ${m % 60} dk` : ''}`);
const ICON = {
  quests: <path d="M8 4h8v3a4 4 0 0 1-8 0zM6 5H4a3 3 0 0 0 4 4M18 5h2a3 3 0 0 1-4 4M12 11v4M9 20h6M10 15h4v5h-4z" />,
  todo: <path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />,
  sound: <path d="M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />,
  stats: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
};

/* ---------- the four buttons (top bars) ---------- */
export function ToolButtons() {
  const w = useStore((s) => s.wallet);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 60_000); return () => clearInterval(t); }, []);
  const ready = w ? questsReady(w, myClock()) : 0;
  const playing = useSound((s) => s.playing);
  const open = usePanel((s) => s.set);
  const btn = (id: Exclude<Panel, ''>, label: string, extra?: React.ReactNode, on?: boolean) => (
    <button className={`tool ${on ? 'on' : ''}`} title={label} aria-label={label} onClick={() => open(id)}>
      <svg viewBox="0 0 24 24" aria-hidden="true">{ICON[id]}</svg>{extra}
    </button>
  );
  return (
    <div className="tools">
      {btn('quests', ready ? `Görevler · ${ready} ödül hazır` : 'Görevler', ready ? <span className="badge">{ready}</span> : null)}
      {btn('todo', 'Yapılacaklar')}
      {btn('sound', 'Ortam sesleri', null, playing)}
      {btn('stats', 'İstatistik')}
    </div>
  );
}

/** all panels; mount once per screen */
export function Panels() {
  const open = usePanel((s) => s.open);
  useEffect(() => { if (!open) return; const on = (e: KeyboardEvent) => e.key === 'Escape' && close(); addEventListener('keydown', on); return () => removeEventListener('keydown', on); }, [open]);
  return <>
    <SoundSync />
    {open === 'quests' && <Sheet title="Görevler" sub="Her gün ve her hafta yenilenir. Biten görevin ödülünü almayı unutma."><Quests /></Sheet>}
    {open === 'todo' && <Sheet title="Yapılacaklar" sub="Bir iş seç: odaklandıkça o iş ilerler."><Todos /></Sheet>}
    {open === 'sound' && <Sheet title="Ortam sesleri" sub="Sesler cihazında üretilir; internet kullanmaz." small><Sounds /></Sheet>}
    {open === 'stats' && <Sheet title="İstatistik" sub="Ne zaman, ne kadar ve ne üzerinde çalıştın."><Stats /></Sheet>}
  </>;
}

function Sheet({ title, sub, small, children }: { title: string; sub: string; small?: boolean; children: React.ReactNode }) {
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.target === e.currentTarget && close()}>
      <div className={`sheet ${small ? 'small' : ''}`}>
        <header><div><h2>{title}</h2><p>{sub}</p></div><button className="x" aria-label="Kapat" onClick={close}>×</button></header>
        {children}
      </div>
    </div>
  );
}

/* ---------- Görevler ---------- */
function Quests() {
  const w = useStore((s) => s.wallet);
  const [msg, setMsg] = useState('');
  const [pmin, setPmin] = useState<number>(PLEDGE_MIN[2]);
  const [pdays, setPdays] = useState<number>(PLEDGE_DAYS[0][0]);
  if (!w) return <p className="note">Yükleniyor…</p>;
  const k = myClock(), Q = questView(w, k);
  const run = async (a: Parameters<typeof questAction>[0]) => { setMsg(''); const err = await questAction(a); if (err) setMsg(err); else if (a.action === 'login' || a.action === 'claim') sfx('buy'); };
  const claimed = Q.login.claimedDay === k.day, loggedIn = Q.login.last === k.day;
  const idx = (Math.max(1, Q.login.streak) - 1) % 7;
  const now = new Date(), endDay = 24 - now.getHours(), dow = (now.getDay() + 6) % 7;
  const P = Q.pledge;
  const row = (q: QuestDef, list: Record<string, QuestProgress>) => {
    const c = list[q.id] ?? { p: 0, c: false };
    return (
      <div key={q.id} className="qrow">
        <div className="n">{q.name}<small>{q.desc}</small></div>
        <div className="rw">
          {c.c ? <span className="dim">Alındı</span> : c.p >= q.goal ? <button className="sm acc" onClick={() => run({ action: 'claim', id: q.id })}>Ödülü al</button> : <span className="pg">{c.p}/{q.goal}</span>}
          <span>+{q.xp} XP</span>{q.coin ? <span className="gold">+{q.coin}</span> : null}
        </div>
        <div className="bar"><i style={{ width: `${Math.round((c.p / q.goal) * 100)}%` }} /></div>
      </div>
    );
  };
  return (
    <div className="qgrid">
      {msg && <p className="shop-msg">{msg}</p>}
      <div className="qcol">
        <section className="qbox">
          <h3>Günlük giriş ödülleri <em>{Q.login.streak} gün üst üste</em></h3>
          <div className="login7">{LOGIN_REWARDS.map((r, i) => <div key={i} className={i < idx || (i === idx && claimed) ? 'done' : i === idx ? 'today' : ''}>{i + 1}<b>+{r}</b></div>)}</div>
          {claimed ? <p className="note">Bugünün ödülünü aldın. Yarın tekrar gel, seri büyüsün.</p>
            : <button className="acc" disabled={!loggedIn} onClick={() => run({ action: 'login' })}>Bugünün ödülünü al</button>}
          <p className="note">Bir gün kaçırırsan ödüller baştan başlar.</p>
        </section>
        <section className="qbox">
          <h3>Kendine söz ver {P && !P.finished ? <em>{P.done.length}/{P.days} gün</em> : null}</h3>
          {P && !P.finished ? <>
            <p className="note">Her gün <b>{P.min} dakika</b> odaklanacağına söz verdin. Ödül: +{P.coin} jeton · +{P.xp} XP</p>
            <div className="bar"><i style={{ width: `${Math.round((P.done.length / P.days) * 100)}%` }} /></div>
            <button className="ghost sm" onClick={() => run({ action: 'unpledge' })}>Sözü bırak</button>
          </> : <>
            {P?.finished && <p className="note">Son sözünü tuttun, tebrikler! Yeni bir söz verebilirsin.</p>}
            <p className="note">Günlük hedefini ve süresini seç. Kaçırırsan ceza yok, sadece söz biter.</p>
            <div className="field">Günde ne kadar?<div className="chips">{PLEDGE_MIN.map((m) => <button key={m} className={pmin === m ? 'on' : ''} onClick={() => setPmin(m)}>{m} dk</button>)}</div></div>
            <div className="field">Kaç gün boyunca?<div className="chips">{PLEDGE_DAYS.map(([d, c, x]) => <button key={d} className={pdays === d ? 'on' : ''} onClick={() => setPdays(d)}>{d} gün · +{c} jeton · +{x} XP</button>)}</div></div>
            <button className="acc" onClick={() => run({ action: 'pledge', min: pmin, days: pdays })}>Söz ver</button>
          </>}
        </section>
      </div>
      <div className="qcol">
        <section className="qbox"><h3>Günlük görevler <em>{endDay} saat kaldı</em></h3>{QUESTS.daily.map((q) => row(q, Q.daily))}</section>
        <section className="qbox"><h3>Haftalık görevler <em>{7 - dow} gün kaldı</em></h3>{QUESTS.weekly.map((q) => row(q, Q.weekly))}</section>
      </div>
    </div>
  );
}

/* ---------- Yapılacaklar ---------- */
function Todos() {
  const { list, sel, add, toggle, remove, select } = useTodos();
  const cat0 = useStore((s) => s.profile.category);
  const [title, setTitle] = useState(''), [est, setEst] = useState(1), [cat, setCat] = useState(cat0);
  const today = myClock().day;
  const open = list.filter((t) => !t.ok);
  const doneToday = list.filter((t) => t.ok && t.okAt && localDay(t.okAt) === today);
  const item = (t: Todo) => (
    <li key={t.id} className={`todo ${t.ok ? 'ok' : ''} ${sel === t.id ? 'sel' : ''}`}>
      <button className="chk" aria-label={t.ok ? 'Geri al' : 'Bitti'} onClick={() => { toggle(t.id); if (!t.ok) sfx('buy'); }}>{t.ok ? '✓' : ''}</button>
      <button className="pick" disabled={t.ok} onClick={() => select(sel === t.id ? null : t.id)} title={t.ok ? '' : sel === t.id ? 'Seçimi kaldır' : 'Bu işe odaklan'}>
        <b>{t.t}</b>
        <small><i style={{ background: CAT_COLOR[t.c] ?? CAT_COLOR.Diğer }} />{catName(t.c)} · {t.done}/{t.est} pomodoro{t.min ? ` · ${fmtMin(t.min)}` : ''}{sel === t.id ? ' · şu an bunun üzerindesin' : ''}</small>
      </button>
      <button className="del" aria-label="Sil" onClick={() => remove(t.id)}>×</button>
    </li>
  );
  return (
    <div className="todos">
      <form className="todo-add" onSubmit={(e) => { e.preventDefault(); const td = add(title, est, cat); if (td) { select(td.id); setTitle(''); setEst(1); } }}>
        <input value={title} maxLength={80} placeholder="Ne yapacaksın? (ör. Paragraf 20 soru)" onChange={(e) => setTitle(e.target.value)} aria-label="Yeni iş" />
        <div className="est" aria-label="Tahmini pomodoro">
          <button type="button" onClick={() => setEst(Math.max(1, est - 1))} aria-label="Azalt">−</button><b>{est}</b><span>🍅</span><button type="button" onClick={() => setEst(Math.min(20, est + 1))} aria-label="Artır">+</button>
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Kategori">{CATEGORIES.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
        <button className="acc" disabled={!title.trim()}>Ekle</button>
      </form>
      {open.length === 0 ? <p className="note">Listen boş. Bir iş ekle; kaç pomodoro süreceğini tahmin et.</p> : <ul>{open.map(item)}</ul>}
      {doneToday.length > 0 && <><h4>Bugün bitenler</h4><ul>{doneToday.map(item)}</ul></>}
    </div>
  );
}
const localDay = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** small line on the timer card: which job the focus is moving */
export function TodoChip() {
  const { list, sel } = useTodos();
  const td = list.find((t) => t.id === sel);
  // only when a to-do is chosen: no written prompts on the card (user, 2026-11-03)
  if (!td) return null;
  return (
    <button className="todo-chip" onClick={() => usePanel.getState().set('todo')}>
      <i style={{ background: CAT_COLOR[td.c] ?? CAT_COLOR.Diğer }} />{td.t} <small>{td.done}/{td.est}</small>
    </button>
  );
}

/* ---------- Ortam sesleri ---------- */
interface SoundState { mix: Record<string, number>; vol: number; focusOnly: boolean; playing: boolean; set(p: Partial<Omit<SoundState, 'set'>>): void }
const SOUND_KEY = 'pw2.sound';
const loadSound = () => { try { const o = JSON.parse(localStorage.getItem(SOUND_KEY) || 'null'); if (o && typeof o === 'object') return { mix: o.mix && typeof o.mix === 'object' ? o.mix : {}, vol: typeof o.vol === 'number' ? o.vol : 0.7, focusOnly: o.focusOnly !== false }; } catch { /* ignore */ } return { mix: {}, vol: 0.7, focusOnly: true }; };
export const useSound = create<SoundState>((set, get) => ({
  ...loadSound(), playing: false,
  set(p) { set(p); const { mix, vol, focusOnly } = get(); try { localStorage.setItem(SOUND_KEY, JSON.stringify({ mix, vol, focusOnly })); } catch { /* ignore */ } },
}));

/** plays the chosen mix: during focus only, or always */
function SoundSync() {
  const { mix, vol, focusOnly } = useSound();
  const phase = useStore((s) => s.timer.phase), screen = useStore((s) => s.screen);
  const inRoom = screen === 'room' || screen === 'home';
  const any = Object.values(mix).some((v) => v > 0);
  const play = any && (!focusOnly || (inRoom && phase === 'focus'));
  useEffect(() => { applySound(mix, play, vol); useSound.setState({ playing: play }); }, [JSON.stringify(mix), vol, play]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { applySound({}, false); useSound.setState({ playing: false }); }, []);
  return null;
}

function Sounds() {
  const { mix, vol, focusOnly, set } = useSound();
  const view = useStore((s) => s.room?.view);
  const screen = useStore((s) => s.screen), phase = useStore((s) => s.timer.phase);
  if (!soundOk()) return <p className="note">Tarayıcın ses üretmeyi (WebAudio) desteklemiyor.</p>;
  const sug = suggest(view);
  const waiting = focusOnly && Object.values(mix).some((v) => v > 0) && !((screen === 'room' || screen === 'home') && phase === 'focus');
  return (
    <div className="sounds">
      {Object.entries(LAYERS).map(([id, l]) => (
        <label key={id} className={`snd-row ${(mix[id] ?? 0) > 0 ? 'on' : ''}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: l.i }} /><b>{l.n}</b>
          <input type="range" min={0} max={100} value={Math.round((mix[id] ?? 0) * 100)} aria-label={`${l.n} ses düzeyi`} onChange={(e) => set({ mix: { ...mix, [id]: +e.target.value / 100 } })} />
        </label>
      ))}
      <label className="snd-row"><svg viewBox="0 0 24 24" aria-hidden="true">{ICON.sound}</svg><b>Genel</b>
        <input type="range" min={0} max={100} value={Math.round(vol * 100)} aria-label="Genel ses" onChange={(e) => set({ vol: +e.target.value / 100 })} /></label>
      <label className="ck"><input type="checkbox" checked={focusOnly} onChange={(e) => set({ focusOnly: e.target.checked })} /> Sadece odak sırasında çal</label>
      {waiting && <p className="note">Sesler odakta çalacak. Çalışma odasında odak başlayınca duyacaksın.</p>}
      <button className="ghost" onClick={() => set({ mix: Object.fromEntries(Object.keys(LAYERS).map((k) => [k, sug.includes(k) ? 0.6 : 0])) })}>
        Manzarana uygun: {sug.map((k) => LAYERS[k].n).join(' + ')}
      </button>
    </div>
  );
}

/* ---------- İstatistik ---------- */
/** v1 profile: this week's league and the weekly board (you + your friends) */
function LeagueBox() {
  const w = useStore((s) => s.wallet), name = useStore((s) => s.profile.name);
  const friends = useFriends((s) => s.friends);
  useEffect(() => { friendsCall('list'); }, []);
  if (!w) return null;
  const wx = w.stats.weekXP[myClock().week] ?? 0, lg = leagueFor(wx), nx = nextLeague(wx);
  const board = weekBoard({ id: 'me', n: name || 'Sen', lv: levelFromXP(w.xp).level, wx }, friends.map((f) => ({ id: f.pid, n: f.n, lv: f.lv ?? 1, wx: f.wx ?? 0 })));
  return (
    <section className="league" style={{ '--lg': lg.color } as React.CSSProperties}>
      <div className="lg-head">
        <span className="lg-badge" aria-hidden="true">🏆</span>
        <div><b>{lg.name}</b><small>{nx ? `${nx.league.name} için bu hafta ${nx.need} XP daha` : 'En üst ligdesin!'}</small></div>
        <em>{wx} XP<small>bu hafta</small></em>
      </div>
      {nx && <div className="lg-bar"><i style={{ width: `${Math.min(100, ((wx - lg.min) / (nx.league.min - lg.min)) * 100)}%` }} /></div>}
      <h4>Haftalık sıralama <small>{friends.length ? 'sen ve arkadaşların' : 'arkadaş ekleyince burada yarışırsınız'}</small></h4>
      <ol className="board">{board.map((b) => (
        <li key={b.id} className={b.me ? 'me' : ''}><i>{b.rank}</i><span>{b.n}</span><em>Sv {b.lv}</em><b>{b.wx} XP</b></li>
      ))}</ol>
    </section>
  );
}

const HEAT = ['rgba(255,255,255,.07)', '#5B2B2E', '#8E3A2E', '#C64A35', '#F0644A'];
const heatLevel = (m: number) => (m <= 0 ? 0 : m < 25 ? 1 : m < 60 ? 2 : m < 120 ? 3 : 4);
function Stats() {
  const w = useStore((s) => s.wallet);
  const todosDone = useTodos((s) => s.doneCount);
  const [tip, setTip] = useState('');
  const today = myClock().day;
  const data = useMemo(() => {
    if (!w) return null;
    const days = w.stats.days, W = 26, cell = 11, gap = 3;
    // start on the Monday 25 weeks before this week
    const dow = (new Date(today + 'T12:00:00Z').getUTCDay() + 6) % 7, start = shiftDay(today, -dow - (W - 1) * 7);
    const cells: { x: number; y: number; d: string; m: number }[] = []; const months: { x: number; t: string }[] = [];
    let total = 0, active = 0, lastM = '';
    for (let wk = 0; wk < W; wk++) for (let d = 0; d < 7; d++) {
      const day = shiftDay(start, wk * 7 + d); if (day > today) continue;
      const m = days[day] ?? 0; total += m; if (m) active++;
      cells.push({ x: wk * (cell + gap) + 22, y: d * (cell + gap) + 14, d: day, m });
      if (d === 0 && day.slice(5, 7) !== lastM) { lastM = day.slice(5, 7); months.push({ x: wk * (cell + gap) + 22, t: new Date(day + 'T12:00:00Z').toLocaleDateString('tr-TR', { month: 'short' }) }); }
    }
    const since = shiftDay(today, -30); const cats: Record<string, number> = {};
    for (const b of w.stats.log) if (b.d >= since) cats[b.c || 'Diğer'] = (cats[b.c || 'Diğer'] ?? 0) + b.m;
    const catRows = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const hrs = Array.from({ length: 24 }, (_, h) => w.stats.hours[h] ?? 0);
    let week = 0; for (let i = 0; i < 7; i++) week += days[shiftDay(today, -i)] ?? 0;
    return { cells, months, total, active, svgW: W * (cell + gap) + 24, svgH: 7 * (cell + gap) + 16, cell, catRows, hrs, week };
  }, [w, today]);
  if (!w || !data) return <p className="note">Yükleniyor…</p>;
  const { cells, months, total, active, svgW, svgH, cell, catRows, hrs, week } = data;
  const cmax = Math.max(1, ...catRows.map((x) => x[1])), hmax = Math.max(1, ...hrs), best = hrs.indexOf(Math.max(...hrs));
  const nAch = ACHIEVEMENTS.filter((a) => w.ach[a.id]).length;
  return (
    <div className="stats">
      <LeagueBox />
      <div className="kpis">
        <div><b>{fmtMin(w.stats.focusMin)}</b><span>toplam odak</span></div>
        <div><b>{w.stats.pomos}</b><span>pomodoro</span></div>
        <div><b>{w.stats.streak}</b><span>gün seri</span></div>
        <div><b>{fmtMin(w.stats.days[today] ?? 0)}</b><span>bugün</span></div>
        <div><b>{fmtMin(week)}</b><span>son 7 gün</span></div>
        <div><b>{todosDone}</b><span>biten iş</span></div>
        <div><b>{nAch}/{ACHIEVEMENTS.length}</b><span>başarım</span></div>
      </div>
      <h4>Odak takvimi <small>son 6 ay · {fmtMin(total)} · {active} aktif gün</small></h4>
      <div className="heat-wrap">
        <svg className="heat" width={svgW * 1.6} height={svgH * 1.6} viewBox={`0 0 ${svgW} ${svgH}`} role="img" aria-label="Son 26 haftanın günlük odak dakikaları" onMouseLeave={() => setTip('')}>
          {months.map((m, i) => <text key={i} className="mo" x={m.x} y={9}>{m.t}</text>)}
          {['Pzt', '', 'Çar', '', 'Cum', '', ''].map((l, i) => (l ? <text key={l} className="mo" x={0} y={i * (cell + 3) + 23}>{l}</text> : null))}
          {cells.map((c) => <rect key={c.d} x={c.x} y={c.y} width={cell} height={cell} rx={2} fill={HEAT[heatLevel(c.m)]} onMouseEnter={() => setTip(`${new Date(c.d + 'T12:00:00Z').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}: ${c.m ? fmtMin(c.m) : 'odak yok'}`)}><title>{`${c.d}: ${c.m ? fmtMin(c.m) : 'odak yok'}`}</title></rect>)}
        </svg>
      </div>
      <div className="legend-seq">Az {HEAT.map((c) => <i key={c} style={{ background: c }} />)} Çok {tip && <span className="tip">{tip}</span>}</div>
      <h4>Kategoriler <small>son 30 gün</small></h4>
      {catRows.length ? catRows.map(([c, m]) => (
        <div key={c} className="hbar"><span>{catName(c)}</span><span className="tr"><i style={{ width: `${(m / cmax) * 100}%`, background: CAT_COLOR[c] ?? CAT_COLOR.Diğer }} /></span><b>{fmtMin(m)}</b></div>
      )) : <p className="note">İlk pomodorondan sonra burada dağılımı göreceksin.</p>}
      <h4>Günün saatleri <small>{hmax > 1 ? `en verimli: ${String(best).padStart(2, '0')}:00` : 'henüz veri yok'}</small></h4>
      <div className="hours">{hrs.map((v, h) => <i key={h} style={{ height: `${Math.max(3, (v / hmax) * 100)}%` }} title={`${String(h).padStart(2, '0')}:00 · ${fmtMin(v)}`} />)}</div>
      <div className="hours-ax"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
    </div>
  );
}
