import { describe, it, expect } from 'vitest';
import { unlocksAt, ECON, levelFromXP, xpStep, newWallet, rewardFocus, buy, CATALOG, itemById, isFree, avatarAllowed, titleFor, ACHIEVEMENTS } from '../src/economy';
import { defaultAvatar, PARTS } from '../src/avatar';

describe('levels', () => {
  it('level 1 at 0 xp, steps grow', () => {
    expect(levelFromXP(0)).toEqual({ level: 1, into: 0, need: xpStep(1) });
    expect(levelFromXP(xpStep(1)).level).toBe(2);
    expect(xpStep(5)).toBeGreaterThan(xpStep(4));
  });
  it('titles follow levels', () => { expect(titleFor(1)).toBe('Çaylak'); expect(titleFor(9)).toBe('Derin Odak'); });
});

describe('focus rewards', () => {
  const day = '2026-11-02';
  it('pays per minute and a completion bonus', () => {
    const r = rewardFocus(newWallet(), { minutes: 25, completed: true, round: 1, others: 0, day, longFocus: false });
    expect(r.gained.xp).toBe(25 * ECON.xpPerMin + ECON.pomoXP);
    expect(r.wallet.stats.pomos).toBe(1);
    expect(r.wallet.stats.focusMin).toBe(25);
    expect(r.wallet.stats.days[day]).toBe(25);
  });
  it('a partial session pays minutes only', () => {
    const r = rewardFocus(newWallet(), { minutes: 10, completed: false, round: 1, others: 0, day, longFocus: false });
    expect(r.gained.xp).toBe(10); expect(r.wallet.stats.pomos).toBe(0);
  });
  it('studying with others pays +10% each, at most +30%', () => {
    const a = rewardFocus(newWallet(), { minutes: 20, completed: false, round: 1, others: 1, day, longFocus: false });
    const b = rewardFocus(newWallet(), { minutes: 20, completed: false, round: 1, others: 9, day, longFocus: false });
    expect(a.gained.xp).toBe(22); expect(b.gained.xp).toBe(26);
  });
  it('every 4th round gives the set bonus', () => {
    const r = rewardFocus(newWallet(), { minutes: 0, completed: true, round: 4, others: 0, day, longFocus: false });
    expect(r.gained.xp).toBe(ECON.pomoXP + ECON.setBonusXP);
  });
  it('the daily goal pays once', () => {
    let w = newWallet(); let got = 0;
    for (let i = 1; i <= 6; i++) { const r = rewardFocus(w, { minutes: 0, completed: true, round: i, others: 0, day, longFocus: false }); w = r.wallet; if (r.lines.some((l) => l.includes('Günlük hedef'))) got++; }
    expect(got).toBe(1);
  });
  it('streak grows on consecutive days and resets after a gap', () => {
    let w = rewardFocus(newWallet(), { minutes: 1, completed: true, round: 1, others: 0, day: '2026-11-01', longFocus: false }).wallet;
    w = rewardFocus(w, { minutes: 1, completed: true, round: 1, others: 0, day: '2026-11-02', longFocus: false }).wallet;
    expect(w.stats.streak).toBe(2);
    w = rewardFocus(w, { minutes: 1, completed: true, round: 1, others: 0, day: '2026-11-05', longFocus: false }).wallet;
    expect(w.stats.streak).toBe(1);
  });
  it('achievements unlock once and pay coins', () => {
    const r = rewardFocus(newWallet(), { minutes: 25, completed: true, round: 1, others: 0, day, longFocus: false });
    expect(r.wallet.ach.first).toBeTruthy();
    const r2 = rewardFocus(r.wallet, { minutes: 25, completed: true, round: 2, others: 0, day, longFocus: false });
    expect(r2.lines.filter((l) => l.includes('İlk Domates')).length).toBe(0);
    expect(ACHIEVEMENTS.length).toBeGreaterThan(5);
  });
  it('never trusts silly input', () => {
    const r = rewardFocus(newWallet(), { minutes: -5, completed: false, round: 1, others: -3, day, longFocus: false });
    expect(r.gained.xp).toBe(0);
    const big = rewardFocus(newWallet(), { minutes: 10_000, completed: false, round: 1, others: 0, day, longFocus: false });
    expect(big.gained.xp).toBeLessThanOrEqual(180 * 1.3);
  });
  it('does not mutate the wallet it was given', () => {
    const w = newWallet(); rewardFocus(w, { minutes: 25, completed: true, round: 1, others: 0, day, longFocus: false });
    expect(w.xp).toBe(0); expect(w.stats.pomos).toBe(0);
  });
});

