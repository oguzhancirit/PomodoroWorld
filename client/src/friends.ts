// Friends and blocks (step 4e, v1 features.js friendsHTML / S.blocked). The server keeps them on your profile and
// says who is online and where. Without a server (demo / offline) the same rules run in this browser only.
import { create } from 'zustand';
import { emptySocial, sanitizeSocial, socialOp, friendCode, type Social } from '@pw/shared';
import { HTTP_BASE, DEMO_ONLY } from './config';
import { identity } from './identity';
import { useStore } from './store';

export interface FriendWhere { owner: string; ownerName: string; name: string; open: boolean; n: number; cap: number; phase: string }
export interface FriendView { pid: string; code: string; n: string; online: boolean; seen: number; where?: FriendWhere }
type Op = 'list' | 'add' | 'remove' | 'block' | 'unblock';

interface FriendsState { code: string; friends: FriendView[]; blocked: { pid: string; n: string }[]; loaded: boolean; offline: boolean }
export const useFriends = create<FriendsState>(() => ({ code: '', friends: [], blocked: [], loaded: false, offline: false }));

const LOCAL_KEY = 'pw2.social';
const loadLocal = (): Social => { try { return sanitizeSocial(JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null')); } catch { return emptySocial(); } };
function showLocal(s: Social) {
  useFriends.setState({
    code: friendCode(identity().pid), loaded: true, offline: true,
    friends: Object.entries(s.friends).map(([pid, f]) => ({ pid, code: friendCode(pid), n: f.n, online: false, seen: 0 })),
    blocked: Object.entries(s.blocked).map(([pid, e]) => ({ pid, n: e.n })),
  });
}
function local(op: Op, target?: string, name?: string): string {
  let s = loadLocal();
  if (op !== 'list' && target) {
    const r = socialOp(s, { op, target, name }, identity().pid, Date.now());
    if (!r.ok) return r.reason === 'self' ? 'Bu senin kendi kodun.' : 'Liste dolu.';
    s = r.social; try { localStorage.setItem(LOCAL_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }
  showLocal(s); return '';
}

/** returns '' when it worked, otherwise a message for the player */
export async function friendsCall(op: Op, target?: string, name?: string): Promise<string> {
  if (DEMO_ONLY || useStore.getState().mode === 'demo') return local(op, target, name);
  try {
    const r = await fetch(`${HTTP_BASE}/api/friends`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...identity(), op, target, name }) });
    const d = await r.json();
    if (!d.ok) return d.error || 'Olmadı, tekrar dene.';
    useFriends.setState({ code: d.code, friends: d.friends, blocked: d.blocked, loaded: true, offline: false });
    return '';
  } catch { return local(op, target, name); }
}

export const isFriend = (code: string) => !!code && useFriends.getState().friends.some((f) => f.pid === code);
export const isBlocked = (code: string) => !!code && useFriends.getState().blocked.some((b) => b.pid === code);

/** v1 "ago": 5 dk önce, 3 sa önce, 2 gün önce */
export function ago(t: number, now = Date.now()) {
  if (!t) return 'uzun zaman önce';
  const m = Math.floor((now - t) / 60_000);
  return m < 1 ? 'az önce' : m < 60 ? `${m} dk önce` : m < 1440 ? `${Math.floor(m / 60)} sa önce` : `${Math.floor(m / 1440)} gün önce`;
}
