// Glue between React and the original room engine (PW.World from js/world.js).
import { ROOM_KEYS, type Room } from '@pw/shared';
import { PW } from '../legacy';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type World = any;
/** film: the intro film is driving the engine right now (checked synchronously, before React re-renders) */
export const engine: { world: World | null; film: boolean } = { world: null, film: false };
export { PW };

/** What the engine draws (the old App.homeDef): the look keys plus the items. A fresh copy, the engine may tag items. */
export function defOf(room: Room) {
  const d: Record<string, unknown> = {};
  for (const k of ROOM_KEYS) d[k] = (room as unknown as Record<string, unknown>)[k];
  return JSON.parse(JSON.stringify(d));
}
export const lookOf = (room: Room) => JSON.stringify(defOf(room));

// The old game's one-click styled rooms ("Stiller"), same list as js/ui.js.
export const ROOM_STYLES = [
  { id: 'warm', n: 'Sıcak Ahşap', wall: '#E9DCC8', wallPat: 'plain', floorT: 'plank', floorC: '#B07D52', trim: '#7A5233', curtain: '#C98FA6', mood: 'golden' },
  { id: 'scandi', n: 'İskandinav', wall: '#F2EFEA', wallPat: 'plain', floorT: 'plank', floorC: '#D9C2A0', trim: '#F6F4EF', curtain: '#E9DCC8', mood: 'day' },
  { id: 'pastel', n: 'Pastel Rüya', wall: '#F3D6E0', wallPat: 'dots', floorT: 'carpet', floorC: '#D9CFF0', trim: '#F6F4EF', curtain: '#8E6CC1', mood: 'day' },
  { id: 'garden', n: 'Bahar Bahçesi', wall: '#DDE8D2', wallPat: 'floral', floorT: 'herring', floorC: '#C49A6C', trim: '#F6F4EF', curtain: '#2F7D5B', mood: 'day' },
  { id: 'turk', n: 'Çini Köşe', wall: '#F1EADB', wallPat: 'cini', floorT: 'tile', floorC: '#C77B54', trim: '#1F5FA8', curtain: '#C7432F', mood: 'golden' },
  { id: 'loft', n: 'Loft', wall: '#B5634B', wallPat: 'brick', floorT: 'concrete', floorC: '#8C8C8C', trim: '#2A2B33', curtain: '#5B6270', mood: 'golden' },
  { id: 'library', n: 'Gece Kütüphanesi', wall: '#2F4A3E', wallPat: 'wainscot', floorT: 'herring', floorC: '#6B4630', trim: '#C9A35A', curtain: '#22406E', mood: 'night' },
  { id: 'japan', n: 'Japon Sadeliği', wall: '#EFE6D2', wallPat: 'shoji', floorT: 'tatami', floorC: '#CDBB8A', trim: '#5B4636', curtain: '#E9DCC8', mood: 'candle' },
  { id: 'gamer', n: 'Neon Oyuncu', wall: '#2A2B3D', wallPat: 'stripe', floorT: 'concrete', floorC: '#3B3D4F', trim: '#2A2B33', curtain: '#22406E', mood: 'neon' },
  // new looks with the new surfaces and floating effects (user 2026-11-03)
  { id: 'cosmic', n: 'Kozmik Gece', wall: '#1E2240', wallPat: 'stars', floorT: 'carpet', floorC: '#2A2B4A', trim: '#C9A35A', curtain: '#22406E', mood: 'night', fx: 'stardust' },
  { id: 'sakura', n: 'Sakura Bahçesi', wall: '#F6E7EC', wallPat: 'shoji', floorT: 'tatami', floorC: '#D8C79A', trim: '#5B4636', curtain: '#E58BB0', mood: 'day', fx: 'sakura' },
  { id: 'cabin', n: 'Kış Kulübesi', wall: '#8A5A3B', wallPat: 'logs', floorT: 'plank', floorC: '#7A5233', trim: '#4A2E1E', curtain: '#C7432F', mood: 'candle', fx: 'snow' },
  { id: 'cloud', n: 'Pastel Bulut', wall: '#DCEBFA', wallPat: 'clouds', floorT: 'hex', floorC: '#F3E6EE', trim: '#F6F4EF', curtain: '#A3C4D9', mood: 'day', fx: 'bubbles' },
  { id: 'autumn', n: 'Sonbahar Kafe', wall: '#E9D6BE', wallPat: 'plaid', floorT: 'herring', floorC: '#9A6A44', trim: '#7A3B22', curtain: '#E8803A', mood: 'golden', fx: 'leaves' },
  { id: 'marble', n: 'Modern Mermer', wall: '#EDEBE7', wallPat: 'geo', floorT: 'marble', floorC: '#E4E1DC', trim: '#2A2B33', curtain: '#5B6270', mood: 'day' },
  { id: 'firefly', n: 'Ateş Böceği Ormanı', wall: '#2F4A3E', wallPat: 'floral', floorT: 'terrazzo', floorC: '#5E6B57', trim: '#C9A35A', curtain: '#2F7D5B', mood: 'night', fx: 'fireflies' },
] as { id: string; n: string; wall: string; wallPat: string; floorT: string; floorC: string; trim: string; curtain: string; mood: string; fx?: string }[];
export const TRIM_COLORS = ['#7A5233', '#F6F4EF', '#2A2B33', '#C9A35A', '#1F5FA8', '#2F7D5B'];
export const CURTAIN_COLORS = ['#C98FA6', '#2F7D5B', '#22406E', '#E9DCC8', '#C7432F', '#F2C14E', '#5B6270', '#8E6CC1'];
export const MOOD_INFO: Record<string, { grad: string; desc: string }> = {
  day: { grad: 'linear-gradient(90deg,#FFE9CF,#9FD0FF)', desc: 'Aydınlık ve ferah' },
  golden: { grad: 'linear-gradient(90deg,#FFAE68,#F27A5A)', desc: 'Sıcak, turuncu ışık' },
  night: { grad: 'linear-gradient(90deg,#2D3E63,#6F7BD9)', desc: 'Lambalar ve yıldızlar' },
  neon: { grad: 'linear-gradient(90deg,#FF3FA4,#26D8FF)', desc: 'Pembe-mavi parıltı' },
  candle: { grad: 'linear-gradient(90deg,#3A2010,#FF8A3A)', desc: 'Loş, titreşen sıcaklık' },
};

/** Thumbnails come from the engine's own renderer (procedural models), cached by the engine. */
export const thumb = (id: string): string => { try { return PW.thumb(id); } catch { return ''; } };
export const swatch = (kind: 'wallPat' | 'floorT', val: string, def: unknown): string => { try { return PW.surfaceSwatch(kind, val, def); } catch { return ''; } };

/** Undo / redo of the room look ("it should be fun to make mistakes"). */
export const hist = { u: [] as string[], r: [] as string[] };

// dev server only: browser checks can move the camera
if (import.meta.env.DEV) (window as unknown as { __engine: unknown }).__engine = engine;
