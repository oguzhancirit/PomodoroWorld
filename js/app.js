/* Pomodoro World — game core: save, economy, pomodoro, rooms, presence, NPCs */
(function () {
  const PW = window.PW;
  const U = PW.util;
  const SAVE_KEY = 'pw.save.v1';
  const $ = (s, r = document) => r.querySelector(s);

  const App = (PW.app = {
    S: null, world: null, net: null, lobby: null, chan: null, room: null,
    peers: new Map(), lobbyPeers: [], npcs: [], myId: 'me',
    timer: { phase: 'idle', left: 0, total: 0, running: false, round: 0, last: 0 },
    focusAccum: 0,
  });

  /* ---------------- save ---------------- */
  function freshSave() {
    const owned = {};
    PW.STARTER_OWNED.forEach((id) => (owned[id] = 1));
    PW.DEFAULT_ROOM().items.forEach((it) => (owned[it.id] = (owned[it.id] || 0) + (PW.STARTER_OWNED.includes(it.id) ? 0 : 1)));
    // starter furniture counts = what the default room uses
    const cnt = {}; PW.DEFAULT_ROOM().items.forEach((it) => (cnt[it.id] = (cnt[it.id] || 0) + 1));
    for (const id in cnt) owned[id] = Math.max(owned[id] || 0, cnt[id]);
    return {
      v: 1, uid: U.uid().replace(/[^a-z0-9]/g, '').slice(0, 12), name: '', created: Date.now(), onboarded: false,
      av: PW.defaultAvatar('m'), xp: 0, coins: PW.ECON.startCoins, owned, room: PW.DEFAULT_ROOM(),
      stats: { focusMin: 0, pomos: 0, streak: 0, lastDay: null, days: {}, weekXP: {}, msgs: 0, dayPomos: {}, goalPaid: {} },
      flags: {}, ach: {},
      settings: { preset: 'p25', custom: { focus: 40, brk: 8, long: 20 }, style: 'write', sound: true, speed: 1, npc: true, autoNext: false },
    };
  }
  App.load = () => { const s = U.store.get(SAVE_KEY, null); App.S = s && s.v === 1 ? Object.assign(freshSave(), s) : freshSave(); App.S.settings = Object.assign(freshSave().settings, App.S.settings || {}); App.S.stats = Object.assign(freshSave().stats, App.S.stats || {}); };
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
    const multi = d.cat === 'furn';
    if (!multi && App.isOwned(id)) return { ok: false, msg: 'Bu eşya zaten sende.' };
    if (App.S.coins < d.price) return { ok: false, msg: `${d.price - App.S.coins} jeton daha lazım.` };
    App.S.coins -= d.price; App.S.owned[id] = (App.S.owned[id] || 0) + 1;
    App.save(); App.checkAch(); PW.ui.refreshHUD();
    return { ok: true };
  };
  App.checkAch = () => {
    for (const a of PW.ACHIEVEMENTS) if (!App.S.ach[a.id] && a.test(App.S)) { App.S.ach[a.id] = Date.now(); App.S.coins += a.coin; PW.ui.toast('Başarım: ' + a.name, `+${a.coin} jeton · ${a.desc}`, 'ach'); }
    App.save();
  };

  /* ---------------- pomodoro ---------------- */
  App.preset = () => { const s = App.S.settings; if (s.preset === 'custom') return Object.assign({ id: 'custom', name: 'Özel' }, s.custom); return PW.TIMER_PRESETS.find((p) => p.id === s.preset) || PW.TIMER_PRESETS[0]; };
  App.startFocus = () => {
    const p = App.preset(); const T = App.timer;
    T.phase = 'focus'; T.total = T.left = p.focus * 60; T.running = true; T.last = Date.now(); T.startedAt = Date.now();
    App.ensureSeated(); App.myAct(); App.publish(); PW.ui.refreshTimer(); requestWake();
    PW.sfx('start');
  };
  App.startBreak = (long) => {
    const p = App.preset(); const T = App.timer;
    T.phase = 'break'; T.long = !!long; T.total = T.left = (long ? p.long : p.brk) * 60; T.running = true; T.last = Date.now();
    App.myAct(); App.publish(); PW.ui.refreshTimer();
  };
  App.pause = () => { const T = App.timer; if (T.phase === 'idle') return; T.running = !T.running; T.last = Date.now(); App.myAct(); App.publish(); PW.ui.refreshTimer(); };
  App.stop = () => { const T = App.timer; T.phase = 'idle'; T.running = false; T.left = 0; App.myAct(); App.publish(); PW.ui.refreshTimer(); releaseWake(); };
  App.skip = () => { const T = App.timer; if (T.phase === 'focus') { T.phase = 'idle'; App.startBreak(false); } else if (T.phase === 'break') { App.stop(); } };
  function awardMinute() {
    const groupN = App.realPeersFocusing();
    const mult = 1 + Math.min(PW.ECON.groupBonusMax, groupN * PW.ECON.groupBonusPer);
    App.S.stats.focusMin += 1;
    const d = U.todayKey(); App.S.stats.days[d] = (App.S.stats.days[d] || 0) + 1;
    App._minBuf = (App._minBuf || 0) + mult;
    const whole = Math.floor(App._minBuf); App._minBuf -= whole;
    if (whole) { App.S.xp += whole * PW.ECON.xpPerMin; App.S.coins += whole * PW.ECON.coinPerMin; const wk = U.weekKey(); App.S.stats.weekXP[wk] = (App.S.stats.weekXP[wk] || 0) + whole; }
    const lvBefore = App._lv || App.levelInfo().level; const lv = App.levelInfo().level; App._lv = lv;
    if (lv > lvBefore) { PW.ui.levelUp(lv); }
    App.save(); PW.ui.refreshHUD();
  }
  function completeFocus() {
    const T = App.timer, S = App.S, E = PW.ECON, p = App.preset();
    T.round += 1; S.stats.pomos += 1;
    const d = U.todayKey(); S.stats.dayPomos[d] = (S.stats.dayPomos[d] || 0) + 1;
    // streak
    if (S.stats.lastDay !== d) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      S.stats.streak = S.stats.lastDay === U.todayKey(y) ? S.stats.streak + 1 : 1;
      S.stats.lastDay = d;
    }
    let xp = E.pomoXP, coins = E.pomoCoin, label = 'Pomodoro tamamlandı';
    const firstToday = S.stats.dayPomos[d] === 1;
    if (firstToday) { const b = Math.min(30, S.stats.streak * 2); coins += b; label += ` · ${S.stats.streak}. gün serisi`; }
    if (T.round % 4 === 0) { xp += E.setBonusXP; coins += E.setBonusCoin; label = '4\'lü set tamamlandı'; }
    if (S.stats.dayPomos[d] === E.dailyGoal && !S.stats.goalPaid[d]) { S.stats.goalPaid[d] = 1; coins += E.dailyGoalCoin; label = 'Günlük hedef tamam'; }
    const h = new Date().getHours(); if (h >= 23) S.flags.night = 1; if (h < 7) S.flags.early = 1; if (p.focus >= 90) S.flags.deep = 1;
    App.gain(xp, coins, label);
    App.checkAch();
    PW.sfx('done');
    PW.world.emote(App.myId, 'cheer');
    App.chan && App.chan.sendEmote('cheer');
    App.startBreak(T.round % 4 === 0);
    PW.ui.flashTitle('Mola zamanı!');
  }
  App.tick = () => {
    const T = App.timer, now = Date.now();
    const dt = Math.min(5, (now - (T.last || now)) / 1000) * (App.S.settings.speed || 1); T.last = now;
    if (T.running && T.phase !== 'idle') {
      T.left -= dt;
      if (T.phase === 'focus') { App.focusAccum += dt; while (App.focusAccum >= 60) { App.focusAccum -= 60; awardMinute(); } }
      if (T.left <= 0) {
        if (T.phase === 'focus') completeFocus();
        else { PW.sfx('start'); if (App.S.settings.autoNext) App.startFocus(); else { App.stop(); PW.ui.toast('Mola bitti', 'Yeni bir tur için hazırsan Başlat\'a bas.'); } }
      }
      PW.ui.refreshTimer();
      if (Math.floor(T.left) % 5 === 0) App.publishTimer();
    }
    App.tickNPC(dt);
  };
  App.myAct = () => {
    const T = App.timer, w = PW.world;
    const sit = w.avatars.get(App.myId) && w.avatars.get(App.myId).seatIdx != null;
    let act = 'idle';
    if (T.phase === 'focus' && T.running) act = App.S.settings.style;
    else if (T.phase === 'break') act = Math.random() < 0.5 ? 'stretch' : 'drink';
    w.setAct(App.myId, sit ? act : (act === 'drink' ? 'drink' : 'idle'));
    w.updateAvatarInfo(App.myId, { status: App.status(), timer: U.fmtTime(T.left) });
  };
  App.status = () => (App.timer.phase === 'focus' ? (App.timer.running ? 'focus' : 'paused') : App.timer.phase === 'break' ? 'break' : '');
  let wakeLock = null;
  async function requestWake() { try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {} }
  function releaseWake() { try { wakeLock && wakeLock.release(); } catch (e) {} wakeLock = null; }

  /* ---------------- rooms ---------------- */
  App.homeDef = (S = App.S) => ({ theme: S.room.theme, view: S.room.view, size: S.room.size, items: S.room.items });
  App.compactRoom = () => ({ t: App.S.room.theme, v: App.S.room.view, s: App.S.room.size, i: App.S.room.items.slice(0, 70).map((it) => it.w ? [it.id, it.w, it.x] : [it.id, it.x, it.z, it.r || 0]) });
  App.expandRoom = (rd) => ({ theme: rd.t, view: rd.v, size: rd.s, items: (rd.i || []).filter((x) => PW.ITEM[x[0]]) });

  App.enterRoom = async (spec) => {
    // spec: {kind:'study'|'social'|'home'|'visit'|'group', id, name, def, owner}
    const w = PW.world;
    if (App.chan) { try { App.chan.leave(); } catch (e) {} App.chan = null; }
    App.peers.clear();
    App.npcs.forEach((n) => w.removeAvatar(n.id)); App.npcs = [];
    w.clearAvatars(); w.unfollow(); w.setEdit(false); PW.ui.setEditing(false);
    App.room = spec;
    w.loadRoom(spec.def);
    w.addAvatar(App.myId, App.S.av, { name: App.S.name || 'Sen', level: App.levelInfo().level, isMe: true });
    const studyish = spec.kind === 'study' || spec.kind === 'home' || spec.kind === 'group' || spec.kind === 'visit';
    if (studyish) App.ensureSeated(true); else { const sp = w.spawnPoint(); w.avatars.get(App.myId).av.root.position.set(sp.x, 0, sp.z); }
    App.myAct();
    PW.ui.onRoomChange(spec);
    // NPCs
    if (App.S.settings.npc && spec.npc) App.spawnNPCs(spec.npc, spec.kind);
    // network
    if (App.net) {
      const key = spec.kind === 'home' ? 'h-' + App.S.uid : spec.kind === 'visit' ? 'h-' + spec.owner : spec.kind === 'group' ? 'g-' + spec.id : 'r-' + spec.id;
      try {
        const ch = await App.net.join(key);
        if (App.room !== spec) { ch.leave(); return; }
        App.chan = ch;
        ch.onPeers((list) => App.onPeers(list));
        ch.onChat((m) => App.onRemoteChat(m));
        ch.onEmote((m) => { const p = App.peers.get(m.peer); if (p && ['wave', 'dance', 'clap', 'cheer'].includes(m.e)) w.emote(p.avId, m.e); });
      } catch (e) { console.warn('join failed', e); }
    }
    App.publish();
    App.publishLobby();
  };
  App.enterPublic = (id) => { const r = PW.PUBLIC_ROOMS.find((x) => x.id === id); if (!r) return; App.enterRoom({ kind: r.kind, id: r.id, name: r.name, def: { theme: r.theme, view: r.view, size: r.size, items: r.items }, npc: r.npc }); };
  App.enterHome = () => App.enterRoom({ kind: 'home', id: 'home', name: (App.S.name || 'Benim') + ' odası', def: App.homeDef(), npc: 0 });
  App.enterGroup = (code) => { const tpl = PW.PUBLIC_ROOMS[0]; code = PW.safeRoomName(code).slice(0, 12); App.enterRoom({ kind: 'group', id: code, name: 'Özel Grup · ' + code.toUpperCase(), def: { theme: 'th_library', view: 'v_city_night', size: tpl.size, items: tpl.items }, npc: 0, code }); };
  App.visit = (peer) => { const pr = peer.presence || {}; if (!pr.rd || !pr.u) return; App.enterRoom({ kind: 'visit', id: 'v-' + pr.u, owner: pr.u, name: (pr.n || 'Bir oyuncu') + ' odası', def: App.expandRoom(pr.rd), npc: 0 }); };
  App.rebuildHome = () => { if (App.room && App.room.kind === 'home') { App.room.def = App.homeDef(); PW.world.loadRoom(App.room.def); App.ensureSeated(true); App.myAct(); App.publish(); App.publishLobby(); } };

  App.ensureSeated = (force) => {
    const w = PW.world, me = w.avatars.get(App.myId); if (!me) return;
    if (!force && me.seatIdx != null) return;
    if (App.room && App.room.kind === 'social' && !force) return;
    const idx = w.freeSeat(true);
    if (idx != null) w.sitAvatar(App.myId, idx);
  };

  /* ---------------- presence ---------------- */
  App.presence = () => {
    const w = PW.world, me = w.avatars.get(App.myId), T = App.timer;
    const pos = me ? me.av.root.position : { x: 0, z: 0 };
    const p = { u: App.S.uid, n: (App.S.name || 'Misafir').slice(0, 20), lv: App.levelInfo().level, av: App.S.av, st: App.status(), tl: T.phase !== 'idle' ? Math.round(T.left) : null, seat: me ? me.seatIdx : null, x: +pos.x.toFixed(2), z: +pos.z.toFixed(2), act: me ? me.av.act : 'idle' };
    if (App.room && App.room.kind === 'home') p.rd = App.compactRoom();
    return p;
  };
  let pubT = 0;
  App.publish = () => { clearTimeout(pubT); pubT = setTimeout(() => { if (App.chan) App.chan.setPresence(App.presence()); }, 60); };
  App.publishTimer = () => { if (App.chan) App.chan.setPresence({ st: App.status(), tl: App.timer.phase !== 'idle' ? Math.round(App.timer.left) : null }); };
  App.publishLobby = () => {
    if (!App.lobby) return;
    const r = App.room || {};
    App.lobby.setPresence({ u: App.S.uid, n: (App.S.name || 'Misafir').slice(0, 20), lv: App.levelInfo().level, wx: App.weekXP(), at: r.kind === 'home' ? 'h-' + App.S.uid : r.kind === 'visit' ? 'h-' + r.owner : r.kind === 'group' ? 'g-' + r.id : 'r-' + (r.id || ''), atn: (r.name || '').slice(0, 40), rd: App.compactRoom(), st: App.status() });
  };
  App.realPeersFocusing = () => { let n = 0; for (const p of App.peers.values()) if (p.presence && p.presence.st === 'focus') n++; return n; };
  App.onPeers = (list) => {
    const w = PW.world, seen = new Set();
    let myPeer = null;
    for (const p of list) {
      if (p.isMe) { myPeer = p.peer; continue; }
      const pr = p.presence || {}; if (!pr.av) continue;
      if (pr.u && pr.u === App.S.uid) continue; // my other tab
      seen.add(p.peer);
      const avId = 'p-' + p.peer;
      const existed = App.peers.get(p.peer);
      App.peers.set(p.peer, { peer: p.peer, presence: pr, avId });
      const info = { name: pr.n || 'Misafir', level: pr.lv || 1, cfg: sanitizeAv(pr.av), status: pr.st || '', timer: pr.tl != null ? U.fmtTime(pr.tl) : '' };
      if (!w.avatars.has(avId)) { w.addAvatar(avId, info.cfg, Object.assign(info, { pos: { x: pr.x || 0, z: pr.z || 0 } })); App.trimNPCs(); }
      else w.updateAvatarInfo(avId, info);
      const a = w.avatars.get(avId);
      // seat / position
      const kind = App.room && App.room.kind;
      if (pr.seat != null && w.seats[pr.seat]) {
        if (a.seatIdx !== pr.seat && !(a.altSeat && a.seatIdx != null && w.seats[pr.seat].taken === App.myId)) {
          const s = w.seats[pr.seat];
          if (s.taken === App.myId && myPeer && p.peer < myPeer) { w.standAvatar(App.myId); w.sitAvatar(avId, pr.seat); App.ensureSeated(true); App.publish(); }
          else if (s.taken && s.taken.startsWith('npc-')) { const n = App.npcs.find((x) => x.id === s.taken); w.standAvatar(s.taken); w.sitAvatar(avId, pr.seat); if (n) App.reseatNPC(n); }
          else if (!s.taken) w.sitAvatar(avId, pr.seat);
          else if (a.seatIdx == null) { const alt = w.freeSeat(true); if (alt != null) w.sitAvatar(avId, alt); }
        }
      } else if (pr.seat == null && a.seatIdx != null) { w.standAvatar(avId); }
      if (pr.seat == null && pr.x != null) { const rp = a.av.root.position; if (Math.hypot(rp.x - pr.x, rp.z - pr.z) > 0.15) w.walkTo(avId, pr.x, pr.z); }
      if (pr.act && a.seatIdx != null) a.av.act = pr.act;
      else if (pr.act && !a.target) a.av.act = ['drink', 'idle'].includes(pr.act) ? pr.act : 'idle';
      // visiting: owner's room design updates live
      if (App.room && App.room.kind === 'visit' && pr.u === App.room.owner && pr.rd) {
        const key = JSON.stringify(pr.rd);
        if (key !== App._visitKey) { App._visitKey = key; App.room.def = App.expandRoom(pr.rd); w.loadRoom(App.room.def); App.ensureSeated(true); }
      }
    }
    for (const [peer, v] of [...App.peers]) if (!seen.has(peer)) { w.removeAvatar(v.avId); App.peers.delete(peer); }
    PW.ui.refreshPeople();
  };
  function sanitizeAv(av) {
    const o = Object.assign({}, PW.defaultAvatar(av && av.g === 'f' ? 'f' : 'm'));
    if (!av || typeof av !== 'object') return o;
    for (const k of ['hs', 'top', 'bot', 'sh', 'fh']) if (typeof av[k] === 'string' && PW.ITEM[av[k]]) o[k] = av[k];
    for (const k of ['sk', 'hc', 'ec', 'tc', 'bc', 'shc']) if (Number.isInteger(av[k]) && av[k] >= 0 && av[k] < 16) o[k] = av[k];
    if (Array.isArray(av.acc)) o.acc = av.acc.filter((x) => typeof x === 'string' && PW.ITEM[x]).slice(0, 6);
    return o;
  }
  App.sanitizeAv = sanitizeAv;

  /* ---------------- chat ---------------- */
  App.sendChat = (text) => {
    text = String(text || '').trim().slice(0, 200); if (!text) return;
    PW.world.bubble(App.myId, text);
    PW.ui.addChat({ name: App.S.name || 'Sen', text, me: true, lv: App.levelInfo().level });
    App.S.stats.msgs = (App.S.stats.msgs || 0) + 1; App.checkAch();
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

  /* ---------------- NPC study buddies ---------------- */
  App.spawnNPCs = (n, kind) => {
    const w = PW.world, seed = U.hashStr((App.room && App.room.id) || 'x');
    const r = U.seeded(seed);
    const names = [...PW.NPC_NAMES].sort(() => r() - 0.5);
    for (let i = 0; i < n; i++) {
      const id = 'npc-' + i;
      const cfg = PW.randomAvatar(r);
      const npc = { id, name: names[i % names.length], cfg, topic: PW.NPC_TOPICS[Math.floor(r() * PW.NPC_TOPICS.length)], level: 2 + Math.floor(r() * 14), style: ['write', 'type', 'read'][Math.floor(r() * 3)], phase: r() < 0.75 ? 'focus' : 'break', left: 60 + r() * 1300, kind, chatIn: 20 + r() * 60, wanderIn: 3 + r() * 10 };
      w.addAvatar(id, cfg, { name: npc.name, level: npc.level, npc: true });
      App.npcs.push(npc);
      if (kind === 'social') { if (r() < 0.45) { const s = w.freeSeat(false); if (s != null) w.sitAvatar(id, s); } else { const h = w.half - 1; w.avatars.get(id).av.root.position.set(U.rand(-h, h), 0, U.rand(-h, h)); } }
      else App.reseatNPC(npc);
      App.npcAct(npc);
    }
  };
  App.reseatNPC = (npc) => { const w = PW.world; const s = w.freeSeat(App.room && App.room.kind !== 'social'); if (s != null) w.sitAvatar(npc.id, s); else { w.removeAvatar(npc.id); App.npcs = App.npcs.filter((x) => x !== npc); } };
  App.trimNPCs = () => { const want = Math.max(0, ((App.room && App.room.npc) || 0) - App.peers.size); while (App.npcs.length > want) { const n = App.npcs.pop(); PW.world.removeAvatar(n.id); } };
  App.npcAct = (n) => {
    const w = PW.world, a = w.avatars.get(n.id); if (!a) return;
    if (n.kind === 'social') { w.updateAvatarInfo(n.id, { status: '' }); return; }
    const sit = a.seatIdx != null;
    w.setAct(n.id, n.phase === 'focus' ? (sit ? n.style : 'idle') : (Math.random() < 0.5 ? 'stretch' : 'drink'));
    w.updateAvatarInfo(n.id, { status: n.phase, timer: U.fmtTime(n.left) });
  };
  App.tickNPC = (dt) => {
    const w = PW.world;
    for (const n of App.npcs) {
      if (n.kind === 'social') {
        n.wanderIn -= dt; n.chatIn -= dt;
        const a = w.avatars.get(n.id); if (!a) continue;
        if (n.wanderIn <= 0) {
          n.wanderIn = 6 + Math.random() * 14;
          const roll = Math.random();
          if (roll < 0.35) { const h = w.half - 0.9; w.walkTo(n.id, U.rand(-h, h), U.rand(-h, h)); }
          else if (roll < 0.55) { const s = w.freeSeat(false); if (s != null) { const st = w.seats[s]; w.walkTo(n.id, st.x + Math.sin(st.ry) * 0.5, st.z + Math.cos(st.ry) * 0.5); a.onArrive = () => w.sitAvatar(n.id, s); } }
          else if (roll < 0.75) w.emote(n.id, ['wave', 'dance', 'clap'][Math.floor(Math.random() * 3)]);
        }
        if (n.chatIn <= 0) { n.chatIn = 25 + Math.random() * 50; const line = U.pick(PW.NPC_LINES_SOCIAL); w.bubble(n.id, line); PW.ui.addChat({ name: n.name, text: line, npc: true, lv: n.level }); }
        continue;
      }
      n.left -= dt;
      if (n.left <= 0) { n.phase = n.phase === 'focus' ? 'break' : 'focus'; n.left = n.phase === 'focus' ? 25 * 60 : 5 * 60; App.npcAct(n); if (n.phase === 'break') { w.emote(n.id, 'cheer'); n.chatIn = 4 + Math.random() * 30; } }
      if (n.phase === 'break') { n.chatIn -= dt; if (n.chatIn <= 0) { n.chatIn = 999; const line = U.pick(PW.NPC_LINES_BREAK); w.bubble(n.id, line); PW.ui.addChat({ name: n.name, text: line, npc: true, lv: n.level }); } }
      if (Math.random() < dt * 0.2) w.updateAvatarInfo(n.id, { status: n.phase, timer: U.fmtTime(n.left) });
    }
  };
  App.npcReact = (text) => {
    if (!App.npcs.length) return;
    const t = text.toLocaleLowerCase('tr');
    let reply = null;
    if (/(selam|merhaba|hey|sa\b|naber)/.test(t)) reply = U.pick(['Selam! Hoş geldin.', 'Merhaba, birlikte çalışalım.', 'Hey! Hangi konuya çalışıyorsun?']);
    else if (/(kaç|pomodoro|tur)/.test(t)) reply = U.pick(['Ben bugün 3 tur yaptım.', 'Bir tur daha yapalım mı?', 'Hedefim 6 pomodoro.']);
    else if (/(yorgun|sıkıl|zor)/.test(t)) reply = U.pick(['Mola ver, su iç. Sonra devam.', 'Bir tur daha, sonra kahve!', 'Az kaldı, pes yok.']);
    if (!reply) return;
    const n = App.npcs.find((x) => x.phase !== 'focus' || x.kind === 'social') || App.npcs[0];
    setTimeout(() => { if (!PW.world.avatars.has(n.id)) return; PW.world.bubble(n.id, reply); PW.ui.addChat({ name: n.name, text: reply, npc: true, lv: n.level }); }, 1400 + Math.random() * 1500);
  };

  /* ---------------- sound ---------------- */
  let actx = null;
  PW.sfx = (kind) => {
    if (!App.S || !App.S.settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = kind === 'done' ? [660, 880, 1046] : kind === 'buy' ? [880, 1320] : [523, 659];
      notes.forEach((f, i) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, actx.currentTime + i * 0.12); g.gain.linearRampToValueAtTime(0.18, actx.currentTime + i * 0.12 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + i * 0.12 + 0.35); o.connect(g).connect(actx.destination); o.start(actx.currentTime + i * 0.12); o.stop(actx.currentTime + i * 0.12 + 0.4); });
    } catch (e) {}
  };

  /* ---------------- boot ---------------- */
  App.boot = async () => {
    App.load();
    App._lv = App.levelInfo().level;
    PW.world = new PW.World($('#stage'), $('#tags'));
    PW.world.onClick = (ev) => PW.ui.onWorldClick(ev);
    PW.world.onPlace = (pos) => PW.ui.onPlace(pos);
    PW.ui.init();
    App.enterPublic('kutuphane');
    if (!App.S.onboarded) PW.ui.openOnboarding();
    setInterval(App.tick, 250);
    setInterval(() => { App.publishLobby(); }, 15000);
    document.addEventListener('visibilitychange', () => { App.timer.last = App.timer.last || Date.now(); });
    window.addEventListener('beforeunload', () => App.saveNow());
    // network (non-blocking)
    try {
      App.net = await PW.createNet();
      PW.ui.setNetMode(App.net);
      App.lobby = App.net.lobby();
      App.lobby.onPeers((list) => { App.lobbyPeers = list.filter((p) => !p.isMe && p.presence && p.presence.u && p.presence.u !== App.S.uid); PW.ui.refreshCommunity(); });
      // join current room now that the net exists
      if (App.room) { const r = App.room; App.room = null; await App.enterRoom(r); }
      App.publishLobby();
    } catch (e) { console.warn(e); PW.ui.setNetMode({ mode: 'off', label: 'Çevrimdışı' }); }
  };
})();
