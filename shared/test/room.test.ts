import { describe, it, expect } from 'vitest';
import { defaultRoom, sanitizeRoom, placedCount, available, roomAllowedFor, ROOM_KEYS, ROOM_FX, roomSeats, homeCapacity, HOME_MAX, homeEntry, inviteCode, parseInvite } from '../src/room';
import { newWallet, buy, itemById, CATALOG, sanitizeWallet, owns, xpStep, STARTER } from '../src/economy';
import { ROOM_FURN, ROOM_THEMES, ROOM_VIEWS } from '../src/roomCatalog';

const xpForLevel = (L: number) => { let x = 0; for (let i = 1; i < L; i++) x += xpStep(i); return x; };

describe('room catalog = the original catalog', () => {
  it('sells every old room item with the old price and level', () => {
    for (const f of ROOM_FURN) { const i = itemById(f.id)!; expect(i, f.id).toBeTruthy(); expect(i.cat).toBe('furn'); expect(i.price).toBe(f.price); expect(i.lvl).toBe(f.lvl); }
    expect(ROOM_FURN.length).toBeGreaterThanOrEqual(60);
    for (const t of [...ROOM_THEMES, ...ROOM_VIEWS]) expect(itemById(t.id)).toBeTruthy();
    expect(itemById('sz_l')!.cat).toBe('size');
  });
  it('a new player starts like before: desk, chair, wood theme, city view, small room', () => {
    const w = newWallet();
    for (const id of ['f_desk_wood', 'f_chair_wood', 'th_wood', 'v_city_day', 'sz_s']) expect(owns(w, id), id).toBe(true);
    expect(owns(w, 'f_sofa')).toBe(false);
  });
  it('themes, views and sizes are bought once; furniture many times', () => {
    let w = { ...newWallet(), coins: 5000, xp: xpForLevel(10) };
    const a = buy(w, 'th_white'); expect(a.ok).toBe(true); if (a.ok) w = a.wallet;
    expect(buy(w, 'th_white')).toEqual({ ok: false, reason: 'owned' });
    const b = buy(w, 'f_cactus'); expect(b.ok).toBe(true); if (b.ok) w = b.wallet;
    const c = buy(w, 'f_cactus'); expect(c.ok).toBe(true); if (c.ok) expect(c.wallet.owned.f_cactus).toBe(2);
  });
  it('free furniture (laptop, desk lamp) costs nothing but is still counted', () => {
    const r = buy(newWallet(), 'd_laptop'); expect(r.ok).toBe(true); if (r.ok) { expect(r.wallet.coins).toBe(newWallet().coins); expect(r.wallet.owned.d_laptop).toBe(1); }
  });
  it('furniture bought in the first v2 shop is refunded, not lost', () => {
    const w = sanitizeWallet({ coins: 10, owned: { 'furn.lamp_table': 2, 'furn.couch_pillows': 1 } });
    expect(w.coins).toBe(10 + 2 * 40 + 320);
    expect(Object.keys(w.owned).some((k) => k.startsWith('furn.'))).toBe(false);
    expect(CATALOG.some((i) => i.id.startsWith('furn.'))).toBe(false);
  });
});

describe('room design', () => {
  it('the default room is the old default (a desk and its chair) plus a chair for a friend', () => {
    const r = defaultRoom();
    expect(r.items.map((i) => i.id)).toEqual(['f_desk_wood', 'f_chair_wood', 'f_chair_wood']);
    expect(r.theme).toBe('th_wood'); expect(r.size).toBe(7); expect(r.mood).toBe('golden');
    expect(r.token).toMatch(/^[a-z0-9]{3,10}$/);
    expect(ROOM_KEYS).toContain('wallPat');
  });
  it('repairs broken input like the old save loader', () => {
    const r = sanitizeRoom({
      name: 'x'.repeat(80), open: 0, size: 8, mood: 'disco', wall: 'red', floorC: '#123456', wallPat: 'brick', floorT: 'lava',
      items: [
        { id: 'f_sofa', x: 99, z: -99, r: 7, c: 'blue', wd: 'walnut' },
        { id: 'w_clock', w: 'w2', x: 1.2 },
        { id: 'w_clock', x: 1, z: 1 }, // wall item on the floor
        { id: 'f_sofa', w: 'w1' }, // floor item on a wall
        { id: 'nope', x: 0, z: 0 },
        { id: 'h_long', x: 0, z: 0 }, // avatar item is not furniture
        'junk',
      ],
    });
    expect(r.name.length).toBeLessThanOrEqual(32); expect(r.open).toBe(false); expect(r.size).toBe(7);
    expect(r.mood).toBeUndefined(); expect(r.wall).toBeUndefined(); expect(r.floorC).toBe('#123456');
    expect(r.wallPat).toBe('brick'); expect(r.floorT).toBeUndefined();
    expect(r.items).toEqual([{ id: 'f_sofa', x: 6, z: -6, r: 3, wd: 'walnut' }, { id: 'w_clock', w: 'w2', x: 1.2 }]);
  });
  it('never trusts a huge list', () => {
    const r = sanitizeRoom({ items: Array.from({ length: 1000 }, () => ({ id: 'f_cactus', x: 0, z: 0 })) });
    expect(r.items.length).toBeLessThanOrEqual(400);
  });
});

