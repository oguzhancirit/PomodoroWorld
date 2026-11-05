import { describe, it, expect } from 'vitest';
import { SOCIAL, socialRoom, SOCIAL_CAP, isSocialId } from '../src/social';
import { sanitizeRoom, roomSeats } from '../src/room';

describe('social spaces (step 4g, v1 PUBLIC_ROOMS kind social)', () => {
  it('has the three v1 spaces', () => {
    expect(SOCIAL.map((s) => s.id)).toEqual(['meydan', 'teras', 'oyun']);
    expect(SOCIAL.map((s) => s.name)).toEqual(['Meydan Kafe', 'Çatı Terası', 'Oyun Salonu']);
  });
  it('builds each one as a valid room with its v1 layout (nothing dropped)', () => {
    for (const s of SOCIAL) {
      const r = socialRoom(s.id)!;
      expect(r.items.length).toBe(s.items.length);
      const clean = sanitizeRoom(r);
      expect(clean.items).toHaveLength(r.items.length);
      expect(clean.theme).toBe(s.theme);
      expect(clean.size).toBe(s.size);
      expect(roomSeats(r)).toBeGreaterThan(3);
    }
  });
  it('each space has its own look and keeps the touches of its pieces (user 2026-11-04)', () => {
    const looks = SOCIAL.map((s) => { const r = socialRoom(s.id)!; return `${r.wall}/${r.wallPat}/${r.floorT}`; });
    expect(new Set(looks).size).toBe(3);
    const oyun = sanitizeRoom(socialRoom('oyun')!);
    expect(oyun.wall).toBe('#15151C');
    const words = oyun.items.filter((i) => i.id === 'w_neon_text').map((i) => (i as { t?: string }).t);
    expect(words).toContain('GAME ON');
    expect(oyun.items.some((i) => i.id === 'f_foosball')).toBe(true);
    expect(oyun.items.some((i) => i.id === 'w_dart')).toBe(true);
    expect(oyun.items.filter((i) => i.id === 'w_poster_game').length).toBeGreaterThanOrEqual(5);
  });
  it('v1 split crowds into salons of 16', () => { expect(SOCIAL_CAP).toBe(16); });
  it('knows which ids are spaces', () => { expect(isSocialId('teras')).toBe(true); expect(isSocialId('x')).toBe(false); expect(socialRoom('x')).toBeNull(); });
});
