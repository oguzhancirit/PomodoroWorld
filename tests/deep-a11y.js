const name = `window.accName = (el) => (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || el.value || (el.labels && el.labels[0] && el.labels[0].textContent) || el.getAttribute('placeholder') || '').trim(); 1`;
const scan = async (screen) => {
  const vis = (el) => { const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden') return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[hidden]'); };
  const noName = [...document.querySelectorAll('button, a[href], [role=button], [role=radio]')].filter(vis).filter((b) => !accName(b)).map((b) => (b.id || b.className || b.outerHTML.slice(0, 60)).toString());
  check(screen + ': buttons have names', noName.length === 0, noName.slice(0, 8));
  const noLab = [...document.querySelectorAll('input:not([type=hidden]), select, textarea')].filter(vis).filter((i) => !accName(i)).map((i) => i.id || i.className || i.outerHTML.slice(0, 60));
  check(screen + ': inputs have labels', noLab.length === 0, noLab.slice(0, 8));
  const noAlt = [...document.querySelectorAll('img')].filter(vis).filter((i) => !i.hasAttribute('alt')).map((i) => i.src.slice(0, 40));
  check(screen + ': images have alt', noAlt.length === 0, noAlt.slice(0, 5));
};
module.exports = [
  ['setup', name],
  ['scan-inject', `window.scan = ${scan.toString()}; 1`],
  ['basics', async () => { check('html lang', document.documentElement.lang === 'tr', document.documentElement.lang); check('title', document.title.length > 3); }],
  ['home', async () => { await scan('home'); }],
  ['focus', async () => { PW.ui.openFocus(); await wait(300); await scan('focus'); }],
  ['focus kbd', async () => {
    check('focus moved into focus screen', document.getElementById('focus').contains(document.activeElement), document.activeElement && (document.activeElement.id || document.activeElement.tagName));
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); await wait(150);
    check('Space starts timer', PW.app.timer.running, PW.app.timer.phase);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); await wait(150);
    check('Space pauses timer', !PW.app.timer.running && PW.app.timer.phase === 'focus');
    PW.app.stop(); PW.ui.closeFocus(); await wait(200);
  }],
  ['modals', async () => {
    for (const n of ['world', 'shop', 'char', 'profile', 'quests', 'roomset', 'help']) {
      const opener = document.getElementById('nav-home'); opener.focus();
      PW.ui.open(n); await wait(350); await scan(n);
      const m = document.getElementById('m-' + n);
      check(n + ': focus moved into dialog', m.contains(document.activeElement), document.activeElement && (document.activeElement.id || document.activeElement.className));
      check(n + ': dialog role', m.getAttribute('role') === 'dialog' || (m.querySelector('[role=dialog]') != null), m.getAttribute('role'));
      // Tab from the last focusable wraps to the first (focus trap)
      const f = [...m.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((e) => !e.disabled && e.getBoundingClientRect().width > 0);
      if (f.length > 1) { f[f.length - 1].focus(); const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }); f[f.length - 1].dispatchEvent(ev); await wait(50); check(n + ': tab trapped', ev.defaultPrevented && m.contains(document.activeElement), document.activeElement && document.activeElement.id); }
      PW.ui.close(); await wait(200);
      check(n + ': focus restored', document.activeElement === opener, document.activeElement && (document.activeElement.id || document.activeElement.tagName));
    }
  }],
  ['reduced motion css', async () => { const css = [...document.styleSheets].map((s) => { try { return [...s.cssRules].map((r) => r.cssText).join(' '); } catch (e) { return ''; } }).join(' '); check('prefers-reduced-motion rule', css.includes('prefers-reduced-motion')); }],
];
