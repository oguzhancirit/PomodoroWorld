import { describe, it, expect } from 'vitest';
import { friendCode, parseFriendCode, emptySocial, socialOp, sanitizeSocial, FriendsRequest, SOCIAL_MAX } from '../src/friends';

const me = 'oguzxxxxxxxx0001', ali = 'alixxxxxxxxx0002';

describe('friend code (v1: your id in capitals)', () => {
  it('shows the id in capitals and reads it back from messy input', () => {
    expect(friendCode(ali)).toBe('ALIXXXXXXXXX0002');
    expect(parseFriendCode('  #alixxxxxxxxx0002 ')).toBe(ali);
    expect(parseFriendCode('ALIX XXXX XXXX 0002')).toBe(ali);
  });
  it('rejects things that are not a code', () => {
    expect(parseFriendCode('abc')).toBeNull();
    expect(parseFriendCode('<script>')).toBeNull();
    expect(parseFriendCode(42)).toBeNull();
  });
});

describe('friends and blocks (v1 S.friends / S.blocked)', () => {
  const t = 1000;
  it('adds a friend with a clean name; not yourself', () => {
    const r = socialOp(emptySocial(), { op: 'add', target: ali, name: '<b>Ali</b>' }, me, t);
    expect(r.ok && r.social.friends[ali]).toEqual({ n: 'Ali', at: t });
    expect(socialOp(emptySocial(), { op: 'add', target: me }, me, t)).toEqual({ ok: false, reason: 'self' });
  });
  it('a friend added by code is called "Arkadaş" until we learn the name', () => {
    const r = socialOp(emptySocial(), { op: 'add', target: ali }, me, t);
    expect(r.ok && r.social.friends[ali].n).toBe('Arkadaş');
  });
  it('adding someone you blocked unblocks them (v1)', () => {
    const b = socialOp(emptySocial(), { op: 'block', target: ali, name: 'Ali' }, me, t);
    expect(b.ok && b.social.blocked[ali]).toBeTruthy();
    const a = socialOp(b.ok ? b.social : emptySocial(), { op: 'add', target: ali, name: 'Ali' }, me, t);
    expect(a.ok && a.social.blocked[ali]).toBeUndefined();
  });
  it('remove and unblock', () => {
    let s = emptySocial();
    for (const op of ['add', 'block'] as const) { const r = socialOp(s, { op, target: ali }, me, t); if (r.ok) s = r.social; }
    for (const op of ['remove', 'unblock'] as const) { const r = socialOp(s, { op, target: ali }, me, t); if (r.ok) s = r.social; }
    expect(s).toEqual(emptySocial());
  });
  it('lists are capped', () => {
    let s = emptySocial();
    for (let i = 0; i < SOCIAL_MAX; i++) s.friends[`f${String(i).padStart(11, '0')}`] = { n: 'x', at: 0 };
    expect(socialOp(s, { op: 'add', target: ali }, me, t)).toEqual({ ok: false, reason: 'limit' });
  });
  it('sanitizes stored data', () => {
    const s = sanitizeSocial({ friends: { [ali]: { n: 'Ali', at: 5 }, bad: { n: 'x' }, ['zz'.repeat(30)]: 1 }, blocked: 'nope' });
    expect(s).toEqual({ friends: { [ali]: { n: 'Ali', at: 5 } }, blocked: {} });
    expect(sanitizeSocial(undefined)).toEqual(emptySocial());
  });
  it('request shape', () => {
    expect(FriendsRequest.safeParse({ pid: me, secret: 's'.repeat(32), op: 'list' }).success).toBe(true);
    expect(FriendsRequest.safeParse({ pid: me, secret: 's'.repeat(32), op: 'add', target: ali, name: 'Ali' }).success).toBe(true);
    expect(FriendsRequest.safeParse({ pid: me, secret: 's'.repeat(32), op: 'hack', target: ali }).success).toBe(false);
  });
});
