// "Pomo Canavarları": the one-player mini game on the console in the Oyun Salonu (user, 2026-11-03).
// Our own creatures in a simple turn-based battle: fire beats leaf, leaf beats water, water beats fire.
// Pure rules here (tested); the screen lives in the client.

export type MonType = 'ates' | 'su' | 'yaprak' | 'normal';
export type MoveId = 'carp' | 'kor' | 'dalga' | 'yaprak' | 'kaya' | 'coskun' | 'dinlen';
export interface Move { id: MoveId; name: string; type: MonType; pow: number; pp: number; kind: 'hit' | 'boost' | 'heal' }
export const MOVES: Record<MoveId, Move> = {
  carp: { id: 'carp', name: 'Çarp', type: 'normal', pow: 40, pp: 30, kind: 'hit' },
  kor: { id: 'kor', name: 'Kor Topu', type: 'ates', pow: 60, pp: 15, kind: 'hit' },
  dalga: { id: 'dalga', name: 'Dalga', type: 'su', pow: 60, pp: 15, kind: 'hit' },
  yaprak: { id: 'yaprak', name: 'Yaprak Fırtınası', type: 'yaprak', pow: 60, pp: 15, kind: 'hit' },
  kaya: { id: 'kaya', name: 'Kaya Atışı', type: 'normal', pow: 55, pp: 15, kind: 'hit' },
  coskun: { id: 'coskun', name: 'Coşku', type: 'normal', pow: 0, pp: 5, kind: 'boost' },
  dinlen: { id: 'dinlen', name: 'Dinlen', type: 'normal', pow: 0, pp: 3, kind: 'heal' },
};
export const TYPE_NAME: Record<MonType, string> = { ates: 'Ateş', su: 'Su', yaprak: 'Yaprak', normal: 'Normal' };
const TYPE_MOVE: Record<MonType, MoveId> = { ates: 'kor', su: 'dalga', yaprak: 'yaprak', normal: 'kaya' };

export interface MonDef { id: string; name: string; type: MonType; base: { hp: number; atk: number; def: number; spd: number }; starter?: boolean; moves: MoveId[]; color: string }
const def = (id: string, name: string, type: MonType, hp: number, atk: number, d: number, spd: number, color: string, starter = false): MonDef =>
  ({ id, name, type, base: { hp, atk, def: d, spd }, starter, color, moves: ['carp', TYPE_MOVE[type], 'coskun', 'dinlen'] });
export const MONSTERS: MonDef[] = [
  def('kivilcik', 'Kıvılcık', 'ates', 39, 52, 43, 65, '#FF7A45', true),
  def('damlacik', 'Damlacık', 'su', 44, 48, 65, 43, '#4FA8E8', true),
  def('filiz', 'Filiz', 'yaprak', 45, 49, 49, 45, '#5CC46A', true),
  def('kayacik', 'Kayacık', 'normal', 50, 45, 70, 25, '#A39A8C'),
  def('alevkus', 'Alevkuş', 'ates', 40, 58, 38, 70, '#F2B33D'),
  def('kopukbalik', 'Köpükbalık', 'su', 52, 50, 55, 40, '#7FD6D2'),
  def('dikence', 'Dikence', 'yaprak', 48, 55, 58, 30, '#8DB04A'),
  def('pofuduk', 'Pofuduk', 'normal', 70, 40, 45, 35, '#E8A5C8'),
];
export const monDef = (id: string) => MONSTERS.find((m) => m.id === id);

const BEATS: Partial<Record<MonType, MonType>> = { ates: 'yaprak', yaprak: 'su', su: 'ates' };
/** how hard an attack of type a lands on a creature of type d */
export function typeMult(a: MonType, d: MonType) {
  if (a === 'normal' || d === 'normal') return 1;
  if (BEATS[a] === d) return 2;
  if (a === d || BEATS[d] === a) return 0.5;
  return 1;
}

export function statsAt(id: string, lv: number) {
  const b = monDef(id)!.base;
  return { hp: Math.floor((b.hp * 2 * lv) / 100) + lv + 10, atk: Math.floor((b.atk * 2 * lv) / 100) + 5, def: Math.floor((b.def * 2 * lv) / 100) + 5, spd: Math.floor((b.spd * 2 * lv) / 100) + 5 };
}

export interface Mon { id: string; name: string; type: MonType; lv: number; hp: number; max: number; atk: number; def: number; spd: number; boost: number; moves: MoveId[]; pp: Record<string, number> }
export function makeMon(id: string, lv: number): Mon {
  const d = monDef(id)!; const s = statsAt(id, lv);
  return { id, name: d.name, type: d.type, lv, hp: s.hp, max: s.hp, atk: s.atk, def: s.def, spd: s.spd, boost: 0, moves: [...d.moves], pp: Object.fromEntries(d.moves.map((m) => [m, MOVES[m].pp])) };
}

