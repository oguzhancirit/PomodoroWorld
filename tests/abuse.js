const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 760 } });
  await ctx.route('**/three.min.js', (r) => r.fulfill({ path: '/home/claude/deps/node_modules/three/build/three.min.js', contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await ctx.route('https://cdn.jsdelivr.net/**', (r) => { const m = r.request().url().match(/three@0\.128\.0\/(examples\/js\/.*)$/); if (m) return r.fulfill({ path: '/home/claude/deps/node_modules/three/' + m[1], contentType: 'application/javascript' }); return r.abort(); });
  const errs = [];
  const mk = async (name, uid) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(name + ': ' + e.message)); await p.goto('http://localhost:8765/index.html?dev', { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForFunction(() => window.PW && PW.app && PW.app.net, null, { timeout: 30000 }); await p.waitForTimeout(500);
    await p.evaluate(() => { PW.cinema && PW.cinema.stop(); }); await p.waitForTimeout(1500);
    await p.evaluate(([n, uid]) => { PW.world.setQuality('low'); PW.app.S.introSeen = true; const S = PW.app.S; S.uid = uid; S.name = n; S.onboarded = true; S.toured = true; S.av = PW.defaultAvatar('m'); document.querySelector('#m-onboard').classList.remove('open'); document.querySelector('#m-onboard').removeAttribute('data-locked'); PW.world.hideTags = false; PW.ui.closeFocus && PW.ui.closeFocus(); PW.app.enterHome(); PW.world.paused = true; }, [name, uid]); return p; };
  const a = await mk('Ayse', 'ayse1234'); await a.waitForTimeout(1500);
  const b = await mk('Mehmet', 'mehmet99'); await b.waitForTimeout(2000);
  await a.evaluate(() => { window.__log = []; const o = PW.app.onPeers; PW.app.onPeers = (l) => { window.__log.push(((Date.now()/1000)%1000).toFixed(1) + ' ' + l.filter((p) => !p.isMe).map((p) => p.peer.slice(0, 4) + ':' + Object.keys(p.presence || {}).join('|')).join(' ; ')); o(l); }; PW.app.chan.onPeers((l) => {}); const P = PW.app.peers; const od = P.delete.bind(P), oc = P.clear.bind(P); P.delete = (k) => { window.__log.push('DEL ' + new Error().stack.split('\n').slice(2, 5).join(' | ')); return od(k); }; P.clear = () => { window.__log.push('CLR ' + new Error().stack.split('\n').slice(2, 5).join(' | ')); return oc(); }; });
  await b.evaluate(() => PW.app.visitCode('ayse1234')); await b.waitForTimeout(4000);
  // 1) malicious raw presence + spam from a forged peer straight onto the channel
  await a.evaluate(() => {
    const bc = new BroadcastChannel('pw-h-ayse1234');
    bc.postMessage({ from: 'evil', type: 'pres', data: { u: 'evil1234', n: '<img src=x onerror=alert(1)>siktir', lv: 9999, av: { g: 'm', hs: 'nope', sk: 99 }, st: 'hack', tl: -5, seat: 9999, x: 1e9, z: NaN, wx: 99999999, rd: { i: Array(5000).fill(['f_desk_wood', 1, 1, 0]) } } });
    bc.postMessage({ from: 'evil2', type: 'pres', data: { u: 'evil2222', n: '<img src=x onerror=alert(1)>', lv: 9999, av: { g: 'm', hs: 'nope', sk: 99, acc: ['x', 'a_crown'] }, st: 'hack', tl: -5, seat: 9999, x: 1e9, z: 'a', wx: 99999999, rd: { i: [['f_desk_wood', 1e9, 2, 7, 'red', 'zz']], theme: 'evil', size: 1000 } } });
    for (let i = 0; i < 20; i++) bc.postMessage({ from: 'evil2', type: 'chat', t: 'spam ' + (i % 3) });
    bc.postMessage({ from: 'huge', type: 'pres', data: { u: 'huge1234', n: 'x'.repeat(50000) } });
    for (let i = 0; i < 20; i++) bc.postMessage({ from: 'evil', type: 'chat', t: 'spam ' + (i % 2) });
    bc.postMessage({ from: 'evil', type: 'chat', t: 'amk siktir git' });
  });
  await b.evaluate(() => PW.app.sendChat('Merhaba orospu çocuğu, şaka şaka'));
  await a.waitForTimeout(3000);
  console.log('T', ((Date.now()/1000)%1000).toFixed(1), await b.evaluate(() => PW.app.net && PW.app.net.mode));
  const ra = await a.evaluate(() => ({ peers: [...PW.app.peers.values()].map((p) => [p.uid, p.presence.n, p.presence.lv, p.presence.st, p.presence.wx]), chat: [...document.querySelectorAll('#chat-log .msg')].map((m) => m.textContent).slice(-8), imgs: document.querySelectorAll('#tags img, #chat-log img').length }));
  console.log('BDBG', await b.evaluate(() => JSON.stringify({ key: PW.app.chan && PW.app.chan.name, my: PW.app.chan && Object.keys(PW.app.chan.myPres), room: PW.app.room.key })));
  console.log('DBG', await a.evaluate(() => { const ch = PW.app.chan; const out = { key: ch && ch.name, raw: ch && ch._peers.map((p) => [p.peer, p.isMe, p.presence && p.presence.u, !!(p.presence && p.presence.av)]) }; try { out.san = ch._peers.filter((p) => !p.isMe).map((p) => { const s = PW.safe.presence(p.presence); return s ? [s.u, !!s.av] : null; }); PW.app.onPeers(ch._peers); } catch (e) { out.err = e.stack.slice(0, 300); } out.after = PW.app.peers.size; return JSON.stringify(out); }));
  console.log('LOG', await a.evaluate(() => JSON.stringify({log: window.__log, size: PW.app.peers.size, keys:[...PW.app.peers.keys()]})));
  console.log('A sees', JSON.stringify(ra, null, 1));
  // 2) group session: A starts, B follows
  await a.evaluate(() => PW.app.startGroup()); await b.waitForTimeout(2500);
  await b.evaluate(() => { const k = [...PW.app.peers.keys()].find((k) => PW.app.peers.get(k).uid === 'ayse1234'); PW.app.followPeer(k); });
  await b.waitForTimeout(3000);
  const ta = await a.evaluate(() => Math.round(PW.app.timer.left)), tb = await b.evaluate(() => ({ left: Math.round(PW.app.timer.left), phase: PW.app.timer.phase, follow: PW.app.follow && PW.app.follow.name, chip: !document.querySelector('#sync-chip').hidden }));
  console.log('group', ta, JSON.stringify(tb));
  await b.screenshot({ path: 'abuse-b.png' });
  // 3) A removes B from the room
  await a.evaluate(() => { const k = [...PW.app.peers.keys()].find((k) => PW.app.peers.get(k).uid === 'mehmet99'); PW.ui.openPerson('p-' + k); document.querySelector('#ps-body [data-a=kick]').click(); });
  await b.waitForTimeout(3500);
  console.log('B after kick', JSON.stringify(await b.evaluate(() => ({ room: PW.app.room.kind, name: PW.app.room.name }))), 'A peers', await a.evaluate(() => PW.app.peers.size));
  console.log(errs.join('\n') || 'no errors');
  await browser.close();
})();
