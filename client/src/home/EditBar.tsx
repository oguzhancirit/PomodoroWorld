// The room editor bar, the same tabs and tools as the original game (js/ui.js renderEditBar).
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import {
  CATALOG, ROOM_FX, available, owns, itemById, FLOOR_TYPES, WALL_PATTERNS, MOOD_NAMES, SURFACE_LVL, MOOD_LVL,
  type Room, type Wallet, type PlacedItem, type Item,
} from '@pw/shared';
import { useStore } from '../store';
import { buyItem } from '../economy';
import { PW, ROOM_STYLES, TRIM_COLORS, CURTAIN_COLORS, MOOD_INFO, thumb, swatch } from './engine';

type Tab = 'style' | 'furn' | 'wall' | 'floor' | 'mood' | 'view' | 'theme' | 'size';
const TABS: [Tab, string][] = [['style', 'Stiller'], ['furn', 'Eşyalar'], ['wall', 'Duvar'], ['floor', 'Zemin'], ['mood', 'Atmosfer'], ['view', 'Manzara'], ['theme', 'Hazır tema'], ['size', 'Boyut']];
const FX_ICON: Record<string, string> = { snow: '❄️', sakura: '🌸', fireflies: '✨', leaves: '🍂', stardust: '⭐', bubbles: '🫧' };
const SIZE_OF: Record<string, number> = { sz_s: 7, sz_m: 9, sz_l: 11 };
const COIN = <svg className="coin" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" /><path d="M10 5.5v9M7.5 8h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" /></svg>;
const I = {
  undo: <svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>,
  redo: <svg viewBox="0 0 24 24"><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></svg>,
  walls: <svg viewBox="0 0 24 24"><path d="M3 20V9l9-5 9 5v11" /><path d="M3 14h18" /></svg>,
  top: <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 12h16M12 4v16" /></svg>,
};

interface Props {
  room: Room; wallet: Wallet; level: number; sel: number; selItem?: PlacedItem; placing: boolean; tick: number;
  canUndo: boolean; canRedo: boolean; wallMode: string; topView: boolean;
  onUndo(): void; onRedo(): void; onDone(): void;
  onChange(fn: (r: Room) => Room, keepSel?: boolean): void;
  onGhost(id: string, r?: number, extra?: Record<string, unknown>): void;
  actions: { rotate(): void; remove(): void; move(): void; copy(): void; tint(k: 'c' | 'wd', v: string): void; touch(k: 'c' | 't' | 'v', v: string | number): void; walls(): void; top(): void; cancel(): void };
}

