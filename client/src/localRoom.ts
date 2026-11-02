// Demo mode: the same study-room rules running inside the browser, with a few bot classmates.
// Used when no game server is reachable (for example inside a Claude artifact), so the 3D room,
// the shared timer rules, the chat rules and the animations can be tried from a plain link.
import {
  presetById, startTimer, settle, isChatAllowed, type Phase, type TimerState, type Preset,
  cleanText, censor, cleanName, CHAT_MAX, RateLimiter, STUDY_ROOM, firstFreeSeat, isSeatFree,
  PARTS, SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, encodeAvatar, activityFor, ACTIVITIES, type Activity, type Gender,
} from '@pw/shared';
import { useStore, type PlayerView } from './store';
import { rewardFocus, avatarAllowed, levelFromXP, defaultAvatar } from '@pw/shared';
import { loadLocalWallet, saveLocalWallet } from './economy';

const BOTS: [string, Gender][] = [['Elif', 'f'], ['Kerem', 'm'], ['Zeynep', 'f'], ['Deniz', 'm'], ['Ece', 'f']];
const BREAK_LINES = ['Mola! Su içmeyi unutmayın.', 'Bu turda 3 soru çözdüm.', 'Gözlerimi biraz dinlendireyim.', 'Kim kahve alıyor?', 'Bir tur daha, hadi!', 'Okuduğum bölüm çok iyiydi.', 'Biraz esneyelim mi?', 'Odaklanmak bugün kolay geldi.'];
const REPLIES = ['Selam {n}!', 'Aynen, mola iyi geldi.', 'Hadi bir tur daha birlikte.', 'Sen ne çalışıyorsun {n}?', 'Kolay gelsin {n}!'];
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

function randomAvatar(g: Gender): string {
  const P = PARTS[g];
  return encodeAvatar({
    g, head: pick(P.head.slice(0, 6)), body: pick(P.body), legs: pick(P.legs), feet: pick(P.feet),
    skin: Math.floor(Math.random() * SKIN_TONES.length), hair: Math.floor(Math.random() * HAIR_COLORS.length),
    top: Math.floor(Math.random() * CLOTH_COLORS.length), bottom: Math.floor(Math.random() * CLOTH_COLORS.length),
  });
}

export class LocalRoom {
  private preset: Preset;
  private baseFocusMin: number;
  private timer: TimerState;
  private loop = 0;
  private timeouts: number[] = [];
  private chatLimit = new RateLimiter(1, 3000);

  constructor(speed: number) {
    const st = useStore.getState();
    const base = presetById(st.profile.preset);
    this.baseFocusMin = base.focusMin;
    const wallet = loadLocalWallet();
    const look = avatarAllowed(wallet, st.profile.avatar) ? st.profile.avatar : defaultAvatar(st.profile.avatar.g);
    this.preset = speed === 1 ? base : { ...base, focusMin: base.focusMin / speed, shortMin: base.shortMin / speed, longMin: base.longMin / speed };
    this.timer = startTimer(Date.now(), this.preset);
    const players: Record<string, PlayerView> = {};
    const me: PlayerView = {
      id: 'me', name: cleanName(st.profile.name) || 'Sen', avatar: encodeAvatar(look), level: levelFromXP(wallet.xp).level, seatIndex: 5,
      pose: 'sit', activity: activityFor(st.profile.category), bubble: '', connected: true,
    };
    players.me = me;
    const taken = [5];
    BOTS.forEach(([n, g], i) => {
      const seat = firstFreeSeat(taken, STUDY_ROOM.seats.length); taken.push(seat);
      players['bot' + i] = { id: 'bot' + i, level: 2 + i * 3, name: n, avatar: randomAvatar(g), seatIndex: seat, pose: 'sit', activity: pick(ACTIVITIES), bubble: '', connected: true };
    });
    st.set({ wallet, net: 'online', mode: 'demo', me: 'me', players, preset: base.id, clockOffset: 0, chat: [], emotes: {}, screen: 'room', timer: { ...this.timer } });
    this.loop = window.setInterval(() => this.tick(), 250);
    this.later(1200, () => this.botSay('bot0', `Hoş geldin ${me.name}! Odak sırasında sohbet kapalı, molada konuşuruz.`, true));
  }

  private later(ms: number, fn: () => void) { this.timeouts.push(window.setTimeout(fn, ms)); }

