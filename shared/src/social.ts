// Step 4g: the social spaces of v1 (Meydan Kafe, Çatı Terası, Oyun Salonu), drawn from the old layouts
// (generated SOCIAL_SPACES in roomCatalog.ts). A place to meet in breaks: chat is open, timers stay personal.
import { SOCIAL_SPACES } from './roomCatalog';
import type { Room, PlacedItem, WallId } from './room';

/** a layout entry: [id, x, z, quarter turns, {extras}] or [id, wall, x, 0, {extras}] (extras: t words, c colour, v design) */
type Entry = readonly (string | number | Readonly<Record<string, string | number>>)[];
/** the place's own look (user 2026-11-04: every place its own atmosphere) */
export const SOCIAL_LOOK = ['fx', 'wall', 'wallPat', 'floorT', 'floorC', 'trim', 'curtain'] as const;
export interface SocialSpace { id: string; name: string; desc: string; theme: string; view: string; mood?: string; size: number; npc: number; items: readonly Entry[]; fx?: string; wall?: string; wallPat?: string; floorT?: string; floorC?: string; trim?: string; curtain?: string }
export const SOCIAL = SOCIAL_SPACES as unknown as readonly SocialSpace[];
/** v1 ROOM_CAP: a crowd is split into parallel salons */
export const SOCIAL_CAP = 16;
/** Turkish case endings: going there (dative) and being there (locative) */
export const SOCIAL_TO: Record<string, string> = { meydan: "Meydan Kafe'ye", teras: "Çatı Terası'na", oyun: "Oyun Salonu'na" };
export const SOCIAL_AT: Record<string, string> = { meydan: "Meydan Kafe'de", teras: "Çatı Terası'nda", oyun: "Oyun Salonu'nda" };
export const isSocialId = (id: unknown): id is string => typeof id === 'string' && SOCIAL.some((s) => s.id === id);

export function socialRoom(id: string): Room | null {
  const s = SOCIAL.find((x) => x.id === id); if (!s) return null;
  // floor items are [id, x, z, quarter turns]; wall items are [id, 'w0'..'w3', x] (v1 layout format)
  const items = s.items.map((it) => {
    const ex = (it.slice(3).find((v) => v && typeof v === 'object') ?? {}) as Record<string, string | number>;
    return (typeof it[1] === 'string'
      ? { ...ex, id: String(it[0]), w: it[1] as WallId, x: Number(it[2]) }
      : { ...ex, id: String(it[0]), x: Number(it[1]), z: Number(it[2]), r: Number(it[3] ?? 0) }) as PlacedItem;
  });
  const look: Record<string, string> = {};
  for (const k of SOCIAL_LOOK) if (s[k]) look[k] = s[k] as string;
  return { name: s.name, desc: s.desc, cat: 'Genel', open: true, token: '', ban: [], theme: s.theme, view: s.view, size: s.size, ...(s.mood ? { mood: s.mood } : {}), ...look, items } as Room;
}
