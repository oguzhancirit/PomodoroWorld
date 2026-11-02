// Economy rules: XP, levels, coins, achievements and the shop. Pure functions; the server (or the
// demo room) is the only one that applies them, so a player can never write their own coins.
import { ROOM_FURN, ROOM_THEMES, ROOM_VIEWS, ROOM_SIZES, OLD_STARTER } from './roomCatalog';
import { PARTS, type Avatar, type Gender, type Slot } from './avatar';

export const ECON = {
  xpPerMin: 1, coinPerMin: 1,
  pomoXP: 10, pomoCoin: 5,
  setBonusXP: 25, setBonusCoin: 15,          // every 4th pomodoro
  groupBonusPer: 0.1, groupBonusMax: 0.3,    // +10% for each other person focusing, at most +30%
  dailyGoal: 4, dailyGoalCoin: 40,
  startCoins: 150,
  maxMinutes: 180,                           // one session can never pay more than this
} as const;

export const xpStep = (L: number) => Math.round(60 * Math.pow(L, 1.35));
export function levelFromXP(xp: number) {
  let level = 1, need = xpStep(1), rest = Math.max(0, Math.floor(xp || 0));
  while (rest >= need && level < 99) { rest -= need; level++; need = xpStep(level); }
  return { level, into: rest, need };
}
const TITLES: [number, string][] = [[1, 'Çaylak'], [3, 'Tomurcuk'], [5, 'Odak Çırağı'], [7, 'Masa Kurdu'], [9, 'Derin Odak'], [12, 'Zaman Bükücü'], [15, 'Pomodoro Ustası'], [18, 'Odak Bilgesi'], [22, 'Efsane']];
export const titleFor = (L: number) => TITLES.reduce((t, [l, n]) => (L >= l ? n : t), TITLES[0][1]);

export interface Wallet {
  xp: number; coins: number;
  owned: Record<string, number>;
  stats: { focusMin: number; pomos: number; streak: number; lastDay: string | null; days: Record<string, number>; dayPomos: Record<string, number> };
  ach: Record<string, number>;
}
/** Like the original game: a desk, a chair, the wood theme, the city view and the small room. */
export const STARTER: Record<string, number> = { f_desk_wood: 1, f_chair_wood: 1, ...Object.fromEntries(OLD_STARTER.map((id) => [id, 1])) };
export const newWallet = (): Wallet => ({ xp: 0, coins: ECON.startCoins, owned: { ...STARTER }, stats: { focusMin: 0, pomos: 0, streak: 0, lastDay: null, days: {}, dayPomos: {} }, ach: {} });
const clone = (w: Wallet): Wallet => ({ ...w, owned: { ...w.owned }, ach: { ...w.ach }, stats: { ...w.stats, days: { ...w.stats.days }, dayPomos: { ...w.stats.dayPomos } } });

export const ACHIEVEMENTS: { id: string; name: string; desc: string; coin: number; test: (w: Wallet, ctx: { longFocus: boolean }) => boolean }[] = [
  { id: 'first', name: 'İlk Domates', desc: 'İlk pomodoronu tamamla', coin: 30, test: (w) => w.stats.pomos >= 1 },
  { id: 'p10', name: 'Onluk', desc: '10 pomodoro tamamla', coin: 60, test: (w) => w.stats.pomos >= 10 },
  { id: 'p50', name: 'Elli Domates', desc: '50 pomodoro tamamla', coin: 150, test: (w) => w.stats.pomos >= 50 },
  { id: 'p100', name: 'Domates Tarlası', desc: '100 pomodoro tamamla', coin: 300, test: (w) => w.stats.pomos >= 100 },
  { id: 'h10', name: '10 Saat Kulübü', desc: 'Toplam 10 saat odaklan', coin: 120, test: (w) => w.stats.focusMin >= 600 },
  { id: 's3', name: 'Isınma Turu', desc: '3 günlük seri yap', coin: 50, test: (w) => w.stats.streak >= 3 },
  { id: 's7', name: 'Haftalık Seri', desc: '7 günlük seri yap', coin: 140, test: (w) => w.stats.streak >= 7 },
  { id: 'deep', name: 'Derin Dalış', desc: '90 dakikalık bir oturum tamamla', coin: 80, test: (_w, c) => c.longFocus },
  { id: 'collect', name: 'Koleksiyoncu', desc: '20 farklı eşyaya sahip ol', coin: 150, test: (w) => Object.keys(w.owned).length >= 20 },
];

