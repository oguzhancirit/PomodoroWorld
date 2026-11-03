// Step 4g: the social spaces of v1 (Meydan Kafe, Çatı Terası, Oyun Salonu), drawn from the old layouts
// (generated SOCIAL_SPACES in roomCatalog.ts). A place to meet in breaks: chat is open, timers stay personal.
import { SOCIAL_SPACES } from './roomCatalog';
import type { Room, PlacedItem, WallId } from './room';

export interface SocialSpace { id: string; name: string; desc: string; theme: string; view: string; mood?: string; size: number; npc: number; items: readonly (readonly (string | number)[])[] }
export const SOCIAL = SOCIAL_SPACES as unknown as readonly SocialSpace[];
/** v1 ROOM_CAP: a crowd is split into parallel salons */
export const SOCIAL_CAP = 16;
export const isSocialId = (id: unknown): id is string => typeof id === 'string' && SOCIAL.some((s) => s.id === id);

export function socialRoom(id: string): Room | null {
  const s = SOCIAL.find((x) => x.id === id); if (!s) return null;
  // floor items are [id, x, z, quarter turns]; wall items are [id, 'w0'..'w3', x] (v1 layout format)
  const items: PlacedItem[] = s.items.map((it) => (typeof it[1] === 'string'
    ? { id: String(it[0]), w: it[1] as WallId, x: Number(it[2]) }
    : { id: String(it[0]), x: Number(it[1]), z: Number(it[2]), r: Number(it[3] ?? 0) }));
  return { name: s.name, desc: s.desc, cat: 'Genel', open: true, token: '', ban: [], theme: s.theme, view: s.view, size: s.size, ...(s.mood ? { mood: s.mood } : {}), items };
}
