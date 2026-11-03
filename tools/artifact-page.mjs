// Turns the Vite build into a Claude artifact: the page body (the artifact adds its own <html>/<head>)
// plus the list of supporting files to publish next to it.
import fs from 'node:fs';
import path from 'node:path';
const dist = new URL('../client/dist/', import.meta.url).pathname;
const html = fs.readFileSync(dist + 'index.html', 'utf8');
const tags = [...html.matchAll(/<(script|link)[^>]*(src|href)="\.\/assets\/[^"]+"[^>]*>(<\/script>)?/g)].map((m) => m[0].replace(/ crossorigin/g, ''));
const page = `<title>Pomodoro World</title>
<meta name="theme-color" content="#16141f">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Manrope:wght@500;600;700;800&display=swap">
<style>:root{color-scheme:dark;background:#16141f}body{background:#16141f;color:#f4f1ec}</style>
${tags.join('\n')}
<div id="root"></div>
`;
const out = new URL('../client/dist-artifact/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(out + 'index.html', page);
const files = {};
const walk = (d) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p); else { const rel = path.relative(dist, p); if (rel !== 'index.html' && !rel.endsWith('.glb')) files[rel] = 'client/dist/' + rel; } } };
walk(dist);
fs.writeFileSync(out + 'files.json', JSON.stringify(files, null, 1));
console.log(page); console.log(Object.keys(files).length, 'files', Object.keys(files));
