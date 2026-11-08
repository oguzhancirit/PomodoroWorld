import { describe, it, expect } from 'vitest';
import { HALLS, hallOf, isHallId, pist25Room, PIST25_SEATS } from '../src/library';
import { roomSeats, sanitizeRoom } from '../src/room';
import { itemById } from '../src/economy';

describe('public study halls (library + "Pist 25", user 2026-11-08)', () => {
  it('knows both halls; anything else falls back to the library', () => {
    expect(Object.keys(HALLS)).toEqual(['library', 'pist25']);
    expect(isHallId('pist25')).toBe(true);
    expect(isHallId('hangar')).toBe(false);
    expect(hallOf(undefined).id).toBe('library');
    expect(hallOf('nope').id).toBe('library');
    expect(hallOf('pist25').name).toBe('Pist 25');
  });
  it('every hall has as many chairs as people it takes', () => {
    for (const h of Object.values(HALLS)) expect(roomSeats(h.room()), h.id).toBe(h.seats);
    expect(PIST25_SEATS).toBe(8);
  });
  it('Pist 25 is a cockpit: cockpit theme, runway view, cockpit desks with pilot seats', () => {
    const r = pist25Room();
    expect(r.theme).toBe('th_cockpit');
    expect(r.view).toBe('v_runway');
    expect(r.items.filter((i) => i.id === 'f_desk_cockpit')).toHaveLength(8);
    expect(r.items.filter((i) => i.id === 'f_chair_pilot')).toHaveLength(8);
    expect(r.items.some((i) => i.id === 'f_jet_engine')).toBe(true);
    expect(r.items.some((i) => i.id === 'w_fids')).toBe(true);
  });
  it('is a valid room: the room rules drop nothing, every item is sold in the shop, all inside the walls', () => {
    const r = pist25Room(), clean = sanitizeRoom(r), h = r.size / 2;
    expect(clean.items).toHaveLength(r.items.length);
    expect([clean.theme, clean.view, clean.size, clean.wallPat]).toEqual([r.theme, r.view, r.size, r.wallPat]);
    for (const it of r.items) {
      expect(itemById(it.id), it.id).toBeTruthy();
      if ('z' in it) { expect(Math.abs(it.x)).toBeLessThan(h); expect(Math.abs(it.z)).toBeLessThan(h); }
    }
    for (const id of ['th_cockpit', 'v_runway']) expect(itemById(id), id).toBeTruthy();
  });
  it('every seat faces the window (pilots look down the runway)', () => {
    for (const c of pist25Room().items) if (c.id === 'f_chair_pilot' && 'r' in c) expect(c.r).toBe(2);
  });
});
