// Talks to the Colyseus server and copies the room state into the store.
import { Client, Callbacks, CloseCode, type Room } from '@colyseus/sdk';
import { encodeAvatar, activityFor, parseInvite, hallOf, SOCIAL, SOCIAL_CAP, SOCIAL_TO, socialRoom, type Activity, type Phase } from '@pw/shared';
import { useStore } from './store';
import { LocalRoom, hallLayout, layoutOf, type TimerAction } from './localRoom';
import { isFriend, isBlocked } from './friends';
import { travel } from './ui/Travel';
import { useTodos } from './todos';
import { saveRoom } from './economy';

import { SERVER, DEMO_ONLY, HTTP_BASE } from './config';
import { identity } from './identity';
import { wakeServer, useWake } from './wake';
import { sanitizeWallet } from '@pw/shared';
export { DEMO_ONLY };
let room: Room | null = null;
let local: LocalRoom | null = null;
/** my running timer goes with me to the next room (the server checks it) */
function carried() {
  const st = useStore.getState(), t = st.timer;
  return t.phase === 'idle' ? undefined : { phase: t.phase, phaseEndsAt: t.phaseEndsAt, round: t.round, pausedLeft: t.pausedLeft ?? 0, preset: st.preset };
}
/** the latest join wins: an older, slower join is dropped */
let homeJob = 0;

const NOTICES: Record<string, string> = {
  chat_closed: 'Odak sırasında sohbet kapalı. Molada açılır.',
  slow_down: 'Biraz yavaş: 3 saniyede bir mesaj.',
};

/* ---------- step 4f: the 10-seat library (replaces the old study hall and its bot fallback) ---------- */
/** enter a library (a friend's one when `roomId` is given); demo mode runs it in this browser with bot classmates */
export const joinLibrary = (roomId?: string) => joinHall('library', roomId);
/** a public study hall: the library or "Pist 25" (user 2026-11-08) */
export const joinHall = (hallId: string, roomId?: string) => travel(`${hallOf(hallId).to} gidiliyor`, enterLibrary(roomId, hallOf(hallId).id));
async function enterLibrary(roomId?: string, hallId = 'library'): Promise<boolean> {
  const hall = hallOf(hallId);
  const st = useStore.getState(), job = ++homeJob;
  if (DEMO_ONLY) { leaveQuiet(); local = new LocalRoom(st.profile.fast ? 60 : 1, 'library', true, hall.id); return true; }
  const { profile } = st;
  let r: Room;
  try {
    await wakeServer(); // a sleeping free server first wakes up (banner on top)
    const client = new Client(SERVER);
    const opts = { ...identity(), name: profile.name, avatar: encodeAvatar(profile.avatar), preset: carried()?.preset ?? profile.preset, activity: activityFor(profile.category), category: profile.category, timer: carried() };
    r = roomId ? await client.joinById(roomId, opts) : await client.joinOrCreate(hall.id, opts);
  } catch (e) {
    if (job !== homeJob) return false;
    console.warn('library join failed', e);
    st.flash(roomId ? `${hall.name} dolu ya da kapandı. Dünya’dan tekrar dene.` : `${hall.to} bağlanılamadı. İnternetini kontrol edip tekrar dene.`, 5000);
    return false;
  }
  if (job !== homeJob) { quit(r); return false; }
  leaveQuiet();
  room = r;
  st.set({ players: {}, chat: [], emotes: {}, place: { kind: 'library', hall: hall.id, owner: 'library', mine: false, name: hall.name, layout: hallLayout(hall.id), cap: hall.seats } });
  wire(r, 'home');
  st.flash(hall.id === 'pist25' ? 'Pist 25’e hoş geldin, kaptan. Kemerini bağla: herkes kendi sayacıyla uçar.' : 'Kütüphanedesin. Herkes kendi sayacıyla çalışır; istersen birinin sayacına katıl.', 4500);
  return true;
}

