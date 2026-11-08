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
    { id: 'd_books', x: 0, z: -1.9, r: 0 }, { id: 'd_books', x: 0, z: 1.7, r: 1 }, { id: 'd_hourglass', x: 0.45, z: 1.7, r: 0 }, { id: 'd_crystal', x: -0.5, z: -1.9, r: 0 },
    // walls of books (user 2026-11-04: every place its own atmosphere, full of things to look at)
    { id: 'f_shelf_tall', x: -3.2, z: -4.1, r: 0 }, { id: 'f_bookshelf', x: -1.6, z: -4.2, r: 0 }, { id: 'f_shelf_tall', x: 0, z: -4.1, r: 0 }, { id: 'f_bookshelf', x: 1.6, z: -4.2, r: 0 }, { id: 'f_shelf_tall', x: 3.2, z: -4.1, r: 0 },
    { id: 'f_bookshelf', x: -4.28, z: -1.5, r: 1 }, { id: 'f_bookshelf', x: -4.28, z: -0.2, r: 1 },
    { id: 'f_bookshelf', x: 4.28, z: -1.5, r: 3 }, { id: 'f_bookshelf', x: 4.28, z: -0.2, r: 3 }, { id: 'f_bookshelf', x: 4.28, z: 1.1, r: 3 },
    // a reading corner with the fireplace, and the old globe and telescope
    { id: 'f_fireplace', x: -4.22, z: 2.2, r: 1 }, { id: 'f_candles', x: -3.2, z: 3.5, r: 0 }, { id: 'f_lamp_floor', x: -3.9, z: 0.9, r: 0 },
    { id: 'f_globe', x: 3.0, z: 3.7, r: 0 }, { id: 'f_telescope', x: 3.8, z: 2.6, r: 3 }, { id: 'f_lamp_floor', x: 3.9, z: 3.9, r: 0 },
    { id: 'f_monstera', x: -3.9, z: -2.75, r: 0 }, { id: 'f_olive', x: 3.9, z: -2.75, r: 0 }, { id: 'f_bird_paradise', x: -3.9, z: 3.9, r: 0 }, { id: 'f_plane_model', x: 2.0, z: 3.9, r: 1 },
    { id: 'f_rug_kilim', x: 0, z: 0, r: 0 },
    { id: 'w_worldmap', w: 'w1', x: 3.5 }, { id: 'w_painting', w: 'w1', x: -2.2 }, { id: 'w_clock', w: 'w3', x: 3.0 }, { id: 'w_diploma', w: 'w2', x: 1.2 }, { id: 'w_frames', w: 'w2', x: -1.2 },
  );
  return {
    name: LIBRARY_NAME, desc: '10 kişilik sessiz çalışma salonu.', cat: 'Genel', open: true, token: '', ban: [],
    theme: 'th_library', view: 'v_city_night', size: 9, mood: 'candle', fx: 'stardust', items,
    // v1 "Gece Kütüphanesi" style (js/ui.js ROOM_STYLES)
    wall: '#2F4A3E', wallPat: 'wainscot', floorT: 'herring', floorC: '#6B4630', trim: '#C9A35A', curtain: '#22406E',
  };
}

/* ---------- "Pist 25" (user 2026-11-08): a study hall for people who love flying ----------
   A cockpit-like reading room: a wide windscreen onto runway 25 at dusk, rows of cockpit desks with pilot seats facing
   the runway, a turbofan engine on a stand, a departures board, flight instruments and shelves of books. The name: the
   runway you line up on, and the 25-minute pomodoro. */
export const PIST25_SEATS = 8;
export const PIST25_NAME = 'Pist 25';