  private tick() {
    const before = this.timer;
    const next = settle(before, this.preset, Date.now());
    if (next === before) return;
    this.timer = next;
    const st = useStore.getState();
    st.set({ timer: { ...next } });
    if (before.phase === 'focus') this.pay(before.round + 1);
    if (next.phase === 'focus') {
      for (const id of Object.keys(st.players)) st.upsertPlayer(id, { bubble: '' });
      st.addChat({ id: 'sys', name: '', text: 'Odak başladı. Sohbet kapandı.', at: Date.now(), system: true });
    } else {
      st.addChat({ id: 'sys', name: '', text: next.phase === 'long_break' ? 'Uzun mola! Sohbet açık.' : 'Mola zamanı. Sohbet açık.', at: Date.now(), system: true });
      const breakMs = next.phaseEndsAt - Date.now();
      // two bots chat and one waves during the break
      const ids = Object.keys(st.players).filter((x) => x !== 'me').sort(() => Math.random() - 0.5);
      const lines = [...BREAK_LINES].sort(() => Math.random() - 0.5);
      this.later(breakMs * 0.15, () => this.botSay(ids[0], lines[0]));
      this.later(breakMs * 0.45, () => this.botSay(ids[1], lines[1]));
      this.later(breakMs * 0.3, () => this.emote(ids[2], pick(['wave', 'coffee', 'cheer'])));
    }
  }

  /** same reward rule as the server; in demo mode the wallet lives in this browser */
  private pay(round: number) {
    const st = useStore.getState();
    const r = rewardFocus(st.wallet ?? loadLocalWallet(), { minutes: this.baseFocusMin, completed: true, round, others: Object.keys(st.players).length - 1, day: new Date().toISOString().slice(0, 10), longFocus: this.baseFocusMin >= 90 });
    saveLocalWallet(r.wallet);
    st.set({ wallet: r.wallet, reward: { ...r.gained, lines: r.lines, levelUp: r.levelUp, at: Date.now() } });
    st.upsertPlayer('me', { level: levelFromXP(r.wallet.xp).level });
  }

  private isChatOpen() { return isChatAllowed(this.timer.phase as Phase); }

  private botSay(id: string | undefined, text: string, force = false) {
    const st = useStore.getState(); const p = id && st.players[id];
    if (!p || (!force && !this.isChatOpen())) return;
    this.bubble(p.id, text);
    st.addChat({ id: p.id, name: p.name, text, at: Date.now() });
  }

  private bubble(id: string, text: string) {
    useStore.getState().upsertPlayer(id, { bubble: text });
    this.later(6000, () => { const p = useStore.getState().players[id]; if (p && p.bubble === text) useStore.getState().upsertPlayer(id, { bubble: '' }); });
  }

  private emote(id: string | undefined, e: string) {
    if (!id) return;
    const until = Date.now() + 2600;
    useStore.setState((s) => ({ emotes: { ...s.emotes, [id]: { e, until } } }));
    this.later(2700, () => useStore.setState((s) => { if (s.emotes[id]?.until !== until) return s; const emotes = { ...s.emotes }; delete emotes[id]; return { emotes }; }));
  }

  chat(raw: string) {
    const st = useStore.getState();
    if (!this.isChatOpen()) { st.flash('Odak sırasında sohbet kapalı. Molada açılır.'); return; }
    const text = censor(cleanText(raw, CHAT_MAX)); if (!text) return;
    if (!this.chatLimit.allow('me', Date.now())) { st.flash('Biraz yavaş: 3 saniyede bir mesaj.'); return; }
    this.bubble('me', text);
    st.addChat({ id: 'me', name: st.players.me?.name ?? 'Sen', text, at: Date.now() });
    if (Math.random() < 0.8) {
      const ids = Object.keys(st.players).filter((x) => x !== 'me');
      this.later(1400 + Math.random() * 1600, () => this.botSay(pick(ids), pick(REPLIES).replace('{n}', st.players.me?.name ?? '')));
    }
  }
  emoteMine(e: string) {
    this.emote('me', e);
    if (e === 'wave') { const ids = Object.keys(useStore.getState().players).filter((x) => x !== 'me'); this.later(900, () => this.emote(pick(ids), 'wave')); }
  }
  activity(a: Activity) { useStore.getState().upsertPlayer('me', { activity: a }); }
  sit(seat: number) {
    const st = useStore.getState();
    const taken = Object.values(st.players).filter((p) => p.id !== 'me').map((p) => p.seatIndex);
    if (isSeatFree(seat, taken, STUDY_ROOM.seats.length)) st.upsertPlayer('me', { seatIndex: seat });
  }
  leave() { clearInterval(this.loop); this.timeouts.forEach(clearTimeout); }
}
