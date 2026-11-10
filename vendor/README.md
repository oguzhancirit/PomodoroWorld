# vendor/ — third-party code served from this repo (no CDN)

The old v1 page (`index.html`) used to load these from cdnjs/jsdelivr without integrity checks. This site shares an
origin with other apps, so a hijacked CDN file could read their browser data. Now everything comes from here.

| Path | What | Source |
|---|---|---|
| `three/three.min.js` + `three/examples/js/...` | three.js r128 (MIT) | `npm pack three@0.128.0`, files copied with the same folder layout |
| `trystero-0.25.4.mjs` | Trystero 0.25.4 (MIT), one bundled file | `npx esbuild node_modules/trystero/dist/index.mjs --bundle --format=esm --minify --platform=browser --legal-comments=inline` |

Licences: `three/LICENSE`, `LICENSE-trystero`. To update a library, replace the file here, bump `CACHE` in `sw.js`.
