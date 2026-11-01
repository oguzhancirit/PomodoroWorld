/* Pomodoro World — interface v2: HUD, focus screen, onboarding + guided tour, wardrobe, rooms & invites,
   quests, shop, room designer, profile */
(function () {
  const PW = window.PW;
  const U = PW.util;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const A = () => PW.app;
  const esc = U.esc;
  const COIN = '<svg class="coin" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5"/><path d="M10 5.5v9M7.2 7.6c.6-1 1.6-1.4 2.8-1.4 1.6 0 2.6.8 2.6 1.9 0 2.6-5.4 1.5-5.4 4.1 0 1.1 1 1.9 2.7 1.9 1.3 0 2.3-.5 2.8-1.4" fill="none"/></svg>';
  const LOCK = '<svg viewBox="0 0 20 20" class="ico" aria-hidden="true"><rect x="4.5" y="9" width="11" height="8" rx="2"/><path d="M7 9V7a3 3 0 0 1 6 0v2" fill="none"/></svg>';
  const MASCOT = (cls = '') => `<svg class="mascot ${cls}" viewBox="0 0 120 104" aria-hidden="true"><ellipse cx="60" cy="98" rx="30" ry="5" fill="rgba(0,0,0,.18)"/><circle cx="60" cy="58" r="38" fill="#E8553D"/><ellipse cx="44" cy="44" rx="11" ry="7" fill="#FF8C70" opacity=".75"/><path d="M60 22c-6-9-17-9-22-5 8 0 13 4 15 8-9-2-17 2-19 8 9-4 17-4 26-2 9-2 17-2 26 2-2-6-10-10-19-8 2-4 7-8 15-8-5-4-16-4-22 5z" fill="#4E9A49"/><path d="M60 14v12" stroke="#3B7A3A" stroke-width="5" stroke-linecap="round"/><g class="eye"><ellipse cx="47" cy="60" rx="5.5" ry="7" fill="#2A1A14"/><circle cx="45" cy="57" r="2" fill="#fff"/></g><g class="eye"><ellipse cx="73" cy="60" rx="5.5" ry="7" fill="#2A1A14"/><circle cx="71" cy="57" r="2" fill="#fff"/></g><ellipse cx="38" cy="72" rx="6" ry="3.5" fill="#FF9CA0" opacity=".7"/><ellipse cx="82" cy="72" rx="6" ry="3.5" fill="#FF9CA0" opacity=".7"/><path d="M53 74q7 7 14 0" stroke="#2A1A14" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
  PW.MASCOT = MASCOT;
  const ui = (PW.ui = {});

  ui.init = () => {
    $$('[data-open]').forEach((b) => b.addEventListener('click', () => ui.open(b.dataset.open)));
    $$('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m && !m.dataset.locked) ui.close(); }));
    $$('.modal [data-close]').forEach((b) => b.addEventListener('click', () => ui.close()));
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select')) return;
      if (e.key === 'Escape') { if (PW.world.edit.ghost) PW.world.cancelGhost(); else if (ui.focusOpen) ui.closeFocus(); else ui.close(); }
      if ((e.key === 'r' || e.key === 'R') && PW.world.edit.on) ui.editRotate();
      if ((e.key === 'Delete' || e.key === 'Backspace') && PW.world.edit.on) ui.editRemove();
      if (e.key === ' ' && ui.focusOpen && !$('.modal.open')) { e.preventDefault(); ui.timerMain(); }
    });
    $('#hud-me').addEventListener('click', () => ui.open('profile'));
    $('#chat-form').addEventListener('submit', (e) => { e.preventDefault(); const i = $('#chat-in'); A().sendChat(i.value); i.value = ''; });
    $('#chat-toggle').addEventListener('click', () => { const c = $('#chat').classList.toggle('collapsed'); $('#chat-toggle').textContent = c ? '+' : '–'; $('#chat-toggle').classList.remove('ping'); });
    $('#people-toggle').addEventListener('click', () => { const c = $('#people').classList.toggle('collapsed'); $('#people-toggle').textContent = c ? '+' : '–'; });
    $('#nav-home').addEventListener('click', () => { ui.close(); if (!A().room || A().room.kind !== 'home') A().enterHome(); });
    $('#btn-home').addEventListener('click', () => A().enterHome());
    $('#btn-focus').addEventListener('click', () => ui.openFocus());
    $('#mini-open').addEventListener('click', () => ui.openFocus());
    $('#btn-edit').addEventListener('click', () => ui.setEditing(true));
    $('#btn-invite').addEventListener('click', () => ui.open('roomset'));
    $('#btn-sit').addEventListener('click', () => { const w = PW.world, me = w.avatars.get('me'); if (me.seatIdx != null) w.standAvatar('me'); else { const s = w.freeSeat(A().room.kind !== 'social'); if (s != null) w.sitAvatar('me', s); } A().myAct(); A().publish(); ui.refreshTimer(); });
    $$('#emotes [data-emote]').forEach((b) => b.addEventListener('click', () => A().emote(b.dataset.emote)));
    // focus screen
    $('#fx-go').addEventListener('click', ui.timerMain);
    $('#fx-close').addEventListener('click', ui.closeFocus);
    $('#fx-min').addEventListener('click', ui.closeFocus);
    $('#fx-skip').addEventListener('click', () => A().skip());
    $('#fx-reset').addEventListener('click', () => A().stop());
    $$('#fx-presets [data-preset]').forEach((b) => b.addEventListener('click', () => { if (A().timer.phase !== 'idle') return ui.toast('Sayaç çalışıyor', 'Süreyi değiştirmek için önce sıfırla.'); if (b.dataset.preset === 'custom') { ui.open('profile'); setTimeout(() => { const el = $('#set-cf'); if (el) el.scrollIntoView({ block: 'center' }); }, 200); } A().S.settings.preset = b.dataset.preset; A().save(); ui.refreshTimer(); }));
    $$('#fx-styles [data-style]').forEach((b) => b.addEventListener('click', () => { A().S.settings.style = b.dataset.style; A().save(); A().myAct(); A().publish(); ui.refreshTimer(); }));
    $('#fx-cat').innerHTML = PW.TASK_CATS.map(([n]) => `<option>${n}</option>`).join('');
    $('#fx-task').addEventListener('input', (e) => { A().S.task.text = e.target.value; A().save(); });
    $('#fx-cat').addEventListener('change', (e) => { A().S.task.cat = e.target.value; A().save(); });
    $('#fx-mascot').innerHTML = MASCOT();
    // editor
    $('#e-done').addEventListener('click', () => ui.setEditing(false));
    $('#e-rot').addEventListener('click', ui.editRotate);
    $('#e-move').addEventListener('click', ui.editMove);
    $('#e-del').addEventListener('click', ui.editRemove);
    $$('#e-tabs [data-etab]').forEach((b) => b.addEventListener('click', () => { ui.etab = b.dataset.etab; ui.renderEditBar(); }));
    ui.etab = 'furn';
    if (window.innerWidth < 720) { $('#chat').classList.add('collapsed'); $('#people').classList.add('collapsed'); $('#chat-toggle').textContent = '+'; $('#people-toggle').textContent = '+'; }
    ui.refreshHUD(); ui.refreshTimer(); ui.refreshQuestBadge();
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
    const lg = PW.leagueFor(A().weekXP()); const l = $('#hud-league'); l.textContent = lg.name; l.style.setProperty('--lg', lg.color);
    const w = PW.world; if (w && w.avatars.has('me')) w.updateAvatarInfo('me', { name: S.name || 'Sen', level: li.level });
    const d = S.stats.dayPomos[U.todayKey()] || 0; $('#hud-goal').textContent = `Bugün ${Math.min(d, PW.ECON.dailyGoal)}/${PW.ECON.dailyGoal}`; $('#hud-goal').classList.toggle('done', d >= PW.ECON.dailyGoal);
    ui.refreshQuestBadge();
  };
  ui.refreshQuestBadge = () => {
    const S = A().S; if (!S) return; A().questReset();
    let n = S.q.login.claimedDay === U.todayKey() ? 0 : 1;
    for (const q of PW.QUESTS.daily) { const c = S.q.daily[q.id]; if (c && !c.c && c.p >= q.goal) n++; }
    for (const q of PW.QUESTS.weekly) { const c = S.q.weekly[q.id]; if (c && !c.c && c.p >= q.goal) n++; }
    const b = $('#q-badge'); if (b) { b.hidden = !n; b.textContent = n; }
    if (ui.cur === 'quests') ui.renderQuests();
  };
  ui.timerMain = () => { const T = A().timer; if (T.phase === 'idle') A().startFocus(); else A().pause(); };
  ui.refreshTimer = () => {
    const T = A().timer, S = A().S; if (!S) return;
    const p = A().preset();
    const left = T.phase === 'idle' ? p.focus * 60 : Math.max(0, T.left);
    const frac = T.phase === 'idle' ? 0 : 1 - T.left / T.total;
    // mini dock
    const mini = $('#mini'); mini.dataset.phase = T.phase;
    $('#mini-time').textContent = U.fmtTime(left);
    $('#mini-phase').textContent = T.phase === 'focus' ? (T.running ? 'Odak' : 'Duraklatıldı') : T.phase === 'break' ? (T.long ? 'Uzun mola' : 'Mola') : 'Hazır';
    $('#mini-prog').style.width = Math.round(frac * 100) + '%';
    $('#mini-open').textContent = T.phase === 'idle' ? 'Odaklan' : 'Odak ekranı';
    // focus screen
    const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(Math.floor(left % 60)).padStart(2, '0');
    $('#fx-time').innerHTML = `${mm}<span class="sec">:${ss}</span>`;
    $$('.fx-modes span').forEach((s) => s.classList.toggle('on', (T.phase === 'idle' && s.dataset.m === 'focus') || (T.phase === 'focus' && s.dataset.m === 'focus') || (T.phase === 'break' && s.dataset.m === (T.long ? 'long' : 'break'))));
    const task = S.task.text;
    $('#fx-sub').textContent = T.phase === 'idle' ? (task ? `Sıradaki: ${task}` : 'Hazırsan başlayalım!') : T.phase === 'focus' ? (T.running ? (task ? `Odaktasın · ${task}` : 'Odaktasın. Telefon uzakta, nefes derin.') : 'Duraklatıldı. Hazır olunca devam et.') : 'Mola: kalk, esne, su iç. Ekrandan uzaklaş.';
    const go = $('#fx-go'); go.classList.toggle('run', T.running);
    $('#fx-go-t').textContent = T.phase === 'idle' ? 'Başlat' : T.running ? 'Duraklat' : 'Devam et';
    go.querySelector('.pl').innerHTML = T.running ? '<svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>' : '<svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M8 5v14l11-7z"/></svg>';
    $('#fx-pill').textContent = `${Math.round((T.phase === 'idle' ? p.focus * 60 : T.total) / 60)} dk · %${Math.round(frac * 100)}`;
    const r = T.round % 4; $('#fx-dots').innerHTML = [0, 1, 2, 3].map((i) => `<i class="${i < r ? 'on' : ''}"></i>`).join('') + `<span>${r}/4</span>`;
    $$('#fx-presets [data-preset]').forEach((b) => b.classList.toggle('on', b.dataset.preset === S.settings.preset));
    $$('#fx-styles [data-style]').forEach((b) => b.classList.toggle('on', b.dataset.style === S.settings.style));
    const me = PW.world && PW.world.avatars.get('me');
    $('#btn-sit').textContent = me && me.seatIdx != null ? 'Kalk' : 'Otur';
    if (me) PW.world.updateAvatarInfo('me', { status: A().status(), timer: U.fmtTime(T.left) });
    if (T.phase !== 'idle') document.title = `${U.fmtTime(T.left)} · ${T.phase === 'focus' ? 'Odak' : 'Mola'} — Pomodoro World`; else if (!ui._flash) document.title = 'Pomodoro World';
  };
  ui.flashTitle = (t) => { ui._flash = true; let n = 0; const iv = setInterval(() => { document.title = n % 2 ? 'Pomodoro World' : t; if (++n > 8) { clearInterval(iv); ui._flash = false; } }, 700); };
  ui.setNetMode = (net) => { const el = $('#net'); el.textContent = net.mode === 'claude' ? 'Canlı' : net.mode === 'p2p' ? 'Canlı · P2P' : net.mode === 'local' ? 'Yerel mod' : 'Çevrimdışı'; el.dataset.mode = net.mode; el.title = net.mode === 'local' ? 'Çevrim içi bağlantı kurulamadı: yalnızca bu tarayıcının sekmeleri birbirini görür.' : 'Gerçek zamanlı bağlantı açık.'; };

  /* ---------------- focus screen ---------------- */
  ui.openFocus = () => {
    ui.close(); ui.setEditing(false, true);
    ui.focusOpen = true; $('#focus').classList.add('open'); document.body.classList.add('focusing');
    A().ensureSeated(); PW.world.setFocusCam('me');
    $('#fx-task').value = A().S.task.text || ''; $('#fx-cat').value = A().S.task.cat || 'Ders';
    $('#fx-recent').innerHTML = (A().S.task.recent || []).map((t) => `<option value="${esc(t)}">`).join('');
    ui.renderDay(); ui.refreshTimer();
  };
  ui.closeFocus = () => { ui.focusOpen = false; $('#focus').classList.remove('open'); document.body.classList.remove('focusing'); PW.world.setFocusCam(null); };
  ui.renderDay = () => {
    const S = A().S, d = U.todayKey();
    const blocks = S.stats.log.filter((b) => b.d === d);
    const mins = S.stats.days[d] || 0;
    $('#fx-daytitle').textContent = mins ? `Bugün ${U.fmtMin(mins)} odaklandın` : 'Günün ilk bloğu seni bekliyor';
    let best = null, bv = 0; for (const h in S.stats.hours) if (S.stats.hours[h] > bv) { bv = S.stats.hours[h]; best = +h; }
    $('#fx-best').textContent = best != null ? `En verimli saatin ${String(best).padStart(2, '0')}:00` : 'İlk seansın en verimli saatini belirler';
    const col = Object.fromEntries(PW.TASK_CATS);
    const now = new Date(); const nowM = now.getHours() * 60 + now.getMinutes();
    $('#fx-line').innerHTML = blocks.map((b) => `<i style="left:${(b.s / 1440) * 100}%;width:${Math.max(0.6, (b.m / 1440) * 100)}%;background:${col[b.c] || '#6CBF6A'}"></i>`).join('') + (best != null ? `<span class="best" style="left:calc(${((best * 60 + 30) / 1440) * 100}% - 3px)"></span>` : '') + `<span class="now" style="left:${(nowM / 1440) * 100}%"></span>`;
  };

  /* ---------------- room card ---------------- */
  ui.onRoomChange = (spec, soft) => {
    const kindName = { social: 'Sosyal alan', home: 'Senin odan', visit: 'Ziyaret' }[spec.kind] || 'Oda';
    $('#room-kind').textContent = kindName; $('#room-kind').dataset.kind = spec.kind;
    $('#room-name').textContent = spec.kind === 'home' ? A().S.room.name : spec.name;
    const own = $('#room-owner');
    if (spec.kind === 'visit') { own.hidden = false; own.textContent = spec.waiting ? 'Oda sahibi bekleniyor… odaya girdiğinde tasarımı yüklenir.' : 'Sahibi: ' + (spec.ownerName || 'bir oyuncu'); }
    else if (spec.kind === 'social') { own.hidden = false; own.textContent = 'Herkese açık sosyal alan'; }
    else own.hidden = true;
    $('#room-lock').hidden = !(spec.kind === 'home' && !A().S.room.open);
    $('#btn-edit').hidden = spec.kind !== 'home'; $('#btn-invite').hidden = spec.kind !== 'home';
    $('#btn-home').hidden = spec.kind === 'home';
    $('#btn-focus').hidden = spec.kind === 'social';
    $('#mini').classList.toggle('social', spec.kind === 'social');
    $('#chat-hint').textContent = spec.kind === 'social' ? 'Yere tıklayıp yürü, koltuklara tıklayıp otur.' : 'Odak sırasında kısa yaz; uzun sohbetler molaya.';
    if (!soft) { $('#chat-log').innerHTML = ''; ui.addChat({ sys: true, text: `${$('#room-name').textContent} · içeri girdin.` }); }
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
    const rows = []; for (const [id, a] of w.avatars) rows.push({ id, name: a.info.name, lv: a.info.level, st: a.info.status, me: id === 'me', npc: id.startsWith('npc-') });
    rows.sort((a, b) => (b.me - a.me) || (a.npc - b.npc) || (b.lv - a.lv));
    $('#people-count').textContent = rows.length;
    list.innerHTML = rows.map((r) => `<li class="${r.me ? 'me' : ''} ${r.npc ? 'npc' : ''}"><i class="lv">${r.lv}</i><span>${esc(r.name)}${r.me ? ' (sen)' : ''}${r.npc ? '<em>NPC</em>' : ''}</span><b class="st ${r.st}">${r.st === 'focus' ? 'odak' : r.st === 'break' ? 'mola' : r.st === 'paused' ? 'durdu' : ''}</b></li>`).join('');
  };
  ui.onWorldClick = (ev) => {
    const w = PW.world, room = A().room;
    if (ev.type === 'edit-select') { ui.renderEditBar(); return; }
    if (ev.type === 'avatar') { if (ev.id !== 'me') { const a = w.avatars.get(ev.id); if (a) ui.toast(a.info.name, `Seviye ${a.info.level} · ${PW.titleFor(a.info.level)}${ev.id.startsWith('npc-') ? ' · sosyal alanın müdavimi (NPC)' : ''}`); } else w.emote('me', 'wave'); return; }
    if (ev.type === 'seat') {
      const s = w.seats[ev.idx]; if (!s) return;
      if (s.taken && s.taken !== 'me') return ui.toast('Bu koltuk dolu', 'Boş bir koltuk seç.');
      if (room.kind === 'social') { const me = w.avatars.get('me'); if (me.seatIdx != null) w.standAvatar('me'); w.walkTo('me', s.x + Math.sin(s.ry) * 0.55, s.z + Math.cos(s.ry) * 0.55); me.onArrive = () => { w.sitAvatar('me', ev.idx); A().myAct(); A().publish(); ui.refreshTimer(); }; A().publish(); }
      else { w.sitAvatar('me', ev.idx); A().myAct(); A().publish(); ui.refreshTimer(); }
      return;
    }
    if (ev.type === 'floor') {
      if (room.kind !== 'social' && A().timer.phase === 'focus' && A().timer.running) return ui.toast('Odaktasın', 'Masadan kalkmak için önce duraklat.');
      w.walkTo('me', ev.x, ev.z); const me = w.avatars.get('me'); me.onArrive = () => { A().publish(); ui.refreshTimer(); }; A().publish(); ui.refreshTimer();
    }
  };

  /* ---------------- toasts, level up ---------------- */
  ui.toast = (title, body, kind = '') => { const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = `<b>${esc(title)}</b>${body ? `<span>${esc(body)}</span>` : ''}`; $('#toasts').appendChild(t); setTimeout(() => t.classList.add('out'), 3600); setTimeout(() => t.remove(), 4200); };
  ui.levelUp = (lv) => {
    const unlocked = PW.CATALOG.filter((i) => i.lvl === lv).slice(0, 8); const m = $('#m-level');
    m.querySelector('.lvnum').textContent = lv; m.querySelector('.lvtitle').textContent = PW.titleFor(lv);
    m.querySelector('.unlocks').innerHTML = unlocked.length ? unlocked.map((i) => `<li><img alt="" src="${PW.thumb(i.id, A().S.av)}"><span>${esc(i.name)}</span></li>`).join('') : '<li class="none">Mağazada yeni fiyatlar seni bekliyor.</li>';
    if (ui.focusOpen) { ui.toast('Seviye ' + lv + '!', PW.titleFor(lv) + ' oldun.', 'ach'); return; }
    ui.open('level'); const cf = m.querySelector('.confetti'); cf.innerHTML = '';
    for (let i = 0; i < 40; i++) { const s = document.createElement('i'); s.style.left = Math.random() * 100 + '%'; s.style.background = U.pick(['#E8553D', '#F2C14E', '#6CBF6A', '#8FB8FF', '#E58BB0']); s.style.animationDelay = Math.random() * 0.6 + 's'; cf.appendChild(s); }
    PW.world.emote('me', 'cheer'); PW.sfx('done');
  };

  /* ---------------- modals ---------------- */
  ui.open = (name) => {
    ui.close(true); if (name !== 'char') ui._charOpen = false;
    const m = $('#m-' + name); if (!m) return;
    m.classList.add('open'); ui.cur = name;
    ({ world: ui.renderWorld, char: ui.renderChar, shop: ui.renderShop, profile: ui.renderProfile, quests: ui.renderQuests, roomset: ui.renderRoomSet }[name] || (() => {}))();
  };
  ui.close = (silent) => { $$('.modal.open').forEach((m) => { if (!m.dataset.locked) m.classList.remove('open'); }); ui.cur = null; };

  /* ---------------- onboarding ---------------- */
  ui.startOnboarding = (invite) => {
    ui.ob = { step: 0, invite, draft: JSON.parse(JSON.stringify(A().S.av)) };
    const m = $('#m-onboard'); m.dataset.locked = '1'; m.classList.add('open');
    PW.world.hideTags = true; ui.renderOnboard();
  };
  ui.renderOnboard = () => {
    const o = ui.ob, body = $('#ob-body');
    $('#ob-steps').innerHTML = [0, 1, 2].map((i) => `<i class="${i <= o.step ? 'on' : ''}"></i>`).join('');
    if (o.step === 0) {
      body.innerHTML = `<div class="ob-welcome">${MASCOT('big')}<p class="lbl" style="color:var(--tomato2)">Pomodoro World'e hoş geldin</p><h2>Odaklan, birlikte büyü.</h2><p>Kendi 3D odanda arkadaşlarınla pomodoro yap. Her odak dakikası karakterine ve odana yeni bir şey katar.</p>
        <div class="ob-feats"><div><b>Senin odan</b><span>Duvar rengi, ışık, manzara ve eşyalar tamamen sana özel.</span></div><div><b>Birlikte çalış</b><span>Odanı açık yap ya da linkle sadece arkadaşlarını davet et.</span></div><div><b>Oyunlaştır</b><span>XP, jeton, seviye, lig ve günlük görevler.</span></div></div>
        ${o.invite ? '<div class="invite-note">Bir davet linkiyle geldin. Karakterini oluşturduktan sonra seni o odaya götüreceğiz.</div>' : ''}
        <button class="btn" id="ob-next" style="font-size:17px;padding:13px 28px">Karakterimi oluştur</button></div>`;
      $('#ob-next').onclick = () => { o.step = 1; ui.renderOnboard(); };
    } else if (o.step === 1) {
      body.innerHTML = `<header style="margin-bottom:10px"><div><h2>Karakterini oluştur</h2><p style="color:var(--muted);margin:4px 0 0">Yüz, saç ve kıyafet seç. Sonradan Karakter bölümünden her şeyi değiştirebilirsin.</p></div></header>
        <div class="wardrobe"><div class="pv" id="ob-preview"><span class="hint">Döndürmek için sürükle</span><button class="btn sm ghost" id="ob-wave" type="button">El salla</button></div><div><div class="tabs" id="ob-tabs"></div><div id="ob-wbody"></div><div class="foot"><button class="btn ghost" id="ob-back">Geri</button><button class="btn" id="ob-next">Devam</button></div></div></div>`;
      const pv = (ui.obPreview = new PW.Preview($('#ob-preview')));
      ui.wardrobe({ tabs: $('#ob-tabs'), body: $('#ob-wbody'), preview: pv, draft: o.draft, onboarding: true });
      setTimeout(() => pv.wave(), 600);
      $('#ob-wave').onclick = () => pv.wave();
      $('#ob-back').onclick = () => { o.step = 0; ui.renderOnboard(); };
      $('#ob-next').onclick = () => { o.step = 2; ui.renderOnboard(); };
    } else {
      const S = A().S;
      body.innerHTML = `<form id="ob-form" class="ob" style="align-items:center"><div class="pv" id="ob-preview2" style="min-height:360px"></div><div class="ob-form">
        <div><p class="lbl" style="color:var(--tomato2)">Son adım</p><h2>Kendini tanıt</h2></div>
        <label class="field">Kullanıcı adın<input id="ob-name" maxlength="20" placeholder="ör. Oğuzhan" autocomplete="nickname" required value="${esc(S.name || '')}"></label>
        <label class="field">Odanın adı <small>Arkadaşların seni bu adla bulur.</small><input id="ob-room" maxlength="32" placeholder="ör. Gece Kütüphanem" value=""></label>
        <p id="ob-err" hidden style="color:var(--tomato2);margin:0;font-size:13px">En az 2 karakterlik bir ad yaz.</p>
        <div class="foot" style="justify-content:space-between"><button type="button" class="btn ghost" id="ob-back">Geri</button><button class="btn" style="font-size:16px;padding:12px 24px">Odama gir</button></div></div></form>`;
      const pv = new PW.Preview($('#ob-preview2')); pv.setAvatar(o.draft); setTimeout(() => pv.wave(), 400);
      const nm = $('#ob-name'), rm = $('#ob-room');
      const sync = () => { if (!rm.dataset.touched) rm.value = nm.value.trim() ? `${nm.value.trim()}'in Odası` : ''; };
      nm.addEventListener('input', sync); rm.addEventListener('input', () => (rm.dataset.touched = 1)); sync();
      $('#ob-back').onclick = () => { o.step = 1; ui.renderOnboard(); };
      $('#ob-form').onsubmit = (e) => {
        e.preventDefault(); const n = nm.value.trim().slice(0, 20); if (n.length < 2) { $('#ob-err').hidden = false; return; }
        S.name = n; S.av = o.draft; S.room.name = (rm.value.trim() || `${n}'in Odası`).slice(0, 32); S.onboarded = true; A().saveNow();
        const m = $('#m-onboard'); delete m.dataset.locked; m.classList.remove('open');
        PW.world.hideTags = false;
        A().enterHome(); PW.world.flyIn(); ui.refreshHUD();
        setTimeout(() => ui.startTour(o.invite), 2300);
      };
    }
  };

  /* ---------------- guided tour ---------------- */
  const TOUR = [
    { t: 'Merhaba {name}! Ben Domi.', p: 'Burası senin odan. Pomodoro World\'de odaklandıkça hem karakterin hem odan büyür. Sana 1 dakikada her şeyi göstereyim.' },
    { sel: '#roomcard', t: 'Masana oturdun', p: 'Karakterin masada seni bekliyor. Sen odaklandığında o da çalışır; molada esner, kahve içer. Odaya gelen arkadaşların da boş sandalyelere oturur.' },
    { sel: '#btn-focus', t: 'Odaklanmaya buradan başla', p: '25 dakika odak + 5 dakika mola = 1 pomodoro. Dört turda bir uzun mola gelir. Görevini yazar, kategorini seçersin.' },
    { sel: '#hud-xpwrap', t: 'Her dakika değerli', p: 'Her odak dakikası +1 XP ve +1 jeton. Seviye atladıkça mağazada yeni kıyafet ve eşyaların kilidi açılır.' },
    { sel: '#btn-edit', t: 'Odanı tasarla', p: 'Duvar rengi ve deseni, zemin, ışık atmosferi (altın saat, gece lambası, mum, neon), pencere manzarası ve her eşyanın rengi sana kalmış.' },
    { sel: '#btn-invite', t: 'Arkadaşlarını davet et', p: 'Odana ad ver, Açık yap ki Dünya\'da listelensin ya da Kapalı yapıp sadece davet linkiyle arkadaşını çağır.' },
    { sel: '#nav-world', t: 'Dünya', p: 'Molada sosyal alanlara uğra, diğer oyuncuların açık odalarına katıl ya da davet koduyla bir odaya gir.' },
    { sel: '#nav-quests', t: 'Görevler ve ödüller', p: 'Her gün giriş ödülün ve günlük, haftalık görevlerin var. Hazırsan ilk pomodorona başlayalım!' },
  ];
  ui.startTour = (invite) => {
    ui.tour = { i: 0, invite }; $('#tour').classList.add('open'); $('#tour-mascot').innerHTML = MASCOT();
    $('#tour-next').onclick = () => { ui.tour.i++; if (ui.tour.i >= TOUR.length) ui.endTour(); else ui.tourStep(); };
    $('#tour-skip').onclick = ui.endTour; ui.tourStep();
  };
  ui.tourStep = () => {
    const st = TOUR[ui.tour.i]; const spot = $('#tour .spot'), card = $('#tour .card');
    $('#tour-title').textContent = st.t.replace('{name}', A().S.name || ''); $('#tour-text').textContent = st.p;
    $('#tour-dots').innerHTML = TOUR.map((_, i) => `<i class="${i === ui.tour.i ? 'on' : ''}"></i>`).join('');
    $('#tour-next').textContent = ui.tour.i === TOUR.length - 1 ? 'Odaklanmaya başla' : 'İleri';
    card.classList.remove('tour-anim'); void card.offsetWidth; card.classList.add('tour-anim'); PW.sfx('pop');
    const el = st.sel && $(st.sel); const vw = window.innerWidth, vh = window.innerHeight;
    if (el && el.offsetParent !== null) {
      const r = el.getBoundingClientRect(); const pad = 8;
      spot.classList.remove('none'); Object.assign(spot.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
      const cw = Math.min(380, vw - 32); let x = r.left + r.width / 2 - cw / 2; x = U.clamp(x, 16, vw - cw - 16);
      let y = r.bottom + 18; if (y + 220 > vh) y = Math.max(16, r.top - 230);
      Object.assign(card.style, { left: x + 'px', top: y + 'px' });
    } else { spot.classList.add('none'); const cw = Math.min(380, vw - 32); Object.assign(card.style, { left: (vw - cw) / 2 + 'px', top: vh * 0.58 + 'px' }); }
  };
  ui.endTour = () => {
    $('#tour').classList.remove('open'); A().S.toured = true; A().save();
    const inv = ui.tour && ui.tour.invite; ui.tour = null;
    if (inv) { A().visitCode(inv); setTimeout(() => ui.openFocus(), 1200); } else ui.openFocus();
  };

  /* ---------------- wardrobe (shared by onboarding + Karakter) ---------------- */
  const SLOT_KEY = { hair: 'hs', beard: 'fh', top: 'top', bottom: 'bot', shoes: 'sh' };
  ui.wardrobe = (o) => {
    const D = o.draft, pv = o.preview; const L = A().levelInfo().level;
    const tabs = [{ id: 'body', name: 'Vücut', zoom: 'full' }, { id: 'face', name: 'Yüz', zoom: 'face' }, { id: 'hair', name: 'Saç', zoom: 'head' }, { id: 'beard', name: 'Sakal', zoom: 'face', g: 'm' }, { id: 'top', name: 'Üst', zoom: 'torso' }, { id: 'bottom', name: 'Alt', zoom: 'legs' }, { id: 'shoes', name: 'Ayakkabı', zoom: 'legs' }, ...(o.onboarding ? [] : [{ id: 'acc', name: 'Aksesuar', zoom: 'full' }])];
    o.slot = o.slot || 'body';
    const draw = () => {
      pv.setAvatar(D); const slot = tabs.find((t) => t.id === o.slot) || tabs[0]; pv.setZoom(slot.zoom);
      o.tabs.innerHTML = tabs.filter((t) => !t.g || t.g === D.g).map((t) => `<button type="button" class="${t.id === o.slot ? 'on' : ''}" data-slot="${t.id}">${t.name}</button>`).join('');
      $$('[data-slot]', o.tabs).forEach((b) => (b.onclick = () => { o.slot = b.dataset.slot; draw(); }));
      const sw = (arr, key, label) => `<div class="pal"><span>${label}</span><div>${arr.map((c, i) => `<button type="button" class="sw ${D[key] === i ? 'on' : ''}" style="--c:${c}" data-k="${key}" data-i="${i}" aria-label="${label} ${i + 1}"></button>`).join('')}</div></div>`;
      const opt = (list, key, label) => `<div class="pal"><span>${label}</span><div class="opt-grid">${list.map(([v, n]) => `<button type="button" class="${D[key] === v ? 'on' : ''}" data-o="${key}" data-v="${v}">${n}</button>`).join('')}</div></div>`;
      let h = '';
      if (o.slot === 'body') {
        h += `<div class="gsel"><span>Karakter</span><div class="seg"><button type="button" data-g="f" class="${D.g === 'f' ? 'on' : ''}">Kadın</button><button type="button" data-g="m" class="${D.g === 'm' ? 'on' : ''}">Erkek</button></div></div>`;
        h += sw(PW.SKIN, 'sk', 'Ten rengi');
        h += `<div class="pal"><span>Boy</span><input type="range" class="range" id="w-ht" min="0.9" max="1.1" step="0.01" value="${D.ht || 1}" aria-label="Boy"></div>`;
        h += opt(PW.BODY_TYPES, 'bd', 'Vücut tipi');
      } else if (o.slot === 'face') {
        h += opt(PW.EYE_STYLES, 'ey', 'Göz şekli') + sw(PW.EYEC, 'ec', 'Göz rengi') + opt(PW.BROW_STYLES, 'br', 'Kaş') + opt(PW.MOUTH_STYLES, 'mo', 'Ağız');
        h += `<div class="pal"><span>Detaylar</span><div class="opt-grid"><button type="button" class="${D.bl ? 'on' : ''}" data-t="bl">Allık</button><button type="button" class="${D.fr ? 'on' : ''}" data-t="fr">Çil</button></div></div>`;
        h += `<div class="pal"><span>Ruj</span><div>${PW.LIPS.map((c, i) => `<button type="button" class="sw ${(D.lp || 0) === i ? 'on' : ''}" style="--c:${c || 'transparent'};${c ? '' : 'background:repeating-linear-gradient(45deg,#3a3656 0 4px,#2b2842 4px 8px)'}" data-k="lp" data-i="${i}" aria-label="Ruj ${i}"></button>`).join('')}</div></div>`;
      } else {
        const items = PW.AVATAR_ITEMS.filter((i) => i.slot === o.slot && (i.g === 'u' || i.g === D.g)).filter((i) => !o.onboarding || i.price === 0 || A().isOwned(i.id));
        const cur = o.slot === 'acc' ? D.acc : [D[SLOT_KEY[o.slot]]];
        h += `<div class="items">${items.map((it) => { const own = A().isOwned(it.id); const on = cur.includes(it.id); const lock = L < it.lvl; return `<button type="button" class="it ${on ? 'on' : ''} ${own ? '' : lock ? 'locked' : 'buyable'}" data-item="${it.id}" title="${esc(it.name)}"><img alt="" loading="lazy" src="${PW.thumb(it.id, D)}"><span>${esc(it.name)}</span>${own ? '' : `<em>${lock ? LOCK + 'Sv ' + it.lvl : COIN + it.price}</em>`}</button>`; }).join('')}</div>`;
        if (o.slot === 'hair') h += sw(PW.HAIRC, 'hc', 'Saç rengi');
        if (o.slot === 'top') h += opt(PW.TOP_PATTERNS, 'tp', 'Desen') + sw(PW.CLOTH, 'tc', 'Ana renk') + sw(PW.CLOTH, 'tc2', 'İkinci renk');
        if (o.slot === 'bottom') h += sw(PW.CLOTH, 'bc', 'Renk');
        if (o.slot === 'shoes') h += sw(PW.CLOTH, 'shc', 'Renk');
        if (o.onboarding && o.slot !== 'hair') h += `<p class="note">Daha fazla parça mağazada seni bekliyor.</p>`;
      }
      o.body.innerHTML = h;
      $$('.seg [data-g]', o.body).forEach((b) => (b.onclick = () => { if (D.g === b.dataset.g) return; const keep = { sk: D.sk, hc: D.hc, ec: D.ec, ht: D.ht }; const nd = Object.assign(PW.defaultAvatar(b.dataset.g), keep); Object.keys(D).forEach((k) => delete D[k]); Object.assign(D, nd); draw(); pv.wave(); }));
      $$('.sw[data-k]', o.body).forEach((b) => (b.onclick = () => { D[b.dataset.k] = +b.dataset.i; draw(); }));
      $$('[data-o]', o.body).forEach((b) => (b.onclick = () => { D[b.dataset.o] = b.dataset.v; draw(); }));
      $$('[data-t]', o.body).forEach((b) => (b.onclick = () => { D[b.dataset.t] = D[b.dataset.t] ? 0 : 1; draw(); }));
      const ht = $('#w-ht', o.body); if (ht) ht.oninput = () => { D.ht = +ht.value; clearTimeout(o._ht); o._ht = setTimeout(() => pv.setAvatar(D), 60); };
      $$('.it[data-item]', o.body).forEach((b) => (b.onclick = () => {
        const it = PW.ITEM[b.dataset.item];
        if (!A().isOwned(it.id)) { if (L < it.lvl) return ui.toast(it.name + ' kilitli', `Seviye ${it.lvl}'de açılır.`); return ui.confirmBuy(it, () => draw()); }
        if (it.slot === 'acc') { if (D.acc.includes(it.id)) D.acc = D.acc.filter((x) => x !== it.id); else { D.acc = D.acc.filter((x) => PW.ITEM[x].sub !== it.sub); D.acc.push(it.id); } }
        else D[SLOT_KEY[it.slot]] = it.id;
        draw();
      }));
    };
    draw();
  };
  ui.renderChar = () => {
    const S = A().S;
    if (!ui._charOpen) { ui.charDraft = JSON.parse(JSON.stringify(S.av)); ui._charOpen = true; ui.charState = { slot: 'body' }; }
    const pv = ui.charPreview || (ui.charPreview = new PW.Preview($('#char-preview')));
    ui.charState.tabs = $('#char-tabs'); ui.charState.body = $('#char-body'); ui.charState.preview = pv; ui.charState.draft = ui.charDraft;
    ui.wardrobe(ui.charState);
    $('#char-save').onclick = () => { S.av = JSON.parse(JSON.stringify(ui.charDraft)); A().save(); PW.world.updateAvatarInfo('me', { cfg: S.av }); A().myAct(); A().publish(); ui._charOpen = false; ui.close(); ui.toast('Karakter kaydedildi', 'Yeni görünümün odadaki herkese yansıdı.'); };
    $('#char-cancel').onclick = () => { ui._charOpen = false; ui.close(); };
    $('#char-wave').onclick = () => pv.wave();
  };
  ui.confirmBuy = (it, after) => {
    const m = $('#m-buy'); m.classList.add('open');
    m.querySelector('.b-img').src = PW.thumb(it.id, A().S.av); m.querySelector('.b-name').textContent = it.name; m.querySelector('.b-price').innerHTML = COIN + it.price;
    const have = A().S.coins; m.querySelector('.b-after').textContent = have >= it.price ? `Kalan: ${have - it.price} jeton` : `${it.price - have} jeton eksik — biraz daha odaklan!`;
    const ok = m.querySelector('.b-ok'); ok.disabled = have < it.price;
    ok.onclick = () => { const r = A().buy(it.id); m.classList.remove('open'); if (r.ok) { PW.sfx('buy'); ui.toast('Satın alındı: ' + it.name, it.cat === 'furn' ? 'Düzenle bölümünden yerleştirebilirsin.' : 'Kullanıma hazır.'); } else ui.toast('Satın alınamadı', r.msg); after && after(); };
    m.querySelector('.b-no').onclick = () => m.classList.remove('open');
  };

  /* ---------------- world: social spaces + open rooms ---------------- */
  const CAT_COL = ['#E8553D', '#2F9A6B', '#8E6CC1', '#3E7CB1', '#E8803A', '#C9467E', '#1F8A8A', '#B58A2E'];
  ui.renderWorld = () => {
    const box = $('#world-body'); const S = A().S;
    const lobby = A().lobbyPeers;
    const counts = {}; lobby.forEach((p) => { const at = p.presence.at; if (at) counts[at] = (counts[at] || 0) + 1; });
    const rooms = lobby.filter((p) => p.presence.room && p.presence.room.o && p.presence.rd).map((p) => ({ p, pr: p.presence, key: 'h-' + p.presence.u, n: counts['h-' + p.presence.u] || 0 }));
    rooms.sort((a, b) => b.n - a.n);
    const social = PW.PUBLIC_ROOMS.filter((r) => r.kind === 'social');
    const card = (r) => `<button class="room-card" data-room="${r.id}"><span class="rc-img" style="background-image:url(${PW.thumb(r.view)})"></span><span class="rc-t"><b>${esc(r.name)}</b><small>${esc(r.desc)}</small><em>${(counts['r-' + r.id] || 0) + ' oyuncu'} · ${r.npc} müdavim</em></span></button>`;
    const initial = (s) => esc((s || '?').trim().charAt(0).toLocaleUpperCase('tr'));
    const myOpen = S.room.open;
    box.innerHTML = `
      <section><h3>Senin odan</h3><div class="dir"><article class="rcard mine"><div class="t"><span class="av" style="background:${CAT_COL[U.hashStr(S.uid) % 8]}">${initial(S.room.name)}</span><div><h4>${esc(S.room.name)}</h4><div class="meta"><span class="pill">${myOpen ? 'Açık' : 'Kapalı'}</span><span class="pill">${esc(S.room.cat)}</span><span class="pill">${(counts[A().homeKey()] || 0) + 1} kişi</span></div></div></div><p>${esc(S.room.desc || 'Açıklama ekle, odana gelecekler ne çalıştığını bilsin.')}</p><div class="row"><button class="btn sm" id="w-home" style="flex:1">Odama git</button><button class="btn sm ghost" id="w-set">Ayarlar · davet</button></div></article></div></section>
      <section><h3>Açık odalar <small>${rooms.length ? rooms.length + ' oda şu an açık' : ''}</small></h3>${rooms.length ? `<div class="dir">${rooms.map((r, i) => `<article class="rcard"><div class="t"><span class="av" style="background:${CAT_COL[U.hashStr(r.pr.u) % 8]}">${initial(r.pr.room.n)}</span><div><h4>${esc(r.pr.room.n)}</h4><div class="meta"><span class="pill">${r.pr.st === 'focus' ? 'Aktif' : 'Açık'}</span><span class="pill">${esc(r.pr.room.c || 'Genel')}</span><span class="pill">Sv ${r.pr.lv || 1}</span></div></div></div><p>${esc(r.pr.room.d || '')}</p><div class="row" style="justify-content:space-between"><small style="color:var(--dim)">${esc(r.pr.n)} · ${r.n} kişi çalışıyor</small></div><button class="btn sm" data-join="${i}">Katıl</button></article>`).join('')}</div>` : `<div class="empty">${MASCOT()}<b>Şu an açık oda yok</b><span>Odanı Açık yap, Dünya'da ilk sen listelen. Ya da davet linkini arkadaşlarınla paylaş.</span></div>`}</section>
      <section class="split">
        <div><h3>Davet kodun mu var?</h3><form id="code-form" class="row"><input id="code-in" placeholder="ör. ab12cd34ef-x7k2p9 ya da davet linki" autocomplete="off" aria-label="Davet kodu" style="flex:1"><button class="btn">Odaya gir</button></form></div>
        <div><h3>Şu an çevrimiçi <small>${lobby.length ? lobby.length + ' oyuncu' : 'henüz kimse yok'}</small></h3><ul class="community">${lobby.slice(0, 8).map((p) => `<li><i class="lv">${p.presence.lv || 1}</i><b>${esc(p.presence.n || 'Misafir')}</b><small>${esc(p.presence.atn || '')}${p.presence.st === 'focus' ? ' · odakta' : ''}</small></li>`).join('')}</ul></div>
      </section>
      <section><h3>Sosyal alanlar <small>Molada gez, sohbet et, yeni insanlarla tanış.</small></h3><div class="room-grid">${social.map(card).join('')}</div></section>`;
    $$('[data-room]', box).forEach((b) => b.addEventListener('click', () => { ui.close(); A().enterPublic(b.dataset.room); }));
    $$('[data-join]', box).forEach((b) => b.addEventListener('click', () => { const r = rooms[+b.dataset.join]; ui.close(); A().visitCode(r.pr.u, r.pr.rd, r.pr.n); }));
    $('#w-home').onclick = () => { ui.close(); A().enterHome(); };
    $('#w-set').onclick = () => ui.open('roomset');
    $('#code-form').onsubmit = (e) => { e.preventDefault(); const v = $('#code-in').value; if (!A().parseCode(v)) return ui.toast('Kod geçersiz', 'Davet kodunu ya da linkini olduğu gibi yapıştır.'); ui.close(); A().visitCode(v); };
  };
  ui.refreshCommunity = () => { if (ui.cur === 'world') ui.renderWorld(); };

  /* ---------------- room settings & invite ---------------- */
  ui.renderRoomSet = () => {
    const R = A().S.room, f = $('#roomset-form');
    const draft = { name: R.name, desc: R.desc, cat: R.cat, open: R.open };
    const draw = () => {
      f.innerHTML = `
        <label class="field">Oda adı<input id="rs-name" maxlength="32" value="${esc(draft.name)}"></label>
        <label class="field">Açıklama <small>Odaya girecekler ne çalıştığını görsün.</small><input id="rs-desc" maxlength="90" value="${esc(draft.desc || '')}" placeholder="ör. Sessiz çalışıyoruz, molada sohbet."></label>
        <div class="field">Kategori<div class="opt-grid">${PW.ROOM_CATS.map((c) => `<button type="button" class="${draft.cat === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>
        <div class="field">Kimler girebilir?<div class="vis"><button type="button" class="${draft.open ? 'on' : ''}" data-vis="1"><b>Açık</b><span>Dünya'daki oda listesinde görünür. Herkes katılabilir.</span></button><button type="button" class="closed ${draft.open ? '' : 'on'}" data-vis="0"><b>Kapalı</b><span>Listede görünmez. Sadece davet linki ya da koduyla girilir.</span></button></div></div>
        <div class="field">Davet linki<div class="linkbox"><input id="rs-link" readonly value="${esc(A().inviteLink())}" aria-label="Davet linki"><button type="button" class="btn sm" id="rs-copy">Kopyala</button></div><small>Kod: <span class="code">${esc(A().inviteCode())}</span>${R.open ? '' : ' · <button type="button" class="btn sm ghost" id="rs-new">Yeni link oluştur</button> (eski link çalışmaz)'}</small></div>
        <div class="foot"><button type="button" class="btn ghost" data-close>Vazgeç</button><button class="btn">Kaydet</button></div>`;
      $$('[data-cat]', f).forEach((b) => (b.onclick = () => { keep(); draft.cat = b.dataset.cat; draw(); }));
      $$('[data-vis]', f).forEach((b) => (b.onclick = () => { keep(); draft.open = b.dataset.vis === '1'; draw(); }));
      $('#rs-copy').onclick = async () => { const i = $('#rs-link'); try { await navigator.clipboard.writeText(i.value); ui.toast('Davet linki kopyalandı', 'Arkadaşına gönder; linke tıklayınca odana gelir.'); } catch (e) { i.select(); ui.toast('Linki seçtim', 'Kopyalamak için Cmd/Ctrl + C.'); } };
      const nb = $('#rs-new'); if (nb) nb.onclick = () => { R.token = Math.random().toString(36).slice(2, 8); A().save(); draw(); ui.toast('Yeni davet linki', 'Eski link artık çalışmaz.'); };
      $$('[data-close]', f).forEach((b) => (b.onclick = () => ui.close()));
    };
    const keep = () => { const n = $('#rs-name'), d = $('#rs-desc'); if (n) draft.name = n.value; if (d) draft.desc = d.value; };
    f.onsubmit = (e) => { e.preventDefault(); keep(); const name = (draft.name || '').trim(); if (name.length < 2) return ui.toast('Oda adı kısa', 'En az 2 karakter yaz.'); A().saveRoomSettings({ name: name.slice(0, 32), desc: (draft.desc || '').trim().slice(0, 90), cat: draft.cat, open: draft.open }); ui.close(); ui.toast('Oda kaydedildi', draft.open ? 'Odan Dünya\'da listeleniyor.' : 'Odan kapalı; sadece davetle girilebilir.'); };
    // the link shown must reflect the draft visibility
    const origOpen = R.open; draw();
    const syncLink = () => { const tmp = R.open; R.open = draft.open; const v = A().inviteLink(), c = A().inviteCode(); R.open = tmp; const l = $('#rs-link'); if (l) l.value = v; const ce = $('.code', f); if (ce) ce.textContent = c; };
    f.addEventListener('click', () => setTimeout(syncLink, 0)); syncLink(); void origOpen;
  };

  /* ---------------- quests ---------------- */
  ui.renderQuests = () => {
    const S = A().S, Q = S.q; A().questReset(); const box = $('#quests-body');
    const today = U.todayKey(); const claimed = Q.login.claimedDay === today; const idx = (Math.max(1, Q.login.streak) - 1) % 7;
    const row = (q, list) => { const c = list[q.id] || { p: 0, c: false }; const pct = Math.round((c.p / q.goal) * 100); return `<div class="qrow"><div class="n">${esc(q.name)}<small>${esc(q.desc)}</small></div><div class="rw">${c.c ? '<span style="color:var(--dim)">Alındı</span>' : c.p >= q.goal ? `<button class="btn sm" data-claim="${q.id}">Ödülü al</button>` : `<span class="pg">${c.p}/${q.goal}</span>`}<span>+${q.xp} XP</span>${q.coin ? `<span style="color:var(--gold)">+${q.coin}</span>` : ''}</div><div class="bar"><i style="width:${pct}%"></i></div></div>`; };
    const now = new Date(); const endDay = 24 - now.getHours(); const dow = (now.getDay() + 6) % 7;
    const P = Q.pledge;
    box.innerHTML = `<div class="qgrid"><div style="display:grid;gap:14px;align-content:start">
      <section class="qbox"><h3>Günlük giriş ödülleri <em>${Q.login.streak} gün üst üste</em></h3><div class="login7">${PW.LOGIN_REWARDS.map((r, i) => `<div class="${i < idx || (i === idx && claimed) ? 'done' : i === idx ? 'today' : ''}">${i + 1}<b>+${r}</b></div>`).join('')}</div>${claimed ? '<p class="note" style="margin:0">Bugünün ödülünü aldın. Yarın tekrar gel, seri büyüsün.</p>' : '<button class="btn" id="q-login">Bugünün ödülünü al</button>'}<p class="note" style="margin:0">Bir gün kaçırırsan ödüller baştan başlar.</p></section>
      <section class="qbox pledge"><h3>Kendine söz ver ${P && !P.finished ? `<em>${P.done.length}/${P.days} gün</em>` : ''}</h3>${P && !P.finished ? `<p style="margin:0;color:var(--muted)">Her gün <b>${P.min} dakika</b> odaklanacağına söz verdin. Ödül: +${P.coin} jeton · +${P.xp} XP</p><div class="bar"><i style="width:${Math.round((P.done.length / P.days) * 100)}%"></i></div><button class="btn sm ghost" id="q-pl-cancel">Sözü bırak</button>` : `<p style="margin:0;color:var(--muted)">Günlük hedefini ve süresini seç. Kaçırırsan ceza yok, sadece söz biter.</p><div class="field">Günde ne kadar?<div class="opt-grid" id="pl-min">${PW.PLEDGE_MIN.map((m, i) => `<button type="button" data-m="${m}" class="${i === 2 ? 'on' : ''}">${m} dk</button>`).join('')}</div></div><div class="field">Kaç gün boyunca?<div class="opt-grid" id="pl-days">${PW.PLEDGE_DAYS.map(([d, c, x], i) => `<button type="button" data-d="${d}" class="${i === 0 ? 'on' : ''}">${d} gün · +${c} jeton · +${x} XP</button>`).join('')}</div></div><button class="btn" id="q-pl-go">Söz ver</button>`}</section>
    </div><div style="display:grid;gap:14px;align-content:start">
      <section class="qbox"><h3>Günlük görevler <em>${endDay} saat kaldı</em></h3>${PW.QUESTS.daily.map((q) => row(q, Q.daily)).join('')}</section>
      <section class="qbox"><h3>Haftalık görevler <em>${7 - dow} gün kaldı</em></h3>${PW.QUESTS.weekly.map((q) => row(q, Q.weekly)).join('')}</section>
    </div></div>`;
    const lb = $('#q-login'); if (lb) lb.onclick = () => { A().claimLogin(); ui.renderQuests(); ui.refreshQuestBadge(); };
    $$('[data-claim]', box).forEach((b) => (b.onclick = () => { A().qClaim(b.dataset.claim); ui.renderQuests(); ui.refreshQuestBadge(); }));
    $$('#pl-min [data-m]', box).forEach((b) => (b.onclick = () => { $$('#pl-min button', box).forEach((x) => x.classList.remove('on')); b.classList.add('on'); }));
    $$('#pl-days [data-d]', box).forEach((b) => (b.onclick = () => { $$('#pl-days button', box).forEach((x) => x.classList.remove('on')); b.classList.add('on'); }));
    const go = $('#q-pl-go'); if (go) go.onclick = () => { A().setPledge(+$('#pl-min .on', box).dataset.m, +$('#pl-days .on', box).dataset.d); A().pledgeTick(); ui.renderQuests(); ui.toast('Söz verildi', 'Her gün hedefini tamamladığında ilerler.'); };
    const pc = $('#q-pl-cancel'); if (pc) pc.onclick = () => { S.q.pledge = null; A().save(); ui.renderQuests(); };
  };

  /* ---------------- shop ---------------- */
  const SHOP_TABS = [{ id: 'avatar', name: 'Karakter' }, { id: 'furn', name: 'Mobilya & Dekor' }, { id: 'theme', name: 'Hazır Tema' }, { id: 'view', name: 'Manzara' }, { id: 'size', name: 'Oda Boyutu' }];
  ui.shopTab = 'avatar'; ui.shopSub = 'Tümü'; ui.shopG = null;
  ui.renderShop = () => {
    const S = A().S, L = A().levelInfo().level; if (!ui.shopG) ui.shopG = S.av.g;
    $('#shop-tabs').innerHTML = SHOP_TABS.map((t) => `<button class="${t.id === ui.shopTab ? 'on' : ''}" data-t="${t.id}">${t.name}</button>`).join('');
    $$('#shop-tabs [data-t]').forEach((b) => (b.onclick = () => { ui.shopTab = b.dataset.t; ui.shopSub = 'Tümü'; ui.renderShop(); }));
    let items = PW.CATALOG.filter((i) => i.cat === ui.shopTab), subs = [];
    if (ui.shopTab === 'avatar') { subs = ['Tümü', 'Saç', 'Sakal', 'Üst', 'Alt', 'Ayakkabı', 'Aksesuar']; const map = { Saç: 'hair', Sakal: 'beard', Üst: 'top', Alt: 'bottom', Ayakkabı: 'shoes', Aksesuar: 'acc' }; items = items.filter((i) => i.g === 'u' || i.g === ui.shopG); if (ui.shopSub !== 'Tümü') items = items.filter((i) => i.slot === map[ui.shopSub]); }
    if (ui.shopTab === 'furn') { subs = ['Tümü', ...new Set(PW.ROOM_ITEMS.map((i) => i.sub))]; if (ui.shopSub !== 'Tümü') items = items.filter((i) => i.sub === ui.shopSub); }
    items = items.slice().sort((a, b) => a.lvl - b.lvl || a.price - b.price);
    const sub = $('#shop-sub');
    sub.innerHTML = (ui.shopTab === 'avatar' ? `<div class="seg"><button data-g="f" class="${ui.shopG === 'f' ? 'on' : ''}">Kadın</button><button data-g="m" class="${ui.shopG === 'm' ? 'on' : ''}">Erkek</button></div>` : '') + subs.map((s) => `<button class="chip ${s === ui.shopSub ? 'on' : ''}" data-s="${esc(s)}">${esc(s)}</button>`).join('');
    $$('[data-s]', sub).forEach((b) => (b.onclick = () => { ui.shopSub = b.dataset.s; ui.renderShop(); }));
    $$('[data-g]', sub).forEach((b) => (b.onclick = () => { ui.shopG = b.dataset.g; ui.renderShop(); }));
    const base = Object.assign({}, S.av, { g: ui.shopG });
    $('#shop-grid').innerHTML = items.map((it) => {
      const cnt = S.owned[it.id] || 0, own = cnt > 0, lock = L < it.lvl, multi = it.cat === 'furn';
      const state = own && !multi ? '<span class="own">Sende</span>' : lock ? `<span class="lock">${LOCK} Seviye ${it.lvl}</span>` : `<button class="btn sm buy" data-buy="${it.id}">${COIN}${it.price === 0 ? 'Ücretsiz' : it.price}</button>`;
      return `<article class="card ${lock ? 'is-lock' : ''} ${own && !multi ? 'is-own' : ''}"><img alt="" loading="lazy" src="${PW.thumb(it.id, base)}"><h4>${esc(it.name)}</h4><p>${it.cat === 'avatar' ? { hair: 'Saç', beard: 'Sakal', top: 'Üst giyim', bottom: 'Alt giyim', shoes: 'Ayakkabı', acc: 'Aksesuar' }[it.slot] : it.sub || { theme: 'Duvar + zemin + perde', view: 'Pencere manzarası', size: 'Oda büyütme' }[it.cat]}${multi && own ? ` · ${cnt} adet` : ''}</p>${state}</article>`;
    }).join('') || '<p class="note">Bu kategoride eşya yok.</p>';
    $$('[data-buy]', $('#shop-grid')).forEach((b) => (b.onclick = () => ui.confirmBuy(PW.ITEM[b.dataset.buy], () => { ui.renderShop(); ui.applyPurchase(b.dataset.buy); })));
    $('#shop-coins').innerHTML = COIN + '<b>' + S.coins + '</b>';
  };
  ui.applyPurchase = (id) => {
    const d = PW.ITEM[id], R = A().S.room; if (!A().isOwned(id)) return;
    if (d.cat === 'theme') { R.theme = id; delete R.wall; delete R.wallPat; delete R.floorT; delete R.floorC; delete R.trim; delete R.curtain; A().save(); A().rebuildHome(); }
    if (d.cat === 'view') { R.view = id; A().save(); A().rebuildHome(); }
    if (d.cat === 'size') { R.size = d.size; A().save(); A().rebuildHome(); }
  };

  /* ---------------- room designer ---------------- */
  ui.parkMe = () => { const w = PW.world; w.standAvatar('me'); const me = w.avatars.get('me'); if (me) { me.target = null; me.av.root.position.set(w.half - 0.6, 0, w.half - 0.6); me.av.setState('stand'); } };
  ui.setEditing = (on, quiet) => {
    const w = PW.world; if (!w) return;
    if (on && (!A().room || A().room.kind !== 'home')) { A().enterHome().then(() => ui.setEditing(true)); return; }
    if (on && ui.focusOpen) ui.closeFocus();
    const was = w.edit.on;
    w.setEdit(on); $('#editbar').hidden = !on; document.body.classList.toggle('editing', on);
    if (on) { ui.parkMe(); ui.renderEditBar(); if (!quiet) ui.toast('Odanı tasarla', 'Eşya seç → yere/duvara tıkla. Eşyaya tıklayınca rengini değiştirebilirsin.'); }
    else if (was && A().room && A().room.kind === 'home') { A().ensureSeated(true); A().myAct(); A().publish(); }
  };
  const roomSet = (patch) => { Object.assign(A().S.room, patch); A().save(); A().rebuildHome(); PW.world.setEdit(true); ui.parkMe(); ui.renderEditBar(); };
  ui.renderEditBar = () => {
    const S = A().S, R = S.room, w = PW.world, bar = $('#e-list'), sub = $('#e-sub'); const L = A().levelInfo().level;
    $$('#e-tabs [data-etab]').forEach((b) => b.classList.toggle('on', b.dataset.etab === ui.etab));
    const sel = w.edit.sel; const selIt = sel >= 0 ? R.items[sel] : null;
    $('#e-sel').textContent = selIt ? PW.ITEM[selIt.id].name : 'Seçili eşya yok';
    ['#e-rot', '#e-move', '#e-del'].forEach((q) => ($(q).disabled = !selIt));
    sub.innerHTML = ''; bar.innerHTML = '';
    const def = A().homeDef();
    if (ui.etab === 'furn') {
      if (selIt && !selIt.w) {
        sub.innerHTML = `<div class="swatches"><span class="lbl">Kumaş / renk</span>${PW.FABRIC_COLORS.map((c) => `<button class="sw ${selIt.c === c ? 'on' : ''}" style="--c:${c}" data-ic="${c}" aria-label="Renk"></button>`).join('')}</div><div class="swatches"><span class="lbl">Ahşap</span>${Object.entries(PW.WOOD_TONES).map(([k, c]) => `<button class="sw ${selIt.wd === k ? 'on' : ''}" style="--c:${c}" data-iw="${k}" aria-label="${k}"></button>`).join('')}</div>`;
        $$('[data-ic]', sub).forEach((b) => (b.onclick = () => { selIt.c = b.dataset.ic; A().save(); A().rebuildHome(); w.setEdit(true); ui.parkMe(); w.select(sel); ui.renderEditBar(); }));
        $$('[data-iw]', sub).forEach((b) => (b.onclick = () => { selIt.wd = b.dataset.iw; A().save(); A().rebuildHome(); w.setEdit(true); ui.parkMe(); w.select(sel); ui.renderEditBar(); }));
      }
      const ids = Object.keys(S.owned).filter((id) => PW.ITEM[id] && PW.ITEM[id].cat === 'furn').sort((a, b) => ((A().available(b) > 0) - (A().available(a) > 0)) || PW.ITEM[a].sub.localeCompare(PW.ITEM[b].sub));
      bar.innerHTML = ids.map((id) => { const av = A().available(id); return `<button class="eit ${av > 0 ? '' : 'none'}" data-place="${id}" ${av > 0 ? '' : 'disabled'} title="${esc(PW.ITEM[id].name)}"><img alt="" src="${PW.thumb(id)}"><span>${esc(PW.ITEM[id].name)}</span><i>${av}</i></button>`; }).join('') + `<button class="eit shop" data-open-shop="1"><span>Mağazaya git</span></button>`;
      $$('[data-place]', bar).forEach((b) => (b.onclick = () => { w.select(-1); w.startGhost(b.dataset.place, 0); ui.renderEditBar(); }));
      const sb = $('[data-open-shop]', bar); if (sb) sb.onclick = () => { ui.shopTab = 'furn'; ui.open('shop'); };
    } else if (ui.etab === 'wall') {
      sub.innerHTML = `<div class="swatches"><span class="lbl">Duvar rengi</span>${PW.WALL_COLORS.map((c) => `<button class="sw ${R.wall === c ? 'on' : ''}" style="--c:${c}" data-wc="${c}"></button>`).join('')}<input type="color" id="e-wc" value="${R.wall || '#E9DCC8'}" aria-label="Özel renk" style="width:34px;height:30px;padding:0;border-radius:8px"></div><div class="swatches"><span class="lbl">Süpürgelik</span>${['#7A5233', '#F6F4EF', '#2A2B33', '#C9A35A', '#1F5FA8', '#2F7D5B'].map((c) => `<button class="sw ${R.trim === c ? 'on' : ''}" style="--c:${c}" data-tc="${c}"></button>`).join('')}</div>`;
      bar.innerHTML = PW.WALL_PATTERNS.map(([k, n]) => { const lv = PW.SURFACE_LVL[k] || 1; const lock = L < lv; return `<button class="eit ${(R.wallPat || 'plain') === k ? 'on' : ''} ${lock ? 'none' : ''}" data-wp="${k}" ${lock ? 'disabled' : ''}><span class="pat" style="background-image:url(${PW.surfaceSwatch('wallPat', k, def)})">${lock ? `<em>Sv ${lv}</em>` : ''}</span><span>${n}</span></button>`; }).join('');
      $$('[data-wc]', sub).forEach((b) => (b.onclick = () => roomSet({ wall: b.dataset.wc })));
      $('#e-wc').onchange = (e) => roomSet({ wall: e.target.value });
      $$('[data-tc]', sub).forEach((b) => (b.onclick = () => roomSet({ trim: b.dataset.tc })));
      $$('[data-wp]', bar).forEach((b) => (b.onclick = () => roomSet({ wallPat: b.dataset.wp, wall: R.wall || PW.surfaceOf(def).wall })));
    } else if (ui.etab === 'floor') {
      sub.innerHTML = `<div class="swatches"><span class="lbl">Zemin rengi</span>${PW.FLOOR_COLORS.map((c) => `<button class="sw ${R.floorC === c ? 'on' : ''}" style="--c:${c}" data-fc="${c}"></button>`).join('')}</div>`;
      bar.innerHTML = PW.FLOOR_TYPES.map(([k, n]) => { const lv = PW.SURFACE_LVL[k] || 1; const lock = L < lv; return `<button class="eit ${(R.floorT || PW.surfaceOf(def).pat) === k ? 'on' : ''} ${lock ? 'none' : ''}" data-ft="${k}" ${lock ? 'disabled' : ''}><span class="pat" style="background-image:url(${PW.surfaceSwatch('floorT', k, def)})">${lock ? `<em>Sv ${lv}</em>` : ''}</span><span>${n}</span></button>`; }).join('');
      $$('[data-fc]', sub).forEach((b) => (b.onclick = () => roomSet({ floorC: b.dataset.fc })));
      $$('[data-ft]', bar).forEach((b) => (b.onclick = () => roomSet({ floorT: b.dataset.ft, floorC: R.floorC || PW.surfaceOf(def).floor })));
    } else if (ui.etab === 'mood') {
      const cur = R.mood || PW.defaultMoodFor(R.view);
      const grad = { day: 'linear-gradient(90deg,#FFE9CF,#9FD0FF)', golden: 'linear-gradient(90deg,#FFAE68,#F27A5A)', night: 'linear-gradient(90deg,#2D3E63,#6F7BD9)', neon: 'linear-gradient(90deg,#FF3FA4,#26D8FF)', candle: 'linear-gradient(90deg,#3A2010,#FF8A3A)' };
      const desc = { day: 'Aydınlık ve ferah', golden: 'Sıcak, turuncu ışık', night: 'Lambalar ve yıldızlar', neon: 'Pembe-mavi parıltı', candle: 'Loş, titreşen sıcaklık' };
      bar.innerHTML = Object.entries(PW.MOODS).map(([k, m]) => { const lv = PW.MOOD_LVL[k] || 1; const lock = L < lv; return `<button class="mood ${cur === k ? 'on' : ''}" data-mood="${k}" ${lock ? 'disabled style="opacity:.5"' : ''}><i style="background:${grad[k]}"></i><b>${m.name}</b><span>${lock ? 'Seviye ' + lv : desc[k]}</span></button>`; }).join('');
      sub.innerHTML = `<div class="swatches"><span class="lbl">Perde</span>${['#C98FA6', '#2F7D5B', '#22406E', '#E9DCC8', '#C7432F', '#F2C14E', '#5B6270', '#8E6CC1'].map((c) => `<button class="sw ${R.curtain === c ? 'on' : ''}" style="--c:${c}" data-cc="${c}"></button>`).join('')}</div>`;
      $$('[data-mood]', bar).forEach((b) => (b.onclick = () => roomSet({ mood: b.dataset.mood })));
      $$('[data-cc]', sub).forEach((b) => (b.onclick = () => roomSet({ curtain: b.dataset.cc })));
    } else {
      const cat = ui.etab; const cur = cat === 'theme' ? R.theme : cat === 'view' ? R.view : 'sz_' + { 7: 's', 9: 'm', 11: 'l' }[R.size];
      bar.innerHTML = PW.CATALOG.filter((i) => i.cat === cat).map((it) => { const own = A().isOwned(it.id); return `<button class="eit ${it.id === cur ? 'on' : ''} ${own ? '' : 'none'}" data-apply="${it.id}" title="${esc(it.name)}"><img alt="" src="${PW.thumb(it.id)}"><span>${esc(it.name)}</span>${own ? '' : `<i class="p">${COIN}${it.price}</i>`}</button>`; }).join('');
      $$('[data-apply]', bar).forEach((b) => (b.onclick = () => { const it = PW.ITEM[b.dataset.apply]; if (!A().isOwned(it.id)) { if (L < it.lvl) return ui.toast(it.name + ' kilitli', `Seviye ${it.lvl}'de açılır.`); return ui.confirmBuy(it, () => { ui.applyPurchase(it.id); PW.world.setEdit(true); ui.parkMe(); ui.renderEditBar(); }); } if (it.cat === 'size' && it.size < R.size && R.items.some((x) => !x.w && (Math.abs(x.x) > it.size / 2 - 0.3 || Math.abs(x.z) > it.size / 2 - 0.3))) return ui.toast('Oda küçültülemedi', 'Önce kenardaki eşyaları ortaya taşı.'); ui.applyPurchase(it.id); PW.world.setEdit(true); ui.parkMe(); ui.renderEditBar(); }));
    }
  };
  ui.onPlace = (pos) => {
    const S = A().S;
    if (A().available(pos.id) <= 0) return ui.toast('Envanterde kalmadı', 'Mağazadan bir tane daha alabilirsin.');
    S.room.items.push(pos); A().save(); A().checkAch(); A().qProg('w_decor', 1);
    A().rebuildHome(); PW.world.setEdit(true); ui.parkMe(); ui.renderEditBar();
    if (A().available(pos.id) > 0) PW.world.startGhost(pos.id, pos.r || 0, { c: pos.c, wd: pos.wd });
  };
  ui.editRotate = () => { const w = PW.world; if (w.rotateGhost()) return; const S = A().S, i = w.edit.sel; if (i < 0 || !S.room.items[i] || S.room.items[i].w) return; S.room.items[i].r = ((S.room.items[i].r || 0) + 1) % 4; A().save(); A().rebuildHome(); w.setEdit(true); ui.parkMe(); w.select(i); ui.renderEditBar(); };
  ui.editRemove = () => { const w = PW.world, S = A().S, i = w.edit.sel; if (i < 0 || !S.room.items[i]) return; S.room.items.splice(i, 1); A().save(); A().rebuildHome(); w.setEdit(true); ui.parkMe(); w.select(-1); ui.renderEditBar(); };
  ui.editMove = () => { const w = PW.world, S = A().S, i = w.edit.sel; if (i < 0 || !S.room.items[i]) return; const it = S.room.items.splice(i, 1)[0]; A().save(); A().rebuildHome(); w.setEdit(true); ui.parkMe(); w.select(-1); w.startGhost(it.id, it.r || 0, { c: it.c, wd: it.wd }); ui.renderEditBar(); };

  /* ---------------- profile ---------------- */
  ui.renderProfile = () => {
    const S = A().S, li = A().levelInfo(), wx = A().weekXP(), lg = PW.leagueFor(wx), next = PW.LEAGUES.find((l) => l.min > wx);
    const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push({ lab: d.toLocaleDateString('tr-TR', { weekday: 'short' }), v: S.stats.days[U.todayKey(d)] || 0 }); }
    const max = Math.max(60, ...days.map((d) => d.v)); const W = 320, H = 140, bw = 30, gap = (W - 7 * bw) / 8;
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
        <label class="ck"><input type="checkbox" id="set-npc" ${S.settings.npc ? 'checked' : ''}> Sosyal alanlarda müdavim NPC'leri göster</label>
        <label class="ck"><input type="checkbox" id="set-auto" ${S.settings.autoNext ? 'checked' : ''}> Mola bitince yeni turu otomatik başlat</label>
        <div class="row custom"><span>Özel süre</span><label>Odak <input type="number" id="set-cf" min="5" max="180" value="${S.settings.custom.focus}"> dk</label><label>Mola <input type="number" id="set-cb" min="1" max="60" value="${S.settings.custom.brk}"> dk</label><label>Uzun <input type="number" id="set-cl" min="5" max="60" value="${S.settings.custom.long}"> dk</label></div>
        <label>Grafik kalitesi <select id="set-gfx"><option value="high">Yüksek (ışık parlaması, yumuşak gölge)</option><option value="low">Hafif (eski cihazlar için)</option></select></label>
        <label>Demo hızı <select id="set-speed"><option value="1">Gerçek zaman</option><option value="10">×10 (deneme)</option><option value="60">×60 (1 sn = 1 dk)</option></select></label>
        <p class="note">Demo hızı sadece denemek içindir; gerçek kullanımda “Gerçek zaman”da bırak.</p>
        <div class="row"><button class="btn">Kaydet</button><button type="button" class="btn ghost" id="set-tour">Tanıtım turunu tekrar izle</button></div>
      </form>`;
    $('#set-speed').value = String(S.settings.speed || 1); $('#set-gfx').value = S.settings.gfx || 'high';
    $('#set-tour').onclick = () => { ui.close(); if (!A().room || A().room.kind !== 'home') A().enterHome(); setTimeout(() => ui.startTour(), 600); };
    $('#set-form').onsubmit = (e) => {
      e.preventDefault(); const n = $('#set-name').value.trim().slice(0, 20); if (n.length >= 2) S.name = n;
      S.settings.sound = $('#set-sound').checked; const npcBefore = S.settings.npc; S.settings.npc = $('#set-npc').checked; S.settings.autoNext = $('#set-auto').checked;
      S.settings.custom = { focus: U.clamp(+$('#set-cf').value || 25, 5, 180), brk: U.clamp(+$('#set-cb').value || 5, 1, 60), long: U.clamp(+$('#set-cl').value || 15, 5, 60) };
      S.settings.speed = +$('#set-speed').value || 1; S.settings.gfx = $('#set-gfx').value; PW.world.setQuality(S.settings.gfx);
      A().save(); ui.refreshHUD(); ui.refreshTimer(); A().publish(); A().publishLobby(); ui.toast('Ayarlar kaydedildi', '');
      if (npcBefore !== S.settings.npc && A().room && A().room.kind === 'social') A().enterRoom(A().room);
    };
  };
})();
