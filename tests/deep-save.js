module.exports = [
  ['sanity', async () => {
    const A = PW.app, S = A.S;
    check('booted', !!S && !!PW.world);
    check('coins finite ≥0', Number.isFinite(S.coins) && S.coins >= 0, S.coins);
    check('xp finite ≥0', Number.isFinite(S.xp) && S.xp >= 0, S.xp);
    check('owned object', S.owned && typeof S.owned === 'object' && !Array.isArray(S.owned), S.owned);
    check('room items array', Array.isArray(S.room.items), typeof S.room.items);
    check('room items valid', S.room.items.every((i) => i && PW.ITEM[i.id]), S.room.items.slice(0, 3));
    check('room items capped', S.room.items.length <= 400, S.room.items.length);
    check('stats sane', S.stats && typeof S.stats.days === 'object' && Array.isArray(S.stats.log), S.stats);
    check('custom numbers', Number.isFinite(S.settings.custom.focus) && S.settings.custom.focus >= 5 && S.settings.custom.focus <= 180 && Number.isFinite(S.settings.custom.brk) && S.settings.custom.brk >= 1, S.settings.custom);
    check('task cat known', PW.TASK_CATS.some((c) => c[0] === S.task.cat), S.task.cat);
    check('timer sane', ['idle', 'focus', 'break'].includes(A.timer.phase) && Number.isFinite(A.timer.left) && A.timer.left >= 0, A.timer);
    check('av object', S.av && typeof S.av === 'object' && S.av.g, S.av);
    PW.ui.openFocus(); await wait(300);
    check('focus durations render', document.querySelectorAll('#fx-durs [data-dur]').length === 6);
    check('time text sane', /^\d{1,3}:\d\d$/.test(document.querySelector('#fx-time').textContent.trim()), document.querySelector('#fx-time').textContent);
    PW.ui.closeFocus();
    for (const n of ['profile', 'shop', 'quests', 'world', 'char']) { try { PW.ui.open(n); await wait(200); check('open ' + n, document.querySelector('#m-' + n).classList.contains('open')); } catch (e) { check('open ' + n, false, e.message); } PW.ui.close(); }
    A.saveNow(); check('save works', !!localStorage.getItem('pw.save.v2'));
  }],
];
