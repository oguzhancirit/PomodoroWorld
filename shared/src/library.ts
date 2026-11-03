// Step 4f: the library, a public study room for 10 (the plan: your room 2..5, library 10, then social spaces).
// Drawn by the old engine like any room: the v1 "Eski Kütüphane" theme with the v1 long-table layout (chairs ±0.95).
import type { Room, PlacedItem } from './room';

export const LIBRARY_SEATS = 10;
export const LIBRARY_NAME = 'Kütüphane';

export function libraryRoom(): Room {
  const items: PlacedItem[] = [];
  // a long table for 6 at the back, one for 4 at the front
  const table = (z: number, xs: number[]) => {
    items.push({ id: 'f_table_long', x: 0, z, r: 0 });
    for (const x of xs) { items.push({ id: 'f_chair_wood', x, z: z - 0.95, r: 0 }); items.push({ id: 'f_chair_wood', x, z: z + 0.95, r: 2 }); }
    for (const x of [xs[0], xs[xs.length - 1]]) items.push({ id: 'd_lamp', x, z, r: 0 });
  };
  table(-1.9, [-1.1, 0, 1.1]);
  table(1.7, [-0.6, 0.6]);
  items.push(
    { id: 'd_books', x: 0, z: -1.9, r: 0 }, { id: 'd_books', x: 0, z: 1.7, r: 1 },
    { id: 'f_shelf_tall', x: -3.2, z: -4.1, r: 0 }, { id: 'f_bookshelf', x: -1.6, z: -4.2, r: 0 }, { id: 'f_bookshelf', x: 1.6, z: -4.2, r: 0 }, { id: 'f_shelf_tall', x: 3.2, z: -4.1, r: 0 },
    { id: 'f_bookshelf', x: -4.2, z: 0, r: 1 }, { id: 'f_bookshelf', x: 4.2, z: 0, r: 3 },
    { id: 'f_globe', x: -3.6, z: 3.6, r: 0 }, { id: 'f_lamp_floor', x: 3.8, z: 3.8, r: 0 }, { id: 'f_monstera', x: -3.9, z: -2.6, r: 0 }, { id: 'f_olive', x: 3.9, z: -2.6, r: 0 },
    { id: 'f_rug_kilim', x: 0, z: 0, r: 0 },
    { id: 'w_clock', w: 'w0', x: 0 }, { id: 'w_worldmap', w: 'w1', x: 0 },
  );
  return {
    name: LIBRARY_NAME, desc: '10 kişilik sessiz çalışma salonu.', cat: 'Genel', open: true, token: '', ban: [],
    theme: 'th_library', view: 'v_city_night', size: 9, mood: 'night', items,
    // v1 "Gece Kütüphanesi" style (js/ui.js ROOM_STYLES)
    wall: '#2F4A3E', wallPat: 'wainscot', floorT: 'herring', floorC: '#6B4630', trim: '#C9A35A', curtain: '#22406E',
  };
}
