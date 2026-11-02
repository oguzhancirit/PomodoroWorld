module.exports = [
  ['sound', async () => {
    const A = PW.app, S = A.S; S.sound.focusOnly = true; S.sound.mix = {};
    document.querySelector('#mini-snd').click(); await wait(300);
    const pop = document.querySelector('#snd-pop'); check('sound popover open', !pop.hidden);
    const r = pop.querySelector('[data-l=rain]'); r.value = 50; r.dispatchEvent(new Event('input')); await wait(100);
    check('mix saved', S.sound.mix.rain === 0.5, S.sound.mix);
    check('not playing while idle (focus-only)', !PW.sound.playing);
    A.startFocus(); PW.ui.syncSound(true); await wait(300); check('plays during focus', PW.sound.playing);
    A.stop(); PW.ui.syncSound(true); await wait(300); check('stops after focus', !PW.sound.playing);
    pop.querySelector('[data-sug]').click(); await wait(100); check('suggestion sets a mix', Object.values(S.sound.mix).some((v) => v > 0), S.sound.mix);
    PW.ui.hidePop(); await wait(100); check('popover closes', pop.hidden);
    S.sound.mix = {}; PW.ui.syncSound(true);
  }],
  ['film skip in chapter 2 + replay keeps game state', async () => {
    const A = PW.app, S = A.S; const items = JSON.stringify(S.room.items), coins = S.coins, xp = S.xp, name = S.name;
    PW.world.paused = false; PW.cinemaSpeed = 6; PW.cinema.play(); await wait(200);
    check('film overlay open', document.querySelector('#cinema').classList.contains('open'));
    for (let i = 0; i < 60 && !/Molada/.test((document.querySelector('#cinema .cn-cap b') || {}).textContent || ''); i++) await wait(250);
    check('reached chapter 2', /Molada|sosyal|Yaz/.test(document.querySelector('#cinema .cn-cap b').textContent), document.querySelector('#cinema .cn-cap b').textContent);
    document.querySelector('#cinema .cn-skip').click(); await wait(2500);
    check('film closed', !PW.cinema.playing() && !document.querySelector('#cinema').classList.contains('open'));
    check('back home', A.room && A.room.kind === 'home');
    check('only me in world', [...PW.world.avatars.keys()].every((k) => !k.startsWith('c-')), [...PW.world.avatars.keys()]);
    check('room untouched', JSON.stringify(S.room.items) === items);
    check('economy untouched', S.coins === coins && S.xp === xp && S.name === name);
    check('no cinema body class', !document.body.classList.contains('cinema'));
    check('walk speed reset', (PW.walkBoost || 1) === 1, PW.walkBoost);
  }],
  ['film reaches time-lapse and ends by itself', async () => {
    const A = PW.app; PW.cinemaSpeed = 12; const t0 = Date.now(); const p = PW.cinema.play();
    let sawTL = false; for (let i = 0; i < 400 && PW.cinema.playing(); i++) { if (document.querySelector('.tl-hud')) sawTL = true; await wait(250); }
    check('saw time-lapse hud', sawTL);
    if (PW.cinema.playing()) { const b = [...document.querySelectorAll('#cinema button')].find((x) => /Kapat|oluştur/.test(x.textContent)); if (b) b.click(); await wait(500); }
    for (let i = 0; i < 40 && PW.cinema.playing(); i++) await wait(250);
    check('film finished', !PW.cinema.playing(), (Date.now() - t0) / 1000);
    await p; check('home after film', A.room.kind === 'home'); PW.cinemaSpeed = 1; PW.world.paused = true;
  }],
  ['film blocks network chat while playing', async () => {
    PW.cinemaSpeed = 1; PW.cinema.play(); await wait(300);
    const n = document.querySelectorAll('#chat-log .msg').length; PW.app.onRemoteChat({ peer: 'x', text: 'hello' }); await wait(900);
    check('no chat during film', document.querySelectorAll('#chat-log .msg').length === n);
    PW.cinema.stop(); await wait(2500); check('stopped', !PW.cinema.playing());
  }],
];