/* ---------- step 4g: social spaces (v1 Meydan Kafe, Çatı Terası, Oyun Salonu) ---------- */
export const joinSocial = (space: string, roomId?: string) => travel(`${SOCIAL_TO[space] ?? 'Sosyal alana'} gidiliyor`, enterSocial(space, roomId));
async function enterSocial(space: string, roomId?: string): Promise<boolean> {
  const st = useStore.getState(), job = ++homeJob;
  if (DEMO_ONLY) { leaveQuiet(); local = new LocalRoom(st.profile.fast ? 60 : 1, 'social', true, space); return true; }
  const { profile } = st;
  let r: Room;
  try {
    await wakeServer(); // a sleeping free server first wakes up (banner on top)
    const client = new Client(SERVER);
    const opts = { ...identity(), space, name: profile.name, avatar: encodeAvatar(profile.avatar), preset: carried()?.preset ?? profile.preset, activity: activityFor(profile.category), category: profile.category, timer: carried() };
    r = roomId ? await client.joinById(roomId, opts) : await client.joinOrCreate('social', opts);
  } catch (e) {
    if (job !== homeJob) return false;
    console.warn('social join failed', e);
    st.flash('Oraya şu an girilemedi. Biraz sonra tekrar dene.', 5000);
    return false;
  }
  if (job !== homeJob) { quit(r); return false; }
  leaveQuiet();
  room = r;
  const def = socialRoom(space);
  st.set({ players: {}, chat: [], emotes: {}, place: { kind: 'social', owner: 'social:' + space, mine: false, name: SOCIAL.find((s) => s.id === space)?.name ?? '', layout: def ? layoutOf(def) : '', cap: SOCIAL_CAP } });
  wire(r, 'home');
  return true;
}

/* ---------- step 4: your own room is live; friends join it ---------- */
/** open my room (only I can) */
// The free host puts the server to sleep after 15 minutes without a web request, and an open game connection does
// not count: during a long focus everyone was dropped ("Bağlantı koptu", live 2026-11-04). While someone is in a
// room we knock every 4 minutes, so the server stays up exactly as long as people are playing.
if (!DEMO_ONLY) setInterval(() => { if (room) fetch(`${HTTP_BASE}/health`, { cache: 'no-store' }).catch(() => {}); }, 4 * 60_000);

let replaced: Room | null = null;
export const openHome = () => joinHome(identity().pid, '');
/** go to a friend's room from an invite code or link */
export function visitHome(code: string) {
  const c = parseInvite(code);
  if (!c) { useStore.getState().flash('Bu davet kodu geçersiz.'); return Promise.resolve(false); }
  return travel('Arkadaşının odasına gidiliyor', joinHome(c.owner, c.token));
}
async function joinHome(owner: string, token: string): Promise<boolean> {
  const st = useStore.getState(), mine = owner === identity().pid, job = ++homeJob;
  if (DEMO_ONLY) {
    if (!mine) { st.flash('Deneme modunda başkasının odasına gidilemez.'); return false; }
    local?.leave(); local = new LocalRoom(st.profile.fast ? 60 : 1, 'home'); return true;
  }
  const { profile } = st;
  st.set({ net: 'connecting', error: '' });
  let r: Room;
  try {
    await wakeServer();
    const client = new Client(SERVER);
    const opts = { ...identity(), owner, token: token || undefined, name: profile.name, avatar: encodeAvatar(profile.avatar), preset: carried()?.preset ?? profile.preset, activity: activityFor(profile.category), category: profile.category, timer: carried() };
    r = mine ? await client.joinOrCreate('home', opts) : await client.join('home', opts);
  } catch (e) {
    if (job !== homeJob) return false;
    const msg = (e as Error)?.message || '';
    if (mine) {
      // no server: my room still works in this browser with a local timer
      console.warn('home join failed, local room', e); local?.leave(); local = new LocalRoom(st.profile.fast ? 60 : 1, 'home', false); return true;
    }
    console.warn('visit failed', msg);
    st.set({ net: room || local ? 'online' : 'idle' });
    st.flash(/[ğüşıöçĞÜŞİÖÇ]/.test(msg) ? msg : 'Bu oda şu an açık değil.', 5000);
    return false;
  }
  if (job !== homeJob) { quit(r); return false; }
  leaveQuiet();
  room = r;
  st.set({ players: {}, chat: [], emotes: {}, place: { owner, mine, name: '', layout: '', cap: 2 } });
  wire(r, 'home');
  const cb = Callbacks.get(r);
  const put = (k: 'name' | 'layout' | 'ownerName') => (v: unknown) => { const p = useStore.getState().place; if (p) useStore.getState().set({ place: { ...p, [k]: String(v ?? '') } }); };
  cb.listen('name', put('name')); cb.listen('layout', put('layout')); cb.listen('ownerName', put('ownerName'));
  if (!mine) st.flash('Arkadaşının odasına girdin. Herkes kendi sayacını kurar; “Birlikte odaklan” ile ona katılabilirsin.', 4500);
  return true;
}
export const sendTimer = (action: TimerAction) => (local ? local.timerAction(action) : room?.send('timer', { action, preset: useStore.getState().profile.preset }));

