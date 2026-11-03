// Economy rules: XP, levels, coins, achievements and the shop. Pure functions; the server (or the
// demo room) is the only one that applies them, so a player can never write their own coins.
import { ROOM_FURN, ROOM_THEMES, ROOM_VIEWS, ROOM_SIZES, OLD_STARTER } from './roomCatalog';
import { PARTS, ACCESSORIES, ACC_NAMES, type Avatar, type Gender, type Slot } from './avatar';
import { newQuestState, cloneQuests, progressFocus, sanitizeQuests, weekOf, clampTz, type QuestState } from './quests';

export const ECON = {
  xpPerMin: 1, coinPerMin: 1,
  pomoXP: 10, pomoCoin: 5,
  setBonusXP: 25, setBonusCoin: 15,          // every 4th pomodoro
  groupBonusPer: 0.1, groupBonusMax: 0.3,    // +10% for each other person focusing, at most +30%
  dailyGoal: 4, dailyGoalCoin: 40,
  startCoins: 150,
  maxMinutes: 180,                           // one session can never pay more than this
} as const;

// pace (user, 2026-11-03: some effort, not a grind): level 2 ≈ 1 day of 4 pomodoros, level 5 ≈ 9 days, level 10 ≈ 8 weeks
export const xpStep = (L: number) => Math.round(100 * Math.pow(L, 1.4));
export function levelFromXP(xp: number) {
  let level = 1, need = xpStep(1), rest = Math.max(0, Math.floor(xp || 0));
  while (rest >= need && level < 99) { rest -= need; level++; need = xpStep(level); }
  return { level, into: rest, need };
}
const TITLES: [number, string][] = [[1, 'Çaylak'], [3, 'Tomurcuk'], [5, 'Odak Çırağı'], [7, 'Masa Kurdu'], [9, 'Derin Odak'], [12, 'Zaman Bükücü'], [15, 'Pomodoro Ustası'], [18, 'Odak Bilgesi'], [22, 'Efsane']];
export const titleFor = (L: number) => TITLES.reduce((t, [l, n]) => (L >= l ? n : t), TITLES[0][1]);

/** one focus session for the statistics: day, start (minute of the day), minutes, category */
export interface LogEntry { d: string; s: number; m: number; c: string }
export interface Stats {
  focusMin: number; pomos: number; streak: number; lastDay: string | null; days: Record<string, number>; dayPomos: Record<string, number>;
  /** minutes per hour of the day (0–23) */
  hours: Record<string, number>; log: LogEntry[]; weekXP: Record<string, number>; msgs: number;
}
export interface Wallet {
  xp: number; coins: number;
  owned: Record<string, number>;
  stats: Stats;
  ach: Record<string, number>;
  q: QuestState;
  /** the player's time zone (minutes east of UTC), so days and weeks follow their own clock */
  tz: number;
}
const LOG_MAX = 400;
/** Like the original game: a desk, a chair, the wood theme, the city view and the small room. */
export const STARTER: Record<string, number> = { f_desk_wood: 1, f_chair_wood: 2, ...Object.fromEntries(OLD_STARTER.map((id) => [id, 1])) };
const newStats = (): Stats => ({ focusMin: 0, pomos: 0, streak: 0, lastDay: null, days: {}, dayPomos: {}, hours: {}, log: [], weekXP: {}, msgs: 0 });
export const newWallet = (): Wallet => ({ xp: 0, coins: ECON.startCoins, owned: { ...STARTER }, stats: newStats(), ach: {}, q: newQuestState(), tz: 0 });
const clone = (w: Wallet): Wallet => ({
  ...w, owned: { ...w.owned }, ach: { ...w.ach }, q: cloneQuests(w.q),
  stats: { ...w.stats, days: { ...w.stats.days }, dayPomos: { ...w.stats.dayPomos }, hours: { ...w.stats.hours }, log: [...w.stats.log], weekXP: { ...w.stats.weekXP } },
});

export interface AchContext { longFocus?: boolean; endHour?: number }

