// screenshot every screen at a viewport, world rendering on (low gfx)
const { chromium } = require('playwright');
(async () => {
  const [w, h, tag] = [+process.argv[2], +process.argv[3], process.argv[4]];
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.route('**/three.min.js', (r) => r.fulfill({ path: '/home/claude/deps/node_modules/three/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('https://cdn.jsdelivr.net/**', (r) => { const m = r.request().url().match(/three@0\.128\.0\/(examples\/js\/.*)$/); if (m) return r.fulfill({ path: '/home/claude/deps/node_modules/three/' + m[1], contentType: 'application/javascript' }); return r.abort(); });
  await page.addInitScript(() => { localStorage.setItem('pw.save.v2', JSON.stringify({ v: 2, uid: 'oguz1234', name: 'Oğuzhan', onboarded: true, toured: true, introSeen: true, xp: 4000, coins: 9000, settings: { gfx: 'low' }, todos: [{ id: 't1', t: 'Fizik test çöz', est: 3, done: 1 }, { id: 't2', t: 'İngilizce kelime', est: 2, done: 0 }] })); });
  await page.goto('http://localhost:8765/index.html?dev'); await page.waitForTimeout(3500);
  const steps = [
    ['home', 'PW.ui.close()'],
    ['world', "PW.ui.open('world')"], ['shop', "PW.ui.open('shop')"], ['char', "PW.ui.open('char')"], ['profile', "PW.ui.open('profile')"],
    ['quests', "PW.ui.open('quests')"], ['roomset', "PW.ui.open('roomset')"], ['help', "PW.ui.open('help')"],
    ['todo', "PW.ui.close(); document.querySelector('#mini-todo').click()"], ['sound', "PW.ui.hidePop(); document.querySelector('#mini-snd').click()"],
    ['person', "PW.ui.hidePop(); PW.ui.openPerson('me')"],
    ['buy', "PW.ui.close(); PW.ui.confirmBuy(Object.values(PW.ITEM).find(d=>d.cat==='furn'&&d.price>0))"],
    ['level', "document.querySelector('#m-buy').classList.remove('open'); PW.ui.levelUp(10)"],
  ];
  for (const [n, js] of steps) { try { await page.evaluate(js); } catch (e) { console.log(n, 'ERR', e.message.split('\n')[0]); } await page.waitForTimeout(1500); await page.screenshot({ path: `sh-${tag}-${n}.png`, timeout: 120000 }); if (n === 'home') await page.evaluate(() => (PW.world.paused = true)); }
  await browser.close();
})();
