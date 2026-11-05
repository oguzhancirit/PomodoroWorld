// Room likes (user 2026-11-03): a visitor can like a friend's room once, so a room that shows someone's style gets
// noticed. Kept on the owner's profile: the total and the most recent likers (to stop double likes).
import { PlayerId } from './protocol';

export interface Likes { n: number; by: string[] }
export const LIKES_KEEP = 500;
export const emptyLikes = (): Likes => ({ n: 0, by: [] });

export function likeRoom(l: Likes, visitor: string, owner: string): { ok: true; likes: Likes } | { ok: false; reason: 'self' | 'already' } {
  if (visitor === owner) return { ok: false, reason: 'self' };
  if (l.by.includes(visitor)) return { ok: false, reason: 'already' };
  return { ok: true, likes: { n: l.n + 1, by: [...l.by, visitor].slice(-LIKES_KEEP) } };
}

export function sanitizeLikes(v: unknown): Likes {
  if (!v || typeof v !== 'object') return emptyLikes();
  const o = v as { n?: unknown; by?: unknown };
  const by = (Array.isArray(o.by) ? o.by : []).filter((x): x is string => PlayerId.safeParse(x).success).slice(-LIKES_KEEP);
  const n = typeof o.n === 'number' && Number.isFinite(o.n) ? Math.floor(o.n) : 0;
  return { n: Math.max(n, by.length), by };
}
