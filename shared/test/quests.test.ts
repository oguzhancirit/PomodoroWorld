import { describe, it, expect } from 'vitest';
import { newWallet, rewardFocus, sanitizeWallet, ECON, type Wallet } from '../src/economy';
import {
  QUESTS, LOGIN_REWARDS, PLEDGE_DAYS, clock, loginTick, claimQuest, claimLogin, setPledge, cancelPledge,
  noteChat, noteDecor, questsReady, questView,
} from '../src/quests';

// 2026-11-02 is a Monday. Turkey is UTC+3 → tz = 180.
const at = (iso: string) => Date.parse(iso);
const TR = 180;
const c = (iso: string) => clock(at(iso), TR);

describe('clock', () => {
  it('uses the player local day, hour and ISO week', () => {
    const k = clock(at('2026-11-02T22:30:00Z'), TR); // 01:30 on Tuesday in Turkey
    expect(k).toMatchObject({ day: '2026-11-03', hour: 1, minute: 90, week: '2026-W45' });
    expect(clock(at('2026-11-02T22:30:00Z'), 0).day).toBe('2026-11-02');
  });
  it('Sunday belongs to the same week as the Monday before it', () => {
    expect(clock(at('2026-11-08T12:00:00Z'), 0).week).toBe(clock(at('2026-11-02T12:00:00Z'), 0).week);
    expect(clock(at('2026-11-09T12:00:00Z'), 0).week).not.toBe(clock(at('2026-11-08T12:00:00Z'), 0).week);
  });
  it('a silly time zone is clamped', () => { expect(clock(at('2026-11-02T12:00:00Z'), 99999).day).toBe('2026-11-03'); });
});

describe('daily login', () => {
  it('counts the streak and completes the login quest', () => {
    let w = loginTick(newWallet(), c('2026-11-02T08:00:00Z'));
    expect(w.q.login.streak).toBe(1);
    expect(w.q.daily.d_login).toEqual({ p: 1, c: false });
    w = loginTick(w, c('2026-11-02T18:00:00Z')); // same day again: no change
    expect(w.q.login.streak).toBe(1);
    w = loginTick(w, c('2026-11-03T08:00:00Z'));
    expect(w.q.login.streak).toBe(2);
    expect(w.q.weekly.w_days.p).toBe(2);
    w = loginTick(w, c('2026-11-05T08:00:00Z')); // skipped a day
    expect(w.q.login.streak).toBe(1);
  });
  it('the login reward is paid once a day and grows with the streak', () => {
    let w = loginTick(newWallet(), c('2026-11-02T08:00:00Z'));
    const r = claimLogin(w, c('2026-11-02T09:00:00Z'));
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.wallet.coins).toBe(ECON.startCoins + LOGIN_REWARDS[0]);
    expect(claimLogin(r.wallet, c('2026-11-02T10:00:00Z')).ok).toBe(false);
    w = r.wallet;
    for (let d = 3; d <= 8; d++) w = loginTick(w, c(`2026-11-0${d}T08:00:00Z`));
    const r7 = claimLogin(w, c('2026-11-08T09:00:00Z'));
    expect(r7.ok && r7.gained).toEqual({ xp: 40, coins: LOGIN_REWARDS[6] });
  });
  it('no reward before logging in today', () => {
    expect(claimLogin(newWallet(), c('2026-11-02T09:00:00Z')).ok).toBe(false);
  });
});

describe('quests', () => {
  const day = '2026-11-02', week = '2026-W45';
  const focus = (w: Wallet, minutes: number, completed = true, others = 0, d = day) => rewardFocus(w, { minutes, completed, round: 1, others, day: d, week, longFocus: false }).wallet;

  it('a finished pomodoro moves the daily and weekly quests', () => {
    const w = focus(newWallet(), 25);
    expect(w.q.daily.d_pomo.p).toBe(1);
    expect(w.q.daily.d_min.p).toBe(25);
    expect(w.q.weekly.w_min.p).toBe(25);
    expect(w.q.weekly.w_balance.p).toBe(1);
    expect(w.q.daily.d_together).toBeUndefined();
  });
  it('studying with someone completes "Birlikte Çalışalım"', () => {
    expect(focus(newWallet(), 25, true, 1).q.daily.d_together.p).toBe(1);
  });
  it('progress never goes past the goal', () => {
    let w = newWallet(); for (let i = 0; i < 3; i++) w = focus(w, 25);
    expect(w.q.daily.d_min.p).toBe(50);
  });
  it('a quest pays once, only when done', () => {
    const k = c('2026-11-02T12:00:00Z');
    expect(claimQuest(newWallet(), 'd_pomo', k)).toMatchObject({ ok: false, reason: 'not_done' });
    const w = focus(newWallet(), 25);
    const r = claimQuest(w, 'd_pomo', k);
    expect(r.ok).toBe(true); if (!r.ok) return;
    const def = QUESTS.daily.find((q) => q.id === 'd_pomo')!;
    expect(r.wallet.xp).toBe(w.xp + def.xp); expect(r.wallet.coins).toBe(w.coins + def.coin);
    expect(claimQuest(r.wallet, 'd_pomo', k)).toMatchObject({ ok: false, reason: 'claimed' });
    expect(claimQuest(w, 'nope', k)).toMatchObject({ ok: false, reason: 'unknown' });
  });
  it('daily quests start over on a new day, weekly ones on a new week', () => {
    const w = focus(newWallet(), 25);
    expect(claimQuest(w, 'd_pomo', c('2026-11-03T12:00:00Z'))).toMatchObject({ ok: false, reason: 'not_done' });
    expect(questView(w, c('2026-11-03T12:00:00Z')).weekly.w_min.p).toBe(25);
    expect(questView(w, c('2026-11-09T12:00:00Z')).weekly.w_min).toBeUndefined();
  });
  it('the balanced week counts different days with 25+ minutes', () => {
    let w = newWallet();
    w = focus(w, 25, true, 0, '2026-11-02'); w = focus(w, 10, false, 0, '2026-11-03'); w = focus(w, 30, true, 0, '2026-11-04');
    expect(w.q.weekly.w_balance.p).toBe(2);
  });
  it('chat messages and placed furniture count', () => {
    const k = c('2026-11-02T12:00:00Z');
    let w = noteChat(noteChat(newWallet(), k), k);
    expect(w.q.daily.d_social.p).toBe(2); expect(w.stats.msgs).toBe(2);
    w = noteDecor(w, 5, k); expect(w.q.weekly.w_decor.p).toBe(3);
  });
  it('the badge counts quests ready to claim', () => {
    const k = c('2026-11-02T12:00:00Z');
    let w = loginTick(newWallet(), k); w = focus(w, 25);
    expect(questsReady(w, k)).toBe(3); // login quest + first pomodoro + today's login reward
  });
});