describe('room vs wallet (what the server allows)', () => {
  it('counts placed and free copies', () => {
    const w = { ...newWallet(), owned: { ...newWallet().owned, f_cactus: 2 } };
    const r = { ...defaultRoom(), items: [{ id: 'f_cactus', x: 0, z: 0, r: 0 }] };
    expect(placedCount(r, 'f_cactus')).toBe(1); expect(available(w, r, 'f_cactus')).toBe(1);
    expect(available(w, r, 'f_sofa')).toBe(0);
  });
  it('drops items you do not own and surfaces above your level', () => {
    const w = newWallet(); // level 1, owns a desk and a chair
    const r = roomAllowedFor(w, {
      ...defaultRoom(), theme: 'th_space', view: 'v_aurora', size: 11, wallPat: 'panel', floorT: 'herring', mood: 'neon',
      items: [{ id: 'f_desk_wood', x: 0, z: 0, r: 0 }, { id: 'f_desk_wood', x: 1, z: 0, r: 0 }, { id: 'f_sofa', x: 0, z: 1, r: 0 }],
    });
    expect(r.items.map((i) => i.id)).toEqual(['f_desk_wood']);
    expect(r.theme).toBe('th_wood'); expect(r.view).toBe('v_city_day'); expect(r.size).toBe(7);
    expect(r.wallPat).toBeUndefined(); expect(r.floorT).toBeUndefined(); expect(r.mood).toBeUndefined();
  });
  it('keeps everything a high level owner really has', () => {
    let w = { ...newWallet(), coins: 99999, xp: xpForLevel(16) };
    for (const id of ['th_space', 'v_aurora', 'sz_l', 'f_sofa']) { const b = buy(w, id); expect(b.ok, id).toBe(true); if (b.ok) w = b.wallet; }
    const want = { ...defaultRoom(), theme: 'th_space', view: 'v_aurora', size: 11, wallPat: 'panel', floorT: 'herring', mood: 'neon', items: [{ id: 'f_sofa', x: 0, z: 1, r: 2 }] };
    const r = roomAllowedFor(w, want);
    expect(r.theme).toBe('th_space'); expect(r.size).toBe(11); expect(r.mood).toBe('neon'); expect(r.wallPat).toBe('panel'); expect(r.items).toHaveLength(1);
  });
});

describe('step 4: study with friends in your own room', () => {
  it('the starter room has a desk and two chairs facing each other (you + one friend)', () => {
    const r = defaultRoom();
    expect(r.items.filter((i) => i.id === 'f_chair_wood')).toHaveLength(2);
    expect(STARTER.f_chair_wood).toBe(2);
    expect(roomAllowedFor(newWallet(), r).items).toHaveLength(3);
  });
  it('an old wallet with one chair is topped up to the starter chairs', () => {
    expect(sanitizeWallet({ owned: { f_chair_wood: 1 } }).owned.f_chair_wood).toBe(2);
    expect(sanitizeWallet({ owned: { f_chair_wood: 4 } }).owned.f_chair_wood).toBe(4);
  });
  it('counts seats: sofas hold two, wall and desk items none', () => {
    expect(roomSeats({ items: [{ id: 'f_sofa', x: 0, z: 0, r: 0 }, { id: 'f_chair_wood', x: 1, z: 0, r: 0 }, { id: 'f_desk_wood', x: 0, z: 1, r: 0 }, { id: 'w_clock', w: 'w0', x: 0 }] })).toBe(3);
  });
  it('everyone needs a seat, you too: people = seats, at most you + 3 (user, 2026-11-04)', () => {
    const chairs = (n: number) => ({ items: Array.from({ length: n }, (_, i) => ({ id: 'f_chair_wood', x: i, z: 0, r: 0 })) });
    expect(homeCapacity(chairs(0))).toBe(1); // you can always be in your own room
    expect(homeCapacity(chairs(1))).toBe(1);
    expect(homeCapacity(chairs(2))).toBe(2);
    expect(homeCapacity(chairs(4))).toBe(4); // 4 chairs: you + 3 friends, shown as 1 / 4
    expect(homeCapacity(chairs(9))).toBe(4);
    expect(HOME_MAX).toBe(4);
  });
});

