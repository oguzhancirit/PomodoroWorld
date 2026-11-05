// Build mode helpers (user 2026-11-04: putting things in the room must be easy and never fight you).
// Instead of a red "no" the room helps: a piece slides to the closest free spot, desk things jump onto the
// nearest desk, big pieces turn their back to a wall and stand flush, chairs turn to face their table, and a
// wall piece can be aimed at the floor in front of a wall. Pure maths; the old engine calls it while you drag.
// Room coordinates: the floor is -half..half on x and z; quarter turn r: 0 faces +z, 1 +x, 2 -z, 3 -x.

export interface Rect { x: number; z: number; w: number; d: number }
export type Fp = readonly [number, number] | number[];

const r3 = (v: number) => Math.round(v * 1000) / 1000 || 0;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** the floor box of a piece: footprint [width, depth], a quarter turn swaps them */
export function rectOf(x: number, z: number, fp: Fp, r: number): Rect {
  const [w, d] = (r || 0) % 2 ? [fp[1], fp[0]] : [fp[0], fp[1]];
  return { x, z, w, d };
}

/** two boxes really overlap (touching, or 1 cm, is fine: chairs tuck right up to a desk) */
export function overlaps(a: Rect, b: Rect): boolean {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w - 0.02 && Math.abs(a.z - b.z) * 2 < a.d + b.d - 0.02;
}

/** distance from a point to a box (0 inside) and the closest point on it */
function toRect(x: number, z: number, b: Rect) {
  const cx = clamp(x, b.x - b.w / 2, b.x + b.w / 2), cz = clamp(z, b.z - b.d / 2, b.z + b.d / 2);
  return { dist: Math.hypot(x - cx, z - cz), cx, cz };
}

/**
 * The free spot closest to (x, z) for a piece with this footprint: the spot itself when it is free, otherwise the
 * nearest one on a 25 cm grid, at most `maxR` away. null = the whole neighbourhood is full.
 */
export function freeSpot(x: number, z: number, fp: Fp, r: number, blocks: Rect[], half: number, maxR = 1.5, grid = 0.25): { x: number; z: number } | null {
  const { w, d } = rectOf(0, 0, fp, r);
  const lx = Math.max(0, half - w / 2), lz = Math.max(0, half - d / 2);
  const fits = (px: number, pz: number) => !blocks.some((b) => overlaps({ x: px, z: pz, w, d }, b));
  const x0 = clamp(x, -lx, lx), z0 = clamp(z, -lz, lz);
  if (fits(x0, z0)) return { x: r3(x0), z: r3(z0) };
  const n = Math.ceil(maxR / grid), cands: [number, number, number][] = [];
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    const px = clamp(x0 + i * grid, -lx, lx), pz = clamp(z0 + j * grid, -lz, lz), dd = Math.hypot(px - x0, pz - z0);
    if (dd > 0 && dd <= maxR + 1e-9) cands.push([dd, px, pz]);
  }
  cands.sort((a, b) => a[0] - b[0]);
  for (const [, px, pz] of cands) if (fits(px, pz)) return { x: r3(px), z: r3(pz) };
  return null;
}

/** a desk thing let go near a desk or table lands on it (a little in from the edge); null = no desk close by */
export function onSurface(x: number, z: number, tables: (Rect & { h: number })[], reach = 0.6): { x: number; z: number; h: number } | null {
  let best: { dist: number; t: Rect & { h: number } } | null = null;
  for (const t of tables) { const { dist } = toRect(x, z, t); if (dist <= reach && (!best || dist < best.dist)) best = { dist, t }; }
  if (!best) return null;
  const t = best.t, mx = Math.min(0.15, t.w / 2 - 0.01), mz = Math.min(0.15, t.d / 2 - 0.01);
  return { x: r3(clamp(x, t.x - t.w / 2 + mx, t.x + t.w / 2 - mx)), z: r3(clamp(z, t.z - t.d / 2 + mz, t.z + t.d / 2 - mz)), h: t.h };
}

/**
 * A big piece (shelf, sofa, bed…) brought near a wall turns its back to that wall and stands flush against it.
 * null = no wall within `reach`.
 */
export function againstWall(x: number, z: number, fp: Fp, half: number, reach = 0.6): { x: number; z: number; r: number } | null {
  const [fw, fd] = [fp[0], fp[1]], along = (v: number) => clamp(v, -(half - fw / 2), half - fw / 2), flush = half - fd / 2;
  const opts = [
    { gap: Math.abs(z + flush), x: along(x), z: -flush, r: 0 },
    { gap: Math.abs(x + flush), x: -flush, z: along(z), r: 1 },
    { gap: Math.abs(z - flush), x: along(x), z: flush, r: 2 },
    { gap: Math.abs(x - flush), x: flush, z: along(z), r: 3 },
  ].filter((o) => o.gap <= reach).sort((a, b) => a.gap - b.gap);
  const o = opts[0]; return o ? { x: r3(o.x), z: r3(o.z), r: o.r } : null;
}

/** a chair near a table turns to face it; null = no table close by */
export function faceTable(x: number, z: number, tables: Rect[], reach = 0.9): number | null {
  let best: { dist: number; cx: number; cz: number; t: Rect } | null = null;
  for (const t of tables) { const p = toRect(x, z, t); if (p.dist <= reach && (!best || p.dist < best.dist)) best = { ...p, t }; }
  if (!best) return null;
  let dx = best.cx - x, dz = best.cz - z;
  if (best.dist === 0) { dx = best.t.x - x; dz = best.t.z - z; }
  if (Math.abs(dz) >= Math.abs(dx)) return dz >= 0 ? 0 : 2;
  return dx >= 0 ? 1 : 3;
}

/**
 * Aiming a wall piece at the floor: the nearest shown wall and the spot along it (the engine's own wall
 * coordinate: w0 back -z, w1 left -x, w2 front +z, w3 right +x).
 */
export function wallFromFloor(x: number, z: number, half: number, shown: string[]): { w: string; u: number } | null {
  const all = [
    { w: 'w0', gap: z + half, u: x },
    { w: 'w1', gap: x + half, u: -z },
    { w: 'w2', gap: half - z, u: -x },
    { w: 'w3', gap: half - x, u: z },
  ].filter((o) => shown.includes(o.w)).sort((a, b) => a.gap - b.gap);
  const o = all[0]; return o ? { w: o.w, u: r3(o.u) } : null;
}
