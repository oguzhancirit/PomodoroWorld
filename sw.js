/* Pomodoro World service worker: the app keeps working offline (solo pomodoro, room design, progress).
   App files: network-first (updates arrive immediately, cache is the offline fallback).
   Pinned CDN libraries (versioned URLs never change): cache-first. */
const CACHE = 'pw-v6';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png',
  './js/util.js', './js/data.js', './js/models.js', './js/avatar.js', './js/world.js', './js/render.js', './js/net.js', './js/safety.js', './js/sound.js', './js/app.js', './js/ui.js', './js/features.js', './js/cinema.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const pinned = /cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128|cdn\.jsdelivr\.net\/npm\/three@0\.128\.0|fonts\.(googleapis|gstatic)\.com/.test(req.url);
  if (pinned) { e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return res; }))); return; }
  if (url.origin !== location.origin) return; // realtime/signalling traffic is never cached
  e.respondWith(fetch(req).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return res; }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))));
});
