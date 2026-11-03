// "Odam" — the player's own room, drawn by the original room engine with the original editor rules.
import { useEffect, useRef, useState, useCallback } from 'react';
import { available, itemById, levelFromXP, ROOM_KEYS, avatarAllowed, defaultAvatar, encodeAvatar, defaultRoom, type Room, type PlacedItem } from '@pw/shared';
import { useStore } from '../store';
import { saveRoom, refreshWallet } from '../economy';
import { WalletChip, ShopModal } from '../ui/Wallet';
import { ToolButtons, Panels } from '../ui/Panels';
import { engine, defOf, lookOf, hist, PW, type World } from './engine';
import { EditBar } from './EditBar';
import { TimerCard, ChatPanel, EmoteBar, NetBanner } from '../ui/RoomUI';
import { FocusScreen, useCompanions } from './FocusScreen';
import { RewardToast } from '../ui/Wallet';
import { WorldButton, WorldPanel } from '../ui/World';
import { openHome, leaveRoom, openProfile } from '../net';

type Ghost = { id: string; r: number; extra: Record<string, unknown> } | null;

export function HomeRoom() {
  const myRoom = useStore((s) => s.room), wallet = useStore((s) => s.wallet), profile = useStore((s) => s.profile);
  const place = useStore((s) => s.place);
  // a friend's room: draw the look the server sends; my room: my saved room (editing stays mine only)
  const visiting = !!place && !place.mine;
  const room: Room | null = visiting ? (place.layout ? { ...defaultRoom(), ...JSON.parse(place.layout), name: place.name } : null) : myRoom;
  const look = room ? lookOf(room) : '';
  const host = useRef<HTMLDivElement>(null), tags = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  // v1 focus screen: alone → "Odaklan", a friend in the room → "Birlikte odaklan"
  const [focusOpen, setFocus] = useState(false);
  const together = useCompanions().length > 0;
  const [sel, setSel] = useState(-1);
  const [tick, setTick] = useState(0); // engine state that React does not own (ghost, wall mode, top view)
  const pendingGhost = useRef<Ghost>(null);
  const latest = useRef({ room, wallet, editing });
  latest.current = { room, wallet, editing };
  const flash = useStore((s) => s.flash);

  useEffect(() => { if (!myRoom) refreshWallet(); }, [myRoom]);
  // the game lives in your room: open it live so friends can come in (once per visit to this screen)
  useEffect(() => { if (!place) openHome(); }, [place]);
  useEffect(() => { if (visiting && editing) setEditing(false); }, [visiting, editing]);
  useEffect(() => { if (editing) setFocus(false); }, [editing]);
  // v1: the camera comes close to your desk while the focus screen is open
  useEffect(() => {
    const w = engine.world; if (!ready || !w || editing) return;
    if (focusOpen) { if (w.avatars.get('me')?.seatIdx == null) seatMe(); w.setFocusCam('me'); }
    else w.setFocusCam(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusOpen, ready, editing]);

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
  // the new character (decision b): only pieces you own, like in the study room
  const myCode = encodeAvatar(!wallet || avatarAllowed(wallet, profile.avatar) ? profile.avatar : defaultAvatar(profile.avatar.g));
  useEffect(() => {
    const w = engine.world; if (!ready || !w || !room) return;
    if (!w.avatars.has('me')) w.addAvatar('me', myCode, { name: profile.name || 'Sen', level, isMe: true });
    else w.updateAvatarInfo?.('me', { name: profile.name || 'Sen', level, isMe: true, cfg: myCode });
  }, [ready, room, profile.name, myCode, level]);

  const parkMe = useCallback(() => {
    const w = engine.world; if (!w) return; w.standAvatar('me'); const me = w.avatars.get('me');
    if (me) { me.target = null; me.av.root.position.set(w.half - 0.6, 0, w.half - 0.6); me.av.setState('stand'); }
  }, []);
  const seatMe = useCallback(() => {
    const w = engine.world; if (!w || !w.avatars.has('me')) return;
    // in a live room the server gives out the chairs; alone, take the first free desk chair
    const st = useStore.getState(), seat = st.players[st.me]?.seatIndex;
    if (seat != null && seat >= 0) { if (w.avatars.get('me').seatIdx !== seat) w.sitAvatar('me', seat); }
    // already in a chair: stay there (freeSeat would skip our own chair as "taken" and move us)
    else if (w.avatars.get('me').seatIdx == null) { const i = w.freeSeat(true); if (i != null) w.sitAvatar('me', i); }
    w.setAct('me', 'idle');
  }, []);

  /* ---------- the people in this room (friends, and me as the server sees me) ---------- */
  const players = useStore((s) => s.players), meId = useStore((s) => s.me), phase = useStore((s) => s.timer.phase), emotes = useStore((s) => s.emotes);
  const seen = useRef<Record<string, string>>({});
  useEffect(() => {
    const w = engine.world; if (!ready || !w || editing) return;
    const status = phase === 'focus' ? 'focus' : phase === 'idle' ? '' : 'break';
    const here = new Set<string>(['me']);
    for (const p of Object.values(players)) {
      const key = p.id === meId ? 'me' : p.id; here.add(key);
      if (key !== 'me') {
        if (!w.avatars.has(key)) w.addAvatar(key, p.avatar, { name: p.name, level: p.level ?? 1 });
        const a = w.avatars.get(key);
        if (p.seatIndex >= 0) { if (a.seatIdx !== p.seatIndex) w.sitAvatar(key, p.seatIndex); } else if (a.seatIdx != null) w.standAvatar(key);
      } else if (p.seatIndex >= 0 && w.avatars.get('me')?.seatIdx !== p.seatIndex) w.sitAvatar('me', p.seatIndex);
      w.updateAvatarInfo(key, { name: key === 'me' ? (profile.name || 'Sen') : p.name, level: p.level ?? 1, status, ...(key === 'me' ? {} : { cfg: p.avatar }) });
      w.setAct(key, phase === 'focus' ? p.activity : p.bubble ? 'talk' : 'idle');
      // a new chat line becomes a speech bubble over the head
      if (p.bubble && seen.current[key] !== p.bubble) w.bubble(key, p.bubble);
      seen.current[key] = p.bubble;
    }
    for (const id of [...w.avatars.keys()] as string[]) if (!here.has(id)) w.removeAvatar(id);
  }, [ready, editing, players, meId, phase, look, profile.name]);
  const emoted = useRef<Record<string, number>>({});
  useEffect(() => {
    const w = engine.world; if (!ready || !w) return;
    for (const [id, v] of Object.entries(emotes)) if (emoted.current[id] !== v.until) { emoted.current[id] = v.until; w.emote(id === meId ? 'me' : id, v.e); }
  }, [ready, emotes, meId]);

  /* ---------- draw the room whenever its look changes ---------- */
  useEffect(() => {
    const w = engine.world; if (!ready || !w || !room) return;
    w.loadRoom(defOf(room));
    if (!w.avatars.has('me')) w.addAvatar('me', myCode, { name: profile.name || 'Sen', level, isMe: true });
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
      <header className="topbar home-top" hidden={focusOpen}>
        <div className="brand"><span className="dot" />{visiting ? (place.ownerName ? `${possessive(place.ownerName)} odası` : 'Arkadaşının odası') : room?.name || 'Odam'}{visiting && room?.name && <small className="owner-note"> · {room.name}</small>}</div>
        {place && <div className="people-pill" title="Odadakiler / sandalye sayısı">{Object.keys(players).length} / {place.cap} kişi</div>}
        <WalletChip />
        {!editing && <ToolButtons />}
        {!editing && !visiting && <button className="acc" onClick={() => setEditing(true)}>Odayı düzenle</button>}
        {visiting && <button className="acc" onClick={() => { leaveRoom(); }}>Odama dön</button>}
        {!editing && !visiting && <button className="ghost" onClick={openProfile}>Karakterim</button>}
        {!editing && <WorldButton />}
      </header>
      {!editing && !focusOpen && !visiting && room && room.items.length <= 3 && <p className="home-hint">Mağazadan eşya al, “Odayı düzenle” ile istediğin yere koy. “Dünya”dan arkadaşını davet et.</p>}
      {!editing && <div className={`room-ui home-ui ${focusOpen ? 'focusing' : ''}`}>{!focusOpen && <TimerCard onOpen={() => setFocus(true)} together={together} />}<ChatPanel />{!focusOpen && <EmoteBar />}<NetBanner /><RewardToast /></div>}
      {!editing && focusOpen && <FocusScreen onClose={() => setFocus(false)} />}
      <WorldPanel />
      {editing && room && wallet && (
        <EditBar
          room={room} wallet={wallet} level={level} sel={sel} selItem={selItem} placing={placing} tick={tick}
          canUndo={hist.u.length > 0} canRedo={hist.r.length > 0} wallMode={w?.wallMode || 'cut'} topView={!!w?.topView}
          onUndo={undo} onRedo={redo} onChange={change} onGhost={startGhost} actions={actions} onDone={() => setEditing(false)}
        />
      )}
      <ShopModal />
      <Panels />
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

/** Turkish genitive with vowel harmony: Oğuzhan'ın, Ayşe'nin, Umut'un, Gönül'ün */
export function possessive(name: string) {
  const v = [...name.toLocaleLowerCase('tr')].reverse().find((c) => 'aeıioöuü'.includes(c)) ?? 'e';
  const suf = { a: 'ın', ı: 'ın', e: 'in', i: 'in', o: 'un', u: 'un', ö: 'ün', ü: 'ün' }[v]!;
  return `${name}'${'aeıioöuü'.includes(name.slice(-1).toLocaleLowerCase('tr')) ? 'n' : ''}${suf}`;
}
export const itemName = (id: string) => itemById(id)?.name ?? PW.ITEM?.[id]?.name ?? id;
