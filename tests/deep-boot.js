module.exports = [
  ['boot with running timer', async () => {
    await wait(1500);
    const T = PW.app.timer;
    check('timer restored running', T.phase === 'focus' && T.running, [T.phase, T.running]);
    check('left ≈ endAt', Math.abs(T.left - (T.endAt - Date.now()) / 1000) < 3, [T.left]);
    check('focus screen auto-opened for running timer', PW.ui.focusOpen);
    check('setup hidden', getComputedStyle(document.querySelector('#fx-setup')).display === 'none');
    check('ring shows category label', /Okuma/.test(document.querySelector('#fx-catlbl').textContent), document.querySelector('#fx-catlbl').textContent);
  }],
];
