import { describe, it, expect } from 'vitest';
import { LEAGUES, leagueFor, nextLeague, weekBoard } from '../src/economy';

// v1 js/data.js PW.LEAGUES / leagueFor: weekly XP decides the league
describe('leagues', () => {
  it('weekly XP picks the league', () => {
    expect(leagueFor(0).name).toBe('Bronz Lig');
    expect(leagueFor(299).id).toBe('bronz');
    expect(leagueFor(300).id).toBe('gumus');
    expect(leagueFor(3000).id).toBe('elmas');
    expect(LEAGUES).toHaveLength(5);
  });
  it('next league and how much is missing', () => {
    expect(nextLeague(250)).toEqual({ league: LEAGUES[1], need: 50 });
    expect(nextLeague(5000)).toBeNull();
  });
});

describe('weekBoard', () => {
  it('sorts by weekly XP, keeps me, ranks from 1, shows at most 10', () => {
    const others = Array.from({ length: 12 }, (_, i) => ({ id: 'p' + i, n: 'P' + i, lv: 1, wx: i * 10 }));
    const b = weekBoard({ id: 'me', n: 'Ben', lv: 3, wx: 55 }, others);
    expect(b.length).toBe(10);
    expect(b[0]).toMatchObject({ id: 'p11', rank: 1 });
    expect(b.find((x) => x.id === 'me')).toMatchObject({ me: true, rank: 7 });
  });
  it('when I am below the top 10 I am still listed last with my real rank', () => {
    const others = Array.from({ length: 12 }, (_, i) => ({ id: 'p' + i, n: 'P' + i, lv: 1, wx: 100 + i }));
    const b = weekBoard({ id: 'me', n: 'Ben', lv: 3, wx: 0 }, others);
    expect(b.length).toBe(10);
    expect(b[9]).toMatchObject({ id: 'me', rank: 13, me: true });
  });
});
