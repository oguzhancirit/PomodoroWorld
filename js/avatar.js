/* Pomodoro World — 3D characters: build, dress, pose, animate */
(function () {
  const PW = window.PW;
  const { box, cyl, sph, rbox, tor, cone, capsule, lathe, mat } = PW;
  const U = PW.util;

  PW.defaultAvatar = (g = 'm') => g === 'f'
    ? { g: 'f', sk: 1, hs: 'h_long', hc: 2, ec: 1, top: 't_blouse', tc: 11, bot: 'b_jeans', bc: 8, sh: 's_sneaker', shc: 0, fh: 'fh_none', acc: [] }
    : { g: 'm', sk: 2, hs: 'h_short', hc: 1, ec: 0, top: 't_tee', tc: 8, bot: 'b_jeans', bc: 9, sh: 's_sneaker', shc: 0, fh: 'fh_none', acc: [] };

  PW.randomAvatar = (rnd = Math.random) => {
    const g = rnd() < 0.5 ? 'm' : 'f';
    const pool = (slot) => PW.AVATAR_ITEMS.filter((i) => i.slot === slot && (i.g === 'u' || i.g === g) && i.lvl <= 8);
    const p = (arr) => arr[Math.floor(rnd() * arr.length)];
    const accs = [];
    if (rnd() < 0.4) accs.push(p(['a_glasses_round', 'a_glasses_square']));
    if (rnd() < 0.3) accs.push(p(['a_headphones', 'a_beanie', 'a_cap', 'a_catears']));
    if (rnd() < 0.2) accs.push(p(['a_scarf', 'a_bowtie']));
    let top = p(pool('top'));
    return { g, sk: Math.floor(rnd() * 8), hs: p(pool('hair')).id, hc: Math.floor(rnd() * 8), ec: Math.floor(rnd() * 5), top: top.id, tc: Math.floor(rnd() * 16), bot: p(pool('bottom')).id, bc: Math.floor(rnd() * 16), sh: p(pool('shoes')).id, shc: Math.floor(rnd() * 16), fh: g === 'm' ? p(pool('beard')).id : 'fh_none', acc: accs.filter((v, i, a) => a.indexOf(v) === i) };
  };

  const shade = (hex, k) => { const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, hsl.s, U.clamp(hsl.l * k, 0, 1)); return '#' + c.getHexString(); };

  function hairCap(head, M, r = 0.212, theta = 1.68, tilt = -0.62) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 26, 16, 0, Math.PI * 2, 0, theta), M.hair);
    m.rotation.x = tilt; m.position.y = 0.17; m.castShadow = true; head.add(m); return m;
  }

  function buildHair(head, id, M) {
    const H = M.hair;
    switch (id) {
      case 'h_bald': return;
      case 'h_buzz': { const c = hairCap(head, M, 0.204, 1.6, -0.6); return; }
      case 'h_short': hairCap(head, M); for (let i = -2; i <= 2; i++) { const s = sph(head, 0.06, H, i * 0.045, 0.31, 0.15, 10, 8); s.scale.set(1, 0.6, 0.8); s.rotation.z = i * 0.2; } return;
      case 'h_side': { hairCap(head, M); const s = sph(head, 0.13, H, 0.05, 0.34, 0.08, 16, 10); s.scale.set(1.5, 0.45, 0.9); s.rotation.z = -0.25; return; }
      case 'h_curly': hairCap(head, M); { const r = U.seeded(11); for (let i = 0; i < 34; i++) { const a = r() * Math.PI * 2, b = r() * 1.2; sph(head, 0.055, H, Math.cos(a) * Math.sin(b) * 0.2, 0.2 + Math.cos(b) * 0.17, Math.sin(a) * Math.sin(b) * 0.2 - 0.02, 8, 6); } } return;
      case 'h_bun_m': hairCap(head, M); { const s = sph(head, 0.075, H, 0, 0.39, -0.08, 12, 8); } return;
      case 'h_mohawk': hairCap(head, M, 0.204, 1.6, -0.6); for (let i = 0; i < 6; i++) { const c = cone(head, 0.035, 0.12, H, 0, 0.38 - Math.abs(i - 2) * 0.012, 0.12 - i * 0.055, 6); c.rotation.x = -0.3 - i * 0.12; } return;
      case 'h_afro': { const s = sph(head, 0.3, M.hair, 0, 0.25, -0.04, 20, 14); s.scale.set(1, 0.92, 0.95); return; }
      case 'h_long': case 'h_wavy': {
        hairCap(head, M, 0.216, 1.72, -0.62);
        const back = lathe(head, [[0, 0], [0.16, 0.02], [0.2, 0.18], [0.215, 0.36], [0.19, 0.42], [0, 0.42]], H, 0, -0.18, -0.06, 20);
        back.scale.set(1, 1, 0.75);
        for (const sx of [-1, 1]) { const l = capsule(head, 0.05, 0.36, H, sx * 0.17, 0.26, 0.07); if (id === 'h_wavy') l.rotation.z = sx * 0.1; }
        for (let i = -1; i <= 1; i++) { const f = sph(head, 0.07, H, i * 0.06, 0.32, 0.15, 10, 8); f.scale.set(1.1, 0.5, 0.7); }
        if (id === 'h_wavy') for (let i = 0; i < 6; i++) sph(head, 0.06, H, -0.15 + i * 0.06, -0.12 + (i % 2) * 0.03, -0.12, 8, 6);
        return;
      }
      case 'h_pony': { hairCap(head, M, 0.214, 1.68, -0.62); for (let i = -1; i <= 1; i++) { const f = sph(head, 0.07, H, i * 0.06, 0.32, 0.15, 10, 8); f.scale.set(1.1, 0.5, 0.7); } sph(head, 0.045, M.top2 || H, 0, 0.3, -0.19, 8, 6); const p = capsule(head, 0.065, 0.36, H, 0, 0.3, -0.24, 0.03); p.rotation.x = 0.35; return; }
      case 'h_bob': { hairCap(head, M, 0.218, 1.75, -0.55); const b = lathe(head, [[0, 0.32], [0.23, 0.3], [0.235, 0.15], [0.22, 0.02], [0.17, 0.0], [0, 0.0]], H, 0, 0.0, -0.02, 22); b.scale.set(1, 1, 0.95); b.rotation.x = -0.15; const fr = box(head, 0.3, 0.06, 0.08, H, 0, 0.3, 0.16); return; }
      case 'h_buns': { hairCap(head, M, 0.214); for (const sx of [-1, 1]) sph(head, 0.085, H, sx * 0.15, 0.36, -0.03, 12, 8); for (let i = -1; i <= 1; i++) { const f = sph(head, 0.07, H, i * 0.06, 0.32, 0.15, 10, 8); f.scale.set(1.1, 0.5, 0.7); } return; }
      case 'h_space': { hairCap(head, M, 0.214, 1.68, -0.62); sph(head, 0.11, H, 0, 0.42, -0.05, 14, 10); tor(head, 0.08, 0.015, M.top2 || '#C7432F', 0, 0.34, -0.04).rotation.x = Math.PI / 2; return; }
      case 'h_braid': { hairCap(head, M, 0.214, 1.68, -0.62); for (let i = -1; i <= 1; i++) { const f = sph(head, 0.07, H, i * 0.06, 0.32, 0.15, 10, 8); f.scale.set(1.1, 0.5, 0.7); } for (let i = 0; i < 7; i++) { const s = sph(head, 0.05 - i * 0.003, H, (i % 2 ? 0.012 : -0.012), 0.12 - i * 0.075, -0.2 - i * 0.012, 8, 6); s.scale.y = 1.25; } sph(head, 0.025, '#E58BB0', 0, -0.42, -0.28, 8, 6); return; }
      default: hairCap(head, M);
    }
  }

  function buildBeard(head, id, M) {
    if (!id || id === 'fh_none') return;
    if (id === 'fh_stubble') { const m = new THREE.Mesh(new THREE.SphereGeometry(0.203, 22, 12, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.55, Math.PI * 0.3), mat(M.hairHex, { opacity: 0.35 })); m.position.y = 0.17; m.rotation.y = Math.PI * 0.0; head.add(m); m.rotation.y = -Math.PI / 2 + Math.PI / 2; return; }
    if (id === 'fh_beard') { const b = sph(head, 0.17, M.hair, 0, 0.07, 0.07, 18, 12); b.scale.set(1.05, 0.75, 0.85); }
    if (id === 'fh_mustache' || id === 'fh_beard') { for (const sx of [-1, 1]) { const m = capsule(head, 0.018, 0.07, M.hair, sx * 0.03, 0.1, 0.19); m.rotation.z = sx * 1.9; } }
    if (id === 'fh_goatee') { const g = sph(head, 0.045, M.hair, 0, 0.03, 0.17, 10, 8); g.scale.set(1, 1.3, 0.8); for (const sx of [-1, 1]) { const m = capsule(head, 0.015, 0.06, M.hair, sx * 0.028, 0.1, 0.19); m.rotation.z = sx * 1.7; } }
  }

  function buildAccessories(av, A, M) {
    const { head, torso, armL, armR } = av.parts;
    const gold = mat('#E9C04F', { metal: 0.85, rough: 0.3 });
    for (const id of A) {
      switch (id) {
        case 'a_glasses_round': case 'a_glasses_square': case 'a_sunglasses': {
          const f = id === 'a_sunglasses' ? mat('#111', { rough: 0.3 }) : mat(id === 'a_glasses_round' ? '#2A2B33' : '#6B4630', { rough: 0.4 });
          for (const sx of [-1, 1]) {
            if (id === 'a_glasses_round') tor(head, 0.045, 0.007, f, sx * 0.075, 0.2, 0.19);
            else { box(head, 0.1, 0.07, 0.01, id === 'a_sunglasses' ? mat('#1A1A22', { rough: 0.15, metal: 0.4 }) : mat('#BFE6FF', { opacity: 0.25 }), sx * 0.075, 0.2, 0.192); box(head, 0.1, 0.012, 0.012, f, sx * 0.075, 0.236, 0.192); }
            box(head, 0.012, 0.012, 0.18, f, sx * 0.18, 0.21, 0.1);
          }
          box(head, 0.04, 0.008, 0.008, f, 0, 0.215, 0.195); break;
        }
        case 'a_headphones': { const band = tor(head, 0.225, 0.018, mat('#2A2B33'), 0, 0.17, 0, Math.PI); band.rotation.y = Math.PI / 2; band.rotation.z = 0; for (const sx of [-1, 1]) { const c = cyl(head, 0.07, 0.07, 0.05, mat('#2A2B33'), sx * 0.215, 0.15, 0, 18); c.rotation.z = Math.PI / 2; const p = cyl(head, 0.05, 0.05, 0.052, M.top2Mat, sx * 0.22, 0.15, 0, 18); p.rotation.z = Math.PI / 2; } break; }
        case 'a_beanie': { const b = new THREE.Mesh(new THREE.SphereGeometry(0.228, 22, 12, 0, Math.PI * 2, 0, 1.55), M.top2Mat); b.position.y = 0.19; b.rotation.x = -0.15; head.add(b); tor(head, 0.215, 0.03, M.top2Mat, 0, 0.21, -0.02).rotation.x = Math.PI / 2 - 0.15; sph(head, 0.05, mat('#F6F4EF'), 0, 0.43, -0.04, 10, 8); break; }
        case 'a_cap': { const c = new THREE.Mesh(new THREE.SphereGeometry(0.222, 22, 12, 0, Math.PI * 2, 0, 1.5), M.top2Mat); c.position.y = 0.2; head.add(c); const v = cyl(head, 0.16, 0.16, 0.015, M.top2Mat, 0, 0.27, 0.17, 20); v.scale.z = 0.7; v.rotation.x = 0.15; sph(head, 0.02, M.top2Mat, 0, 0.42, 0, 6, 4); break; }
        case 'a_catears': { tor(head, 0.215, 0.012, mat('#2A2B33'), 0, 0.17, 0.02, Math.PI).rotation.y = Math.PI / 2; for (const sx of [-1, 1]) { const e = cone(head, 0.06, 0.12, mat('#2A2B33'), sx * 0.12, 0.42, 0.02, 4); e.rotation.z = -sx * 0.35; const i = cone(head, 0.035, 0.08, mat('#E58BB0'), sx * 0.12, 0.415, 0.035, 4); i.rotation.z = -sx * 0.35; } break; }
        case 'a_crown': { const y = 0.39; cyl(head, 0.13, 0.12, 0.06, gold, 0, y, 0, 20); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; cone(head, 0.025, 0.07, gold, Math.cos(a) * 0.12, y + 0.06, Math.sin(a) * 0.12, 6); sph(head, 0.015, mat(i % 2 ? '#C7432F' : '#3E7CB1', { rough: 0.2 }), Math.cos(a) * 0.125, y, Math.sin(a) * 0.125, 6, 4); } break; }
        case 'a_pilotcap': { cyl(head, 0.235, 0.21, 0.09, mat('#22406E'), 0, 0.37, -0.01, 24); cyl(head, 0.205, 0.205, 0.06, mat('#1A1A22'), 0, 0.31, 0, 24); const v = cyl(head, 0.15, 0.15, 0.012, mat('#111', { rough: 0.2 }), 0, 0.29, 0.17, 20); v.scale.z = 0.65; v.rotation.x = 0.25; box(head, 0.08, 0.05, 0.01, gold, 0, 0.36, 0.215); box(head, 0.2, 0.012, 0.01, gold, 0, 0.315, 0.205); break; }
        case 'a_flower': { for (let i = 0; i < 5; i++) { const a = i * 1.256; sph(head, 0.025, mat('#F28AB0'), 0.16 + Math.cos(a) * 0.03, 0.32 + Math.sin(a) * 0.03, 0.1, 8, 6); } sph(head, 0.018, mat('#F2C14E'), 0.165, 0.32, 0.115, 8, 6); break; }
        case 'a_earrings': for (const sx of [-1, 1]) { sph(head, 0.015, gold, sx * 0.205, 0.08, 0.0, 8, 6); tor(head, 0.022, 0.005, gold, sx * 0.205, 0.05, 0.0).rotation.y = Math.PI / 2; } break;
        case 'a_bowtie': for (const sx of [-1, 1]) { const c = cone(torso, 0.04, 0.07, M.top2Mat, sx * 0.035, 0.47, 0.13, 4); c.rotation.z = sx * Math.PI / 2; } sph(torso, 0.018, M.top2Mat, 0, 0.47, 0.135, 8, 6); break;
        case 'a_scarf': { const s = tor(torso, 0.1, 0.045, M.top2Mat, 0, 0.47, 0.0); s.rotation.x = Math.PI / 2; s.scale.set(1.2, 1, 1); const h = rbox(torso, 0.08, 0.26, 0.04, 0.015, M.top2Mat, 0.06, 0.34, 0.14); h.rotation.z = 0.1; break; }
        case 'a_necklace': { const n = tor(torso, 0.1, 0.006, gold, 0, 0.44, 0.03); n.rotation.x = Math.PI / 2 - 0.4; sph(torso, 0.018, mat('#9DB7FF', { rough: 0.1, metal: 0.3 }), 0, 0.37, 0.15, 8, 6); break; }
        case 'a_backpack': { rbox(torso, 0.3, 0.36, 0.14, 0.05, M.top2Mat, 0, 0.27, -0.2); rbox(torso, 0.22, 0.14, 0.05, 0.02, mat(shade(M.top2Hex, 0.8)), 0, 0.18, -0.28); for (const sx of [-1, 1]) box(torso, 0.04, 0.4, 0.02, mat('#2A2B33'), sx * 0.1, 0.27, 0.15); break; }
        case 'a_watch': { const w = cyl(armL.fore, 0.052, 0.052, 0.04, mat('#2A2B33'), 0, -0.21, 0, 14); box(armL.fore, 0.035, 0.03, 0.01, mat('#5DE0B5', { emissive: '#5DE0B5', ei: 0.8 }), 0, -0.21, 0.052); break; }
        case 'a_wings': { const wm = mat('#FFFFFF', { emissive: '#CFE6FF', ei: 0.25, double: true }); av.wings = []; for (const sx of [-1, 1]) { const pv = new THREE.Group(); pv.position.set(sx * 0.07, 0.36, -0.15); torso.add(pv); for (let i = 0; i < 4; i++) { const f = sph(pv, 0.13 - i * 0.02, wm, sx * (0.12 + i * 0.07), 0.05 - i * 0.06, -0.05, 12, 8); f.scale.set(1.2, 0.5, 0.15); f.rotation.z = sx * (0.4 + i * 0.25); } av.wings.push([pv, sx]); } break; }
        case 'a_halo': { const h = tor(head, 0.15, 0.018, mat('#FFE08A', { emissive: '#FFD24F', ei: 1.8 }), 0, 0.5, 0); h.rotation.x = Math.PI / 2; h.castShadow = false; av.halo = h; break; }
      }
    }
  }

  function buildShoe(foot, id, M) {
    const s = M.shoe, sole = mat('#F6F4EF', { rough: 0.9 });
    switch (id) {
      case 's_boots': rbox(foot, 0.12, 0.17, 0.2, 0.04, s, 0, 0.0, 0.04); box(foot, 0.125, 0.025, 0.21, mat('#3A2A1E'), 0, -0.075, 0.04); break;
      case 's_loafer': rbox(foot, 0.11, 0.06, 0.21, 0.03, s, 0, -0.05, 0.045); box(foot, 0.06, 0.012, 0.03, mat('#C5A572', { metal: 0.6 }), 0, -0.018, 0.1); break;
      case 's_slipper': rbox(foot, 0.13, 0.07, 0.22, 0.035, s, 0, -0.05, 0.04); for (const sx of [-1, 1]) sph(foot, 0.025, mat('#FFFFFF'), sx * 0.03, -0.01, 0.12, 8, 6); break;
      case 's_heels': { rbox(foot, 0.1, 0.05, 0.19, 0.025, s, 0, -0.04, 0.05); cyl(foot, 0.012, 0.008, 0.07, s, 0, -0.08, -0.03, 8); break; }
      case 's_hightop': rbox(foot, 0.12, 0.15, 0.21, 0.04, s, 0, -0.01, 0.04); box(foot, 0.125, 0.03, 0.22, sole, 0, -0.075, 0.04); box(foot, 0.126, 0.025, 0.06, mat('#C7432F'), 0, 0.02, -0.02); break;
      default: rbox(foot, 0.115, 0.07, 0.21, 0.035, s, 0, -0.04, 0.045); box(foot, 0.12, 0.025, 0.215, sole, 0, -0.075, 0.045); box(foot, 0.06, 0.01, 0.06, mat('#F6F4EF'), 0, -0.004, 0.08);
    }
  }

  /** Build a full character. Returns controller {root, update, setPose, ...} */
  PW.Avatar = class {
    constructor(cfg) { this.root = new THREE.Group(); this.state = 'stand'; this.act = 'idle'; this.t0 = Math.random() * 10; this.blink = 2 + Math.random() * 3; this.talkUntil = 0; this.emote = null; this.emoteUntil = 0; this.joints = {}; this.seatH = 0.47; this.build(cfg); }
    build(cfg) {
      while (this.root.children.length) this.root.remove(this.root.children[0]);
      this.cfg = Object.assign(PW.defaultAvatar(cfg && cfg.g), cfg || {});
      const c = this.cfg, f = c.g === 'f';
      const skinHex = PW.SKIN[c.sk] || PW.SKIN[2], hairHex = PW.HAIRC[c.hc] || PW.HAIRC[1];
      const topHex = PW.CLOTH[c.tc] || PW.CLOTH[8], botHex = PW.CLOTH[c.bc] || PW.CLOTH[9], shoeHex = PW.CLOTH[c.shc] || PW.CLOTH[0];
      const top2Hex = PW.CLOTH[(c.tc + 5) % 16];
      const M = this.M = {
        skin: PW.matU(skinHex, { rough: 0.62 }), skinD: PW.matU(shade(skinHex, 0.85), { rough: 0.7 }),
        hair: PW.matU(hairHex, { rough: 0.55 }), hairHex,
        top: PW.matU(topHex, { rough: 0.85 }), topD: PW.matU(shade(topHex, 0.78), { rough: 0.85 }),
        bot: PW.matU(botHex, { rough: 0.85 }), botD: PW.matU(shade(botHex, 0.75), { rough: 0.85 }),
        shoe: PW.matU(shoeHex, { rough: 0.6 }), top2Hex, top2Mat: PW.matU(top2Hex, { rough: 0.8 }),
      };
      const top = c.top, bot = c.bot;
      const longSleeve = ['t_hoodie', 't_shirt', 't_sweater', 't_turtle', 't_jacket', 't_blazer', 't_varsity', 't_kimono', 't_pilot'].includes(top);
      const isDress = top === 't_dress', isOverall = top === 't_overall';
      const longPants = ['b_jeans', 'b_jogger', 'b_chino', 'b_cargo'].includes(bot) && !isDress;
      const skirt = !isDress && ['b_skirt', 'b_pleated'].includes(bot);
      const pantsMat = isOverall ? M.top : M.bot;

      const P = this.parts = {};
      const hips = P.hips = new THREE.Group(); hips.position.y = 0.8; this.root.add(hips);
      // pelvis
      const pel = sph(hips, 0.16, isDress ? M.top : (skirt ? M.bot : pantsMat), 0, 0.02, 0, 18, 12); pel.scale.set(f ? 1.08 : 1.0, 0.62, 0.78);
      // legs
      P.legs = [];
      for (const sx of [-1, 1]) {
        const pivot = new THREE.Group(); pivot.position.set(sx * 0.085, 0, 0); hips.add(pivot);
        const thighMat = (longPants || bot === 'b_shorts' || isOverall) && !skirt && !isDress ? pantsMat : M.skin;
        capsule(pivot, 0.078, 0.4, thighMat, 0, 0.02, 0, 0.066);
        if (bot === 'b_cargo') box(pivot, 0.02, 0.1, 0.09, M.botD, sx * 0.075, -0.2, 0.0);
        if (bot === 'b_jogger') box(pivot, 0.012, 0.38, 0.03, PW.matU('#F6F4EF'), sx * 0.076, -0.18, 0);
        if (skirt || isDress) {
          const panelMat = isDress ? M.top : M.bot;
          const len = isDress ? 0.3 : (bot === 'b_pleated' ? 0.24 : 0.2);
          const pn = lathe(pivot, [[0, 0.04], [0.1, 0.04], [0.112, -len * 0.5], [0.122, -len], [0, -len]], panelMat, 0, 0, 0, bot === 'b_pleated' ? 10 : 18);
          if (bot === 'b_pleated') pn.material = PW.matU(PW.CLOTH[c.bc], { rough: 0.8 });
        }
        const knee = new THREE.Group(); knee.position.y = -0.38; pivot.add(knee);
        sph(knee, 0.067, longPants || isOverall ? pantsMat : M.skin, 0, 0, 0, 12, 8); capsule(knee, 0.066, 0.36, longPants || isOverall ? pantsMat : M.skin, 0, 0.02, 0, 0.056);
        if (longPants && bot === 'b_jogger') cyl(knee, 0.062, 0.062, 0.05, M.botD, 0, -0.32, 0, 12);
        if (longPants && bot === 'b_jeans') cyl(knee, 0.064, 0.064, 0.035, M.botD, 0, -0.32, 0, 12);
        const foot = new THREE.Group(); foot.position.y = -0.36; knee.add(foot);
        buildShoe(foot, c.sh, M);
        P.legs.push({ pivot, knee, foot, sx });
      }
      // torso (one smooth lathe: hips → waist → chest → shoulders)
      const torso = P.torso = new THREE.Group(); torso.position.y = 0.03; hips.add(torso);
      const chestW = f ? 1.0 : 1.12;
      const prof = f ? [[0, -0.02], [0.148, -0.02], [0.152, 0.06], [0.132, 0.2], [0.152, 0.33], [0.158, 0.42], [0.135, 0.5], [0.07, 0.55], [0, 0.56]]
                     : [[0, -0.02], [0.145, -0.02], [0.148, 0.08], [0.142, 0.2], [0.158, 0.34], [0.165, 0.43], [0.14, 0.51], [0.07, 0.555], [0, 0.565]];
      const chest = lathe(torso, prof, M.top, 0, 0, 0, 28); chest.scale.set(chestW, 1, 0.74);
      const belly = chest;
      if (top === 't_crop') { const band = lathe(torso, [[0, 0.06], [0.15, 0.06], [0.135, 0.19], [0, 0.19]], M.skin, 0, 0, 0, 28); band.scale.set(chestW * 1.01, 1, 0.75); }
      // top details
      const neckRing = (m, r = 0.075, t = 0.02) => { const n = tor(torso, r, t, m, 0, 0.5, 0.0); n.rotation.x = Math.PI / 2; };
      if (top === 't_tee' || top === 't_blouse' || top === 't_crop') neckRing(M.topD, 0.07, 0.014);
      if (top === 't_hoodie') { const h = tor(torso, 0.1, 0.05, M.topD, 0, 0.5, -0.06); h.rotation.x = Math.PI / 2 - 0.5; rbox(torso, 0.2, 0.08, 0.03, 0.02, M.topD, 0, 0.15, 0.115); for (const sx of [-1, 1]) cyl(torso, 0.005, 0.005, 0.12, PW.matU('#F6F4EF'), sx * 0.03, 0.42, 0.13, 5); }
      if (top === 't_shirt') { for (const sx of [-1, 1]) { const cl = box(torso, 0.08, 0.04, 0.02, M.topD, sx * 0.045, 0.49, 0.1); cl.rotation.z = sx * 0.5; cl.rotation.x = -0.4; } for (let i = 0; i < 4; i++) sph(torso, 0.008, PW.matU('#F6F4EF'), 0, 0.42 - i * 0.08, 0.13, 6, 4); }
      if (top === 't_sweater') { neckRing(M.topD, 0.075, 0.025); const b = cyl(torso, 0.152, 0.152, 0.04, M.topD, 0, 0.06, 0, 20); b.scale.set(1.05, 1, 0.8); for (let i = 0; i < 3; i++) { const r = box(torso, 0.24, 0.015, 0.01, M.topD, 0, 0.36 - i * 0.04, 0.128); } }
      if (top === 't_turtle') cyl(torso, 0.07, 0.08, 0.1, M.topD, 0, 0.52, 0, 16);
      if (top === 't_jacket' || top === 't_blazer' || top === 't_varsity' || top === 't_pilot') {
        const inner = box(torso, 0.1, 0.38, 0.02, PW.matU(top === 't_blazer' ? '#F6F4EF' : (top === 't_pilot' ? '#5B6270' : '#F6F4EF')), 0, 0.3, 0.125); inner.scale.z = 1;
        if (top === 't_blazer' || top === 't_jacket') for (const sx of [-1, 1]) { const l = box(torso, 0.05, 0.18, 0.02, M.topD, sx * 0.07, 0.4, 0.13); l.rotation.z = -sx * 0.35; }
        if (top === 't_varsity') { box(torso, 0.06, 0.07, 0.01, PW.matU('#F6F4EF'), -0.08, 0.36, 0.13); const b = cyl(torso, 0.152, 0.152, 0.04, PW.matU('#F6F4EF'), 0, 0.06, 0, 20); b.scale.set(1.08, 1, 0.8); }
        if (top === 't_pilot') { const fur = tor(torso, 0.1, 0.04, PW.matU('#EFE3CC', { rough: 1 }), 0, 0.5, 0.0); fur.rotation.x = Math.PI / 2; box(torso, 0.06, 0.04, 0.01, PW.matU('#E9C04F', { metal: 0.7 }), 0.08, 0.38, 0.13); box(torso, 0.06, 0.06, 0.01, PW.matU('#C7432F'), -0.09, 0.36, 0.13); }
      }
      if (isOverall) { box(torso, 0.2, 0.2, 0.02, M.top, 0, 0.24, 0.12); for (const sx of [-1, 1]) box(torso, 0.035, 0.24, 0.02, M.top, sx * 0.08, 0.43, 0.12); chest.material = PW.matU('#F6F4EF'); for (const sx of [-1, 1]) sph(torso, 0.012, PW.matU('#C5A572', { metal: 0.7 }), sx * 0.08, 0.33, 0.135, 6, 4); }
      if (top === 't_kimono') { const ob = cyl(torso, 0.16, 0.16, 0.07, M.top2Mat, 0, 0.16, 0, 20); ob.scale.set(1.05, 1, 0.82); for (const sx of [-1, 1]) { const l = box(torso, 0.04, 0.3, 0.02, M.topD, sx * 0.04, 0.36, 0.125); l.rotation.z = sx * 0.3; } }
      if (top === 't_blouse') for (const sx of [-1, 1]) sph(torso, 0.07, M.top, sx * 0.19, 0.44, 0, 12, 8);
      if (isDress) { const w = cyl(torso, 0.15, 0.15, 0.03, M.topD, 0, 0.17, 0, 20); w.scale.set(1, 1, 0.8); }
      // neck & head
      cyl(torso, 0.055, 0.06, 0.08, M.skin, 0, 0.53, 0, 12);
      const neck = P.neck = new THREE.Group(); neck.position.y = 0.56; torso.add(neck);
      const head = P.head = new THREE.Group(); neck.add(head);
      const skull = sph(head, 0.2, M.skin, 0, 0.17, 0, 32, 24); skull.scale.set(1.04, 1.0, 0.96);
      const jaw = sph(head, 0.16, M.skin, 0, 0.1, 0.02, 20, 14); jaw.scale.set(1.0, 0.8, 0.95);
      for (const sx of [-1, 1]) sph(head, 0.04, M.skin, sx * 0.195, 0.15, -0.01, 10, 8).scale.set(0.6, 1, 1);
      // face
      const eyeM = PW.matU(PW.EYEC[c.ec] || '#2B1B10', { rough: 0.25 });
      P.eyes = [];
      for (const sx of [-1, 1]) {
        const eg = new THREE.Group(); eg.position.set(sx * 0.072, 0.19, 0.172); head.add(eg);
        const e = sph(eg, 0.036, eyeM, 0, 0, 0, 14, 12); e.scale.set(0.82, 1.2, 0.5);
        sph(eg, 0.012, mat('#FFFFFF', { emissive: '#FFFFFF', ei: 0.6 }), 0.01 * sx, 0.016, 0.016, 8, 6); sph(eg, 0.006, mat('#FFFFFF', { emissive: '#FFFFFF', ei: 0.6 }), -0.008 * sx, -0.014, 0.017, 6, 4);
        if (f) { const l = box(eg, 0.05, 0.008, 0.01, mat('#1E1714'), sx * 0.012, 0.037, 0.004); l.rotation.z = -sx * 0.25; }
        P.eyes.push(eg);
        const brow = box(head, 0.06, 0.013, 0.012, M.hair, sx * 0.075, 0.255, 0.18); brow.rotation.z = -sx * 0.08;
        const ch = sph(head, 0.028, mat('#F08C8C', { opacity: 0.35 }), sx * 0.11, 0.13, 0.155, 10, 6); ch.scale.set(1.2, 0.7, 0.3); ch.castShadow = false;
      }
      sph(head, 0.022, M.skinD, 0, 0.15, 0.19, 8, 6).scale.set(0.9, 0.8, 0.8);
      const mouthM = PW.matU('#9A3B36', { rough: 0.5 });
      const smile = tor(head, 0.03, 0.007, mouthM, 0, 0.1, 0.178, Math.PI); smile.rotation.z = Math.PI; P.smile = smile;
      const mo = sph(head, 0.022, PW.matU('#5A1E1E'), 0, 0.09, 0.172, 10, 8); mo.scale.set(1.2, 0.2, 0.5); P.mouthOpen = mo;
      buildHair(head, c.hs, M);
      buildBeard(head, c.g === 'm' ? c.fh : 'fh_none', M);
      // arms
      const sleeveMat = longSleeve || isDress === false && false ? M.top : M.top;
      const mkArm = (sx) => {
        const sh = new THREE.Group(); sh.position.set(sx * (f ? 0.195 : 0.215), 0.47, 0); torso.add(sh);
        sph(sh, 0.062, M.top, 0, -0.005, 0, 14, 10);
        const upMat = (top === 't_dress' && false) ? M.skin : M.top;
        if (longSleeve) capsule(sh, 0.058, 0.29, M.top, 0, 0.01, 0, 0.052); else { capsule(sh, 0.054, 0.29, M.skin, 0, 0.01, 0, 0.05); if (top !== 't_crop' && top !== 't_dress') { const sl = lathe(sh, [[0, 0.055], [0.05, 0.05], [0.062, 0.0], [0.063, -0.08], [0.064, -0.11], [0, -0.11]], M.top, 0, 0, 0, 16); } }
        const el = new THREE.Group(); el.position.y = -0.27; sh.add(el);
        const foreMat = longSleeve ? (top === 't_varsity' ? PW.matU('#F6F4EF') : M.top) : M.skin;
        sph(el, 0.052, longSleeve ? M.top : (top === 't_tee' || top === 't_crop' || top === 't_blouse' || top === 't_dress' || top === 't_overall' ? M.skin : M.top), 0, 0, 0, 12, 8); const fore = capsule(el, 0.05, 0.25, foreMat, 0, 0.01, 0, 0.044);
        if (top === 't_kimono') { const s = lathe(el, [[0, 0.02], [0.07, 0.02], [0.11, -0.2], [0, -0.2]], M.top, 0, 0, 0, 14); }
        if (longSleeve && top !== 't_kimono') cyl(el, 0.048, 0.048, 0.03, M.topD, 0, -0.21, 0, 10);
        const hand = sph(el, 0.048, M.skin, 0, -0.27, 0.0, 14, 10); hand.scale.set(0.82, 1.05, 0.62); const th = sph(el, 0.02, M.skin, -sx * 0.035, -0.255, 0.02, 8, 6); th.scale.set(1, 1.4, 1);
        return { sh, el, fore: el, hand, sx };
      };
      P.armL = mkArm(-1); P.armR = mkArm(1);
      buildAccessories(this, c.acc || [], M);
      // held props (shown by activity)
      P.props = {};
      const pen = new THREE.Group(); P.armR.el.add(pen); pen.position.set(0, -0.3, 0.02); cyl(pen, 0.008, 0.006, 0.14, mat('#3E7CB1'), 0, 0, 0, 6).rotation.x = 0.6; P.props.pen = pen;
      const cup = new THREE.Group(); P.armR.el.add(cup); cup.position.set(0, -0.31, 0.04); cyl(cup, 0.04, 0.035, 0.1, mat('#F6F4EF'), 0, 0, 0, 12); cyl(cup, 0.036, 0.036, 0.005, mat('#5A3520'), 0, 0.048, 0, 12); P.props.cup = cup;
      const book = new THREE.Group(); P.armL.el.add(book); book.position.set(0.12, -0.3, 0.06); box(book, 0.22, 0.28, 0.03, mat('#C7432F'), 0, 0, 0); box(book, 0.2, 0.26, 0.032, mat('#F6F0E2'), 0.004, 0, 0.001); P.props.book = book;
      for (const k in P.props) P.props[k].visible = false;
      this.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
      this.applyPose(true);
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
      // target angles
      const T = { hipsY: 0.8, hipsZ: 0, torsoX: 0, torsoY: 0, torsoZ: 0, neckX: 0, neckY: 0, neckZ: 0, legs: [[0, 0, 0], [0, 0, 0]], arms: [[0.05, 0, -0.1, -0.1], [0.05, 0, 0.1, -0.1]], rootBob: 0 };
      const breath = Math.sin(t * 2.1) * 0.012;
      if (sitting) {
        T.hipsY = this.seatH + 0.07;
        T.legs = [[-1.5, 0.08, 1.45], [-1.5, -0.08, 1.45]];
        T.torsoX = 0.05 + breath;
        if (act === 'write') {
          T.torsoX = 0.28 + Math.sin(t * 0.7) * 0.02; T.neckX = 0.35 + Math.sin(t * 0.5) * 0.04; T.neckY = Math.sin(t * 0.3) * 0.08;
          T.arms[0] = [-0.95, 0.25, 0.25, -1.15];
          T.arms[1] = [-1.0 + Math.sin(t * 7) * 0.03, -0.3 + Math.sin(t * 3.5) * 0.06, -0.15, -1.1 + Math.sin(t * 9) * 0.05];
        } else if (act === 'type') {
          T.torsoX = 0.16; T.neckX = 0.18 + Math.sin(t * 0.4) * 0.03;
          const k1 = Math.max(0, Math.sin(t * 16)) * 0.08, k2 = Math.max(0, Math.sin(t * 16 + 2)) * 0.08;
          T.arms[0] = [-1.05 - k1, 0.35, 0.22, -0.95];
          T.arms[1] = [-1.05 - k2, -0.35, -0.22, -0.95];
        } else if (act === 'read') {
          T.torsoX = 0.12; T.neckX = 0.42; T.neckY = Math.sin(t * 0.6) * 0.04;
          T.arms[0] = [-1.0, 0.45, 0.3, -1.45];
          T.arms[1] = [-0.95, -0.4, -0.3, -1.4];
          if (Math.sin(t * 0.25) > 0.985) T.arms[1] = [-1.2, -0.1, -0.3, -1.6];
        } else if (act === 'drink') {
          const sip = Math.max(0, Math.sin(t * 0.8));
          T.torsoX = -0.05; T.neckX = -0.1 * sip;
          T.arms[1] = [-0.9 - sip * 0.6, -0.25, -0.2, -1.6 - sip * 0.5];
          T.arms[0] = [-0.3, 0.1, 0.25, -0.6];
        } else if (act === 'stretch') {
          const s = (Math.sin(t * 0.9) + 1) / 2;
          T.torsoX = -0.15 * s; T.neckX = -0.25 * s;
          T.arms[0] = [-2.9 * s - 0.2, 0, 0.3 - 0.2 * s, -0.4 * (1 - s)];
          T.arms[1] = [-2.9 * s - 0.2, 0, -0.3 + 0.2 * s, -0.4 * (1 - s)];
        } else if (act === 'wave') {
          T.arms[1] = [-0.3, 0, 2.5, -0.4 + Math.sin(t * 12) * 0.4];
          T.neckZ = Math.sin(t * 3) * 0.08;
        } else if (act === 'clap') {
          const c = Math.sin(t * 14) * 0.15;
          T.arms[0] = [-1.2, 0.6 + c, 0.1, -1.0]; T.arms[1] = [-1.2, -0.6 - c, -0.1, -1.0];
        } else if (act === 'cheer') {
          T.arms[0] = [-2.8, 0, 0.35, -0.2]; T.arms[1] = [-2.8, 0, -0.35, -0.2]; T.torsoX = -0.1 + Math.sin(t * 8) * 0.03;
        } else { // idle sitting
          T.torsoX = -0.02 + breath; T.neckY = Math.sin(t * 0.4) * 0.3; T.neckX = Math.sin(t * 0.33) * 0.06;
          T.arms[0] = [-0.55, 0.15, 0.25, -0.6]; T.arms[1] = [-0.55, -0.15, -0.25, -0.6];
        }
      } else if (this.state === 'walk') {
        const s = Math.sin(t * 9);
        T.legs = [[s * 0.55, 0, Math.max(0, -s) * 0.6 + 0.1], [-s * 0.55, 0, Math.max(0, s) * 0.6 + 0.1]];
        T.arms = [[-s * 0.45, 0, -0.1, -0.25], [s * 0.45, 0, 0.1, -0.25]];
        T.rootBob = Math.abs(Math.cos(t * 9)) * 0.03; T.torsoX = 0.05; T.torsoY = s * 0.06;
      } else { // standing
        T.torsoX = breath; T.neckY = Math.sin(t * 0.37) * 0.25; T.neckX = Math.sin(t * 0.29) * 0.05;
        if (act === 'wave') { T.arms[1] = [-0.2, 0, 2.6, -0.3 + Math.sin(t * 12) * 0.45]; T.neckZ = Math.sin(t * 3) * 0.1; }
        else if (act === 'dance') { const s = Math.sin(t * 7); T.hipsZ = s * 0.1; T.rootBob = Math.abs(s) * 0.06; T.arms = [[-1.6 + s * 0.6, 0, 0.6, -1.2], [-1.6 - s * 0.6, 0, -0.6, -1.2]]; T.legs = [[s * 0.25, 0, 0.3 + s * 0.2], [-s * 0.25, 0, 0.3 - s * 0.2]]; T.neckZ = s * 0.2; T.torsoY = s * 0.3; }
        else if (act === 'clap') { const c = Math.sin(t * 14) * 0.15; T.arms[0] = [-1.3, 0.65 + c, 0.1, -0.9]; T.arms[1] = [-1.3, -0.65 - c, -0.1, -0.9]; }
        else if (act === 'cheer') { const j = Math.max(0, Math.sin(t * 6)); T.rootBob = j * 0.12; T.arms[0] = [-2.9, 0, 0.4, -0.1]; T.arms[1] = [-2.9, 0, -0.4, -0.1]; }
        else if (act === 'drink') { const sip = Math.max(0, Math.sin(t * 0.8)); T.arms[1] = [-0.9 - sip * 0.6, -0.25, -0.2, -1.6 - sip * 0.5]; T.neckX = -0.1 * sip; }
        else if (act === 'stretch') { const s = (Math.sin(t * 0.9) + 1) / 2; T.arms[0] = [-2.9 * s - 0.1, 0, 0.3, 0]; T.arms[1] = [-2.9 * s - 0.1, 0, -0.3, 0]; T.torsoX = -0.12 * s; }
      }
      // smooth apply
      const k = this._snap ? 1 : 1 - Math.pow(0.0005, dt);
      this._snap = false;
      const L = (o, prop, v) => (o[prop] = o[prop] + (v - o[prop]) * k);
      L(P.hips.position, 'y', T.hipsY + T.rootBob); L(P.hips.rotation, 'z', T.hipsZ);
      L(P.torso.rotation, 'x', T.torsoX); L(P.torso.rotation, 'y', T.torsoY); L(P.torso.rotation, 'z', T.torsoZ);
      L(P.neck.rotation, 'x', T.neckX); L(P.neck.rotation, 'y', T.neckY); L(P.neck.rotation, 'z', T.neckZ);
      P.legs.forEach((lg, i) => { L(lg.pivot.rotation, 'x', T.legs[i][0]); L(lg.pivot.rotation, 'z', T.legs[i][1] || 0); L(lg.knee.rotation, 'x', T.legs[i][2]); L(lg.foot.rotation, 'x', sitting ? 0.05 : -T.legs[i][2] * 0.3); });
      [P.armL, P.armR].forEach((a, i) => { L(a.sh.rotation, 'x', T.arms[i][0]); L(a.sh.rotation, 'y', T.arms[i][1]); L(a.sh.rotation, 'z', T.arms[i][2]); L(a.el.rotation, 'x', T.arms[i][3]); });
      // props
      const pr = P.props;
      pr.pen.visible = sitting && act === 'write';
      pr.cup.visible = act === 'drink';
      pr.book.visible = sitting && act === 'read';
      // blink & mouth
      this.blink -= dt;
      const bl = this.blink < 0.12 ? 0.15 : 1;
      if (this.blink < 0) this.blink = 2 + Math.random() * 4;
      P.eyes.forEach((e) => (e.scale.y = bl));
      const talking = now < this.talkUntil;
      P.mouthOpen.visible = talking && Math.sin(t * 22) > -0.2;
      P.mouthOpen.scale.y = talking ? 0.4 + Math.abs(Math.sin(t * 18)) * 0.9 : 0.2;
      P.smile.visible = !P.mouthOpen.visible;
      if (this.wings) this.wings.forEach(([w, sx]) => (w.rotation.y = sx * (0.3 + Math.sin(t * 3) * 0.2)));
      if (this.halo) { this.halo.position.y = 0.5 + Math.sin(t * 2) * 0.015; this.halo.rotation.z = t; }
    }
    headWorld(v) { this.parts.head.updateWorldMatrix(true, false); return this.parts.head.localToWorld(v.set(0, 0.48, 0)); }
  };
})();
