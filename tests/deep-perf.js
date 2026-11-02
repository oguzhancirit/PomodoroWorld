module.exports = [
  ['room switch leak', async () => {
    const A = PW.app, w = PW.world; w.paused = false; const R = w.renderer;
    const snap = () => R.info.memory.textures;
    const cyc = async () => { for (const r of ['meydan', 'teras', 'oyun']) { await A.enterPublic(r); await wait(1200); } await A.enterHome(); await wait(1200); };
    const out = [snap()]; for (let i = 0; i < 3; i++) { await cyc(); out.push(snap()); }
    console.log('LOG tex ' + JSON.stringify(out));
    check('textures stable after warm-up', out[3] - out[2] <= 2 && out[2] - out[1] <= 2, out);
    w.paused = true;
  }],
];
