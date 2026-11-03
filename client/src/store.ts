// The shared notebook (zustand): UI state + a copy of what the server says.
// 3D components read small slices of it with selectors.
import { create } from 'zustand';
import { defaultAvatar, type Avatar, type Activity, type Phase, type Wallet, type Room } from '@pw/shared';

export interface PlayerView {
  /** code: friend code (player id), '' for bots and guests */
  id: string; name: string; level?: number; avatar: string; code?: string;
  /** this person's own timer (home rooms and the library: everyone keeps their own time) */
  phase?: Phase; phaseEndsAt?: number; pausedLeft?: number; round?: number; preset?: string; seatIndex: number; pose: string; activity: Activity; bubble: string; connected: boolean;
}
export interface ChatLine { id: string; name: string; text: string; at: number; system?: boolean }
/** task: what I work on (v1 focus screen field) · recent: last tasks · custom: v1 "Özel" focus / break minutes */
/** introSeen: the first-run film was shown (v1 S.introSeen); toured: the guided tour ran once (v1 S.toured) */
export interface Profile { name: string; avatar: Avatar; preset: string; category: string; fast: boolean; task: string; recent: string[]; custom: { f: number; b: number }; introSeen: boolean; toured: boolean }

const PROFILE_KEY = 'pw2.profile';
function loadProfile(): Profile {
  const d: Profile = { name: '', avatar: defaultAvatar('f'), preset: 'p25', category: 'Ders', fast: true, task: '', recent: [], custom: { f: 40, b: 8 }, introSeen: false, toured: false };
  try { const raw = localStorage.getItem(PROFILE_KEY); if (raw) return { ...d, ...JSON.parse(raw) }; } catch { /* private mode */ }
  return d;
}

export type Screen = 'lobby' | 'room' | 'home';
/** the live room you are in on the "home" screen: yours, or a friend's (step 4) */
/** kind: 'library' = the public 10-seat library (step 4f); otherwise someone's own room */
export interface Place { kind?: 'home' | 'library' | 'social'; owner: string; mine: boolean; name: string; ownerName?: string; layout: string; cap: number }
export type NetStatus = 'idle' | 'connecting' | 'online' | 'reconnecting' | 'offline';

interface State {
  screen: Screen;
  profile: Profile;
  net: NetStatus;
  /** 'online' = real game server, 'demo' = rules simulated in this browser with bot classmates */
  mode: 'online' | 'demo';
  error: string;
  me: string;
  players: Record<string, PlayerView>;
  timer: { phase: Phase; phaseEndsAt: number; round: number; pausedLeft?: number };
  preset: string;
  clockOffset: number; // server time − local time (ms)
  chat: ChatLine[];
  emotes: Record<string, { e: string; until: number }>;
  notice: { text: string; until: number } | null;
  wallet: Wallet | null;
  reward: { xp: number; coins: number; lines: string[]; levelUp: number; at: number } | null;
  shop: boolean;
  /** shop tab to open with (the room editor sends people to the furniture tab) */
  shopTab: string;
  /** my personal room (old game format) */
  room: Room | null;
  place: Place | null;
  setProfile(p: Partial<Profile>): void;
  set(partial: Partial<State>): void;
  upsertPlayer(id: string, p: Partial<PlayerView>): void;
  removePlayer(id: string): void;
  addChat(line: ChatLine): void;
  flash(text: string, ms?: number): void;
}

export const useStore = create<State>((set, get) => ({
  screen: 'lobby',
  profile: loadProfile(),
  net: 'idle',
  mode: 'online',
  error: '',
  me: '',
  players: {},
  timer: { phase: 'idle', phaseEndsAt: 0, round: 0 },
  preset: 'p25',
  clockOffset: 0,
  chat: [],
  emotes: {},
  notice: null,
  wallet: null,
  reward: null,
  shop: false,
  shopTab: 'avatar',
  room: null,
  place: null,
  setProfile(p) {
    const profile = { ...get().profile, ...p };
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
    set({ profile });
  },
  set: (partial) => set(partial),
  upsertPlayer(id, p) { set((s) => ({ players: { ...s.players, [id]: { ...(s.players[id] ?? ({ id } as PlayerView)), ...p } } })); },
  removePlayer(id) { set((s) => { const players = { ...s.players }; delete players[id]; return { players }; }); },
  addChat(line) { set((s) => ({ chat: [...s.chat.slice(-79), line] })); },
  flash(text, ms = 3200) { set({ notice: { text, until: Date.now() + ms } }); },
}));

/** server-corrected "now" */
export const serverNow = () => Date.now() + useStore.getState().clockOffset;

// dev server only: lets browser checks poke the store (never in builds)
if (import.meta.env.DEV) (window as unknown as { __store: unknown }).__store = useStore;
