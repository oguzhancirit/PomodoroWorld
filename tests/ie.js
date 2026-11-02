const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } });
  await ctx.route('**/three.min.js', (r) => r.fulfill({ path: '/home/claude/deps/node_modules/three/build/three.min.js', contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await ctx.route('https://cdn.jsdelivr.net/**', (r) => { const m = r.request().url().match(/three@0\.128\.0\/(examples\/js\/.*)$/); if (m) return r.fulfill({ path: '/home/claude/deps/node_modules/three/' + m[1], contentType: 'application/javascript' }); return r.abort(); });
  await ctx.addInitScript(() => { if (!sessionStorage.s) { sessionStorage.s = 1; localStorage.setItem('pw.save.v2', JSON.stringify({ v: 2, uid: 'exp12345', name: 'Eski', onboarded: true, toured: true, introSeen: true, xp: 777, coins: 4321, settings: { gfx: 'low', preset: 'p50' }, todos: [{ id: 'a', t: 'Bitir', est: 2 }] })); } });
  const errs = []; const page = await ctx.newPage(); page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:8765/index.html?dev'); await page.waitForTimeout(3500);
  const text = await page.evaluate(() => { PW.world.paused = true; return PW.app.exportSave(); });
  // simulate another device: a different player, then import the file
  await page.evaluate(() => { const S = PW.app.S; S.name = 'Yeni'; S.coins = 1; S.xp = 0; PW.app.saveNow(); });
  const nav = page.waitForNavigation({ timeout: 120000 });
  await page.evaluate((t) => { setTimeout(() => { const r = PW.app.importSave(t); if (r) console.log('IMPORT ERR ' + r); }, 10); }, text);
  await nav; await page.waitForFunction(() => window.PW && PW.app && PW.app.S, null, { timeout: 120000 }); await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({ name: PW.app.S.name, coins: PW.app.S.coins, xp: PW.app.S.xp, preset: PW.app.S.settings.preset, todos: PW.app.S.todos.length, bak: JSON.parse(localStorage.getItem('pw.save.v2.preimport')).name }));
  console.log(JSON.stringify(after));
  console.log(after.name === 'Eski' && after.coins === 4321 && after.xp === 777 && after.preset === 'p50' && after.todos === 1 && after.bak === 'Yeni' ? 'PASS roundtrip' : 'FAIL roundtrip');
  console.log(errs.join('\n') || 'no page errors'); await browser.close();
})();
