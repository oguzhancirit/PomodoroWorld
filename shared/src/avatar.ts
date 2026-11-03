// Avatar = which modular pieces (Quaternius Ultimate Modular Men/Women, CC0) + colour choices.
// Stored in the room state as a short code string so state updates stay tiny.
import { z } from 'zod';

export type Gender = 'f' | 'm';
export type Slot = 'head' | 'body' | 'legs' | 'feet';

const set = (names: string[], slot: string) => names.map((n) => `${n}_${slot}`);

// Helmets that hide the face (Swat, Spacesuit) are left out on purpose.
export const PARTS: Record<Gender, Record<Slot, string[]>> = {
  f: {
    head: set(['Casual', 'Formal', 'Suit', 'Punk', 'SciFi', 'Adventurer', 'Soldier', 'Medieval', 'Witch', 'Worker'], 'Head'),
    body: set(['Casual', 'Formal', 'Suit', 'Punk', 'Worker'], 'Body'),
    legs: set(['Casual', 'Formal', 'Suit', 'Punk', 'Worker'], 'Legs'),
    feet: set(['Casual', 'Formal', 'Suit', 'Punk', 'Worker'], 'Feet'),
  },
  m: {
    head: set(['Casual_Hoodie', 'Casual_2', 'Suit', 'Beach', 'Punk', 'Adventurer', 'Farmer', 'Worker', 'King'], 'Head'),
    body: set(['Casual_Hoodie', 'Casual_2', 'Suit', 'Beach', 'Punk', 'Farmer', 'Worker'], 'Body'),
    legs: set(['Casual_Hoodie', 'Casual_2', 'Suit', 'Beach', 'Punk', 'Farmer', 'Worker'], 'Legs'),
    feet: set(['Casual_Hoodie', 'Casual_2', 'Suit', 'Beach', 'Punk', 'Farmer', 'Worker'], 'Feet'),
  },
};

// index 0 of every palette = "keep the model's own colour"
export const SKIN_TONES = ['#f2c9a8', '#f6d7c3', '#e8b48f', '#c68c63', '#a0663f', '#7a4a2c', '#4f3020'];
export const HAIR_COLORS = ['#5a3a22', '#1f1a17', '#3b2a20', '#8a5a33', '#c9a15a', '#e7d3a8', '#b5462f', '#8f8f99', '#6d4cc2', '#d06aa0'];
export const CLOTH_COLORS = ['#ffffff', '#2f3542', '#e8553d', '#3e7cb1', '#2f9a6b', '#f2c14e', '#8e6cc1', '#e58bb0', '#c9c2b4', '#1f8a8a', '#7a4a2c'];

/** accessories drawn on top of the head (user 2026-11-03); index 0 = none. Order is part of the saved code: only add at the end. */
export const ACCESSORIES = ['none', 'glasses', 'sunglasses', 'catears', 'headphones', 'beanie', 'cap', 'flowers', 'crown'] as const;
export const ACC_NAMES: Record<string, string> = { glasses: 'Yuvarlak Gözlük', sunglasses: 'Güneş Gözlüğü', catears: 'Kedi Kulakları', headphones: 'Kulaklık', beanie: 'Bere', cap: 'Kep', flowers: 'Çiçek Tacı', crown: 'Taç' };

export interface Avatar {
  g: Gender;
  head: string; body: string; legs: string; feet: string;
  skin: number; hair: number; top: number; bottom: number;
  /** accessory index (1..), left out when none */
  acc?: number;
}

export function defaultAvatar(g: Gender): Avatar {
  return g === 'm'
    ? { g, head: 'Casual_Hoodie_Head', body: 'Casual_Hoodie_Body', legs: 'Casual_Hoodie_Legs', feet: 'Casual_Hoodie_Feet', skin: 0, hair: 0, top: 0, bottom: 0 }
    : { g, head: 'Casual_Head', body: 'Casual_Body', legs: 'Casual_Legs', feet: 'Casual_Feet', skin: 0, hair: 0, top: 0, bottom: 0 };
}

const index = (len: number) => z.number().int().min(0).max(len - 1);
const loose = z.object({ g: z.enum(['f', 'm']).catch('f') }).passthrough();

/** Never throws: every invalid field falls back to the default for that gender. */
export function parseAvatar(input: unknown): Avatar {
  const base = loose.safeParse(input);
  const g: Gender = base.success ? base.data.g : 'f';
  const d = defaultAvatar(g);
  const o = (base.success ? base.data : {}) as Record<string, unknown>;
  const part = (slot: Slot) => (typeof o[slot] === 'string' && PARTS[g][slot].includes(o[slot] as string) ? (o[slot] as string) : d[slot]);
  const pick = (k: 'skin' | 'hair' | 'top' | 'bottom', len: number) => (index(len).safeParse(o[k]).success ? (o[k] as number) : d[k]);
  const out: Avatar = {
    g, head: part('head'), body: part('body'), legs: part('legs'), feet: part('feet'),
    skin: pick('skin', SKIN_TONES.length), hair: pick('hair', HAIR_COLORS.length), top: pick('top', CLOTH_COLORS.length), bottom: pick('bottom', CLOTH_COLORS.length),
  };
  if (typeof o.acc === 'number' && Number.isInteger(o.acc) && o.acc > 0 && o.acc < ACCESSORIES.length) out.acc = o.acc;
  return out;
}

const SLOTS: Slot[] = ['head', 'body', 'legs', 'feet'];

/** e.g. "m.0.0.0.0.3.2.5.1" */
export function encodeAvatar(a: Avatar): string {
  const v = parseAvatar(a);
  return [v.g, ...SLOTS.map((s) => PARTS[v.g][s].indexOf(v[s])), v.skin, v.hair, v.top, v.bottom, ...(v.acc ? [v.acc] : [])].join('.');
}

export function decodeAvatar(code: unknown): Avatar {
  if (typeof code !== 'string' || code.length > 60) return defaultAvatar('f');
  const [g, ...rest] = code.split('.');
  const n = rest.map((x) => Number.parseInt(x, 10));
  const gg: Gender = g === 'm' ? 'm' : 'f';
  const obj: Record<string, unknown> = { g: gg };
  SLOTS.forEach((s, i) => { obj[s] = PARTS[gg][s][n[i] ?? -1]; });
  (['skin', 'hair', 'top', 'bottom'] as const).forEach((k, i) => { obj[k] = n[4 + i]; });
  if (Number.isFinite(n[8])) obj.acc = n[8];
  return parseAvatar(obj);
}
