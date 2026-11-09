// Calling a friend into your room (user 2026-11-09): "Oğuzhan seni odasına çağırıyor" → Kabul et / Reddet.
// When a called friend really arrives, both get a one-time welcome: a pack of things and a week of double XP.
// Once per player, so new guest accounts cannot keep the double XP running forever.
import type { Wallet } from './economy';
import type { Social } from './friends';

export const BOOST_DAYS = 7;
export const BOOST_MS = BOOST_DAYS * 86_400_000;
/** "Hoş geldin paketi": coins, a floor cushion (a seat for the friend), two mugs, a polaroid string and a banner */
export const WELCOME_PACK = { coins: 300, items: { f_cushion: 1, d_mug: 2, w_polaroid: 1, w_garland: 1 } as Record<string, number> };
export const WELCOME_NAMES = ['300 jeton', 'Yer Minderi', '2 Kahve Kupası', 'Polaroid İpi', 'Harfli Flama'];
/** how long a call stays open on the friend's screen */
export const CALL_TTL_MS = 90_000;

export const boostActive = (w: Pick<Wallet, 'boostUntil'>, now: number) => (w.boostUntil ?? 0) > now;

export function grantCallBonus(w0: Wallet, now: number): { wallet: Wallet; got: boolean } {
  if (w0.welcome) return { wallet: w0, got: false };
  const owned = { ...w0.owned };
  for (const [id, n] of Object.entries(WELCOME_PACK.items)) owned[id] = (owned[id] ?? 0) + n;
  return { wallet: { ...w0, owned, coins: w0.coins + WELCOME_PACK.coins, welcome: now, boostUntil: Math.max(w0.boostUntil ?? 0, now + BOOST_MS) }, got: true };
}

export type CallVerdict = 'ok' | 'self' | 'not_friend' | 'blocked';
/** I may call someone in my friends list who has not blocked me */
export function callAllowed(me: string, mine: Social, target: string, theirs: Social): CallVerdict {
  if (me === target) return 'self';
  if (!mine.friends[target]) return 'not_friend';
  if (theirs.blocked[me]) return 'blocked';
  return 'ok';
}
