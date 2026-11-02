const inject = require('./deep-layout.js')[0];
module.exports = [
  inject,
  ['film', async () => {
    check('film playing on first open', PW.cinema.playing());
    const sk = document.querySelector('#cinema .cn-skip'); check('skip visible', sk && sk.getBoundingClientRect().width > 0);
    await audit('film');
    sk.click(); await wait(2500);
    check('film stopped', !PW.cinema.playing());
  }],
  ['step1', async () => {
    check('onboarding open', document.querySelector('#m-onboard').classList.contains('open'));
    check('cannot close onboarding', document.querySelector('#m-onboard').dataset.locked != null);
    await audit('onboard step1');
    document.querySelector('#ob-next').click(); await wait(800);
  }],
  ['step2', async () => {
    await audit('onboard step2');
    const nm = document.querySelector('#ob-name'), f = document.querySelector('#ob-form'), err = document.querySelector('#ob-err');
    nm.value = ''; f.requestSubmit(); await wait(100); check('empty name rejected', !PW.app.S.onboarded);
    nm.value = 'A'; f.requestSubmit(); await wait(100); check('1-char name rejected', !PW.app.S.onboarded);
    nm.value = 'siktir'; nm.dispatchEvent(new Event('input')); f.requestSubmit(); await wait(100); check('bad name rejected', !PW.app.S.onboarded);
    nm.value = 'Ayşe'; nm.dispatchEvent(new Event('input')); check('room name suggestion', document.querySelector('#ob-room').value === "Ayşe'nin Odası", document.querySelector('#ob-room').value);
    f.requestSubmit(); await wait(2500);
    const S = PW.app.S;
    check('onboarded', S.onboarded && S.name === 'Ayşe');
    check('focus NOT auto-opened', !PW.ui.focusOpen);
    check('room only desk+chair', S.room.items.map((i) => i.id).sort().join() === 'f_chair_wood,f_desk_wood', S.room.items.map((i) => i.id));
    check('desk+chair owned', S.owned.f_desk_wood >= 1 && S.owned.f_chair_wood >= 1, S.owned);
    check('coins = start coins', S.coins === PW.ECON.startCoins, S.coins);
    check('in home room', PW.app.room && PW.app.room.kind === 'home');
    check('introSeen saved', JSON.parse(localStorage.getItem('pw.save.v2')).introSeen === true);
    check('ready toast', [...document.querySelectorAll('#toasts *')].some((e) => /Odan hazır/.test(e.textContent)));
    await audit('after onboarding');
  }],
  ['toast action opens focus', async () => {
    const b = [...document.querySelectorAll('#toasts button')].find((x) => /Odaklan/.test(x.textContent));
    check('toast has Odaklan', !!b); if (b) { b.click(); await wait(400); check('focus opened by toast', PW.ui.focusOpen); }
    PW.ui.closeFocus();
  }],
];
