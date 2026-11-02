/* Pomodoro World — v4 features:
   1) "Birlikte" group sessions   2) Yapılacaklar (to-dos with pomodoro estimates)   3) ambient soundscapes
   4) friends                       5) focus insights (calendar, categories, hours)
   plus the public-use UI: person card (friend / block / remove from room), backups, blocking screens, PWA. */
(function () {
  const PW = window.PW, U = PW.util, ui = PW.ui, A = () => PW.app;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = U.esc;
  const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>';
  const ago = (t) => { if (!t) return 'henüz görülmedi'; const m = Math.round((Date.now() - t) / 60000); return m < 2 ? 'az önce' : m < 60 ? `${m} dk önce` : m < 1440 ? `${Math.round(m / 60)} saat önce` : `${Math.round(m / 1440)} gün önce`; };

  /* ================= shared bits ================= */
  ui.toastAction = (title, body, label, fn, ms = 10000) => {
    const t = document.createElement('div'); t.className = 'toast has-act';
    t.innerHTML = `<b>${esc(title)}</b>${body ? `<span>${esc(body)}</span>` : ''}<div class="act"><button class="go" type="button">${esc(label)}</button><button class="ghost no" type="button">Kapat</button></div>`;
    $('#toasts').appendChild(t);
    const close = () => { t.classList.add('out'); setTimeout(() => t.remove(), 500); };
    t.querySelector('.go').onclick = () => { close(); fn(); }; t.querySelector('.no').onclick = close; setTimeout(close, ms);
  };
  // floating popovers anchored to a button
  let openPop = null;
  ui.showPop = (pop, anchor) => {
    if (openPop && openPop !== pop) openPop.hidden = true;
    pop.hidden = false; openPop = pop;
    const r = anchor.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    let x = U.clamp(r.left + r.width / 2 - pw / 2, 12, vw - pw - 12), y = r.top - ph - 10; if (y < 12) y = Math.min(vh - ph - 12, r.bottom + 10);
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
  };
  ui.hidePop = () => { if (openPop) openPop.hidden = true; openPop = null; };
  document.addEventListener('pointerdown', (e) => { if (openPop && !openPop.contains(e.target) && !e.target.closest('[data-pop-anchor]')) ui.hidePop(); PW.sound && PW.sound.unlock(); }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') ui.hidePop(); });
  // chart tooltip (hover on any [data-tip])
  const tip = document.createElement('div'); tip.className = 'chart-tip'; tip.hidden = true; document.body.appendChild(tip);
  document.addEventListener('pointermove', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (!el) { tip.hidden = true; return; } tip.textContent = el.dataset.tip; tip.hidden = false; tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 8, e.clientX + 12) + 'px'; tip.style.top = e.clientY - 34 + 'px'; });

  /* ================= blocking screens ================= */
  const BLK = {
    'tab-boot': { i: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="13" height="10" rx="2"/><rect x="8" y="9" width="13" height="10" rx="2"/></svg>', t: 'Başka bir sekmede açık', p: 'Pomodoro World bu tarayıcıda zaten açık. İlerlemen karışmasın diye aynı anda tek sekmede çalışır.', b: 'Burada kullan' },
    tab: { i: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="13" height="10" rx="2"/><rect x="8" y="9" width="13" height="10" rx="2"/></svg>', t: 'Bu sekme duraklatıldı', p: 'Pomodoro World başka bir sekmede açıldı. Sayacın ve ilerlemen orada devam ediyor.', b: 'Burada devam et' },
    nogl: { i: '<svg viewBox="0 0 24 24"><path d="M12 3l9 5v8l-9 5-9-5V8z"/><path d="M4 4l16 16"/></svg>', t: '3D desteklenmiyor', p: 'Tarayıcın ya da cihazın WebGL’i kapatmış. Donanım hızlandırmayı açmayı veya güncel bir Chrome, Edge, Firefox ya da Safari kullanmayı dene.', b: 'Tekrar dene' },
  };
  PW.fillBlocker = (kind) => { const k = BLK[kind]; const ov = $('#blocker'); if (!k || !ov) return; ov.dataset.kind = kind; $('.blk-ico', ov).innerHTML = k.i; $('.blk-t', ov).textContent = k.t; $('.blk-p', ov).textContent = k.p; $('#blk-go').textContent = k.b; if (kind !== 'tab-boot') $('#blk-go').onclick = () => location.reload(); };
  ui.showBlocker = (kind) => { PW.fillBlocker(kind); $('#blocker').hidden = false; };

  /* ================= person card: friend · block · remove from my room · work together ================= */
  ui.openPerson = (avId) => {
    const key = avId.slice(2), p = A().peers.get(key); if (!p) return;
    const pr = p.presence, S = A().S, uid = p.uid; const fr = !!S.friends[uid], home = A().room && A().room.kind === 'home';
    const following = A().follow && A().follow.uid === uid;
    $('#ps-name').innerHTML = `${esc(pr.n)}<span class="tagid">${PW.safe.tag(uid)}</span>`;
    $('#ps-sub').textContent = `Seviye ${pr.lv} · ${PW.titleFor(pr.lv)}`;
    const st = pr.st === 'focus' ? `Odakta · ${U.fmtTime(pr.tl || 0)} kaldı` : pr.st === 'break' ? 'Molada' : pr.st === 'paused' ? 'Duraklattı' : 'Boşta';
    $('#ps-body').innerHTML = `<p class="ps-task">${esc(st)}${pr.tk ? ' · ' + esc(pr.tk) : ''}</p><div class="ps-actions">
      ${(pr.st === 'focus' || pr.st === 'break') && !following ? '<button class="btn" data-a="follow">Birlikte çalış · sayacına katıl</button>' : ''}
      ${following ? '<button class="btn ghost" data-a="unfollow">Ortak seanstan ayrıl</button>' : ''}
      <button class="btn ghost" data-a="wave">El salla</button>
      <button class="btn ghost" data-a="friend">${fr ? 'Arkadaşlıktan çıkar' : 'Arkadaş ekle'}</button>
      ${home ? '<button class="btn danger" data-a="kick">Odamdan çıkar</button>' : ''}
      <button class="btn danger" data-a="block">Engelle</button></div>`;
    $$('#ps-body [data-a]').forEach((b) => (b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'follow') A().followPeer(key);
      if (a === 'unfollow') A().unfollow('');
      if (a === 'wave') A().emote('wave');
      if (a === 'friend') { if (fr) delete S.friends[uid]; else S.friends[uid] = { n: pr.n, at: Date.now(), seen: Date.now() }; A().save(); ui.toast(fr ? 'Arkadaşlıktan çıkarıldı' : 'Arkadaş eklendi', pr.n); ui.refreshPeople(); }
      if (a === 'kick') { if (!S.room.ban.includes(uid)) S.room.ban.push(uid); S.room.banNames = Object.assign(S.room.banNames || {}, { [uid]: pr.n }); A().save(); A().publish(); PW.world.removeAvatar(p.avId); A().peers.delete(key); ui.refreshPeople(); ui.toast(pr.n + ' odandan çıkarıldı', 'Oda ayarlarından geri alabilirsin.'); }
      if (a === 'block') { S.blocked[uid] = { n: pr.n, at: Date.now() }; A().save(); PW.world.removeAvatar(p.avId); A().peers.delete(key); if (following) A().unfollow(''); ui.refreshPeople(); ui.toast(pr.n + ' engellendi', 'Artık onu görmeyecek, mesajlarını almayacaksın. Profil → Engellenenler.'); }
      ui.close();
    }));
    ui.open('person');
  };

  /* ================= 1) Birlikte — group sessions ================= */
  ui.groupInvite = (p) => { if (A().follow && A().follow.uid === p.uid) return; ui.toastAction(`${p.presence.n} birlikte çalışmaya çağırıyor`, 'Sayacına katıl, molaları birlikte verin.', 'Katıl', () => A().followPeer(p.peer)); };
  $('#btn-group').addEventListener('click', () => { if (A().startGroup()) ui.toast('Ortak seans başladı', 'Odadakilere davet gitti; katılanların sayacı seninkine eşitlenir.'); });

  /* ================= 2) Yapılacaklar ================= */
  const CAT = Object.fromEntries(PW.TASK_CATS);
  const todos = () => A().S.todos;
  const openTodos = () => todos().filter((t) => !t.ok);
  const selTodo = () => todos().find((t) => t.id === A().S.task.todoId) || null;
  ui.todoSelect = (id) => {
    const S = A().S, td = todos().find((t) => t.id === id);
    S.task.todoId = td ? td.id : null; S.task.text = td ? td.t : ''; if (td) S.task.cat = td.c;
    if (A().timer.phase === 'focus') A().timer.todo = S.task.todoId;
    A().save(); const fi = $('#fx-task'); if (fi) fi.value = S.task.text; ui.refreshTimer();
  };
  ui.todoAdd = (title, est = 1, cat) => {
    title = PW.safe.str(title, 60); if (!title) return null;
    const S = A().S; if (todos().length >= 150) { const i = todos().findIndex((t) => t.ok); if (i >= 0) todos().splice(i, 1); else return ui.toast('Liste dolu', 'Önce birkaç işi tamamla ya da sil.'), null; }
    const td = { id: Math.random().toString(36).slice(2, 9), t: title, est: U.clamp(est, 1, 12), done: 0, c: cat || S.task.cat || 'Ders', at: Date.now(), ok: false };
    todos().unshift(td); A().save(); return td;
  };
  ui.todoToggle = (id) => { const td = todos().find((t) => t.id === id); if (!td) return; td.ok = !td.ok; td.okAt = td.ok ? Date.now() : null; if (td.ok) { PW.sfx('buy'); if (A().S.task.todoId === id) ui.todoSelect(null); A().S.stats.todosDone = (A().S.stats.todosDone || 0) + 1; } A().save(); };
  ui.todoDone = (td) => ui.toastAction(`“${td.t}” için tahmin doldu`, `${td.done}/${td.est} pomodoro. İş bitti mi?`, 'Bitti olarak işaretle', () => { ui.todoToggle(td.id); ui.renderTodoAll && ui.renderTodoAll(); });
  const pomos = (td) => { const n = Math.max(td.est, td.done); let h = ''; for (let i = 0; i < Math.min(n, 12); i++) h += `<i class="${i < td.done ? (i >= td.est ? 'over' : 'on') : ''}"></i>`; return `<span class="pomos" data-tip="${td.done}/${td.est} pomodoro">${h}</span>`; };
  const row = (td, sel) => `<li class="td ${td.ok ? 'ok' : ''} ${sel ? 'sel' : ''}" data-id="${td.id}"><button type="button" class="chk" data-chk aria-label="${td.ok ? 'Geri al' : 'Tamamlandı'}">${td.ok ? CHECK : ''}</button><button type="button" class="t" data-pick title="${esc(td.t)}">${esc(td.t)}</button>${pomos(td)}<button type="button" class="del" data-del aria-label="Sil">×</button></li>`;
  let est = 1;
  const addRow = (withCat) => `<form class="td-add" data-add><input maxlength="60" placeholder="Yeni iş ekle…" aria-label="Yeni iş"><div class="stepper" aria-label="Tahmini pomodoro"><button type="button" data-st="-1">−</button><b data-tip="Tahmini pomodoro">${est} pomo</b><button type="button" data-st="1">+</button></div>${withCat ? `<select aria-label="Kategori">${PW.TASK_CATS.map(([n]) => `<option ${n === A().S.task.cat ? 'selected' : ''}>${n}</option>`).join('')}</select>` : '<button class="btn sm">Ekle</button>'}</form>`;
  const wire = (root, rerender) => {
    $$('[data-chk]', root).forEach((b) => (b.onclick = () => { ui.todoToggle(b.closest('[data-id]').dataset.id); rerender(); }));
    $$('[data-del]', root).forEach((b) => (b.onclick = () => { const id = b.closest('[data-id]').dataset.id; const i = todos().findIndex((t) => t.id === id); if (i >= 0) todos().splice(i, 1); if (A().S.task.todoId === id) ui.todoSelect(null); A().save(); rerender(); }));
    $$('[data-pick]', root).forEach((b) => (b.onclick = () => { const id = b.closest('[data-id]').dataset.id; const td = todos().find((t) => t.id === id); if (td && td.ok) return; ui.todoSelect(A().S.task.todoId === id ? null : id); rerender(); }));
    const f = $('[data-add]', root); if (!f) return;
    $$('[data-st]', f).forEach((b) => (b.onclick = () => { est = U.clamp(est + +b.dataset.st, 1, 12); $('b', f.querySelector('.stepper')).textContent = est + ' pomo'; }));
    f.onsubmit = (e) => { e.preventDefault(); const inp = $('input', f); const sel = $('select', f); const td = ui.todoAdd(inp.value, est, sel ? sel.value : undefined); if (td) { ui.todoSelect(td.id); est = 1; } rerender(); setTimeout(() => { const i = $('[data-add] input', root); i && i.focus(); }, 0); };
  };
  ui.renderTodoPop = () => {
    const pop = $('#todo-pop'); const sel = selTodo();
    const list = openTodos().slice(0, 8);
    pop.innerHTML = `<h4>Ne üzerinde çalışıyorsun? <button type="button" class="btn sm ghost" data-all>Tümü</button></h4><ul class="td-list">${list.map((t) => row(t, sel && sel.id === t.id)).join('') || '<li class="note">Henüz iş yok. Aşağıdan ekle; kaç pomodoro süreceğini tahmin et.</li>'}</ul>${addRow(false)}`;
    wire(pop, ui.renderTodoPop);
    $('[data-all]', pop).onclick = () => { ui.hidePop(); ui.open('todo'); };
  };
  ui.renderTodoAll = () => {
    const box = $('#todo-body'); const sel = selTodo(); const today = U.todayKey();
    const open = openTodos(), done = todos().filter((t) => t.ok && t.okAt && U.todayKey(new Date(t.okAt)) === today);
    const est = open.reduce((a, t) => a + Math.max(0, t.est - t.done), 0);
    box.innerHTML = `${addRow(true)}<p class="note" style="margin:10px 0">${open.length} açık iş · yaklaşık ${est} pomodoro (${U.fmtMin(est * A().preset().focus)})</p><ul class="td-list">${open.map((t) => row(t, sel && sel.id === t.id)).join('')}</ul>${done.length ? `<h4 style="margin:16px 0 8px">Bugün bitenler</h4><ul class="td-list">${done.map((t) => row(t)).join('')}</ul>` : ''}`;
    wire(box, ui.renderTodoAll);
  };
  const openTodoPop = (anchor) => { ui.renderTodoPop(); ui.showPop($('#todo-pop'), anchor); };
  $('#fx-list').dataset.popAnchor = 1; $('#mini-todo').dataset.popAnchor = 1;
  $('#fx-list').addEventListener('click', (e) => { const p = $('#todo-pop'); if (!p.hidden) return ui.hidePop(); openTodoPop(e.currentTarget); });
  $('#mini-todo').addEventListener('click', () => ui.open('todo'));
  // the focus screen task line: Enter adds a new to-do and selects it
  const fxTask = $('#fx-task');
  fxTask.addEventListener('keydown', (e) => { if (e.key !== 'Enter') return; e.preventDefault(); const v = fxTask.value.trim(); if (!v) return; const ex = openTodos().find((t) => t.t.toLocaleLowerCase('tr') === v.toLocaleLowerCase('tr')); const td = ex || ui.todoAdd(v, 1); if (td) ui.todoSelect(td.id); fxTask.blur(); ui.toast('Göreve bağlandı', `“${td.t}” · odaklandıkça ilerler`); });
  fxTask.addEventListener('input', () => { if (A().S.task.todoId) { A().S.task.todoId = null; A().timer.todo = null; } });

  /* ================= 3) ambient sound ================= */
  const SND = () => A().S.sound;
  const soundState = () => { const s = SND(), T = A().timer; const any = Object.values(s.mix).some((v) => v > 0); return any && (!s.focusOnly || (T.phase === 'focus' && T.running)); };
  let sndKey = '';
  ui.syncSound = (force) => {
    if (!PW.sound || !PW.sound.ok()) return; const s = SND(); const play = soundState();
    const key = JSON.stringify([s.mix, s.vol, play]); if (!force && key === sndKey) return; sndKey = key;
    PW.sound.apply(s.mix, play, s.vol);
    $$('#mini-snd, #fx-snd').forEach((b) => b.classList.toggle('on', play));
  };
  ui.renderSound = () => {
    const pop = $('#snd-pop'), s = SND(), L = PW.sound.LAYERS; const view = A().room && A().room.def && A().room.def.view;
    const sug = PW.sound.suggest(view);
    pop.innerHTML = `<h4>Ortam sesleri</h4>${Object.entries(L).map(([id, l]) => `<label class="snd-row ${s.mix[id] > 0 ? 'on' : ''}"><svg viewBox="0 0 24 24" aria-hidden="true">${l.i}</svg><b>${l.n}</b><input type="range" min="0" max="100" value="${Math.round((s.mix[id] || 0) * 100)}" data-l="${id}" aria-label="${l.n} ses düzeyi"></label>`).join('')}
      <label class="snd-row"><svg viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6L8 10z"/></svg><b>Genel</b><input type="range" min="0" max="100" value="${Math.round(s.vol * 100)}" data-master aria-label="Genel ses"></label>
      <label class="ck"><input type="checkbox" data-fo ${s.focusOnly ? 'checked' : ''}> Sadece odak sırasında çal</label>
      <button type="button" class="sugg" data-sug>Manzarana uygun: ${sug.map((k) => L[k].n).join(' + ')}</button>
      <p class="note">Sesler cihazında üretilir; internet kullanmaz.</p>`;
    $$('[data-l]', pop).forEach((r) => (r.oninput = () => { s.mix[r.dataset.l] = r.value / 100; r.closest('.snd-row').classList.toggle('on', r.value > 0); A().save(); ui.syncSound(); }));
    $('[data-master]', pop).oninput = (e) => { s.vol = e.target.value / 100; A().save(); ui.syncSound(); };
    $('[data-fo]', pop).onchange = (e) => { s.focusOnly = e.target.checked; A().save(); ui.syncSound(); if (!soundState() && Object.values(s.mix).some((v) => v > 0)) ui.toast('Sesler odakta çalacak', 'Bir pomodoro başlattığında duyacaksın.'); };
    $('[data-sug]', pop).onclick = () => { for (const k of Object.keys(L)) s.mix[k] = sug.includes(k) ? 0.6 : 0; s.focusOnly = s.focusOnly && A().timer.phase === 'focus'; A().save(); ui.renderSound(); ui.syncSound(); };
  };
  ['#mini-snd', '#fx-snd'].forEach((sel) => { const b = $(sel); b.dataset.popAnchor = 1; b.addEventListener('click', () => { const p = $('#snd-pop'); if (!p.hidden) return ui.hidePop(); if (!PW.sound.ok()) return ui.toast('Ses desteklenmiyor', 'Tarayıcın WebAudio desteklemiyor.'); ui.renderSound(); ui.showPop(p, b); ui.syncSound(true); }); });

  /* ================= 4) friends ================= */
  let seenSaveT = 0;
  A().friendSeen = (list) => {
    const F = A().S.friends; let ch = false;
    for (const p of list) { const pr = p.presence; if (!pr || !F[pr.u]) continue; F[pr.u].seen = Date.now(); if (pr.n && F[pr.u].n !== pr.n) F[pr.u].n = pr.n; ch = true; }
    if (ch && Date.now() - seenSaveT > 60000) { seenSaveT = Date.now(); A().save(); }
  };
  const friendsHTML = () => {
    const S = A().S, F = S.friends, online = new Map();
    A().lobbyPeers.forEach((p) => online.set(p.presence.u, p.presence));
    for (const p of A().peers.values()) if (!online.has(p.uid)) online.set(p.uid, Object.assign({ here: true }, p.presence));
    const ids = Object.keys(F).sort((a, b) => (online.has(b) - online.has(a)) || ((F[b].seen || 0) - (F[a].seen || 0)));
    const searching = A().lobby && !A().lobbyPeers.length && Date.now() - (A()._lobbyAt || 0) < 8000;
    const rows = ids.map((uid) => {
      const f = F[uid], on = online.get(uid);
      let where = on ? (on.here ? 'Seninle aynı odada' : on.atn ? on.atn : 'Çevrimiçi') : 'Son görülme ' + ago(f.seen);
      if (on && on.st === 'focus') where += ' · odakta';
      const act = on && !on.here ? (on.room && on.room.o && on.rd ? `<button class="btn sm" data-go-room="${uid}">Odasına git</button>` : /^r-[a-z]+(~\d+)?$/.test(on.at || '') ? `<button class="btn sm" data-go-pub="${esc(on.at)}">Yanına git</button>` : '') : '';
      return `<article class="rcard"><div class="t"><span class="av" style="background:${on ? '#2F9A6B' : '#3A3656'}">${esc((f.n || '?').charAt(0).toLocaleUpperCase('tr'))}</span><div><h4>${esc(f.n || 'Arkadaş')}<span class="tagid">${PW.safe.tag(uid)}</span></h4><div class="meta"><span class="pill">${esc(where)}</span></div></div></div><div class="row" style="justify-content:space-between">${act}<button class="btn sm ghost" data-unfriend="${uid}">Kaldır</button></div></article>`;
    }).join('');
    return `<section id="friends-sec"><h3>Arkadaşların <small>Senin kodun: <span class="code">${esc(S.uid.toUpperCase())}</span> <button type="button" class="btn sm ghost" data-copy-code>Kopyala</button></small></h3>
      ${ids.length ? `<div class="dir">${rows}</div>` : '<p class="note">Henüz arkadaşın yok. Kodunu paylaş ya da bir odada birinin üstüne tıklayıp “Arkadaş ekle” de.</p>'}
      ${searching ? '<p class="note">Çevrimiçi arkadaşlar aranıyor…</p>' : ''}
      <form class="row" data-add-friend style="margin-top:10px"><input placeholder="Arkadaş kodu (ör. ${esc(S.uid.slice(0, 6).toUpperCase())}…)" aria-label="Arkadaş kodu" style="flex:1" maxlength="14" autocomplete="off"><button class="btn sm">Ekle</button></form></section>`;
  };
  const wireFriends = (box) => {
    const S = A().S;
    $('[data-copy-code]', box).onclick = async () => { try { await navigator.clipboard.writeText(S.uid.toUpperCase()); ui.toast('Kodun kopyalandı', 'Arkadaşın Dünya → Arkadaşların bölümüne yapıştırsın.'); } catch (e) { ui.toast('Kodun', S.uid.toUpperCase()); } };
    $('[data-add-friend]', box).onsubmit = (e) => { e.preventDefault(); const v = $('input', e.currentTarget).value.trim().toLowerCase(); if (!PW.safe.uid(v)) return ui.toast('Kod geçersiz', 'Arkadaşının profilindeki kodu olduğu gibi yaz.'); if (v === S.uid) return ui.toast('Bu senin kodun', ''); if (S.blocked[v]) delete S.blocked[v]; S.friends[v] = S.friends[v] || { n: 'Arkadaş', at: Date.now(), seen: 0 }; A().save(); ui.toast('Arkadaş eklendi', 'Çevrimiçi olduğunda burada görünecek.'); ui.renderWorld(); };
    $$('[data-unfriend]', box).forEach((b) => (b.onclick = () => { delete S.friends[b.dataset.unfriend]; A().save(); ui.renderWorld(); }));
    $$('[data-go-room]', box).forEach((b) => (b.onclick = () => { const p = A().lobbyPeers.find((x) => x.presence.u === b.dataset.goRoom); if (!p) return; ui.close(); A().visitCode(p.presence.u, p.presence.rd, p.presence.n); }));
    $$('[data-go-pub]', box).forEach((b) => (b.onclick = () => { const m = b.dataset.goPub.match(/^r-([a-z]+)(?:~(\d+))?$/); if (!m) return; ui.close(); A().enterPublic(m[1], m[2] ? +m[2] : 1); }));
  };
  const origWorld = ui.renderWorld;
  ui.renderWorld = () => { origWorld(); const box = $('#world-body'); box.insertAdjacentHTML('afterbegin', friendsHTML()); wireFriends(box); if (A().lobby && !A().lobbyPeers.length && Date.now() - (A()._lobbyAt || 0) < 8000) setTimeout(() => ui.cur === 'world' && ui.renderWorld(), 3000); };

  // lobby is joined only while the World is open (or while you host an open room)
  const origOpen = ui.open, origClose = ui.close; let lobbyHeld = false;
  ui.open = (name) => {
    ui.hidePop();
    if (name === 'world' && !lobbyHeld) { lobbyHeld = true; A().lobbyUi(true); }
    else if (name !== 'world' && lobbyHeld) { lobbyHeld = false; A().lobbyUi(false); }
    origOpen(name);
    if (name === 'todo') ui.renderTodoAll();
  };
  ui.close = (silent) => { origClose(silent); if (lobbyHeld && !$('#m-world').classList.contains('open')) { lobbyHeld = false; A().lobbyUi(false); } };

  /* ================= 5) insights ================= */
  const HEAT = ['rgba(255,255,255,.07)', '#5B2B2E', '#8E3A2E', '#C64A35', '#F0644A'];
  const level = (m) => (m <= 0 ? 0 : m < 25 ? 1 : m < 60 ? 2 : m < 120 ? 3 : 4);
  const insightsHTML = () => {
    const S = A().S, days = S.stats.days, W = 26, cell = 11, gap = 3;
    const end = new Date(); end.setHours(0, 0, 0, 0); const start = new Date(end); start.setDate(start.getDate() - ((end.getDay() + 6) % 7) - (W - 1) * 7);
    let rects = '', months = '', lastM = -1, total = 0, active = 0;
    for (let w = 0; w < W; w++) for (let d = 0; d < 7; d++) {
      const dt = new Date(start); dt.setDate(start.getDate() + w * 7 + d); if (dt > end) continue;
      const k = U.todayKey(dt), m = days[k] || 0; total += m; if (m) active++;
      rects += `<rect x="${w * (cell + gap) + 22}" y="${d * (cell + gap) + 14}" width="${cell}" height="${cell}" fill="${HEAT[level(m)]}" data-tip="${dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}: ${m ? U.fmtMin(m) : 'odak yok'}"/>`;
      if (d === 0 && dt.getMonth() !== lastM) { lastM = dt.getMonth(); months += `<text class="mo" x="${w * (cell + gap) + 22}" y="9">${dt.toLocaleDateString('tr-TR', { month: 'short' })}</text>`; }
    }
    const dayLab = ['Pzt', '', 'Çar', '', 'Cum', '', ''].map((l, i) => (l ? `<text class="mo" x="0" y="${i * (cell + gap) + 23}">${l}</text>` : '')).join('');
    const svgW = W * (cell + gap) + 24, svgH = 7 * (cell + gap) + 16;
    // categories (last 30 days)
    const since = Date.now() - 30 * 864e5, cats = {};
    S.stats.log.forEach((b) => { const t = new Date(b.d).getTime(); if (t >= since) cats[b.c || 'Diğer'] = (cats[b.c || 'Diğer'] || 0) + b.m; });
    const catRows = Object.entries(cats).sort((a, b) => b[1] - a[1]); const cmax = Math.max(1, ...catRows.map((x) => x[1]));
    const hrs = Array.from({ length: 24 }, (_, h) => S.stats.hours[h] || 0); const hmax = Math.max(1, ...hrs);
    const best = hrs.indexOf(Math.max(...hrs));
    const doneT = S.stats.todosDone || 0;
    return `<section id="insights">
      <h4>Odak takvimi <small>son 6 ay · ${U.fmtMin(total)} · ${active} aktif gün</small></h4>
      <div class="heat-wrap"><svg class="heat" width="${svgW * 1.6}" height="${svgH * 1.6}" viewBox="0 0 ${svgW} ${svgH}" role="img" aria-label="Son 26 haftanın günlük odak dakikaları">${months}${dayLab}${rects}</svg></div>
      <div class="legend-seq">Az ${HEAT.map((c) => `<i style="background:${c}"></i>`).join('')} Çok</div>
      <h4>Kategoriler <small>son 30 gün</small></h4>
      ${catRows.length ? catRows.map(([c, m]) => `<div class="hbar"><span>${esc(c)}</span><span class="tr"><i style="width:${(m / cmax) * 100}%" data-tip="${esc(c)}: ${U.fmtMin(m)}"></i></span><b>${U.fmtMin(m)}</b></div>`).join('') : '<p class="note">İlk pomodorondan sonra burada dağılımı göreceksin.</p>'}
      <h4>Günün saatleri <small>${hmax > 1 ? `en verimli: ${String(best).padStart(2, '0')}:00` : 'henüz veri yok'}</small></h4>
      <div class="hours">${hrs.map((v, h) => `<i style="height:${Math.max(3, (v / hmax) * 100)}%" data-tip="${String(h).padStart(2, '0')}:00 · ${U.fmtMin(v)}"></i>`).join('')}</div><div class="hours-ax"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
      <p class="note">Tamamlanan iş: ${doneT}</p>
    </section>`;
  };
  const backupHTML = () => {
    const S = A().S, bl = Object.entries(S.blocked);
    return `<section id="safety-sec"><h4>Yedek <small>İlerlemen bu tarayıcıda saklanır</small></h4>
      <div class="backup"><button type="button" class="btn sm" data-export>Yedeği indir</button><button type="button" class="btn sm ghost" data-import>Yedekten yükle</button><input type="file" accept="application/json,.json" data-file hidden></div>
      <p class="note">Tarayıcı verilerini silersen ya da başka cihaza geçersen yedek dosyasıyla devam edersin.</p>
      <h4>Arkadaş kodun <small>${esc(S.uid.toUpperCase())}</small></h4>
      <h4>Engellenenler <small>${bl.length || 'yok'}</small></h4>
      <div class="banlist">${bl.map(([u, b]) => `<div><span>${esc(b.n || 'Oyuncu')} <span class="tagid">${PW.safe.tag(u)}</span></span><button type="button" class="btn sm ghost" data-unblock="${u}">Engeli kaldır</button></div>`).join('')}</div></section>`;
  };
  const origProfile = ui.renderProfile;
  ui.renderProfile = () => {
    origProfile();
    const body = $('#profile-body'); const ach = [...body.querySelectorAll('h4')].find((h) => h.textContent.startsWith('Başarımlar'));
    if (ach) ach.insertAdjacentHTML('beforebegin', insightsHTML()); else body.insertAdjacentHTML('beforeend', insightsHTML());
    body.insertAdjacentHTML('beforeend', backupHTML());
    $('[data-export]', body).onclick = async () => {
      const name = `pomodoro-world-yedek-${U.todayKey()}.json`, data = A().exportSave();
      // inside claude.ai the page cannot trigger downloads itself: the viewer confirms the save through the platform
      if (window.claude && typeof window.claude.use === 'function') {
        const dl = await window.claude.use('downloads').catch(() => null);
        if (dl) { try { await dl.save({ filename: name, data }); ui.toast('Yedek kaydedildi', 'Dosyayı güvenli bir yerde sakla.'); } catch (e) { if (e && e.code !== 'declined') ui.toast('Yedek kaydedilemedi', 'Bu görünümde dosya kaydı kullanılamıyor.', 'warn'); } return; }
      }
      const blob = new Blob([data], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); ui.toast('Yedek indirildi', 'Dosyayı güvenli bir yerde sakla.'); };
    const file = $('[data-file]', body);
    $('[data-import]', body).onclick = () => file.click();
    file.onchange = () => { const f = file.files[0]; if (!f) return; if (f.size > 2e6) return ui.toast('Dosya çok büyük', ''); const r = new FileReader(); r.onload = () => { if (!confirm('Bu yedek mevcut ilerlemenin yerine geçecek. Devam edilsin mi?')) return; const err = A().importSave(String(r.result)); if (err) ui.toast('Yedek yüklenemedi', err, 'warn'); }; r.readAsText(f); };
    $$('[data-unblock]', body).forEach((b) => (b.onclick = () => { delete A().S.blocked[b.dataset.unblock]; A().save(); ui.renderProfile(); }));
  };

  /* ================= room settings: people removed from my room ================= */
  const origRoomSet = ui.renderRoomSet;
  ui.renderRoomSet = () => {
    origRoomSet();
    const R = A().S.room, f = $('#roomset-form'); const old = $('#ban-sec'); if (old) old.remove();
    if (!R.ban.length) return;
    const names = R.banNames || {};
    f.insertAdjacentHTML('beforeend', `<div class="field" id="ban-sec">Odandan çıkarılanlar<div class="banlist">${R.ban.map((u) => `<div><span>${esc(names[u] || 'Oyuncu')} <span class="tagid">${PW.safe.tag(u)}</span></span><button type="button" class="btn sm ghost" data-unban="${u}">Geri al</button></div>`).join('')}</div></div>`);
    $$('[data-unban]', f).forEach((b) => (b.onclick = () => { R.ban = R.ban.filter((x) => x !== b.dataset.unban); A().save(); A().publish(); ui.renderRoomSet(); }));
  };

  /* ================= live UI hooks ================= */
  const origTimer = ui.refreshTimer;
  ui.refreshTimer = () => {
    origTimer();
    const F = A().follow, chip = $('#sync-chip');
    if (chip) { chip.hidden = !F; if (F) { chip.innerHTML = `<span>${esc(F.name)} ile birlikte</span><button type="button">Ayrıl</button>`; chip.querySelector('button').onclick = () => A().unfollow(''); } }
    if (F) { const ph = $('#fx-phase'); if (ph && !ph.textContent.includes(' ile')) ph.textContent = F.name + ' ile · ' + ph.textContent; }
    const sel = selTodo(); const fi = $('#fx-task'); if (fi && document.activeElement !== fi) fi.value = sel ? sel.t : A().S.task.text || '';
    ui.syncSound();
  };
  const origPeople = ui.refreshPeople;
  ui.refreshPeople = () => { origPeople(); const b = $('#btn-group'); if (b) b.hidden = !(A().peers.size > 0) || !!A().follow || A().timer.phase !== 'idle'; };
  const origChat = ui.addChat;
  ui.addChat = (m) => { if (m.uid && A().S.blocked[m.uid]) return; origChat(m); };

  /* ================= installable app (GitHub Pages / any https host) ================= */
  if ('serviceWorker' in navigator && document.querySelector('link[rel="manifest"]') && location.protocol === 'https:' && window.top === window) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();

/* nav: highlight where you are (open panel, otherwise your room / the World) */
(function () {
  const PW = window.PW, ui = PW.ui;
  const mark = () => {
    const open = document.querySelector('.modal.open'); const name = open ? open.id.replace('m-', '') : null;
    document.querySelectorAll('nav.main button').forEach((b) => b.classList.remove('on'));
    let el = name && document.querySelector(`nav.main [data-open="${name}"]`);
    if (!el && !name) { const k = PW.app.room && PW.app.room.kind; el = k === 'home' ? document.getElementById('nav-home') : k ? document.getElementById('nav-world') : null; }
    if (el) el.classList.add('on');
  };
  const o = ui.open, c = ui.close, rc = ui.onRoomChange;
  ui.open = (n) => { o(n); mark(); }; ui.close = (s) => { c(s); mark(); }; ui.onRoomChange = (a, b) => { rc(a, b); mark(); };
  setTimeout(mark, 0);
})();

/* ===== focus start screen (Odakoo-style): choose a kind of work and a duration, then start ===== */
(function () {
  const PW = window.PW, U = PW.util, ui = PW.ui, A = () => PW.app;
  const $ = (s) => document.querySelector(s);
  const ICO = {
    Ders: '<path d="M4 6l8-3 8 3-8 3z"/><path d="M7 7.5V12c0 1.5 2.2 3 5 3s5-1.5 5-3V7.5"/><path d="M20 6v5"/>',
    Okuma: '<path d="M3 6c3-1.5 6-1.5 9 0v13c-3-1.5-6-1.5-9 0zM21 6c-3-1.5-6-1.5-9 0v13c3-1.5 6-1.5 9 0z"/>',
    Kodlama: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
    Proje: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
    Yazı: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
    Dil: '<path d="M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M11 5c-1 4-4 7-7 8"/><path d="M13 21l4-9 4 9M14.5 18h5"/>',
    Diğer: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>',
  };
  // name shown on the button, colour from the task categories, and the matching desk animation
  const CATS = [['Ders', 'Ders', 'write'], ['Okuma', 'Okuma', 'read'], ['Kodlama', 'Kodlama', 'type'], ['Proje', 'Proje / İş', 'type'], ['Yazı', 'Yazı', 'write'], ['Dil', 'Dil', 'read'], ['Diğer', 'Diğer', 'type']];
  const COL = Object.fromEntries(PW.TASK_CATS);
  const DURS = () => [...PW.TIMER_PRESETS.map((p) => ({ id: p.id, f: p.focus, b: p.brk, hint: p.hint })), { id: 'custom', hint: 'Sana özel' }];
  const render = () => {
    const S = A().S;
    $('#fx-cats').innerHTML = CATS.map(([id, n]) => `<button type="button" class="fx-cat" role="radio" aria-checked="${S.task.cat === id}" data-cat="${id}" style="--c:${COL[id] || '#FF8466'}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICO[id]}</svg>${n}</button>`).join('');
    $('#fx-durs').innerHTML = DURS().map((d) => `<button type="button" class="fx-dur" role="radio" aria-checked="${S.settings.preset === d.id}" data-dur="${d.id}">${d.id === 'custom' ? `<b>${S.settings.custom.focus}<small> / ${S.settings.custom.brk}</small></b>` : `<b>${d.f}<small> / ${d.b}</small></b>`}<span>${d.hint}</span></button>`).join('');
    $('#fx-custom').hidden = S.settings.preset !== 'custom';
    $('#cs-focus').textContent = S.settings.custom.focus + ' dk'; $('#cs-brk').textContent = S.settings.custom.brk + ' dk';
    $('#fx-cats').querySelectorAll('[data-cat]').forEach((b) => (b.onclick = () => { const c = CATS.find((x) => x[0] === b.dataset.cat); S.task.cat = c[0]; S.settings.style = c[2]; A().save(); A().myAct(); render(); ui.refreshTimer(); }));
    $('#fx-durs').querySelectorAll('[data-dur]').forEach((b) => (b.onclick = () => { S.settings.preset = b.dataset.dur; A().save(); render(); ui.refreshTimer(); }));
  };
  document.querySelectorAll('[data-cs]').forEach((b) => (b.onclick = () => { const S = A().S, k = b.dataset.cs, lim = k === 'focus' ? [5, 180] : [1, 60]; S.settings.custom[k] = U.clamp(S.settings.custom[k] + +b.dataset.d, lim[0], lim[1]); S.settings.custom.long = Math.max(15, S.settings.custom.brk * 3); A().save(); render(); ui.refreshTimer(); }));
  const origOpen = ui.openFocus;
  ui.openFocus = () => { origOpen(); render(); };
  const origTimer = ui.refreshTimer;
  ui.refreshTimer = () => {
    origTimer();
    const S = A().S; if (!S) return; const el = $('#fx-catlbl'); if (!el) return;
    const c = CATS.find((x) => x[0] === S.task.cat) || CATS[0];
    const td = S.task.todoId && S.todos.find((t) => t.id === S.task.todoId);
    el.style.setProperty('--c', COL[c[0]] || '#FF8466'); el.innerHTML = `<i></i>${U.esc(td ? td.t : c[1])}`;
    const go = $('#fx-go'); if (go) go.dataset.min = A().timer.phase === 'idle' ? A().preset().focus + ' dk' : '';
  };
})();