/** copy the server room into the store (study room and home rooms alike) */
function wire(r: Room, screen: 'room' | 'home') {
  const joinedAt = Date.now();
  const st = useStore.getState();
  st.set({ net: 'online', mode: 'online', me: r.sessionId, screen });
  const cb = Callbacks.get(r);
  if (screen === 'room') {
    // the old shared hall: one timer for the room
    cb.listen('preset', (v) => useStore.getState().set({ preset: v as string }));
    const syncTimer = (t: any) => useStore.getState().set({ timer: { phase: t.phase as Phase, phaseEndsAt: t.phaseEndsAt, round: t.round, pausedLeft: t.pausedLeft || 0 } });
    cb.listen('timer', (t: any) => { if (!t) return; syncTimer(t); cb.onChange(t, () => syncTimer(t)); });
  } else {
    // personal timers: each player carries their own; mine drives my timer card and focus screen
    r.onStateChange((state: any) => {
      state.players?.forEach((p: any, id: string) => {
        const t = p.timer; if (!t) return;
        const v = { phase: t.phase as Phase, phaseEndsAt: t.phaseEndsAt, pausedLeft: t.pausedLeft || 0, round: t.round, preset: p.preset as string };
        const st = useStore.getState(), cur = st.players[id];
        if (cur && cur.phase === v.phase && cur.phaseEndsAt === v.phaseEndsAt && cur.pausedLeft === v.pausedLeft && cur.round === v.round && cur.preset === v.preset) return;
        st.upsertPlayer(id, v);
        if (id === r.sessionId) st.set({ timer: { phase: v.phase, phaseEndsAt: v.phaseEndsAt, round: v.round, pausedLeft: v.pausedLeft }, preset: v.preset });
      });
    });
  }
  cb.onAdd('players', (p: any, id: string) => {
    const put = () => useStore.getState().upsertPlayer(id, { code: p.code || '', level: p.level, name: p.name, avatar: p.avatar, seatIndex: p.seatIndex, pose: p.pose, activity: p.activity as Activity, bubble: p.bubble, connected: p.connected });
    put(); cb.onChange(p, put);
    // v1: "Ali geldi" when a friend walks in (not for the people already there when I arrive)
    if (Date.now() - joinedAt > 3000 && id !== r.sessionId && isFriend(p.code) && !isBlocked(p.code)) useStore.getState().flash(`${p.name} geldi · arkadaşın odaya girdi.`, 4000);
  });
  cb.onRemove('players', (_p: unknown, id: string) => useStore.getState().removePlayer(id));
  // a blocked person's lines never show (v1 S.blocked)
  const blockedId = (id: string) => isBlocked(useStore.getState().players[id]?.code ?? '');
  r.onMessage('chat', (m: { id: string; name: string; text: string; at: number }) => { if (!blockedId(m.id)) useStore.getState().addChat(m); });
  // the game was opened again somewhere else (another tab or device): this one steps aside and stays out
  r.onMessage('replaced', () => { replaced = r; });
  r.onMessage('kicked', () => { useStore.getState().flash('Oda sahibi seni odasından çıkardı.', 5000); leaveRoom(); });
  r.onMessage('emote', (m: { id: string; e: string }) => {
    if (blockedId(m.id)) return;
    const until = Date.now() + 2600;
    useStore.setState((s) => ({ emotes: { ...s.emotes, [m.id]: { e: m.e, until } } }));
    setTimeout(() => useStore.setState((s) => { if (s.emotes[m.id]?.until !== until) return s; const emotes = { ...s.emotes }; delete emotes[m.id]; return { emotes }; }), 2700);
  });
  r.onMessage('wallet', (m: { wallet: unknown }) => useStore.getState().set({ wallet: sanitizeWallet(m.wallet) }));
  r.onMessage('reward', (m: { gained: { xp: number; coins: number }; lines: string[]; levelUp: number; wallet: unknown; completed?: boolean; minutes?: number }) => {
    useStore.getState().set({ wallet: sanitizeWallet(m.wallet), reward: { ...m.gained, lines: m.lines, levelUp: m.levelUp, at: Date.now() } });
    todoProgress(m.minutes ?? 0, !!m.completed);
  });
  r.onMessage('notice', (m: { code: string }) => useStore.getState().flash(NOTICES[m.code] ?? m.code));
  r.onMessage('phase', (m: { phase: Phase }) => {
    const text = m.phase === 'focus' ? 'Odak başladı. Sohbet kapandı.' : m.phase === 'long_break' ? 'Uzun mola! Sohbet açık.' : 'Mola zamanı. Sohbet açık.';
    useStore.getState().addChat({ id: 'sys', name: '', text, at: Date.now(), system: true });
    chime(m.phase === 'focus' ? 523 : 784);
  });
  r.onMessage('time', (m: { t0: number; server: number }) => {
    const rtt = Date.now() - m.t0; useStore.getState().set({ clockOffset: m.server + rtt / 2 - Date.now() });
  });
  r.send('time', { t0: Date.now() });
  // a quiet room sends nothing for minutes, and the host's door closes a connection after 5 silent minutes
  // (measured live 2026-11-04: dropped after 309 s of quiet). A tiny clock check every 50 s keeps it talking both ways.
  const talk = setInterval(() => { if (room !== r) return clearInterval(talk); try { r.send('time', { t0: Date.now() }); } catch { /* reconnecting */ } }, 50_000);
  // only the room you are in may talk about the connection
  r.onDrop(() => { if (room === r) useStore.getState().set({ net: 'reconnecting' }); });
  r.onReconnect(() => { if (room !== r) return; useStore.getState().set({ net: 'online' }); r.send('time', { t0: Date.now() }); });
  r.onLeave((code: number) => {
    clearInterval(talk);
    if (code === CloseCode.CONSENTED) return;
    if (room !== r) return;
    const st = useStore.getState();
    if (replaced === r) { room = null; st.set({ net: 'offline', error: 'Oyun başka bir pencerede açıldı.' }); return; }
    // the server restarted (an update, or the free host woke it again) and forgot the room: we cannot slip back
    // into it, so in the game screen we simply join again from the start (live, 2026-11-04: stuck on "Bağlantı koptu")
    if (st.screen === 'home') {
      room = null; useWake.setState({ state: 'idle' });
      st.set({ net: 'idle', error: '', players: {}, me: '', place: null, chat: [] }); // HomeRoom opens your room again
      return;
    }
    st.set({ net: 'offline', error: code === CloseCode.FAILED_TO_RECONNECT ? 'Bağlantı koptu.' : 'Odadan çıkıldı.' });
  });
}

