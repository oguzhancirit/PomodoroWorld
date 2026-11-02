module.exports = [
  ['invite new user', async () => {
    check('film playing', PW.cinema.playing()); document.querySelector('#cinema .cn-skip').click(); await wait(2500);
    document.querySelector('#ob-next').click(); await wait(600);
    const nm = document.querySelector('#ob-name'); nm.value = 'Mert'; nm.dispatchEvent(new Event('input')); document.querySelector('#ob-form').requestSubmit(); await wait(3000);
    const A = PW.app;
    check('onboarded', A.S.onboarded); check('room name Mert\'in', A.S.room.name === "Mert'in Odası", A.S.room.name);
    check('visiting invited room', A.room && A.room.kind === 'visit', A.room && [A.room.kind, A.room.key]);
    check('focus not auto-opened', !PW.ui.focusOpen);
    check('no stuck modal', !document.querySelector('.modal.open'), [...document.querySelectorAll('.modal.open')].map((m) => m.id));
  }],
];
