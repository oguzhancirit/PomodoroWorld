/* Pomodoro World — public-safety layer.
   Everything that arrives from other players is untrusted: it is size-capped, type-checked, clamped and
   cleaned here before the game ever sees it. Also: profanity filter, per-peer rate limits, plausibility
   caps for the leaderboard, and the block / room-ban lists. */
(function () {
  const PW = window.PW, U = PW.util;
  const S = (PW.safe = {});

  /* ---------- primitives ---------- */
  const CTRL = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿]/g;
  S.str = (v, n) => (typeof v === 'string' ? v.replace(CTRL, '').replace(/\s+/g, ' ').trim().slice(0, n) : '');
  S.num = (v, a, b, d = null) => (typeof v === 'number' && isFinite(v) ? U.clamp(v, a, b) : d);
  S.int = (v, a, b, d = null) => (Number.isInteger(v) ? U.clamp(v, a, b) : d);
  S.oneOf = (v, arr, d) => (arr.includes(v) ? v : d);
  S.size = (o) => { try { return JSON.stringify(o).length; } catch (e) { return 1e9; } };
  const HEX = /^#[0-9a-fA-F]{6}$/;
  S.uid = (v) => (typeof v === 'string' && /^[a-z0-9]{4,14}$/.test(v) ? v : null);
  S.tag = (uid) => '#' + String(uid || '').slice(0, 4).toUpperCase();

  /* ---------- profanity filter (TR + EN, leetspeak aware, whole-word) ---------- */
  const BAD = [
    /^a+m+[ıi]*n+a+/, /^amk+$/, /^amq$/, /^aq+$/, /^amc[ıi]k/, /^or+o+s+p+u/, /^o[cç]$/, /^piç$/, /^piçlik/, /^s[ıi]k(ik|tir|erim|eyim|iyim|tim|ti[gğ]im|ik|ici)?$/, /^siktir/, /^yar+a+k/,
    /^g[oö]t(ü|u|veren|ün|un)?$/, /^gavat/, /^pezevenk/, /^kahpe/, /^ibne/, /^[sş]erefsiz/, /^pu[sş]t/, /^anan[ıi]/, /^s[uü]rt[uü]k/, /^yav[sş]ak/, /^dalyarak/, /^ta[sş]ak/, /^penis$/, /^vajina$/,
    /^fu+c+k/, /^sh[i1]t+$/, /^b[i1]tch/, /^cunt/, /^d[i1]ck(head)?$/, /^a+s+s+h+o+l+e/, /^bastard/, /^n[i1]gg/, /^fag+(ot)?/, /^slut/, /^whore/, /^retard/,
  ];
  const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's', '!': 'i' };
  const norm = (w) => w.toLocaleLowerCase('tr').replace(/[013457@$!]/g, (c) => LEET[c] || c).replace(/[^a-zçğıöşü]/g, '').replace(/(.)\1{2,}/g, '$1$1');
  const isBad = (w) => { const n = norm(w); if (n.length < 2) return false; const n1 = n.replace(/(.)\1+/g, '$1'); return BAD.some((r) => r.test(n) || r.test(n1)); };
  S.clean = (text) => {
    if (!text) return '';
    if (PW.app && PW.app.S && PW.app.S.settings && PW.app.S.settings.filter === false) return text;
    return text.replace(/[^\s.,;:?!()"'«»“”\-]+/g, (tok) => (isBad(tok) ? tok[0] + '*'.repeat(Math.max(2, tok.length - 1)) : tok));
  };
  S.isBadName = (name) => String(name || '').split(/[\s._\-]+/).some(isBad) || isBad(String(name || '').replace(/[\s._\-]+/g, ''));
  S.cleanName = (n) => { const s = S.str(typeof n === 'string' ? n.replace(/[<>{}\[\]\\`]/g, '') : n, 20); return s && !S.isBadName(s) ? s : s ? 'Oyuncu' : ''; };

  /* ---------- rate limiting ---------- */
  S.limiter = (n, perMs) => {
    const m = new Map();
    return (key) => {
      const now = Date.now(); const a = (m.get(key) || []).filter((t) => now - t < perMs);
      if (a.length >= n) { m.set(key, a); return false; }
      a.push(now); m.set(key, a); if (m.size > 500) m.delete(m.keys().next().value); return true;
    };
  };
  S.chatIn = S.limiter(5, 10000); S.chatOut = S.limiter(5, 10000); S.emoteIn = S.limiter(6, 10000); S.roomReload = S.limiter(1, 2500);
  const recent = new Map();
  S.isRepeat = (peer, text) => { const k = peer + '|' + text.toLocaleLowerCase('tr'); const now = Date.now(); const a = (recent.get(k) || []).filter((t) => now - t < 30000); a.push(now); recent.set(k, a); if (recent.size > 400) recent.delete(recent.keys().next().value); return a.length > 2; };

  /* ---------- plausibility (no server: we cannot verify, we can only cap what is impossible) ---------- */
  S.weekCap = () => { const now = new Date(); const d = (now.getDay() + 6) % 7; const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - d); return Math.round(((now - start) / 60000) * 1.5) + 1500; };

  /* ---------- room design ---------- */
  const keysOf = (list) => (list || []).map((x) => x[0]);
  S.roomDesign = (rd) => {
    if (!rd || typeof rd !== 'object' || S.size(rd) > 12000) return null;
    const o = { i: [] };
    const lim = 6;
    for (const x of (Array.isArray(rd.i) ? rd.i : []).slice(0, 80)) {
      if (!Array.isArray(x) || !PW.ITEM[x[0]] || PW.ITEM[x[0]].cat !== 'furn') continue;
      const d = PW.ITEM[x[0]];
      if (typeof x[1] === 'string') { if (d.wall && ['w0', 'w1', 'w2', 'w3'].includes(x[1])) o.i.push([x[0], x[1], S.num(x[2], -lim, lim, 0)]); continue; }
      if (d.wall) continue;
      o.i.push([x[0], S.num(x[1], -lim, lim, 0), S.num(x[2], -lim, lim, 0), S.int(x[3], 0, 3, 0), typeof x[4] === 'string' && HEX.test(x[4]) ? x[4] : 0, typeof x[5] === 'string' && PW.WOOD_TONES && PW.WOOD_TONES[x[5]] ? x[5] : 0]);
    }
    const it = (id, cat) => (typeof id === 'string' && PW.ITEM[id] && PW.ITEM[id].cat === cat ? id : undefined);
    o.theme = it(rd.theme, 'theme'); o.view = it(rd.view, 'view'); o.size = S.oneOf(rd.size, [7, 9, 11], 7);
    o.mood = PW.MOODS && PW.MOODS[rd.mood] ? rd.mood : undefined;
    for (const k of ['wall', 'floorC', 'trim', 'curtain']) if (typeof rd[k] === 'string' && HEX.test(rd[k])) o[k] = rd[k];
    if (keysOf(PW.WALL_PATTERNS).includes(rd.wallPat)) o.wallPat = rd.wallPat;
    if (keysOf(PW.FLOOR_TYPES).includes(rd.floorT)) o.floorT = rd.floorT;
    return o;
  };

  /* ---------- presence ---------- */
  const ACTS = ['idle', 'type', 'write', 'read', 'drink', 'stretch', 'wave', 'dance', 'clap', 'cheer'];
  S.presence = (pr) => {
    if (!pr || typeof pr !== 'object' || Array.isArray(pr) || S.size(pr) > 20000) return null;
    const u = S.uid(pr.u); if (!u) return null;
    const o = { u };
    o.n = S.cleanName(pr.n) || 'Misafir';
    o.lv = S.int(pr.lv, 1, 99, 1);
    if (pr.av && typeof pr.av === 'object') o.av = PW.app.sanitizeAv(pr.av);
    o.st = S.oneOf(pr.st, ['focus', 'paused', 'break', ''], '');
    o.tl = S.num(pr.tl, 0, 4 * 3600, null); if (o.tl != null) o.tl = Math.round(o.tl);
    o.tt = S.num(pr.tt, 60, 4 * 3600, null);
    o.seat = S.int(pr.seat, 0, 300, null);
    o.x = S.num(pr.x, -6, 6, 0); o.z = S.num(pr.z, -6, 6, 0);
    o.act = S.oneOf(pr.act, ACTS, 'idle');
    o.tk = pr.tk ? S.clean(S.str(pr.tk, 40)) || null : null;
    o.wx = Math.min(S.int(pr.wx, 0, 1e6, 0), S.weekCap());
    o.at = S.str(pr.at, 64); o.atn = S.clean(S.str(pr.atn, 36));
    if (pr.room && typeof pr.room === 'object') o.room = { n: S.clean(S.str(pr.room.n, 32)) || 'Oda', d: S.clean(S.str(pr.room.d, 90)), c: S.oneOf(pr.room.c, PW.ROOM_CATS, 'Genel'), o: !!pr.room.o };
    if (pr.rd) o.rd = S.roomDesign(pr.rd);
    if (Array.isArray(pr.ban)) o.ban = pr.ban.filter(S.uid).slice(0, 100);
    if (pr.gs === 1) o.gs = 1;
    return o;
  };
  S.chat = (text) => S.str(text, 200);
  S.EMOTES = ['wave', 'dance', 'clap', 'cheer', 'gs'];
})();
