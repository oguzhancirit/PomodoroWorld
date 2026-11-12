// Daily and weekly quests, the daily login reward and the "promise to yourself" (pledge), as in the
// original game. Pure functions: the server (or the demo room) applies them, so nobody writes their own coins.
import { levelFromXP, checkAchievements, type Wallet } from './economy';

export interface QuestDef { id: string; name: string; desc: string; goal: number; xp: number; coin: number }
export const QUESTS: { daily: readonly QuestDef[]; weekly: readonly QuestDef[] } = {
  daily: [
    { id: 'd_login', name: 'Günlük Giriş', desc: 'Uygulamaya giriş yap', goal: 1, xp: 10, coin: 0 },
    { id: 'd_pomo', name: 'Isınma Turu', desc: '1 pomodoro tamamla', goal: 1, xp: 10, coin: 5 },
    { id: 'd_together', name: 'Birlikte Çalışalım', desc: 'Başkasıyla aynı odada 1 pomodoro tamamla', goal: 1, xp: 15, coin: 10 },
    { id: 'd_social', name: 'Sosyal Kelebek', desc: 'Molada 3 sohbet mesajı gönder', goal: 3, xp: 10, coin: 5 },
    { id: 'd_min', name: 'Derin Nefes', desc: 'Bugün 50 dakika odaklan', goal: 50, xp: 20, coin: 10 },
  ],
  weekly: [
    { id: 'w_min', name: 'Odaklanma Maratonu', desc: '600 dakika odaklan', goal: 600, xp: 80, coin: 30 },
    { id: 'w_days', name: 'Seri Ustası', desc: '5 gün üst üste giriş yap', goal: 5, xp: 70, coin: 20 },
    { id: 'w_balance', name: 'Dengeli Hafta', desc: '5 farklı gün en az 25 dakika odaklan', goal: 5, xp: 70, coin: 30 },
    { id: 'w_decor', name: 'İç Mimar', desc: 'Odana 3 eşya yerleştir', goal: 3, xp: 40, coin: 20 },
  ],
};
const DEF = new Map([...QUESTS.daily, ...QUESTS.weekly].map((q) => [q.id, q]));
export const LOGIN_REWARDS = [15, 20, 25, 30, 40, 50, 80] as const;
export const PLEDGE_MIN = [25, 45, 60, 90] as const;
/** [days, coins, xp] */
export const PLEDGE_DAYS: readonly (readonly [number, number, number])[] = [[3, 2, 60], [5, 4, 110], [7, 6, 175], [30, 30, 800]];

export interface QuestProgress { p: number; c: boolean }
export interface Pledge { min: number; days: number; start: string; coin: number; xp: number; done: string[]; finished?: boolean }
export interface QuestState {
  day: string; daily: Record<string, QuestProgress>;
  week: string; weekly: Record<string, QuestProgress>;
  login: { streak: number; last: string | null; claimedDay: string | null };
  loginDays: string[];
  pledge: Pledge | null;
}
export const newQuestState = (): QuestState => ({ day: '', daily: {}, week: '', weekly: {}, login: { streak: 0, last: null, claimedDay: null }, loginDays: [], pledge: null });
export const cloneQuests = (q: QuestState): QuestState => ({
  ...q, daily: Object.fromEntries(Object.entries(q.daily).map(([k, v]) => [k, { ...v }])), weekly: Object.fromEntries(Object.entries(q.weekly).map(([k, v]) => [k, { ...v }])),
  login: { ...q.login }, loginDays: [...q.loginDays], pledge: q.pledge ? { ...q.pledge, done: [...q.pledge.done] } : null,
});

