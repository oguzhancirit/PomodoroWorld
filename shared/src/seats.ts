// Seat layout of the shared study room. Server and client read the same list,
// so "seat 5" is the same chair for everyone.

export interface Seat {
  /** chair position on the floor [x, y, z] */
  pos: [number, number, number];
  /** direction the sitter faces (radians, around Y) */
  rotY: number;
  /** desk centre for this seat */
  desk: [number, number, number];
}

/** distance from the sitter's root to the desk centre; matches the desk poses in tools/retarget.mjs */
export const SEAT_TO_DESK = 0.55;
export const DESK = { w: 1.1, d: 0.6, h: 0.76 };

// 3 rows x 4 desks, everyone faces the front wall (−Z) like a library
function grid(): Seat[] {
  const seats: Seat[] = [];
  const xs = [-4.5, -1.5, 1.5, 4.5];
  const zs = [-2.2, 0.8, 3.8];
  for (const z of zs) for (const x of xs) seats.push({ pos: [x, 0, z + SEAT_TO_DESK], rotY: Math.PI, desk: [x, 0, z] });
  return seats;
}

export const STUDY_ROOM = {
  seats: grid(),
  get maxClients() { return this.seats.length; },
  size: { w: 14, d: 11 },
};

export function isSeatFree(index: number, taken: readonly number[], count: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < count && !taken.includes(index);
}

export function firstFreeSeat(taken: readonly number[], count: number): number {
  for (let i = 0; i < count; i++) if (!taken.includes(i)) return i;
  return -1;
}
