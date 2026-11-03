// Friends and blocks (v1 features.js S.friends / S.blocked), kept on the server profile so they follow the account.
// v1 rules: the friend code is your id in capitals; adding is one-sided (no request); adding someone unblocks them.
import { z } from 'zod';
import { PlayerId, PlayerSecret } from './protocol';
import { cleanName } from './chat';

export interface SocialEntry { n: string; at: number }
export interface Social { friends: Record<string, SocialEntry>; blocked: Record<string, SocialEntry> }
export const SOCIAL_MAX = 200;

export const emptySocial = (): Social => ({ friends: {}, blocked: {} });
export const friendCode = (pid: string) => pid.toUpperCase();

/** "#alix xxxx…" → "alixxxx…" or null */
export function parseFriendCode(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.replace(/[\s#-]/g, '').toLowerCase();
  return PlayerId.safeParse(s).success ? s : null;
}

export const SocialOp = z.enum(['add', 'remove', 'block', 'unblock']);
export const FriendsRequest = z.object({
  pid: PlayerId, secret: PlayerSecret, op: z.enum(['list', 'add', 'remove', 'block', 'unblock']),
  target: PlayerId.optional(), name: z.string().max(40).optional(),
});

export type SocialResult = { ok: true; social: Social } | { ok: false; reason: 'self' | 'limit' };

export function socialOp(s: Social, o: { op: z.infer<typeof SocialOp>; target: string; name?: string }, self: string, now: number): SocialResult {
  const friends = { ...s.friends }, blocked = { ...s.blocked };
  const t = o.target;
  if ((o.op === 'add' || o.op === 'block') && t === self) return { ok: false, reason: 'self' };
  if (o.op === 'add') {
    if (!friends[t] && Object.keys(friends).length >= SOCIAL_MAX) return { ok: false, reason: 'limit' };
    friends[t] = { n: cleanName(o.name) || friends[t]?.n || blocked[t]?.n || 'Arkadaş', at: friends[t]?.at ?? now };
    delete blocked[t];
  } else if (o.op === 'block') {
    if (!blocked[t] && Object.keys(blocked).length >= SOCIAL_MAX) return { ok: false, reason: 'limit' };
    blocked[t] = { n: cleanName(o.name) || friends[t]?.n || 'Oyuncu', at: now };
  } else if (o.op === 'remove') delete friends[t];
  else delete blocked[t];
  return { ok: true, social: { friends, blocked } };
}

const cleanList = (v: unknown): Record<string, SocialEntry> => {
  const out: Record<string, SocialEntry> = {};
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  for (const [k, e] of Object.entries(v as Record<string, unknown>).slice(0, SOCIAL_MAX)) {
    if (!PlayerId.safeParse(k).success || !e || typeof e !== 'object') continue;
    const n = cleanName((e as SocialEntry).n), at = Number((e as SocialEntry).at);
    if (n && Number.isFinite(at)) out[k] = { n, at };
  }
  return out;
};
export function sanitizeSocial(v: unknown): Social {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<Social>;
  return { friends: cleanList(o.friends), blocked: cleanList(o.blocked) };
}