describe('shop', () => {
  it('catalog has avatar parts for both genders and furniture', () => {
    expect(CATALOG.some((i) => i.cat === 'avatar' && i.g === 'f')).toBe(true);
    expect(CATALOG.some((i) => i.cat === 'avatar' && i.g === 'm')).toBe(true);
    expect(CATALOG.some((i) => i.cat === 'furn')).toBe(true);
    for (const i of CATALOG) { expect(i.price).toBeGreaterThanOrEqual(0); expect(i.lvl).toBeGreaterThanOrEqual(1); }
  });
  it('default avatars are free to wear', () => {
    expect(avatarAllowed(newWallet(), defaultAvatar('f'))).toBe(true);
    expect(avatarAllowed(newWallet(), defaultAvatar('m'))).toBe(true);
  });
  it('buys a part when coins and level allow, once', () => {
    const paid = CATALOG.find((i) => i.cat === 'avatar' && i.price > 0 && i.lvl === 1)!;
    const w = { ...newWallet(), coins: 1000 };
    const r = buy(w, paid.id);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.wallet.coins).toBe(1000 - paid.price); expect(r.wallet.owned[paid.id]).toBe(1); expect(buy(r.wallet, paid.id)).toMatchObject({ ok: false, reason: 'owned' }); }
  });
  it('refuses without coins, without level, for free or unknown items', () => {
    const paid = CATALOG.find((i) => i.price > 0 && i.lvl === 1)!;
    expect(buy({ ...newWallet(), coins: 0 }, paid.id)).toMatchObject({ ok: false, reason: 'coins' });
    const locked = CATALOG.find((i) => i.lvl > 1)!;
    expect(buy({ ...newWallet(), coins: 1e6 }, locked.id)).toMatchObject({ ok: false, reason: 'level' });
    expect(buy(newWallet(), 'nope')).toMatchObject({ ok: false, reason: 'unknown' });
    const free = CATALOG.find((i) => i.price === 0)!;
    expect(buy(newWallet(), free.id)).toMatchObject({ ok: false, reason: 'owned' });
  });
  it('furniture can be bought many times', () => {
    const f = CATALOG.find((i) => i.cat === 'furn' && i.lvl === 1 && i.price > 0)!;
    let w = { ...newWallet(), coins: 10_000 };
    for (let k = 0; k < 3; k++) { const r = buy(w, f.id); expect(r.ok).toBe(true); if (r.ok) w = r.wallet; }
    expect(w.owned[f.id]).toBe(3);
  });
  it('an avatar wearing an unowned paid part is not allowed', () => {
    const paid = CATALOG.find((i) => i.cat === 'avatar' && i.price > 0 && i.g === 'f' && i.slot === 'body')!;
    const a = { ...defaultAvatar('f'), body: paid.part! };
    expect(isFree(paid)).toBe(false);
    expect(avatarAllowed(newWallet(), a)).toBe(false);
    expect(avatarAllowed({ ...newWallet(), owned: { [paid.id]: 1 } }, a)).toBe(true);
    expect(itemById(paid.id)).toBe(paid);
    expect(PARTS.f.body).toContain(paid.part);
  });
});

import { sanitizeWallet, STARTER } from '../src/economy';
describe('sanitizeWallet', () => {
  it('repairs broken stored wallets', () => {
    expect(sanitizeWallet(null).coins).toBe(150);
    const w = sanitizeWallet({ xp: -4, coins: 'x', owned: { f_cactus: 2, 'hack': 9, f_sofa: -1 }, stats: { pomos: 3.7 } });
    expect(w.xp).toBe(0); expect(w.coins).toBe(150); expect(w.owned).toEqual({ ...STARTER, f_cactus: 2 }); expect(w.stats.pomos).toBe(3);
  });
});

describe('unlocksAt (level-up window, v1 ui.levelUp)', () => {
  it('lists at most 8 items that open exactly at that level', () => {
    const u = unlocksAt(3);
    expect(u.length).toBeGreaterThan(0);
    expect(u.length).toBeLessThanOrEqual(8);
    expect(u.every((i) => i.lvl === 3)).toBe(true);
  });
  it('shows room items first and each outfit part once (not once per gender)', () => {
    for (let lv = 2; lv <= 12; lv++) {
      const u = unlocksAt(lv), keys = u.map((i) => i.name + '/' + (i.slot ?? i.cat));
      expect(new Set(keys).size).toBe(keys.length);
      const firstAv = u.findIndex((i) => i.cat === 'avatar');
      if (firstAv >= 0) expect(u.slice(firstAv).every((i) => i.cat === 'avatar')).toBe(true);
    }
  });
  it('is empty for a level nothing opens at', () => {
    expect(unlocksAt(999)).toEqual([]);
  });
});
