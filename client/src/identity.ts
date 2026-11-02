// Who am I? A random player id + secret made once in this browser. The secret proves to the server
// that the id is yours. "Yedek" (backup) saves both, so you can restore your account elsewhere.
const KEY = 'pw2.identity';
export interface Identity { pid: string; secret: string }
const rand = (n: number, abc: string) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, (x) => abc[x % abc.length]).join(''); };
let cached: Identity | null = null;
export function identity(): Identity {
  if (cached) return cached;
  try { const raw = localStorage.getItem(KEY); if (raw) { const v = JSON.parse(raw); if (/^[a-z0-9]{12,24}$/.test(v.pid) && /^[A-Za-z0-9_-]{32,64}$/.test(v.secret)) return (cached = v); } } catch { /* storage blocked */ }
  cached = { pid: rand(16, 'abcdefghijklmnopqrstuvwxyz0123456789'), secret: rand(40, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-') };
  try { localStorage.setItem(KEY, JSON.stringify(cached)); } catch { /* ignore */ }
  return cached;
}
export function setIdentity(v: Identity) { cached = v; try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ } }
