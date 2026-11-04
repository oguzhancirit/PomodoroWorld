import { describe, it, expect } from 'vitest';
import { SessionRegistry } from '../src/sessions';

describe('SessionRegistry: one account, one place', () => {
  it('a new tab of the same player removes the old tab', () => {
    const reg = new SessionRegistry(); const kicked: string[] = [];
    reg.claim('pidaaaa00001', { room: 'r1', sessionId: 's1', kick: () => kicked.push('s1') });
    reg.claim('pidaaaa00001', { room: 'r2', sessionId: 's2', kick: () => kicked.push('s2') });
    expect(kicked).toEqual(['s1']);
    expect(reg.holds('pidaaaa00001', 'r2', 's2')).toBe(true);
    expect(reg.holds('pidaaaa00001', 'r1', 's1')).toBe(false);
  });
  it('different players never kick each other', () => {
    const reg = new SessionRegistry(); const kicked: string[] = [];
    reg.claim('pidaaaa00001', { room: 'r1', sessionId: 's1', kick: () => kicked.push('s1') });
    reg.claim('pidbbbb00002', { room: 'r1', sessionId: 's2', kick: () => kicked.push('s2') });
    expect(kicked).toEqual([]);
  });
  it('an old tab leaving does not free the new tab', () => {
    const reg = new SessionRegistry();
    reg.claim('pidaaaa00001', { room: 'r1', sessionId: 's1', kick: () => {} });
    reg.claim('pidaaaa00001', { room: 'r1', sessionId: 's2', kick: () => {} });
    reg.release('pidaaaa00001', 'r1', 's1');
    expect(reg.holds('pidaaaa00001', 'r1', 's2')).toBe(true);
    reg.release('pidaaaa00001', 'r1', 's2');
    expect(reg.holds('pidaaaa00001', 'r1', 's2')).toBe(false);
  });
  it('the same seat claiming again does not kick itself', () => {
    const reg = new SessionRegistry(); let kicks = 0;
    reg.claim('pidaaaa00001', { room: 'r1', sessionId: 's1', kick: () => kicks++ });
    reg.claim('pidaaaa00001', { room: 'r1', sessionId: 's1', kick: () => kicks++ });
    expect(kicks).toBe(0);
  });
  it('a kicked seat that leaves during the kick does not free the new seat', () => {
    const reg = new SessionRegistry();
    reg.claim('pidaaaa00001', { room: 'r1', sessionId: 's1', kick: () => reg.release('pidaaaa00001', 'r1', 's1') });
    reg.claim('pidaaaa00001', { room: 'r2', sessionId: 's2', kick: () => {} });
    expect(reg.holds('pidaaaa00001', 'r2', 's2')).toBe(true);
  });
});