const prevDay = (d: string) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() - 1); return t.toISOString().slice(0, 10); };

export interface FocusResult { minutes: number; completed: boolean; round: number; others: number; day: string; longFocus: boolean }
export function rewardFocus(w0: Wallet, r: FocusResult) {
  const w = clone(w0), lines: string[] = [];
  const before = levelFromXP(w.xp).level;
  const minutes = Math.max(0, Math.min(ECON.maxMinutes, Math.floor(r.minutes || 0)));
  const mult = 1 + Math.min(ECON.groupBonusMax, Math.max(0, Math.floor(r.others || 0)) * ECON.groupBonusPer);
  let xp = Math.floor(minutes * ECON.xpPerMin * mult + 1e-9), coins = Math.floor(minutes * ECON.coinPerMin * mult + 1e-9);
  w.stats.focusMin += minutes; w.stats.days[r.day] = (w.stats.days[r.day] ?? 0) + minutes;
  if (minutes) lines.push(`${minutes} dakika odak${mult > 1 ? ` · birlikte çalışma bonusu %${Math.round((mult - 1) * 100)}` : ''}`);
  if (r.completed) {
    w.stats.pomos += 1; w.stats.dayPomos[r.day] = (w.stats.dayPomos[r.day] ?? 0) + 1;
    xp += ECON.pomoXP; coins += ECON.pomoCoin; lines.push('Pomodoro tamamlandı');
    if (w.stats.lastDay !== r.day) {
      w.stats.streak = w.stats.lastDay === prevDay(r.day) ? w.stats.streak + 1 : 1; w.stats.lastDay = r.day;
      if (w.stats.streak > 1) { const b = Math.min(30, w.stats.streak * 2); coins += b; lines.push(`${w.stats.streak}. gün serisi`); }
    }
    if (r.round > 0 && r.round % 4 === 0) { xp += ECON.setBonusXP; coins += ECON.setBonusCoin; lines.push("4'lü set tamamlandı"); }
    if (w.stats.dayPomos[r.day] === ECON.dailyGoal) { coins += ECON.dailyGoalCoin; lines.push('Günlük hedef tamam'); }
  }
  w.xp += xp; w.coins += coins;
  for (const a of ACHIEVEMENTS) if (!w.ach[a.id] && a.test(w, { longFocus: r.completed && r.longFocus })) { w.ach[a.id] = 1; w.coins += a.coin; coins += a.coin; lines.push(`Başarım: ${a.name}`); }
  const after = levelFromXP(w.xp).level;
  return { wallet: w, gained: { xp, coins }, lines, levelUp: after > before ? after : 0 };
}

/* ---------- catalog ---------- */
export interface Item { id: string; name: string; cat: 'avatar' | 'furn' | 'theme' | 'view' | 'size'; price: number; lvl: number; g?: Gender; slot?: Slot; part?: string; sub?: string; wall?: number; size?: number }
const PART_NAMES: Record<string, string> = {
  Casual: 'Günlük', Casual_Hoodie: 'Kapüşonlu', Casual_2: 'Rahat', Formal: 'Şık', Suit: 'Takım', Punk: 'Punk', SciFi: 'Bilimkurgu',
  Adventurer: 'Gezgin', Soldier: 'Kısa saç', Medieval: 'Ortaçağ', Witch: 'Cadı şapkası', Worker: 'İşçi', Beach: 'Plaj', Farmer: 'Çiftçi', King: 'Taç',
};
export const partName = (part: string) => PART_NAMES[part.replace(/_(Head|Body|Legs|Feet)$/, '')] ?? part;

const avatarItems: Item[] = (['f', 'm'] as Gender[]).flatMap((g) => (['head', 'body', 'legs', 'feet'] as Slot[]).flatMap((slot) =>
  PARTS[g][slot].map((part, i) => ({
    id: `av.${g}.${part}`, name: partName(part), cat: 'avatar' as const, g, slot, part,
    // the first two of every slot are free; the rest cost coins and some need a level
    price: i < 2 ? 0 : 60 + (i - 2) * 30, lvl: i < 3 ? 1 : Math.min(12, i),
  }))));