export function pist25Room(): Room {
  const items: PlacedItem[] = [];
  // two rows of four cockpit desks; the pilot seat behind each one turns to the window (r: 2)
  for (const z of [-3.9, -1.5]) for (const x of [-3.0, -1.0, 1.0, 3.0]) {
    items.push({ id: 'f_desk_cockpit', x, z, r: 0 }, { id: 'f_chair_pilot', x, z: z + 0.74, r: 2 });
  }
  items.push(
    { id: 'd_headset', x: -3.3, z: -3.95, r: 1 }, { id: 'd_headset', x: 1.3, z: -1.55, r: 3 }, { id: 'd_logbook', x: 2.7, z: -3.95, r: 0 }, { id: 'd_logbook', x: -0.7, z: -1.55, r: 1 },
    // the hangar half: an engine on its stand on a rug, models and a globe around it
    { id: 'f_rug_rect', x: 0, z: 2.6, r: 0 }, { id: 'f_jet_engine', x: 0, z: 2.6, r: 0 },
    { id: 'f_plane_model', x: -1.9, z: 2.0, r: 1 }, { id: 'f_plane_model', x: 1.9, z: 3.3, r: 3 }, { id: 'f_globe', x: -3.4, z: 4.7, r: 0 },
    { id: 'f_telescope', x: -4.3, z: 3.6, r: 1 },
    // the library half: books along both side walls, warm floor lamps
    { id: 'f_shelf_tall', x: -5.28, z: -0.3, r: 1 }, { id: 'f_bookshelf', x: -5.28, z: 1.2, r: 1 }, { id: 'f_shelf_tall', x: -5.28, z: 2.7, r: 1 }, { id: 'f_bookshelf', x: -5.28, z: 4.1, r: 1 },
    // the right side stays low (that wall is cut away for the camera): a reading corner with a lamp and plants
    { id: 'f_lamp_floor', x: -4.7, z: 5.0, r: 0 }, { id: 'f_lamp_floor', x: 4.9, z: -0.4, r: 0 }, { id: 'f_bird_paradise', x: 4.9, z: 1.6, r: 0 }, { id: 'f_cactus', x: 4.9, z: 3.0, r: 0 },
    { id: 'f_monstera', x: -4.9, z: -4.9, r: 0 }, { id: 'f_olive', x: 4.9, z: -4.9, r: 0 },
    // walls: departures board and the six instruments on the left, propeller and approach chart by the windscreen
    { id: 'w_fids', w: 'w1', x: 3.0 }, { id: 'w_gauges', w: 'w1', x: -3.6 }, { id: 'w_worldmap', w: 'w2', x: -2.2 }, { id: 'w_poster_plane', w: 'w2', x: 1.6 },
    { id: 'w_propeller', w: 'w0', x: -4.35 }, { id: 'w_chart', w: 'w0', x: 4.35 }, { id: 'w_clock', w: 'w3', x: 3.6 },
  );
  return {
    name: PIST25_NAME, desc: 'Havacıların kokpit kütüphanesi: camdan pist, kalkış panosu, turbofan motor.', cat: 'Genel', open: true, token: '', ban: [],
    theme: 'th_cockpit', view: 'v_runway', size: 11, mood: 'golden', items,
    // the cockpit look spelled out (a room without its own colours would get the default cream walls)
    wall: '#4A525E', wallPat: 'cockpit', floorT: 'carpet', floorC: '#4A5463', trim: '#E8B04A', curtain: '#22406E',
  };
}

/** the public study halls a player can walk into from Dünya (everyone keeps their own timer) */
export interface Hall { id: string; name: string; seats: number; desc: string; to: string; at: string; room(): Room }
export const HALLS: Record<string, Hall> = {
  library: { id: 'library', name: LIBRARY_NAME, seats: LIBRARY_SEATS, desc: '10 kişilik sessiz çalışma salonu.', to: 'Kütüphaneye', at: 'Kütüphanede', room: libraryRoom },
  pist25: { id: 'pist25', name: PIST25_NAME, seats: PIST25_SEATS, desc: 'Havacıların kokpit kütüphanesi.', to: "Pist 25'e", at: "Pist 25'te", room: pist25Room },
};
export const isHallId = (v: unknown): v is string => typeof v === 'string' && Object.prototype.hasOwnProperty.call(HALLS, v);
export const hallOf = (v: unknown): Hall => HALLS[isHallId(v) ? v : 'library'];
