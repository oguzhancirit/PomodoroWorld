module.exports = [
  ['presets', async () => {
    const A = PW.app, S = A.S;
    for (const p of PW.TIMER_PRESETS) {
      S.settings.preset = p.id; A.startFocus();
      check('preset focus total ' + p.id, A.timer.total === p.focus * 60, A.timer.total);
      A.stop();
    }
    S.settings.preset = 'custom'; S.settings.custom = { focus: 33, brk: 7, long: 21 }; A.startFocus();
    check('custom focus total', A.timer.total === 33 * 60, A.timer.total);
    A.skip(); check('skip → short break', A.timer.phase === 'break' && A.timer.total === 7 * 60, [A.timer.phase, A.timer.total]);
    A.skip(); check('skip break → idle', A.timer.phase === 'idle', A.timer.phase);
    S.settings.preset = 'p25';
  }],
  ['focus complete + rewards', async () => {
    const A = PW.app, S = A.S, T = A.timer;
    const c0 = S.coins, x0 = S.xp, p0 = S.stats.pomos, m0 = S.stats.focusMin;
    S.settings.preset = 'p25'; A.startFocus();
    T.endAt -= 25 * 60 * 1000; T.last -= 25 * 60 * 1000; A.tick();
    check('focus ends → break', T.phase === 'break', T.phase);
    check('pomo counted', S.stats.pomos === p0 + 1, S.stats.pomos);
    check('25 minutes credited', S.stats.focusMin - m0 === 25, S.stats.focusMin - m0);
    check('coins up', S.coins > c0, [c0, S.coins]); check('xp up', S.xp > x0);
    check('log entry has category', S.stats.log.length && S.stats.log[S.stats.log.length - 1].c === S.task.cat, S.stats.log.slice(-1));
    // break ends → idle (autoNext off)
    S.settings.autoNext = false; T.endAt -= 6 * 60 * 1000; T.last -= 6 * 60 * 1000; A.tick();
    check('break ends → idle', T.phase === 'idle', T.phase);
    // 4th round long break
    T.round = 3; A.startFocus(); T.endAt -= 26 * 60 * 1000; T.last -= 26 * 60 * 1000; A.tick();
    check('long break after 4th', T.phase === 'break' && T.long && T.total === 15 * 60, [T.phase, T.long, T.total]);
    A.stop();
  }],
  ['pause/resume keeps time', async () => {
    const A = PW.app, T = A.timer; A.startFocus(); await wait(300); A.pause();
    const l = T.left; check('paused', !T.running && T.phase === 'focus');
    T.last -= 60000; A.tick(); await wait(1200); A.tick();
    check('time frozen while paused', Math.abs(T.left - l) < 0.01, [l, T.left]);
    A.pause(); check('resumed', T.running); check('endAt re-anchored', Math.abs((T.endAt - Date.now()) / 1000 - T.left) < 1.5, [T.endAt - Date.now(), T.left]);
    A.stop(); check('stop → idle', T.phase === 'idle' && !T.running);
  }],
  ['partial minute not lost / not doubled', async () => {
    const A = PW.app, S = A.S, T = A.timer; const m0 = S.stats.focusMin;
    A.startFocus(); T.last -= 59000; T.endAt -= 59000; A.tick(); check('59s → no minute yet', S.stats.focusMin === m0, S.stats.focusMin - m0);
    T.last -= 2000; T.endAt -= 2000; A.tick(); check('61s → one minute', S.stats.focusMin === m0 + 1, S.stats.focusMin - m0);
    A.stop(); A.startFocus(); check('accum reset on new session', A.focusAccum === 0, A.focusAccum); A.stop();
  }],
  ['setup UI: categories, durations, custom stepper', async () => {
    const A = PW.app, S = A.S; PW.ui.openFocus(); await wait(300);
    const cats = [...document.querySelectorAll('#fx-cats [data-cat]')]; check('7 categories', cats.length === 7, cats.length);
    const durs = [...document.querySelectorAll('#fx-durs [data-dur]')]; check('6 durations', durs.length === 6, durs.length);
    const map = { Ders: 'write', Okuma: 'read', Kodlama: 'type', Proje: 'type', Yazı: 'write', Dil: 'read', Diğer: 'type' };
    for (const [c, st] of Object.entries(map)) { document.querySelector(`[data-cat="${c}"]`).click(); check('cat ' + c, S.task.cat === c && S.settings.style === st && document.querySelector(`[data-cat="${c}"]`).getAttribute('aria-checked') === 'true', [S.task.cat, S.settings.style]); }
    for (const id of ['p15', 'p25', 'p50', 'p90', 'p45']) { document.querySelector(`[data-dur="${id}"]`).click(); const p = PW.TIMER_PRESETS.find((x) => x.id === id); check('dur ' + id + ' shows time', document.querySelector('#fx-time').textContent.trim() === String(p.focus).padStart(2, '0') + ':00', document.querySelector('#fx-time').textContent); }
    document.querySelector('[data-dur="custom"]').click(); check('custom panel visible', !document.querySelector('#fx-custom').hidden);
    S.settings.custom.focus = 10; const minus = document.querySelector('[data-cs=focus][data-d="-5"]'); minus.click(); minus.click(); minus.click();
    check('custom focus min 5', S.settings.custom.focus === 5, S.settings.custom.focus);
    S.settings.custom.focus = 175; const plus = document.querySelector('[data-cs=focus][data-d="5"]'); plus.click(); plus.click();
    check('custom focus max 180', S.settings.custom.focus === 180, S.settings.custom.focus);
    S.settings.custom.brk = 2; const bm = document.querySelector('[data-cs=brk][data-d="-1"]'); bm.click(); bm.click(); check('custom brk min 1', S.settings.custom.brk === 1, S.settings.custom.brk);
    check('custom label updated', document.querySelector('[data-dur=custom] b').textContent.startsWith('180'), document.querySelector('[data-dur=custom] b').textContent);
    check('timer shows 180:00', document.querySelector('#fx-time').textContent.trim() === '180:00', document.querySelector('#fx-time').textContent);
    document.querySelector('#fx-go').click(); await wait(200);
    check('start uses custom', A.timer.total === 180 * 60 && A.timer.running, A.timer.total);
    check('setup hidden while running', getComputedStyle(document.querySelector('#fx-setup')).display === 'none');
    check('ring label shows cat', document.querySelector('#fx-catlbl').textContent.length > 0, document.querySelector('#fx-catlbl').textContent);
    document.querySelector('#fx-go').click(); await wait(100); check('go button pauses', !A.timer.running && A.timer.phase === 'focus');
    check('setup hidden while paused', getComputedStyle(document.querySelector('#fx-setup')).display === 'none');
    A.stop(); await wait(100); check('setup back when idle', getComputedStyle(document.querySelector('#fx-setup')).display !== 'none');
    S.settings.preset = 'p25'; S.settings.custom = { focus: 40, brk: 8, long: 20 };
    // keyboard: are chips reachable/operable with keyboard (buttons → yes)
    check('chips are buttons', cats.every((b) => b.tagName === 'BUTTON'));
    PW.ui.closeFocus();
  }],
  ['profile custom inputs clamp', async () => {
    PW.ui.open('profile'); await wait(200);
    const f = document.querySelector('#set-cf'), b = document.querySelector('#set-cb');
    if (!f) { check('profile custom inputs exist', false); return; }
    f.value = '-50'; f.dispatchEvent(new Event('change', { bubbles: true })); f.dispatchEvent(new Event('input', { bubbles: true }));
    b.value = '9999'; b.dispatchEvent(new Event('change', { bubbles: true })); b.dispatchEvent(new Event('input', { bubbles: true }));
    const form = document.querySelector('#set-form'); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit')); await wait(300);
    const c = PW.app.S.settings.custom;
    check('custom focus clamped', c.focus >= 5 && c.focus <= 180 && Number.isFinite(c.focus), c);
    check('custom brk clamped', c.brk >= 1 && c.brk <= 60 && Number.isFinite(c.brk), c);
    f.value = ''; f.dispatchEvent(new Event('change', { bubbles: true })); f.dispatchEvent(new Event('input', { bubbles: true })); form.requestSubmit && form.requestSubmit(); await wait(200);
    check('empty custom input not NaN', Number.isFinite(PW.app.S.settings.custom.focus) && PW.app.S.settings.custom.focus >= 5, PW.app.S.settings.custom);
    PW.ui.close();
  }],
  ['economy: buy', async () => {
    const A = PW.app, S = A.S;
    const cheap = Object.values(PW.ITEM).find((d) => d.cat === 'furn' && d.price > 0 && d.lvl <= A.levelInfo().level);
    const c0 = S.coins, o0 = S.owned[cheap.id] || 0; const r = A.buy(cheap.id);
    check('buy ok', r.ok && S.coins === c0 - cheap.price && S.owned[cheap.id] === o0 + 1, [r, c0, S.coins]);
    S.coins = 0; const r2 = A.buy(cheap.id); check('buy refused without coins', !r2.ok && S.coins === 0, r2);
    const hi = Object.values(PW.ITEM).find((d) => d.lvl > A.levelInfo().level); if (hi) { S.coins = 1e6; const r3 = A.buy(hi.id); check('buy refused by level', !r3.ok, r3); }
    const av = Object.values(PW.ITEM).find((d) => d.cat === 'avatar' && d.lvl <= A.levelInfo().level && d.price > 0 && !A.isOwned(d.id)); if (av) { S.coins = 1e6; A.buy(av.id); const r4 = A.buy(av.id); check('no double-buy of wearable', !r4.ok, r4); }
    check('bogus id', !A.buy('nope').ok); S.coins = 5000;
  }],
  ['editor: place/move/remove/undo', async () => {
    const A = PW.app, S = A.S, ui = PW.ui;
    const id = Object.values(PW.ITEM).find((d) => d.cat === 'furn' && !d.wall && d.lvl <= A.levelInfo().level && d.price > 0).id;
    S.owned[id] = (S.owned[id] || 0) + 1; ui.setEditing(true, true); await wait(300);
    const n0 = S.room.items.length; ui.onPlace({ id, x: 1, z: 1, r: 0 }); check('placed', S.room.items.length === n0 + 1);
    while (A.available(id) > 0) ui.onPlace({ id, x: 0, z: 0, r: 0 });
    const n1 = S.room.items.length; ui.onPlace({ id, x: 0.5, z: 0.5, r: 0 }); check('no placement beyond inventory', S.room.items.length === n1, [n1, S.room.items.length]);
    ui.undo(); check('undo', S.room.items.length === n1 - 1, S.room.items.length); ui.redo(); check('redo', S.room.items.length === n1, S.room.items.length);
    PW.world.select(S.room.items.length - 1); ui.editRemove(); check('remove', S.room.items.length === n1 - 1);
    PW.world.cancelGhost && PW.world.cancelGhost(); ui.setEditing(false); await wait(200);
    check('editbar hidden', document.querySelector('#editbar').hidden);
  }],
  ['quests & login claim', async () => {
    const A = PW.app; const c0 = A.S.coins; A.S.q.login.claimedDay = null; const ok = A.claimLogin(); check('login claim once', ok && A.S.coins > c0); check('second claim refused', !A.claimLogin());
    const d = PW.QUESTS.daily[0]; A.qProg(d.id, 0, d.goal); const c1 = A.S.coins; check('quest claim', A.qClaim(d.id) && A.S.coins >= c1); check('quest double claim refused', !A.qClaim(d.id));
  }],
  ['chat', async () => {
    const A = PW.app; const n = () => document.querySelectorAll('#chat-log .msg').length; const n0 = n();
    A.sendChat(''); A.sendChat('   '); check('empty chat ignored', n() === n0, n() - n0);
    A.sendChat('<b>x</b>'); check('html escaped', !document.querySelector('#chat-log b') , document.querySelector('#chat-log').innerHTML.slice(-200));
    A.sendChat('a'.repeat(5000)); const last = [...document.querySelectorAll('#chat-log .msg')].pop(); check('long chat truncated', last && last.textContent.length < 400, last && last.textContent.length);
  }],
  ['todos', async () => {
    const ui = PW.ui, S = PW.app.S; const n0 = S.todos.length;
    ui.todoAdd && ui.todoAdd('Kitap oku', 2); check('todo added', S.todos.length === n0 + 1, S.todos.length);
    ui.todoAdd && ui.todoAdd('', 2); ui.todoAdd && ui.todoAdd('   ', 2); check('blank todo ignored', S.todos.length === n0 + 1, S.todos.length);
    const t = S.todos[S.todos.length - 1]; ui.todoToggle(t.id); check('todo toggled', !!t.ok || !!(S.todos.find((x) => x.id === t.id) || {}).ok);
  }],
  ['all screens open/close', async () => {
    for (const n of ['world', 'char', 'shop', 'profile', 'quests', 'roomset', 'help']) { PW.ui.open(n); await wait(250); check('open ' + n, document.querySelector('#m-' + n).classList.contains('open')); PW.ui.close(); await wait(100); check('close ' + n, !document.querySelector('#m-' + n).classList.contains('open')); }
    PW.ui.open('shop'); document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(150); check('Esc closes modal', !document.querySelector('#m-shop').classList.contains('open'));
    PW.ui.openFocus(); await wait(150); document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(150); check('Esc closes focus', !PW.ui.focusOpen);
  }],
  ['nav buttons', async () => {
    for (const id of ['nav-world', 'nav-shop', 'nav-char', 'nav-quests', 'nav-profile', 'nav-home']) { const b = document.getElementById(id); if (!b) { check('nav ' + id + ' exists', false); continue; } b.click(); await wait(300); }
    check('home nav closes modals', !document.querySelector('.modal.open'), [...document.querySelectorAll('.modal.open')].map((m) => m.id));
  }],
  ['social rooms + back home', async () => {
    const A = PW.app;
    for (const r of PW.PUBLIC_ROOMS.slice(0, 3)) { await A.enterPublic(r.id); await wait(400); check('entered ' + r.id, A.room && A.room.id === r.id, A.room && A.room.id); }
    await A.enterHome(); await wait(300); check('back home', A.room.kind === 'home');
    check('home items intact', A.S.room.items.length >= 2);
  }],
  ['save roundtrip + export/import validation', async () => {
    const A = PW.app; A.saveNow(); const raw = JSON.parse(localStorage.getItem('pw.save.v2'));
    check('saved has settings.custom', raw.settings && raw.settings.custom && raw.settings.custom.focus, raw.settings);
    const ex = A.exportSave(); check('export json', JSON.parse(ex).app === 'pomodoro-world');
    check('import rejects junk', typeof A.importSave('{"a":1}') === 'string'); check('import rejects broken', typeof A.importSave('{') === 'string');
  }],
  ['xss in names', async () => {
    const A = PW.app; A.S.name = '<img src=x onerror=window.__x=1>'; PW.ui.refreshHUD(); PW.ui.open('profile'); await wait(200); PW.ui.close(); PW.ui.refreshPeople && PW.ui.refreshPeople();
    check('no injected img', !window.__x && !document.querySelector('img[src="x"]')); A.S.name = 'Tester'; PW.ui.refreshHUD();
  }],
];
