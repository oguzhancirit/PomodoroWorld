import { describe, it, expect } from 'vitest';
import { PARTS, defaultAvatar, parseAvatar, encodeAvatar, decodeAvatar, SKIN_TONES, HAIR_COLORS, CLOTH_COLORS } from '../src/avatar';

describe('avatar parts catalog', () => {
  it('has heads, bodies, legs and feet for both genders', () => {
    for (const g of ['f', 'm'] as const) for (const slot of ['head', 'body', 'legs', 'feet'] as const) expect(PARTS[g][slot].length).toBeGreaterThan(2);
  });
});

describe('parseAvatar', () => {
  it('accepts a valid avatar unchanged', () => {
    const a = defaultAvatar('f'); expect(parseAvatar(a)).toEqual(a);
  });
  it('replaces unknown parts and out-of-range colours with defaults, never throws', () => {
    const a = parseAvatar({ g: 'm', head: 'Hacker_Head', body: 'Suit_Body', legs: 42, skin: 99, hair: -1, top: 3 });
    const d = defaultAvatar('m');
    expect(a.head).toBe(d.head); expect(a.body).toBe('Suit_Body'); expect(a.legs).toBe(d.legs);
    expect(a.skin).toBe(d.skin); expect(a.hair).toBe(d.hair); expect(a.top).toBe(3);
  });
  it('garbage becomes the default avatar', () => {
    expect(parseAvatar(null)).toEqual(defaultAvatar('f'));
    expect(parseAvatar('x')).toEqual(defaultAvatar('f'));
  });
  it('a female avatar cannot wear a part that only exists for men', () => {
    expect(parseAvatar({ g: 'f', head: 'King_Head' }).head).toBe(defaultAvatar('f').head);
  });
});

describe('short code', () => {
  it('round-trips through the short string kept in the room state', () => {
    const a = { ...defaultAvatar('m'), body: 'Casual_Hoodie_Body', skin: 3, hair: 2, top: 5, bottom: 1 };
    const code = encodeAvatar(a);
    expect(code.length).toBeLessThan(40);
    expect(decodeAvatar(code)).toEqual(a);
  });
  it('a tampered code decodes to a valid avatar', () => {
    const a = decodeAvatar('m.999.0.0.0.77.0.0.0');
    expect(PARTS.m.head).toContain(a.head);
    expect(a.skin).toBeLessThan(SKIN_TONES.length);
  });
  it('palettes are non-empty hex colours', () => {
    for (const list of [SKIN_TONES, HAIR_COLORS, CLOTH_COLORS]) { expect(list.length).toBeGreaterThan(3); for (const c of list) expect(c).toMatch(/^#[0-9a-f]{6}$/i); }
  });
});

import { ACTIVITIES, activityFor, JoinOptions } from '../src/protocol';
describe('activities', () => {
  it('every work category maps to a desk animation', () => {
    expect(activityFor('Okuma')).toBe('read'); expect(activityFor('Dil')).toBe('read');
    expect(activityFor('Ders')).toBe('write'); expect(activityFor('Yazı')).toBe('write');
    expect(activityFor('Kodlama')).toBe('type'); expect(activityFor('???')).toBe('type');
    for (const a of ['type', 'write', 'read']) expect(ACTIVITIES).toContain(a);
  });
  it('join options reject an unknown activity', () => {
    expect(JoinOptions.safeParse({ activity: 'hack' }).success).toBe(false);
    expect(JoinOptions.safeParse({ activity: 'read', name: 'x' }).success).toBe(true);
  });
});
