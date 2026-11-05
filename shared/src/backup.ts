// Step 5: backup (v1 "Yedeği indir / Yedekten yükle"). Coins, levels and the room live on the server, under your
// account key; the file keeps that key plus what only this browser knows (name, look, to-dos, sounds…), so the
// same account opens anywhere. A file never carries coins: the server is the only judge of those.
import { PlayerId, PlayerSecret } from './protocol';

export const BACKUP_KEYS = ['pw2.identity', 'pw2.profile', 'pw2.todos', 'pw2.sound', 'pw2.social', 'pw2.wallet', 'pw2.room', 'pw2.hintOff'] as const;
export const BACKUP_MAX = 2_000_000;
export type BackupResult = { ok: true; data: Record<string, string> } | { ok: false; reason: 'json' | 'app' | 'old' | 'identity' | 'size' };

/** `store` = what localStorage holds under each key (null = nothing) */
export function makeBackup(store: Record<string, string | null | undefined>, now: number): string {
  const data: Record<string, unknown> = {};
  for (const k of BACKUP_KEYS) { const v = store[k]; if (typeof v !== 'string') continue; try { data[k] = JSON.parse(v); } catch { /* skip broken */ } }
  return JSON.stringify({ app: 'pomodoro-world', v: 2, at: new Date(now).toISOString(), data });
}

export function readBackup(text: string): BackupResult {
  if (text.length > BACKUP_MAX) return { ok: false, reason: 'size' };
  let o: unknown; try { o = JSON.parse(text); } catch { return { ok: false, reason: 'json' }; }
  if (!o || typeof o !== 'object' || (o as { app?: unknown }).app !== 'pomodoro-world') return { ok: false, reason: 'app' };
  const b = o as { v?: unknown; data?: unknown };
  if (b.v !== 2 || !b.data || typeof b.data !== 'object') return { ok: false, reason: 'old' };
  const src = b.data as Record<string, unknown>;
  const idv = src['pw2.identity'] as { pid?: unknown; secret?: unknown } | undefined;
  if (!idv || !PlayerId.safeParse(idv.pid).success || !PlayerSecret.safeParse(idv.secret).success) return { ok: false, reason: 'identity' };
  const data: Record<string, string> = {};
  for (const k of BACKUP_KEYS) {
    const v = src[k];
    // stored values are objects (or a plain flag like hintOff); anything else is dropped
    if (k === 'pw2.hintOff') { if (v === 1 || v === '1') data[k] = '1'; continue; }
    if (v && typeof v === 'object') data[k] = JSON.stringify(k === 'pw2.identity' ? { pid: idv.pid, secret: idv.secret } : v);
  }
  return { ok: true, data };
}
