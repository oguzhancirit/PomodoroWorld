// Room likes (user 2026-11-03): ask the server how many people liked a room, and like a friend's room once.
import { useEffect, useState } from 'react';
import { HTTP_BASE, DEMO_ONLY } from './config';
import { identity } from './identity';

async function call(owner: string, op: 'get' | 'like'): Promise<{ n: number; liked: boolean } | null> {
  if (DEMO_ONLY || !owner) return null;
  try {
    const r = await fetch(`${HTTP_BASE}/api/like`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...identity(), owner, op }) });
    const d = await r.json(); return d.ok ? { n: Number(d.n) || 0, liked: !!d.liked } : null;
  } catch { return null; }
}

/** likes of the room owned by `owner` ('' = none); `like()` adds yours */
export function useRoomLikes(owner: string) {
  const [s, setS] = useState<{ n: number; liked: boolean } | null>(null);
  useEffect(() => { let live = true; setS(null); call(owner, 'get').then((r) => live && setS(r)); return () => { live = false; }; }, [owner]);
  return { likes: s, like: async () => { const r = await call(owner, 'like'); if (r) setS(r); } };
}
