// PWA: service worker caches the shell; app boots offline
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 800, height: 600 }, serviceWorkers: 'allow' });
  const errs = [];
  // let the SW fetch the real CDN files? They're blocked in the sandbox, so serve local copies for both page and SW
  await ctx.route('**/three.min.js', (r) => r.fulfill({ path: '/home/claude/deps/node_modules/three/build/three.min.js', contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await ctx.route('https://cdn.jsdelivr.net/**', (r) => { const m = r.request().url().match(/three@0\.128\.0\/(examples\/js\/.*)$/); if (m) return r.fulfill({ path: '/home/claude/deps/node_modules/three/' + m[1], contentType: 'application/javascript' }); return r.abort(); });
  await ctx.addInitScript(() => { localStorage.setItem('pw.save.v2', JSON.stringify({ v: 2, uid: 'swtest12', name: 'SW', onboarded: true, toured: true, introSeen: true, xp: 10, coins: 10, settings: { gfx: 'low' } })); });
  const page = await ctx.newPage(); page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:8765/index.html'); await page.waitForTimeout(4000);
  const reg = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(r, 8000))]); const keys = await caches.keys(); const c = keys.length ? await caches.open(keys[0]) : null; const n = c ? (await c.keys()).length : 0; return { reg: !!r, keys, n, ctrl: !!navigator.serviceWorker.controller }; });
  console.log('sw', JSON.stringify(reg));
  await page.reload(); await page.waitForTimeout(3000);
  console.log('controlled after reload', await page.evaluate(() => !!navigator.serviceWorker.controller));
  await ctx.setOffline(true);
  await page.reload().catch((e) => console.log('reload err', e.message.split('\n')[0])); await page.waitForTimeout(6000);
  console.log('offline boot', JSON.stringify(await page.evaluate(() => ({ app: !!(window.PW && PW.app && PW.app.S), world: !!(window.PW && PW.world), name: window.PW && PW.app && PW.app.S && PW.app.S.name })).catch((e) => e.message)));
  console.log(errs.join('\n') || 'no page errors');
  await browser.close();
})();