export const ACHIEVEMENTS: { id: string; name: string; desc: string; coin: number; test: (w: Wallet, ctx: AchContext) => boolean }[] = [
  { id: 'first', name: 'İlk Domates', desc: 'İlk pomodoronu tamamla', coin: 30, test: (w) => w.stats.pomos >= 1 },
  { id: 'p10', name: 'Onluk', desc: '10 pomodoro tamamla', coin: 60, test: (w) => w.stats.pomos >= 10 },
  { id: 'p50', name: 'Elli Domates', desc: '50 pomodoro tamamla', coin: 150, test: (w) => w.stats.pomos >= 50 },
  { id: 'p100', name: 'Domates Tarlası', desc: '100 pomodoro tamamla', coin: 300, test: (w) => w.stats.pomos >= 100 },
  { id: 'h10', name: '10 Saat Kulübü', desc: 'Toplam 10 saat odaklan', coin: 120, test: (w) => w.stats.focusMin >= 600 },
  { id: 's3', name: 'Isınma Turu', desc: '3 günlük seri yap', coin: 50, test: (w) => w.stats.streak >= 3 },
  { id: 's7', name: 'Haftalık Seri', desc: '7 günlük seri yap', coin: 140, test: (w) => w.stats.streak >= 7 },
  { id: 'deep', name: 'Derin Dalış', desc: '90 dakikalık bir oturum tamamla', coin: 80, test: (_w, c) => !!c.longFocus },
  { id: 'night', name: 'Gece Kuşu', desc: 'Saat 23:00 sonrası bir pomodoro bitir', coin: 40, test: (_w, c) => c.endHour != null && c.endHour >= 23 },
  { id: 'early', name: 'Erkenci', desc: 'Saat 07:00 öncesi bir pomodoro bitir', coin: 40, test: (_w, c) => c.endHour != null && c.endHour < 7 },
  { id: 'social', name: 'Sosyal Kelebek', desc: '20 sohbet mesajı gönder', coin: 40, test: (w) => (w.stats.msgs ?? 0) >= 20 },
  { id: 'collect', name: 'Koleksiyoncu', desc: '20 farklı eşyaya sahip ol', coin: 150, test: (w) => Object.keys(w.owned).length >= 20 },
];

/** give every achievement that became true (changes `w`); returns the names */
export function checkAchievements(w: Wallet, ctx: AchContext): { names: string[]; coins: number } {
  const names: string[] = []; let coins = 0;
  for (const a of ACHIEVEMENTS) if (!w.ach[a.id] && a.test(w, ctx)) { w.ach[a.id] = 1; w.coins += a.coin; coins += a.coin; names.push(a.name); }
  return { names, coins };
}

const prevDay = (d: string) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() - 1); return t.toISOString().slice(0, 10); };

export interface FocusResult {
  minutes: number; completed: boolean; round: number; others: number; day: string; longFocus: boolean;
  /** ISO week of `day` (worked out from the day when missing) */
  week?: string;
  /** player's local minute of the day when the counted time began (for the statistics) */
  startMin?: number;
  /** what they worked on (Ders, Kodlama…) */
  cat?: string;
}
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
  const week = r.week ?? weekOf(r.day);
  if (xp) w.stats.weekXP[week] = (w.stats.weekXP[week] ?? 0) + xp;
  let endHour: number | undefined;
  if (minutes && r.startMin != null && Number.isFinite(r.startMin)) {
    const s = ((Math.floor(r.startMin) % 1440) + 1440) % 1440;
    for (let i = 0; i < minutes; i++) { const h = String(Math.floor(((s + i) % 1440) / 60)); w.stats.hours[h] = (w.stats.hours[h] ?? 0) + 1; }
    w.stats.log = [...w.stats.log, { d: r.day, s, m: minutes, c: (r.cat || 'Diğer').slice(0, 20) }].slice(-LOG_MAX);
    endHour = Math.floor(((s + minutes) % 1440) / 60);
  }
  const extra = progressFocus(w, { day: r.day, week, minutes, completed: r.completed, together: r.completed && r.others > 0 }, lines);
  xp += extra.xp; coins += extra.coins;
  const got = checkAchievements(w, { longFocus: r.completed && r.longFocus, endHour: r.completed ? endHour : undefined });
  coins += got.coins; for (const n of got.names) lines.push(`Başarım: ${n}`);
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
// accessories (user 2026-11-03): for both bodies, bought once, worn from the wardrobe
const ACC_PRICE: Record<string, [number, number]> = { glasses: [80, 1], sunglasses: [120, 2], catears: [150, 3], headphones: [180, 3], beanie: [120, 2], cap: [140, 4], flowers: [200, 5], crown: [400, 8] };
const accItems: Item[] = ACCESSORIES.slice(1).map((a) => ({ id: `av.acc.${a}`, name: ACC_NAMES[a] ?? a, cat: 'avatar' as const, sub: 'Aksesuar', part: a, price: ACC_PRICE[a]?.[0] ?? 150, lvl: ACC_PRICE[a]?.[1] ?? 3 }));

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

