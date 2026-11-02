// Deep functional test: logic, economy, timer lifecycle, save robustness, UI screens.
const { chromium } = require('playwright');
const VP = { mobile: { width: 390, height: 844 }, small: { width: 360, height: 640 }, tablet: { width: 820, height: 1180 }, desktop: { width: 1440, height: 900 }, laptop: { width: 1366, height: 657 }, land: { width: 1024, height: 600 }, phoneL: { width: 844, height: 390 } };
(async () => {
  const which = process.argv[2] || 'logic';
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: VP[process.argv[3]] || VP.desktop });
  await ctx.route('**/three.min.js', (r) => r.fulfill({ path: '/home/claude/deps/node_modules/three/build/three.min.js', contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await ctx.route('https://cdn.jsdelivr.net/**', (r) => { const m = r.request().url().match(/three@0\.128\.0\/(examples\/js\/.*)$/); if (m) return r.fulfill({ path: '/home/claude/deps/node_modules/three/' + m[1], contentType: 'application/javascript' }); return r.abort(); });
  const seed = process.argv[4] === 'none' ? 'none' : process.argv[4] ? JSON.parse(process.argv[4]) : { v: 2, uid: 'deep1234', name: 'Tester', onboarded: true, toured: true, introSeen: true, xp: 2000, coins: 5000, settings: { gfx: 'low' } };
  await ctx.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', 1); localStorage.clear(); if (s !== 'none') localStorage.setItem('pw.save.v2', typeof s === 'string' ? s : JSON.stringify(s)); } }, seed);
  const errs = [];
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !t.includes('ERR_FAILED') && !t.includes('net::')) errs.push('console: ' + t); if (t.startsWith('LOG')) console.log(t); });
  await page.goto('http://localhost:8765/index.html?dev' + (process.env.HASH || ''), { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.PW && PW.app && PW.app.S && PW.world, null, { timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { if (!PW.cinema.playing()) PW.world.paused = true; window.__res = []; window.check = (n, c, info) => window.__res.push([c ? 'PASS' : 'FAIL', n, c ? '' : JSON.stringify(info === undefined ? '' : info).slice(0, 300)]); window.wait = (ms) => new Promise((r) => setTimeout(r, ms)); });
  const tests = require('./deep-' + which + '.js');
  for (const [name, fn] of tests) {
    try { await page.evaluate(fn); } catch (e) { errs.push(`test ${name} threw: ${e.message.split('\n')[0]}`); }
    if (process.env.SHOT) await page.screenshot({ path: `deep-${which}-${name}.png` });
  }
  const res = await page.evaluate(() => window.__res);
  res.forEach((r) => console.log(r.join(' | ')));
  console.log(`== ${res.filter((r) => r[0] === 'PASS').length} pass, ${res.filter((r) => r[0] === 'FAIL').length} fail`);
  console.log(errs.join('\n') || 'no page errors');
  await browser.close();
})();
