// "Odam" — the player's own room, drawn by the original room engine with the original editor rules.
import { useEffect, useRef, useState, useCallback } from 'react';
import { available, itemById, levelFromXP, activityFor, ROOM_KEYS, avatarAllowed, defaultAvatar, encodeAvatar, defaultRoom, type Room, type PlacedItem } from '@pw/shared';
import { useStore } from '../store';
import { saveRoom, refreshWallet } from '../economy';
import { WalletChip, ShopModal } from '../ui/Wallet';
import { ToolButtons, Panels } from '../ui/Panels';
import { engine, defOf, lookOf, hist, PW, type World } from './engine';
import { EditBar } from './EditBar';
import { SnakeGame } from '../ui/SnakeGame';
import { useRoomLikes } from '../likes';
import { TimerCard, ChatPanel, EmoteBar, DaySummary, NetBanner } from '../ui/RoomUI';
import { FocusScreen, useCompanions, isRunning } from './FocusScreen';
import { TravelScreen } from '../ui/Travel';
import { cinema } from './cinema';
import { RoomSettings, useRoomSettings } from './RoomSettings';
import { PersonCard, openPerson, PeopleSheet, usePeople } from './PersonCard';
import { useFriends, friendsCall, isBlocked } from '../friends';
import { RewardToast } from '../ui/Wallet';
import { LevelUp } from '../ui/LevelUp';
import { Tour } from './Tour';
import { WorldButton, WorldPanel } from '../ui/World';
import { openHome, leaveRoom, openProfile, sendSit, sendRaw } from '../net';
import { useCalls, CallPanel, IncomingCallCard, BonusCard, BoostBadge } from '../calls';
import { WakeCurtain } from '../wake';
import { attachPower } from './power';

type Ghost = { id: string; r: number; extra: Record<string, unknown> } | null;

