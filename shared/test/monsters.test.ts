import { describe, it, expect } from 'vitest';
import { MONSTERS, typeMult, makeMon, statsAt, damage, turn, enemyFor, gainXp, xpToNext, rng, sanitizeSave, newSave, type Mon } from '../src/monsters';

const fixed = (v: number) => () => v; // a "random" that always returns v

describe('monster types', () => {
  it('fire beats leaf, leaf beats water, water beats fire; same type is weak', () => {
    expect(typeMult('ates', 'yaprak')).toBe(2); expect(typeMult('yaprak', 'su')).toBe(2); expect(typeMult('su', 'ates')).toBe(2);
    expect(typeMult('yaprak', 'ates')).toBe(0.5); expect(typeMult('ates', 'ates')).toBe(0.5);
    expect(typeMult('normal', 'su')).toBe(1);
  });
  it('has three starters, each with four moves', () => {
    const starters = MONSTERS.filter((m) => m.starter);
    expect(starters.map((m) => m.type).sort()).toEqual(['ates', 'su', 'yaprak']);
    for (const m of MONSTERS) expect(m.moves).toHaveLength(4);
  });
});

describe('stats and damage', () => {
  it('grows with level', () => {
    const a = statsAt('kivilcik', 5), b = statsAt('kivilcik', 10);
    expect(b.hp).toBeGreaterThan(a.hp); expect(b.atk).toBeGreaterThan(a.atk);
  });
  it('a super-effective hit does about twice the damage of a neutral one', () => {
    const me = makeMon('kivilcik', 8);
    const leaf = makeMon('filiz', 8), dummy = { ...leaf, type: 'normal' as const };
    const hot = damage(me, leaf, 'kor', fixed(0.5)).dmg, plain = damage(me, dummy, 'kor', fixed(0.5)).dmg;
    expect(hot).toBeGreaterThanOrEqual(plain * 2 - 1); expect(hot).toBeLessThanOrEqual(plain * 2 + 1);
    expect(damage(me, leaf, 'kor', fixed(0.5)).eff).toBe('super');
  });
  it('always does at least 1 damage', () => {
    const weak = makeMon('damlacik', 1), tank = makeMon('kayacik', 30);
    expect(damage(weak, tank, 'carp', fixed(0)).dmg).toBeGreaterThanOrEqual(1);
  });
});

describe('a turn', () => {
  it('the faster one moves first and a fainted foe does not hit back', () => {
    const me = makeMon('kivilcik', 20), foe: Mon = { ...makeMon('filiz', 2), hp: 1 };
    const r = turn(me, foe, 'kor', fixed(0.5));
    expect(r.foe.hp).toBe(0); expect(r.winner).toBe('me');
    expect(r.me.hp).toBe(me.hp);
    expect(r.log[0]).toMatch(/Kıvılcık/);
    expect(r.steps).toHaveLength(1); expect(r.steps[0]).toMatchObject({ foeHp: 0, hit: 'foe' });
  });
  it('a move with no uses left cannot be used', () => {
    const me = makeMon('kivilcik', 5); me.pp.dinlen = 0;
    const foe = makeMon('filiz', 5);
    expect(() => turn(me, foe, 'dinlen', fixed(0.5))).toThrow();
  });
  it('the rest move heals but never above full', () => {
    const me = { ...makeMon('damlacik', 6) }; me.hp = 3;
    const foe = makeMon('kayacik', 1);
    const r = turn(me, foe, 'dinlen', fixed(0.5));
    expect(r.me.hp).toBeGreaterThan(3); expect(r.me.hp).toBeLessThanOrEqual(r.me.max);
    expect(r.me.pp.dinlen).toBe(me.pp.dinlen - 1);
  });
  it('the cheer move raises attack for the rest of the fight', () => {
    const me = makeMon('filiz', 6), foe = makeMon('kayacik', 1);
    const r = turn(me, foe, 'coskun', fixed(0.5));
    expect(r.me.boost).toBe(1);
    expect(damage(r.me, foe, 'carp', fixed(0.5)).dmg).toBeGreaterThan(damage(me, foe, 'carp', fixed(0.5)).dmg);
  });
  it('the foe prefers a move that is strong against me', () => {
    const me = makeMon('filiz', 5), foe = makeMon('kivilcik', 5);
    const r = turn(me, foe, 'carp', fixed(0.99));
    expect(r.foeMove).toBe('kor');
  });
});

describe('progress', () => {
  it('foes get stronger with the win streak', () => {
    const r = rng(7);
    expect(enemyFor(0, r).lv).toBeLessThan(enemyFor(10, rng(7)).lv);
  });
  it('xp levels you up, carrying the rest over', () => {
    const save = { ...newSave('kivilcik') };
    const need = xpToNext(save.lv);
    const out = gainXp(save, need + 3);
    expect(out.lv).toBe(save.lv + 1); expect(out.xp).toBe(3); expect(out.leveled).toBe(true);
  });
  it('a broken save becomes a clean one', () => {
    expect(sanitizeSave({ starter: 'nope', lv: -4 })).toBeNull();
    expect(sanitizeSave({ starter: 'damlacik', lv: 999, xp: -1, wins: 'x', best: 2 })).toEqual({ starter: 'damlacik', lv: 50, xp: 0, wins: 0, best: 2, streak: 0 });
  });
});
