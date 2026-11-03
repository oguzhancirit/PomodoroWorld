// The personal room, exactly as the original game stored it (js/app.js + js/safety.js),
// plus the rule the server needs: you may only show what you own and what your level allows.
import { cleanText, censor } from './chat';
import { ROOM_FURN, ROOM_THEMES, ROOM_VIEWS, ROOM_SIZES, FLOOR_TYPES, WALL_PATTERNS, MOOD_NAMES, SURFACE_LVL, MOOD_LVL, WOOD_TONE_IDS, OLD_DEFAULT_ROOM } from './roomCatalog';
import { levelFromXP, type Wallet } from './economy';

export type WallId = 'w0' | 'w1' | 'w2' | 'w3';
/** personal touches (user 2026-11-03): c colour, t own short text (neon sign, garland), v design number (posters…) */
export interface FloorItem { id: string; x: number; z: number; r: number; c?: string; wd?: string; t?: string; v?: number }
export interface WallItem { id: string; w: WallId; x: number; c?: string; t?: string; v?: number }
export const ITEM_TEXT_MAX = 18;
export const ITEM_VARIANTS = 16;
export type PlacedItem = FloorItem | WallItem;
export interface Room {
  name: string; desc: string; cat: string; open: boolean; token: string; ban: string[];
  theme: string; view: string; size: number;
  mood?: string; wall?: string; wallPat?: string; floorT?: string; floorC?: string; trim?: string; curtain?: string;
  items: PlacedItem[];
}
/** The look of a room (what undo/redo snapshots and what a visitor needs to draw it). */
export const ROOM_KEYS = ['items', 'theme', 'view', 'size', 'mood', 'wall', 'wallPat', 'floorT', 'floorC', 'trim', 'curtain'] as const;
export const ROOM_CATS = ['Genel', 'YKS', 'LGS', 'KPSS', 'ALES/YDS', 'Üniversite', 'Yazılım', 'Dil', 'Sanat & Tasarım', 'İş'];
export const MAX_ITEMS = 400;
const LIM = 6; // half of the largest room (11 x 11) plus a margin, like the old loader
const HEX = /^#[0-9a-f]{6}$/i;
const WALLS: WallId[] = ['w0', 'w1', 'w2', 'w3'];
const FURN = new Map<string, { wall?: number; seat?: number }>(ROOM_FURN.map((f) => [f.id, f as { wall?: number; seat?: number }]));
const THEMES = new Set<string>(ROOM_THEMES.map((t) => t.id));
const VIEWS = new Set<string>(ROOM_VIEWS.map((t) => t.id));
const SIZE_ID: Record<number, string> = Object.fromEntries(ROOM_SIZES.map((s) => [s.size, s.id]));
const FLOORS = new Set(FLOOR_TYPES.map((f) => f[0]));
const PATTERNS = new Set(WALL_PATTERNS.map((f) => f[0]));
const MOODS = new Set(MOOD_NAMES.map((m) => m[0]));
const WOODS = new Set<string>(WOOD_TONE_IDS);

const newToken = () => Math.random().toString(36).slice(2, 8).padEnd(6, '0');
// Step 4: the old default room plus a second chair across the desk, so a friend can study with you from day one.
// Both chairs sit 0.6 from the desk centre: the engine sees them as desk seats and the new avatar's hands reach the desk.
const FRIEND_CHAIR: FloorItem = { id: 'f_chair_wood', x: 0.2, z: -0.55, r: 2 };
export const defaultRoom = (): Room => {
  const r = { ...structuredClone(OLD_DEFAULT_ROOM), ban: [], token: newToken() } as Room;
  const own = r.items.find((i): i is FloorItem => i.id === 'f_chair_wood');
  if (own) own.z = -1.75;
  r.items.push({ ...FRIEND_CHAIR });
  return r;
};

const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, lo: number, hi: number, def: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def);
const str = (v: unknown, max: number, def = '') => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max) : def);
const round = (v: number) => Math.round(v * 1000) / 1000;

/** colour, own text (short, clean, rude words hidden) and design number, when they are valid */
function touches<T extends { c?: string; t?: string; v?: number }>(o: T, it: Record<string, unknown>): T {
  if (typeof it.c === 'string' && HEX.test(it.c)) o.c = it.c;
  const t = censor(cleanText(it.t, ITEM_TEXT_MAX).replace(/[<>]/g, '')).trim();
  if (t) o.t = t;
  if (typeof it.v === 'number' && Number.isInteger(it.v) && it.v >= 0 && it.v < ITEM_VARIANTS) o.v = it.v;
  return o;
}

function cleanItem(it: unknown): PlacedItem | null {
  if (!obj(it) || typeof it.id !== 'string') return null;
  const def = FURN.get(it.id); if (!def) return null;
  if (def.wall) {
    if (!WALLS.includes(it.w as WallId)) return null;
    return touches({ id: it.id, w: it.w as WallId, x: round(num(it.x, -LIM, LIM, 0)) }, it);
  }
  if (it.w) return null;
  const o: FloorItem = { id: it.id, x: round(num(it.x, -LIM, LIM, 0)), z: round(num(it.z, -LIM, LIM, 0)), r: Math.round(num(it.r, 0, 3, 0)) };
  if (typeof it.wd === 'string' && WOODS.has(it.wd)) o.wd = it.wd;
  return touches(o, it);
}

