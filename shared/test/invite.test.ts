import { describe, it, expect } from 'vitest';
import { WELCOME_PACK, BOOST_DAYS, grantCallBonus, boostActive, callAllowed, CALL_TTL_MS } from '../src/invite';
import { newWallet, rewardFocus, sanitizeWallet } from '../src/economy';
import { emptySocial } from '../src/friends';

const DAY = 86_400_000, now = Date.UTC(2026, 10, 9, 12);

describe('friend call bonus (user 2026-11-09): a call that brings a friend over pays both once', () => {
  it('the welcome pack: coins, a floor cushion for the friend, two mugs, a polaroid string and a banner', () => {
    expect(WELCOME_PACK.coins).toBe(300);
    expect(WELCOME_PACK.items).toEqual({ f_cushion: 1, d_mug: 2, w_polaroid: 1, w_garland: 1 });
    expect(BOOST_DAYS).toBe(7);
  });
  it('first time: pack + 7 days of double XP', () => {
    const w0 = newWallet();
    const r = grantCallBonus(w0, now);
    expect(r.got).toBe(true);
    expect(r.wallet.coins).toBe(w0.coins + 300);
    expect(r.wallet.owned.f_cushion).toBe((w0.owned.f_cushion ?? 0) + 1);
    expect(r.wallet.owned.d_mug).toBe(2);
    expect(r.wallet.boostUntil).toBe(now + 7 * DAY);
    expect(r.wallet.welcome).toBe(now);
    expect(w0.coins).toBe(newWallet().coins); // not mutated
  });
  it('only once per player (new guest accounts cannot farm it into endless double XP)', () => {
    const a = grantCallBonus(newWallet(), now).wallet;
    const b = grantCallBonus(a, now + 3 * DAY);
    expect(b.got).toBe(false);
    expect(b.wallet).toBe(a);
  });
  it('double XP while the boost lasts, only on focus XP (coins stay the same)', () => {
    const w = grantCallBonus(newWallet(), now).wallet;
    const base = { minutes: 25, completed: true, round: 1, others: 0, day: '2026-11-09', longFocus: false };
    const plain = rewardFocus(newWallet(), { ...base, now });
    const boosted = rewardFocus(w, { ...base, now: now + DAY });
    expect(boosted.gained.xp).toBe(plain.gained.xp * 2);
    expect(boosted.gained.coins).toBe(plain.gained.coins);
    expect(boosted.lines.some((l) => l.includes('2x XP'))).toBe(true);
    const after = rewardFocus(w, { ...base, now: now + 8 * DAY });
    expect(after.gained.xp).toBe(plain.gained.xp);
    expect(boostActive(w, now + DAY)).toBe(true);
    expect(boostActive(w, now + 7 * DAY + 1)).toBe(false);
  });
  it('survives saving and loading the profile', () => {
    const w = grantCallBonus(newWallet(), now).wallet;
    const back = sanitizeWallet(JSON.parse(JSON.stringify(w)));
    expect(back.boostUntil).toBe(w.boostUntil); expect(back.welcome).toBe(w.welcome);
    expect(sanitizeWallet({ boostUntil: -5, welcome: 'x' }).boostUntil).toBe(0);
  });
});

describe('who may call whom', () => {
  const me = 'aaaaaaaaaaaa1', you = 'bbbbbbbbbbbb2';
  const friendOf = (pid: string) => ({ friends: { [pid]: { n: 'X', at: 1 } }, blocked: {} });
  it('a friend in my list who has not blocked me', () => {
    expect(callAllowed(me, friendOf(you), you, emptySocial())).toBe('ok');
    expect(callAllowed(me, emptySocial(), you, emptySocial())).toBe('not_friend');
    expect(callAllowed(me, friendOf(you), you, { friends: {}, blocked: { [me]: { n: 'Y', at: 1 } } })).toBe('blocked');
    expect(callAllowed(me, friendOf(me), me, emptySocial())).toBe('self');
  });
  it('a call waits a minute and a half at most', () => { expect(CALL_TTL_MS).toBe(90_000); });
});