// The first v2 shop sold a few KayKit pieces before the personal room existed.
// They are replaced by the original room catalog; whoever bought one gets the coins back.
const KAYKIT_REFUND: Record<string, number> = {
  lamp_table: 40, book_set: 30, cactus_small_A: 35, cactus_medium_A: 90, rug_oval_A: 60, rug_rectangle_stripes_A: 90, chair_B_wood: 50, armchair_pillows: 220,
  couch_pillows: 320, table_low: 120, shelf_B_small_decorated: 110, shelf_B_large_decorated: 180, cabinet_medium_decorated: 240, lamp_standing: 140, pictureframe_large_A: 150, pictureframe_medium: 70,
};
const roomItems: Item[] = [
  ...ROOM_FURN.map((f) => ({ ...f, cat: 'furn' as const })),
  ...ROOM_THEMES.map((t) => ({ ...t, cat: 'theme' as const })),
  ...ROOM_VIEWS.map((t) => ({ ...t, cat: 'view' as const })),
  ...ROOM_SIZES.map((t) => ({ ...t, cat: 'size' as const })),
];

export const CATALOG: readonly Item[] = [...avatarItems, ...roomItems];
const BY_ID = new Map(CATALOG.map((i) => [i.id, i]));
export const itemById = (id: string) => BY_ID.get(id);
export const isFree = (i: Item) => i.price === 0;
/** Avatar parts that cost nothing are everyone's; room things (even free ones) are counted copies. */
export const owns = (w: Wallet, id: string) => { const i = BY_ID.get(id); return !!i && ((i.cat === 'avatar' && isFree(i)) || (w.owned[id] ?? 0) > 0); };

export type BuyResult = { ok: true; wallet: Wallet; item: Item } | { ok: false; reason: 'unknown' | 'owned' | 'level' | 'coins' };
export function buy(w0: Wallet, id: string): BuyResult {
  const item = BY_ID.get(id);
  if (!item) return { ok: false, reason: 'unknown' };
  if (item.cat !== 'furn' && owns(w0, id)) return { ok: false, reason: 'owned' };
  if (levelFromXP(w0.xp).level < item.lvl) return { ok: false, reason: 'level' };
  if (w0.coins < item.price) return { ok: false, reason: 'coins' };
  const w = clone(w0); w.coins -= item.price; w.owned[id] = (w.owned[id] ?? 0) + 1;
  for (const a of ACHIEVEMENTS) if (!w.ach[a.id] && a.test(w, { longFocus: false })) { w.ach[a.id] = 1; w.coins += a.coin; }
  return { ok: true, wallet: w, item };
}

/** May this wallet wear this avatar? Every visible part must be free or owned. */
export function avatarAllowed(w: Wallet, a: Avatar): boolean {
  return (['head', 'body', 'legs', 'feet'] as Slot[]).every((s) => owns(w, `av.${a.g}.${a[s]}`));
}

/** Repair a wallet that came from storage or an old version. */
export function sanitizeWallet(v: unknown): Wallet {
  const d = newWallet(); if (!v || typeof v !== 'object') return d;
  const o = v as Partial<Wallet>; const n = (x: unknown, def = 0) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : def);
  const rec = (r: unknown) => Object.fromEntries(Object.entries(r && typeof r === 'object' ? r : {}).filter(([, x]) => typeof x === 'number' && Number.isFinite(x) && x >= 0)) as Record<string, number>;
  const s = (o.stats ?? {}) as Partial<Wallet['stats']>;
  const owned0 = rec(o.owned); let refund = 0;
  for (const [k, c] of Object.entries(owned0)) if (k.startsWith('furn.')) refund += (KAYKIT_REFUND[k.slice(5)] ?? 0) * Math.floor(c);
  const owned = Object.fromEntries(Object.entries(owned0).filter(([k]) => BY_ID.has(k)).map(([k, c]) => [k, Math.floor(c)]));
  for (const [k, c] of Object.entries(STARTER)) if (!owned[k]) owned[k] = c;
  return {
    xp: n(o.xp), coins: n(o.coins, d.coins) + refund,
    owned,
    ach: rec(o.ach),
    stats: { focusMin: n(s.focusMin), pomos: n(s.pomos), streak: n(s.streak), lastDay: typeof s.lastDay === 'string' ? s.lastDay : null, days: rec(s.days), dayPomos: rec(s.dayPomos) },
  };
}
