// Talks to the Colyseus server and copies the room state into the store.
import { Client, Callbacks, CloseCode, type Room } from '@colyseus/sdk';
import { encodeAvatar, activityFor, parseInvite, type Activity, type Phase } from '@pw/shared';
import { useStore } from './store';
import { LocalRoom, type TimerAction } from './localRoom';
import { useTodos } from './todos';

import { SERVER, DEMO_ONLY } from './config';
import { identity } from './identity';
import { sanitizeWallet } from '@pw/shared';
export { DEMO_ONLY };
let room: Room | null = null;
let local: LocalRoom | null = null;

export function startDemo() {
  leaveQuiet();
  local = new LocalRoom(useStore.getState().profile.fast ? 60 : 1);
}

const NOTICES: Record<string, string> = {
  chat_closed: 'Odak sırasında sohbet kapalı. Molada açılır.',
  slow_down: 'Biraz yavaş: 3 saniyede bir mesaj.',
};

export async function joinStudyRoom() {
  const st = useStore.getState();
  if (DEMO_ONLY) { startDemo(); return true; }
  const { profile } = st;
  leaveQuiet();
  st.set({ net: 'connecting', error: '', players: {}, chat: [], emotes: {}, place: null });
  try {
    const client = new Client(SERVER);
    room = await client.joinOrCreate('study_room', {
      ...identity(), name: profile.name, avatar: encodeAvatar(profile.avatar), preset: profile.preset, activity: activityFor(profile.category), category: profile.category,
    });
  } catch (e) {
    console.warn('join failed, falling back to demo mode', e);
    startDemo(); useStore.getState().flash('Sunucuya ulaşılamadı: bot arkadaşlarla deneme modundasın.', 5000);
    return true;
  }
  wire(room, 'room');
  return true;
}

/* ---------- step 4: your own room is live; friends join it ---------- */
let homeJob = 0;
/** open my room (only I can) */
export const openHome = () => joinHome(identity().pid, '');
/** go to a friend's room from an invite code or link */
export function visitHome(code: string) {
  const c = parseInvite(code);
  if (!c) { useStore.getState().flash('Bu davet kodu geçersiz.'); return Promise.resolve(false); }
  return joinHome(c.owner, c.token);
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
    const client = new Client(SERVER);
    const opts = { ...identity(), owner, token: token || undefined, name: profile.name, avatar: encodeAvatar(profile.avatar), preset: profile.preset, activity: activityFor(profile.category), category: profile.category };
    r = mine ? await client.joinOrCreate('home', opts) : await client.join('home', opts);
  } catch (e) {
    if (job !== homeJob) return false;
    const msg = (e as Error)?.message || '';
    if (mine) {
      // no server: my room still works in this browser with a local timer
      console.warn('home join failed, local room', e); local?.leave(); local = new LocalRoom(st.profile.fast ? 60 : 1, 'home', false); return true;
    }
    st.set({ net: room || local ? 'online' : 'idle' });
    st.flash(/[ğüşıöçĞÜŞİÖÇ]/.test(msg) ? msg : 'Bu oda şu an açık değil.', 5000);
    return false;
  }
  if (job !== homeJob) { r.leave(true).catch(() => {}); return false; }
  leaveQuiet();
  room = r;
  st.set({ players: {}, chat: [], emotes: {}, place: { owner, mine, name: '', layout: '', cap: 2 } });
  wire(r, 'home');
  const cb = Callbacks.get(r);
  const put = (k: 'name' | 'layout' | 'ownerName') => (v: unknown) => { const p = useStore.getState().place; if (p) useStore.getState().set({ place: { ...p, [k]: String(v ?? '') } }); };
  cb.listen('name', put('name')); cb.listen('layout', put('layout')); cb.listen('ownerName', put('ownerName'));
  if (!mine) st.flash('Arkadaşının odasına girdin. Sayaç herkes için aynı.', 4000);
  return true;
}
export const sendTimer = (action: TimerAction) => (local ? local.timerAction(action) : room?.send('timer', { action, preset: useStore.getState().profile.preset }));

/** copy the server room into the store (study room and home rooms alike) */
function wire(r: Room, screen: 'room' | 'home') {
  const st = useStore.getState();
  st.set({ net: 'online', mode: 'online', me: r.sessionId, screen });
  const cb = Callbacks.get(r);
  cb.listen('preset', (v) => useStore.getState().set({ preset: v as string }));
  // the state arrives a moment after joining: subscribe to the timer object when it shows up
  const syncTimer = (t: any) => useStore.getState().set({ timer: { phase: t.phase as Phase, phaseEndsAt: t.phaseEndsAt, round: t.round, pausedLeft: t.pausedLeft || 0 } });
  cb.listen('timer', (t: any) => { if (!t) return; syncTimer(t); cb.onChange(t, () => syncTimer(t)); });
  cb.onAdd('players', (p: any, id: string) => {
    const put = () => useStore.getState().upsertPlayer(id, { level: p.level, name: p.name, avatar: p.avatar, seatIndex: p.seatIndex, pose: p.pose, activity: p.activity as Activity, bubble: p.bubble, connected: p.connected });
    put(); cb.onChange(p, put);
  });
  cb.onRemove('players', (_p: unknown, id: string) => useStore.getState().removePlayer(id));
  r.onMessage('chat', (m: { id: string; name: string; text: string; at: number }) => useStore.getState().addChat(m));
  r.onMessage('emote', (m: { id: string; e: string }) => {
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
  r.onDrop(() => useStore.getState().set({ net: 'reconnecting' }));
  r.onReconnect(() => { useStore.getState().set({ net: 'online' }); r.send('time', { t0: Date.now() }); });
  r.onLeave((code: number) => {
    if (code === CloseCode.CONSENTED) return;
    if (room !== r) return;
    useStore.getState().set({ net: 'offline', error: code === CloseCode.FAILED_TO_RECONNECT ? 'Bağlantı koptu.' : 'Odadan çıkıldı.' });
  });
}

function leaveQuiet() {
  const r = room; room = null; r?.leave(true).catch(() => {});
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