export type Rand = () => number;
/** small seeded random (mulberry32), so fights can be replayed in tests */
export function rng(seed: number): Rand {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function damage(att: Mon, target: Mon, moveId: MoveId, rnd: Rand): { dmg: number; eff: 'super' | 'weak' | 'normal' } {
  const m = MOVES[moveId];
  if (m.kind !== 'hit') return { dmg: 0, eff: 'normal' };
  const atk = att.atk * (1 + 0.5 * att.boost);
  const base = Math.floor((((2 * att.lv) / 5 + 2) * m.pow * atk) / Math.max(1, target.def) / 50) + 2;
  const mult = typeMult(m.type, target.type), stab = m.type === att.type ? 1.25 : 1, roll = 0.85 + 0.15 * rnd();
  return { dmg: Math.max(1, Math.round(base * stab * mult * roll)), eff: mult > 1 ? 'super' : mult < 1 ? 'weak' : 'normal' };
}

/** the foe's choice: a strong-against-you hit if it has one, rest when low, otherwise any attack */
function foeChoice(foe: Mon, me: Mon, rnd: Rand): MoveId {
  const ok = foe.moves.filter((m) => (foe.pp[m] ?? 0) > 0);
  const strong = ok.find((m) => MOVES[m].kind === 'hit' && typeMult(MOVES[m].type, me.type) > 1);
  if (strong) return strong;
  if (foe.hp < foe.max * 0.35 && ok.includes('dinlen')) return 'dinlen';
  if (foe.boost === 0 && ok.includes('coskun') && rnd() < 0.2) return 'coskun';
  const hits = ok.filter((m) => MOVES[m].kind === 'hit');
  return hits.length ? hits[Math.floor(rnd() * hits.length) % hits.length] : 'carp';
}

/** steps: what happened after each creature acted (lines to show, both HP values, who got hit) — for the screen */
export interface TurnStep { lines: string[]; meHp: number; foeHp: number; hit: 'me' | 'foe' | null; eff: string }
export interface TurnResult { me: Mon; foe: Mon; foeMove: MoveId; log: string[]; winner: 'me' | 'foe' | null; hits: { who: 'me' | 'foe'; dmg: number; eff: string }[]; steps: TurnStep[] }
/** one round: both choose, the faster acts first; a creature that faints does not act */
export function turn(meIn: Mon, foeIn: Mon, myMove: MoveId, rnd: Rand): TurnResult {
  if (!meIn.moves.includes(myMove) || (meIn.pp[myMove] ?? 0) <= 0) throw new Error('move not usable');
  const me: Mon = { ...meIn, pp: { ...meIn.pp } }, foe: Mon = { ...foeIn, pp: { ...foeIn.pp } };
  const foeMove = foeChoice(foe, me, rnd);
  const log: string[] = [], hits: TurnResult['hits'] = [], steps: TurnStep[] = [];
  let winner: TurnResult['winner'] = null;
  const act = (a: Mon, b: Mon, mv: MoveId, who: 'me' | 'foe') => {
    const m = MOVES[mv]; a.pp[mv] = (a.pp[mv] ?? 0) - 1;
    log.push(`${who === 'foe' ? 'Rakip ' : ''}${a.name} ${m.name} kullandı!`);
    if (m.kind === 'heal') { const before = a.hp; a.hp = Math.min(a.max, a.hp + Math.ceil(a.max * 0.4)); log.push(`${a.name} ${a.hp - before} can topladı.`); return; }
    if (m.kind === 'boost') { if (a.boost >= 3) log.push('Daha fazla coşamaz!'); else { a.boost += 1; log.push(`${a.name} coştu, saldırısı arttı!`); } return; }
    const d = damage(a, b, mv, rnd); b.hp = Math.max(0, b.hp - d.dmg); hits.push({ who: who === 'me' ? 'foe' : 'me', dmg: d.dmg, eff: d.eff });
    if (d.eff === 'super') log.push('Çok etkili!'); else if (d.eff === 'weak') log.push('Pek etkili değil…');
    if (b.hp === 0) { log.push(`${who === 'me' ? 'Rakip ' : ''}${b.name} bayıldı!`); winner = who; }
  };
  const meFirst = me.spd >= foe.spd;
  const order: [Mon, Mon, MoveId, 'me' | 'foe'][] = meFirst ? [[me, foe, myMove, 'me'], [foe, me, foeMove, 'foe']] : [[foe, me, foeMove, 'foe'], [me, foe, myMove, 'me']];
  for (const [a, b, mv, who] of order) {
    if (winner) break;
    const from = log.length, nHits = hits.length; act(a, b, mv, who);
    const h = hits.length > nHits ? hits[hits.length - 1] : null;
    steps.push({ lines: log.slice(from), meHp: me.hp, foeHp: foe.hp, hit: h ? h.who : null, eff: h ? h.eff : 'normal' });
  }
  return { me, foe, foeMove, log, winner, hits, steps };
}

/** the next wild creature: a bit stronger the longer your win streak */
export function enemyFor(streak: number, rnd: Rand, myLv = 5): Mon {
  const pool = MONSTERS;
  const pick = pool[Math.floor(rnd() * pool.length) % pool.length];
  const lv = Math.max(2, Math.min(50, myLv - 2 + Math.floor(streak / 2) + Math.floor(rnd() * 3)));
  return makeMon(pick.id, lv);
}

/* ---------- saved progress (this browser) ---------- */
export interface MonSave { starter: string; lv: number; xp: number; wins: number; best: number; streak: number }
export const newSave = (starter: string): MonSave => ({ starter, lv: 5, xp: 0, wins: 0, best: 0, streak: 0 });
export const xpToNext = (lv: number) => 20 + lv * 8;
export const xpForWin = (foeLv: number) => 10 + foeLv * 4;
export function gainXp(s: MonSave, n: number): MonSave & { leveled: boolean } {
  let { lv, xp } = s; xp += n; let leveled = false;
  while (lv < 50 && xp >= xpToNext(lv)) { xp -= xpToNext(lv); lv++; leveled = true; }
  return { ...s, lv, xp, leveled };
}
const int = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : d);
export function sanitizeSave(v: unknown): MonSave | null {
  const o = (v ?? {}) as Record<string, unknown>;
  if (typeof o.starter !== 'string' || !monDef(o.starter)?.starter) return null;
  return { starter: o.starter, lv: int(o.lv, 1, 50, 5), xp: int(o.xp, 0, 1e6, 0), wins: int(o.wins, 0, 1e7, 0), best: int(o.best, 0, 1e7, 0), streak: int(o.streak, 0, 1e7, 0) };
}
