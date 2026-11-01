/* Pomodoro World — interface: HUD, timer dock, chat, modals, shop, wardrobe, room editor */
(function () {
  const PW = window.PW;
  const U = PW.util;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const A = () => PW.app;
  const esc = U.esc;
  const COIN = '<svg class="coin" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5"/><path d="M10 5.5v9M7.2 7.6c.6-1 1.6-1.4 2.8-1.4 1.6 0 2.6.8 2.6 1.9 0 2.6-5.4 1.5-5.4 4.1 0 1.1 1 1.9 2.7 1.9 1.3 0 2.3-.5 2.8-1.4" fill="none"/></svg>';
  const LOCK = '<svg viewBox="0 0 20 20" class="ico" aria-hidden="true"><rect x="4.5" y="9" width="11" height="8" rx="2"/><path d="M7 9V7a3 3 0 0 1 6 0v2" fill="none"/></svg>';

  const ui = (PW.ui = {});

  ui.init = () => {
    // nav
    $$('[data-open]').forEach((b) => b.addEventListener('click', () => ui.open(b.dataset.open)));
    $$('.modal').forEach((m) => { m.addEventListener('click', (e) => { if (e.target === m && !m.dataset.locked) ui.close(); }); });
    $$('.modal [data-close]').forEach((b) => b.addEventListener('click', () => ui.close()));
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea')) return;
      if (e.key === 'Escape') { if (PW.world.edit.ghost) PW.world.cancelGhost(); else ui.close(); }
      if ((e.key === 'r' || e.key === 'R') && PW.world.edit.on) ui.editRotate();
      if ((e.key === 'Delete' || e.key === 'Backspace') && PW.world.edit.on) ui.editRemove();
      if (e.key === ' ' && !$('.modal.open')) { e.preventDefault(); ui.timerMain(); }
    });
    // chat
    $('#chat-form').addEventListener('submit', (e) => { e.preventDefault(); const i = $('#chat-in'); A().sendChat(i.value); i.value = ''; });
    $('#chat-toggle').addEventListener('click', () => { const c = $('#chat').classList.toggle('collapsed'); $('#chat-toggle').textContent = c ? '+' : '–'; });
    $('#people-toggle').addEventListener('click', () => { const c = $('#people').classList.toggle('collapsed'); $('#people-toggle').textContent = c ? '+' : '–'; });
    // timer dock
    $('#t-main').addEventListener('click', ui.timerMain);
    $('#t-skip').addEventListener('click', () => A().skip());
    $('#t-stop').addEventListener('click', () => A().stop());
    $$('#presets [data-preset]').forEach((b) => b.addEventListener('click', () => { if (A().timer.phase !== 'idle') return ui.toast('Sayaç çalışıyor', 'Süreyi değiştirmek için önce turu bitir.'); A().S.settings.preset = b.dataset.preset; A().save(); ui.refreshTimer(); }));
    $$('#styles [data-style]').forEach((b) => b.addEventListener('click', () => { A().S.settings.style = b.dataset.style; A().save(); A().myAct(); A().publish(); ui.refreshTimer(); }));
    $$('#emotes [data-emote]').forEach((b) => b.addEventListener('click', () => A().emote(b.dataset.emote)));
    $('#btn-sit').addEventListener('click', () => { const w = PW.world, me = w.avatars.get('me'); if (me.seatIdx != null) { w.standAvatar('me'); } else { const s = w.freeSeat(A().room.kind !== 'social'); if (s != null) w.sitAvatar('me', s); } A().myAct(); A().publish(); ui.refreshTimer(); });
    $('#btn-edit').addEventListener('click', () => ui.setEditing(true));
    $('#btn-home').addEventListener('click', () => A().enterHome());
    $('#nav-home').addEventListener('click', () => { ui.close(); A().enterHome(); });
    $('#btn-cam').addEventListener('click', () => { const w = PW.world; if (w.followId) w.unfollow(); else w.focusOn('me'); });
    // edit bar
    $('#e-done').addEventListener('click', () => ui.setEditing(false));
    $('#e-rot').addEventListener('click', ui.editRotate);
    $('#e-move').addEventListener('click', ui.editMove);
    $('#e-del').addEventListener('click', ui.editRemove);
    $$('#e-tabs [data-etab]').forEach((b) => b.addEventListener('click', () => { ui.etab = b.dataset.etab; ui.renderEditBar(); }));
    ui.etab = 'furn';
    $('#t-more').addEventListener('click', () => $('#dock').classList.toggle('more'));
    if (window.innerWidth < 720) { $('#chat').classList.add('collapsed'); $('#people').classList.add('collapsed'); $('#chat-toggle').textContent = '+'; $('#people-toggle').textContent = '+'; }
    $('#chat-toggle').addEventListener('click', () => $('#chat-toggle').classList.remove('ping'));
    ui.refreshHUD(); ui.refreshTimer();
  };

  /* ---------------- HUD ---------------- */
  ui.refreshHUD = () => {
    const S = A().S; if (!S) return;
    const li = A().levelInfo();
    $('#hud-name').textContent = S.name || 'Misafir';
    $('#hud-title').textContent = PW.titleFor(li.level);
    $('#hud-lv').textContent = li.level;
    $('#hud-xpbar').style.width = Math.round((li.into / li.need) * 100) + '%';
    $('#hud-xp').textContent = `${li.into} / ${li.need} XP`;
    $('#hud-coins').innerHTML = COIN + '<b>' + S.coins.toLocaleString('tr-TR') + '</b>';
    const lg = PW.leagueFor(A().weekXP());
    const l = $('#hud-league'); l.textContent = lg.name; l.style.setProperty('--lg', lg.color);
    const w = PW.world; if (w && w.avatars.has('me')) w.updateAvatarInfo('me', { name: S.name || 'Sen', level: li.level });
    const d = S.stats.dayPomos[U.todayKey()] || 0; $('#hud-goal').textContent = `Bugün ${Math.min(d, PW.ECON.dailyGoal)}/${PW.ECON.dailyGoal}`;
    $('#hud-goal').classList.toggle('done', d >= PW.ECON.dailyGoal);
  };
  ui.timerMain = () => { const T = A().timer; if (T.phase === 'idle') A().startFocus(); else A().pause(); };
  ui.refreshTimer = () => {
    const T = A().timer, S = A().S; if (!S) return;
    const p = A().preset();
    const left = T.phase === 'idle' ? p.focus * 60 : T.left;
    $('#t-time').textContent = U.fmtTime(left);
    const frac = T.phase === 'idle' ? 0 : 1 - T.left / T.total;
    const ring = $('#t-ring'); const C = 2 * Math.PI * 52; ring.style.strokeDasharray = C; ring.style.strokeDashoffset = C * (1 - frac);
    const dock = $('#dock'); dock.dataset.phase = T.phase; dock.dataset.running = T.running ? '1' : '0';
    $('#t-phase').textContent = T.phase === 'focus' ? (T.running ? 'Odak' : 'Duraklatıldı') : T.phase === 'break' ? (T.long ? 'Uzun mola' : 'Mola') : 'Hazır';
    $('#t-main').textContent = T.phase === 'idle' ? 'Başlat' : T.running ? 'Duraklat' : 'Devam';
    $('#t-round').textContent = `Tur ${(T.round % 4) + (T.phase === 'focus' ? 1 : 0) || (T.phase === 'break' ? 4 : 1)} / 4`;
    $$('#presets [data-preset]').forEach((b) => b.classList.toggle('on', b.dataset.preset === S.settings.preset));
    $$('#styles [data-style]').forEach((b) => b.classList.toggle('on', b.dataset.style === S.settings.style));
    const me = PW.world && PW.world.avatars.get('me');
    $('#btn-sit').textContent = me && me.seatIdx != null ? 'Kalk' : 'Otur';
    if (me) PW.world.updateAvatarInfo('me', { status: A().status(), timer: U.fmtTime(T.left) });
    if (T.phase !== 'idle') document.title = `${U.fmtTime(T.left)} · ${T.phase === 'focus' ? 'Odak' : 'Mola'} — Pomodoro World`; else if (!ui._flash) document.title = 'Pomodoro World';
  };
  ui.flashTitle = (t) => { ui._flash = true; let n = 0; const iv = setInterval(() => { document.title = n % 2 ? 'Pomodoro World' : t; if (++n > 8) { clearInterval(iv); ui._flash = false; } }, 700); };
  ui.setNetMode = (net) => { const el = $('#net'); el.textContent = net.mode === 'claude' ? 'Canlı · claude.ai' : net.mode === 'p2p' ? 'Canlı · P2P' : net.mode === 'local' ? 'Yerel mod' : 'Çevrimdışı'; el.dataset.mode = net.mode; el.title = net.mode === 'local' ? 'Bağlantı kurulamadı: yalnızca bu tarayıcının sekmeleri birbirini görür.' : 'Gerçek zamanlı bağlantı açık.'; };

  ui.onRoomChange = (spec) => {
    $('#room-name').textContent = spec.name;
    const kindName = { study: 'Çalışma odası', social: 'Sosyal oda', home: 'Senin odan', visit: 'Ziyaret', group: 'Özel grup' }[spec.kind];
    $('#room-kind').textContent = kindName; $('#room-kind').dataset.kind = spec.kind;
    $('#room-code').hidden = spec.kind !== 'group'; if (spec.kind === 'group') $('#room-code').textContent = 'Kod: ' + spec.id.toUpperCase();
    $('#btn-edit').hidden = spec.kind !== 'home';
    $('#btn-home').hidden = spec.kind === 'home';
    const social = spec.kind === 'social';
    $('#dock').classList.toggle('social', social);
    $('#chat-hint').textContent = social ? 'Sosyal odadasın: yere tıklayıp yürü, koltuklara tıklayıp otur.' : 'Odak sırasında kısa yaz; uzun sohbetler molaya.';
    $('#chat-log').innerHTML = '';
    ui.addChat({ sys: true, text: `${spec.name} odasına girdin.` });
    ui.refreshPeople(); ui.refreshTimer();
  };
  ui.addChat = (m) => {
    const log = $('#chat-log');
    const d = document.createElement('div'); d.className = 'msg' + (m.me ? ' me' : '') + (m.sys ? ' sys' : '') + (m.npc ? ' npc' : '');
    d.innerHTML = m.sys ? esc(m.text) : `<span class="who"><i>${m.lv || 1}</i>${esc(m.name)}</span><span class="tx">${esc(m.text)}</span>`;
    log.appendChild(d); while (log.children.length > 80) log.firstChild.remove();
    log.scrollTop = log.scrollHeight;
    if ($('#chat').classList.contains('collapsed') && !m.sys) $('#chat-toggle').classList.add('ping');
  };
  ui.refreshPeople = () => {
    const w = PW.world, list = $('#people-list'); if (!w) return;
    const rows = [];
    for (const [id, a] of w.avatars) rows.push({ id, name: a.info.name, lv: a.info.level, st: a.info.status, me: id === 'me', npc: id.startsWith('npc-') });
    rows.sort((a, b) => (b.me - a.me) || (a.npc - b.npc) || (b.lv - a.lv));
    $('#people-count').textContent = rows.length;
    list.innerHTML = rows.map((r) => `<li class="${r.me ? 'me' : ''} ${r.npc ? 'npc' : ''}"><i class="lv">${r.lv}</i><span>${esc(r.name)}${r.me ? ' (sen)' : ''}${r.npc ? '<em>NPC</em>' : ''}</span><b class="st ${r.st}">${r.st === 'focus' ? 'odak' : r.st === 'break' ? 'mola' : r.st === 'paused' ? 'durdu' : ''}</b></li>`).join('');
  };

  ui.onWorldClick = (ev) => {
    const w = PW.world, room = A().room;
    if (ev.type === 'edit-select') { ui.renderEditBar(); return; }
    if (ev.type === 'avatar') { if (ev.id !== 'me') { const a = w.avatars.get(ev.id); if (a) ui.toast(a.info.name, `Seviye ${a.info.level} · ${PW.titleFor(a.info.level)}${ev.id.startsWith('npc-') ? ' · NPC çalışma arkadaşı' : ''}`); } else w.emote('me', 'wave'); return; }
    if (ev.type === 'seat') {
      const s = w.seats[ev.idx]; if (!s) return;
      if (s.taken && s.taken !== 'me') return ui.toast('Bu koltuk dolu', 'Boş bir koltuk seç.');
      if (room.kind === 'social') { const me = w.avatars.get('me'); if (me.seatIdx != null) w.standAvatar('me'); w.walkTo('me', s.x + Math.sin(s.ry) * 0.55, s.z + Math.cos(s.ry) * 0.55); me.onArrive = () => { w.sitAvatar('me', ev.idx); A().myAct(); A().publish(); ui.refreshTimer(); }; A().publish(); }
      else { w.sitAvatar('me', ev.idx); A().myAct(); A().publish(); ui.refreshTimer(); }
      return;
    }
    if (ev.type === 'floor') {
      if (room.kind !== 'social' && A().timer.phase === 'focus' && A().timer.running) return ui.toast('Odaktasın', 'Odak sırasında masadan kalkmak için önce duraklat.');
      w.walkTo('me', ev.x, ev.z); const me = w.avatars.get('me'); me.onArrive = () => { A().publish(); ui.refreshTimer(); }; A().publish(); ui.refreshTimer();
    }
  };

  /* ---------------- toasts & level up ---------------- */
  ui.toast = (title, body, kind = '') => {
    const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = `<b>${esc(title)}</b>${body ? `<span>${esc(body)}</span>` : ''}`;
    $('#toasts').appendChild(t); setTimeout(() => t.classList.add('out'), 3600); setTimeout(() => t.remove(), 4200);
  };
  ui.levelUp = (lv) => {
    const unlocked = PW.CATALOG.filter((i) => i.lvl === lv).slice(0, 8);
    const m = $('#m-level');
    m.querySelector('.lvnum').textContent = lv;
    m.querySelector('.lvtitle').textContent = PW.titleFor(lv);
    m.querySelector('.unlocks').innerHTML = unlocked.length ? unlocked.map((i) => `<li><img alt="" src="${PW.thumb(i.id, A().S.av)}"><span>${esc(i.name)}</span></li>`).join('') : '<li class="none">Mağazada yeni fiyatlar seni bekliyor.</li>';
    ui.open('level');
    const cf = m.querySelector('.confetti'); cf.innerHTML = '';
    for (let i = 0; i < 40; i++) { const s = document.createElement('i'); s.style.left = Math.random() * 100 + '%'; s.style.background = PW.util.pick(['#E8553D', '#F2C14E', '#6CBF6A', '#8FB8FF', '#E58BB0']); s.style.animationDelay = Math.random() * 0.6 + 's'; s.style.transform = `rotate(${Math.random() * 360}deg)`; cf.appendChild(s); }
    PW.world.emote('me', 'cheer'); PW.sfx('done');
  };

  /* ---------------- modals ---------------- */
  ui.open = (name) => {
    ui.close(true);
    const m = $('#m-' + name); if (!m) return;
    m.classList.add('open'); ui.cur = name;
    if (name === 'world') ui.renderWorld();
    if (name === 'char') ui.renderChar();
    if (name === 'shop') ui.renderShop();
    if (name === 'profile') ui.renderProfile();
  };
  ui.close = (silent) => { $$('.modal.open').forEach((m) => { if (!m.dataset.locked || silent === 'force') m.classList.remove('open'); }); ui.cur = null; };

  /* ---------------- onboarding ---------------- */
  ui.openOnboarding = () => {
    const m = $('#m-onboard'); m.dataset.locked = '1'; m.classList.add('open');
    const S = A().S; let g = S.av.g || 'm';
    const pv = ui.obPreview || (ui.obPreview = new PW.Preview($('#ob-preview')));
    const draw = () => { pv.setAvatar(S.av); $$('#ob-g button').forEach((b) => b.classList.toggle('on', b.dataset.g === S.av.g)); $('#ob-skin').innerHTML = PW.SKIN.map((c, i) => `<button type="button" style="--c:${c}" class="sw ${S.av.sk === i ? 'on' : ''}" data-i="${i}" aria-label="Ten ${i + 1}"></button>`).join(''); $('#ob-hairc').innerHTML = PW.HAIRC.slice(0, 8).map((c, i) => `<button type="button" style="--c:${c}" class="sw ${S.av.hc === i ? 'on' : ''}" data-i="${i}" aria-label="Saç rengi ${i + 1}"></button>`).join(''); };
    draw(); setTimeout(() => pv.wave(), 500);
    $$('#ob-g button').forEach((b) => (b.onclick = () => { const keep = { sk: S.av.sk, hc: S.av.hc }; S.av = Object.assign(PW.defaultAvatar(b.dataset.g), keep); draw(); pv.wave(); }));
    $('#ob-skin').onclick = (e) => { const b = e.target.closest('[data-i]'); if (b) { S.av.sk = +b.dataset.i; draw(); } };
    $('#ob-hairc').onclick = (e) => { const b = e.target.closest('[data-i]'); if (b) { S.av.hc = +b.dataset.i; draw(); } };
    $('#ob-name').value = S.name || '';
    $('#ob-form').onsubmit = (e) => {
      e.preventDefault(); const n = $('#ob-name').value.trim().slice(0, 20);
      if (n.length < 2) { $('#ob-err').hidden = false; return; }
      S.name = n; S.onboarded = true; A().saveNow();
      delete m.dataset.locked; m.classList.remove('open');
      PW.world.updateAvatarInfo('me', { name: n, cfg: S.av }); ui.refreshHUD(); A().publish(); A().publishLobby();
      ui.toast('Hoş geldin ' + n, 'Masaya oturdun. Başlat\'a bas, ilk domatesini topla.');
      PW.world.emote('me', 'wave');
    };
  };

  /* ---------------- world map ---------------- */
  ui.renderWorld = () => {
    const box = $('#world-body'); const L = A().levelInfo().level;
    const card = (r) => {
      const v = PW.ITEM[r.view], th = PW.ITEM[r.theme];
      return `<button class="room-card" data-room="${r.id}"><span class="rc-img" style="background-image:url(${PW.thumb(r.view)})"></span><span class="rc-t"><b>${esc(r.name)}</b><small>${esc(r.desc)}</small><em>${esc(th.name)} · ${esc(v.name)}${r.npc ? ` · ${r.npc} NPC` : ''}</em></span></button>`;
    };
    const study = PW.PUBLIC_ROOMS.filter((r) => r.kind === 'study'), social = PW.PUBLIC_ROOMS.filter((r) => r.kind === 'social');
    const comm = A().lobbyPeers;
    box.innerHTML = `
      <section><h3>Çalışma odaları <small>Masaya otur, sayacı başlat, birlikte odaklan.</small></h3><div class="room-grid">${study.map(card).join('')}</div></section>
      <section><h3>Sosyal odalar <small>Molada gez, sohbet et, dans et.</small></h3><div class="room-grid">${social.map(card).join('')}</div></section>
      <section class="split">
        <div><h3>Özel çalışma grubu <small>Arkadaşlarınla aynı kodu gir, aynı masada buluşun.</small></h3>
          <form id="group-form" class="row"><input id="group-code" maxlength="12" placeholder="ör. yks-ekip" autocomplete="off" aria-label="Grup kodu"><button class="btn">Katıl</button><button type="button" class="btn ghost" id="group-new">Yeni kod</button></form></div>
        <div><h3>Kendi odan <small>Kazandığın eşyalarla dekore ettiğin oda.</small></h3><button class="btn wide" id="go-home">Odama git</button></div>
      </section>
      <section><h3>Şu an çevrimiçi <small>${comm.length ? comm.length + ' oyuncu' : 'Henüz kimse yok — linki arkadaşlarınla paylaş.'}</small></h3>
        <ul class="community">${comm.map((p, i) => { const pr = p.presence; return `<li><i class="lv">${pr.lv || 1}</i><b>${esc(pr.n || 'Misafir')}</b><small>${esc(pr.atn || '')}${pr.st === 'focus' ? ' · odakta' : ''}</small><span class="row"><button class="btn sm" data-goto="${i}">Yanına git</button>${pr.rd ? `<button class="btn sm ghost" data-visit="${i}">Odasını gez</button>` : ''}</span></li>`; }).join('')}</ul></section>`;
    $$('[data-room]', box).forEach((b) => b.addEventListener('click', () => { ui.close(); A().enterPublic(b.dataset.room); }));
    $('#go-home').onclick = () => { ui.close(); A().enterHome(); };
    $('#group-new').onclick = () => { $('#group-code').value = Math.random().toString(36).slice(2, 8); };
    $('#group-form').onsubmit = (e) => { e.preventDefault(); const c = $('#group-code').value.trim(); if (c.length < 3) return ui.toast('Kod çok kısa', 'En az 3 karakterlik bir kod gir.'); ui.close(); A().enterGroup(c); };
    $$('[data-goto]', box).forEach((b) => b.addEventListener('click', () => { const p = comm[+b.dataset.goto]; const at = p.presence.at || ''; ui.close(); if (at.startsWith('r-')) A().enterPublic(at.slice(2)); else if (at.startsWith('g-')) A().enterGroup(at.slice(2)); else if (at.startsWith('h-')) A().visit(p); }));
    $$('[data-visit]', box).forEach((b) => b.addEventListener('click', () => { ui.close(); A().visit(comm[+b.dataset.visit]); }));
  };
  ui.refreshCommunity = () => { if (ui.cur === 'world') ui.renderWorld(); };

  /* ---------------- character (wardrobe) ---------------- */
  const SLOTS = [
    { id: 'body', name: 'Görünüm', zoom: 'head' }, { id: 'hair', name: 'Saç', zoom: 'head' }, { id: 'beard', name: 'Sakal', zoom: 'head', g: 'm' },
    { id: 'top', name: 'Üst', zoom: 'torso' }, { id: 'bottom', name: 'Alt', zoom: 'legs' }, { id: 'shoes', name: 'Ayakkabı', zoom: 'legs' }, { id: 'acc', name: 'Aksesuar', zoom: 'full' },
  ];
  ui.charSlot = 'body';
  ui.renderChar = () => {
    const S = A().S; ui.draftAv = ui.draftAv && ui.cur === 'char' && ui._charOpen ? ui.draftAv : JSON.parse(JSON.stringify(S.av)); ui._charOpen = true;
    const pv = ui.charPreview || (ui.charPreview = new PW.Preview($('#char-preview')));
    const D = ui.draftAv;
    pv.setAvatar(D);
    const slot = SLOTS.find((s) => s.id === ui.charSlot) || SLOTS[0]; pv.setZoom(slot.zoom);
    $('#char-tabs').innerHTML = SLOTS.filter((s) => !s.g || s.g === D.g).map((s) => `<button class="${s.id === ui.charSlot ? 'on' : ''}" data-slot="${s.id}">${s.name}</button>`).join('');
    $$('#char-tabs [data-slot]').forEach((b) => (b.onclick = () => { ui.charSlot = b.dataset.slot; ui.renderChar(); }));
    const body = $('#char-body'); const L = A().levelInfo().level;
    const swatches = (arr, key, label) => `<div class="pal"><span>${label}</span><div>${arr.map((c, i) => `<button class="sw ${D[key] === i ? 'on' : ''}" style="--c:${c}" data-k="${key}" data-i="${i}" aria-label="${label} ${i + 1}"></button>`).join('')}</div></div>`;
    let html = '';
    if (slot.id === 'body') {
      html += `<div class="gsel"><span>Karakter</span><div class="seg"><button data-g="f" class="${D.g === 'f' ? 'on' : ''}">Kadın</button><button data-g="m" class="${D.g === 'm' ? 'on' : ''}">Erkek</button></div></div>`;
      html += swatches(PW.SKIN, 'sk', 'Ten rengi') + swatches(PW.EYEC, 'ec', 'Göz rengi') + swatches(PW.HAIRC, 'hc', 'Saç rengi');
    } else {
      const items = PW.AVATAR_ITEMS.filter((i) => i.slot === slot.id && (i.g === 'u' || i.g === D.g));
      const cur = slot.id === 'acc' ? D.acc : [D[{ hair: 'hs', beard: 'fh', top: 'top', bottom: 'bot', shoes: 'sh' }[slot.id]]];
      html += `<div class="items">${items.map((it) => { const own = A().isOwned(it.id); const on = cur.includes(it.id); const lock = L < it.lvl; return `<button class="it ${on ? 'on' : ''} ${own ? '' : (lock ? 'locked' : 'buyable')}" data-item="${it.id}" title="${esc(it.name)}"><img alt="" loading="lazy" src="${PW.thumb(it.id, D)}"><span>${esc(it.name)}</span>${own ? '' : `<em>${lock ? LOCK + 'Sv ' + it.lvl : COIN + it.price}</em>`}</button>`; }).join('')}</div>`;
      if (slot.id === 'hair') html += swatches(PW.HAIRC, 'hc', 'Saç rengi');
      if (slot.id === 'top') html += swatches(PW.CLOTH, 'tc', 'Renk');
      if (slot.id === 'bottom') html += swatches(PW.CLOTH, 'bc', 'Renk');
      if (slot.id === 'shoes') html += swatches(PW.CLOTH, 'shc', 'Renk');
      if (slot.id === 'acc') html += `<p class="note">Aynı bölgeye tek aksesuar takılır (baş, yüz, kulak, boyun, sırt). Şapka ve kulaklık renkleri üst giysinin uyumlu rengini alır.</p>`;
    }
    body.innerHTML = html;
    $$('.seg [data-g]', body).forEach((b) => (b.onclick = () => { if (D.g === b.dataset.g) return; const keep = { sk: D.sk, hc: D.hc, ec: D.ec }; const nd = Object.assign(PW.defaultAvatar(b.dataset.g), keep); Object.keys(D).forEach((k) => delete D[k]); Object.assign(D, nd); ui.renderChar(); pv.wave(); }));
    $$('.sw[data-k]', body).forEach((b) => (b.onclick = () => { D[b.dataset.k] = +b.dataset.i; ui.renderChar(); }));
    $$('.it[data-item]', body).forEach((b) => (b.onclick = () => {
      const it = PW.ITEM[b.dataset.item];
      if (!A().isOwned(it.id)) { ui.charBuy(it); return; }
      if (it.slot === 'acc') { if (D.acc.includes(it.id)) D.acc = D.acc.filter((x) => x !== it.id); else { D.acc = D.acc.filter((x) => PW.ITEM[x].sub !== it.sub); D.acc.push(it.id); } }
      else D[{ hair: 'hs', beard: 'fh', top: 'top', bottom: 'bot', shoes: 'sh' }[it.slot]] = it.id;
      ui.renderChar();
    }));
    $('#char-save').onclick = () => { S.av = JSON.parse(JSON.stringify(D)); A().save(); PW.world.updateAvatarInfo('me', { cfg: S.av }); A().myAct(); A().publish(); ui._charOpen = false; ui.close(); ui.toast('Karakter kaydedildi', 'Yeni görünümün odadaki herkese yansıdı.'); };
    $('#char-cancel').onclick = () => { ui._charOpen = false; ui.close(); };
    $('#char-wave').onclick = () => pv.wave();
  };
  ui.charBuy = (it) => {
    const L = A().levelInfo().level;
    if (L < it.lvl) return ui.toast(it.name + ' kilitli', `Seviye ${it.lvl}'de açılır. Şu an seviye ${L}.`);
    ui.confirmBuy(it, () => ui.renderChar());
  };
  ui.confirmBuy = (it, after) => {
    const m = $('#m-buy'); m.classList.add('open');
    m.querySelector('.b-img').src = PW.thumb(it.id, A().S.av);
    m.querySelector('.b-name').textContent = it.name;
    m.querySelector('.b-price').innerHTML = COIN + it.price;
    const have = A().S.coins; m.querySelector('.b-after').textContent = have >= it.price ? `Kalan: ${have - it.price} jeton` : `${it.price - have} jeton eksik — biraz daha odaklan!`;
    const ok = m.querySelector('.b-ok'); ok.disabled = have < it.price;
    ok.onclick = () => { const r = A().buy(it.id); m.classList.remove('open'); if (r.ok) { PW.sfx('buy'); ui.toast('Satın alındı: ' + it.name, it.cat === 'furn' ? 'Odamı düzenle bölümünden yerleştirebilirsin.' : 'Kullanıma hazır.'); } else ui.toast('Satın alınamadı', r.msg); after && after(); };
    m.querySelector('.b-no').onclick = () => m.classList.remove('open');
  };

  /* ---------------- shop ---------------- */
  const SHOP_TABS = [
    { id: 'avatar', name: 'Karakter' }, { id: 'furn', name: 'Mobilya & Dekor' }, { id: 'theme', name: 'Oda Teması' }, { id: 'view', name: 'Manzara' }, { id: 'size', name: 'Oda Boyutu' },
  ];
  ui.shopTab = 'avatar'; ui.shopSub = 'Tümü'; ui.shopG = null;
  ui.renderShop = () => {
    const S = A().S, L = A().levelInfo().level;
    if (!ui.shopG) ui.shopG = S.av.g;
    $('#shop-tabs').innerHTML = SHOP_TABS.map((t) => `<button class="${t.id === ui.shopTab ? 'on' : ''}" data-t="${t.id}">${t.name}</button>`).join('');
    $$('#shop-tabs [data-t]').forEach((b) => (b.onclick = () => { ui.shopTab = b.dataset.t; ui.shopSub = 'Tümü'; ui.renderShop(); }));
    let items = PW.CATALOG.filter((i) => i.cat === ui.shopTab);
    let subs = [];
    if (ui.shopTab === 'avatar') { subs = ['Tümü', 'Saç', 'Sakal', 'Üst', 'Alt', 'Ayakkabı', 'Aksesuar']; const map = { Saç: 'hair', Sakal: 'beard', Üst: 'top', Alt: 'bottom', Ayakkabı: 'shoes', Aksesuar: 'acc' }; items = items.filter((i) => i.g === 'u' || i.g === ui.shopG); if (ui.shopSub !== 'Tümü') items = items.filter((i) => i.slot === map[ui.shopSub]); }
    if (ui.shopTab === 'furn') { subs = ['Tümü', ...new Set(PW.ROOM_ITEMS.map((i) => i.sub))]; if (ui.shopSub !== 'Tümü') items = items.filter((i) => i.sub === ui.shopSub); }
    items = items.slice().sort((a, b) => a.lvl - b.lvl || a.price - b.price);
    const sub = $('#shop-sub');
    sub.innerHTML = (ui.shopTab === 'avatar' ? `<div class="seg"><button data-g="f" class="${ui.shopG === 'f' ? 'on' : ''}">Kadın</button><button data-g="m" class="${ui.shopG === 'm' ? 'on' : ''}">Erkek</button></div>` : '') + subs.map((s) => `<button class="chip ${s === ui.shopSub ? 'on' : ''}" data-s="${esc(s)}">${esc(s)}</button>`).join('');
    $$('[data-s]', sub).forEach((b) => (b.onclick = () => { ui.shopSub = b.dataset.s; ui.renderShop(); }));
    $$('[data-g]', sub).forEach((b) => (b.onclick = () => { ui.shopG = b.dataset.g; ui.renderShop(); }));
    const grid = $('#shop-grid');
    const base = Object.assign({}, S.av, { g: ui.shopG });
    grid.innerHTML = items.map((it) => {
      const cnt = S.owned[it.id] || 0, own = cnt > 0, lock = L < it.lvl, multi = it.cat === 'furn';
      let state = '';
      if (own && !multi) state = '<span class="own">Sende</span>';
      else if (lock) state = `<span class="lock">${LOCK} Seviye ${it.lvl}</span>`;
      else state = `<button class="btn sm buy" data-buy="${it.id}">${COIN}${it.price === 0 ? 'Ücretsiz' : it.price}</button>`;
      return `<article class="card ${lock ? 'is-lock' : ''} ${own && !multi ? 'is-own' : ''}"><img alt="" loading="lazy" src="${PW.thumb(it.id, base)}"><h4>${esc(it.name)}</h4><p>${it.cat === 'avatar' ? ({ hair: 'Saç', beard: 'Sakal', top: 'Üst giyim', bottom: 'Alt giyim', shoes: 'Ayakkabı', acc: 'Aksesuar' }[it.slot]) : it.sub || ({ theme: 'Duvar + zemin', view: 'Pencere manzarası', size: 'Oda büyütme' }[it.cat])}${multi && own ? ` · ${cnt} adet` : ''}</p>${state}</article>`;
    }).join('') || '<p class="note">Bu kategoride eşya yok.</p>';
    $$('[data-buy]', grid).forEach((b) => (b.onclick = () => ui.confirmBuy(PW.ITEM[b.dataset.buy], () => { ui.renderShop(); ui.applyPurchase(b.dataset.buy); })));
    $('#shop-coins').innerHTML = COIN + '<b>' + S.coins + '</b>';
  };
  ui.applyPurchase = (id) => {
    const d = PW.ITEM[id], S = A().S; if (!A().isOwned(id)) return;
    if (d.cat === 'theme') { S.room.theme = id; A().save(); A().rebuildHome(); }
    if (d.cat === 'view') { S.room.view = id; A().save(); A().rebuildHome(); }
    if (d.cat === 'size') { S.room.size = d.size; A().save(); A().rebuildHome(); }
  };

  /* ---------------- room editor ---------------- */
  ui.parkMe = () => { const w = PW.world; w.standAvatar('me'); const me = w.avatars.get('me'); if (me) { me.target = null; me.av.root.position.set(w.half - 0.6, 0, w.half - 0.6); me.av.setState('stand'); } };
  ui.setEditing = (on) => {
    const w = PW.world; if (!w) return;
    if (on && (!A().room || A().room.kind !== 'home')) { A().enterHome().then(() => ui.setEditing(true)); return; }
    w.setEdit(on); $('#editbar').hidden = !on; document.body.classList.toggle('editing', on);
    if (on) { ui.parkMe(); ui.renderEditBar(); ui.toast('Oda düzenleme', 'Eşya seç → yere/duvara tıkla. R döndürür, Del kaldırır.'); }
    else if (A().room && A().room.kind === 'home') { A().ensureSeated(true); A().myAct(); A().publish(); }
  };
  ui.renderEditBar = () => {
    const S = A().S, w = PW.world, bar = $('#e-list');
    $$('#e-tabs [data-etab]').forEach((b) => b.classList.toggle('on', b.dataset.etab === ui.etab));
    const sel = w.edit.sel; const selIt = sel >= 0 ? S.room.items[sel] : null;
    $('#e-sel').textContent = selIt ? PW.ITEM[selIt.id].name : 'Seçili eşya yok';
    ['#e-rot', '#e-move', '#e-del'].forEach((q) => ($(q).disabled = !selIt));
    if (ui.etab === 'furn') {
      const ids = Object.keys(S.owned).filter((id) => PW.ITEM[id] && PW.ITEM[id].cat === 'furn').sort((a, b) => ((A().available(b) > 0) - (A().available(a) > 0)) || PW.ITEM[a].sub.localeCompare(PW.ITEM[b].sub));
      bar.innerHTML = ids.map((id) => { const av = A().available(id); return `<button class="eit ${av > 0 ? '' : 'none'}" data-place="${id}" ${av > 0 ? '' : 'disabled'} title="${esc(PW.ITEM[id].name)}"><img alt="" src="${PW.thumb(id)}"><span>${esc(PW.ITEM[id].name)}</span><i>${av}</i></button>`; }).join('') + `<button class="eit shop" data-open-shop="1"><span>Mağazaya git</span></button>`;
    } else {
      const cat = ui.etab; const cur = cat === 'theme' ? S.room.theme : cat === 'view' ? S.room.view : 'sz_' + ({ 7: 's', 9: 'm', 11: 'l' }[S.room.size]);
      const ids = PW.CATALOG.filter((i) => i.cat === cat);
      bar.innerHTML = ids.map((it) => { const own = A().isOwned(it.id); return `<button class="eit ${it.id === cur ? 'on' : ''} ${own ? '' : 'none'}" data-apply="${it.id}" title="${esc(it.name)}"><img alt="" src="${PW.thumb(it.id)}"><span>${esc(it.name)}</span>${own ? '' : `<i class="p">${COIN}${it.price}</i>`}</button>`; }).join('');
    }
    $$('[data-place]', bar).forEach((b) => (b.onclick = () => { w.select(-1); w.startGhost(b.dataset.place, 0); ui.renderEditBar(); }));
    $$('[data-apply]', bar).forEach((b) => (b.onclick = () => { const it = PW.ITEM[b.dataset.apply]; if (!A().isOwned(it.id)) return ui.confirmBuy(it, () => { ui.applyPurchase(it.id); ui.renderEditBar(); }); if (it.cat === 'size') { const big = S.room.size; if (it.size < big && S.room.items.some((x) => !x.w && (Math.abs(x.x) > it.size / 2 - 0.3 || Math.abs(x.z) > it.size / 2 - 0.3))) return ui.toast('Oda küçültülemedi', 'Önce kenardaki eşyaları ortaya taşı.'); } ui.applyPurchase(it.id); ui.renderEditBar(); }));
    const sb = $('[data-open-shop]', bar); if (sb) sb.onclick = () => { ui.shopTab = 'furn'; ui.open('shop'); };
  };
  ui.onPlace = (pos) => {
    const S = A().S;
    if (A().available(pos.id) <= 0) return ui.toast('Envanterde kalmadı', 'Mağazadan bir tane daha alabilirsin.');
    S.room.items.push(pos); A().save(); A().checkAch();
    A().rebuildHome(); PW.world.setEdit(true); ui.parkMe();
    ui.renderEditBar();
    if (A().available(pos.id) > 0) PW.world.startGhost(pos.id, pos.r || 0);
  };
  ui.editRotate = () => { const w = PW.world; if (w.rotateGhost()) return; const S = A().S, i = w.edit.sel; if (i < 0 || !S.room.items[i] || S.room.items[i].w) return; S.room.items[i].r = ((S.room.items[i].r || 0) + 1) % 4; A().save(); A().rebuildHome(); w.setEdit(true); ui.parkMe(); w.select(i); ui.renderEditBar(); };
  ui.editRemove = () => { const w = PW.world, S = A().S, i = w.edit.sel; if (i < 0 || !S.room.items[i]) return; S.room.items.splice(i, 1); A().save(); A().rebuildHome(); w.setEdit(true); ui.parkMe(); w.select(-1); ui.renderEditBar(); };
  ui.editMove = () => { const w = PW.world, S = A().S, i = w.edit.sel; if (i < 0 || !S.room.items[i]) return; const it = S.room.items.splice(i, 1)[0]; A().save(); A().rebuildHome(); w.setEdit(true); ui.parkMe(); w.select(-1); w.startGhost(it.id, it.r || 0); ui.renderEditBar(); };

  /* ---------------- profile ---------------- */
  ui.renderProfile = () => {
    const S = A().S, li = A().levelInfo(), wx = A().weekXP(), lg = PW.leagueFor(wx), next = PW.LEAGUES.find((l) => l.min > wx);
    const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push({ k: U.todayKey(d), lab: d.toLocaleDateString('tr-TR', { weekday: 'short' }), v: S.stats.days[U.todayKey(d)] || 0 }); }
    const max = Math.max(60, ...days.map((d) => d.v));
    const W = 320, H = 140, bw = 30, gap = (W - 7 * bw) / 8;
    const chart = `<svg viewBox="0 0 ${W} ${H + 24}" class="chart" role="img" aria-label="Son 7 gün odak dakikası">${[0.5, 1].map((f) => `<line x1="0" x2="${W}" y1="${H - f * H * 0.9}" y2="${H - f * H * 0.9}" class="grid"/><text x="${W}" y="${H - f * H * 0.9 - 3}" text-anchor="end" class="axis">${Math.round(max * f)} dk</text>`).join('')}${days.map((d, i) => { const h = (d.v / max) * H * 0.9; const x = gap + i * (bw + gap); return `<rect x="${x}" y="${H - h}" width="${bw}" height="${Math.max(h, 1)}" rx="6" class="${i === 6 ? 'today' : ''}"/>${d.v ? `<text x="${x + bw / 2}" y="${H - h - 4}" text-anchor="middle" class="val">${d.v}</text>` : ''}<text x="${x + bw / 2}" y="${H + 16}" text-anchor="middle" class="axis">${d.lab}</text>`; }).join('')}</svg>`;
    const board = [{ n: S.name || 'Sen', lv: li.level, wx, me: true }, ...A().lobbyPeers.map((p) => ({ n: p.presence.n, lv: p.presence.lv || 1, wx: p.presence.wx || 0 }))].sort((a, b) => b.wx - a.wx);
    $('#profile-body').innerHTML = `
      <div class="pf-head"><div class="pf-lv"><b>${li.level}</b><span>seviye</span></div><div><h3>${esc(S.name || 'Misafir')}</h3><p>${PW.titleFor(li.level)} · <span class="lg" style="--lg:${lg.color}">${lg.name}</span></p><div class="bar"><i style="width:${Math.round((li.into / li.need) * 100)}%"></i></div><small>Sonraki seviyeye ${li.need - li.into} XP · ${next ? `${next.name} için bu hafta ${next.min - wx} XP daha` : 'En üst ligdesin'}</small></div></div>
      <div class="tiles"><div><b>${U.fmtMin(S.stats.focusMin)}</b><span>toplam odak</span></div><div><b>${S.stats.pomos}</b><span>pomodoro</span></div><div><b>${S.stats.streak} gün</b><span>seri</span></div><div><b>${wx}</b><span>bu hafta XP</span></div></div>
      <h4>Son 7 gün</h4>${chart}
      <h4>Haftalık sıralama <small>Şu an çevrimiçi olanlar</small></h4><ol class="board">${board.slice(0, 10).map((b, i) => `<li class="${b.me ? 'me' : ''}"><i>${i + 1}</i><span>${esc(b.n || 'Misafir')}</span><em>Sv ${b.lv}</em><b>${b.wx} XP</b></li>`).join('')}</ol>
      <h4>Başarımlar <small>${Object.keys(S.ach).length} / ${PW.ACHIEVEMENTS.length}</small></h4>
      <ul class="ach">${PW.ACHIEVEMENTS.map((a) => `<li class="${S.ach[a.id] ? 'got' : ''}"><b>${esc(a.name)}</b><span>${esc(a.desc)}</span><em>${COIN}${a.coin}</em></li>`).join('')}</ul>
      <h4>Ayarlar</h4>
      <form class="settings" id="set-form">
        <label>Adın <input id="set-name" maxlength="20" value="${esc(S.name || '')}"></label>
        <label class="ck"><input type="checkbox" id="set-sound" ${S.settings.sound ? 'checked' : ''}> Sesli bildirim</label>
        <label class="ck"><input type="checkbox" id="set-npc" ${S.settings.npc ? 'checked' : ''}> Odalarda NPC çalışma arkadaşlarını göster</label>
        <label class="ck"><input type="checkbox" id="set-auto" ${S.settings.autoNext ? 'checked' : ''}> Mola bitince yeni turu otomatik başlat</label>
        <div class="row custom"><span>Özel süre</span><label>Odak <input type="number" id="set-cf" min="5" max="180" value="${S.settings.custom.focus}"> dk</label><label>Mola <input type="number" id="set-cb" min="1" max="60" value="${S.settings.custom.brk}"> dk</label><label>Uzun <input type="number" id="set-cl" min="5" max="60" value="${S.settings.custom.long}"> dk</label></div>
        <label>Demo hızı <select id="set-speed"><option value="1">Gerçek zaman</option><option value="10">×10 (deneme)</option><option value="60">×60 (1 sn = 1 dk)</option></select></label>
        <p class="note">Demo hızı sadece uygulamayı denemek içindir; gerçek kullanımda “Gerçek zaman”da bırak.</p>
        <button class="btn">Kaydet</button>
      </form>`;
    $('#set-speed').value = String(S.settings.speed || 1);
    $('#set-form').onsubmit = (e) => {
      e.preventDefault(); const n = $('#set-name').value.trim().slice(0, 20); if (n.length >= 2) S.name = n;
      S.settings.sound = $('#set-sound').checked; const npcBefore = S.settings.npc; S.settings.npc = $('#set-npc').checked; S.settings.autoNext = $('#set-auto').checked;
      S.settings.custom = { focus: U.clamp(+$('#set-cf').value || 25, 5, 180), brk: U.clamp(+$('#set-cb').value || 5, 1, 60), long: U.clamp(+$('#set-cl').value || 15, 5, 60) };
      S.settings.speed = +$('#set-speed').value || 1;
      A().save(); ui.refreshHUD(); ui.refreshTimer(); A().publish(); A().publishLobby(); ui.toast('Ayarlar kaydedildi', '');
      if (npcBefore !== S.settings.npc && A().room) A().enterRoom(A().room);
    };
  };
})();
