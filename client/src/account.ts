// Who is signed in (step 6, user 2026-11-03): Google (no passwords of our own: Google proves who you are and our
// server maps that account to your player) or a guest (this browser only). New players then see the intro film,
// make their character, and start in their room with the tour.
import { create } from 'zustand';
import { decodeAvatar, encodeAvatar, cleanName } from '@pw/shared';
import { HTTP_BASE, DEMO_ONLY } from './config';
import { identity, setIdentity } from './identity';
import { useStore } from './store';
import { refreshWallet } from './economy';

export interface Account { kind: 'google' | 'guest'; name?: string; picture?: string; at: number }
const KEY = 'pw2.account';
const load = (): Account | null => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && (v.kind === 'google' || v.kind === 'guest') ? v : null; } catch { return null; } };
export const useAccount = create<{ account: Account | null }>(() => ({ account: load() }));
function save(a: Account | null) {
  try { if (a) localStorage.setItem(KEY, JSON.stringify(a)); else localStorage.removeItem(KEY); } catch { /* ignore */ }
  useAccount.setState({ account: a });
}

/** the Google client id comes from the build (VITE_GOOGLE_CLIENT_ID); without it the Google button explains why it is off */
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '';
export const googleReady = () => !!GOOGLE_CLIENT_ID && !DEMO_ONLY;

/** where to go after signing in: a known character goes home; a new one sees the film first, then makes the character */
export function startScreen() {
  const st = useStore.getState();
  if (!useAccount.getState().account) return st.set({ screen: 'login' });
  st.set({ screen: st.profile.made || !st.profile.introSeen ? 'home' : 'lobby' });
}

export function continueAsGuest() {
  save({ kind: 'guest', at: Date.now() });
  startScreen();
}

/* ---------- Google Identity Services (Google's own sign-in script and button) ---------- */
type Gis = { accounts: { id: { initialize(o: object): void; renderButton(el: HTMLElement, o: object): void; disableAutoSelect(): void } } };
let gis: Promise<Gis> | null = null;
function loadGis(): Promise<Gis> {
  return (gis ??= new Promise((ok, fail) => {
    const w = window as unknown as { google?: Gis };
    if (w.google?.accounts) return ok(w.google);
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => (w.google ? ok(w.google) : fail(new Error('gsi'))); s.onerror = () => { gis = null; fail(new Error('gsi')); };
    document.head.appendChild(s);
  }));
}
/** draws Google's button into el; onDone gets '' on success or a message for the player */
export async function mountGoogleButton(el: HTMLElement, onDone: (err: string, moved?: boolean) => void, width = 320) {
  const g = await loadGis();
  g.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: async (r: { credential: string }) => onDone(...(await signInWithGoogle(r.credential))), ux_mode: 'popup' });
  g.accounts.id.renderButton(el, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', logo_alignment: 'left', width, locale: 'tr' });
}

async function signInWithGoogle(credential: string): Promise<[string, boolean?]> {
  try {
    const r = await fetch(`${HTTP_BASE}/api/auth/google`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ credential, guest: identity() }) });
    const d = await r.json();
    if (!d.ok) return [d.error || 'Google girişi olmadı, tekrar dene.'];
    setIdentity({ pid: d.pid, secret: d.secret });
    const st = useStore.getState();
    if (d.look?.name && d.look?.avatar) {
      // a known account: the same character, straight to your room (no film, no tour again)
      st.setProfile({ name: d.look.name, avatar: decodeAvatar(d.look.avatar), introSeen: true, toured: true, made: true });
    } else if (!st.profile.name && d.google?.given) {
      st.setProfile({ name: cleanName(d.google.given) }); // fill the name for the character screen
    }
    save({ kind: 'google', name: d.google?.name || '', picture: d.google?.picture || '', at: Date.now() });
    await refreshWallet();
    pushLook();
    return ['', !!d.moved];
  } catch { return ['Sunucuya ulaşılamadı. İnternetini kontrol edip tekrar dene.']; }
}

/** keeps the account's look (name + avatar) up to date, so other devices open the same character */
let lastLook = '';
export function pushLook() {
  const a = useAccount.getState().account, p = useStore.getState().profile;
  const name = cleanName(p.name);
  if (a?.kind !== 'google' || DEMO_ONLY || !name) return;
  const body = { ...identity(), name, avatar: encodeAvatar(p.avatar) };
  const key = body.name + '|' + body.avatar; if (key === lastLook) return; lastLook = key;
  fetch(`${HTTP_BASE}/api/look`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => { lastLook = ''; });
}
let lookTimer = 0;
useStore.subscribe((s, prev) => {
  if (s.profile.name === prev.profile.name && s.profile.avatar === prev.profile.avatar) return;
  clearTimeout(lookTimer); lookTimer = window.setTimeout(pushLook, 1500);
});

/** signs out of Google on this device: the next person starts fresh here */
export function signOut() {
  try { (window as unknown as { google?: Gis }).google?.accounts.id.disableAutoSelect(); } catch { /* ignore */ }
  for (const k of ['pw2.identity', 'pw2.profile', KEY]) try { localStorage.removeItem(k); } catch { /* ignore */ }
  location.reload();
}
