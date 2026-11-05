// Google sign-in without our own password system: the browser gets a signed ID token from Google, we ask Google
// whether it is real and made for our app, then the Google account id decides which player this is.
import crypto from 'node:crypto';
import { PlayerId } from '@pw/shared';
import type { ProfileStore, Look } from './profiles';

export interface GoogleUser { sub: string; name?: string; given?: string; picture?: string }
const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

/** Google's own check of the token (tokeninfo); null when it is fake, expired or for another app */
export async function verifyGoogle(credential: string, clientId: string, fetchFn: typeof fetch = fetch, now = Date.now()): Promise<GoogleUser | null> {
  if (!credential || !clientId || credential.length > 4096) return null;
  try {
    const r = await fetchFn(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!r.ok) return null;
    const t = await r.json() as Record<string, string>;
    if (t.aud !== clientId || !ISSUERS.has(t.iss) || !(Number(t.exp) * 1000 > now) || !/^\d{1,40}$/.test(t.sub ?? '')) return null;
    return { sub: t.sub, name: t.name, given: t.given_name, picture: t.picture };
  } catch { return null; }
}

/** the player id of a Google account: always the same, and it never shows the Google id itself */
export const googlePid = (sub: string) => 'g' + crypto.createHash('sha256').update('google:' + sub).digest('hex').slice(0, 19);

const newSecret = () => crypto.randomBytes(30).toString('base64url');

/** Signs in: same id for the same account, a fresh secret for this browser. A guest's progress moves into a new account. */
export function googleLogin(store: ProfileStore, user: { sub: string }, guest?: { pid?: unknown; secret?: unknown } | null): { pid: string; secret: string; isNew: boolean; moved: boolean; look: Look | null } {
  const pid = googlePid(user.sub), secret = newSecret();
  const fresh = !store.get(pid);
  const from = fresh && guest && PlayerId.safeParse(guest.pid).success && guest.pid !== pid && store.get(guest.pid as string) ? store.open(guest.pid, guest.secret) : null;
  const { p, isNew } = store.rekey(pid, secret, from);
  return { pid, secret, isNew, moved: !!from, look: p.look ?? null };
}