describe('pledge', () => {
  const k = c('2026-11-02T08:00:00Z');
  it('pays when the daily minutes were kept for every promised day', () => {
    const [days, coin, xp] = PLEDGE_DAYS[0];
    let w = setPledge(newWallet(), 25, days, k);
    expect(w.q.pledge).toMatchObject({ min: 25, days, coin, xp, done: [] });
    for (let i = 0; i < days; i++) {
      const before = w;
      const r = rewardFocus(w, { minutes: 25, completed: true, round: 1, others: 0, day: `2026-11-0${2 + i}`, week: '2026-W45', longFocus: false });
      w = r.wallet;
      if (i === days - 1) { expect(r.lines).toContain('Söz tamamlandı'); expect(w.q.pledge!.finished).toBe(true); }
      else expect(w.q.pledge!.done.length).toBe(i + 1);
      void before;
    }
    // a finished promise does not pay twice
    const again = rewardFocus(w, { minutes: 25, completed: true, round: 1, others: 0, day: '2026-11-06', week: '2026-W45', longFocus: false });
    expect(again.lines).not.toContain('Söz tamamlandı');
  });
  it('only known options are accepted; it can be dropped', () => {
    expect(setPledge(newWallet(), 7, 3, k).q.pledge).toBeNull();
    expect(setPledge(newWallet(), 25, 4, k).q.pledge).toBeNull();
    expect(cancelPledge(setPledge(newWallet(), 25, 3, k)).q.pledge).toBeNull();
  });
});

describe('statistics', () => {
  it('logs the session with its category and spreads minutes over the hours', () => {
    const r = rewardFocus(newWallet(), { minutes: 25, completed: true, round: 1, others: 0, day: '2026-11-02', week: '2026-W45', longFocus: false, startMin: 9 * 60 + 50, cat: 'Kodlama' });
    expect(r.wallet.stats.log).toEqual([{ d: '2026-11-02', s: 590, m: 25, c: 'Kodlama' }]);
    expect(r.wallet.stats.hours).toEqual({ 9: 10, 10: 15 });
    expect(r.wallet.stats.weekXP['2026-W45']).toBe(r.gained.xp);
  });
  it('late and early sessions earn their achievements', () => {
    const night = rewardFocus(newWallet(), { minutes: 25, completed: true, round: 1, others: 0, day: '2026-11-02', longFocus: false, startMin: 23 * 60 + 10 });
    expect(night.wallet.ach.night).toBe(1);
    const early = rewardFocus(newWallet(), { minutes: 25, completed: true, round: 1, others: 0, day: '2026-11-02', longFocus: false, startMin: 6 * 60 });
    expect(early.wallet.ach.early).toBe(1);
  });
  it('old wallets without the new fields are repaired', () => {
    const w = sanitizeWallet({ xp: 5, coins: 9, stats: { focusMin: 3 }, q: { daily: { d_pomo: { p: 'x' } }, pledge: { min: 'a' } }, tz: 'nope' });
    expect(w.stats.log).toEqual([]); expect(w.stats.hours).toEqual({}); expect(w.stats.msgs).toBe(0);
    expect(w.q.daily.d_pomo).toEqual({ p: 0, c: false }); expect(w.q.pledge).toBeNull(); expect(w.tz).toBe(0);
    expect(sanitizeWallet({ stats: { log: [{ d: '2026-11-02', s: 1, m: 2, c: 'Ders' }, { d: 5 }] } }).stats.log).toHaveLength(1);
  });
});