describe('step 4: who may enter someone else\'s room', () => {
  const room = (o: Partial<ReturnType<typeof defaultRoom>> = {}) => ({ ...defaultRoom(), token: 'abc123', ...o });
  it('the owner always gets in', () => {
    expect(homeEntry(room({ open: false, ban: ['own000000001'] }), { pid: 'own000000001', owner: 'own000000001', count: 9 })).toBe('ok');
  });
  it('an open room lets friends in until the seats are full', () => {
    // the starter room has two chairs: you + one friend
    expect(homeEntry(room(), { pid: 'gst000000001', owner: 'own000000001', count: 1 })).toBe('ok');
    expect(homeEntry(room(), { pid: 'gst000000001', owner: 'own000000001', count: 2 })).toBe('full');
  });
  it('a closed room needs the invite token', () => {
    const r = room({ open: false });
    expect(homeEntry(r, { pid: 'gst000000001', owner: 'own000000001', count: 1 })).toBe('closed');
    expect(homeEntry(r, { pid: 'gst000000001', owner: 'own000000001', count: 1, token: 'zzz999' })).toBe('closed');
    expect(homeEntry(r, { pid: 'gst000000001', owner: 'own000000001', count: 1, token: 'abc123' })).toBe('ok');
  });
  it('a banned player never gets in, even with the token', () => {
    expect(homeEntry(room({ ban: ['gst000000001'] }), { pid: 'gst000000001', owner: 'own000000001', count: 0, token: 'abc123' })).toBe('banned');
  });
  it('invite codes: owner id + token, also read from a pasted link', () => {
    expect(inviteCode('own000000001', 'abc123')).toBe('own000000001-abc123');
    expect(parseInvite('own000000001-abc123')).toEqual({ owner: 'own000000001', token: 'abc123' });
    expect(parseInvite('https://pw.example/?x=1#oda-own000000001-abc123')).toEqual({ owner: 'own000000001', token: 'abc123' });
    expect(parseInvite(' own000000001 ')).toEqual({ owner: 'own000000001', token: '' });
    expect(parseInvite('<script>')).toBeNull();
    expect(parseInvite('')).toBeNull();
  });
});

describe('personal touches on items (user 2026-11-03: everyone shows their own style)', () => {
  const room = (items: unknown[]) => sanitizeRoom({ ...defaultRoom(), items });
  it('keeps a short own text, a design number and a colour on floor and wall items', () => {
    const r = room([{ id: 'w_neon_text', w: 'w0', x: 0, t: 'Odaklan Ozi!', c: '#FF4FA0' }, { id: 'w_poster_art', w: 'w1', x: 1, v: 3 }, { id: 'f_beanbag', x: 1, z: 1, r: 0, c: '#3E7CB1', v: 2 }]);
    expect(r.items[0]).toEqual({ id: 'w_neon_text', w: 'w0', x: 0, t: 'Odaklan Ozi!', c: '#FF4FA0' });
    expect(r.items[1]).toEqual({ id: 'w_poster_art', w: 'w1', x: 1, v: 3 });
    expect(r.items[2]).toMatchObject({ c: '#3E7CB1', v: 2 });
  });
  it('cleans the text: short, no tags or control characters, rude words hidden, empty dropped', () => {
    const [a, b, c] = room([
      { id: 'w_neon_text', w: 'w0', x: 0, t: '<b>çok uzun bir yazı buraya sığmaz</b>\n' },
      { id: 'w_neon_text', w: 'w0', x: 1, t: '   ' },
      { id: 'w_neon_text', w: 'w0', x: 2, t: 'siktir' },
    ]).items as { t?: string }[];
    expect(a.t!.length).toBeLessThanOrEqual(18); expect(a.t).not.toMatch(/[<>\n]/);
    expect(b.t).toBeUndefined();
    expect(c.t).not.toBe('siktir');
  });
  it('ignores a bad design number or colour', () => {
    const [a] = room([{ id: 'w_poster_art', w: 'w1', x: 1, v: 99, c: 'red' }]).items as { v?: number; c?: string }[];
    expect(a.v).toBeUndefined(); expect(a.c).toBeUndefined();
  });
});

describe('room effects (floating snow, petals, fireflies… user 2026-11-03)', () => {
  it('keeps a known effect and drops an unknown one', () => {
    expect(sanitizeRoom({ ...defaultRoom(), fx: 'snow' }).fx).toBe('snow');
    expect(sanitizeRoom({ ...defaultRoom(), fx: 'lava-rain' }).fx).toBeUndefined();
    expect(ROOM_KEYS).toContain('fx');
  });
  it('opens with levels like the other surfaces', () => {
    const w = newWallet();
    const high = ROOM_FX.reduce((a, f) => (f.lvl > a.lvl ? f : a));
    expect(roomAllowedFor(w, { ...defaultRoom(), fx: high.id }).fx).toBeUndefined();
    const low = ROOM_FX.find((f) => f.lvl === 1)!;
    expect(roomAllowedFor(w, { ...defaultRoom(), fx: low.id }).fx).toBe(low.id);
  });
});
