import { describe, it, expect } from 'vitest';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ProfileStore } from '../src/profiles';

const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pw-')), 'profiles.json');

describe('ProfileStore', () => {
  it('creates a profile on first use and checks the secret afterwards', () => {
    const s = new ProfileStore(tmp());
    const a = s.open('pid12345abcd', 'x'.repeat(32));
    expect(a?.wallet.coins).toBe(150);
    expect(s.open('pid12345abcd', 'x'.repeat(32))).toBe(a);
    expect(s.open('pid12345abcd', 'y'.repeat(32))).toBeNull();
  });
  it('rejects malformed ids and secrets', () => {
    const s = new ProfileStore(tmp());
    expect(s.open('a', 'x'.repeat(32))).toBeNull();
    expect(s.open('pid12345abcd', 'short')).toBeNull();
    expect(s.open('../../etc', 'x'.repeat(32))).toBeNull();
  });
  it('persists to disk and never stores the secret itself', () => {
    const file = tmp(); const s = new ProfileStore(file);
    const p = s.open('pid12345abcd', 's'.repeat(32))!; p.wallet.coins = 999; s.saveNow();
    const raw = fs.readFileSync(file, 'utf8');
    expect(raw).not.toContain('s'.repeat(32));
    const again = new ProfileStore(file).open('pid12345abcd', 's'.repeat(32));
    expect(again?.wallet.coins).toBe(999);
  });
  it('survives a broken file', () => {
    const file = tmp(); fs.writeFileSync(file, '{broken');
    expect(new ProfileStore(file).open('pid12345abcd', 's'.repeat(32))?.wallet.coins).toBe(150);
  });
});
