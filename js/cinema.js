/* Pomodoro World — first-run cinematic.
   A short, skippable "trailer" played inside the real 3D engine with the player's own character:
   1) a friend invites you → you walk into their room, sit at the table, start a shared session
   2) on a break you go to a social space in the World and say hi in chat
   3) back home, focus minutes turn into coins and a new piece of furniture */
(function () {
  const PW = window.PW, U = PW.util, A = () => PW.app;
  const $ = (s, r = document) => r.querySelector(s);

  const FRIEND_ROOM = {
    theme: 'th_wood', view: 'v_bosphorus', size: 7, mood: 'golden', wall: '#DDE8D2', wallPat: 'floral', floorT: 'herring', floorC: '#C49A6C', trim: '#F6F4EF', curtain: '#2F7D5B',
    items: [
      { id: 'f_rug_round', x: 0, z: -0.6, r: 0 }, { id: 'f_table_round', x: 0, z: -0.6, r: 0 },
      { id: 'f_chair_wood', x: 0, z: -1.45, r: 0 }, { id: 'f_chair_wood', x: 0, z: 0.25, r: 2 },
      { id: 'd_laptop', x: 0.05, z: -0.85, r: 2 }, { id: 'd_laptop', x: -0.05, z: -0.35, r: 0 }, { id: 'd_mug', x: 0.3, z: -0.6, r: 0 },
      { id: 'f_bookshelf', x: -3.25, z: -0.8, r: 1 }, { id: 'f_monstera', x: -2.9, z: -2.9, r: 0 }, { id: 'f_lamp_floor', x: 2.9, z: -2.9, r: 0 },
      { id: 'f_bed_single', x: 2.85, z: 1.6, r: 2, c: '#2F7D5B' }, { id: 'f_teddy', x: -2.9, z: 2.9, r: 0 },
      { id: 'w_frames', w: 'w1', x: -1.4 }, { id: 'w_clock', w: 'w0', x: -2.5 },
    ].filter((it) => PW.ITEM[it.id]),
  };
  const FRIEND = () => Object.assign(PW.defaultAvatar('f'), { hs: 'h_bob', hc: 6, top: 't_sweater', tc: 7, bot: 'b_jeans', bc: 9, ey: 'almond', mo: 'smile', ps: 'calm' });

  let run = null; // the active playback (cancellable)
  let firstRun = false;
  const sleep = (ms) => new Promise((res, rej) => { const t = setTimeout(res, ms / (PW.cinemaSpeed || 1)); run && run.timers.push([t, rej]); });
  const alive = () => { if (!run || run.stopped) throw new Error('skip'); };

  /* ---------- overlay ---------- */
  function overlay() {
    let el = $('#cinema');
    if (!el) {
      el = document.createElement('div'); el.id = 'cinema'; el.setAttribute('aria-live', 'polite');
      el.innerHTML = `<div class="cn-bar cn-t"></div><div class="cn-bar cn-b"></div><div class="cn-shade"></div>
        <div class="cn-prog"><i></i><i></i><i></i></div>
        <button class="cn-skip" type="button">Geç ›</button>
        <div class="cn-stage"></div>
        <div class="cn-cap"><small></small><b></b></div>`;
      document.body.appendChild(el);
    }
    return el;
  }
  const cap = (chapter, text) => { const c = $('#cinema .cn-cap'); c.classList.remove('in'); void c.offsetWidth; $('small', c).textContent = chapter; $('b', c).textContent = text; c.classList.add('in'); };
  const chapter = (i) => { [...document.querySelectorAll('#cinema .cn-prog i')].forEach((b, k) => { b.className = k < i ? 'done' : k === i ? 'on' : ''; }); };
  const stage = (html) => { const s = $('#cinema .cn-stage'); s.innerHTML = html || ''; return s; };
  const fade = async (on) => { const el = overlay(); el.classList.toggle('black', on); await sleep(450); };
  // a fake finger tap on a fake UI element, so the viewer learns where things are
  const tap = async (sel) => { const t = $(sel); if (!t) return; t.classList.add('pressed'); await sleep(350); t.classList.remove('pressed'); };
  const typeInto = async (el, text, speed = 55) => { el.textContent = ''; for (const ch of text) { el.textContent += ch; await sleep(speed); } };

  /* ---------- camera helpers ---------- */
  let camFollow = null, camOrbit = 0, lastT = 0;
  function camTick() {
    if (!run || run.stopped) return;
    const w = PW.world;
    const now = performance.now(), dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0; lastT = now;
    if (camOrbit) { w.cam.tTheta = null; w.cam.theta += dt * camOrbit; }
    if (camFollow) { const a = w.avatars.get(camFollow.id); if (a) { const p = a.av.root.position; w.cam.tTarget.set(p.x + (camFollow.dx || 0), camFollow.y || 0.9, p.z + (camFollow.dz || 0)); } }
    requestAnimationFrame(camTick);
  }
  const shot = (o) => { const c = PW.world.cam; if (o.target) c.tTarget.set(...o.target); if (o.r != null) c.tRadius = o.r; if (o.theta != null) c.tTheta = o.theta; if (o.phi != null) c.tPhi = o.phi; if (o.snap) { c.radius = c.tRadius; if (o.theta != null) c.theta = o.theta; if (o.phi != null) c.phi = o.phi; c.target.copy(c.tTarget); } };
  const walk = (id, x, z) => new Promise((res, rej) => { const w = PW.world, a = w.avatars.get(id); if (!a) return res(); w.walkTo(id, x, z); a.onArrive = res; const t = setTimeout(res, 6000); run && run.timers.push([t, rej]); });
  const seatNear = (x, z) => { const w = PW.world; let best = null, bd = 1e9; w.seats.forEach((s, i) => { const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; best = i; } }); return best; };
  async function sitAt(id, x, z) { const w = PW.world, i = seatNear(x, z); const s = w.seats[i]; await walk(id, s.x + Math.sin(s.ry) * 0.6, s.z + Math.cos(s.ry) * 0.6); w.sitAvatar(id, i); }

  /* ---------- the film ---------- */
  async function film() {
    const w = PW.world, S = A().S, me = 'c-me', myName = S.name || 'Sen';
    camOrbit = 0;
    // ---- 1. friend's room ----
    chapter(0);
    w.clearAvatars(); w.loadRoom(FRIEND_ROOM);
    w.addAvatar('c-elif', FRIEND(), { name: 'Elif', level: 7 });
    const ia = seatNear(0, -1.45); w.sitAvatar('c-elif', ia); w.setAct('c-elif', 'type');
    shot({ target: [0, 0.6, 0], r: 13, theta: 0.9, phi: 0.85, snap: true }); shot({ r: 9.5, theta: 0.62, phi: 0.95 });
    await fade(false); alive();
    cap('1 · Arkadaşınla çalış', 'Elif seni odasına çağırıyor');
    stage(`<div class="cn-toast" id="cn-inv"><span class="cn-av">E</span><div><b>Elif</b><span>seni odasına davet etti</span></div><button type="button">Katıl</button></div>`);
    await sleep(1600); alive(); await tap('#cn-inv button'); stage('');
    w.addAvatar(me, S.av, { name: myName, level: A().levelInfo().level, isMe: true });
    w.avatars.get(me).av.root.position.set(2.4, 0, 2.9);
    camFollow = { id: me, dz: -0.6 }; shot({ r: 6.5, theta: 0.35, phi: 1.0 });
    cap('1 · Arkadaşınla çalış', 'Odasına gir, masaya otur');
    await sitAt(me, 0, 0.25); alive();
    camFollow = null; shot({ target: [0, 0.9, -0.6], r: 4.4, theta: 1.25, phi: 1.12 });
    w.emote('c-elif', 'wave'); w.bubble('c-elif', 'Hoş geldin! Birlikte başlayalım mı?');
    await sleep(1800); alive();
    stage(`<button class="cn-btn" id="cn-group" type="button">Birlikte başlat</button>`);
    await sleep(700); await tap('#cn-group'); alive();
    stage(`<div class="cn-timer"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="t"/><circle cx="50" cy="50" r="44" class="b" pathLength="100"/></svg><b>25:00</b><span>Elif ile birlikte</span></div>`);
    w.setAct(me, S.settings.style || 'type'); w.setAct('c-elif', 'write');
    cap('1 · Arkadaşınla çalış', 'Sayaçlarınız eşitlenir, aynı anda odaklanırsınız');
    shot({ theta: 2.1, r: 4.0 });
    const tEl = $('#cinema .cn-timer b'); const bar = $('#cinema .cn-timer .b');
    for (let s = 1500; s >= 1440; s -= 4) { tEl.textContent = U.fmtTime(s); bar.style.strokeDashoffset = String(100 - ((1500 - s) / 1500) * 100 * 12); await sleep(70); }
    await sleep(900); alive();
    // ---- 2. a social space in the World ----
    chapter(1); await fade(true); stage(''); alive();
    const R = PW.PUBLIC_ROOMS.find((r) => r.id === 'meydan');
    w.clearAvatars(); w.loadRoom({ theme: R.theme, view: R.view, size: R.size, items: R.items, mood: R.mood });
    const rnd = U.seeded(42), names = ['Deniz', 'Kerem', 'Zeynep', 'Mert'];
    names.forEach((n, i) => { const id = 'c-n' + i; w.addAvatar(id, PW.randomAvatar(rnd), { name: n, level: 3 + i * 4 }); if (i < 2) { const s = w.freeSeat(false); if (s != null) w.sitAvatar(id, s); } else w.avatars.get(id).av.root.position.set(i === 2 ? -1.2 : 1.4, 0, i === 2 ? 0.8 : -0.6); });
    w.avatars.get('c-n2').av.root.rotation.y = 1.2; w.avatars.get('c-n3').av.root.rotation.y = -2.2;
    w.addAvatar(me, S.av, { name: myName, level: A().levelInfo().level, isMe: true }); w.avatars.get(me).av.root.position.set(0.2, 0, 4.4);
    shot({ target: [0, 0.6, 0], r: 15, theta: 0.6, phi: 0.95, snap: true });
    cap('2 · Molada sosyalleş', 'Molada Dünya’dan bir sosyal alana uğra');
    stage(`<div class="cn-card" id="cn-world"><div class="cn-thumb"></div><div><b>Meydan Kafe</b><span>4 oyuncu · sohbet</span></div><button type="button">Git</button></div>`);
    await fade(false); await sleep(1300); alive(); await tap('#cn-world button'); stage('');
    camFollow = { id: me, dz: -0.8 }; shot({ r: 7, theta: 0.5, phi: 1.0 });
    await walk(me, 0.2, 1.4); alive();
    camFollow = null; shot({ target: [0.1, 1.0, 0.8], r: 5.2, theta: 0.45, phi: 1.05 });
    cap('2 · Molada sosyalleş', 'Yaz; mesajın karakterinin üstünde balon olur');
    stage(`<div class="cn-chat"><span class="cn-in"></span><button type="button" id="cn-send">Gönder</button></div>`);
    await sleep(500); await typeInto($('#cinema .cn-in'), 'Selam! Mola veren var mı?'); alive();
    await tap('#cn-send'); w.bubble(me, 'Selam! Mola veren var mı?'); stage('');
    await sleep(1300); alive(); w.emote('c-n2', 'wave'); w.bubble('c-n2', 'Selam! Gel, bize katıl.');
    await sleep(1400); alive(); w.emote('c-n3', 'dance'); w.bubble('c-n3', 'Ben de molada, 2. turdayım!');
    w.emote(me, 'clap');
    await sleep(2200); alive();
    // ---- 3. focus → coins → your room grows ----
    chapter(2); await fade(true); stage(''); alive();
    await timelapse(me, myName);
  }

  /* ---------- chapter 3: a time-lapse of your own room growing ---------- */
  const TL_BASE = {
    theme: 'th_wood', view: 'v_city_day', size: 7, mood: 'day', wall: '#ECE6DA', wallPat: 'plain', floorT: 'plank', floorC: '#B9926A', trim: '#F6F4EF', curtain: '#C9C2B4',
    items: [{ id: 'f_desk_wood', x: 0.2, z: -1.15, r: 0 }, { id: 'f_chair_wood', x: 0.2, z: -1.9, r: 0 }, { id: 'd_laptop', x: 0.4, z: -1.25, r: 2 }, { id: 'f_bed_single', x: 2.85, z: 1.6, r: 2, c: '#9AA3B5' }],
  };
  const TL_STEPS = [
    { n: 'Yuvarlak halı', cost: 60, add: { id: 'f_rug_round', x: 0.2, z: -1.3, r: 0 } },
    { n: 'Masa lambası', cost: 40, add: { id: 'd_lamp', x: -0.3, z: -0.95, r: 2 } },
    { n: 'Kitaplık', cost: 120, add: { id: 'f_bookshelf', x: -3.25, z: -0.8, r: 1 } },
    { n: 'Deve tabanı', cost: 90, add: { id: 'f_monstera', x: -2.9, z: -2.9, r: 0 } },
    { n: 'Çiçekli duvar kâğıdı', cost: 150, set: { wallPat: 'floral', wall: '#DDE8D2', curtain: '#2F7D5B' } },
    { n: 'Lambader', cost: 80, add: { id: 'f_lamp_floor', x: 2.9, z: -2.9, r: 0 } },
    { n: 'Balıksırtı parke', cost: 180, set: { floorT: 'herring', floorC: '#C49A6C' } },
    { n: 'Puf', cost: 70, add: { id: 'f_beanbag', x: -1.5, z: 1.1, r: 1, c: '#E8803A' } },
    { n: 'Fotoğraf duvarı', cost: 60, add: { id: 'w_frames', w: 'w1', x: -1.4 } },
    { n: 'Boğaz manzarası', cost: 350, set: { view: 'v_bosphorus' } },
    { n: 'Peluş ayı', cost: 40, add: { id: 'f_teddy', x: -2.9, z: 2.9, r: 0 } },
    { n: 'Duvar saati', cost: 50, add: { id: 'w_clock', w: 'w0', x: -2.5 } },
  ].filter((st) => !st.add || PW.ITEM[st.add.id]);
  const DAY = ['day', 'golden', 'night'];
  function pop(g) { if (!g) return; g.scale.setScalar(0.01); const t0 = performance.now(); const f = () => { const k = Math.min(1, (performance.now() - t0) / 520); const e = 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2); g.scale.setScalar(Math.max(0.01, e)); if (k < 1) requestAnimationFrame(f); }; f(); }
  async function timelapse(me, myName) {
    const w = PW.world, S = A().S;
    const def = JSON.parse(JSON.stringify(TL_BASE)); def.items = def.items.filter((it) => PW.ITEM[it.id]);
    const load = (mood) => { def.mood = mood; w.loadRoom(def); const i = w.seats.findIndex((s) => s.desk); w.addAvatar(me, S.av, { name: myName, level: lv, isMe: true }); if (i >= 0) w.sitAvatar(me, i); w.setAct(me, mood === 'night' ? 'read' : 'type'); };
    let lv = 1, xp = 0, coins = 150, day = 1;
    w.clearAvatars(); load('day');
    shot({ target: [0, 0.5, 0], r: 11.5, theta: 0.2, phi: 0.92, snap: true }); camOrbit = 0.16;
    cap('3 · Odanı kur', 'Her odak dakikası XP ve jeton kazandırır');
    stage(`<div class="tl-hud"><div class="tl-clock"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17"/><path class="h" d="M20 20V9"/><path class="m" d="M20 20l7 4"/></svg><div><small>Hızlandırılmış</small><b id="tl-day">1. gün</b></div></div>
      <div class="tl-row"><span class="tl-lv" id="tl-lv">1</span><div class="tl-bar"><i id="tl-xp"></i></div></div>
      <div class="tl-coins"><span>Jeton</span><b id="tl-c">150</b></div></div><div class="tl-feed" id="tl-feed"></div>`);
    await fade(false); await sleep(900); alive();
    const $d = $('#tl-day'), $c = $('#tl-c'), $x = $('#tl-xp'), $l = $('#tl-lv'), feed = $('#tl-feed');
    const note = (html, cls) => { const n = document.createElement('div'); n.className = 'tl-note ' + (cls || ''); n.innerHTML = html; feed.prepend(n); while (feed.children.length > 3) feed.lastChild.remove(); };
    const count = async (to, ms) => { const from = coins, t0 = performance.now(); for (;;) { const k = Math.min(1, (performance.now() - t0) / ms); $c.textContent = Math.round(from + (to - from) * k).toLocaleString('tr-TR'); if (k >= 1) break; await sleep(30); } coins = to; };
    for (let i = 0; i < TL_STEPS.length; i++) {
      alive(); const st = TL_STEPS[i];
      if (i === 3) cap('3 · Odanı kur', 'Jetonları harca; odan her gün biraz daha senin olsun');
      // a few focused days pass: light cycles day → evening → night
      day += 2 + (i % 2); $d.textContent = day + '. gün';
      const earn = 4 * 25 + (i % 3) * 25; xp += earn; if (xp >= 60 * lv) { xp -= 60 * lv; lv++; $l.textContent = lv; $l.classList.remove('up'); void $l.offsetWidth; $l.classList.add('up'); note(`<b>Seviye ${lv}</b>`, 'lv'); }
      $x.style.width = Math.min(100, (xp / (60 * lv)) * 100) + '%';
      note(`+${earn} XP · <b>+${earn} jeton</b>`, 'earn'); await count(coins + earn, 380);
      // spend
      note(`−${st.cost} · ${st.n}`, 'spend'); await count(Math.max(0, coins - st.cost), 260);
      if (st.add) def.items.push(st.add); if (st.set) Object.assign(def, st.set);
      load(DAY[i % 3]);
      if (st.add) pop(w.itemGroups[w.itemGroups.length - 1]);
      await sleep(820); alive();
    }
    // final: the finished room in warm evening light
    load('golden'); camOrbit = 0.08; shot({ r: 9.5, phi: 0.98 });
    cap('', ''); stage(`<div class="cn-end"><small>Pomodoro World</small><b>Odaklan. Kazan.<br>Odanı kendin gibi yap.</b><button class="btn" id="cn-go" type="button">${firstRun ? 'Karakterimi oluştur' : 'Kapat'}</button></div>`);
    await new Promise((res) => { $('#cn-go').onclick = res; run.timers.push([0, res]); });
  }

  PW.cinema = {
    playing: () => !!run,
    async play(opts = {}) {
      if (run) return;
      firstRun = !!opts.first;
      const el = overlay(); el.classList.add('open', 'black'); document.body.classList.add('cinema');
      run = { stopped: false, timers: [] }; A().cinema = true; PW.world.hideTags = false;
      if (A().chan) { try { A().chan.leave(); } catch (e) {} A().chan = null; }
      A().peers.clear();
      $('.cn-skip', el).onclick = () => PW.cinema.stop();
      requestAnimationFrame(camTick);
      try { await film(); } catch (e) { if (e && e.message !== 'skip') console.warn('cinema', e); }
      // back to the real game
      const was = run; run = null; camFollow = null; camOrbit = 0; if (was) was.timers.forEach(([t]) => t && clearTimeout(t));
      el.classList.add('black'); await new Promise((r) => setTimeout(r, 300));
      A().cinema = false; document.body.classList.remove('cinema');
      await A().enterHome(); el.classList.remove('open', 'black'); stage('');
    },
    stop() { if (!run) return; run.stopped = true; run.timers.forEach(([t, rej]) => { clearTimeout(t); try { rej(new Error('skip')); } catch (e) {} }); },
  };
})();