/* ---------- the player's own calendar ---------- */
export interface Clock { day: string; week: string; hour: number; minute: number }
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (t: Date) => `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
export const clampTz = (tz: unknown) => (typeof tz === 'number' && Number.isFinite(tz) ? Math.max(-720, Math.min(840, Math.round(tz))) : 0);
/** tz = minutes east of UTC (Turkey: 180). In a browser: -new Date().getTimezoneOffset(). */
export function clock(now: number, tz: number): Clock {
  const t = new Date(now + clampTz(tz) * 60_000);
  return { day: ymd(t), week: isoWeek(t), hour: t.getUTCHours(), minute: t.getUTCHours() * 60 + t.getUTCMinutes() };
}
function isoWeek(t0: Date) {
  const t = new Date(Date.UTC(t0.getUTCFullYear(), t0.getUTCMonth(), t0.getUTCDate()));
  const dow = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dow);
  const y0 = Date.UTC(t.getUTCFullYear(), 0, 1);
  return `${t.getUTCFullYear()}-W${Math.ceil(((t.getTime() - y0) / 864e5 + 1) / 7)}`;
}
export const shiftDay = (d: string, n: number) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return ymd(t); };
export const weekOf = (d: string) => isoWeek(new Date(d + 'T12:00:00Z'));

/* ---------- progress (these change a wallet that is already a copy) ---------- */
/** start the day's / week's lists over when the calendar moved on */
export function roll(q: QuestState, day: string, week: string) {
  if (q.day !== day) { q.day = day; q.daily = {}; }
  if (q.week !== week) { q.week = week; q.weekly = {}; }
}
/** add `amount`, or set to `abs` when given; never past the goal, never after it was claimed */
export function bump(q: QuestState, id: string, amount: number, abs?: number) {
  const def = DEF.get(id); if (!def) return;
  const list = id.startsWith('d_') ? q.daily : q.weekly;
  const cur = list[id] ?? { p: 0, c: false };
  if (cur.c) return;
  const p = Math.min(def.goal, abs ?? cur.p + amount);
  if (p <= 0 && !list[id]) return;
  list[id] = { p, c: false };
}
const daysWith = (w: Wallet, day: string, ok: (d: string) => boolean) => { let n = 0; for (let i = 0; i < 7; i++) if (ok(shiftDay(day, -i))) n++; return n; };

/** after a focus session (called by rewardFocus) */
export function progressFocus(w: Wallet, r: { day: string; week: string; minutes: number; completed: boolean; together: boolean }, lines: string[]) {
  const q = w.q; roll(q, r.day, r.week);
  if (r.minutes > 0) {
    bump(q, 'd_min', 0, w.stats.days[r.day] ?? 0);
    bump(q, 'w_min', r.minutes);
    // only the days of this week count for the balanced week
    bump(q, 'w_balance', 0, daysWith(w, r.day, (d) => weekOf(d) === r.week && (w.stats.days[d] ?? 0) >= 25));
  }
  if (r.completed) { bump(q, 'd_pomo', 1); if (r.together) bump(q, 'd_together', 1); }
  // the promise: today counts once the day's minutes reach it; the last day pays
  const P = q.pledge;
  if (P && !P.finished) {
    if ((w.stats.days[r.day] ?? 0) >= P.min && !P.done.includes(r.day)) P.done.push(r.day);
    if (P.done.length >= P.days) { P.finished = true; w.xp += P.xp; w.coins += P.coin; lines.push('Söz tamamlandı'); return { xp: P.xp, coins: P.coin }; }
  }
  return { xp: 0, coins: 0 };
}

const copy = (w: Wallet): Wallet => ({ ...w, q: cloneQuests(w.q), stats: { ...w.stats } });

export function loginTick(w0: Wallet, k: Clock): Wallet {
  const w = copy(w0), q = w.q; roll(q, k.day, k.week);
  if (!q.loginDays.includes(k.day)) q.loginDays = [...q.loginDays, k.day].slice(-60);
  if (q.login.last !== k.day) { q.login.streak = q.login.last === shiftDay(k.day, -1) ? q.login.streak + 1 : 1; q.login.last = k.day; }
  bump(q, 'd_login', 0, 1);
  let run = 0; while (run < 7 && q.loginDays.includes(shiftDay(k.day, -run))) run++;
  bump(q, 'w_days', 0, run);
  return w;
}
export function noteChat(w0: Wallet, k: Clock): Wallet {
  const w = copy(w0); roll(w.q, k.day, k.week); bump(w.q, 'd_social', 1); w.stats.msgs = (w.stats.msgs ?? 0) + 1;
  checkAchievements(w, {});
  return w;
}
export function noteDecor(w0: Wallet, added: number, k: Clock): Wallet {
  if (!(added > 0)) return w0;
  const w = copy(w0); roll(w.q, k.day, k.week); bump(w.q, 'w_decor', Math.floor(added)); return w;
}

/* ---------- paying out ---------- */
export type Payout = { ok: true; wallet: Wallet; gained: { xp: number; coins: number }; levelUp: number; name: string } | { ok: false; reason: 'unknown' | 'not_done' | 'claimed' };
function pay(w: Wallet, before: number, xp: number, coins: number, name: string): Payout {
  w.xp += xp; w.coins += coins; const after = levelFromXP(w.xp).level;
  return { ok: true, wallet: w, gained: { xp, coins }, levelUp: after > before ? after : 0, name };
}
export function claimQuest(w0: Wallet, id: string, k: Clock): Payout {
  const def = DEF.get(id); if (!def) return { ok: false, reason: 'unknown' };
  const w = copy(w0); roll(w.q, k.day, k.week);
  const cur = (id.startsWith('d_') ? w.q.daily : w.q.weekly)[id];
  if (cur?.c) return { ok: false, reason: 'claimed' };
  if (!cur || cur.p < def.goal) return { ok: false, reason: 'not_done' };
  cur.c = true;
  return pay(w, levelFromXP(w0.xp).level, def.xp, def.coin, 'Görev tamamlandı: ' + def.name);
}
export function claimLogin(w0: Wallet, k: Clock): Payout {
  const w = copy(w0), L = w.q.login;
  if (L.last !== k.day) return { ok: false, reason: 'not_done' };
  if (L.claimedDay === k.day) return { ok: false, reason: 'claimed' };
  const idx = (Math.max(1, L.streak) - 1) % 7; L.claimedDay = k.day;
  return pay(w, levelFromXP(w0.xp).level, idx === 6 ? 40 : 0, LOGIN_REWARDS[idx], `Günlük giriş ödülü · ${idx + 1}. gün`);
}
export function setPledge(w0: Wallet, min: number, days: number, k: Clock): Wallet {
  const pd = PLEDGE_DAYS.find((x) => x[0] === days);
  if (!pd || !(PLEDGE_MIN as readonly number[]).includes(min)) return w0;
  const w = copy(w0); w.q.pledge = { min, days, start: k.day, coin: pd[1], xp: pd[2], done: [] };
  if ((w.stats.days[k.day] ?? 0) >= min) w.q.pledge.done.push(k.day);
  return w;
}
export const cancelPledge = (w0: Wallet): Wallet => { const w = copy(w0); w.q.pledge = null; return w; };

/** the quest lists as they are today (yesterday's progress is gone) — for showing */
export function questView(w: Wallet, k: Clock): QuestState { const q = cloneQuests(w.q); roll(q, k.day, k.week); return q; }
export function questsReady(w: Wallet, k: Clock) {
  const q = questView(w, k); let n = 0;
  for (const d of QUESTS.daily) { const x = q.daily[d.id]; if (x && !x.c && x.p >= d.goal) n++; }
  for (const d of QUESTS.weekly) { const x = q.weekly[d.id]; if (x && !x.c && x.p >= d.goal) n++; }
  if (q.login.last === k.day && q.login.claimedDay !== k.day) n++;
  return n;
}

/** repair quest data from storage or an old version */
export function sanitizeQuests(v: unknown): QuestState {
  const d = newQuestState(); if (!v || typeof v !== 'object') return d;
  const o = v as Record<string, any>;
  const str = (x: unknown) => (typeof x === 'string' ? x.slice(0, 12) : '');
  const list = (x: unknown) => Object.fromEntries(Object.entries(x && typeof x === 'object' ? x : {}).filter(([k, p]) => DEF.has(k) && p && typeof p === 'object')
    .map(([k, p]: [string, any]) => [k, { p: Number.isFinite(p.p) ? Math.max(0, Math.min(DEF.get(k)!.goal, Math.floor(p.p))) : 0, c: !!p.c }]));
  const L = o.login && typeof o.login === 'object' ? o.login : {};
  const P = o.pledge;
  const pledge = P && typeof P === 'object' && Number.isFinite(P.min) && Number.isFinite(P.days) && Number.isFinite(P.coin) && Number.isFinite(P.xp) && Array.isArray(P.done)
    ? { min: P.min, days: P.days, coin: Math.max(0, P.coin), xp: Math.max(0, P.xp), start: str(P.start), done: P.done.filter((x: unknown) => typeof x === 'string').slice(-40), ...(P.finished ? { finished: true } : {}) } : null;
  return {
    day: str(o.day), daily: list(o.daily), week: str(o.week), weekly: list(o.weekly),
    login: { streak: Number.isFinite(L.streak) ? Math.max(0, Math.floor(L.streak)) : 0, last: typeof L.last === 'string' ? L.last : null, claimedDay: typeof L.claimedDay === 'string' ? L.claimedDay : null },
    loginDays: (Array.isArray(o.loginDays) ? o.loginDays : []).filter((x: unknown) => typeof x === 'string').slice(-60),
    pledge,
  };
}
