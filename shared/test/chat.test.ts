import { describe, it, expect } from 'vitest';
import { cleanText, censor, isBadName, cleanName, RateLimiter, CHAT_MAX } from '../src/chat';

describe('cleanText', () => {
  it('trims, collapses spaces and strips control / invisible characters', () => {
    expect(cleanText('  merhaba \n\t dünya​\u0007 ', CHAT_MAX)).toBe('merhaba dünya');
  });
  it('caps the length', () => { expect(cleanText('a'.repeat(500), CHAT_MAX).length).toBe(CHAT_MAX); });
  it('non-strings become empty', () => { expect(cleanText(42 as unknown as string, 10)).toBe(''); });
});

describe('profanity', () => {
  it('masks Turkish and English swear words, keeps the first letter', () => {
    expect(censor('selam amk nasılsın')).toBe('selam a** nasılsın');
    expect(censor('what the fuck')).toBe('what the f***');
  });
  it('sees through leetspeak and stretched letters', () => {
    expect(censor('s1ktir')).not.toContain('s1ktir');
    expect(censor('amkkkkk')).not.toContain('amkkkkk');
  });
  it('does not touch innocent words', () => {
    for (const w of ['ama', 'sıkıştım', 'piknik', 'göte', 'Ankara', 'amaç', 'picture']) expect(censor(w)).toBe(w);
  });
  it('bad names are caught, also when split with dots or spaces', () => {
    expect(isBadName('si.k.tir')).toBe(true);
    expect(isBadName('Oğuzhan')).toBe(false);
  });
  it('cleanName removes markup and replaces bad names, also hidden inside tags', () => {
    expect(cleanName('<b>Ayşe</b>')).toBe('Ayşe');
    expect(cleanName('<i>siktir</i>')).toBe('Oyuncu');
    expect(cleanName('a{b}c')).toBe('abc');
    expect(cleanName('siktir')).toBe('Oyuncu');
    expect(cleanName('   ')).toBe('');
  });
});

describe('RateLimiter', () => {
  it('allows one message per window per key', () => {
    const r = new RateLimiter(1, 3000);
    expect(r.allow('a', 0)).toBe(true);
    expect(r.allow('a', 1000)).toBe(false);
    expect(r.allow('b', 1000)).toBe(true);
    expect(r.allow('a', 3001)).toBe(true);
  });
  it('supports a small burst', () => {
    const r = new RateLimiter(3, 10_000);
    expect([0, 1, 2, 3].map((t) => r.allow('x', t))).toEqual([true, true, true, false]);
  });
  it('forget() clears a key (player left)', () => {
    const r = new RateLimiter(1, 3000); r.allow('a', 0); r.forget('a'); expect(r.allow('a', 1)).toBe(true);
  });
});
