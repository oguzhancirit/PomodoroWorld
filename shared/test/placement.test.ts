import { describe, it, expect } from 'vitest';
import { rectOf, overlaps, freeSpot, onSurface, againstWall, faceTable, wallFromFloor } from '../src/placement';

describe('placement: footprints', () => {
  it('a quarter turn swaps width and depth', () => {
    expect(rectOf(1, 2, [1.4, 0.7], 0)).toEqual({ x: 1, z: 2, w: 1.4, d: 0.7 });
    expect(rectOf(1, 2, [1.4, 0.7], 1)).toEqual({ x: 1, z: 2, w: 0.7, d: 1.4 });
  });
  it('touching edges is fine, real overlap is not', () => {
    const a = rectOf(0, 0, [1, 1], 0);
    expect(overlaps(a, rectOf(1, 0, [1, 1], 0))).toBe(false);
    expect(overlaps(a, rectOf(0.8, 0, [1, 1], 0))).toBe(true);
  });
});

describe('placement: slide to the nearest free spot', () => {
  const half = 3.5;
  it('keeps the spot when it is free', () => {
    expect(freeSpot(1, 1, [0.5, 0.5], 0, [], half)).toEqual({ x: 1, z: 1 });
  });
  it('slides off a desk to the closest free square instead of saying no', () => {
    const desk = rectOf(0, 0, [1.4, 0.7], 0);
    const p = freeSpot(0, 0.1, [0.5, 0.5], 0, [desk], half)!;
    expect(p).not.toBeNull();
    expect(overlaps(rectOf(p.x, p.z, [0.5, 0.5], 0), desk)).toBe(false);
    // the nearest way out is in front (z), not round the long side
    expect(Math.abs(p.x)).toBeLessThan(0.3);
  });
  it('stays inside the room', () => {
    const p = freeSpot(3.4, -3.4, [1, 1], 0, [], half)!;
    expect(p.x).toBeLessThanOrEqual(3); expect(p.z).toBeGreaterThanOrEqual(-3);
  });
  it('gives up when the whole neighbourhood is full', () => {
    const wall = rectOf(0, 0, [7, 7], 0);
    expect(freeSpot(0, 0, [0.5, 0.5], 0, [wall], half)).toBeNull();
  });
});

describe('placement: things for the desk find the desk', () => {
  const desk = { ...rectOf(0, -1, [1.4, 0.7], 0), h: 0.76 };
  it('a lamp let go near a desk jumps onto it', () => {
    const s = onSurface(0.9, -0.5, [desk])!;
    expect(s.h).toBe(0.76);
    expect(Math.abs(s.x)).toBeLessThanOrEqual(0.7); expect(s.z).toBeGreaterThanOrEqual(-1.35); expect(s.z).toBeLessThanOrEqual(-0.65);
  });
  it('far from any desk it stays where it is (on the floor)', () => {
    expect(onSurface(3, 3, [desk])).toBeNull();
  });
});

describe('placement: big things back onto the wall', () => {
  const half = 3.5;
  it('a bookshelf near the back wall turns its back to it and stands flush', () => {
    expect(againstWall(1, -2.9, [1.1, 0.4], half)).toEqual({ x: 1, z: -3.3, r: 0 });
  });
  it('works on the side walls too (quarter turns)', () => {
    expect(againstWall(3.0, 0.5, [1.1, 0.4], half)).toEqual({ x: 3.3, z: 0.5, r: 3 });
    expect(againstWall(-3.0, 0.5, [1.1, 0.4], half)).toEqual({ x: -3.3, z: 0.5, r: 1 });
    expect(againstWall(0.5, 3.0, [1.1, 0.4], half)?.r).toBe(2);
  });
  it('in the middle of the room nothing changes', () => {
    expect(againstWall(0, 0, [1.1, 0.4], half)).toBeNull();
  });
});

describe('placement: chairs face the table', () => {
  const desk = rectOf(0, -1, [1.4, 0.7], 0);
  it('a chair behind the desk faces it', () => {
    expect(faceTable(0, -1.8, [desk])).toBe(0);   // desk is towards +z
    expect(faceTable(0, -0.2, [desk])).toBe(2);   // desk is towards -z
    expect(faceTable(1.2, -1, [desk])).toBe(3);   // desk is towards -x
  });
  it('a chair far from tables keeps its own way', () => {
    expect(faceTable(3, 3, [desk])).toBeNull();
  });
});

describe('placement: wall things can be aimed at the floor', () => {
  it('a floor point picks the nearest wall and the spot along it', () => {
    expect(wallFromFloor(0.6, -3.0, 3.5, ['w0', 'w1', 'w2', 'w3'])).toEqual({ w: 'w0', u: 0.6 });
    expect(wallFromFloor(-3.2, 1, 3.5, ['w0', 'w1', 'w2', 'w3'])).toEqual({ w: 'w1', u: -1 });
  });
  it('only walls that are shown can be picked', () => {
    expect(wallFromFloor(0.6, 3.0, 3.5, ['w0', 'w1'])).toEqual({ w: 'w1', u: -3 });
  });
});