export function EditBar(p: Props) {
  const { room: R, wallet, level: L, selItem, actions } = p;
  const [tab, setTab] = useState<Tab>('furn');
  const [buying, setBuying] = useState<Item | null>(null);
  const [msg, setMsg] = useState('');
  const flash = useStore((s) => s.flash);
  const set = (patch: Partial<Room>) => p.onChange((x) => ({ ...x, ...patch }));
  const def = { ...R };
  const surf = (() => { try { return PW.surfaceOf(def); } catch { return { wall: '#E9DCC8', floor: '#B07D52', pat: 'plank' }; } })();

  const apply = (it: Item) => {
    if (it.cat === 'theme') p.onChange((x) => { const y = { ...x, theme: it.id }; for (const k of ['wall', 'wallPat', 'floorT', 'floorC', 'trim', 'curtain'] as const) delete y[k]; return y; });
    if (it.cat === 'view') set({ view: it.id });
    if (it.cat === 'size') {
      const size = SIZE_OF[it.id]; const lim = size / 2 - 0.3;
      if (size < R.size && R.items.some((x) => !('w' in x) && (Math.abs(x.x) > lim || Math.abs(x.z) > lim))) { flash('Oda küçültülemedi. Önce kenardaki eşyaları ortaya taşı.'); return; }
      set({ size });
    }
  };
  const pick = (it: Item) => {
    if (owns(wallet, it.id)) return apply(it);
    if (L < it.lvl) { flash(`${it.name} — Seviye ${it.lvl}'de açılır.`); return; }
    setMsg(''); setBuying(it);
  };
  const confirmBuy = async () => {
    if (!buying) return; const it = buying;
    const err = await buyItem(it.id);
    if (err) { setMsg(err); return; }
    setBuying(null); apply(it);
  };

  const selFloor = selItem && !('w' in selItem) ? selItem : undefined;
  let sub: ReactNode = null, list: ReactNode = null;

  if (tab === 'style') {
    const cur = ROOM_STYLES.find((st) => (['wall', 'wallPat', 'floorT', 'floorC', 'mood'] as const).every((k) => R[k] === st[k]));
    list = ROOM_STYLES.map((st) => {
      const lv = Math.max(SURFACE_LVL[st.wallPat] || 1, SURFACE_LVL[st.floorT] || 1, MOOD_LVL[st.mood] || 1, ROOM_FX.find((f) => f.id === st.fx)?.lvl || 1); const lock = L < lv; const d = { ...def, ...st };
      return (
        <button key={st.id} className={`stylecard ${cur === st ? 'on' : ''}`} disabled={lock}
          onClick={() => set({ wall: st.wall, wallPat: st.wallPat, floorT: st.floorT, floorC: st.floorC, trim: st.trim, curtain: st.curtain, mood: st.mood, fx: st.fx })}>
          <span className="sw2"><i style={{ backgroundImage: `url(${swatch('wallPat', st.wallPat, d)})` }} /><i style={{ backgroundImage: `url(${swatch('floorT', st.floorT, d)})` }} /></span>
          <b>{st.n}</b><span>{lock ? `Seviye ${lv}` : `${PW.MOODS[st.mood]?.name ?? ''}${st.fx ? ` · ${FX_ICON[st.fx] ?? ''}` : ''}`}</span>
        </button>
      );
    });
  } else if (tab === 'furn') {
    const touches = selItem ? <Touches it={selItem} touch={actions.touch} /> : null;
    if (!selFloor && touches) sub = touches;
    if (selFloor) sub = (
      <>
        {touches}
        <div className="swatches"><span className="lbl">Kumaş / renk</span>{(PW.FABRIC_COLORS as string[]).map((c) => <button key={c} className={`sw ${selFloor.c === c ? 'on' : ''}`} style={{ '--c': c } as CSSProperties} aria-label="Renk" onClick={() => actions.tint('c', c)} />)}<input type="color" className="sw-pick" value={selFloor.c || '#8E6CC1'} aria-label="Özel renk" onChange={(e) => actions.tint('c', e.target.value.toUpperCase())} /></div>
        <div className="swatches"><span className="lbl">Ahşap</span>{Object.entries(PW.WOOD_TONES as Record<string, string>).map(([k, c]) => <button key={k} className={`sw ${selFloor.wd === k ? 'on' : ''}`} style={{ '--c': c } as CSSProperties} aria-label={k} onClick={() => actions.tint('wd', k)} />)}</div>
      </>
    );
    const mine = CATALOG.filter((i) => i.cat === 'furn' && (wallet.owned[i.id] ?? 0) > 0)
      .sort((a, b) => (Number(available(wallet, R, b.id) > 0) - Number(available(wallet, R, a.id) > 0)) || (a.sub ?? '').localeCompare(b.sub ?? ''));
    list = [
      ...mine.map((it) => { const av = available(wallet, R, it.id); return (
        <button key={it.id} className={`eit ${av > 0 ? '' : 'none'}`} disabled={av <= 0} title={it.name} onClick={() => p.onGhost(it.id, 0)}>
          <img alt="" src={thumb(it.id)} /><span>{it.name}</span><i>{av}</i>
        </button>); }),
      <button key="shop" className="eit shop" onClick={() => useStore.getState().set({ shop: true, shopTab: 'furn' })}><span>Mağazaya git</span></button>,
    ];
  } else if (tab === 'wall') {
    sub = (
      <>
        <div className="swatches"><span className="lbl">Duvar rengi</span>{(PW.WALL_COLORS as string[]).map((c) => <button key={c} className={`sw ${R.wall === c ? 'on' : ''}`} style={{ '--c': c } as CSSProperties} aria-label="Duvar rengi" onClick={() => set({ wall: c })} />)}
          <input type="color" className="sw-pick" value={R.wall || '#E9DCC8'} aria-label="Özel renk" onChange={(e) => set({ wall: e.target.value.toUpperCase() })} /></div>
        <div className="swatches"><span className="lbl">Süpürgelik</span>{TRIM_COLORS.map((c) => <button key={c} className={`sw ${R.trim === c ? 'on' : ''}`} style={{ '--c': c } as CSSProperties} aria-label="Süpürgelik rengi" onClick={() => set({ trim: c })} />)}<input type="color" className="sw-pick" value={R.trim || '#F6F4EF'} aria-label="Özel süpürgelik rengi" onChange={(e) => set({ trim: e.target.value.toUpperCase() })} /></div>
      </>
    );
    list = WALL_PATTERNS.map(([k, n]) => { const lv = SURFACE_LVL[k] || 1; const lock = L < lv; return (
      <button key={k} className={`eit ${(R.wallPat || 'plain') === k ? 'on' : ''} ${lock ? 'none' : ''}`} disabled={lock} onClick={() => set({ wallPat: k, wall: R.wall || surf.wall })}>
        <span className="pat" style={{ backgroundImage: `url(${swatch('wallPat', k, def)})` }}>{lock && <em>Sv {lv}</em>}</span><span>{n}</span>
      </button>); });
  } else if (tab === 'floor') {
    sub = <div className="swatches"><span className="lbl">Zemin rengi</span>{(PW.FLOOR_COLORS as string[]).map((c) => <button key={c} className={`sw ${R.floorC === c ? 'on' : ''}`} style={{ '--c': c } as CSSProperties} aria-label="Zemin rengi" onClick={() => set({ floorC: c })} />)}<input type="color" className="sw-pick" value={R.floorC || '#C49A6C'} aria-label="Özel zemin rengi" onChange={(e) => set({ floorC: e.target.value.toUpperCase() })} /></div>;
    list = FLOOR_TYPES.map(([k, n]) => { const lv = SURFACE_LVL[k] || 1; const lock = L < lv; return (
      <button key={k} className={`eit ${(R.floorT || surf.pat) === k ? 'on' : ''} ${lock ? 'none' : ''}`} disabled={lock} onClick={() => set({ floorT: k, floorC: R.floorC || surf.floor })}>
        <span className="pat" style={{ backgroundImage: `url(${swatch('floorT', k, def)})` }}>{lock && <em>Sv {lv}</em>}</span><span>{n}</span>
      </button>); });
  } else if (tab === 'mood') {
    const cur = R.mood || PW.defaultMoodFor(R.view);
    sub = <><div className="swatches"><span className="lbl">Perde</span>{CURTAIN_COLORS.map((c) => <button key={c} className={`sw ${R.curtain === c ? 'on' : ''}`} style={{ '--c': c } as CSSProperties} aria-label="Perde rengi" onClick={() => set({ curtain: c })} />)}<input type="color" className="sw-pick" value={R.curtain || '#2F7D5B'} aria-label="Özel perde rengi" onChange={(e) => set({ curtain: e.target.value.toUpperCase() })} /></div>
      <div className="swatches fx-row"><span className="lbl">Havada</span>
        <button className={`fxb ${!R.fx ? 'on' : ''}`} onClick={() => set({ fx: undefined })}>Yok</button>
        {ROOM_FX.map((f) => { const lock = L < f.lvl; return <button key={f.id} className={`fxb ${R.fx === f.id ? 'on' : ''}`} disabled={lock} title={lock ? `Seviye ${f.lvl}` : f.name} onClick={() => set({ fx: f.id })}>{FX_ICON[f.id]} {f.name}{lock ? ` · Sv ${f.lvl}` : ''}</button>; })}
      </div></>;
    list = MOOD_NAMES.map(([k, name]) => { const lv = MOOD_LVL[k] || 1; const lock = L < lv; return (
      <button key={k} className={`mood ${cur === k ? 'on' : ''}`} disabled={lock} onClick={() => set({ mood: k })}>
        <i style={{ background: MOOD_INFO[k]?.grad }} /><b>{name}</b><span>{lock ? `Seviye ${lv}` : MOOD_INFO[k]?.desc}</span>
      </button>); });
  } else {
    const cur = tab === 'theme' ? R.theme : tab === 'view' ? R.view : Object.keys(SIZE_OF).find((k) => SIZE_OF[k] === R.size);
    list = CATALOG.filter((i) => i.cat === tab).map((it) => { const own = owns(wallet, it.id); const lock = !own && L < it.lvl; return (
      <button key={it.id} className={`eit ${it.id === cur ? 'on' : ''} ${own ? '' : 'none'}`} title={it.name} onClick={() => pick(it)}>
        <img alt="" src={thumb(it.id)} /><span>{it.name}</span>{!own && <i className="p">{lock ? `Sv ${it.lvl}` : <>{COIN}{it.price}</>}</i>}
      </button>); });
  }

  const selName = selItem ? itemById(selItem.id)?.name ?? selItem.id : p.placing ? 'Yerleştiriliyor… tıkla ya da Esc' : 'Seçili eşya yok';
  return (
    <section className="editbar" aria-label="Oda düzenleyici">
      <div className="e-top">
        <div className="tabs e-tabs">{TABS.map(([k, n]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{n}</button>)}</div>
        <div className="row e-tools">
          <div className="e-cam">
            <button className="ib" disabled={!p.canUndo} title="Geri al (Ctrl+Z)" aria-label="Geri al" onClick={p.onUndo}>{I.undo}</button>
            <button className="ib" disabled={!p.canRedo} title="Yinele (Ctrl+Y)" aria-label="Yinele" onClick={p.onRedo}>{I.redo}</button>
            <button className="ib" data-mode={p.wallMode} title="Duvarlar: kesik / açık / alçak" aria-label="Duvar görünümü" onClick={actions.walls}>{I.walls}</button>
            <button className={`ib ${p.topView ? 'on' : ''}`} title="Kuşbakışı (T)" aria-label="Kuşbakışı" onClick={actions.top}>{I.top}</button>
          </div>
          <span className="e-sel">{selName}</span>
          {p.placing ? <button className="ghost sm" onClick={actions.rotate}>Döndür</button> : <>
            <button className="ghost sm" disabled={!selFloor} onClick={actions.rotate}>Döndür</button>
            <button className="ghost sm" disabled={!selItem} onClick={actions.move}>Taşı</button>
            <button className="ghost sm" disabled={!selFloor} title="Aynısından bir tane daha yerleştir" onClick={actions.copy}>Kopyala</button>
            <button className="ghost sm" disabled={!selItem} onClick={actions.remove}>Kaldır</button>
          </>}
          {p.placing && <button className="ghost sm" onClick={actions.cancel}>Vazgeç</button>}
          <button className="acc sm" onClick={p.onDone}>Bitti</button>
        </div>
      </div>
      {sub && <div className="e-sub">{sub}</div>}
      <div className="e-list">{list}</div>
      {buying && (
        <div className="e-buy" role="dialog" aria-label="Satın al">
          <img alt="" src={thumb(buying.id)} />
          <div><b>{buying.name}</b><span>{COIN}{buying.price} · sende {wallet.coins.toLocaleString('tr-TR')} jeton</span>{msg && <em>{msg}</em>}</div>
          <button className="acc sm" disabled={wallet.coins < buying.price} onClick={confirmBuy}>Al ve uygula</button>
          <button className="ghost sm" onClick={() => setBuying(null)}>Vazgeç</button>
        </div>
      )}
    </section>
  );
}

/** personal touches for the selected item (user 2026-11-03): your own words, the neon colour, the poster design */
function Touches({ it, touch }: { it: PlacedItem; touch: (k: 'c' | 't' | 'v', v: string | number) => void }) {
  const def = PW.ITEM[it.id] as { text?: number; tint?: number; vars?: number; sub?: string } | undefined;
  const pet = def?.sub === 'Evcil';
  const cur = it as { c?: string; t?: string; v?: number };
  const [text, setText] = useState(cur.t ?? '');
  useEffect(() => setText(cur.t ?? ''), [it]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!def || !(def.text || def.tint || def.vars)) return null;
  const save = () => { if (text.trim() !== (cur.t ?? '')) touch('t', text.trim()); };
  return (
    <>
      {def.text && (
        <div className="swatches touch-text"><span className="lbl">{pet ? 'Adı' : 'Yazın'}</span>
          <input value={text} maxLength={pet ? 12 : 18} placeholder={pet ? 'Ona bir isim ver' : 'Kendi sözünü yaz'} aria-label={pet ? 'Evcil hayvanın adı' : 'Eşyanın üstündeki yazı'}
            onChange={(e) => setText(e.target.value)} onBlur={save} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') { save(); (e.target as HTMLInputElement).blur(); } }} />
          <button type="button" className="ghost sm" onClick={save}>Yaz</button>
        </div>
      )}
      {def.tint && (
        <div className="swatches"><span className="lbl">Işık rengi</span>{(PW.NEON_COLORS as string[]).map((c) => <button key={c} className={`sw ${cur.c === c ? 'on' : ''}`} style={{ '--c': c } as CSSProperties} aria-label="Işık rengi" onClick={() => touch('c', c)} />)}<input type="color" className="sw-pick" value={cur.c || '#FF4FA0'} aria-label="Özel ışık rengi" onChange={(e) => touch('c', e.target.value.toUpperCase())} /></div>
      )}
      {def.vars && (
        <div className="swatches touch-vars"><span className="lbl">Desen</span>{Array.from({ length: def.vars }, (_, v) => (
          <button key={v} className={`var ${(cur.v ?? 0) === v ? 'on' : ''}`} aria-label={`Desen ${v + 1}`} onClick={() => touch('v', v)}><img alt="" src={PW.posterThumb(v)} /></button>
        ))}</div>
      )}
    </>
  );
}
