// Text safety shared by server (enforcement) and client (instant feedback).

export const CHAT_MAX = 120;
export const NAME_MAX = 20;

// control characters, zero-width and bidi-override characters
const CTRL = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿]/g;

export function cleanText(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.replace(CTRL, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/* ---------- profanity filter (Turkish + English, leetspeak aware, whole words) ---------- */
const BAD: RegExp[] = [
  /^a+m+[ıi]*n+a+/, /^amk+$/, /^amq$/, /^aq+$/, /^amc[ıi]k/, /^or+o+s+p+u/, /^o[cç]$/, /^piç$/, /^piçlik/,
  /^s[ıi]k(ik|tir|erim|eyim|iyim|tim|ti[gğ]im|ici)?$/, /^siktir/, /^yar+a+k/,
  /^g[oö]t(ü|u|veren|ün|un)?$/, /^gavat/, /^pezevenk/, /^kahpe/, /^ibne/, /^[sş]erefsiz/, /^pu[sş]t/, /^anan[ıi]/,
  /^s[uü]rt[uü]k/, /^yav[sş]ak/, /^dalyarak/, /^ta[sş]ak/, /^penis$/, /^vajina$/,
  /^fu+c+k/, /^sh[i1]t+$/, /^b[i1]tch/, /^cunt/, /^d[i1]ck(head)?$/, /^a+s+s+h+o+l+e/, /^bastard/, /^n[i1]gg/,
  /^fag+(ot)?/, /^slut/, /^whore/, /^retard/,
];
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i' };
const norm = (w: string) =>
  w.toLocaleLowerCase('tr').replace(/[013457@$!]/g, (c) => LEET[c] ?? c).replace(/[^a-zçğıöşü]/g, '').replace(/(.)\1{2,}/g, '$1$1');

function isBadWord(w: string): boolean {
  const n = norm(w);
  if (n.length < 2) return false;
  const squeezed = n.replace(/(.)\1+/g, '$1');
  return BAD.some((r) => r.test(n) || r.test(squeezed));
}

export function censor(text: string): string {
  return text.replace(/[^\s.,;:?!()"'«»“”\-]+/g, (tok) => (isBadWord(tok) ? tok[0] + '*'.repeat(Math.max(2, tok.length - 1)) : tok));
}

export function isBadName(name: string): boolean {
  const s = String(name || '');
  return s.split(/[\s._\-]+/).some(isBadWord) || isBadWord(s.replace(/[\s._\-]+/g, ''));
}

export function cleanName(v: unknown): string {
  // drop whole tags first ("<b>x</b>" → "x"), then any stray markup characters
  const s = cleanText(typeof v === 'string' ? v.replace(/<[^>]{0,40}>/g, '').replace(/[<>{}\[\]\\`]/g, '') : v, NAME_MAX);
  if (!s) return '';
  return isBadName(s) ? 'Oyuncu' : s;
}

/** Sliding-window limiter: at most `max` events per `windowMs` for each key. Time is passed in. */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private max: number, private windowMs: number) {}
  allow(key: string, now: number): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.max) { this.hits.set(key, recent); return false; }
    recent.push(now); this.hits.set(key, recent);
    return true;
  }
  forget(key: string): void { this.hits.delete(key); }
}
