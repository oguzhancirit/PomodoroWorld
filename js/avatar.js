/* Pomodoro World — 3D characters v2
   Hand-built stylised characters: layered eyes with painted irises, lashes, brows,
   expressive mouth decals, strand-clump hair, fabric textures and body shape options. */
(function () {
  const PW = window.PW;
  const { box, cyl, sph, rbox, tor, cone, capsule, lathe, mat } = PW;
  const U = PW.util;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  /* ---------------- options ---------------- */
  PW.EYE_STYLES = [['round', 'Yuvarlak'], ['almond', 'Badem'], ['sleepy', 'Uykulu'], ['sparkle', 'Parıltılı'], ['cat', 'Çekik']];
  PW.BROW_STYLES = [['soft', 'Yumuşak'], ['thick', 'Kalın'], ['arched', 'Kavisli'], ['straight', 'Düz']];
  PW.MOUTH_STYLES = [['smile', 'Gülümseme'], ['grin', 'Kocaman gülüş'], ['calm', 'Sakin'], ['cat', 'Kedi ağzı'], ['smirk', 'Yarım gülüş']];
  PW.BODY_TYPES = [['slim', 'İnce'], ['reg', 'Orta'], ['broad', 'Geniş']];
  PW.TOP_PATTERNS = [['plain', 'Düz'], ['stripe', 'Çizgili'], ['check', 'Ekose'], ['dots', 'Puantiye'], ['color', 'Renk bloklu']];
  PW.LIPS = ['', '#D9707C', '#B83A4B', '#C98A73'];

  PW.defaultAvatar = (g = 'm') => g === 'f'
    ? { g: 'f', sk: 1, hs: 'h_long', hc: 2, ec: 1, ey: 'sparkle', br: 'arched', mo: 'smile', bl: 1, fr: 0, lp: 1, ht: 0.97, bd: 'slim', top: 't_blouse', tc: 11, tc2: 0, tp: 'plain', bot: 'b_jeans', bc: 8, sh: 's_sneaker', shc: 0, fh: 'fh_none', acc: [] }
    : { g: 'm', sk: 2, hs: 'h_short', hc: 1, ec: 0, ey: 'round', br: 'soft', mo: 'smile', bl: 0, fr: 0, lp: 0, ht: 1.0, bd: 'reg', top: 't_tee', tc: 8, tc2: 0, tp: 'plain', bot: 'b_jeans', bc: 9, sh: 's_sneaker', shc: 0, fh: 'fh_none', acc: [] };

  PW.randomAvatar = (rnd = Math.random) => {
    const g = rnd() < 0.5 ? 'm' : 'f';
    const pool = (slot) => PW.AVATAR_ITEMS.filter((i) => i.slot === slot && (i.g === 'u' || i.g === g) && i.lvl <= 9);
    const p = (arr) => arr[Math.floor(rnd() * arr.length)];
    const accs = [];
    if (rnd() < 0.35) accs.push(p(['a_glasses_round', 'a_glasses_square']));
    if (rnd() < 0.3) accs.push(p(['a_headphones', 'a_beanie', 'a_cap', 'a_catears']));
    if (rnd() < 0.2) accs.push(p(['a_scarf', 'a_necklace', 'a_earrings']));
    const uniq = []; accs.forEach((a) => { if (!uniq.some((x) => PW.ITEM[x].sub === PW.ITEM[a].sub)) uniq.push(a); });
    return {
      g, sk: Math.floor(rnd() * 8), hs: p(pool('hair')).id, hc: Math.floor(rnd() * 9), ec: Math.floor(rnd() * 5),
      ey: p(PW.EYE_STYLES)[0], br: p(PW.BROW_STYLES)[0], mo: p(PW.MOUTH_STYLES)[0], bl: g === 'f' || rnd() < 0.3 ? 1 : 0, fr: rnd() < 0.2 ? 1 : 0, lp: g === 'f' ? Math.floor(rnd() * 4) : 0,
      ht: 0.94 + rnd() * 0.12, bd: p(PW.BODY_TYPES)[0], top: p(pool('top')).id, tc: Math.floor(rnd() * 16), tc2: Math.floor(rnd() * 16), tp: p(PW.TOP_PATTERNS)[0],
      bot: p(pool('bottom')).id, bc: Math.floor(rnd() * 16), sh: p(pool('shoes')).id, shc: Math.floor(rnd() * 16), fh: g === 'm' ? p(pool('beard')).id : 'fh_none', acc: uniq,
    };
  };

  const shade = (hex, k) => { const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, Math.min(1, hsl.s * (k < 1 ? 1.05 : 0.95)), U.clamp(hsl.l * k, 0, 1)); return '#' + c.getHexString(); };

  /* ---------------- textures ---------------- */
  const texCache = new Map();
  function cachedTex(key, w, h, draw, rep) {
    if (texCache.has(key)) return texCache.get(key);
    const t = PW.canvasTex(w, h, draw); if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    texCache.set(key, t); return t;
  }
  function fabricTex(kind, c1, c2) {
    return cachedTex(`fab-${kind}-${c1}-${c2}`, 256, 256, (c, w, h) => {
      c.fillStyle = c1; c.fillRect(0, 0, w, h);
      const r = U.seeded(U.hashStr(kind + c1));
      if (kind === 'stripe') { c.fillStyle = c2; for (let y = 0; y < h; y += 32) c.fillRect(0, y, w, 13); }
      else if (kind === 'check') { c.globalAlpha = 0.55; c.fillStyle = c2; for (let x = 0; x < w; x += 64) c.fillRect(x, 0, 26, h); for (let y = 0; y < h; y += 64) c.fillRect(0, y, w, 26); c.globalAlpha = 0.35; c.fillStyle = shade(c2, 0.6); for (let x = 10; x < w; x += 64) c.fillRect(x, 0, 4, h); for (let y = 10; y < h; y += 64) c.fillRect(0, y, w, 4); c.globalAlpha = 1; }
      else if (kind === 'dots') { c.fillStyle = c2; for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? 16 : 0; x < w; x += 32) { c.beginPath(); c.arc(x + 8, y + 8, 5, 0, 7); c.fill(); } }
      else if (kind === 'color') { c.fillStyle = c2; c.fillRect(0, h * 0.42, w, h * 0.22); }
      else if (kind === 'denim') { for (let i = 0; i < 2600; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.08)'; const x = r() * w, y = r() * h; c.fillRect(x, y, 6, 1.4); } c.strokeStyle = 'rgba(255,255,255,.05)'; for (let i = -h; i < w; i += 5) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.stroke(); } }
      else if (kind === 'knit') { c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = 2; for (let x = 0; x < w; x += 16) for (let y = 0; y < h; y += 12) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 8, y + 10); c.lineTo(x + 16, y); c.stroke(); } }
      if (kind !== 'denim' && kind !== 'knit') { for (let i = 0; i < 1800; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.05)'; c.fillRect(r() * w, r() * h, 2, 2); } }
    }, [kind === 'check' || kind === 'dots' ? 3 : 2, kind === 'stripe' ? 3 : 2]);
  }
  function irisTex(color, style) {
    return cachedTex(`iris-${color}-${style}`, 128, 128, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      const g = c.createRadialGradient(64, 70, 6, 64, 64, 62);
      g.addColorStop(0, shade(color, 1.9)); g.addColorStop(0.55, color); g.addColorStop(0.85, shade(color, 0.55)); g.addColorStop(1, '#120c08');
      c.fillStyle = g; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill();
      c.globalAlpha = 0.25; c.strokeStyle = shade(color, 1.6); c.lineWidth = 2;
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; c.beginPath(); c.moveTo(64 + Math.cos(a) * 24, 64 + Math.sin(a) * 24); c.lineTo(64 + Math.cos(a) * 54, 64 + Math.sin(a) * 54); c.stroke(); }
      c.globalAlpha = 1; c.fillStyle = '#0B0806'; c.beginPath(); c.arc(64, 66, style === 'cat' ? 14 : 22, 0, 7); c.fill();
      c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(44, 40, 15, 12, -0.5, 0, 7); c.fill(); c.beginPath(); c.arc(86, 90, 7, 0, 7); c.fill();
      if (style === 'sparkle') { c.save(); c.translate(84, 38); c.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 4 : 12, a = i * Math.PI / 4; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.restore(); }
    });
  }
  function mouthTex(kind, lip) {
    return cachedTex(`mouth-${kind}-${lip}`, 128, 64, (c, w, h) => {
      c.clearRect(0, 0, w, h); c.lineCap = 'round'; c.lineJoin = 'round';
      const line = lip || '#7A2E2A';
      if (kind === 'open' || kind === 'grin') {
        c.fillStyle = '#5A1A1E'; c.beginPath(); c.moveTo(34, 18); c.quadraticCurveTo(64, kind === 'open' ? 62 : 54, 94, 18); c.quadraticCurveTo(64, 26, 34, 18); c.fill();
        c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(38, 19); c.quadraticCurveTo(64, 27, 90, 19); c.lineTo(88, 26); c.quadraticCurveTo(64, 32, 40, 26); c.fill();
        c.fillStyle = '#E07A80'; c.beginPath(); c.ellipse(64, kind === 'open' ? 44 : 40, 15, 7, 0, 0, 7); c.fill();
        if (lip) { c.strokeStyle = lip; c.lineWidth = 4; c.beginPath(); c.moveTo(34, 18); c.quadraticCurveTo(64, kind === 'open' ? 62 : 54, 94, 18); c.stroke(); }
      } else if (kind === 'o') { c.fillStyle = '#5A1A1E'; c.beginPath(); c.ellipse(64, 32, 12, 15, 0, 0, 7); c.fill(); }
      else if (kind === 'cat') { c.strokeStyle = line; c.lineWidth = 5; c.beginPath(); c.moveTo(38, 22); c.quadraticCurveTo(51, 38, 64, 24); c.quadraticCurveTo(77, 38, 90, 22); c.stroke(); }
      else if (kind === 'calm') { c.strokeStyle = line; c.lineWidth = 5; c.beginPath(); c.moveTo(48, 30); c.quadraticCurveTo(64, 35, 80, 30); c.stroke(); }
      else if (kind === 'smirk') { c.strokeStyle = line; c.lineWidth = 5; c.beginPath(); c.moveTo(44, 32); c.quadraticCurveTo(66, 36, 86, 22); c.stroke(); }
      else if (kind === 'focus') { c.strokeStyle = line; c.lineWidth = 5; c.beginPath(); c.moveTo(50, 32); c.lineTo(78, 32); c.stroke(); }
      else { if (lip) { c.fillStyle = lip; c.beginPath(); c.moveTo(38, 22); c.quadraticCurveTo(64, 48, 90, 22); c.quadraticCurveTo(64, 32, 38, 22); c.fill(); } c.strokeStyle = line; c.lineWidth = 5; c.beginPath(); c.moveTo(38, 22); c.quadraticCurveTo(64, 46, 90, 22); c.stroke(); }
    });
  }
  function frecklesTex() { return cachedTex('freckles', 64, 64, (c) => { c.clearRect(0, 0, 64, 64); c.fillStyle = 'rgba(120,70,40,.55)'; [[20, 26], [30, 34], [40, 24], [26, 42], [44, 38], [34, 18]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill(); }); }); }
  function blushTex() { return cachedTex('blush', 64, 64, (c) => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(240,110,120,.55)'); g.addColorStop(1, 'rgba(240,110,120,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }); }

  /* ---------------- tapered ribbon geometry (hair clumps) ---------------- */
  function clumpGeo(points, center, r0, r1, flat = 1.8, segs = 12, radial = 7, colorRoot, colorTip) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    const pos = [], col = [], idx = [];
    const T = new THREE.Vector3(), O = new THREE.Vector3(), S = new THREE.Vector3(), P = new THREE.Vector3();
    const cR = new THREE.Color(colorRoot), cT = new THREE.Color(colorTip), cc = new THREE.Color();
    for (let i = 0; i <= segs; i++) {
      const t = i / segs; curve.getPointAt(t, P); curve.getTangentAt(t, T);
      O.copy(P).sub(center).normalize(); S.crossVectors(T, O).normalize(); O.crossVectors(S, T).normalize();
      const rr = THREE.MathUtils.lerp(r0, r1, Math.pow(t, 0.9)) * (i === segs ? 0.15 : 1);
      cc.copy(cR).lerp(cT, t);
      for (let k = 0; k < radial; k++) {
        const a = (k / radial) * Math.PI * 2, cs = Math.cos(a) * rr * flat, sn = Math.sin(a) * rr * 0.55;
        pos.push(P.x + S.x * cs + O.x * sn, P.y + S.y * cs + O.y * sn, P.z + S.z * cs + O.z * sn);
        col.push(cc.r, cc.g, cc.b);
      }
    }
    for (let i = 0; i < segs; i++) for (let k = 0; k < radial; k++) { const a = i * radial + k, b = i * radial + (k + 1) % radial, c = a + radial, d = b + radial; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function mergeGeos(geos) {
    let n = 0, m = 0; geos.forEach((g) => { n += g.attributes.position.count; m += g.index.count; });
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), nor = new Float32Array(n * 3), idx = new Uint32Array(m);
    let o = 0, io = 0;
    geos.forEach((g) => { pos.set(g.attributes.position.array, o * 3); col.set(g.attributes.color.array, o * 3); nor.set(g.attributes.normal.array, o * 3); const ia = g.index.array; for (let i = 0; i < ia.length; i++) idx[io + i] = ia[i] + o; o += g.attributes.position.count; io += ia.length; g.dispose(); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
    return g;
  }

  /* ---------------- hair styles ---------------- */
  const HC = V3(0, 0.17, 0), HR = 0.205;
  function deform(x, y, z) {
    let nx = x, ny = y, nz = z;
    const low = Math.max(0, -y);
    nx *= 1.02 - 0.1 * Math.pow(low, 2.2);
    nz *= 0.96 + 0.06 * Math.max(0, z) * (1 - Math.abs(y));
    ny *= y < 0 ? 0.94 : 0.99;
    return [nx, ny, nz];
  }
  let _headGeo = null;
  function headGeo() {
    if (_headGeo) return _headGeo;
    const g = new THREE.SphereGeometry(HR, 48, 36); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const [x, y, z] = deform(p.getX(i) / HR, p.getY(i) / HR, p.getZ(i) / HR); p.setXYZ(i, x * HR, y * HR, z * HR); }
    g.computeVertexNormals(); _headGeo = g; return g;
  }
  const onHead = (polar, az, k = 1.06) => { const [x, y, z] = deform(Math.sin(polar) * Math.sin(az), Math.cos(polar), Math.sin(polar) * Math.cos(az)); return V3(x * HR * k, 0.17 + y * HR * k, z * HR * k); };
  // a clump flowing over the scalp from crown to an end polar angle, optional continuation (array of extra points)
  function scalpClump(az, endPolar, opts = {}) {
    const start = opts.start != null ? opts.start : 0.12;
    const pts = []; const n = 5;
    const swirl = opts.swirl || 0;
    for (let i = 0; i <= n; i++) { const t = i / n; const pol = start + (endPolar - start) * t; const bulge = 1.07 + Math.sin(t * Math.PI) * (opts.bulge || 0.06); pts.push(onHead(pol, az + swirl * t, bulge)); }
    if (opts.tail) opts.tail.forEach((p) => pts.push(p));
    return pts;
  }
  function buildHair(head, id, M, cfg) {
    if (id === 'h_bald') return;
    const root = shade(M.hairHex, 0.62), tip = shade(M.hairHex, 1.18);
    const geos = [];
    const add = (pts, r0, r1, flat, segs) => geos.push(clumpGeo(pts, HC, r0, r1, flat, segs || 12, 7, root, tip));
    // base cap to hide scalp
    const capTheta = id === 'h_buzz' || id === 'h_mohawk' ? 1.62 : 1.72;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(HR * 1.035, 32, 18, 0, Math.PI * 2, 0, capTheta), M.hairCap);
    cap.position.copy(HC); cap.rotation.x = -0.6; cap.castShadow = true; head.add(cap);
    if (id === 'h_buzz') return;
    const R = U.seeded(U.hashStr(id) + 7);
    const fringe = (count, endP, spread, sweep, len) => { for (let i = 0; i < count; i++) { const az = -spread + (2 * spread * i) / (count - 1) + (R() - 0.5) * 0.08; add(scalpClump(az, endP + (R() - 0.5) * 0.12, { swirl: sweep, start: 0.2, bulge: 0.08 }), 0.042, 0.008, 2.0, 10); } };
    const crownRing = (count, endP, from, to, extra) => { for (let i = 0; i < count; i++) { const az = from + (to - from) * (i / (count - 1)); const e = endP + 0.5 * Math.max(0, -Math.cos(az)) + (R() - 0.5) * 0.1; add(scalpClump(az, e, Object.assign({ bulge: 0.06 }, extra)), 0.05, 0.01, 1.9); } };
    const longTail = (az, len, wave, flare) => { const p = onHead(1.75, az, 1.08); const out = V3(Math.sin(az), 0, Math.cos(az)).multiplyScalar(flare); const pts = []; for (let i = 1; i <= 4; i++) { const t = i / 4; pts.push(V3(p.x + out.x * t + Math.sin(t * 6 + az * 3) * wave, p.y - len * t, p.z + out.z * t - 0.02 * t)); } return pts; };
    switch (id) {
      case 'h_short': fringe(7, 1.2, 0.75, 0.25); crownRing(12, 1.45, 1.0, Math.PI * 2 - 1.0, {}); crownRing(5, 1.25, 0.8, 1.6); crownRing(5, 1.25, -0.8, -1.6); break;
      case 'h_side': fringe(8, 1.18, 0.85, 0.75); crownRing(12, 1.45, 1.0, Math.PI * 2 - 1.0, {}); crownRing(5, 1.3, 0.85, 1.6, { swirl: 0.3 }); crownRing(5, 1.3, -0.85, -1.6); break;
      case 'h_spiky': for (let i = 0; i < 18; i++) { const az = (i / 18) * Math.PI * 2; const b = onHead(0.6 + (i % 3) * 0.25, az, 1.02); add([b, onHead(0.45 + (i % 3) * 0.2, az, 1.25), onHead(0.3 + (i % 3) * 0.2, az, 1.45)], 0.04, 0.004, 1.3, 6); } fringe(6, 1.18, 0.7, 0.3); break;
      case 'h_bun_m': crownRing(14, 1.45, 0, Math.PI * 2, { start: 0.3 }); fringe(6, 1.1, 0.7, 0.1); { const b = sph(head, 0.075, M.hair, 0, 0.4, -0.1, 18, 12); b.scale.set(1, 0.85, 1); } break;
      case 'h_mohawk': for (let i = 0; i < 9; i++) { const pol = -0.4 + i * 0.22; const b = V3(0, 0.17 + Math.cos(pol) * HR * 1.02, Math.sin(pol) * HR * 1.02); const up = V3(0, 0.17 + Math.cos(pol) * HR * 1.55, Math.sin(pol) * HR * 1.45 - 0.03); add([b, b.clone().lerp(up, 0.5), up], 0.05, 0.006, 1.2, 6); } break;
      case 'h_curly': case 'h_afro': {
        const big = id === 'h_afro' ? 1.35 : 1.12;
        for (let i = 0; i < (id === 'h_afro' ? 90 : 60); i++) { const pol = Math.acos(1 - R() * (id === 'h_afro' ? 1.55 : 1.3)); const az = R() * Math.PI * 2; if (pol > 1.2 && Math.cos(az) > 0.3) continue; const p = onHead(pol, az, big + R() * 0.08); const s = new THREE.Mesh(new THREE.TorusGeometry(0.028 + R() * 0.012, 0.016, 6, 10), M.hair); s.position.copy(p); s.rotation.set(R() * 6, R() * 6, R() * 6); s.castShadow = true; head.add(s); }
        if (id === 'h_afro') { const s = sph(head, 0.27, M.hair, 0, 0.24, -0.04, 24, 16); s.scale.set(1, 0.95, 0.95); }
        else { const s = sph(head, HR * 1.12, M.hair, 0, 0.19, -0.015, 24, 16); s.scale.set(1, 0.95, 0.98); s.rotation.x = -0.2; }
        break;
      }
      case 'h_long': case 'h_wavy': case 'h_pony': case 'h_braid': case 'h_buns': case 'h_space': case 'h_bob': {
        const wave = id === 'h_wavy' ? 0.03 : 0.006;
        // fringe / bangs
        if (id === 'h_bob') { fringe(9, 1.27, 0.95, 0); } else if (id === 'h_pony' || id === 'h_braid' || id === 'h_space' || id === 'h_buns') { fringe(5, 1.15, 0.55, 0.45); }
        else { fringe(6, 1.22, 0.7, 0.35); }
        // part line clumps sweeping down the sides
        const tied = id === 'h_pony' || id === 'h_braid' || id === 'h_space' || id === 'h_buns';
        for (let i = 0; i < 18; i++) {
          const az = 0.85 + (i / 17) * (Math.PI * 2 - 1.7);
          if (tied) { add(scalpClump(az, 1.55, { start: 0.25, bulge: 0.03 }), 0.05, 0.02, 1.9, 10); continue; }
          const len = id === 'h_bob' ? 0.2 : (Math.cos(az) < -0.3 ? 0.55 : 0.48);
          add(scalpClump(az, 1.7, { start: 0.2, bulge: 0.07, tail: longTail(az, len, wave, id === 'h_bob' ? 0.015 : 0.045) }), 0.05, id === 'h_bob' ? 0.03 : 0.012, 2.0, 16);
        }
        if (!tied) for (const sx of [-1, 1]) { const az = sx * 0.95; add(scalpClump(az, 1.6, { start: 0.3, bulge: 0.05, tail: longTail(az, id === 'h_bob' ? 0.18 : 0.42, wave, 0.03) }), 0.04, 0.01, 1.8, 14); }
        if (id === 'h_pony') { const tieP = V3(0, 0.29, -0.2); sph(head, 0.03, M.accent, tieP.x, tieP.y, tieP.z - 0.01, 10, 8); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, dx = Math.cos(a) * 0.025, dz = Math.sin(a) * 0.02; add([tieP.clone().add(V3(dx, 0, dz)), V3(dx * 1.6, 0.2, -0.32 + dz), V3(dx * 2, 0.02, -0.33 + dz), V3(dx * 1.4, -0.16, -0.27 + dz)], 0.035, 0.006, 1.4, 12); } }
        if (id === 'h_braid') { sph(head, 0.028, M.accent, 0, 0.28, -0.2, 10, 8); for (let i = 0; i < 9; i++) { const s = sph(head, 0.052 - i * 0.003, M.hair, (i % 2 ? 0.014 : -0.014), 0.22 - i * 0.07, -0.24 - i * 0.008, 12, 10); s.scale.set(1, 1.3, 0.9); s.rotation.z = i % 2 ? 0.5 : -0.5; } sph(head, 0.03, M.accent, 0, -0.44, -0.29, 10, 8); }
        if (id === 'h_space') { const b = sph(head, 0.105, M.hair, 0, 0.43, -0.07, 20, 14); b.scale.set(1, 0.9, 1); tor(head, 0.08, 0.013, M.accent, 0, 0.36, -0.06).rotation.x = Math.PI / 2 - 0.2; for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.06 + i * 0.012, 0.01, 6, 20, 4.5), M.hair); t.position.set(0, 0.43, -0.07); t.rotation.set(Math.PI / 2, 0, i); head.add(t); } }
        if (id === 'h_buns') for (const sx of [-1, 1]) { const b = sph(head, 0.075, M.hair, sx * 0.15, 0.37, -0.04, 18, 12); for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.045 + i * 0.012, 0.01, 6, 18, 4.5), M.hair); t.position.set(sx * 0.15, 0.37, -0.04); t.rotation.set(0, sx * 1.1, i * 1.3); head.add(t); } }
        break;
      }
      default: fringe(7, 1.2, 0.75, 0.25); crownRing(12, 1.45, 1.0, Math.PI * 2 - 1.0, {});
    }
    if (geos.length) { const m = new THREE.Mesh(mergeGeos(geos), M.hairStrand); m.castShadow = true; head.add(m); }
  }

  function buildBeard(head, id, M) {
    if (!id || id === 'fh_none') return;
    const dark = PW.matU(shade(M.hairHex, 0.85), { rough: 0.75 });
    const jawShell = (r, m, t0, tl) => { const g = new THREE.SphereGeometry(HR, 32, 18, Math.PI / 2 - 1.2, 2.4, t0, tl); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const [x, y, z] = deform(p.getX(i) / HR, p.getY(i) / HR, p.getZ(i) / HR); p.setXYZ(i, x * HR * r, y * HR * r, z * HR * r); } g.computeVertexNormals(); const mm = new THREE.Mesh(g, m); mm.position.copy(HC); head.add(mm); return mm; };
    if (id === 'fh_stubble') jawShell(1.008, PW.matU(shade(M.hairHex, 0.75), { opacity: 0.3 }), 2.2, 0.9);
    if (id === 'fh_beard') { jawShell(1.04, dark, 2.32, 0.8); for (const sx of [-1, 1]) { const sb = sph(head, 0.03, dark, sx * 0.188, 0.11, 0.03, 10, 8); sb.scale.set(0.5, 1.8, 1); } }
    if (id === 'fh_goatee') { const g = sph(head, 0.04, dark, 0, 0.02, 0.165, 12, 8); g.scale.set(1.1, 1.3, 0.8); }
    if (id === 'fh_mustache' || id === 'fh_beard' || id === 'fh_goatee') for (const sx of [-1, 1]) { const m = capsule(head, 0.017, 0.062, dark, sx * 0.006, 0.104, 0.192, 0.01); m.rotation.z = sx * 1.25; m.rotation.y = -sx * 0.25; }
  }

  /* ---------------- clothes / shoes / accessories ---------------- */
  function buildShoe(foot, id, M) {
    const s = M.shoe, sole = PW.mat('#F3EFE8', { rough: 0.9 }), dk = PW.mat('#2A2420', { rough: 0.8 });
    const toe = (h, z) => { const t = sph(foot, 0.056, s, 0, -0.05 + h, 0.09 + z, 14, 10); t.scale.set(0.95, 0.62, 1.2); };
    switch (id) {
      case 's_boots': rbox(foot, 0.12, 0.17, 0.17, 0.045, s, 0, -0.01, 0.0); toe(0, 0.0); box(foot, 0.126, 0.028, 0.25, dk, 0, -0.085, 0.04); for (let i = 0; i < 3; i++) box(foot, 0.08, 0.008, 0.01, dk, 0, 0.0 + i * 0.03, 0.087); break;
      case 's_loafer': rbox(foot, 0.11, 0.06, 0.19, 0.03, s, 0, -0.055, 0.02); toe(-0.005, -0.01); box(foot, 0.06, 0.012, 0.03, PW.mat('#C5A572', { metal: 0.6, rough: 0.3 }), 0, -0.018, 0.08); box(foot, 0.115, 0.018, 0.24, dk, 0, -0.088, 0.04); break;
      case 's_slipper': { const b = sph(foot, 0.085, s, 0, -0.05, 0.05, 16, 10); b.scale.set(0.85, 0.5, 1.45); for (const sx of [-1, 1]) { sph(foot, 0.02, PW.mat('#FFFFFF'), sx * 0.03, -0.0, 0.14, 8, 6); sph(foot, 0.006, PW.mat('#222'), sx * 0.03, 0.005, 0.158, 6, 4); } break; }
      case 's_heels': rbox(foot, 0.095, 0.05, 0.18, 0.025, s, 0, -0.04, 0.05); toe(0.005, 0.02); cyl(foot, 0.012, 0.008, 0.07, s, 0, -0.08, -0.03, 8); box(foot, 0.1, 0.01, 0.04, s, 0, -0.03, 0.09); break;
      case 's_hightop': rbox(foot, 0.12, 0.16, 0.18, 0.045, s, 0, -0.01, 0.0); toe(0, 0.01); box(foot, 0.128, 0.035, 0.25, sole, 0, -0.08, 0.04); box(foot, 0.13, 0.03, 0.05, PW.mat('#C7432F'), 0, 0.03, -0.04); for (let i = 0; i < 3; i++) box(foot, 0.07, 0.007, 0.01, sole, 0, -0.02 + i * 0.03, 0.09); break;
      default: rbox(foot, 0.105, 0.075, 0.15, 0.033, s, 0, -0.045, 0.0); toe(0, 0.0); box(foot, 0.122, 0.03, 0.245, sole, 0, -0.08, 0.04); for (let i = 0; i < 3; i++) box(foot, 0.06, 0.006, 0.012, sole, 0, -0.01 - i * 0.012, 0.075 + i * 0.016).rotation.x = -0.6; box(foot, 0.008, 0.03, 0.08, PW.mat('#ffffff'), 0.056, -0.05, 0.02);
    }
  }

  function buildAccessories(av, A, M) {
    const { head, torso, armL } = av.parts;
    const gold = mat('#E9C04F', { metal: 0.85, rough: 0.28 });
    const at = (pol, az, k) => onHead(pol, az, k);
    for (const id of A) {
      switch (id) {
        case 'a_glasses_round': case 'a_glasses_square': case 'a_sunglasses': {
          const g = new THREE.Group(); head.add(g); g.position.set(0, 0.155, 0.19);
          const f = id === 'a_sunglasses' ? mat('#141418', { rough: 0.3 }) : mat(id === 'a_glasses_round' ? '#2A2B33' : '#6B4630', { rough: 0.35 });
          for (const sx of [-1, 1]) {
            if (id === 'a_glasses_round') { tor(g, 0.047, 0.006, f, sx * 0.075, 0, 0); const l = new THREE.Mesh(new THREE.CircleGeometry(0.046, 20), mat('#CFEFFF', { opacity: 0.18 })); l.position.set(sx * 0.075, 0, 0.001); g.add(l); }
            else { const fr = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.007, 4, 4), f); fr.rotation.z = Math.PI / 4; fr.scale.set(1.1, 0.75, 1); fr.position.set(sx * 0.075, 0, 0); g.add(fr); const l = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.05), id === 'a_sunglasses' ? mat('#1A1A22', { rough: 0.1, metal: 0.5 }) : mat('#CFEFFF', { opacity: 0.18 })); l.position.set(sx * 0.075, 0, 0.001); g.add(l); }
            const arm = box(g, 0.01, 0.01, 0.2, f, sx * 0.168, 0.01, -0.1); arm.rotation.y = sx * 0.12;
          }
          box(g, 0.035, 0.008, 0.008, f, 0, 0.012, 0.004); g.rotation.x = -0.05; break;
        }
        case 'a_headphones': { const band = tor(head, HR * 1.12, 0.017, mat('#2A2B33', { rough: 0.4 }), 0, 0.17, 0, Math.PI); for (const sx of [-1, 1]) { const c = cyl(head, 0.075, 0.075, 0.05, mat('#2A2B33', { rough: 0.4 }), sx * HR * 1.1, 0.13, 0, 22); c.rotation.z = Math.PI / 2; const p = cyl(head, 0.058, 0.058, 0.054, M.accentMat, sx * HR * 1.12, 0.13, 0, 22); p.rotation.z = Math.PI / 2; } break; }
        case 'a_beanie': { const b = new THREE.Mesh(new THREE.SphereGeometry(HR * 1.13, 28, 14, 0, Math.PI * 2, 0, 1.6), M.knitMat); b.position.set(0, 0.19, -0.01); b.rotation.x = -0.2; head.add(b); const r = tor(head, HR * 1.1, 0.032, M.knitMat, 0, 0.2, -0.01); r.rotation.x = Math.PI / 2 - 0.2; sph(head, 0.05, mat('#F6F4EF', { rough: 1 }), 0, 0.44, -0.06, 12, 10); break; }
        case 'a_cap': { const c = new THREE.Mesh(new THREE.SphereGeometry(HR * 1.1, 28, 14, 0, Math.PI * 2, 0, 1.52), M.accentMat); c.position.set(0, 0.2, 0); head.add(c); const v = cyl(head, 0.16, 0.16, 0.014, M.accentMat, 0, 0.255, 0.18, 24); v.scale.z = 0.72; v.rotation.x = 0.12; sph(head, 0.018, M.accentMat, 0, 0.43, 0, 6, 4); break; }
        case 'a_catears': { const bd = tor(head, HR * 1.07, 0.011, mat('#2A2B33'), 0, 0.17, 0.02, Math.PI); bd.rotation.y = Math.PI / 2; for (const sx of [-1, 1]) { const e = cone(head, 0.065, 0.13, mat('#2A2B33'), sx * 0.12, 0.42, 0.01, 4); e.rotation.z = -sx * 0.35; const i = cone(head, 0.038, 0.085, mat('#E58BB0'), sx * 0.12, 0.415, 0.03, 4); i.rotation.z = -sx * 0.35; } break; }
        case 'a_crown': { const y = 0.4; cyl(head, 0.13, 0.12, 0.06, gold, 0, y, 0, 24); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; cone(head, 0.024, 0.07, gold, Math.cos(a) * 0.125, y + 0.06, Math.sin(a) * 0.125, 6); sph(head, 0.014, mat(i % 2 ? '#C7432F' : '#3E7CB1', { rough: 0.15 }), Math.cos(a) * 0.13, y, Math.sin(a) * 0.13, 8, 6); } break; }
        case 'a_pilotcap': { cyl(head, 0.24, 0.21, 0.09, mat('#22406E'), 0, 0.38, -0.01, 28); cyl(head, 0.205, 0.205, 0.06, mat('#1A1A22'), 0, 0.32, 0, 28); const v = cyl(head, 0.15, 0.15, 0.012, mat('#111', { rough: 0.2 }), 0, 0.3, 0.17, 20); v.scale.z = 0.65; v.rotation.x = 0.25; box(head, 0.08, 0.05, 0.01, gold, 0, 0.37, 0.22); box(head, 0.2, 0.012, 0.01, gold, 0, 0.322, 0.208); break; }
        case 'a_flower': { for (let i = 0; i < 6; i++) { const a = i * 1.047; const p = sph(head, 0.024, mat('#F28AB0'), 0.155 + Math.cos(a) * 0.028, 0.33 + Math.sin(a) * 0.028, 0.1, 8, 6); p.scale.z = 0.5; } sph(head, 0.017, mat('#F2C14E'), 0.155, 0.33, 0.112, 8, 6); break; }
        case 'a_earrings': for (const sx of [-1, 1]) { sph(head, 0.012, gold, sx * 0.2, 0.09, 0.0, 8, 6); tor(head, 0.022, 0.005, gold, sx * 0.2, 0.06, 0.0).rotation.y = Math.PI / 2; } break;
        case 'a_bowtie': for (const sx of [-1, 1]) { const c = cone(torso, 0.04, 0.07, M.accentMat, sx * 0.035, 0.5, 0.125, 4); c.rotation.z = sx * Math.PI / 2; } sph(torso, 0.017, M.accentMat, 0, 0.5, 0.13, 8, 6); break;
        case 'a_scarf': { const s = tor(torso, 0.105, 0.045, M.knitMat, 0, 0.52, 0.0); s.rotation.x = Math.PI / 2; s.scale.set(1.2, 1, 1); const h = rbox(torso, 0.08, 0.28, 0.04, 0.015, M.knitMat, 0.06, 0.36, 0.13); h.rotation.z = 0.12; box(torso, 0.08, 0.02, 0.042, M.accentMat, 0.075, 0.24, 0.133).rotation.z = 0.12; break; }
        case 'a_necklace': { const n = tor(torso, 0.105, 0.005, gold, 0, 0.47, 0.03); n.rotation.x = Math.PI / 2 - 0.45; sph(torso, 0.017, mat('#9DB7FF', { rough: 0.1, metal: 0.3 }), 0, 0.395, 0.145, 8, 6); break; }
        case 'a_backpack': { rbox(torso, 0.3, 0.36, 0.14, 0.05, M.accentMat, 0, 0.3, -0.2); rbox(torso, 0.22, 0.13, 0.05, 0.02, mat(shade(M.accentHex, 0.8)), 0, 0.21, -0.28); for (const sx of [-1, 1]) box(torso, 0.04, 0.42, 0.02, mat('#2A2B33'), sx * 0.1, 0.3, 0.14); break; }
        case 'a_watch': { cyl(armL.el, 0.051, 0.051, 0.04, mat('#2A2B33'), 0, -0.21, 0, 14); box(armL.el, 0.034, 0.03, 0.01, mat('#5DE0B5', { emissive: '#5DE0B5', ei: 0.9 }), 0, -0.21, 0.05); break; }
        case 'a_wings': { const wm = mat('#FFFFFF', { emissive: '#CFE6FF', ei: 0.25, double: true }); av.wings = []; for (const sx of [-1, 1]) { const pv = new THREE.Group(); pv.position.set(sx * 0.07, 0.38, -0.15); torso.add(pv); for (let i = 0; i < 5; i++) { const f = sph(pv, 0.13 - i * 0.017, wm, sx * (0.12 + i * 0.065), 0.06 - i * 0.055, -0.05, 12, 8); f.scale.set(1.2, 0.5, 0.15); f.rotation.z = sx * (0.4 + i * 0.22); } av.wings.push([pv, sx]); } break; }
        case 'a_halo': { const h = tor(head, 0.15, 0.017, mat('#FFE08A', { emissive: '#FFD24F', ei: 2.2 }), 0, 0.52, 0); h.rotation.x = Math.PI / 2; h.castShadow = false; av.halo = h; break; }
      }
    }
  }

  /* ---------------- Avatar ---------------- */
  PW.Avatar = class {
    constructor(cfg) { this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body); this.state = 'stand'; this.act = 'idle'; this.t0 = Math.random() * 10; this.blink = 2 + Math.random() * 3; this.talkUntil = 0; this.emote = null; this.emoteUntil = 0; this.seatH = 0.47; this.build(cfg); }
    build(cfg) {
      while (this.body.children.length) this.body.remove(this.body.children[0]);
      this.wings = null; this.halo = null;
      const base = PW.defaultAvatar(cfg && cfg.g);
      this.cfg = Object.assign(base, cfg || {});
      const c = this.cfg, f = c.g === 'f';
      const skinHex = PW.SKIN[c.sk] || PW.SKIN[2], hairHex = PW.HAIRC[c.hc] || PW.HAIRC[1];
      const topHex = PW.CLOTH[c.tc] || PW.CLOTH[8], top2Hex = PW.CLOTH[c.tc2 != null ? c.tc2 : 0] || '#F6F4EF', botHex = PW.CLOTH[c.bc] || PW.CLOTH[9], shoeHex = PW.CLOTH[c.shc] || PW.CLOTH[0];
      const accentHex = PW.CLOTH[(c.tc + 5) % 16];
      const bodyW = { slim: 0.92, reg: 1, broad: 1.12 }[c.bd] || 1;
      const topPat = c.tp && c.tp !== 'plain' ? fabricTex(c.tp, topHex, top2Hex) : fabricTex(['t_sweater', 't_turtle'].includes(c.top) ? 'knit' : 'cotton', topHex, topHex);
      const denim = ['b_jeans', 'b_shorts'].includes(c.bot);
      const M = this.M = {
        skin: new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.55, metalness: 0 }),
        skinD: PW.matU(shade(skinHex, 0.86), { rough: 0.6 }),
        hair: new THREE.MeshStandardMaterial({ color: hairHex, roughness: 0.45 }), hairHex,
        hairCap: new THREE.MeshStandardMaterial({ color: shade(hairHex, 0.8), roughness: 0.6 }),
        hairStrand: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.05, side: THREE.DoubleSide }),
        top: new THREE.MeshStandardMaterial({ color: '#ffffff', map: topPat, roughness: 0.85 }),
        topPlain: new THREE.MeshStandardMaterial({ color: topHex, roughness: 0.85 }),
        topD: PW.matU(shade(topHex, 0.78), { rough: 0.85 }), top2: PW.matU(top2Hex, { rough: 0.8 }),
        bot: new THREE.MeshStandardMaterial({ color: '#ffffff', map: fabricTex(denim ? 'denim' : 'cotton', botHex, botHex), roughness: 0.88 }),
        botD: PW.matU(shade(botHex, 0.72), { rough: 0.85 }),
        shoe: PW.matU(shoeHex, { rough: 0.55 }), accentHex, accentMat: PW.matU(accentHex, { rough: 0.7 }), accent: PW.matU(accentHex, { rough: 0.6 }),
        knitMat: new THREE.MeshStandardMaterial({ color: '#ffffff', map: fabricTex('knit', accentHex, accentHex), roughness: 0.95 }),
      };
      M.hairStrand.color = new THREE.Color('#ffffff');
      const top = c.top, bot = c.bot;
      const longSleeve = ['t_hoodie', 't_shirt', 't_sweater', 't_turtle', 't_jacket', 't_blazer', 't_varsity', 't_kimono', 't_pilot'].includes(top);
      const isDress = top === 't_dress', isOverall = top === 't_overall';
      const longPants = ['b_jeans', 'b_jogger', 'b_chino', 'b_cargo'].includes(bot) && !isDress;
      const skirt = !isDress && ['b_skirt', 'b_pleated'].includes(bot);
      const pantsMat = isOverall ? M.topPlain : M.bot;
      const B = this.body; B.scale.setScalar(c.ht || 1);

      const P = (this.parts = {});
      const hips = (P.hips = new THREE.Group()); hips.position.y = 0.82; B.add(hips);
      // pelvis
      const pel = sph(hips, 0.155, isDress ? M.top : (skirt ? M.bot : pantsMat), 0, 0.03, 0, 20, 14); pel.scale.set((f ? 1.1 : 1.02) * bodyW, 0.62, 0.8);
      if (longPants || bot === 'b_shorts' || bot === 'b_cargo') { const belt = cyl(hips, 0.152 * bodyW, 0.152 * bodyW, 0.035, PW.mat('#3A2A20', { rough: 0.5 }), 0, 0.085, 0, 24); belt.scale.z = 0.82; box(hips, 0.04, 0.03, 0.01, PW.mat('#C5A572', { metal: 0.7, rough: 0.3 }), 0, 0.085, 0.128); }
      if (skirt || isDress) { const len = isDress ? 0.2 : 0.15; const sk = lathe(hips, [[0, 0.1], [0.15 * bodyW, 0.1], [0.19 * bodyW, -len * 0.6], [0.205 * bodyW, -len], [0, -len]], isDress ? M.top : M.bot, 0, 0, 0, bot === 'b_pleated' ? 14 : 28); sk.scale.z = 0.85; P.skirt = sk; }
      // legs
      P.legs = [];
      for (const sx of [-1, 1]) {
        const pivot = new THREE.Group(); pivot.position.set(sx * 0.082 * bodyW, 0, 0); hips.add(pivot);
        const thighMat = (longPants || bot === 'b_shorts' || bot === 'b_cargo' || isOverall) && !skirt && !isDress ? pantsMat : M.skin;
        capsule(pivot, 0.08 * bodyW, 0.42, thighMat, 0, 0.03, 0, 0.066 * bodyW);
        if (bot === 'b_shorts') { const hem = cyl(pivot, 0.084 * bodyW, 0.086 * bodyW, 0.03, M.botD, 0, -0.2, 0, 16); }
        if (bot === 'b_cargo') { rbox(pivot, 0.03, 0.11, 0.1, 0.01, M.botD, sx * 0.08 * bodyW, -0.2, 0); }
        if (bot === 'b_jogger') box(pivot, 0.012, 0.38, 0.03, PW.mat('#F6F4EF'), sx * 0.078 * bodyW, -0.18, 0);
        if (skirt || isDress) {
          const panelMat = isDress ? M.top : M.bot; const len = isDress ? 0.32 : (bot === 'b_pleated' ? 0.25 : 0.22);
          lathe(pivot, [[0, 0.05], [0.1 * bodyW, 0.05], [0.115 * bodyW, -len * 0.5], [0.128 * bodyW, -len], [0, -len]], panelMat, 0, 0, 0, bot === 'b_pleated' ? 12 : 22);
        }
        const knee = new THREE.Group(); knee.position.y = -0.4; pivot.add(knee);
        const shinMat = longPants || isOverall ? pantsMat : M.skin;
        sph(knee, 0.066 * bodyW, shinMat, 0, 0, 0, 14, 10);
        capsule(knee, 0.066 * bodyW, 0.37, shinMat, 0, 0.02, 0, 0.052);
        if (longPants) cyl(knee, 0.064, 0.066, 0.04, bot === 'b_jogger' ? M.botD : M.bot, 0, -0.33, 0, 14);
        const foot = new THREE.Group(); foot.position.y = -0.37; knee.add(foot);
        buildShoe(foot, c.sh, M);
        P.legs.push({ pivot, knee, foot, sx });
      }
      // torso (lathe: hips → waist → chest → shoulders)
      const torso = (P.torso = new THREE.Group()); torso.position.y = 0.03; hips.add(torso);
      const chestW = (f ? 1.0 : 1.12) * bodyW;
      const prof = f ? [[0, -0.02], [0.148, -0.02], [0.152, 0.06], [0.128, 0.2], [0.15, 0.3], [0.158, 0.38], [0.152, 0.45], [0.13, 0.51], [0.07, 0.56], [0, 0.57]]
        : [[0, -0.02], [0.145, -0.02], [0.148, 0.08], [0.14, 0.2], [0.156, 0.33], [0.165, 0.43], [0.15, 0.5], [0.075, 0.56], [0, 0.575]];
      const chest = lathe(torso, prof, M.top, 0, 0, 0, 32); chest.scale.set(chestW, 1, 0.74);
      if (top === 't_crop') { const band = lathe(torso, [[0, 0.04], [0.15, 0.04], [0.132, 0.19], [0, 0.19]], M.skin, 0, 0, 0, 32); band.scale.set(chestW * 1.01, 1, 0.75); sph(torso, 0.01, M.skinD, 0, 0.12, 0.105, 6, 4); }
      const hem = cyl(torso, 0.152 * chestW, 0.15 * chestW, 0.035, top === 't_varsity' ? M.top2 : M.topD, 0, top === 't_crop' ? 0.2 : 0.015, 0, 28); hem.scale.z = 0.76;
      // top details
      const neckRing = (m, r = 0.072, t = 0.018) => { const n = tor(torso, r, t, m, 0, 0.54, 0.0); n.rotation.x = Math.PI / 2; };
      if (['t_tee', 't_blouse', 't_crop', 't_dress'].includes(top)) neckRing(M.topD, 0.07, 0.013);
      if (top === 't_hoodie') { const h = tor(torso, 0.11, 0.055, M.topD, 0, 0.53, -0.07); h.rotation.x = Math.PI / 2 - 0.5; rbox(torso, 0.22 * chestW, 0.09, 0.03, 0.02, M.topD, 0, 0.17, 0.115); for (const sx of [-1, 1]) { cyl(torso, 0.005, 0.005, 0.13, PW.mat('#F6F4EF'), sx * 0.03, 0.44, 0.128, 5); sph(torso, 0.009, PW.mat('#F6F4EF'), sx * 0.03, 0.375, 0.128, 6, 4); } }
      if (top === 't_shirt') { for (const sx of [-1, 1]) { const cl = box(torso, 0.085, 0.045, 0.015, M.top, sx * 0.045, 0.535, 0.09); cl.rotation.set(-0.5, 0, sx * 0.55); } for (let i = 0; i < 5; i++) sph(torso, 0.0075, PW.mat('#F6F4EF', { rough: 0.3 }), 0, 0.47 - i * 0.085, 0.124, 6, 4); box(torso, 0.006, 0.42, 0.004, M.topD, 0.012, 0.28, 0.123); rbox(torso, 0.06, 0.06, 0.008, 0.005, M.topD, -0.07, 0.4, 0.122); }
      if (top === 't_sweater') { neckRing(M.topD, 0.075, 0.024); for (let i = 0; i < 3; i++) { const r = cyl(torso, 0.0, 0.0, 0.001, M.topD, 0, 0, 0, 3); torso.remove(r); } }
      if (top === 't_turtle') { cyl(torso, 0.072, 0.08, 0.11, M.topD, 0, 0.56, 0, 18); for (let i = 0; i < 3; i++) { const t = tor(torso, 0.076, 0.008, M.topD, 0, 0.52 + i * 0.03, 0); t.rotation.x = Math.PI / 2; } }
      if (['t_jacket', 't_blazer', 't_varsity', 't_pilot'].includes(top)) {
        box(torso, 0.1, 0.42, 0.02, top === 't_pilot' ? PW.matU('#5B6270') : (top === 't_varsity' ? M.top2 : PW.matU('#F6F4EF')), 0, 0.3, 0.122);
        if (top === 't_blazer' || top === 't_jacket') for (const sx of [-1, 1]) { const l = box(torso, 0.055, 0.2, 0.02, M.topD, sx * 0.07, 0.43, 0.13); l.rotation.z = -sx * 0.35; }
        if (top === 't_jacket') for (const sx of [-1, 1]) { rbox(torso, 0.07, 0.06, 0.01, 0.005, M.topD, sx * 0.08, 0.37, 0.124); sph(torso, 0.008, PW.mat('#C5A572', { metal: 0.7 }), sx * 0.08, 0.35, 0.13, 6, 4); }
        if (top === 't_varsity') { box(torso, 0.06, 0.07, 0.01, M.top2, -0.08, 0.38, 0.13); for (let i = 0; i < 4; i++) sph(torso, 0.008, M.top2, 0.055, 0.45 - i * 0.09, 0.128, 6, 4); }
        if (top === 't_pilot') { const fur = tor(torso, 0.105, 0.045, PW.matU('#EFE3CC', { rough: 1 }), 0, 0.53, 0.0); fur.rotation.x = Math.PI / 2; box(torso, 0.06, 0.04, 0.01, PW.matU('#E9C04F', { metal: 0.7 }), 0.08, 0.4, 0.13); box(torso, 0.06, 0.06, 0.01, PW.matU('#C7432F'), -0.09, 0.38, 0.13); box(torso, 0.006, 0.42, 0.012, PW.mat('#C9CED6', { metal: 0.6 }), 0.0, 0.3, 0.133); }
      }
      if (isOverall) { chest.material = PW.matU(top2Hex === topHex ? '#F6F4EF' : top2Hex); rbox(torso, 0.2 * chestW, 0.22, 0.02, 0.01, M.topPlain, 0, 0.26, 0.112); rbox(torso, 0.08, 0.06, 0.01, 0.005, M.topD, 0, 0.27, 0.124); for (const sx of [-1, 1]) { box(torso, 0.035, 0.26, 0.02, M.topPlain, sx * 0.075, 0.46, 0.11); sph(torso, 0.013, PW.matU('#C5A572', { metal: 0.7 }), sx * 0.075, 0.36, 0.126, 6, 4); } }
      if (top === 't_kimono') { const ob = cyl(torso, 0.158 * chestW, 0.158 * chestW, 0.08, M.top2, 0, 0.17, 0, 28); ob.scale.z = 0.8; for (const sx of [-1, 1]) { const l = box(torso, 0.04, 0.32, 0.02, M.topD, sx * 0.04, 0.38, 0.125); l.rotation.z = sx * 0.32; } }
      if (top === 't_blouse') for (const sx of [-1, 1]) { const p = sph(torso, 0.075, M.top, sx * 0.195 * chestW, 0.47, 0, 14, 10); p.scale.set(1, 0.85, 0.9); }
      // neck & head
      cyl(torso, 0.052, 0.058, 0.09, M.skin, 0, 0.58, 0, 14);
      const neck = (P.neck = new THREE.Group()); neck.position.y = 0.6; torso.add(neck);
      const head = (P.head = new THREE.Group()); neck.add(head);
      const skull = new THREE.Mesh(headGeo(), M.skin); skull.position.copy(HC); skull.castShadow = true; head.add(skull);
      for (const sx of [-1, 1]) { const e = sph(head, 0.042, M.skin, sx * 0.2, 0.15, -0.01, 14, 10); e.scale.set(0.5, 1, 0.85); sph(head, 0.018, M.skinD, sx * 0.212, 0.15, -0.005, 8, 6).scale.set(0.5, 1, 1); }
      // ---- face ----
      const faceAt = (pol, az, k = 1.0) => onHead(pol, az, k);
      const orient = (o, p) => { const n = p.clone().sub(HC).normalize(); o.quaternion.setFromUnitVectors(V3(0, 0, 1), n); };
      const eyeHex = PW.EYEC[c.ec] || '#5A3A1E';
      const eyeSize = { round: [1, 1.12], almond: [1.15, 0.86], sleepy: [1.05, 0.95], sparkle: [1.04, 1.18], cat: [1.12, 0.92] }[c.ey] || [1, 1];
      P.eyes = [];
      for (const sx of [-1, 1]) {
        const p = faceAt(1.66, sx * 0.37, 0.985);
        const eg = new THREE.Group(); eg.position.copy(p); orient(eg, p); head.add(eg);
        const inner = new THREE.Group(); eg.add(inner); inner.scale.set(eyeSize[0], eyeSize[1], 1); if (c.ey === 'cat') inner.rotation.z = sx * 0.22; if (c.ey === 'almond') inner.rotation.z = sx * 0.08;
        const sc = sph(inner, 0.04, PW.mat('#FBFAF7', { rough: 0.25 }), 0, 0, 0, 20, 14); sc.scale.set(1, 1.15, 0.36);
        const iris = new THREE.Mesh(new THREE.CircleGeometry(0.031, 28), new THREE.MeshStandardMaterial({ map: irisTex(eyeHex, c.ey), roughness: 0.15, transparent: true, emissive: '#ffffff', emissiveMap: irisTex(eyeHex, c.ey), emissiveIntensity: 0.25 }));
        iris.position.set(0, -0.004, 0.0152); iris.scale.y = 1.12; inner.add(iris);
        // upper lash line
        const lash = new THREE.Mesh(new THREE.TorusGeometry(0.041, f ? 0.0075 : 0.0055, 6, 20, Math.PI * 0.95), PW.mat('#1C1410', { rough: 0.6 }));
        lash.position.set(0, 0.002, 0.008); lash.rotation.z = Math.PI * 0.025; lash.scale.y = 1.12; inner.add(lash);
        if (f) { const w = cone(inner, 0.008, 0.03, PW.mat('#1C1410'), sx * 0.043, 0.02, 0.008, 5); w.rotation.z = -sx * 1.0; }
        // lids (sleepy: half-closed); blink uses group scale
        if (c.ey === 'sleepy') { const lid = new THREE.Mesh(new THREE.SphereGeometry(0.042, 18, 10, 0, Math.PI * 2, 0, 1.15), M.skin); lid.scale.set(1.02, 1.15, 0.42); lid.rotation.x = -0.15; inner.add(lid); }
        P.eyes.push(eg);
        // brow
        const bp = faceAt(1.36, sx * 0.36, 1.005); const bg = new THREE.Group(); bg.position.copy(bp); orient(bg, bp); head.add(bg);
        const bw = { soft: 0.0075, thick: 0.012, arched: 0.008, straight: 0.009 }[c.br] || 0.008;
        const bcurve = new THREE.QuadraticBezierCurve3(V3(-0.045 * sx * -1, -0.006, 0), V3(0, c.br === 'arched' ? 0.016 : c.br === 'straight' ? 0.002 : 0.008, 0.004), V3(0.045 * sx * -1, c.br === 'straight' ? 0.0 : -0.004, 0));
        const brow = new THREE.Mesh(new THREE.TubeGeometry(bcurve, 10, bw, 6), PW.matU(shade(hairHex, 0.8), { rough: 0.7 })); bg.add(brow); bg.rotation.z += sx * 0.05; P['brow' + sx] = bg;
        // blush & freckles
        const ck = faceAt(1.88, sx * 0.6, 1.0); ck.z += 0.012;
        if (c.bl) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.05), new THREE.MeshBasicMaterial({ map: blushTex(), transparent: true, depthWrite: false })); b.position.copy(ck); orient(b, ck); head.add(b); }
        if (c.fr) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), new THREE.MeshBasicMaterial({ map: frecklesTex(), transparent: true, depthWrite: false })); b.position.copy(faceAt(1.8, sx * 0.48, 1.0)); b.position.z += 0.01; orient(b, b.position); head.add(b); }
      }
      // nose
      const np = faceAt(1.84, 0, 1.0); const nose = sph(head, 0.02, M.skinD, np.x, np.y, np.z + 0.002, 10, 8); nose.scale.set(1.0, 0.8, 0.9);
      // mouth decal
      const mp = faceAt(2.08, 0, 0.94); mp.z = Math.max(mp.z, 0.135);
      const lip = PW.LIPS[c.lp || 0] || '';
      const mouth = new THREE.Mesh(new THREE.PlaneGeometry(0.088, 0.044), new THREE.MeshBasicMaterial({ map: mouthTex(c.mo || 'smile', lip), transparent: true, depthWrite: false }));
      const mpp = onHead(2.13, 0, 1.012); mouth.position.copy(mpp); mouth.rotation.x = -0.42; head.add(mouth);
      this._mouthTex = { idle: mouthTex(c.mo || 'smile', lip), open: mouthTex('open', lip), focus: mouthTex('focus', lip), grin: mouthTex('grin', lip) };
      P.mouth = mouth;
      buildHair(head, c.hs, M, c);
      buildBeard(head, c.g === 'm' ? c.fh : 'fh_none', M);
      // arms
      const mkArm = (sx) => {
        const sh = new THREE.Group(); sh.position.set(sx * (f ? 0.176 : 0.196) * bodyW, 0.49, 0); torso.add(sh);
        sph(sh, (longSleeve ? 0.06 : 0.056) * bodyW, longSleeve || ['t_crop', 't_dress'].includes(top) === false ? M.top : M.skin, 0, -0.005, 0, 14, 10);
        if (longSleeve) capsule(sh, 0.058 * bodyW, 0.29, M.top, 0, 0.01, 0, 0.052);
        else { capsule(sh, 0.054 * bodyW, 0.29, M.skin, 0, 0.01, 0, 0.05); if (top !== 't_crop' && top !== 't_dress') lathe(sh, [[0, 0.04], [0.045, 0.04], [0.059 * bodyW, 0.0], [0.059 * bodyW, -0.08], [0.06 * bodyW, -0.1], [0, -0.1]], top === 't_blouse' ? M.topPlain : M.top, 0, 0, 0, 16); }
        const el = new THREE.Group(); el.position.y = -0.27; sh.add(el);
        const foreMat = longSleeve ? (top === 't_varsity' ? M.top2 : M.top) : M.skin;
        sph(el, 0.052 * bodyW, longSleeve ? M.top : M.skin, 0, 0, 0, 12, 8);
        capsule(el, 0.05 * bodyW, 0.25, foreMat, 0, 0.01, 0, 0.042);
        if (top === 't_kimono') lathe(el, [[0, 0.02], [0.07, 0.02], [0.115, -0.2], [0, -0.2]], M.top, 0, 0, 0, 16);
        if (longSleeve && top !== 't_kimono') cyl(el, 0.047, 0.049, 0.035, top === 't_varsity' ? M.top2 : M.topD, 0, -0.21, 0, 12);
        // hand: palm + fingers + thumb
        const hand = new THREE.Group(); hand.position.set(0, -0.255, 0); el.add(hand);
        const palm = sph(hand, 0.042, M.skin, 0, -0.025, 0, 14, 10); palm.scale.set(0.95, 1.05, 0.62);
        for (let i = 0; i < 4; i++) { const fg = capsule(hand, 0.0105, 0.05 - Math.abs(i - 1.5) * 0.006, M.skin, (i - 1.5) * 0.019 * -sx * -1, -0.055, 0.004); fg.rotation.x = 0.25; }
        const th = capsule(hand, 0.012, 0.045, M.skin, -sx * 0.038, -0.02, 0.018); th.rotation.z = -sx * 0.9;
        return { sh, el, hand, sx };
      };
      P.armL = mkArm(-1); P.armR = mkArm(1);
      buildAccessories(this, c.acc || [], M);
      // held props
      P.props = {};
      const pen = new THREE.Group(); P.armR.el.add(pen); pen.position.set(0, -0.3, 0.025); cyl(pen, 0.007, 0.005, 0.14, mat('#3E7CB1'), 0, 0, 0, 6).rotation.x = 0.6; P.props.pen = pen;
      const cup = new THREE.Group(); P.armR.el.add(cup); cup.position.set(0, -0.31, 0.045); cyl(cup, 0.04, 0.035, 0.1, mat('#F6F4EF'), 0, 0, 0, 14); cyl(cup, 0.036, 0.036, 0.005, mat('#5A3520'), 0, 0.048, 0, 14); tor(cup, 0.022, 0.006, mat('#F6F4EF'), 0.045, 0, 0); P.props.cup = cup;
      const book = new THREE.Group(); P.armL.el.add(book); book.position.set(0.12, -0.3, 0.06); box(book, 0.22, 0.28, 0.03, mat('#C7432F'), 0, 0, 0); box(book, 0.2, 0.26, 0.032, mat('#F6F0E2'), 0.004, 0, 0.001); P.props.book = book;
      for (const k in P.props) P.props[k].visible = false;
      this.body.traverse((o) => { if (o.isMesh && !o.material.transparent) o.castShadow = true; });
      this._snap = true;
    }
    setState(state, act) { this.state = state; if (act) this.act = act; }
    say(ms = 3500) { this.talkUntil = performance.now() + ms; }
    doEmote(e, ms = 3000) { this.emote = e; this.emoteUntil = performance.now() + ms; }
    applyPose(snap) { this._snap = snap; }
    update(dt, tt) {
      const t = tt + this.t0, P = this.parts, now = performance.now();
      if (this.emote && now > this.emoteUntil) this.emote = null;
      const sitting = this.state === 'sit';
      const act = this.emote || this.act;
      const T = { hipsY: 0.82, hipsZ: 0, torsoX: 0, torsoY: 0, torsoZ: 0, neckX: 0, neckY: 0, neckZ: 0, legs: [[0, 0, 0], [0, 0, 0]], arms: [[0.05, 0, -0.1, -0.12], [0.05, 0, 0.1, -0.12]], rootBob: 0 };
      const breath = Math.sin(t * 2.1) * 0.012;
      if (sitting) {
        T.hipsY = (this.seatH + 0.07) / (this.cfg.ht || 1);
        T.legs = [[-1.52, 0.08, 1.45], [-1.52, -0.08, 1.45]];
        T.torsoX = 0.05 + breath;
        if (act === 'write') { T.torsoX = 0.26 + Math.sin(t * 0.7) * 0.02; T.neckX = 0.35 + Math.sin(t * 0.5) * 0.04; T.neckY = Math.sin(t * 0.3) * 0.08; T.arms[0] = [-0.95, 0.25, 0.25, -1.15]; T.arms[1] = [-1.0 + Math.sin(t * 7) * 0.03, -0.3 + Math.sin(t * 3.5) * 0.06, -0.15, -1.1 + Math.sin(t * 9) * 0.05]; }
        else if (act === 'type') { T.torsoX = 0.16; T.neckX = 0.2 + Math.sin(t * 0.4) * 0.03; const k1 = Math.max(0, Math.sin(t * 16)) * 0.08, k2 = Math.max(0, Math.sin(t * 16 + 2)) * 0.08; T.arms[0] = [-1.05 - k1, 0.35, 0.22, -0.95]; T.arms[1] = [-1.05 - k2, -0.35, -0.22, -0.95]; }
        else if (act === 'read') { T.torsoX = 0.12; T.neckX = 0.42; T.neckY = Math.sin(t * 0.6) * 0.04; T.arms[0] = [-1.0, 0.45, 0.3, -1.45]; T.arms[1] = [-0.95, -0.4, -0.3, -1.4]; if (Math.sin(t * 0.25) > 0.985) T.arms[1] = [-1.2, -0.1, -0.3, -1.6]; }
        else if (act === 'drink') { const sip = Math.max(0, Math.sin(t * 0.8)); T.torsoX = -0.05; T.neckX = -0.1 * sip; T.arms[1] = [-0.9 - sip * 0.6, -0.25, -0.2, -1.6 - sip * 0.5]; T.arms[0] = [-0.3, 0.1, 0.25, -0.6]; }
        else if (act === 'stretch') { const s = (Math.sin(t * 0.9) + 1) / 2; T.torsoX = -0.15 * s; T.neckX = -0.25 * s; T.arms[0] = [-2.9 * s - 0.2, 0, 0.3 - 0.2 * s, -0.4 * (1 - s)]; T.arms[1] = [-2.9 * s - 0.2, 0, -0.3 + 0.2 * s, -0.4 * (1 - s)]; }
        else if (act === 'wave') { T.arms[1] = [-0.3, 0, 2.5, -0.4 + Math.sin(t * 12) * 0.4]; T.neckZ = Math.sin(t * 3) * 0.08; }
        else if (act === 'clap') { const cc = Math.sin(t * 14) * 0.15; T.arms[0] = [-1.2, 0.6 + cc, 0.1, -1.0]; T.arms[1] = [-1.2, -0.6 - cc, -0.1, -1.0]; }
        else if (act === 'cheer') { T.arms[0] = [-2.8, 0, 0.35, -0.2]; T.arms[1] = [-2.8, 0, -0.35, -0.2]; T.torsoX = -0.1 + Math.sin(t * 8) * 0.03; }
        else { T.torsoX = -0.02 + breath; T.neckY = Math.sin(t * 0.4) * 0.3; T.neckX = Math.sin(t * 0.33) * 0.06; T.arms[0] = [-0.55, 0.15, 0.25, -0.6]; T.arms[1] = [-0.55, -0.15, -0.25, -0.6]; }
      } else if (this.state === 'walk') {
        const s = Math.sin(t * 9);
        T.legs = [[s * 0.55, 0, Math.max(0, -s) * 0.6 + 0.1], [-s * 0.55, 0, Math.max(0, s) * 0.6 + 0.1]];
        T.arms = [[-s * 0.45, 0, -0.1, -0.25], [s * 0.45, 0, 0.1, -0.25]];
        T.rootBob = Math.abs(Math.cos(t * 9)) * 0.03; T.torsoX = 0.05; T.torsoY = s * 0.06;
      } else {
        T.torsoX = breath; T.neckY = Math.sin(t * 0.37) * 0.25; T.neckX = Math.sin(t * 0.29) * 0.05;
        if (act === 'wave') { T.arms[1] = [-0.2, 0, 2.6, -0.3 + Math.sin(t * 12) * 0.45]; T.neckZ = Math.sin(t * 3) * 0.1; }
        else if (act === 'dance') { const s = Math.sin(t * 7); T.hipsZ = s * 0.1; T.rootBob = Math.abs(s) * 0.06; T.arms = [[-1.6 + s * 0.6, 0, 0.6, -1.2], [-1.6 - s * 0.6, 0, -0.6, -1.2]]; T.legs = [[s * 0.25, 0, 0.3 + s * 0.2], [-s * 0.25, 0, 0.3 - s * 0.2]]; T.neckZ = s * 0.2; T.torsoY = s * 0.3; }
        else if (act === 'clap') { const cc = Math.sin(t * 14) * 0.15; T.arms[0] = [-1.3, 0.65 + cc, 0.1, -0.9]; T.arms[1] = [-1.3, -0.65 - cc, -0.1, -0.9]; }
        else if (act === 'cheer') { const j = Math.max(0, Math.sin(t * 6)); T.rootBob = j * 0.12; T.arms[0] = [-2.9, 0, 0.4, -0.1]; T.arms[1] = [-2.9, 0, -0.4, -0.1]; }
        else if (act === 'drink') { const sip = Math.max(0, Math.sin(t * 0.8)); T.arms[1] = [-0.9 - sip * 0.6, -0.25, -0.2, -1.6 - sip * 0.5]; T.neckX = -0.1 * sip; }
        else if (act === 'stretch') { const s = (Math.sin(t * 0.9) + 1) / 2; T.arms[0] = [-2.9 * s - 0.1, 0, 0.3, 0]; T.arms[1] = [-2.9 * s - 0.1, 0, -0.3, 0]; T.torsoX = -0.12 * s; }
      }
      const k = this._snap ? 1 : 1 - Math.pow(0.0005, dt); this._snap = false;
      const L = (o, prop, v) => (o[prop] = o[prop] + (v - o[prop]) * k);
      L(P.hips.position, 'y', T.hipsY + T.rootBob); L(P.hips.rotation, 'z', T.hipsZ);
      L(P.torso.rotation, 'x', T.torsoX); L(P.torso.rotation, 'y', T.torsoY); L(P.torso.rotation, 'z', T.torsoZ);
      L(P.neck.rotation, 'x', T.neckX); L(P.neck.rotation, 'y', T.neckY); L(P.neck.rotation, 'z', T.neckZ);
      P.legs.forEach((lg, i) => { L(lg.pivot.rotation, 'x', T.legs[i][0]); L(lg.pivot.rotation, 'z', T.legs[i][1] || 0); L(lg.knee.rotation, 'x', T.legs[i][2]); L(lg.foot.rotation, 'x', sitting ? 0.05 : -T.legs[i][2] * 0.3); });
      [P.armL, P.armR].forEach((a, i) => { L(a.sh.rotation, 'x', T.arms[i][0]); L(a.sh.rotation, 'y', T.arms[i][1]); L(a.sh.rotation, 'z', T.arms[i][2]); L(a.el.rotation, 'x', T.arms[i][3]); });
      if (P.skirt) P.skirt.scale.y += ((sitting ? 0.35 : 1) - P.skirt.scale.y) * k;
      const pr = P.props;
      pr.pen.visible = sitting && act === 'write'; pr.cup.visible = act === 'drink'; pr.book.visible = sitting && act === 'read';
      // blink, expression, talk
      this.blink -= dt; const bl = this.blink < 0.12 ? 0.12 : 1; if (this.blink < 0) this.blink = 2 + Math.random() * 4;
      P.eyes.forEach((e) => (e.scale.y = bl));
      const talking = now < this.talkUntil;
      const focused = sitting && ['write', 'type', 'read'].includes(act);
      const happy = ['cheer', 'dance', 'wave', 'clap'].includes(act);
      const mt = talking ? (Math.sin(t * 18) > 0 ? this._mouthTex.open : this._mouthTex.idle) : happy ? this._mouthTex.grin : focused ? this._mouthTex.focus : this._mouthTex.idle;
      if (P.mouth.material.map !== mt) { P.mouth.material.map = mt; P.mouth.material.needsUpdate = true; }
      const browLift = happy ? 0.008 : focused ? -0.004 : 0;
      if (P['brow-1']) { P['brow-1'].children[0].position.y = browLift; P['brow1'].children[0].position.y = browLift; }
      if (this.wings) this.wings.forEach(([w, sx]) => (w.rotation.y = sx * (0.3 + Math.sin(t * 3) * 0.2)));
      if (this.halo) { this.halo.position.y = 0.52 + Math.sin(t * 2) * 0.015; this.halo.rotation.z = t; }
    }
    headWorld(v) { this.parts.head.updateWorldMatrix(true, false); return this.parts.head.localToWorld(v.set(0, 0.5, 0)); }
  };
})();
