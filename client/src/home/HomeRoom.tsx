// "Odam" — the player's own room, drawn by the original room engine with the original editor rules.
import { useEffect, useRef, useState, useCallback } from 'react';
import { available, itemById, levelFromXP, ROOM_KEYS, type Room, type PlacedItem } from '@pw/shared';
import { useStore } from '../store';
import { saveRoom, refreshWallet } from '../economy';
import { WalletChip, ShopModal } from '../ui/Wallet';
import { engine, defOf, lookOf, hist, PW, type World } from './engine';
import { EditBar } from './EditBar';

type Ghost = { id: string; r: number; extra: Record<string, unknown> } | null;

export function HomeRoom() {
  const room = useStore((s) => s.room), wallet = useStore((s) => s.wallet), profile = useStore((s) => s.profile);
  const host = useRef<HTMLDivElement>(null), tags = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [sel, setSel] = useState(-1);
  const [tick, setTick] = useState(0); // engine state that React does not own (ghost, wall mode, top view)
  const pendingGhost = useRef<Ghost>(null);
  const latest = useRef({ room, wallet, editing });
  latest.current = { room, wallet, editing };
  const flash = useStore((s) => s.flash);

  useEffect(() => { if (!room) refreshWallet(); }, [room]);

  /* ---------- engine lifetime ---------- */
  useEffect(() => {
    if (!host.current || !tags.current) return;
    const lite = new URLSearchParams(location.search).has('lite') || matchMedia('(max-width: 600px)').matches;
    let w: World;
    try { w = new PW.World(host.current, tags.current, { quality: lite ? 'low' : 'high' }); } catch (e) { console.warn('room engine failed', e); setFailed(true); return; }
    engine.world = w; (window as unknown as { __world: World }).__world = w;
    w.onClick = (ev: { type: string; index?: number; idx?: number; x?: number; z?: number }) => {
      if (ev.type === 'edit-select') { setSel(ev.index ?? -1); return; }
      if (latest.current.editing) return;
      if (ev.type === 'seat' && ev.idx != null) { w.sitAvatar('me', ev.idx); w.setAct('me', 'idle'); }
      else if (ev.type === 'floor' && ev.x != null) w.walkTo('me', ev.x, ev.z);
    };
    w.onPlace = (pos: PlacedItem) => placeItem(pos);
    w.onInvalidPlace = () => flash('Buraya sığmıyor, başka bir yer dene.');
    setReady(true);
    return () => { engine.world = null; try { w.renderer.setAnimationLoop?.(null); w.renderer.dispose(); w.renderer.domElement.remove(); } catch { /* ignore */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- the player, sitting at the desk ---------- */
  const level = wallet ? levelFromXP(wallet.xp).level : 1;
  useEffect(() => {
    const w = engine.world; if (!ready || !w || !room) return;
    if (!w.avatars.has('me')) w.addAvatar('me', PW.defaultAvatar(profile.avatar.g), { name: profile.name || 'Sen', level, isMe: true });
    else w.updateAvatarInfo?.('me', { name: profile.name || 'Sen', level, isMe: true });
  }, [ready, room, profile.name, profile.avatar.g, level]);

  const parkMe = useCallback(() => {
    const w = engine.world; if (!w) return; w.standAvatar('me'); const me = w.avatars.get('me');
    if (me) { me.target = null; me.av.root.position.set(w.half - 0.6, 0, w.half - 0.6); me.av.setState('stand'); }
  }, []);
  const seatMe = useCallback(() => {
    const w = engine.world; if (!w || !w.avatars.has('me')) return; const i = w.freeSeat(true);
    if (i != null) w.sitAvatar('me', i); w.setAct('me', 'idle');
  }, []);

  /* ---------- draw the room whenever its look changes ---------- */
  const look = room ? lookOf(room) : '';
  useEffect(() => {
    const w = engine.world; if (!ready || !w || !room) return;
    w.loadRoom(defOf(room));
    if (!w.avatars.has('me')) w.addAvatar('me', PW.defaultAvatar(profile.avatar.g), { name: profile.name || 'Sen', level, isMe: true });
    if (latest.current.editing) {
      w.setEdit(true); parkMe();
      const g = pendingGhost.current; pendingGhost.current = null;
      if (g) w.startGhost(g.id, g.r, g.extra);
    } else seatMe();
    setTick((t) => t + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, look]);

  useEffect(() => {
    const w = engine.world; if (!ready || !w) return;
    w.setEdit(editing); w.hideTags = editing; setSel(-1);
    if (editing) parkMe();
    else { if (w.wallMode && w.wallMode !== 'cut') w.setWallMode('cut'); if (w.topView) w.toggleTopView(); seatMe(); }
    setTick((t) => t + 1);
  }, [ready, editing, parkMe, seatMe]);
  useEffect(() => { engine.world?.select(sel); }, [sel, tick]);

  /* ---------- changes (every change can be undone) ---------- */
  const change = useCallback((fn: (r: Room) => Room, keepSel = false) => {
    const r0 = latest.current.room; if (!r0) return;
    hist.u.push(JSON.stringify(defOf(r0))); if (hist.u.length > 40) hist.u.shift(); hist.r = [];
    if (!keepSel) setSel(-1);
    saveRoom(fn(structuredClone(r0)));
  }, []);
  const restore = (snap: string) => {
    const r0 = latest.current.room; if (!r0) return; setSel(-1);
    const o = JSON.parse(snap) as Record<string, unknown>; const r = { ...r0 } as unknown as Record<string, unknown>;
    for (const k of ROOM_KEYS) { if (o[k] === undefined) delete r[k]; else r[k] = o[k]; }
    saveRoom(r as unknown as Room);
  };
  const undo = () => { const r0 = latest.current.room; if (!r0 || !hist.u.length) return; hist.r.push(JSON.stringify(defOf(r0))); restore(hist.u.pop()!); };
  const redo = () => { const r0 = latest.current.room; if (!r0 || !hist.r.length) return; hist.u.push(JSON.stringify(defOf(r0))); restore(hist.r.pop()!); };

  function placeItem(pos: PlacedItem) {
    const { room: r, wallet: wl } = latest.current; if (!r || !wl) return;
    if (available(wl, r, pos.id) <= 0) { flash('Envanterde kalmadı. Mağazadan bir tane daha alabilirsin.'); return; }
    // keep placing copies while you still have some (like the old editor)
    pendingGhost.current = available(wl, r, pos.id) > 1 ? { id: pos.id, r: 'r' in pos ? pos.r : 0, extra: { c: (pos as { c?: string }).c, wd: (pos as { wd?: string }).wd } } : null;
    change((x) => ({ ...x, items: [...x.items, pos] }));
  }
  const startGhost = (id: string, r = 0, extra: Record<string, unknown> = {}) => { const w = engine.world; if (!w) return; setSel(-1); w.select(-1); w.startGhost(id, r, extra); setTick((t) => t + 1); };
  const selItem = room && sel >= 0 ? room.items[sel] : undefined;
  const actions = {
    rotate() {
      const w = engine.world; if (w?.rotateGhost()) return;
      if (!selItem || 'w' in selItem) return;
      change((x) => { const it = x.items[sel] as { r: number }; it.r = ((it.r || 0) + 1) % 4; return x; }, true);
    },
    remove() { if (!selItem) return; change((x) => ({ ...x, items: x.items.filter((_, i) => i !== sel) })); },
    move() {
      if (!selItem) return; const it = selItem;
      pendingGhost.current = { id: it.id, r: 'r' in it ? it.r : 0, extra: 'w' in it ? {} : { c: it.c, wd: it.wd } };
      change((x) => ({ ...x, items: x.items.filter((_, i) => i !== sel) }));
    },
    copy() {
      if (!selItem || 'w' in selItem || !wallet || !room) return;
      if (available(wallet, room, selItem.id) <= 0) { flash('Envanterde yok. Aynısından bir tane daha mağazadan alabilirsin.'); return; }
      startGhost(selItem.id, selItem.r || 0, { c: selItem.c, wd: selItem.wd });
    },
    tint(k: 'c' | 'wd', v: string) { if (!selItem || 'w' in selItem) return; change((x) => { (x.items[sel] as Record<string, unknown>)[k] = v; return x; }, true); },
    walls() { const w = engine.world; if (!w) return; const next = ({ cut: 'up', up: 'down', down: 'cut' } as Record<string, string>)[w.wallMode || 'cut']; w.setWallMode(next); flash({ cut: 'Kesik duvarlar', up: 'Duvarlar yukarıda', down: 'Duvarlar aşağıda' }[next]!); setTick((t) => t + 1); },
    top() { engine.world?.toggleTopView(); setTick((t) => t + 1); },
    cancel() { engine.world?.cancelGhost(); setTick((t) => t + 1); },
  };

  /* keyboard like the old editor: Ctrl+Z / Ctrl+Y, R rotate, Delete remove, Esc cancel, T top view */
  useEffect(() => {
    if (!editing) return;
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); }
      else if (k === 'r') actions.rotate();
      else if (k === 'delete' || k === 'backspace') actions.remove();
      else if (k === 'escape') actions.cancel();
      else if (k === 't') actions.top();
    };
    addEventListener('keydown', on); return () => removeEventListener('keydown', on);
  });

  const w = engine.world;
  const placing = !!w?.edit?.ghost;
  if (failed) return <div className="canvas-failed">Odan bu cihazda açılamadı (3D desteklenmiyor). <button className="ghost" onClick={() => useStore.getState().set({ screen: 'lobby' })}>Geri dön</button></div>;
  return (
    <div className="home-room">
      <div ref={host} className="home-canvas" />
      <div ref={tags} className="home-tags" />
      <header className="topbar home-top">
        <div className="brand"><span className="dot" />{room?.name || 'Odam'}</div>
        <WalletChip />
        {!editing && <button className="acc" onClick={() => setEditing(true)}>Odayı düzenle</button>}
        <button className="ghost" onClick={() => useStore.getState().set({ screen: 'lobby' })}>Çalışma odası</button>
      </header>
      {!editing && room && room.items.length <= 2 && <p className="home-hint">Mağazadan eşya al, “Odayı düzenle” ile istediğin yere koy.</p>}
      {editing && room && wallet && (
        <EditBar
          room={room} wallet={wallet} level={level} sel={sel} selItem={selItem} placing={placing} tick={tick}
          canUndo={hist.u.length > 0} canRedo={hist.r.length > 0} wallMode={w?.wallMode || 'cut'} topView={!!w?.topView}
          onUndo={undo} onRedo={redo} onChange={change} onGhost={startGhost} actions={actions} onDone={() => setEditing(false)}
        />
      )}
      <ShopModal />
      <HomeNotice />
    </div>
  );
}

function HomeNotice() {
  const n = useStore((s) => s.notice);
  const [, re] = useState(0);
  useEffect(() => { if (!n) return; const t = setTimeout(() => re((x) => x + 1), n.until - Date.now() + 20); return () => clearTimeout(t); }, [n]);
  if (!n || n.until < Date.now()) return null;
  return <div className="notice" role="status">{n.text}</div>;
}

export const itemName = (id: string) => itemById(id)?.name ?? PW.ITEM?.[id]?.name ?? id;
