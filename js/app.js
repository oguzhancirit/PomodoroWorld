/* Pomodoro World — game core v2: save, economy, quests, pomodoro, personal rooms, presence, NPCs */
(function () {
  const PW = window.PW;
  const U = PW.util;
  const SAVE_KEY = 'pw.save.v2';
  const $ = (s, r = document) => r.querySelector(s);

  const App = (PW.app = {
    S: null, net: null, lobby: null, chan: null, room: null,
    peers: new Map(), lobbyPeers: [], npcs: [], myId: 'me',
    timer: { phase: 'idle', left: 0, total: 0, running: false, round: 0, last: 0 },
    focusAccum: 0,
  });

  /* ---------------- save ---------------- */
  function freshSave() {
    const owned = {};
    PW.STARTER_OWNED.forEach((id) => (owned[id] = 1));
    PW.DEFAULT_ROOM().items.forEach((it) => (owned[it.id] = (owned[it.id] || 0) + 1));
    return {
      v: 2, uid: U.uid().replace(/[^a-z0-9]/g, '').slice(0, 12), name: '', created: Date.now(), onboarded: false, toured: false,
      av: PW.defaultAvatar('f'), xp: 0, coins: PW.ECON.startCoins, owned, room: PW.DEFAULT_ROOM(),
      stats: { focusMin: 0, pomos: 0, streak: 0, lastDay: null, days: {}, weekXP: {}, msgs: 0, dayPomos: {}, goalPaid: {}, log: [], hours: {} },
      flags: {}, ach: {},
      q: { day: '', daily: {}, week: '', weekly: {}, login: { streak: 0, last: null, claimedDay: null }, loginDays: [], pledge: null },
      task: { text: '', cat: 'Ders', recent: [] },
      settings: { preset: 'p25', custom: { focus: 40, brk: 8, long: 20 }, style: 'type', sound: true, speed: 1, npc: true, autoNext: false, gfx: 'high' },
    };
  }
  App.load = () => {
    const s = U.store.get(SAVE_KEY, null);
    const f = freshSave();
    if (s && s.v === 2) { App.S = Object.assign(f, s); ['settings', 'stats', 'q', 'task'].forEach((k) => (App.S[k] = Object.assign(f[k], s[k] || {}))); App.S.room = Object.assign(PW.DEFAULT_ROOM(), s.room || {}); App.S.av = Object.assign(PW.defaultAvatar(s.av && s.av.g), s.av || {}); }
    else App.S = f;
  };
  let saveT = 0;
  App.save = () => { clearTimeout(saveT); saveT = setTimeout(() => U.store.set(SAVE_KEY, App.S), 250); };
  App.saveNow = () => U.store.set(SAVE_KEY, App.S);

  /* ---------------- economy ---------------- */
  App.levelInfo = () => PW.levelFromXP(App.S.xp);
  App.weekXP = () => App.S.stats.weekXP[U.weekKey()] || 0;
  App.isOwned = (id) => (App.S.owned[id] || 0) > 0;
  App.placedCount = (id) => App.S.room.items.filter((i) => i.id === id).length;
  App.available = (id) => (App.S.owned[id] || 0) - App.placedCount(id);
  App.gain = (xp, coins, reason) => {
    const before = App.levelInfo().level;
    App.S.xp += xp; App.S.coins += coins;
    const wk = U.weekKey(); App.S.stats.weekXP[wk] = (App.S.stats.weekXP[wk] || 0) + xp;
    const after = App.levelInfo().level;
    App.save(); PW.ui.refreshHUD();
    if (reason) PW.ui.toast(reason, `+${xp} XP · +${coins} jeton`);
    if (after > before) { PW.ui.levelUp(after); App.publish(); }
  };
  App.buy = (id) => {
    const d = PW.ITEM[id]; if (!d) return { ok: false, msg: 'Eşya bulunamadı.' };
    const L = App.levelInfo().level;
    if (L < d.lvl) return { ok: false, msg: `Seviye ${d.lvl} gerekiyor.` };
    if (d.cat !== 'furn' && App.isOwned(id)) return { ok: false, msg: 'Bu eşya zaten sende.' };
    if (App.S.coins < d.price) return { ok: false, msg: `${d.price - App.S.coins} jeton daha lazım.` };
    App.S.coins -= d.price; App.S.owned[id] = (App.S.owned[id] || 0) + 1;
    App.save(); App.checkAch(); PW.ui.refreshHUD();
    return { ok: true };
  };
  App.checkAch = () => {
    for (const a of PW.ACHIEVEMENTS) if (!App.S.ach[a.id] && a.test(App.S)) { App.S.ach[a.id] = Date.now(); App.S.coins += a.coin; PW.ui.toast('Başarım: ' + a.name, `+${a.coin} jeton · ${a.desc}`, 'ach'); }
    App.save();
  };

  /* ---------------- quests & daily login ---------------- */
  App.questReset = () => {
    const Q = App.S.q, d = U.todayKey(), w = U.weekKey();
    if (Q.day !== d) { Q.day = d; Q.daily = {}; }
    if (Q.week !== w) { Q.week = w; Q.weekly = {}; }
  };
  App.qProg = (id, amount = 1, abs) => {
    App.questReset();
    const Q = App.S.q; const list = id.startsWith('d_') ? Q.daily : Q.weekly;
    const def = [...PW.QUESTS.daily, ...PW.QUESTS.weekly].find((x) => x.id === id); if (!def) return;
    const cur = list[id] || { p: 0, c: false };
    cur.p = Math.min(def.goal, abs != null ? abs : cur.p + amount);
    list[id] = cur; App.save(); PW.ui.refreshQuestBadge && PW.ui.refreshQuestBadge();
  };
  App.qClaim = (id) => {
    const Q = App.S.q; const list = id.startsWith('d_') ? Q.daily : Q.weekly; const cur = list[id];
    const def = [...PW.QUESTS.daily, ...PW.QUESTS.weekly].find((x) => x.id === id);
    if (!cur || cur.c || cur.p < def.goal) return false;
    cur.c = true; App.gain(def.xp, def.coin, 'Görev tamamlandı: ' + def.name); PW.sfx('buy'); return true;
  };
  App.loginTick = () => {
    const Q = App.S.q, d = U.todayKey();
    if (!Q.loginDays.includes(d)) { Q.loginDays.push(d); Q.loginDays = Q.loginDays.slice(-60); }
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (Q.login.last !== d) { Q.login.streak = Q.login.last === U.todayKey(y) ? Q.login.streak + 1 : 1; Q.login.last = d; }
    App.qProg('d_login', 1, 1);
    // consecutive login days this week
    let run = 0; for (let i = 0; i < 7; i++) { const dd = new Date(); dd.setDate(dd.getDate() - i); if (Q.loginDays.includes(U.todayKey(dd))) run++; else break; }
    App.qProg('w_days', 0, run);
    App.save();
  };
  App.claimLogin = () => {
    const Q = App.S.q, d = U.todayKey(); if (Q.login.claimedDay === d) return false;
    const idx = (Q.login.streak - 1) % 7; const reward = PW.LOGIN_REWARDS[idx];
    Q.login.claimedDay = d; App.gain(idx === 6 ? 40 : 0, reward, `Günlük giriş ödülü · ${idx + 1}. gün`); PW.sfx('buy'); return true;
  };
  App.setPledge = (min, days) => { const pd = PW.PLEDGE_DAYS.find((x) => x[0] === days); App.S.q.pledge = { min, days, start: U.todayKey(), coin: pd[1], xp: pd[2], done: [] }; App.save(); };
  App.pledgeTick = () => {
    const P = App.S.q.pledge; if (!P || P.finished) return;
    const d = U.todayKey(); if ((App.S.stats.days[d] || 0) >= P.min && !P.done.includes(d)) { P.done.push(d); PW.ui.toast('Sözünü tuttun', `Bugün ${P.min} dakika tamam · ${P.done.length}/${P.days}`); }
    if (P.done.length >= P.days) { P.finished = true; App.gain(P.xp, P.coin, 'Söz tamamlandı'); }
    App.save();
  };

  /* ---------------- pomodoro ---------------- */
  App.preset = () => { const s = App.S.settings; if (s.preset === 'custom') return Object.assign({ id: 'custom', name: 'Özel' }, s.custom); return PW.TIMER_PRESETS.find((p) => p.id === s.preset) || PW.TIMER_PRESETS[0]; };
  App.startFocus = () => {
    const p = App.preset(), T = App.timer;
    T.phase = 'focus'; T.total = T.left = p.focus * 60; T.running = true; T.last = Date.now(); T.startedAt = Date.now();
    T.logStart = new Date(); T.logMin = 0;
    const t = App.S.task; if (t.text && !t.recent.includes(t.text)) { t.recent.unshift(t.text); t.recent = t.recent.slice(0, 6); }
    App.ensureSeated(); App.myAct(); App.publish(); PW.ui.refreshTimer(); requestWake(); PW.sfx('start');
  };
  App.startBreak = (long) => {
    const p = App.preset(), T = App.timer;
    T.phase = 'break'; T.long = !!long; T.total = T.left = (long ? p.long : p.brk) * 60; T.running = true; T.last = Date.now();
    App.myAct(); App.publish(); PW.ui.refreshTimer();
  };
  App.pause = () => { const T = App.timer; if (T.phase === 'idle') return; T.running = !T.running; T.last = Date.now(); App.myAct(); App.publish(); PW.ui.refreshTimer(); };
  App.stop = () => { const T = App.timer; closeLog(); T.phase = 'idle'; T.running = false; T.left = 0; App.myAct(); App.publish(); PW.ui.refreshTimer(); releaseWake(); };
  App.skip = () => { const T = App.timer; if (T.phase === 'focus') { closeLog(); T.phase = 'idle'; App.startBreak(false); } else if (T.phase === 'break') App.stop(); };
  function closeLog() { const T = App.timer; if (T.phase !== 'focus' || !T.logStart || !T.logMin) return; const st = T.logStart; App.S.stats.log.push({ d: U.todayKey(st), s: st.getHours() * 60 + st.getMinutes(), m: T.logMin, c: App.S.task.cat }); App.S.stats.log = App.S.stats.log.slice(-400); T.logStart = null; T.logMin = 0; }
  function awardMinute() {
    const groupN = App.realPeersFocusing();
    const mult = 1 + Math.min(PW.ECON.groupBonusMax, groupN * PW.ECON.groupBonusPer);
    const S = App.S; S.stats.focusMin += 1; App.timer.logMin = (App.timer.logMin || 0) + 1;
    const d = U.todayKey(); S.stats.days[d] = (S.stats.days[d] || 0) + 1;
    const h = new Date().getHours(); S.stats.hours[h] = (S.stats.hours[h] || 0) + 1;
    App._minBuf = (App._minBuf || 0) + mult; const whole = Math.floor(App._minBuf); App._minBuf -= whole;
    if (whole) { S.xp += whole * PW.ECON.xpPerMin; S.coins += whole * PW.ECON.coinPerMin; const wk = U.weekKey(); S.stats.weekXP[wk] = (S.stats.weekXP[wk] || 0) + whole; }
    App.qProg('d_min', 0, S.stats.days[d]); App.qProg('w_min', 1);
    let bal = 0; for (let i = 0; i < 7; i++) { const dd = new Date(); dd.setDate(dd.getDate() - i); if ((S.stats.days[U.todayKey(dd)] || 0) >= 25) bal++; } App.qProg('w_balance', 0, bal);
    App.pledgeTick();
    const lvBefore = App._lv || App.levelInfo().level; const lv = App.levelInfo().level; App._lv = lv; if (lv > lvBefore) PW.ui.levelUp(lv);
    App.save(); PW.ui.refreshHUD();
  }
  function completeFocus() {
    const T = App.timer, S = App.S, E = PW.ECON, p = App.preset();
    closeLog();
    T.round += 1; S.stats.pomos += 1;
    const d = U.todayKey(); S.stats.dayPomos[d] = (S.stats.dayPomos[d] || 0) + 1;
    if (S.stats.lastDay !== d) { const y = new Date(); y.setDate(y.getDate() - 1); S.stats.streak = S.stats.lastDay === U.todayKey(y) ? S.stats.streak + 1 : 1; S.stats.lastDay = d; }
    let xp = E.pomoXP, coins = E.pomoCoin, label = 'Pomodoro tamamlandı';
    if (S.stats.dayPomos[d] === 1) { coins += Math.min(30, S.stats.streak * 2); label += ` · ${S.stats.streak}. gün serisi`; }
    if (T.round % 4 === 0) { xp += E.setBonusXP; coins += E.setBonusCoin; label = '4\'lü set tamamlandı'; }
    if (S.stats.dayPomos[d] === E.dailyGoal && !S.stats.goalPaid[d]) { S.stats.goalPaid[d] = 1; coins += E.dailyGoalCoin; label = 'Günlük hedef tamam'; }
    const h = new Date().getHours(); if (h >= 23) S.flags.night = 1; if (h < 7) S.flags.early = 1; if (p.focus >= 90) S.flags.deep = 1;
    App.qProg('d_pomo', 1);
    if (App.peers.size > 0 || (App.room && App.room.kind === 'visit')) App.qProg('d_together', 1);
    App.gain(xp, coins, label); App.checkAch(); PW.sfx('done');
    PW.world.emote(App.myId, 'cheer'); App.chan && App.chan.sendEmote('cheer');
    App.startBreak(T.round % 4 === 0); PW.ui.flashTitle('Mola zamanı!');
  }
  App.tick = () => {
    const T = App.timer, now = Date.now();
    const dt = Math.min(5, (now - (T.last || now)) / 1000) * (App.S.settings.speed || 1); T.last = now;
    if (T.running && T.phase !== 'idle') {
      T.left -= dt;
      if (T.phase === 'focus') { App.focusAccum += dt; while (App.focusAccum >= 60) { App.focusAccum -= 60; awardMinute(); } }
      if (T.left <= 0) {
        if (T.phase === 'focus') completeFocus();
        else { PW.sfx('start'); if (App.S.settings.autoNext) App.startFocus(); else { App.stop(); PW.ui.toast('Mola bitti', 'Hazırsan yeni turu başlat.'); } }
      }
      PW.ui.refreshTimer();
      if (Math.floor(T.left) % 5 === 0) App.publishTimer();
    }
    App.tickNPC(dt);
  };
  App.myAct = () => {
    const T = App.timer, w = PW.world; const me = w.avatars.get(App.myId); if (!me) return;
    const sit = me.seatIdx != null;
    let act = 'idle';
    if (T.phase === 'focus' && T.running) act = App.S.settings.style;
    else if (T.phase === 'break') act = Math.random() < 0.5 ? 'stretch' : 'drink';
    w.setAct(App.myId, sit ? act : act === 'drink' ? 'drink' : 'idle');
    w.updateAvatarInfo(App.myId, { status: App.status(), timer: U.fmtTime(T.left) });
  };
  App.status = () => (App.timer.phase === 'focus' ? (App.timer.running ? 'focus' : 'paused') : App.timer.phase === 'break' ? 'break' : '');
  let wakeLock = null;
  async function requestWake() { try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {} }
  function releaseWake() { try { wakeLock && wakeLock.release(); } catch (e) {} wakeLock = null; }

  /* ---------------- rooms ---------------- */
  const ROOM_KEYS = ['theme', 'view', 'size', 'mood', 'wall', 'wallPat', 'floorT', 'floorC', 'trim', 'curtain'];
  App.homeDef = () => { const r = App.S.room; const d = { items: r.items }; ROOM_KEYS.forEach((k) => (d[k] = r[k])); return d; };
  App.homeKey = () => 'h-' + App.S.uid + (App.S.room.open ? '' : '-' + App.S.room.token);
  App.inviteCode = () => (App.S.uid + (App.S.room.open ? '' : '-' + App.S.room.token)).toUpperCase();
  App.inviteLink = () => location.href.split('#')[0] + '#oda-' + App.inviteCode().toLowerCase();
  App.parseCode = (code) => { const m = String(code || '').trim().toLowerCase().replace(/^.*#oda-/, '').match(/^([a-z0-9]{4,14})(?:-([a-z0-9]{3,10}))?$/); return m ? { uid: m[1], token: m[2] || null } : null; };
  const r2 = (n) => Math.round(n * 100) / 100;
  App.compactRoom = () => { const r = App.S.room; const o = { i: r.items.slice(0, 60).map((it) => it.w ? [it.id, it.w, r2(it.x)] : [it.id, r2(it.x), r2(it.z), it.r || 0, it.c || 0, it.wd || 0]) }; ROOM_KEYS.forEach((k) => { if (r[k] != null) o[k] = r[k]; }); return o; };
  App.expandRoom = (rd) => { const d = { items: (rd.i || []).filter((x) => PW.ITEM[x[0]]).map((x) => (typeof x[1] === 'string' ? x : [x[0], x[1], x[2], x[3], x[4] || undefined, x[5] || undefined])) }; ROOM_KEYS.forEach((k) => (d[k] = rd[k])); d.size = [7, 9, 11].includes(rd.size) ? rd.size : 7; return d; };
  App.roomMeta = () => ({ n: (App.S.room.name || 'Oda').slice(0, 32), d: (App.S.room.desc || '').slice(0, 90), c: App.S.room.cat || 'Genel', o: !!App.S.room.open });

  App.enterRoom = async (spec) => {
    const w = PW.world;
    if (App.chan) { try { App.chan.leave(); } catch (e) {} App.chan = null; }
    App.peers.clear();
    App.npcs.forEach((n) => w.removeAvatar(n.id)); App.npcs = [];
    w.clearAvatars(); w.unfollow(); w.setEdit(false); PW.ui.setEditing(false, true);
    App.room = spec; App._visitKey = null;
    w.loadRoom(spec.def);
    w.addAvatar(App.myId, App.S.av, { name: App.S.name || 'Sen', level: App.levelInfo().level, isMe: true });
    if (spec.kind === 'social') { const sp = w.spawnPoint(); w.avatars.get(App.myId).av.root.position.set(sp.x, 0, sp.z); } else App.ensureSeated(true);
    App.myAct();
    PW.ui.onRoomChange(spec);
    if (App.S.settings.npc && spec.npc) App.spawnNPCs(spec.npc, spec.kind);
    await App.joinChannel(spec);
    App.publish(); App.publishLobby();
    if (spec.kind === 'visit') history.replaceState(null, '', '#oda-' + spec.code.toLowerCase()); else if (location.hash.startsWith('#oda-')) history.replaceState(null, '', location.pathname + location.search);
  };
  App.joinChannel = async (spec) => {
    if (!App.net || App.room !== spec) return;
    if (App.chan) { try { App.chan.leave(); } catch (e) {} App.chan = null; }
    try {
      const ch = await App.net.join(spec.key);
      if (App.room !== spec) { ch.leave(); return; }
      App.chan = ch;
      ch.onPeers((list) => App.onPeers(list));
      ch.onChat((m) => App.onRemoteChat(m));
      ch.onEmote((m) => { const p = App.peers.get(m.peer); if (p && ['wave', 'dance', 'clap', 'cheer'].includes(m.e)) PW.world.emote(p.avId, m.e); });
      App.publish();
    } catch (e) { console.warn('join failed', e); }
  };
  App.enterPublic = (id) => { const r = PW.PUBLIC_ROOMS.find((x) => x.id === id); if (!r) return; return App.enterRoom({ kind: r.kind, id: r.id, key: 'r-' + r.id, name: r.name, def: { theme: r.theme, view: r.view, size: r.size, items: r.items, mood: r.mood }, npc: r.npc }); };
  App.enterHome = () => App.enterRoom({ kind: 'home', id: 'home', key: App.homeKey(), name: App.S.room.name || 'Odam', def: App.homeDef(), npc: 0 });
  App.visitCode = (code, rd, ownerName) => {
    const c = App.parseCode(code); if (!c) return false;
    if (c.uid === App.S.uid) { App.enterHome(); return true; }
    const def = rd ? App.expandRoom(rd) : { theme: 'th_white', view: 'v_city_day', size: 7, mood: 'day', items: [['f_table_round', 0, -0.5, 0], ['f_chair_wood', 0, -1.35, 0], ['f_chair_wood', 0, 0.35, 2], ['f_chair_wood', -0.85, -0.5, 1], ['f_chair_wood', 0.85, -0.5, 3]] };
    App.enterRoom({ kind: 'visit', id: 'v-' + c.uid, key: 'h-' + c.uid + (c.token ? '-' + c.token : ''), owner: c.uid, code: c.uid + (c.token ? '-' + c.token : ''), name: ownerName ? ownerName + ' · oda' : 'Davetli oda', def, npc: 0, waiting: !rd });
    return true;
  };
  App.rebuildHome = () => { if (App.room && App.room.kind === 'home') { App.room.def = App.homeDef(); App.room.name = App.S.room.name; PW.world.loadRoom(App.room.def); if (!PW.world.edit.on) { App.ensureSeated(true); App.myAct(); } App.publish(); App.publishLobby(); PW.ui.onRoomMeta && PW.ui.onRoomMeta(); } };
  App.saveRoomSettings = (o) => {
    const R = App.S.room; const wasKey = App.homeKey();
    Object.assign(R, o); App.save();
    if (App.room && App.room.kind === 'home') { App.room.name = R.name; if (App.homeKey() !== wasKey) App.enterHome(); else { App.publish(); App.publishLobby(); PW.ui.onRoomChange(App.room, true); } }
  };
  App.ensureSeated = (force) => {
    const w = PW.world, me = w.avatars.get(App.myId); if (!me) return;
    if (!force && me.seatIdx != null) return;
    if (App.room && App.room.kind === 'social' && !force) return;
    const idx = w.freeSeat(true); if (idx != null) w.sitAvatar(App.myId, idx);
  };

  /* ---------------- presence ---------------- */
  App.presence = () => {
    const w = PW.world, me = w.avatars.get(App.myId), T = App.timer;
    const pos = me ? me.av.root.position : { x: 0, z: 0 };
    const p = { u: App.S.uid, n: (App.S.name || 'Misafir').slice(0, 20), lv: App.levelInfo().level, av: App.S.av, st: App.status(), tl: T.phase !== 'idle' ? Math.round(T.left) : null, seat: me ? me.seatIdx : null, x: r2(pos.x), z: r2(pos.z), act: me ? me.av.act : 'idle', tk: App.timer.phase === 'focus' ? (App.S.task.text || '').slice(0, 40) : null };
    if (App.room && App.room.kind === 'home') { p.rd = App.compactRoom(); p.room = App.roomMeta(); }
    return p;
  };
  let pubT = 0;
  App.publish = () => { clearTimeout(pubT); pubT = setTimeout(() => { if (App.chan) App.chan.setPresence(App.presence()); }, 60); };
  App.publishTimer = () => { if (App.chan) App.chan.setPresence({ st: App.status(), tl: App.timer.phase !== 'idle' ? Math.round(App.timer.left) : null }); };
  App.publishLobby = () => {
    if (!App.lobby) return;
    const r = App.room || {};
    const p = { u: App.S.uid, n: (App.S.name || 'Misafir').slice(0, 20), lv: App.levelInfo().level, wx: App.weekXP(), at: r.key || '', atn: (r.name || '').slice(0, 36), st: App.status(), room: App.roomMeta() };
    p.rd = App.S.room.open ? App.compactRoom() : null;
    App.lobby.setPresence(p);
  };
  App.realPeersFocusing = () => { let n = 0; for (const p of App.peers.values()) if (p.presence && p.presence.st === 'focus') n++; return n; };
  App.onPeers = (list) => {
    const w = PW.world, seen = new Set(); let myPeer = null;
    for (const p of list) {
      if (p.isMe) { myPeer = p.peer; continue; }
      const pr = p.presence || {}; if (!pr.av) continue;
      if (pr.u && pr.u === App.S.uid) continue;
      seen.add(p.peer);
      const avId = 'p-' + p.peer;
      App.peers.set(p.peer, { peer: p.peer, presence: pr, avId });
      const info = { name: pr.n || 'Misafir', level: pr.lv || 1, cfg: App.sanitizeAv(pr.av), status: pr.st || '', timer: pr.tl != null ? U.fmtTime(pr.tl) : '' };
      // visiting: the owner's design defines the room
      if (App.room && App.room.kind === 'visit' && pr.u === App.room.owner && pr.rd) {
        const key = JSON.stringify(pr.rd);
        if (key !== App._visitKey) { App._visitKey = key; App.room.def = App.expandRoom(pr.rd); App.room.name = (pr.room && pr.room.n) || pr.n + ' · oda'; App.room.waiting = false; App.room.ownerName = pr.n; w.loadRoom(App.room.def); App.ensureSeated(true); App.myAct(); App.publish(); PW.ui.onRoomChange(App.room, true); }
      }
      if (!w.avatars.has(avId)) { w.addAvatar(avId, info.cfg, Object.assign(info, { pos: { x: pr.x || 0, z: pr.z || 0 } })); App.trimNPCs(); }
      else w.updateAvatarInfo(avId, info);
      const a = w.avatars.get(avId);
      if (pr.seat != null && w.seats[pr.seat]) {
        if (a.seatIdx !== pr.seat && !(a.alt && a.seatIdx != null)) {
          const s = w.seats[pr.seat];
          if (s.taken === App.myId && myPeer && p.peer < myPeer) { w.standAvatar(App.myId); w.sitAvatar(avId, pr.seat); App.ensureSeated(true); App.publish(); }
          else if (s.taken && s.taken.startsWith('npc-')) { const n = App.npcs.find((x) => x.id === s.taken); w.standAvatar(s.taken); w.sitAvatar(avId, pr.seat); if (n) App.reseatNPC(n); }
          else if (!s.taken) { w.sitAvatar(avId, pr.seat); a.alt = false; }
          else if (a.seatIdx == null) { const alt = w.freeSeat(true); if (alt != null) { w.sitAvatar(avId, alt); a.alt = true; } }
        }
      } else if (pr.seat == null && a.seatIdx != null) { w.standAvatar(avId); a.alt = false; }
      if (pr.seat == null && pr.x != null) { const rp = a.av.root.position; if (Math.hypot(rp.x - pr.x, rp.z - pr.z) > 0.15) w.walkTo(avId, pr.x, pr.z); }
      if (pr.act && a.seatIdx != null) a.av.act = pr.act; else if (pr.act && !a.target) a.av.act = ['drink', 'idle'].includes(pr.act) ? pr.act : 'idle';
    }
    for (const [peer, v] of [...App.peers]) if (!seen.has(peer)) { w.removeAvatar(v.avId); App.peers.delete(peer); }
    PW.ui.refreshPeople();
  };
  App.sanitizeAv = (av) => {
    const o = Object.assign({}, PW.defaultAvatar(av && av.g === 'f' ? 'f' : 'm'));
    if (!av || typeof av !== 'object') return o;
    for (const k of ['hs', 'top', 'bot', 'sh', 'fh']) if (typeof av[k] === 'string' && PW.ITEM[av[k]]) o[k] = av[k];
    for (const k of ['sk', 'hc', 'ec', 'tc', 'tc2', 'bc', 'shc', 'lp']) if (Number.isInteger(av[k]) && av[k] >= 0 && av[k] < 16) o[k] = av[k];
    for (const [k, list] of [['ey', PW.EYE_STYLES], ['br', PW.BROW_STYLES], ['mo', PW.MOUTH_STYLES], ['bd', PW.BODY_TYPES], ['tp', PW.TOP_PATTERNS]]) if (list.some((x) => x[0] === av[k])) o[k] = av[k];
    o.bl = av.bl ? 1 : 0; o.fr = av.fr ? 1 : 0; if (typeof av.ht === 'number') o.ht = U.clamp(av.ht, 0.9, 1.1);
    if (Array.isArray(av.acc)) o.acc = av.acc.filter((x) => typeof x === 'string' && PW.ITEM[x]).slice(0, 6);
    return o;
  };

  /* ---------------- chat ---------------- */
  App.sendChat = (text) => {
    text = String(text || '').trim().slice(0, 200); if (!text) return;
    PW.world.bubble(App.myId, text);
    PW.ui.addChat({ name: App.S.name || 'Sen', text, me: true, lv: App.levelInfo().level });
    App.S.stats.msgs = (App.S.stats.msgs || 0) + 1; App.checkAch();
    if (App.room && App.room.kind === 'social') App.qProg('d_social', 1);
    if (App.chan) App.chan.sendChat(text);
    App.npcReact(text);
  };
  App.onRemoteChat = (m) => {
    const p = App.peers.get(m.peer);
    if (!p && !m.retry) { setTimeout(() => App.onRemoteChat(Object.assign({}, m, { retry: true })), 700); return; }
    const name = p ? p.presence.n : 'Biri';
    if (p) PW.world.bubble(p.avId, m.text);
    PW.ui.addChat({ name, text: m.text, lv: p ? p.presence.lv : 1 });
  };
  App.emote = (e) => { PW.world.emote(App.myId, e); if (App.chan) App.chan.sendEmote(e); };

  /* ---------------- NPC regulars (social spaces only) ---------------- */
  App.spawnNPCs = (n, kind) => {
    const w = PW.world, r = U.seeded(U.hashStr((App.room && App.room.id) || 'x'));
    const names = [...PW.NPC_NAMES].sort(() => r() - 0.5);
    for (let i = 0; i < n; i++) {
      const id = 'npc-' + i; const cfg = PW.randomAvatar(r);
      const npc = { id, name: names[i % names.length], cfg, level: 2 + Math.floor(r() * 14), kind, chatIn: 15 + r() * 60, wanderIn: 3 + r() * 10 };
      w.addAvatar(id, cfg, { name: npc.name, level: npc.level, npc: true });
      App.npcs.push(npc);
      if (r() < 0.45) { const s = w.freeSeat(false); if (s != null) w.sitAvatar(id, s); } else { const h = w.half - 1; w.avatars.get(id).av.root.position.set(U.rand(-h, h), 0, U.rand(-h, h)); }
    }
  };
  App.reseatNPC = (npc) => { const w = PW.world; const s = w.freeSeat(false); if (s != null) w.sitAvatar(npc.id, s); else { w.removeAvatar(npc.id); App.npcs = App.npcs.filter((x) => x !== npc); } };
  App.trimNPCs = () => { const want = Math.max(0, ((App.room && App.room.npc) || 0) - App.peers.size); while (App.npcs.length > want) { const n = App.npcs.pop(); PW.world.removeAvatar(n.id); } };
  App.tickNPC = (dt) => {
    const w = PW.world;
    for (const n of App.npcs) {
      n.wanderIn -= dt; n.chatIn -= dt;
      const a = w.avatars.get(n.id); if (!a) continue;
      if (n.wanderIn <= 0) {
        n.wanderIn = 6 + Math.random() * 14; const roll = Math.random();
        if (roll < 0.35) { const h = w.half - 0.9; w.walkTo(n.id, U.rand(-h, h), U.rand(-h, h)); }
        else if (roll < 0.55) { const s = w.freeSeat(false); if (s != null) { const st = w.seats[s]; w.walkTo(n.id, st.x + Math.sin(st.ry) * 0.5, st.z + Math.cos(st.ry) * 0.5); a.onArrive = () => w.sitAvatar(n.id, s); } }
        else if (roll < 0.75) w.emote(n.id, ['wave', 'dance', 'clap'][Math.floor(Math.random() * 3)]);
      }
      if (n.chatIn <= 0) { n.chatIn = 25 + Math.random() * 50; const line = U.pick(PW.NPC_LINES_SOCIAL); w.bubble(n.id, line); PW.ui.addChat({ name: n.name, text: line, npc: true, lv: n.level }); }
    }
  };
  App.npcReact = (text) => {
    if (!App.npcs.length) return;
    const t = text.toLocaleLowerCase('tr'); let reply = null;
    if (/(selam|merhaba|hey|sa\b|naber)/.test(t)) reply = U.pick(['Selam! Hoş geldin.', 'Merhaba! Molada mısın?', 'Hey! Hangi konuya çalışıyorsun?']);
    else if (/(kaç|pomodoro|tur)/.test(t)) reply = U.pick(['Ben bugün 3 tur yaptım.', 'Bir tur daha yapalım mı?', 'Hedefim 6 pomodoro.']);
    else if (/(yorgun|sıkıl|zor)/.test(t)) reply = U.pick(['Mola ver, su iç. Sonra devam.', 'Bir tur daha, sonra kahve!', 'Az kaldı, pes yok.']);
    if (!reply) return;
    const n = App.npcs[Math.floor(Math.random() * App.npcs.length)];
    setTimeout(() => { if (!PW.world.avatars.has(n.id)) return; PW.world.bubble(n.id, reply); PW.ui.addChat({ name: n.name, text: reply, npc: true, lv: n.level }); }, 1400 + Math.random() * 1500);
  };

  /* ---------------- sound ---------------- */
  let actx = null;
  PW.sfx = (kind) => {
    if (!App.S || !App.S.settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = kind === 'done' ? [660, 880, 1046] : kind === 'buy' ? [880, 1320] : kind === 'pop' ? [740] : [523, 659];
      notes.forEach((f, i) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, actx.currentTime + i * 0.12); g.gain.linearRampToValueAtTime(0.16, actx.currentTime + i * 0.12 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + i * 0.12 + 0.35); o.connect(g).connect(actx.destination); o.start(actx.currentTime + i * 0.12); o.stop(actx.currentTime + i * 0.12 + 0.4); });
    } catch (e) {}
  };

  /* ---------------- boot ---------------- */
  App.boot = async () => {
    App.load(); App.questReset(); App.loginTick();
    App._lv = App.levelInfo().level;
    PW.world = new PW.World($('#stage'), $('#tags'), { quality: App.S.settings.gfx });
    PW.world.onClick = (ev) => PW.ui.onWorldClick(ev);
    PW.world.onPlace = (pos) => PW.ui.onPlace(pos);
    PW.ui.init();
    const inviteHash = location.hash.startsWith('#oda-') ? location.hash.slice(5) : null;
    if (!App.S.onboarded) { App.enterHome(); PW.ui.startOnboarding(inviteHash); }
    else if (inviteHash) App.visitCode(inviteHash);
    else { App.enterHome(); PW.world.flyIn(); setTimeout(() => PW.ui.openFocus(), 900); }
    setInterval(App.tick, 250);
    setInterval(() => App.publishLobby(), 15000);
    window.addEventListener('beforeunload', () => App.saveNow());
    window.addEventListener('hashchange', () => { if (location.hash.startsWith('#oda-') && App.S.onboarded) App.visitCode(location.hash.slice(5)); });
    try {
      App.net = await PW.createNet();
      PW.ui.setNetMode(App.net);
      App.lobby = App.net.lobby();
      App.lobby.onPeers((list) => { App.lobbyPeers = list.filter((p) => !p.isMe && p.presence && p.presence.u && p.presence.u !== App.S.uid); PW.ui.refreshCommunity(); });
      if (App.room) await App.joinChannel(App.room);
      App.publishLobby();
    } catch (e) { console.warn(e); PW.ui.setNetMode({ mode: 'off', label: 'Çevrimdışı' }); }
  };
})();
