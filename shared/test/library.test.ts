import { describe, it, expect } from 'vitest';
import { libraryRoom, LIBRARY_SEATS, LIBRARY_NAME } from '../src/library';
import { roomSeats, sanitizeRoom } from '../src/room';

describe('library (step 4f: public 10-seat study room, v1 "Eski Kütüphane" look)', () => {
  it('has exactly 10 seats', () => {
    expect(LIBRARY_SEATS).toBe(10);
    expect(roomSeats(libraryRoom())).toBe(10);
  });
  it('uses the old library theme and is a valid room (nothing is dropped by the room rules)', () => {
    const r = libraryRoom();
    expect(r.theme).toBe('th_library');
    expect(r.name).toBe(LIBRARY_NAME);
    const clean = sanitizeRoom(r);
    expect(clean.items).toHaveLength(r.items.length);
    expect(clean.theme).toBe('th_library');
    expect(clean.size).toBe(r.size);
    expect(clean.mood).toBe(r.mood);
    expect(clean.view).toBe(r.view);
  });
  it('every item stays inside the room', () => {
    const r = libraryRoom(), h = r.size / 2;
    for (const it of r.items) if ('z' in it) { expect(Math.abs(it.x)).toBeLessThan(h); expect(Math.abs(it.z)).toBeLessThan(h); }
  });
});