export const CATALOG: readonly Item[] = [...avatarItems, ...accItems, ...roomItems];
/** what opens exactly at level `lv` (the level-up window shows up to 8, like v1 ui.levelUp) */
export const unlocksAt = (lv: number): Item[] => {
  const at = CATALOG.filter((i) => i.lvl === lv), seen = new Set<string>();
  // room things first (they have pictures); an outfit part is listed once, not once per gender
  return [...at.filter((i) => i.cat !== 'avatar'), ...at.filter((i) => i.cat === 'avatar')]
    .filter((i) => { const k = i.name + '/' + (i.slot ?? i.cat); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 8);
};
const BY_ID = new Map(CATALOG.map((i) => [i.id, i]));
export const itemById = (id: string) => BY_ID.get(id);
export const isFree = (i: Item) => i.price === 0;
/** Avatar parts that cost nothing are everyone's; room things (even free ones) are counted copies. */
export const owns = (w: Wallet, id: string) => { const i = BY_ID.get(id); return !!i && ((i.cat === 'avatar' && isFree(i)) || (w.owned[id] ?? 0) > 0); };

export type BuyResult = { ok: true; wallet: Wallet; item: Item } | { ok: false; reason: 'unknown' | 'owned' | 'level' | 'coins' };
/** ready-made corners (user 2026-11-03: a richer shop): things that look good together, cheaper as a set */
export interface Bundle { id: string; name: string; desc: string; items: string[] }
export const BUNDLES: Bundle[] = [
  { id: 'set.lofi', name: 'Lo-fi Çalışma Köşesi', desc: 'Masa lambası, kupa, kulaklık, kitaplar ve desenli poster.', items: ['d_lamp', 'd_mug', 'd_headphones', 'd_books', 'w_poster_art', 'd_plant'] },
  { id: 'set.reading', name: 'Okuma Köşesi', desc: 'Berjer, lambader, kitaplık, kum saati ve peluş halı.', items: ['f_armchair', 'f_lamp_floor', 'f_bookshelf', 'd_hourglass', 'f_rug_shag'] },
  { id: 'set.jungle', name: 'Bitki Cenneti', desc: 'Deve tabanı, cennet kuşu, sukulentler, sarmaşık ve çiçekli vazo.', items: ['f_monstera', 'f_bird_paradise', 'f_succulents', 'w_ivy', 'f_flower_vase'] },
  { id: 'set.game', name: 'Oyun Köşesi', desc: 'Konsol ve TV, armut koltuk, örgü puf, kendi neon yazın.', items: ['f_console', 'f_beanbag', 'f_pouf', 'w_neon_text'] },
  { id: 'set.zen', name: 'Sakin Yoga Köşesi', desc: 'Yoga matı, mum seti, bonsai, kristal küre ve ay lambası.', items: ['f_yoga_mat', 'f_candles', 'f_bonsai', 'd_crystal', 'w_moon'] },
  { id: 'set.cozy', name: 'Masal Odası', desc: 'Mantar lamba, yıldız perdesi, tavşan, harfli flama ve yazılı paspas.', items: ['f_lamp_mushroom', 'w_star_lights', 'f_bunny', 'w_garland', 'f_doormat'] },
];
const BUNDLE_OFF = 0.8; // a set costs 20% less than its things one by one
export const bundleById = (id: string) => BUNDLES.find((b) => b.id === id);
export const bundlePrice = (b: Bundle) => Math.round(b.items.reduce((a, id) => a + (BY_ID.get(id)?.price ?? 0), 0) * BUNDLE_OFF / 10) * 10;
export const bundleLevel = (b: Bundle) => Math.max(1, ...b.items.map((id) => BY_ID.get(id)?.lvl ?? 1));

export function buy(w0: Wallet, id: string): BuyResult {
  const set = bundleById(id);
  if (set) {
    if (levelFromXP(w0.xp).level < bundleLevel(set)) return { ok: false, reason: 'level' };
    const price = bundlePrice(set);
    if (w0.coins < price) return { ok: false, reason: 'coins' };
    const w = clone(w0); w.coins -= price;
    for (const it of set.items) w.owned[it] = (w.owned[it] ?? 0) + 1;
    checkAchievements(w, {});
    return { ok: true, wallet: w, item: { id: set.id, name: set.name, cat: 'furn', price, lvl: bundleLevel(set) } };
  }
  const item = BY_ID.get(id);
  if (!item) return { ok: false, reason: 'unknown' };
  if (item.cat !== 'furn' && owns(w0, id)) return { ok: false, reason: 'owned' };
  if (levelFromXP(w0.xp).level < item.lvl) return { ok: false, reason: 'level' };
  if (w0.coins < item.price) return { ok: false, reason: 'coins' };
  const w = clone(w0); w.coins -= item.price; w.owned[id] = (w.owned[id] ?? 0) + 1;
  checkAchievements(w, {});
  return { ok: true, wallet: w, item };
}

/** May this wallet wear this avatar? Every visible part must be free or owned. */
export function avatarAllowed(w: Wallet, a: Avatar): boolean {
  return (['head', 'body', 'legs', 'feet'] as Slot[]).every((s) => owns(w, `av.${a.g}.${a[s]}`)) && (!a.acc || owns(w, `av.acc.${ACCESSORIES[a.acc]}`));
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
  for (const [k, c] of Object.entries(STARTER)) if ((owned[k] ?? 0) < c) owned[k] = c;
  return {
    xp: n(o.xp), coins: n(o.coins, d.coins) + refund,
    owned,
    ach: rec(o.ach),
    stats: {
      focusMin: n(s.focusMin), pomos: n(s.pomos), streak: n(s.streak), lastDay: typeof s.lastDay === 'string' ? s.lastDay : null, days: rec(s.days), dayPomos: rec(s.dayPomos),
      hours: rec(s.hours), weekXP: rec(s.weekXP), msgs: n(s.msgs),
      log: (Array.isArray(s.log) ? s.log : []).filter((e): e is LogEntry => !!e && typeof e === 'object' && typeof e.d === 'string' && Number.isFinite(e.s) && Number.isFinite(e.m))
        .map((e) => ({ d: e.d.slice(0, 10), s: Math.floor(e.s), m: Math.floor(e.m), c: typeof e.c === 'string' ? e.c.slice(0, 20) : 'Diğer' })).slice(-LOG_MAX),
    },
    q: sanitizeQuests(o.q),
    tz: clampTz(o.tz),
  };
}

/* ---------- leagues and the weekly board (v1 js/data.js PW.LEAGUES, js/ui.js renderProfile) ---------- */
export interface League { id: string; name: string; min: number; color: string }
export const LEAGUES: readonly League[] = [
  { id: 'bronz', name: 'Bronz Lig', min: 0, color: '#C98B5A' },
  { id: 'gumus', name: 'Gümüş Lig', min: 300, color: '#B9C2CC' },
  { id: 'altin', name: 'Altın Lig', min: 900, color: '#E9C04F' },
  { id: 'platin', name: 'Platin Lig', min: 1800, color: '#7FD3C8' },
  { id: 'elmas', name: 'Elmas Lig', min: 3000, color: '#9DB7FF' },
];
/** the league for this week's XP */
export const leagueFor = (wxp: number): League => LEAGUES.reduce((l, x) => (wxp >= x.min ? x : l), LEAGUES[0]);
/** the next league up and the XP still missing this week; null at the top */
export function nextLeague(wxp: number): { league: League; need: number } | null {
  const n = LEAGUES.find((l) => l.min > wxp);
  return n ? { league: n, need: n.min - wxp } : null;
}
export interface BoardRow { id: string; n: string; lv: number; wx: number; rank: number; me?: boolean }
/** me + others sorted by weekly XP; top 10, and if I am not in it I take the last line with my real rank */
export function weekBoard(me: Omit<BoardRow, 'rank' | 'me'>, others: Omit<BoardRow, 'rank' | 'me'>[]): BoardRow[] {
  const all = [{ ...me, me: true }, ...others.filter((o) => o.id !== me.id)]
    .sort((a, b) => b.wx - a.wx || Number(!!(b as BoardRow).me) - Number(!!(a as BoardRow).me))
    .map((r, i) => ({ ...r, rank: i + 1 })) as BoardRow[];
  const top = all.slice(0, 10);
  if (top.some((r) => r.me)) return top;
  return [...top.slice(0, 9), all.find((r) => r.me)!];
}
