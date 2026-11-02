// Talks to the Colyseus server and copies the room state into the store.
import { Client, Callbacks, CloseCode, type Room } from '@colyseus/sdk';
import { encodeAvatar, activityFor, type Activity, type Phase } from '@pw/shared';
import { useStore } from './store';

const SERVER = (import.meta.env.VITE_SERVER_URL as string | undefined) || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:2567`;
let room: Room | null = null;

const NOTICES: Record<string, string> = {
  chat_closed: 'Odak sırasında sohbet kapalı. Molada açılır.',
  slow_down: 'Biraz yavaş: 3 saniyede bir mesaj.',
};

export async function joinStudyRoom() {
  const st = useStore.getState();
  const { profile } = st;
  st.set({ net: 'connecting', error: '', players: {}, chat: [], emotes: {} });
  try {
    const client = new Client(SERVER);
    room = await client.joinOrCreate('study_room', {
      name: profile.name, avatar: encodeAvatar(profile.avatar), preset: profile.preset, activity: activityFor(profile.category),
    });
  } catch (e) {
    st.set({ net: 'offline', error: 'Sunucuya bağlanılamadı. Biraz sonra tekrar dene.' });
    console.warn('join failed', e);
    return false;
  }
  const r = room;
  st.set({ net: 'online', me: r.sessionId, screen: 'room' });
  const cb = Callbacks.get(r);
  cb.listen('preset', (v) => useStore.getState().set({ preset: v as string }));
  // the state arrives a moment after joining: subscribe to the timer object when it shows up
  const syncTimer = (t: any) => useStore.getState().set({ timer: { phase: t.phase as Phase, phaseEndsAt: t.phaseEndsAt, round: t.round } });
  cb.listen('timer', (t: any) => { if (!t) return; syncTimer(t); cb.onChange(t, () => syncTimer(t)); });
  cb.onAdd('players', (p: any, id: string) => {
    const put = () => useStore.getState().upsertPlayer(id, { name: p.name, avatar: p.avatar, seatIndex: p.seatIndex, pose: p.pose, activity: p.activity as Activity, bubble: p.bubble, connected: p.connected });
    put(); cb.onChange(p, put);
  });
  cb.onRemove('players', (_p: unknown, id: string) => useStore.getState().removePlayer(id));
  r.onMessage('chat', (m: { id: string; name: string; text: string; at: number }) => useStore.getState().addChat(m));
  r.onMessage('emote', (m: { id: string; e: string }) => {
    const until = Date.now() + 2600;
    useStore.setState((s) => ({ emotes: { ...s.emotes, [m.id]: { e: m.e, until } } }));
    setTimeout(() => useStore.setState((s) => { if (s.emotes[m.id]?.until !== until) return s; const emotes = { ...s.emotes }; delete emotes[m.id]; return { emotes }; }), 2700);
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
    useStore.getState().set({ net: 'offline', error: code === CloseCode.FAILED_TO_RECONNECT ? 'Bağlantı koptu.' : 'Odadan çıkıldı.' });
  });
  return true;
}

export function leaveRoom() {
  room?.leave(true).catch(() => {}); room = null;
  useStore.getState().set({ screen: 'lobby', net: 'idle', players: {}, me: '' });
}
export const sendChat = (text: string) => room?.send('chat', { text });
export const sendEmote = (e: string) => room?.send('emote', { e });
export const sendActivity = (activity: Activity) => room?.send('activity', { activity });
export const sendSit = (seatIndex: number) => room?.send('sit', { seatIndex });

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
