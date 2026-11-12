import { describe, it, expect } from 'vitest';
import { emptyLikes, likeRoom, sanitizeLikes, LIKES_KEEP } from '../src/likes';

describe('room likes (user 2026-11-03: others can appreciate your style)', () => {
  it('a visitor likes a room once; the owner cannot like their own room', () => {
    const a = likeRoom(emptyLikes(), 'visitor00001', 'owner0000001');
    expect(a).toMatchObject({ ok: true }); if (!a.ok) return;
    expect(a.likes.n).toBe(1);
    expect(likeRoom(a.likes, 'visitor00001', 'owner0000001')).toMatchObject({ ok: false, reason: 'already' });
    expect(likeRoom(a.likes, 'owner0000001', 'owner0000001')).toMatchObject({ ok: false, reason: 'self' });
  });
  it('keeps the count but only the most recent likers', () => {
    let l = emptyLikes();
    for (let i = 0; i < LIKES_KEEP + 5; i++) { const r = likeRoom(l, `v${String(i).padStart(11, '0')}`, 'owner0000001'); if (r.ok) l = r.likes; }
    expect(l.n).toBe(LIKES_KEEP + 5); expect(l.by.length).toBe(LIKES_KEEP);
  });
  it('repairs a broken record', () => {
    expect(sanitizeLikes({ n: -3, by: ['ok00000000001', 7, 'x'] })).toEqual({ n: 1, by: ['ok00000000001'] });
    expect(sanitizeLikes(null)).toEqual(emptyLikes());
  });
});