export function HomeRoom() {
  const [game, setGame] = useState(false); // the Oyun Salonu console game
  const myRoom = useStore((s) => s.room), wallet = useStore((s) => s.wallet), profile = useStore((s) => s.profile), setProfile = useStore((s) => s.setProfile);
  const place = useStore((s) => s.place);
  // a friend's room: draw the look the server sends; my room: my saved room (editing stays mine only)
  const visiting = !!place && !place.mine;
  const library = place?.kind === 'library';
  const room: Room | null = visiting ? (place.layout ? { ...defaultRoom(), ...JSON.parse(place.layout), name: place.name } : null) : myRoom;
  const look = room ? lookOf(room) : '';
  const host = useRef<HTMLDivElement>(null), tags = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  // the first-run film (v1 PW.cinema) borrows the engine: the room's own drawing waits while it plays
  const [film, setFilm] = useState(false);
  const live = ready && !film;
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  // v1 focus screen: alone → "Odaklan", a friend in the room → "Birlikte odaklan"
  const [focusOpen, setFocus] = useState(false);
  // someone here is focusing on their own timer: "Birlikte odaklan" lets me join it
  const together = useCompanions().some(isRunning);
  const mode = useStore((s) => s.mode);
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
  // friends and blocks: needed for the person card, "X geldi" and hiding blocked people
  const blocked = useFriends((s) => s.blocked);
  useEffect(() => { void friendsCall('list'); }, []);
  // v1: the camera comes close to your desk while the focus screen is open
  // only undo the focus camera after it was used: before the room is drawn the engine has no base distance yet,
  // and setFocusCam(null) would set the camera distance to NaN for good (the room then never shows)
  const focusCamOn = useRef(false);
  useEffect(() => {
    const w = engine.world; if (!live || engine.film || !w || editing) return;
    if (focusOpen) { if (w.avatars.get('me')?.seatIdx == null) seatMe(); w.setFocusCam('me'); focusCamOn.current = true; }
    else if (focusCamOn.current) { focusCamOn.current = false; w.setFocusCam(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusOpen, live, editing]);

  /* ---------- battery: draw fewer frames when nobody is looking (power.ts) ---------- */
  const power = useRef<ReturnType<typeof attachPower> | null>(null);
  useEffect(() => {
    const w = engine.world; if (!ready || !w) return;
    const pw = attachPower(w as never, () => !!engine.film); power.current = pw;
    return () => { pw.stop(); power.current = null; };
  }, [ready]);
  useEffect(() => { power.current?.setFocus(focusOpen); }, [focusOpen, ready]);

  /* ---------- engine lifetime ---------- */
  useEffect(() => {
    if (!host.current || !tags.current) return;
    const lite = new URLSearchParams(location.search).has('lite') || matchMedia('(max-width: 600px)').matches;
    let w: World;
    try { w = new PW.World(host.current, tags.current, { quality: lite ? 'low' : 'high' }); } catch (e) { console.warn('room engine failed', e); setFailed(true); return; }
    engine.world = w; (window as unknown as { __world: World }).__world = w;
    // three.js asks the GPU for an error report after every new shader, which makes each one wait; only do that while developing
    try { w.renderer.debug.checkShaderErrors = import.meta.env.DEV; } catch { /* ignore */ }
    w.onClick = (ev: { type: string; id?: string; index?: number; idx?: number; x?: number; z?: number }) => {
      if (ev.type === 'edit-select') { setSel(ev.index ?? -1); return; }
      if (latest.current.editing) return;
      // v1: clicking someone opens their person card
      if (ev.type === 'avatar' && ev.id && ev.id !== 'me') { openPerson(ev.id); return; }
      // the chair you pick is your chair: the room hears it, so starting a focus keeps you there (user 2026-11-04)
      if (ev.type === 'seat' && ev.idx != null) { if (w.sitAvatar('me', ev.idx) !== false) sendSit(ev.idx); w.setAct('me', 'idle'); }
      else if (ev.type === 'floor' && ev.x != null) w.walkTo('me', ev.x, ev.z);
    };
    w.onPlace = (pos: PlacedItem) => placeItem(pos);
    w.onInvalidPlace = () => flash('Buraya sığmıyor, başka bir yer dene.');
    // a placed piece dragged to a new spot (legacy/placement.ts): one change, can be undone
    w.onMoveItem = (idx: number, pos: PlacedItem) => {
      change((x) => { if (x.items[idx]) x.items[idx] = { ...x.items[idx], ...pos } as PlacedItem; return x; }, true);
      setSel(idx);
    };
    setReady(true);
    return () => { engine.world = null; try { w.renderer.setAnimationLoop?.(null); w.renderer.dispose(); w.renderer.domElement.remove(); } catch { /* ignore */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- the player, sitting at the desk ---------- */
  const level = wallet ? levelFromXP(wallet.xp).level : 1;
  // the new character (decision b): only pieces you own, like in the study room
  const myCode = encodeAvatar(!wallet || avatarAllowed(wallet, profile.avatar) ? profile.avatar : defaultAvatar(profile.avatar.g));
  useEffect(() => {
    const w = engine.world; if (!live || engine.film || !w || !room) return;
    if (!w.avatars.has('me')) w.addAvatar('me', myCode, { name: profile.name || 'Sen', level, isMe: true });
    else w.updateAvatarInfo?.('me', { name: profile.name || 'Sen', level, isMe: true, cfg: myCode });
  }, [live, room, profile.name, myCode, level]);

  /* ---------- the intro film: once for a new player, or when asked again from "Karakterim" ---------- */
  useEffect(() => {
    if (!ready || film || !room || !place?.mine || profile.introSeen || editing) return;
    const t = setTimeout(async () => {
      engine.film = true; setFilm(true); setFocus(false);
      const done = await cinema.play({ name: profile.name || 'Sen', avatar: myCode, level, style: activityFor(profile.category) }, { first: true });
      engine.film = false; setProfile({ introSeen: true }); setFilm(false);
      // a brand-new player watched the film before making a character: now the character screen
      if (!useStore.getState().profile.made) { done?.(); useStore.getState().set({ screen: 'lobby' }); return; }
      // the room is drawn again by its own effects; then lift the black curtain
      setTimeout(() => done?.(), 500);
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, film, room, place?.mine, profile.introSeen, editing]);

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
  // the seat the room gave me last: only a new one moves me (walking off or another chair is not undone on every update)
  const mySeat = useRef<number | null>(null);
  useEffect(() => {
    const w = engine.world; if (!live || engine.film || !w || editing) return;
    // everyone has their own timer: the tag over each head shows that person's own phase
    const statusOf = (ph?: string) => (ph === 'focus' ? 'focus' : !ph || ph === 'idle' ? '' : 'break');
    const here = new Set<string>(['me']);
    for (const p of Object.values(players)) {
      const key = p.id === meId ? 'me' : p.id;
      // a blocked person is not drawn at all (v1 S.blocked)
      if (key !== 'me' && isBlocked(p.code ?? '')) continue;
      here.add(key);
      if (key !== 'me') {
        if (!w.avatars.has(key)) w.addAvatar(key, p.avatar, { name: p.name, level: p.level ?? 1 });
        const a = w.avatars.get(key);
        if (p.seatIndex >= 0) { if (a.seatIdx !== p.seatIndex) w.sitAvatar(key, p.seatIndex); } else if (a.seatIdx != null) w.standAvatar(key);
      } else if (p.seatIndex >= 0 && p.seatIndex !== mySeat.current) { mySeat.current = p.seatIndex; if (w.avatars.get('me')?.seatIdx !== p.seatIndex) w.sitAvatar('me', p.seatIndex); }
      const ph = key === 'me' ? phase : p.phase;
      w.updateAvatarInfo(key, { name: key === 'me' ? (profile.name || 'Sen') : p.name, level: p.level ?? 1, status: statusOf(ph), ...(key === 'me' ? {} : { cfg: p.avatar }) });
      w.setAct(key, ph === 'focus' ? p.activity : p.bubble ? 'talk' : 'idle');
      // a new chat line becomes a speech bubble over the head
      if (p.bubble && seen.current[key] !== p.bubble) w.bubble(key, p.bubble);
      seen.current[key] = p.bubble;
    }
    for (const id of [...w.avatars.keys()] as string[]) if (!here.has(id)) w.removeAvatar(id);
  // `tick` changes right after a room is drawn: seats of the new room exist only then (a library has 10)
  }, [live, editing, players, meId, phase, look, profile.name, blocked, tick]);
  const emoted = useRef<Record<string, number>>({});
  useEffect(() => {
    const w = engine.world; if (!live || engine.film || !w) return;
    for (const [id, v] of Object.entries(emotes)) if (emoted.current[id] !== v.until) { emoted.current[id] = v.until; w.emote(id === meId ? 'me' : id, v.e); }
  }, [live, emotes, meId]);

  /* ---------- draw the room whenever its look changes ---------- */
  useEffect(() => {
    const w = engine.world; if (!live || engine.film || !w || !room) return;
    w.loadRoom(defOf(room)); mySeat.current = null;
    if (!w.avatars.has('me')) w.addAvatar('me', myCode, { name: profile.name || 'Sen', level, isMe: true });
    if (latest.current.editing) {
      w.setEdit(true); parkMe();
      const g = pendingGhost.current; pendingGhost.current = null;
      if (g) w.startGhost(g.id, g.r, g.extra);
    } else seatMe();
    setTick((t) => t + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, look]);

  useEffect(() => {
    const w = engine.world; if (!live || engine.film || !w) return;
    w.setEdit(editing); w.hideTags = editing; setSel(-1);
    if (editing) parkMe();
    else { if (w.wallMode && w.wallMode !== 'cut') w.setWallMode('cut'); if (w.topView) w.toggleTopView(); seatMe(); }
    setTick((t) => t + 1);
  }, [live, editing, parkMe, seatMe]);
  // the focus screen hides the name tags, chat bubbles and the state gem: nothing to pull your eyes away
  useEffect(() => { const w = engine.world; if (live && w) w.hideTags = editing || focusOpen; }, [live, editing, focusOpen]);
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
    // a thing you can make your own (own words, colour, design): select it right away so its options show
    const def = PW.ITEM[pos.id] as { text?: number; tint?: number; vars?: number } | undefined;
    if (def && (def.text || def.vars) && !pendingGhost.current) {
      const idx = r.items.length;
      setTimeout(() => { engine.world?.select(idx); setSel(idx); flash(def.text ? 'Şimdi altta kendi yazını yaz!' : 'Altta desenini seç!', 3500); }, 350);
    }
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
      pendingGhost.current = { id: it.id, r: 'r' in it ? it.r : 0, extra: 'w' in it ? { c: it.c, t: it.t, v: it.v } : { c: it.c, wd: it.wd, t: it.t, v: it.v } };
      change((x) => ({ ...x, items: x.items.filter((_, i) => i !== sel) }));
    },
    copy() {
      if (!selItem || 'w' in selItem || !wallet || !room) return;
      if (available(wallet, room, selItem.id) <= 0) { flash('Envanterde yok. Aynısından bir tane daha mağazadan alabilirsin.'); return; }
      startGhost(selItem.id, selItem.r || 0, { c: selItem.c, wd: selItem.wd });
    },
    tint(k: 'c' | 'wd', v: string) { if (!selItem || 'w' in selItem) return; change((x) => { (x.items[sel] as Record<string, unknown>)[k] = v; return x; }, true); },
    /** personal touches on any item: colour, own text, design number */
    touch(k: 'c' | 't' | 'v', v: string | number) { if (!selItem) return; change((x) => { const it = x.items[sel] as Record<string, unknown>; if (v === '') delete it[k]; else it[k] = v; return x; }, true); },
    walls() { const w = engine.world; if (!w) return; const next = ({ cut: 'up', up: 'down', down: 'cut' } as Record<string, string>)[w.wallMode || 'cut']; w.setWallMode(next); flash({ cut: 'Kesik duvarlar', up: 'Duvarlar yukarıda', down: 'Duvarlar aşağıda' }[next]!); setTick((t) => t + 1); },
    top() { engine.world?.toggleTopView(); setTick((t) => t + 1); },
    cancel() { engine.world?.cancelGhost(); setTick((t) => t + 1); },
    place() { engine.world?.placeGhost(); setTick((t) => t + 1); },
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
        <div className="brand"><span className="dot" />{library ? place.name || 'Kütüphane' : place?.kind === 'social' ? place.name : visiting ? (place.ownerName ? `${possessive(place.ownerName)} odası` : 'Arkadaşının odası') : room?.name || 'Odam'}{visiting && !library && place?.kind !== 'social' && room?.name && <small className="owner-note"> · {room.name}</small>}</div>
        <LikeChip owner={place && !library && place.kind !== 'social' ? place.owner : ''} mine={!!place?.mine} />
        {place && <button className="people-pill people-btn" title="Odadakiler: arkadaş ekle, sayacına katıl, odandan çıkar" onClick={() => usePeople.setState({ open: true })}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2" /><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M15.5 13.7c2.9-.4 5.5 1.5 5.5 4.8" /></svg>{Object.keys(players).length} / {place.cap}</button>}
        <WalletChip />
        <BoostBadge />
        {!editing && !visiting && place?.mine && <button className="acc ico-btn call-btn" onClick={() => useCalls.setState({ panel: true })} title="Arkadaşını odana çağır"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M19 8v6M16 11h6" /></svg><span className="lbl">Arkadaş çağır</span></button>}
        {!editing && <ToolButtons />}
        {!editing && !visiting && <button className="acc ico-btn" onClick={() => setEditing(true)} title="Odayı düzenle"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13 7l4 4" /></svg><span className="lbl">Odayı düzenle</span></button>}
        {visiting && <button className="acc ico-btn" onClick={() => { leaveRoom(); }} title="Odama dön"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1z" /></svg><span className="lbl">Odama dön</span></button>}
        {!editing && !visiting && <button className="ghost ico-btn" onClick={() => useRoomSettings.setState({ open: true })} title="Oda ayarları"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></svg><span className="lbl">Ayarlar</span></button>}
        {!editing && !visiting && <button className="ghost ico-btn" onClick={openProfile} title="Karakterim"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg><span className="lbl">Karakterim</span></button>}
        {!editing && <WorldButton />}
      </header>
      {/* no written hint in the room any more: the guided tour shows the buttons once (user, 2026-11-03) */}
      {!editing && <div className={`room-ui home-ui ${focusOpen ? 'focusing' : ''}`}>{/* focus screen open: nothing around it to distract (user, 2026-11-03) */}{!focusOpen && <><TimerCard onOpen={() => setFocus(true)} together={together} /><ChatPanel /><EmoteBar /><DaySummary />{(place?.owner === 'social:oyun' || (place?.mine && myRoom?.items.some((it) => it.id === 'f_console'))) && <button className="mg-open" onClick={() => setGame(true)}>🎮 Konsolda oyna</button>}</>}<NetBanner /><RewardToast /></div>}<LevelUp />{game && <SnakeGame onClose={() => setGame(false)} />}
      <WakeCurtain show={!visiting && !room} />
      <Tour run={live && !editing && !focusOpen && !visiting && !!place?.mine && profile.introSeen} />
      {!editing && focusOpen && <FocusScreen onClose={() => setFocus(false)} />}
      <WorldPanel />
      <CallPanel send={sendRaw} here={Object.values(players).map((p) => p.code ?? '')} />
      <IncomingCallCard send={sendRaw} />
      <BonusCard />
      {editing && room && wallet && (
        <EditBar
          room={room} wallet={wallet} level={level} sel={sel} selItem={selItem} placing={placing} tick={tick}
          canUndo={hist.u.length > 0} canRedo={hist.r.length > 0} wallMode={w?.wallMode || 'cut'} topView={!!w?.topView}
          onUndo={undo} onRedo={redo} onChange={change} onGhost={startGhost} actions={actions} onDone={() => setEditing(false)}
        />
      )}
      <ShopModal />
      <Panels />
      {!editing && <PersonCard canKick={!visiting} />}
      {!editing && <PeopleSheet />}
      <HomeNotice />
      <TravelScreen />
      {!visiting && <RoomSettings />}
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

/** ❤ likes of the room you are in: like a friend's room once; in your own room, see how many liked it */
function LikeChip({ owner, mine }: { owner: string; mine: boolean }) {
  const { likes, like } = useRoomLikes(owner);
  if (!owner || !likes || (mine && likes.n === 0)) return null;
  if (mine) return <span className="like-chip" title="Odanı beğenen kişi sayısı">❤ {likes.n}</span>;
  return <button className={`like-chip btn ${likes.liked ? 'on' : ''}`} disabled={likes.liked} onClick={like} title={likes.liked ? 'Bu odayı beğendin' : 'Bu odayı beğen'}>{likes.liked ? '❤' : '♡'} {likes.liked ? 'Beğendin' : 'Beğen'} · {likes.n}</button>;
}
