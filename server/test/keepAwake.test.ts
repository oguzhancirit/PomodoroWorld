// The free host sleeps after 15 minutes without a web request; an open game line does not count. The browser knocked
// every 4 minutes, but a tab in the background (Safari, a sleeping laptop, a busy Chrome tab) stops knocking and
// everyone was dropped (user 2026-11-12). The server now knocks on its own front door while someone is playing.
import { describe, it, expect } from 'vitest';
import { startKeepAwake } from '../src/keepAwake';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('keep the free server awake while people play', () => {
  it('knocks on its own public address while someone is in a room', async () => {
    const hits: string[] = [];
    const stop = startKeepAwake({ url: 'https://pw.example.com', everyMs: 20, busy: () => true, knock: async (u) => { hits.push(u); } });
    await wait(75); stop();
    expect(hits.length).toBeGreaterThanOrEqual(2);
    expect(hits[0]).toBe('https://pw.example.com/health');
  });

  it('lets the server sleep when nobody is playing', async () => {
    let n = 0;
    const stop = startKeepAwake({ url: 'https://pw.example.com/', everyMs: 20, busy: () => false, knock: async () => { n++; } });
    await wait(75); stop();
    expect(n).toBe(0);
  });

  it('does nothing without a public address (local development)', async () => {
    let n = 0;
    const stop = startKeepAwake({ url: undefined, everyMs: 20, busy: () => true, knock: async () => { n++; } });
    await wait(75); stop();
    expect(n).toBe(0);
  });

  it('a failed knock is quiet', async () => {
    const stop = startKeepAwake({ url: 'https://pw.example.com', everyMs: 20, busy: () => true, knock: async () => { throw new Error('down'); } });
    await wait(50); stop();
  });
});