/** Repair a room that came from storage, an old save or the network. */
export function sanitizeRoom(v: unknown): Room {
  const d = defaultRoom(); if (!obj(v)) return d;
  const r: Room = {
    name: str(v.name, 32) || d.name, desc: str(v.desc, 90), cat: ROOM_CATS.includes(v.cat as string) ? (v.cat as string) : 'Genel',
    open: v.open == null ? true : !!v.open,
    token: typeof v.token === 'string' && /^[a-z0-9]{3,10}$/.test(v.token) ? v.token : d.token,
    ban: (Array.isArray(v.ban) ? v.ban : []).filter((x): x is string => typeof x === 'string' && x.length <= 40).slice(0, 200),
    theme: THEMES.has(v.theme as string) ? (v.theme as string) : d.theme,
    view: VIEWS.has(v.view as string) ? (v.view as string) : d.view,
    size: SIZE_ID[v.size as number] ? (v.size as number) : d.size,
    items: (Array.isArray(v.items) ? v.items : []).slice(0, MAX_ITEMS * 2).map(cleanItem).filter((x): x is PlacedItem => !!x).slice(0, MAX_ITEMS),
  };
  if (MOODS.has(v.mood as string)) r.mood = v.mood as string;
  for (const k of ['wall', 'floorC', 'trim', 'curtain'] as const) if (typeof v[k] === 'string' && HEX.test(v[k] as string)) r[k] = v[k] as string;
  if (PATTERNS.has(v.wallPat as string)) r.wallPat = v.wallPat as string;
  if (FLOORS.has(v.floorT as string)) r.floorT = v.floorT as string;
  return r;
}

export const placedCount = (room: Pick<Room, 'items'>, id: string) => room.items.reduce((n, i) => n + (i.id === id ? 1 : 0), 0);
export const available = (w: Wallet, room: Pick<Room, 'items'>, id: string) => (w.owned[id] ?? 0) - placedCount(room, id);
const has = (w: Wallet, id: string | undefined) => !!id && (w.owned[id] ?? 0) > 0;

/** The room as this wallet may show it: extra copies, unowned themes and locked surfaces fall back. */
export function roomAllowedFor(w: Wallet, room: unknown): Room {
  const r = sanitizeRoom(room); const d = defaultRoom(); const L = levelFromXP(w.xp).level;
  const left = new Map<string, number>();
  r.items = r.items.filter((it) => { const n = left.get(it.id) ?? (w.owned[it.id] ?? 0); if (n <= 0) return false; left.set(it.id, n - 1); return true; });
  if (!has(w, r.theme)) r.theme = d.theme;
  if (!has(w, r.view)) r.view = d.view;
  if (!has(w, SIZE_ID[r.size])) r.size = d.size;
  if (r.wallPat && L < (SURFACE_LVL[r.wallPat] ?? 1)) delete r.wallPat;
  if (r.floorT && L < (SURFACE_LVL[r.floorT] ?? 1)) delete r.floorT;
  if (r.mood && L < (MOOD_LVL[r.mood] ?? 1)) delete r.mood;
  return r;
}

/* ---------- step 4: friends study in your room; small rooms on purpose ---------- */
export const HOME_MIN = 2;
export const HOME_MAX = 5;
/** how many people can sit in this room (a sofa holds two, an L sofa three) */
export const roomSeats = (room: Pick<Room, 'items'>) => room.items.reduce((n, i) => n + (FURN.get(i.id)?.seat ?? 0), 0);
/** how many people may be in your room at once: its seats, at least you + one friend, at most HOME_MAX */
export const homeCapacity = (room: Pick<Room, 'items'>) => Math.max(HOME_MIN, Math.min(HOME_MAX, roomSeats(room)));

export type HomeVerdict = 'ok' | 'banned' | 'closed' | 'full';
/** May this player enter the owner's room now? (`count` = people already inside) */
export function homeEntry(room: Pick<Room, 'items' | 'open' | 'token' | 'ban'>, o: { pid: string; owner: string; count: number; token?: string }): HomeVerdict {
  if (o.pid === o.owner) return 'ok';
  if (room.ban.includes(o.pid)) return 'banned';
  if (!room.open && o.token !== room.token) return 'closed';
  return o.count >= homeCapacity(room) ? 'full' : 'ok';
}
/** the code a friend types or opens as a link (#oda-CODE), like the original game */
export const inviteCode = (owner: string, token: string) => `${owner}-${token}`;
export function parseInvite(input: unknown): { owner: string; token: string } | null {
  if (typeof input !== 'string') return null;
  const s = input.trim(); const at = s.lastIndexOf('#oda-');
  const m = /^([a-z0-9]{12,24})(?:-([a-z0-9]{3,10}))?$/.exec(at >= 0 ? s.slice(at + 5) : s);
  return m ? { owner: m[1], token: m[2] ?? '' } : null;
}
