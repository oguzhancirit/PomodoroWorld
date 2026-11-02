/* Pomodoro World — shared helpers */
(function () {
  const PW = (window.PW = window.PW || {});
  /* colour management: author colours in sRGB, light & shade in linear space (renderer outputs sRGB) */
  if (window.THREE && !THREE.Color.prototype.__pwCM) {
    const C = THREE.Color.prototype; C.__pwCM = true;
    const sh = C.setHex, ss = C.setStyle, shsl = C.setHSL, gh = C.getHex, ghsl = C.getHSL;
    let depth = 0;
    const wrap = (fn) => function (...a) { depth++; try { fn.apply(this, a); } finally { depth--; } if (!depth) this.convertSRGBToLinear(); return this; };
    C.setHex = wrap(sh); C.setStyle = wrap(ss); C.setHSL = wrap(shsl);
    C.getHex = function () { return gh.call(this.clone().convertLinearToSRGB()); };
    C.getHSL = function (t) { return ghsl.call(this.clone().convertLinearToSRGB(), t); };
  }

  PW.util = {
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    rand: (a, b) => a + Math.random() * (b - a),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    uid: () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4),
    todayKey: (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
    weekKey: (d = new Date()) => {
      const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const day = t.getUTCDay() || 7;
      t.setUTCDate(t.getUTCDate() + 4 - day);
      const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
      return t.getUTCFullYear() + '-W' + Math.ceil(((t - y0) / 86400000 + 1) / 7);
    },
    fmtTime: (s) => {
      s = Math.max(0, Math.round(s));
      const m = Math.floor(s / 60), r = s % 60;
      return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
    },
    fmtMin: (m) => {
      m = Math.round(m);
      if (m < 60) return m + ' dk';
      return Math.floor(m / 60) + ' sa ' + (m % 60) + ' dk';
    },
    esc: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    hashStr: (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
    seeded: (seed) => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; },
    store: {
      get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
      set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
      raw(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    },
  };

  /* ---------- Three.js helpers ---------- */
  const matCache = new Map();
  PW.mat = function (color, opt = {}) {
    const key = color + '|' + JSON.stringify(opt);
    if (matCache.has(key)) return matCache.get(key);
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: opt.rough != null ? opt.rough : 0.75,
      metalness: opt.metal || 0,
      emissive: opt.emissive ? new THREE.Color(opt.emissive) : new THREE.Color(0x000000),
      emissiveIntensity: opt.ei != null ? opt.ei : 1,
      transparent: !!opt.opacity,
      opacity: opt.opacity || 1,
      side: opt.double ? THREE.DoubleSide : THREE.FrontSide,
      flatShading: !!opt.flat,
      envMapIntensity: opt.env != null ? opt.env : 0.35,
    });
    if (opt.map) m.map = opt.map;
    matCache.set(key, m);
    return m;
  };
  // unique (non-cached) material for things whose colour changes
  PW.matU = function (color, opt = {}) {
    return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: opt.rough != null ? opt.rough : 0.8, metalness: opt.metal || 0, emissive: new THREE.Color(opt.emissive || 0), emissiveIntensity: opt.ei != null ? opt.ei : 1, transparent: !!opt.opacity, opacity: opt.opacity || 1, envMapIntensity: 0.3 });
  };

  const geoCache = new Map();
  function cachedGeo(key, make) { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); }

  function finish(mesh, parent, x, y, z, shadow = true) {
    mesh.position.set(x || 0, y || 0, z || 0);
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    if (parent) parent.add(mesh);
    return mesh;
  }
  PW.box = (p, w, h, d, mat, x, y, z) => finish(new THREE.Mesh(cachedGeo(`b${w}_${h}_${d}`, () => new THREE.BoxGeometry(w, h, d)), typeof mat === 'string' || typeof mat === 'number' ? PW.mat(mat) : mat), p, x, y, z);
  PW.cyl = (p, rt, rb, h, mat, x, y, z, seg = 20) => finish(new THREE.Mesh(cachedGeo(`c${rt}_${rb}_${h}_${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), typeof mat === 'string' || typeof mat === 'number' ? PW.mat(mat) : mat), p, x, y, z);
  PW.sph = (p, r, mat, x, y, z, ws = 20, hs = 14) => finish(new THREE.Mesh(cachedGeo(`s${r}_${ws}_${hs}`, () => new THREE.SphereGeometry(r, ws, hs)), typeof mat === 'string' || typeof mat === 'number' ? PW.mat(mat) : mat), p, x, y, z);
  PW.tor = (p, r, t, mat, x, y, z, arc = Math.PI * 2) => finish(new THREE.Mesh(cachedGeo(`t${r}_${t}_${arc}`, () => new THREE.TorusGeometry(r, t, 10, 28, arc)), typeof mat === 'string' || typeof mat === 'number' ? PW.mat(mat) : mat), p, x, y, z);
  PW.cone = (p, r, h, mat, x, y, z, seg = 20) => finish(new THREE.Mesh(cachedGeo(`k${r}_${h}_${seg}`, () => new THREE.ConeGeometry(r, h, seg)), typeof mat === 'string' || typeof mat === 'number' ? PW.mat(mat) : mat), p, x, y, z);

  // rounded box via extrude (bevelled) — soft furniture look
  PW.rbox = (p, w, h, d, r, mat, x, y, z) => {
    const geo = cachedGeo(`rb${w}_${h}_${d}_${r}`, () => {
      r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
      const s = new THREE.Shape();
      const iw = w - 2 * r, ih = h - 2 * r;
      s.moveTo(-iw / 2, -h / 2);
      s.lineTo(iw / 2, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -ih / 2);
      s.lineTo(w / 2, ih / 2); s.quadraticCurveTo(w / 2, h / 2, iw / 2, h / 2);
      s.lineTo(-iw / 2, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, ih / 2);
      s.lineTo(-w / 2, -ih / 2); s.quadraticCurveTo(-w / 2, -h / 2, -iw / 2, -h / 2);
      const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.98, bevelSegments: 3, steps: 1, curveSegments: 4 });
      g.translate(0, 0, -(d - 2 * r) / 2);
      g.computeVertexNormals();
      return g;
    });
    return finish(new THREE.Mesh(geo, typeof mat === 'string' || typeof mat === 'number' ? PW.mat(mat) : mat), p, x, y, z);
  };

  // capsule from lathe (r128 has no CapsuleGeometry). Origin at top, extends down by len.
  PW.capsuleGeo = (r, len, rb) => cachedGeo(`cap${r}_${len}_${rb}`, () => {
    rb = rb == null ? r : rb;
    const pts = [];
    const seg = 7;
    for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * rb, -len + rb - Math.cos(a) * rb)); }
    for (let i = seg; i >= 0; i--) { const a = (i / seg) * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * r, -r + Math.cos(a) * r)); }
    const g = new THREE.LatheGeometry(pts, 18);
    g.computeVertexNormals();
    return g;
  });
  PW.capsule = (p, r, len, mat, x, y, z, rb) => finish(new THREE.Mesh(PW.capsuleGeo(r, len, rb), typeof mat === 'string' || typeof mat === 'number' ? PW.mat(mat) : mat), p, x, y, z);

  PW.lathe = (p, pts, mat, x, y, z, seg = 24) => {
    const key = 'l' + pts.map((q) => q.join(',')).join(';') + seg;
    const geo = cachedGeo(key, () => { const g = new THREE.LatheGeometry(pts.map((q) => new THREE.Vector2(q[0], q[1])), seg); g.computeVertexNormals(); return g; });
    return finish(new THREE.Mesh(geo, typeof mat === 'string' || typeof mat === 'number' ? PW.mat(mat) : mat), p, x, y, z);
  };

  PW.canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); draw(g, w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    t.userData = { canvas: c, ctx: g };
    return t;
  };
})();