function quit(r: Room) { r.reconnection.enabled = false; r.removeAllListeners(); r.leave(true).catch(() => {}); }
function leaveQuiet() {
  const r = room; room = null;
  // a room we left stays silent for good (live 2026-11-04: after "Karakterim" the old line closed 30 s later on
  // the host, the game kept trying to get back into the room it had left and showed "Bağlantı koptu" every time)
  if (r) quit(r);
  local?.leave(); local = null;
}
/** leave the room and open the character screen (name, look, timer length); "Odama dön" brings you back */
export function openProfile() {
  leaveQuiet();
  useStore.getState().set({ screen: 'lobby', net: 'idle', players: {}, me: '', place: null, chat: [] });
}
/** leave the current room and go home: your own room is where the game lives */
export function leaveRoom() {
  leaveQuiet();
  useStore.getState().set({ screen: 'home', net: 'idle', players: {}, me: '', place: null, chat: [] });
  // the room opens again by itself (HomeRoom); show the walk home until it is there
  void travel('Odana dönülüyor', new Promise<void>((res) => {
    const t0 = Date.now();
    const iv = setInterval(() => { const p = useStore.getState().place; if ((p && p.mine) || Date.now() - t0 > 8000) { clearInterval(iv); res(); } }, 100);
  }));
}
export const sendChat = (text: string) => (local ? local.chat(text) : room?.send('chat', { text }));
export const sendEmote = (e: string) => (local ? local.emoteMine(e) : room?.send('emote', { e }));
export const sendActivity = (activity: Activity, category?: string) => (local ? local.activity(activity, category) : room?.send('activity', { activity, category }));

/** a focus ended: the selected job moves forward; when its estimate is reached, ask if it is done */
export function todoProgress(minutes: number, completed: boolean) {
  const full = useTodos.getState().focusDone(minutes, completed);
  if (full) useStore.getState().flash(`“${full.t}” için tahmin doldu (${full.done}/${full.est}). Bittiyse Yapılacaklar'dan işaretle.`, 6000);
}
export const sendSit = (seatIndex: number) => (local ? local.sit(seatIndex) : room?.send('sit', { seatIndex }));

// tiny two-note chime made on the device (no audio files)
function chime(freq: number) {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext; if (!AC) return;
    const ctx = new AC(); const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9);
    o.start(); o.stop(ctx.currentTime + 1); setTimeout(() => ctx.close(), 1200);
  } catch { /* audio is optional */ }
}
/** person card "Odamdan çıkar": only the room owner; the server checks */
export const sendKick = (id: string) => {
  if (local) { local.kick(id); return; }
  room?.send('kick', { id });
  // keep my copy of the room in step with the server's ban list, or my next save would quietly lift the ban
  const st = useStore.getState(), code = st.players[id]?.code, mine = st.room;
  if (code && mine && st.place?.mine && !mine.ban.includes(code)) saveRoom({ ...mine, ban: [...mine.ban, code] });
};

/** the live room's id (to tell which library a friend is in) */
export const currentRoomId = () => room?.roomId ?? '';
/** "Birlikte": join someone's running timer (v1 followPeer) */
export const sendFollow = (id: string) => (local ? local.follow(id) : room?.send('follow', { id }));
