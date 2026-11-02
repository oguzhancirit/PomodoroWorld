const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  await ctx.route('**/three.min.js', (r) => r.fulfill({ path: '/home/claude/deps/node_modules/three/build/three.min.js', contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await ctx.route('https://cdn.jsdelivr.net/**', (r) => { const m = r.request().url().match(/three@0\.128\.0\/(examples\/js\/.*)$/); if (m) return r.fulfill({ path: '/home/claude/deps/node_modules/three/' + m[1], contentType: 'application/javascript' }); return r.abort(); });
  await ctx.addInitScript(() => { if (!localStorage.getItem('pw.save.v2')) localStorage.setItem('pw.save.v2', JSON.stringify({ v: 2, uid: 'oguz1234', name: 'Oğuzhan', onboarded: true, toured: true, xp: 400, coins: 900, settings: { gfx: 'low' } })); });
  const errs = [];
  const page = await ctx.newPage(); page.on('pageerror', (e) => errs.push('A: ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.goto('http://localhost:8765/index.html'); await page.waitForTimeout(3500);
  const r1 = await page.evaluate(async () => {
    const out = {};
    document.querySelector('#fx-list').click(); await new Promise((r) => setTimeout(r, 300));
    out.popOpen = !document.querySelector('#todo-pop').hidden;
    const f = document.querySelector('#todo-pop [data-add]'); f.querySelector('input').value = 'Fizik test çöz'; f.querySelector('[data-st="1"]').click(); f.requestSubmit();
    out.todos = PW.app.S.todos.map((t) => [t.t, t.est]); out.sel = PW.app.S.task.todoId != null;
    document.querySelector('#fx-snd').click(); await new Promise((r) => setTimeout(r, 300));
    out.sndOpen = !document.querySelector('#snd-pop').hidden && !!document.querySelector('#snd-pop [data-l=rain]');
    PW.ui.hidePop();
    PW.app.startFocus(); out.endAt = PW.app.timer.endAt > Date.now();
    // simulate 3 minutes passing (laptop sleep) by moving the clock anchors back
    PW.app.timer.endAt -= 180000; PW.app.timer.last -= 180000; PW.app.tick();
    out.leftAfterSleep = Math.round(PW.app.timer.left); out.minutes = PW.app.S.stats.focusMin; out.todoMin = PW.app.S.todos[0].min || 0;
    PW.app.saveNow();
    return out;
  });
  console.log('r1', JSON.stringify(r1));
  await page.reload(); await page.waitForTimeout(3500);
  const r2 = await page.evaluate(() => ({ phase: PW.app.timer.phase, running: PW.app.timer.running, left: Math.round(PW.app.timer.left), focusMin: PW.app.S.stats.focusMin }));
  console.log('r2 after reload', JSON.stringify(r2));
  // second tab (no ?dev): must be blocked by the single-tab lock
  const p2 = await ctx.newPage(); p2.on('pageerror', (e) => errs.push('B: ' + e.message));
  await p2.goto('http://localhost:8765/index.html'); await p2.waitForTimeout(2500);
  const r3 = await p2.evaluate(() => ({ blocker: !document.getElementById('blocker').hidden, title: document.querySelector('.blk-t').textContent, world: !!PW.world }));
  console.log('r3 second tab', JSON.stringify(r3));
  await p2.click('#blk-go'); await p2.waitForTimeout(4000);
  const r4 = await page.evaluate(() => ({ inactive: !!PW.app.inactive, blocker: !document.getElementById('blocker').hidden, title: document.querySelector('.blk-t').textContent }));
  const r5 = await p2.evaluate(() => ({ world: !!PW.world, phase: PW.app.timer.phase, todos: PW.app.S.todos.length }));
  console.log('r4 first tab after takeover', JSON.stringify(r4), 'r5 second tab', JSON.stringify(r5));
  // corrupted save recovery
  await p2.evaluate(() => { localStorage.setItem('pw.save.v2', '{broken json'); });
  const p3 = await ctx.newPage(); p3.on('pageerror', (e) => errs.push('C: ' + e.message));
  await p2.close(); await page.close(); await new Promise((r) => setTimeout(r, 1500));
  await p3.goto('http://localhost:8765/index.html'); await p3.waitForTimeout(3500);
  console.log('r6 corrupt', JSON.stringify(await p3.evaluate(() => ({ blk: !document.getElementById('blocker').hidden, t: document.querySelector('.blk-t').textContent, lock: localStorage.getItem('pw.tab'), S: !!PW.app.S, restored: !!PW.app._restored, name: PW.app.S && PW.app.S.name }))));
  await p3.screenshot({ path: 'func-3.png' });
  console.log(errs.join('\n') || 'no errors');
  await browser.close();
})();
