// The shared notebook (zustand): UI state + a copy of what the server says.
// 3D components read small slices of it with selectors.
import { create } from 'zustand';
import { defaultAvatar, type Avatar, type Activity, type Phase, type Wallet } from '@pw/shared';

export interface PlayerView {
  id: string; name: string; level?: number; avatar: string; seatIndex: number; pose: string; activity: Activity; bubble: string; connected: boolean;
}
export interface ChatLine { id: string; name: string; text: string; at: number; system?: boolean }
export interface Profile { name: string; avatar: Avatar; preset: string; category: string; fast: boolean }

const PROFILE_KEY = 'pw2.profile';
function loadProfile(): Profile {
  const d: Profile = { name: '', avatar: defaultAvatar('f'), preset: 'p25', category: 'Ders', fast: true };
  try { const raw = localStorage.getItem(PROFILE_KEY); if (raw) return { ...d, ...JSON.parse(raw) }; } catch { /* private mode */ }
  return d;
}

export type Screen = 'lobby' | 'room';
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
  timer: { phase: Phase; phaseEndsAt: number; round: number };
  preset: string;
  clockOffset: number; // server time − local time (ms)
  chat: ChatLine[];
  emotes: Record<string, { e: string; until: number }>;
  notice: { text: string; until: number } | null;
  wallet: Wallet | null;
  reward: { xp: number; coins: number; lines: string[]; levelUp: number; at: number } | null;
  shop: boolean;
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
