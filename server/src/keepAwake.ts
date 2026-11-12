// The free host puts the server to sleep after 15 minutes without a web request, and an open game line does not
// count. The browser knocks every 4 minutes, but a tab in the background (Safari, a sleeping laptop, a throttled
// Chrome tab) stops knocking, the server went to sleep under people and they saw "Bağlantı koptu" (user 2026-11-12).
// So the server knocks on its own public address (the host's front door) as long as someone is playing.
export interface KeepAwake { url: string | undefined; everyMs: number; busy(): boolean; knock(url: string): Promise<unknown> }

export function startKeepAwake({ url, everyMs, busy, knock }: KeepAwake): () => void {
  if (!url) return () => {};
  const health = url.replace(/\/+$/, '') + '/health';
  const t = setInterval(() => { if (busy()) knock(health).catch(() => { /* next time */ }); }, everyMs);
  t.unref?.();
  return () => clearInterval(t);
}
