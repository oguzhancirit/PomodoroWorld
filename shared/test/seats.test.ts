import { describe, it, expect } from 'vitest';
import { firstFreeSeat, isSeatFree, STUDY_ROOM } from '../src/seats';

describe('seats', () => {
  it('study room capacity matches its seat count', () => {
    expect(STUDY_ROOM.maxClients).toBe(STUDY_ROOM.seats.length);
    expect(STUDY_ROOM.maxClients).toBe(12);
  });
  it('first free seat is the lowest index not taken', () => {
    expect(firstFreeSeat([], 4)).toBe(0);
    expect(firstFreeSeat([0, 1, 3], 4)).toBe(2);
    expect(firstFreeSeat([0, 1, 2, 3], 4)).toBe(-1);
  });
  it('isSeatFree checks range and occupancy', () => {
    expect(isSeatFree(2, [0, 1], 4)).toBe(true);
    expect(isSeatFree(1, [0, 1], 4)).toBe(false);
    expect(isSeatFree(4, [], 4)).toBe(false);
    expect(isSeatFree(-1, [], 4)).toBe(false);
  });
  it('every seat has a position and a facing angle', () => {
    for (const s of STUDY_ROOM.seats) { expect(s.pos).toHaveLength(3); expect(typeof s.rotY).toBe('number'); }
  });
});
