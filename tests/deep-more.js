module.exports = [
  ['wardrobe', async () => {
    const S = PW.app.S; PW.ui.open('char'); await wait(600);
    const tabs = [...document.querySelectorAll('#char-tabs [data-slot]')]; check('wardrobe tabs', tabs.length >= 5, tabs.length);
    for (const t of tabs) { t.click(); await wait(120); const opts = [...document.querySelectorAll('#char-body button:not([disabled])')]; if (opts.length > 1) opts[1].click(); await wait(60); }
    document.querySelector('#char-tabs [data-dice]').click(); await wait(200);
    document.querySelector('#char-save').click(); await wait(300);
    const clean = JSON.stringify(PW.app.sanitizeAv(S.av)); check('saved avatar is valid', clean === JSON.stringify(Object.assign({}, PW.app.sanitizeAv(S.av))), S.av);
    check('char modal closed', !document.querySelector('#m-char').classList.contains('open'));
    // locked items can't be worn: every worn item must be owned or free
    const worn = ['hs', 'top', 'bot', 'sh', 'fh'].map((k) => S.av[k]).concat(S.av.acc || []).filter(Boolean);
    const bad = worn.filter((id) => PW.ITEM[id] && PW.ITEM[id].price > 0 && !PW.app.isOwned(id)); check('only owned/free items worn', bad.length === 0, bad);
  }],
  ['shop buy via UI + theme', async () => {
    const S = PW.app.S; S.coins = 99999; PW.ui.open('shop'); await wait(300);
    const theme = Object.values(PW.ITEM).find((d) => d.cat === 'theme' && d.price > 0 && d.lvl <= PW.app.levelInfo().level && !PW.app.isOwned(d.id));
    if (!theme) { check('theme candidate', false); return; }
    PW.ui.shopTab = 'theme'; PW.ui.renderShop(); await wait(200);
    const b = document.querySelector(`[data-buy="${theme.id}"]`); check('theme card has buy', !!b); if (!b) return;
    b.click(); await wait(200); check('confirm modal', document.querySelector('#m-buy').classList.contains('open'));
    document.querySelector('#m-buy .b-ok').click(); await wait(500);
    check('theme owned', PW.app.isOwned(theme.id)); check('theme applied', S.room.theme === theme.id, S.room.theme);
    PW.ui.close();
  }],
  ['room settings', async () => {
    const S = PW.app.S; PW.ui.open('roomset'); await wait(200);
    document.querySelector('#roomset-form [data-vis="0"]').click(); await wait(50);
    const n = document.querySelector('#rs-name'); n.value = 'Sessiz Kütüphane';
    document.querySelector('#roomset-form').requestSubmit(); await wait(300);
    check('room closed', S.room.open === false); check('room renamed', S.room.name === 'Sessiz Kütüphane', S.room.name);
    check('invite code has token', PW.app.inviteCode().includes('-'), PW.app.inviteCode());
    PW.ui.open('roomset'); await wait(150); const n2 = document.querySelector('#rs-name'); n2.value = 'x'; document.querySelector('#roomset-form').requestSubmit(); await wait(200);
    check('short name refused', S.room.name === 'Sessiz Kütüphane');
    n2.value = 'amk odası'; document.querySelector('#roomset-form').requestSubmit(); await wait(200); check('bad name refused', S.room.name === 'Sessiz Kütüphane');
    document.querySelector('#roomset-form [data-vis="1"]').click(); document.querySelector('#rs-name').value = 'Sessiz Kütüphane'; document.querySelector('#roomset-form').requestSubmit(); await wait(200);
    check('room reopened', S.room.open === true); PW.ui.close();
  }],
  ['timer continues across rooms', async () => {
    const A = PW.app, T = A.timer; A.startFocus(); const l0 = T.left;
    await A.enterPublic('meydan'); await wait(800); A.tick();
    check('still running in social', T.running && T.phase === 'focus' && T.left <= l0, [T.phase, T.running]);
    await A.enterHome(); await wait(500); A.tick(); check('still running at home', T.running && T.phase === 'focus');
    const me = PW.world.avatars.get('me'); check('me seated while focusing at home', me && me.seatIdx != null);
    A.stop();
  }],
  ['day rollover', async () => {
    const A = PW.app, Q = A.S.q; Q.day = '2000-01-01'; Q.daily = { d_pomo: { p: 5, c: true } }; A.questReset();
    check('daily quests reset on new day', Object.keys(Q.daily).length === 0 && Q.day !== '2000-01-01', Q);
  }],
  ['level up modal', async () => {
    const A = PW.app; const lv = A.levelInfo().level; A.gain(100000, 0, 'test'); await wait(400);
    check('level increased', A.levelInfo().level > lv); check('level modal shown', document.querySelector('#m-level').classList.contains('open'));
    PW.ui.close(); await wait(100); check('level modal closes', !document.querySelector('#m-level').classList.contains('open'));
  }],
  ['todo in focus flow', async () => {
    const ui = PW.ui, S = PW.app.S; ui.todoAdd('Makale yaz', 1); const td = S.todos[S.todos.length - 1]; ui.todoSelect(td.id);
    check('todo selected', S.task.todoId === td.id); ui.refreshTimer();
    check('ring label shows todo', document.querySelector('#fx-catlbl').textContent.includes('Makale yaz'), document.querySelector('#fx-catlbl').textContent);
    const A = PW.app, T = A.timer; A.startFocus(); T.endAt -= 26 * 60000; T.last -= 26 * 60000; A.tick();
    check('todo got a pomodoro', td.done >= 1, td); A.stop();
  }],
];
