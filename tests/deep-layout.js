// layout checks for each screen at the current viewport
const audit = async (screen) => {
  await wait(350);
  const vw = innerWidth, vh = innerHeight;
  const vis = (el) => { const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[hidden]'); };
  check(screen + ': no page h-scroll', document.documentElement.scrollWidth <= vw + 1, document.documentElement.scrollWidth);
  // interactive elements must sit inside the viewport (unless inside a scroll container)
  const out = [];
  document.querySelectorAll('button, input, select, a[href], [role=radio]').forEach((el) => {
    if (!vis(el)) return; const r = el.getBoundingClientRect();
    let p = el.parentElement, scroller = false; while (p && p !== document.body) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && (p.scrollHeight > p.clientHeight + 2 || p.scrollWidth > p.clientWidth + 2)) { scroller = true; break; } p = p.parentElement; }
    if (scroller) return;
    if (r.right > vw + 1 || r.left < -1 || r.bottom > vh + 1 || r.top < -1) out.push((el.id || el.className || el.tagName).toString().slice(0, 30) + ' ' + [r.left, r.top, r.right, r.bottom].map(Math.round).join(','));
  });
  check(screen + ': controls inside viewport', out.length === 0, out.slice(0, 6));
  // clipped text in buttons / chips
  const clip = [];
  document.querySelectorAll('button, .chip, h3, h4, .fx-cat, .fx-dur').forEach((el) => { if (!vis(el)) return; if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible') clip.push((el.id || el.className || el.tagName).toString().slice(0, 30) + ':' + el.textContent.trim().slice(0, 20)); });
  check(screen + ': no clipped labels', clip.length === 0, clip.slice(0, 6));
  // fixed HUD pieces must not overlap each other
  const sel = ['.hud-me', '.pills', 'nav.main', '#roomcard', '#people', '#chat', '#mini', '#editbar', '.fx-center'];
  const els = sel.map((s) => [s, document.querySelector(s)]).filter(([, e]) => e && vis(e));
  const ov = [];
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = els[i][1].getBoundingClientRect(), b = els[j][1].getBoundingClientRect();
    if (els[i][1].contains(els[j][1]) || els[j][1].contains(els[i][1])) continue;
    const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (ix > 4 && iy > 4) ov.push(els[i][0] + '×' + els[j][0] + ` ${Math.round(ix)}x${Math.round(iy)}`);
  }
  check(screen + ': HUD no overlap', ov.length === 0, ov);
  // small tap targets on touch sizes
  if (vw < 900) { const small = []; document.querySelectorAll('button').forEach((el) => { if (!vis(el)) return; const r = el.getBoundingClientRect(); if (r.width < 28 || r.height < 28) small.push((el.id || el.className || el.textContent).toString().trim().slice(0, 24) + ` ${Math.round(r.width)}x${Math.round(r.height)}`); }); check(screen + ': tap targets ≥28px', small.length === 0, small.slice(0, 8)); }
};
module.exports = [
  ['inject', `window.audit = ${audit.toString()}; 1`],
  ['home', async () => { PW.ui.close(); await audit('home'); }],
  ['focus-idle', async () => { PW.ui.openFocus(); await audit('focus idle'); }],
  ['focus-custom', async () => { document.querySelector('[data-dur=custom]').click(); await audit('focus custom'); }],
  ['focus-run', async () => { document.querySelector('[data-dur=p25]').click(); document.querySelector('#fx-go').click(); await audit('focus running'); PW.app.stop(); PW.ui.closeFocus(); }],
  ['world', async () => { PW.ui.open('world'); await audit('world'); PW.ui.close(); }],
  ['shop', async () => { PW.ui.open('shop'); await audit('shop'); PW.ui.close(); }],
  ['char', async () => { PW.ui.open('char'); await wait(500); await audit('char'); PW.ui.close(); }],
  ['profile', async () => { PW.ui.open('profile'); await audit('profile'); PW.ui.close(); }],
  ['quests', async () => { PW.ui.open('quests'); await audit('quests'); PW.ui.close(); }],
  ['roomset', async () => { PW.ui.open('roomset'); await audit('roomset'); PW.ui.close(); }],
  ['help', async () => { PW.ui.open('help'); await audit('help'); PW.ui.close(); }],
  ['edit', async () => { PW.ui.setEditing(true, true); await audit('editor'); PW.ui.setEditing(false); }],
  ['social', async () => { await PW.app.enterPublic('meydan'); await wait(600); await audit('social room'); await PW.app.enterHome(); }],
  ['toast', async () => { PW.ui.toast('Deneme bildirimi uzun bir başlık', 'Bu bildirim düzeni bozmamalı, alt satıra geçmeli.'); await audit('with toast'); }],
];
