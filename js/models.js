/* Pomodoro World — procedural 3D furniture, room surfaces and window views */
(function () {
  const PW = window.PW;
  const { box, cyl, sph, rbox, tor, cone, lathe, mat } = PW;
  const U = PW.util;

  const WOOD = '#A9744A', WOOD_D = '#7A4F31', WOOD_L = '#C99A6B', METAL = '#2E3138', WHITE = '#F1EFEA';
  const metal = (c = METAL) => mat(c, { rough: 0.35, metal: 0.7 });
  const glow = (c, ei = 1.4) => mat(c, { emissive: c, ei, rough: 0.5 });

  function books(g, x, y, z, w, seed, depth = 0.22, maxH = 0.28) {
    const r = U.seeded(seed);
    const cols = ['#C7432F', '#2F7D5B', '#22406E', '#E8B04A', '#6B4630', '#8E6CC1', '#3E7CB1', '#D9D3CC', '#B85C38', '#4A5D23'];
    let cx = x - w / 2;
    while (cx < x + w / 2 - 0.04) {
      const bw = 0.03 + r() * 0.04, bh = maxH * (0.65 + r() * 0.35);
      if (r() < 0.08) { cx += bw * 1.5; continue; }
      const b = box(g, bw, bh, depth * (0.85 + r() * 0.15), cols[Math.floor(r() * cols.length)], cx + bw / 2, y + bh / 2, z);
      if (r() < 0.12) b.rotation.z = 0.25;
      cx += bw + 0.004;
    }
  }

  function legs4(g, w, d, h, r, color, inset = 0.06) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, r, r * 0.8, h, color, sx * (w / 2 - inset), h / 2, sz * (d / 2 - inset), 10);
  }

  function screenTex(kind) {
    return PW.canvasTex(256, 160, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, w, h);
      if (kind === 'code') { gr.addColorStop(0, '#1B2233'); gr.addColorStop(1, '#232C42'); }
      else { gr.addColorStop(0, '#3D5A99'); gr.addColorStop(1, '#C36A8E'); }
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      if (kind === 'code') {
        const cols = ['#7FD3C8', '#F2C14E', '#E58BB0', '#9DB7FF', '#CFD6E4'];
        for (let i = 0; i < 12; i++) { let x = 12 + (i % 3) * 10; for (let k = 0; k < 4; k++) { const ww = 10 + Math.random() * 40; c.fillStyle = cols[(i + k) % 5]; c.fillRect(x, 10 + i * 12, ww, 5); x += ww + 6; } }
      } else {
        c.fillStyle = 'rgba(255,255,255,.85)'; c.font = 'bold 34px sans-serif'; c.fillText('25:00', 70, 95);
      }
    });
  }

  function rugTex(kind) {
    return PW.canvasTex(512, 512, (c, w, h) => {
      if (kind === 'round') {
        const cols = ['#D8B48A', '#C7432F', '#F2E6D3', '#2F7D5B', '#F2E6D3', '#D8B48A'];
        for (let i = 0; i < cols.length; i++) { c.fillStyle = cols[i]; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - i * 40, 0, Math.PI * 2); c.fill(); }
      } else if (kind === 'rect') {
        c.fillStyle = '#E9E1D3'; c.fillRect(0, 0, w, h);
        const cols = ['#3E7CB1', '#E9E1D3', '#F2C14E', '#E9E1D3', '#3E7CB1'];
        for (let i = 0; i < 16; i++) { c.fillStyle = cols[i % cols.length]; c.fillRect(0, i * 32, w, 18); }
      } else {
        c.fillStyle = '#9B2F25'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#E8C27A'; c.fillRect(18, 18, w - 36, h - 36);
        c.fillStyle = '#9B2F25'; c.fillRect(34, 34, w - 68, h - 68);
        const mot = ['#1F3B6E', '#E8C27A', '#F2E6D3', '#2F6B4F'];
        for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
          const cx = 110 + col * 146, cy = 110 + row * 146;
          c.fillStyle = mot[(row + col) % 4];
          c.beginPath(); c.moveTo(cx, cy - 55); c.lineTo(cx + 55, cy); c.lineTo(cx, cy + 55); c.lineTo(cx - 55, cy); c.closePath(); c.fill();
          c.fillStyle = '#9B2F25'; c.beginPath(); c.moveTo(cx, cy - 25); c.lineTo(cx + 25, cy); c.lineTo(cx, cy + 25); c.lineTo(cx - 25, cy); c.closePath(); c.fill();
          c.fillStyle = '#F2E6D3'; c.fillRect(cx - 6, cy - 6, 12, 12);
        }
        c.strokeStyle = '#F2E6D3'; c.lineWidth = 4;
        for (let i = 0; i < w; i += 24) { c.beginPath(); c.moveTo(i, 4); c.lineTo(i + 12, 14); c.lineTo(i + 24, 4); c.stroke(); c.beginPath(); c.moveTo(i, h - 4); c.lineTo(i + 12, h - 14); c.lineTo(i + 24, h - 4); c.stroke(); }
      }
    });
  }

  function posterTex(kind) {
    return PW.canvasTex(256, 360, (c, w, h) => {
      if (kind === 'space') {
        const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0E1530'); g.addColorStop(1, '#3B2466'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 80; i++) { c.fillStyle = 'rgba(255,255,255,' + Math.random() + ')'; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
        c.fillStyle = '#E8803A'; c.beginPath(); c.arc(128, 150, 62, 0, 7); c.fill();
        c.strokeStyle = '#F2C14E'; c.lineWidth = 7; c.beginPath(); c.ellipse(128, 150, 105, 22, -0.3, 0, 7); c.stroke();
        c.fillStyle = '#F6F4EF'; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.fillText('KEŞFET', 128, 310);
      } else if (kind === 'plane') {
        c.fillStyle = '#E9E1D3'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#3E7CB1'; c.fillRect(0, 0, w, 220);
        c.fillStyle = '#F6F4EF';
        c.save(); c.translate(128, 115); c.rotate(-0.35);
        c.fillRect(-90, -9, 180, 18); c.beginPath(); c.ellipse(90, 0, 18, 9, 0, 0, 7); c.fill();
        c.beginPath(); c.moveTo(-10, 0); c.lineTo(-45, -70); c.lineTo(-25, -70); c.lineTo(35, 0); c.fill();
        c.beginPath(); c.moveTo(-10, 0); c.lineTo(-45, 70); c.lineTo(-25, 70); c.lineTo(35, 0); c.fill();
        c.beginPath(); c.moveTo(-80, 0); c.lineTo(-95, -30); c.lineTo(-85, -30); c.lineTo(-65, 0); c.fill();
        c.restore();
        c.fillStyle = '#22406E'; c.font = 'bold 34px sans-serif'; c.textAlign = 'center'; c.fillText('UÇ, ODAKLAN', 128, 280);
        c.font = '16px sans-serif'; c.fillText('FL 350 · MACH 0.82', 128, 315);
      } else if (kind === 'painting') {
        c.fillStyle = '#F2E6D3'; c.fillRect(0, 0, w, h);
        const cols = ['#C7432F', '#22406E', '#F2C14E', '#2F7D5B', '#E58BB0'];
        for (let i = 0; i < 7; i++) { c.fillStyle = cols[i % 5]; c.globalAlpha = 0.85; c.beginPath(); c.arc(40 + Math.random() * 180, 40 + Math.random() * 280, 20 + Math.random() * 60, 0, 7); c.fill(); }
        c.globalAlpha = 1; c.fillStyle = '#2A2B33'; c.fillRect(30, 200, 200, 10);
      } else if (kind === 'map') {
        c.fillStyle = '#A3C4D9'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#E9D8A6';
        [[60, 90, 50, 40], [80, 190, 30, 60], [150, 80, 45, 30], [170, 150, 40, 55], [215, 230, 25, 20], [140, 60, 30, 18]].forEach(([x, y, a, b]) => { c.beginPath(); c.ellipse(x, y, a, b, Math.random(), 0, 7); c.fill(); });
        c.strokeStyle = 'rgba(34,64,110,.4)'; for (let i = 0; i < w; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); } for (let i = 0; i < h; i += 32) { c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); }
        c.fillStyle = '#C7432F'; c.beginPath(); c.arc(158, 92, 6, 0, 7); c.fill();
      } else if (kind === 'diploma') {
        c.fillStyle = '#FBF7EC'; c.fillRect(0, 0, w, h);
        c.strokeStyle = '#C9A35A'; c.lineWidth = 8; c.strokeRect(14, 14, w - 28, h - 28);
        c.fillStyle = '#2A2B33'; c.textAlign = 'center'; c.font = 'bold 24px serif'; c.fillText('BAŞARI', 128, 90); c.font = '16px serif'; c.fillText('Pomodoro World', 128, 130); c.fillText('Odak Ustalığı Belgesi', 128, 160);
        c.fillStyle = '#C7432F'; c.beginPath(); c.arc(128, 260, 34, 0, 7); c.fill();
      } else if (kind === 'board') {
        c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, w, h);
        c.strokeStyle = '#3E7CB1'; c.lineWidth = 4; c.beginPath(); c.moveTo(20, 60); c.bezierCurveTo(80, 10, 120, 110, 220, 50); c.stroke();
        c.fillStyle = '#C7432F'; c.font = 'bold 26px sans-serif'; c.fillText('E = mc²', 40, 160);
        c.fillStyle = '#2F7D5B'; c.font = '20px sans-serif'; c.fillText('✓ Ünite 3', 40, 220); c.fillText('□ Deneme 4', 40, 260);
      }
    });
  }

  /* -------------- furniture builders (origin: floor centre, front = +z) -------------- */
  const B = {};
  B.f_desk_wood = (g) => { rbox(g, 1.4, 0.06, 0.7, 0.02, WOOD, 0, 0.73, 0); legs4(g, 1.4, 0.7, 0.7, 0.03, WOOD_D); box(g, 0.38, 0.32, 0.6, WOOD_L, 0.45, 0.52, 0); box(g, 0.3, 0.02, 0.01, WOOD_D, 0.45, 0.6, 0.305); box(g, 0.3, 0.02, 0.01, WOOD_D, 0.45, 0.46, 0.305); };
  B.f_desk_white = (g) => { rbox(g, 1.4, 0.04, 0.7, 0.015, WHITE, 0, 0.74, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = cyl(g, 0.012, 0.012, 0.73, metal('#C5A572'), sx * 0.62, 0.365, sz * 0.28, 8); l.rotation.z = sx * 0.06; } };
  B.f_table_round = (g) => { cyl(g, 0.55, 0.55, 0.04, WOOD_L, 0, 0.74, 0, 32); cyl(g, 0.04, 0.04, 0.72, METAL, 0, 0.36, 0); cyl(g, 0.25, 0.28, 0.03, METAL, 0, 0.015, 0, 24); };
  B.f_desk_standing = (g) => { rbox(g, 1.5, 0.04, 0.75, 0.015, '#3A3D44', 0, 0.74, 0); for (const sx of [-1, 1]) { box(g, 0.07, 0.72, 0.07, '#D7D9DD', sx * 0.6, 0.36, 0); box(g, 0.08, 0.03, 0.7, '#D7D9DD', sx * 0.6, 0.015, 0); } box(g, 0.12, 0.02, 0.05, '#111', 0.6, 0.715, 0.36); box(g, 0.02, 0.005, 0.02, glow('#5DE0B5'), 0.62, 0.705, 0.385); };
  B.f_desk_gaming = (g) => { rbox(g, 1.6, 0.05, 0.75, 0.02, '#1C1D22', 0, 0.735, 0); box(g, 1.58, 0.012, 0.012, glow('#26E0FF', 2), 0, 0.71, 0.37); box(g, 0.012, 0.012, 0.73, glow('#FF3FA4', 2), -0.79, 0.71, 0); box(g, 0.012, 0.012, 0.73, glow('#FF3FA4', 2), 0.79, 0.71, 0); for (const sx of [-1, 1]) { const l = box(g, 0.08, 0.72, 0.5, '#26272E', sx * 0.68, 0.36, 0); l.rotation.z = sx * 0.12; } box(g, 0.9, 0.003, 0.35, '#2E2F3A', 0, 0.762, 0.12); };
  B.f_table_long = (g) => { rbox(g, 3.2, 0.08, 1.2, 0.02, '#7A4B2C', 0, 0.72, 0); legs4(g, 3.2, 1.2, 0.68, 0.05, '#5A3520', 0.12); box(g, 3.0, 0.06, 0.06, '#5A3520', 0, 0.2, 0); box(g, 3.0, 0.004, 0.32, '#2F5D45', 0, 0.762, 0); };
  B.f_chair_wood = (g) => { rbox(g, 0.44, 0.05, 0.44, 0.015, WOOD_L, 0, 0.44, 0); legs4(g, 0.44, 0.44, 0.42, 0.02, WOOD_D, 0.04); for (const sx of [-1, 1]) box(g, 0.035, 0.5, 0.035, WOOD_D, sx * 0.18, 0.7, -0.2); rbox(g, 0.42, 0.12, 0.03, 0.01, WOOD_L, 0, 0.88, -0.2); box(g, 0.36, 0.03, 0.02, WOOD_D, 0, 0.66, -0.2); };
  B.f_stool = (g) => { cyl(g, 0.19, 0.19, 0.06, '#C7432F', 0, 0.45, 0); for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const l = cyl(g, 0.015, 0.015, 0.44, METAL, Math.cos(a) * 0.12, 0.21, Math.sin(a) * 0.12, 8); l.rotation.set(Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15); } tor(g, 0.13, 0.008, METAL, 0, 0.18, 0).rotation.x = Math.PI / 2; };
  B.f_chair_office = (g) => { rbox(g, 0.5, 0.08, 0.48, 0.03, '#2A2B33', 0, 0.45, 0); rbox(g, 0.46, 0.55, 0.06, 0.03, '#2A2B33', 0, 0.8, -0.24).rotation.x = -0.12; box(g, 0.2, 0.25, 0.04, '#3E4250', 0, 0.62, -0.22); cyl(g, 0.025, 0.025, 0.3, metal('#9AA0AA'), 0, 0.27, 0); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const leg = box(g, 0.3, 0.03, 0.04, METAL, Math.cos(a) * 0.15, 0.08, Math.sin(a) * 0.15); leg.rotation.y = -a; sph(g, 0.03, '#111', Math.cos(a) * 0.29, 0.03, Math.sin(a) * 0.29, 8, 6); } for (const sx of [-1, 1]) { box(g, 0.04, 0.18, 0.04, METAL, sx * 0.25, 0.56, -0.02); rbox(g, 0.06, 0.03, 0.26, 0.01, '#2A2B33', sx * 0.25, 0.66, 0.02); } };
  B.f_beanbag = (g) => { const s = sph(g, 0.42, mat('#E8803A', { rough: 0.95 }), 0, 0.3, -0.05, 24, 18); s.scale.set(1, 0.7, 1); const b = sph(g, 0.3, mat('#E8803A', { rough: 0.95 }), 0, 0.52, -0.28, 20, 14); b.scale.set(1.1, 0.9, 0.6); };
  B.f_chair_gaming = (g) => { rbox(g, 0.52, 0.1, 0.5, 0.04, '#1C1D22', 0, 0.46, 0); const back = new THREE.Group(); back.position.set(0, 0.52, -0.25); back.rotation.x = -0.15; g.add(back); rbox(back, 0.5, 0.85, 0.1, 0.05, '#1C1D22', 0, 0.42, 0); box(back, 0.12, 0.8, 0.105, '#C7432F', 0, 0.42, 0.005); rbox(back, 0.3, 0.12, 0.08, 0.04, '#C7432F', 0, 0.72, 0.07); for (const sx of [-1, 1]) rbox(back, 0.1, 0.5, 0.14, 0.04, '#1C1D22', sx * 0.25, 0.3, 0.05); cyl(g, 0.03, 0.03, 0.32, metal('#9AA0AA'), 0, 0.26, 0); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const leg = box(g, 0.32, 0.035, 0.05, METAL, Math.cos(a) * 0.16, 0.08, Math.sin(a) * 0.16); leg.rotation.y = -a; sph(g, 0.035, '#111', Math.cos(a) * 0.31, 0.035, Math.sin(a) * 0.31, 8, 6); } for (const sx of [-1, 1]) rbox(g, 0.07, 0.04, 0.3, 0.015, '#C7432F', sx * 0.28, 0.68, 0.02); };
  B.f_armchair = (g) => { const c = '#2F7D5B'; rbox(g, 0.9, 0.22, 0.8, 0.06, c, 0, 0.28, 0); rbox(g, 0.62, 0.12, 0.6, 0.05, mat('#3A8E69'), 0, 0.44, 0.06); rbox(g, 0.86, 0.55, 0.16, 0.06, c, 0, 0.62, -0.33); for (const sx of [-1, 1]) rbox(g, 0.14, 0.42, 0.78, 0.06, c, sx * 0.38, 0.45, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) cone(g, 0.025, 0.16, WOOD_D, sx * 0.36, 0.08, sz * 0.32, 8).rotation.x = Math.PI; };
  function sofaBody(g, w, c, c2) { rbox(g, w, 0.22, 0.85, 0.06, c, 0, 0.27, 0); const n = Math.round(w / 0.85); const cw = (w - 0.3) / n; for (let i = 0; i < n; i++) { rbox(g, cw - 0.02, 0.13, 0.62, 0.05, c2, -w / 2 + 0.15 + cw * (i + 0.5), 0.44, 0.07); rbox(g, cw - 0.04, 0.4, 0.16, 0.07, c2, -w / 2 + 0.15 + cw * (i + 0.5), 0.68, -0.25).rotation.x = -0.12; } rbox(g, w, 0.55, 0.14, 0.06, c, 0, 0.6, -0.36); for (const sx of [-1, 1]) rbox(g, 0.15, 0.42, 0.84, 0.06, c, sx * (w / 2 - 0.075), 0.44, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, 0.025, 0.018, 0.14, WOOD_D, sx * (w / 2 - 0.1), 0.07, sz * 0.33, 8); }
  B.f_sofa = (g) => { sofaBody(g, 1.8, '#5B6270', '#6E7685'); const p = rbox(g, 0.32, 0.3, 0.1, 0.05, '#F2C14E', -0.6, 0.62, -0.16); p.rotation.set(-0.3, 0.3, 0.1); };
  B.f_sofa_l = (g) => { const s = new THREE.Group(); s.position.x = -0.3; g.add(s); sofaBody(s, 1.8, '#8E6CC1', '#A283D1'); rbox(g, 0.8, 0.22, 1.5, 0.06, '#8E6CC1', 0.9, 0.27, 0.32); rbox(g, 0.62, 0.13, 1.25, 0.05, '#A283D1', 0.87, 0.44, 0.38); rbox(g, 0.15, 0.42, 1.5, 0.06, '#8E6CC1', 1.22, 0.44, 0.32); rbox(g, 0.3, 0.3, 0.1, 0.05, '#E58BB0', 0.8, 0.62, -0.2).rotation.set(-0.3, -0.4, 0); };
  B.f_bed_single = (g) => { box(g, 1.1, 0.25, 2.1, WOOD, 0, 0.2, 0); rbox(g, 1.02, 0.18, 2.0, 0.05, WHITE, 0, 0.4, 0.02); rbox(g, 1.06, 0.06, 1.3, 0.03, '#3E7CB1', 0, 0.5, 0.36); rbox(g, 0.6, 0.12, 0.35, 0.06, '#FFFFFF', 0, 0.54, -0.72); rbox(g, 1.1, 0.75, 0.08, 0.03, WOOD_D, 0, 0.45, -1.04); };
  B.f_bed_double = (g) => { box(g, 1.7, 0.25, 2.2, '#5B4330', 0, 0.2, 0); rbox(g, 1.62, 0.2, 2.1, 0.06, WHITE, 0, 0.42, 0.02); rbox(g, 1.66, 0.07, 1.35, 0.03, '#C98FA6', 0, 0.53, 0.38); rbox(g, 1.66, 0.05, 0.3, 0.02, '#F2E6D3', 0, 0.565, 0.0); for (const sx of [-1, 1]) rbox(g, 0.6, 0.14, 0.36, 0.07, '#FFFFFF', sx * 0.38, 0.58, -0.74); rbox(g, 1.8, 1.0, 0.12, 0.05, '#6B4630', 0, 0.6, -1.08); for (const sx of [-1, 1]) { box(g, 0.45, 0.45, 0.4, WOOD_L, sx * 1.2, 0.225, -0.85); sph(g, 0.07, glow('#FFD58A', 1.2), sx * 1.2, 0.6, -0.85).scale.y = 1.2; } };
  B.f_bookshelf = (g, d) => { const w = 1.1, h = 1.8; box(g, w, h, 0.04, WOOD_D, 0, h / 2, -0.18); for (const sx of [-1, 1]) box(g, 0.04, h, 0.4, WOOD, sx * (w / 2 - 0.02), h / 2, 0); for (let i = 0; i < 5; i++) box(g, w - 0.04, 0.03, 0.38, WOOD, 0, 0.05 + i * 0.43, 0); for (let i = 0; i < 4; i++) books(g, 0, 0.065 + i * 0.43, 0.02, w - 0.12, (d.seed || 7) + i, 0.26, 0.32); };
  B.f_shelf_tall = (g, d) => { const w = 1.4, h = 2.7; box(g, w, h, 0.04, '#5A3520', 0, h / 2, -0.18); for (const sx of [-1, 1]) box(g, 0.05, h, 0.4, '#6B4128', sx * (w / 2 - 0.025), h / 2, 0); for (let i = 0; i < 7; i++) box(g, w - 0.04, 0.03, 0.38, '#6B4128', 0, 0.05 + i * 0.43, 0); for (let i = 0; i < 6; i++) books(g, 0, 0.065 + i * 0.43, 0.02, w - 0.14, (d.seed || 3) * 7 + i, 0.26, 0.33); box(g, w, 0.08, 0.44, '#4A2B18', 0, h, 0); };
  B.f_dresser = (g) => { rbox(g, 1.0, 0.8, 0.48, 0.02, '#F2E6D3', 0, 0.46, 0); for (let i = 0; i < 3; i++) { box(g, 0.92, 0.22, 0.01, '#E9DCC8', 0, 0.22 + i * 0.25, 0.245); sph(g, 0.02, metal('#C5A572'), -0.2, 0.22 + i * 0.25, 0.26, 8, 6); sph(g, 0.02, metal('#C5A572'), 0.2, 0.22 + i * 0.25, 0.26, 8, 6); } legs4(g, 1.0, 0.48, 0.06, 0.02, WOOD_D); cyl(g, 0.08, 0.06, 0.18, '#3E7CB1', 0.3, 0.95, 0); sph(g, 0.06, '#7FB069', 0.3, 1.08, 0); };
  B.f_lamp_floor = (g) => { cyl(g, 0.16, 0.18, 0.03, METAL, 0, 0.015, 0); cyl(g, 0.015, 0.015, 1.5, metal('#C5A572'), 0, 0.77, 0, 8); const sh = cyl(g, 0.14, 0.24, 0.3, mat('#F2E6D3', { emissive: '#FFD9A0', ei: 0.6, double: true }), 0, 1.6, 0, 20); sh.castShadow = false; g.userData.lightAt = [0, 1.5, 0]; };
  B.f_lava = (g) => { cone(g, 0.12, 0.18, metal('#8E6CC1'), 0, 0.09, 0).rotation.x = Math.PI; const gl = lathe(g, [[0, 0], [0.08, 0], [0.11, 0.2], [0.07, 0.45], [0, 0.45]], mat('#FF6FB5', { emissive: '#FF4FA0', ei: 0.7, opacity: 0.75 }), 0, 0.18, 0); gl.castShadow = false; cone(g, 0.075, 0.1, metal('#8E6CC1'), 0, 0.68, 0); const blobs = []; for (let i = 0; i < 4; i++) blobs.push(sph(g, 0.03 + i * 0.006, glow('#FFD24F', 1.2), 0, 0.25 + i * 0.08, 0, 10, 8)); g.userData.update = (t) => blobs.forEach((b, i) => { b.position.y = 0.25 + ((t * 0.08 + i * 0.27) % 1) * 0.36; b.position.x = Math.sin(t + i) * 0.02; }); g.userData.lightAt = [0, 0.4, 0]; g.userData.lightColor = '#FF5FB0'; };
  function pot(g, r, h, c = '#C46A45') { lathe(g, [[0, 0], [r * 0.75, 0], [r, h], [r * 1.05, h], [r * 1.05, h + 0.03], [0, h + 0.03]], c); cyl(g, r * 0.95, r * 0.95, 0.02, '#4A3426', 0, h, 0, 16); }
  B.f_cactus = (g) => { pot(g, 0.12, 0.18); PW.capsule(g, 0.07, 0.4, '#4F8A4C', 0, 0.58, 0); const a = PW.capsule(g, 0.04, 0.16, '#4F8A4C', 0.08, 0.45, 0); a.rotation.z = -0.4; const b = PW.capsule(g, 0.035, 0.12, '#4F8A4C', -0.08, 0.38, 0); b.rotation.z = 0.5; sph(g, 0.025, '#F28AB0', 0, 0.6, 0, 8, 6); };
  B.f_monstera = (g) => { pot(g, 0.2, 0.32, '#E9E1D3'); const r = U.seeded(42); for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + r(); const len = 0.35 + r() * 0.25; const stem = cyl(g, 0.008, 0.01, len, '#4A7A3A', Math.cos(a) * 0.08, 0.34 + len / 2, Math.sin(a) * 0.08, 6); stem.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); const leaf = sph(g, 0.15, mat('#2F7D4B', { rough: 0.6 }), Math.cos(a) * (0.08 + len * 0.5), 0.34 + len * 0.85, Math.sin(a) * (0.08 + len * 0.5), 12, 8); leaf.scale.set(1, 0.12, 0.75); leaf.rotation.set(Math.sin(a) * 0.6, -a, -Math.cos(a) * 0.6); } };
  B.f_bonsai = (g) => { rbox(g, 0.42, 0.1, 0.28, 0.02, '#2F4A6E', 0, 0.12, 0); box(g, 0.4, 0.03, 0.26, '#6B5A45', 0, 0.17, 0); const t1 = cyl(g, 0.03, 0.045, 0.25, '#6B4630', 0, 0.3, 0, 8); t1.rotation.z = 0.3; const t2 = cyl(g, 0.025, 0.03, 0.22, '#6B4630', -0.07, 0.48, 0, 8); t2.rotation.z = -0.6; [[0.08, 0.55, 0, 0.13], [-0.16, 0.6, 0.02, 0.11], [0, 0.68, -0.03, 0.1], [-0.05, 0.5, 0.08, 0.08]].forEach(([x, y, z, r]) => { sph(g, r, mat('#4C8C4A', { flat: true }), x, y, z, 8, 6).scale.y = 0.6; }); };
  B.f_olive = (g) => { pot(g, 0.22, 0.4, '#B65B3E'); cyl(g, 0.035, 0.05, 0.8, '#7A6250', 0, 0.8, 0, 8); const r = U.seeded(9); for (let i = 0; i < 9; i++) sph(g, 0.16 + r() * 0.08, mat('#8FA672', { flat: true }), (r() - 0.5) * 0.45, 1.2 + r() * 0.35, (r() - 0.5) * 0.45, 8, 6); };
  function rug(g, w, d, kind, round) { const t = rugTex(kind); const m = new THREE.MeshStandardMaterial({ map: t, roughness: 1 }); const geo = round ? new THREE.CylinderGeometry(w / 2, w / 2, 0.02, 48) : new THREE.BoxGeometry(w, 0.02, d); const mesh = new THREE.Mesh(geo, round ? [new THREE.MeshStandardMaterial({ color: '#C7A882' }), m, m] : m); mesh.position.y = 0.011; mesh.receiveShadow = true; g.add(mesh); }
  B.f_rug_round = (g) => rug(g, 1.8, 1.8, 'round', true);
  B.f_rug_rect = (g) => rug(g, 2.4, 1.6, 'rect');
  B.f_rug_kilim = (g) => rug(g, 2.6, 1.7, 'kilim');
  B.f_globe = (g) => { cyl(g, 0.12, 0.15, 0.04, WOOD_D, 0, 0.02, 0); cyl(g, 0.015, 0.015, 0.75, WOOD_D, 0, 0.4, 0, 8); const tex = PW.canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#3E7CB1'; c.fillRect(0, 0, w, h); c.fillStyle = '#7FB069'; [[40, 40, 26, 18], [60, 80, 12, 24], [120, 36, 30, 16], [135, 70, 16, 22], [200, 90, 18, 12], [180, 40, 26, 14]].forEach(([x, y, a, b]) => { c.beginPath(); c.ellipse(x, y, a, b, 0.4, 0, 7); c.fill(); }); }); const s = sph(g, 0.2, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), 0, 0.92, 0, 28, 18); tor(g, 0.23, 0.008, metal('#C5A572'), 0, 0.92, 0).rotation.y = Math.PI / 2; s.rotation.z = 0.4; g.userData.update = (t) => (s.rotation.y = t * 0.3); };
  B.f_plane_model = (g) => { cyl(g, 0.14, 0.16, 0.04, '#2A2B33', 0, 0.02, 0); const st = cyl(g, 0.012, 0.012, 0.6, metal('#9AA0AA'), 0, 0.32, 0, 8); st.rotation.z = 0.15; const p = new THREE.Group(); p.position.set(0.04, 0.68, 0); p.rotation.set(0, 0.5, 0.12); g.add(p); const f = PW.capsule(p, 0.045, 0.6, '#F6F4EF', 0, 0.3, 0); f.rotation.z = Math.PI / 2; f.position.set(0.3, 0, 0); box(p, 0.18, 0.012, 0.62, '#F6F4EF', 0.02, -0.01, 0); box(p, 0.08, 0.01, 0.22, '#F6F4EF', -0.24, 0.0, 0); const fin = box(p, 0.1, 0.12, 0.01, '#C7432F', -0.25, 0.07, 0); fin.rotation.z = 0.3; box(p, 0.5, 0.012, 0.092, '#22406E', 0.02, 0.0, 0).position.z = 0; for (const sz of [-1, 1]) cyl(p, 0.025, 0.025, 0.1, '#9AA0AA', 0.06, -0.045, sz * 0.15, 10).rotation.z = Math.PI / 2; g.userData.update = (t) => (p.position.y = 0.68 + Math.sin(t * 1.2) * 0.01); };
  B.f_telescope = (g) => { for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const l = cyl(g, 0.012, 0.012, 1.0, '#2A2B33', Math.cos(a) * 0.15, 0.48, Math.sin(a) * 0.15, 6); l.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3); } const t = cyl(g, 0.06, 0.08, 0.8, '#F6F4EF', 0, 1.05, 0.05, 16); t.rotation.x = -1.0; cyl(g, 0.085, 0.085, 0.06, '#2A2B33', 0, 1.28, 0.38, 16).rotation.x = -1.0; };
  B.f_aquarium = (g) => { box(g, 1.2, 0.7, 0.5, '#2A2B33', 0, 0.35, 0); const gl = box(g, 1.18, 0.55, 0.48, mat('#9FD8F0', { opacity: 0.35, rough: 0.1 }), 0, 0.98, 0); gl.castShadow = false; const w = box(g, 1.14, 0.45, 0.44, mat('#3FA9D6', { opacity: 0.4, emissive: '#1F6FA0', ei: 0.4 }), 0, 0.94, 0); w.castShadow = false; box(g, 1.14, 0.05, 0.44, '#E9D8A6', 0, 0.74, 0); for (let i = 0; i < 5; i++) { const s = cyl(g, 0.01, 0.015, 0.25 + Math.random() * 0.15, '#2F9A5B', -0.45 + i * 0.22, 0.85, -0.1 + (i % 2) * 0.15, 6); s.rotation.z = Math.sin(i) * 0.2; } const fish = []; ['#F2994A', '#F2C14E', '#E58BB0', '#9DB7FF'].forEach((c, i) => { const f = new THREE.Group(); const b = sph(f, 0.04, glow(c, 0.4), 0, 0, 0, 10, 8); b.scale.set(1.5, 1, 0.6); cone(f, 0.03, 0.05, c, -0.07, 0, 0, 6).rotation.z = Math.PI / 2; g.add(f); fish.push(f); }); box(g, 1.2, 0.04, 0.5, '#2A2B33', 0, 1.27, 0); g.userData.update = (t) => fish.forEach((f, i) => { const a = t * (0.4 + i * 0.1) + i * 2; f.position.set(Math.sin(a) * 0.45, 0.9 + Math.sin(a * 1.7) * 0.1, Math.cos(a * 0.7) * 0.12); f.rotation.y = Math.cos(a) > 0 ? 0 : Math.PI; }); g.userData.lightAt = [0, 1.1, 0.3]; g.userData.lightColor = '#6FD0FF'; };
  B.f_rocket = (g) => { cyl(g, 0.18, 0.2, 0.05, '#2A2B33', 0, 0.025, 0); cyl(g, 0.012, 0.012, 0.2, metal('#9AA0AA'), 0, 0.15, 0, 6); const r = new THREE.Group(); r.position.y = 0.25; g.add(r); cyl(r, 0.08, 0.08, 0.5, '#F6F4EF', 0, 0.35, 0); cone(r, 0.08, 0.2, '#C7432F', 0, 0.7, 0); cyl(r, 0.081, 0.081, 0.06, '#C7432F', 0, 0.2, 0); sph(r, 0.03, glow('#9DB7FF', 0.6), 0, 0.45, 0.075, 10, 8); for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const fin = box(r, 0.01, 0.16, 0.1, '#22406E', Math.cos(a) * 0.09, 0.15, Math.sin(a) * 0.09); fin.rotation.y = -a + Math.PI / 2; } };
  B.f_trophy = (g) => { box(g, 0.24, 0.1, 0.24, '#2A2B33', 0, 0.05, 0); box(g, 0.18, 0.12, 0.18, '#3A3D44', 0, 0.16, 0); cyl(g, 0.02, 0.05, 0.12, metal('#E9C04F'), 0, 0.28, 0); lathe(g, [[0, 0], [0.04, 0], [0.13, 0.18], [0.14, 0.24], [0.12, 0.24], [0, 0.06]], mat('#E9C04F', { metal: 0.85, rough: 0.25, double: true }), 0, 0.33, 0); for (const sx of [-1, 1]) tor(g, 0.05, 0.01, mat('#E9C04F', { metal: 0.85, rough: 0.25 }), sx * 0.14, 0.47, 0, Math.PI).rotation.z = sx * Math.PI / 2; };
  B.f_fireplace = (g) => { box(g, 1.4, 1.1, 0.5, '#A39A8F', 0, 0.55, 0); box(g, 1.55, 0.08, 0.6, '#8A8076', 0, 1.14, 0.02); box(g, 0.8, 0.6, 0.3, '#2A2422', 0, 0.38, 0.11); const fl = []; for (let i = 0; i < 4; i++) fl.push(cone(g, 0.07 + (i % 2) * 0.03, 0.3, glow(i % 2 ? '#FFB347' : '#FF6A2B', 2), -0.2 + i * 0.13, 0.25, 0.15, 8)); for (const sx of [-1, 1]) { const l = cyl(g, 0.035, 0.035, 0.45, '#5A3520', sx * 0.08, 0.12, 0.15, 8); l.rotation.z = Math.PI / 2 + sx * 0.3; } g.userData.update = (t) => fl.forEach((f, i) => { f.scale.y = 0.8 + Math.sin(t * 9 + i * 2) * 0.25 + Math.sin(t * 13 + i) * 0.1; }); g.userData.lightAt = [0, 0.5, 0.5]; g.userData.lightColor = '#FF9A4A'; g.userData.lightPower = 1.6; };
  B.f_guitar = (g) => { const gt = new THREE.Group(); gt.position.set(0, 0.05, 0); gt.rotation.x = -0.25; g.add(gt); const b1 = sph(gt, 0.17, '#C27A3A', 0, 0.22, 0, 20, 12); b1.scale.z = 0.3; const b2 = sph(gt, 0.13, '#C27A3A', 0, 0.45, 0, 20, 12); b2.scale.z = 0.3; cyl(gt, 0.05, 0.05, 0.01, '#2A1A10', 0, 0.36, 0.05, 16).rotation.x = Math.PI / 2; box(gt, 0.05, 0.5, 0.025, '#4A2E19', 0, 0.78, 0.02); box(gt, 0.08, 0.13, 0.03, '#2A1A10', 0, 1.08, 0.02); box(g, 0.3, 0.03, 0.3, METAL, 0, 0.015, 0.05); };
  B.f_record = (g) => { box(g, 0.6, 0.55, 0.45, WOOD, 0, 0.275, 0); for (let i = 0; i < 2; i++) books(g, 0, 0.04 + i * 0.25, 0.02, 0.5, 33 + i, 0.3, 0.2); box(g, 0.5, 0.08, 0.38, '#2A2B33', 0, 0.6, 0); const d = cyl(g, 0.15, 0.15, 0.01, '#111', -0.04, 0.65, 0, 28); cyl(g, 0.05, 0.05, 0.012, '#C7432F', -0.04, 0.652, 0, 16); const arm = box(g, 0.02, 0.01, 0.2, metal('#C9CED6'), 0.17, 0.67, 0.02); arm.rotation.y = 0.4; g.userData.update = (t) => (d.rotation.y = t * 3); };
  B.f_piano = (g) => { box(g, 1.4, 0.12, 0.35, '#1C1D22', 0, 0.72, 0); for (const sx of [-1, 1]) { const l = box(g, 0.05, 0.7, 0.05, METAL, sx * 0.55, 0.35, 0); l.rotation.x = 0; } box(g, 1.2, 0.05, 0.05, METAL, 0, 0.12, 0); for (let i = 0; i < 26; i++) box(g, 0.045, 0.02, 0.14, '#F6F4EF', -0.6 + i * 0.048, 0.79, 0.09); for (let i = 0; i < 26; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) box(g, 0.026, 0.025, 0.08, '#111', -0.576 + i * 0.048, 0.805, 0.06); box(g, 0.3, 0.2, 0.01, '#F6F4EF', 0, 0.9, -0.12).rotation.x = -0.2; };
  B.f_coffee = (g) => { box(g, 0.8, 0.85, 0.5, '#E9E1D3', 0, 0.425, 0); box(g, 0.82, 0.04, 0.52, WOOD, 0, 0.87, 0); box(g, 0.28, 0.36, 0.26, '#2A2B33', -0.15, 1.07, -0.04); box(g, 0.22, 0.04, 0.12, metal('#9AA0AA'), -0.15, 0.95, 0.1); sph(g, 0.012, glow('#5DE0B5'), -0.05, 1.18, 0.09, 6, 4); for (let i = 0; i < 3; i++) { cyl(g, 0.035, 0.03, 0.08, ['#F6F4EF', '#C7432F', '#3E7CB1'][i], 0.12 + i * 0.09, 0.93, 0.1, 12); } box(g, 0.01, 0.4, 0.01, METAL, 0.2, 0.42, 0.255); };
  B.f_fridge = (g) => { rbox(g, 0.6, 0.85, 0.6, 0.06, '#9FD8C8', 0, 0.43, 0); box(g, 0.55, 0.01, 0.01, '#7FB8A8', 0, 0.62, 0.3); box(g, 0.03, 0.18, 0.04, metal('#C9CED6'), 0.22, 0.5, 0.31); box(g, 0.08, 0.08, 0.005, '#F2C14E', -0.12, 0.72, 0.302); box(g, 0.07, 0.09, 0.005, '#E58BB0', 0.02, 0.4, 0.302); };
  // tabletop
  B.d_laptop = (g) => { rbox(g, 0.34, 0.015, 0.24, 0.005, '#C9CED6', 0, 0.008, 0); box(g, 0.28, 0.002, 0.11, '#3A3D44', 0, 0.016, 0.02); const s = new THREE.Group(); s.position.set(0, 0.012, -0.115); s.rotation.x = -0.25; g.add(s); rbox(s, 0.34, 0.22, 0.01, 0.005, '#C9CED6', 0, 0.11, 0); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.19), new THREE.MeshStandardMaterial({ map: screenTex('code'), emissive: '#FFFFFF', emissiveMap: screenTex('code'), emissiveIntensity: 0.7 })); scr.position.set(0, 0.11, 0.006); s.add(scr); };
  B.d_lamp = (g) => { cyl(g, 0.07, 0.08, 0.02, '#2A2B33', 0, 0.01, 0); const a1 = cyl(g, 0.01, 0.01, 0.28, '#2A2B33', 0.03, 0.15, 0, 6); a1.rotation.z = -0.25; const a2 = cyl(g, 0.01, 0.01, 0.22, '#2A2B33', 0.0, 0.34, 0.06, 6); a2.rotation.x = 0.9; const h = cone(g, 0.07, 0.12, mat('#F2C14E', { double: true }), 0, 0.38, 0.15, 16); h.rotation.x = 2.4; sph(g, 0.03, glow('#FFF1C9', 2), 0, 0.35, 0.18, 8, 6); g.userData.lightAt = [0, 0.3, 0.2]; g.userData.lightPower = 0.7; };
  B.d_books = (g) => { const cols = ['#C7432F', '#22406E', '#F2C14E', '#2F7D5B']; for (let i = 0; i < 4; i++) { const b = box(g, 0.26 - i * 0.02, 0.04, 0.19 - i * 0.01, cols[i], 0, 0.02 + i * 0.041, 0); b.rotation.y = (i % 2 ? 0.15 : -0.1); } };
  B.d_plant = (g) => { cyl(g, 0.05, 0.04, 0.07, '#E9E1D3', 0, 0.035, 0, 12); for (let i = 0; i < 5; i++) { const s = sph(g, 0.04, '#4C8C4A', Math.cos(i) * 0.03, 0.1 + i * 0.012, Math.sin(i) * 0.03, 8, 6); s.scale.y = 1.4; } };
  B.d_mug = (g) => { cyl(g, 0.04, 0.035, 0.09, '#F6F4EF', 0, 0.045, 0, 14); cyl(g, 0.036, 0.036, 0.005, '#5A3520', 0, 0.086, 0, 14); tor(g, 0.025, 0.007, '#F6F4EF', 0.045, 0.05, 0).rotation.y = 0; };
  B.d_monitor = (g) => { for (const sx of [-1, 1]) { const m = new THREE.Group(); m.position.set(sx * 0.24, 0, 0); m.rotation.y = -sx * 0.25; g.add(m); box(m, 0.15, 0.01, 0.12, '#2A2B33', 0, 0.005, 0); box(m, 0.03, 0.2, 0.02, '#2A2B33', 0, 0.1, -0.02); rbox(m, 0.46, 0.28, 0.025, 0.008, '#1C1D22', 0, 0.32, 0); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.43, 0.25), new THREE.MeshStandardMaterial({ map: screenTex(sx < 0 ? 'code' : 'art'), emissive: '#FFFFFF', emissiveMap: screenTex(sx < 0 ? 'code' : 'art'), emissiveIntensity: 0.75 })); scr.position.set(0, 0.32, 0.014); m.add(scr); } box(g, 0.42, 0.015, 0.13, '#2A2B33', 0, 0.008, 0.25); };
  B.d_tomato = (g) => { const t = sph(g, 0.065, mat('#D9412E', { rough: 0.35 }), 0, 0.06, 0, 18, 12); t.scale.y = 0.85; for (let i = 0; i < 5; i++) { const l = cone(g, 0.015, 0.04, '#3F8A3A', Math.cos(i * 1.26) * 0.02, 0.115, Math.sin(i * 1.26) * 0.02, 5); l.rotation.set(Math.sin(i * 1.26) * 1.2, 0, -Math.cos(i * 1.26) * 1.2); } cyl(g, 0.006, 0.006, 0.03, '#3F8A3A', 0, 0.13, 0, 5); };
  // pets
  function pet(g, kind) {
    const c = kind === 'cat' ? '#A5764A' : '#D9A55B', c2 = kind === 'cat' ? '#5E3F25' : '#F2D29B';
    const s = kind === 'cat' ? 1 : 1.35;
    const root = new THREE.Group(); root.scale.setScalar(s); g.add(root);
    const body = PW.capsule(root, 0.09, 0.34, c, 0, 0.13, 0.17); body.rotation.x = Math.PI / 2;
    const head = new THREE.Group(); head.position.set(0, 0.22, 0.2); root.add(head);
    sph(head, 0.09, c, 0, 0, 0, 16, 12);
    if (kind === 'cat') { for (const sx of [-1, 1]) cone(head, 0.035, 0.07, c, sx * 0.05, 0.08, 0, 4); for (let i = 0; i < 3; i++) box(head, 0.06, 0.006, 0.006, c2, 0, 0.06 - i * 0.008, -0.002).position.set(0, 0.035 - i * 0.012 + 0.04, 0.06); }
    else { for (const sx of [-1, 1]) { const e = sph(head, 0.045, c2, sx * 0.08, 0.0, -0.01, 10, 8); e.scale.set(0.5, 1.2, 0.8); } const sn = sph(head, 0.05, c2, 0, -0.025, 0.07, 10, 8); sn.scale.z = 1.3; sph(head, 0.015, '#222', 0, -0.01, 0.13, 6, 4); }
    for (const sx of [-1, 1]) sph(head, 0.014, '#1A1A1A', sx * 0.035, 0.02, 0.078, 8, 6);
    for (const sx of [-1, 1]) for (const sz of [0, 1]) PW.capsule(root, 0.025, 0.11, c, sx * 0.05, 0.11, sz ? 0.28 : 0.05);
    const tail = new THREE.Group(); tail.position.set(0, 0.15, 0.0); root.add(tail);
    const tl = PW.capsule(tail, 0.022, kind === 'cat' ? 0.25 : 0.15, c); tl.rotation.x = -2.4;
    if (kind === 'cat') for (let i = 0; i < 3; i++) { const st = box(root, 0.181, 0.02, 0.03, c2, 0, 0.21, 0.08 + i * 0.07); st.scale.y = 0.6; }
    g.userData.update = (t) => { tail.rotation.z = Math.sin(t * (kind === 'cat' ? 2 : 6)) * 0.5; head.rotation.y = Math.sin(t * 0.4) * 0.4; body.scale.x = 1 + Math.sin(t * 2) * 0.02; };
  }
  B.f_cat = (g) => pet(g, 'cat');
  B.f_dog = (g) => pet(g, 'dog');
  // wall items (origin on wall surface, +z out of wall, y=0 at floor; positioned at def.wy)
  function framed(g, w, h, tex, frame = '#2A2B33') { box(g, w + 0.06, h + 0.06, 0.03, frame, 0, 0, 0.015); const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 })); p.position.z = 0.032; g.add(p); }
  B.w_clock = (g) => { const f = cyl(g, 0.24, 0.24, 0.05, '#2A2B33', 0, 0, 0.025, 32); f.rotation.x = Math.PI / 2; const fc = cyl(g, 0.21, 0.21, 0.01, '#F6F4EF', 0, 0, 0.05, 32); fc.rotation.x = Math.PI / 2; for (let i = 0; i < 12; i++) box(g, 0.012, i % 3 ? 0.025 : 0.045, 0.005, '#2A2B33', Math.sin(i * Math.PI / 6) * 0.18, Math.cos(i * Math.PI / 6) * 0.18, 0.057).rotation.z = -i * Math.PI / 6; const hh = new THREE.Group(), mm = new THREE.Group(), ss = new THREE.Group(); [hh, mm, ss].forEach((x) => { x.position.z = 0.06; g.add(x); }); box(hh, 0.018, 0.1, 0.005, '#2A2B33', 0, 0.05, 0); box(mm, 0.012, 0.16, 0.005, '#2A2B33', 0, 0.08, 0.004); box(ss, 0.005, 0.17, 0.005, '#C7432F', 0, 0.07, 0.008); g.userData.update = () => { const d = new Date(); const s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60; ss.rotation.z = -s / 60 * Math.PI * 2; mm.rotation.z = -m / 60 * Math.PI * 2; hh.rotation.z = -h / 12 * Math.PI * 2; }; };
  B.w_poster_space = (g) => framed(g, 0.6, 0.85, posterTex('space'));
  B.w_poster_plane = (g) => framed(g, 0.6, 0.85, posterTex('plane'), '#F6F4EF');
  B.w_painting = (g) => framed(g, 0.9, 0.7, posterTex('painting'), '#C9A35A');
  B.w_worldmap = (g) => framed(g, 1.3, 0.8, posterTex('map'), WOOD_D);
  B.w_diploma = (g) => framed(g, 0.5, 0.65, posterTex('diploma'), '#5A3520');
  B.w_whiteboard = (g) => framed(g, 1.3, 0.85, posterTex('board'), '#C9CED6');
  B.w_shelf = (g, d) => { box(g, 1.0, 0.04, 0.25, WOOD, 0, 0, 0.125); for (const sx of [-1, 1]) box(g, 0.03, 0.12, 0.2, METAL, sx * 0.35, -0.07, 0.1); books(g, -0.2, 0.02, 0.12, 0.4, d.seed || 5, 0.16, 0.24); cyl(g, 0.06, 0.05, 0.1, '#E9E1D3', 0.25, 0.07, 0.12, 12); sph(g, 0.07, '#4C8C4A', 0.25, 0.16, 0.12, 10, 8); };
  B.w_fairy = (g) => { const n = 16; for (let i = 0; i < n; i++) { const u = i / (n - 1), x = -1 + u * 2, y = -Math.sin(u * Math.PI) * 0.18; sph(g, 0.025, glow(['#FFD58A', '#FFB0C8', '#BDE4FF'][i % 3], 2.2), x, y - 0.03, 0.05, 8, 6).castShadow = false; } const curve = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => new THREE.Vector3(-1 + i * 0.25, -Math.sin((i / 8) * Math.PI) * 0.18, 0.04))); const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.004, 4), mat('#3A3D44')); g.add(tube); g.userData.lightAt = [0, -0.2, 0.3]; g.userData.lightPower = 0.5; g.userData.lightColor = '#FFC98A'; };
  B.w_neon = (g) => { box(g, 1.2, 0.5, 0.02, mat('#1C1D22', { opacity: 0.6 }), 0, 0, 0.01); const tex = PW.canvasTex(512, 200, (c, w, h) => { c.clearRect(0, 0, w, h); c.font = 'bold 130px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#FF4FA0'; c.shadowBlur = 30; c.fillStyle = '#FFD1EA'; c.fillText('ODAK', w / 2, h / 2 + 6); }); const p = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.45), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); p.position.z = 0.03; g.add(p); g.userData.lightAt = [0, 0, 0.4]; g.userData.lightColor = '#FF4FA0'; g.userData.lightPower = 0.8; g.userData.update = (t) => (p.material.opacity = 0.85 + Math.sin(t * 7) * 0.05 + (Math.sin(t * 23) > 0.97 ? -0.4 : 0)); };
  // game console corner (user 2026-11-03): low TV unit, a TV showing the Pomo Canavarları game, a console and two pads
  B.f_console = (g) => {
    rbox(g, 1.5, 0.42, 0.5, 0.03, '#2B2838', 0, 0.21, 0); box(g, 1.42, 0.02, 0.46, '#3A3550', 0, 0.43, 0);
    for (const sx of [-1, 1]) box(g, 0.62, 0.3, 0.02, '#35304A', sx * 0.36, 0.2, 0.251);
    cyl(g, 0.012, 0.012, 0.02, glow('#FF8466', 2), 0.62, 0.36, 0.255, 8).rotation.x = Math.PI / 2;
    box(g, 0.32, 0.03, 0.2, '#1C1D22', 0, 0.455, -0.08); box(g, 0.05, 0.22, 0.04, '#1C1D22', 0, 0.56, -0.12);
    rbox(g, 1.2, 0.7, 0.05, 0.012, '#111', 0, 1.02, -0.12);
    const tex = PW.canvasTex(256, 150, (c, w, h) => {
      const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#A8DCFF'); sky.addColorStop(0.5, '#D9F1FF'); sky.addColorStop(0.5, '#8FD27C'); sky.addColorStop(1, '#6FBF63');
      c.fillStyle = sky; c.fillRect(0, 0, w, h);
      const mon = (x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.fillStyle = '#1D1A2B'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.1, r * 0.13, 0, 7); c.arc(x + r * 0.3, y - r * 0.1, r * 0.13, 0, 7); c.fill(); };
      mon(190, 58, 20, '#A39A8C'); mon(70, 108, 26, '#FF7A45');
      c.fillStyle = '#FFFDF5'; c.fillRect(10, 10, 92, 22); c.fillRect(150, 112, 96, 22);
      c.fillStyle = '#3FBF6A'; c.fillRect(16, 24, 70, 4); c.fillRect(156, 126, 56, 4);
      c.fillStyle = '#1D1A2B'; c.font = 'bold 10px sans-serif'; c.fillText('Kayacık', 16, 21); c.fillText('Kıvılcık', 156, 123);
    });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 0.64), new THREE.MeshStandardMaterial({ map: tex, emissive: '#FFFFFF', emissiveMap: tex, emissiveIntensity: 0.75 }));
    scr.position.set(0, 1.02, -0.094); g.add(scr);
    // the console: a slim box with a coral light strip, standing beside the TV
    rbox(g, 0.1, 0.36, 0.3, 0.02, '#ECEAF2', 0.6, 0.62, -0.06); box(g, 0.004, 0.3, 0.012, glow('#FF8466', 1.6), 0.548, 0.62, 0.09);
    // two game pads
    for (const [x, col] of [[-0.3, '#2E2A40'], [0.18, '#6D4CC2']]) {
      const pad = new THREE.Group(); pad.position.set(x, 0.455, 0.12); pad.rotation.y = x < 0 ? 0.3 : -0.25; g.add(pad);
      rbox(pad, 0.16, 0.035, 0.09, 0.02, col, 0, 0.018, 0);
      for (const sx of [-1, 1]) cyl(pad, 0.03, 0.03, 0.035, col, sx * 0.07, 0.018, 0.025, 10);
      cyl(pad, 0.012, 0.012, 0.02, '#1C1D22', -0.035, 0.04, 0, 8); for (const [bx, bc] of [[0.04, '#FF8466'], [0.06, '#4FA8E8']]) sph(pad, 0.008, bc, bx, 0.04, 0);
    }
  };
  /* ---------- personal wall pieces (user 2026-11-03) ---------- */
  // the player's own words in neon: the tube colour is d.c, the words are d.t
  B.w_neon_text = (g, d = {}) => {
    const col = d.c || '#FF4FA0', text = (d.t || 'Odaklan').slice(0, 18);
    const tex = PW.canvasTex(512, 128, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      const f = (n) => `800 ${n}px "Sora", "Trebuchet MS", sans-serif`;
      let fs = 70; c.font = f(fs);
      while (c.measureText(text).width > w - 48 && fs > 24) { fs -= 4; c.font = f(fs); }
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = col; c.shadowBlur = 26; c.fillStyle = col; c.fillText(text, w / 2, h / 2 + 4);
      c.shadowBlur = 8; c.fillStyle = '#FFFFFF'; c.globalAlpha = 0.85; c.fillText(text, w / 2, h / 2 + 4);
    });
    tex.premultiplyAlpha = false;
    const m = new THREE.MeshStandardMaterial({ map: tex, emissive: col, emissiveMap: tex, emissiveIntensity: 1.6, transparent: true, depthWrite: false });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), m); p.position.z = 0.032; g.add(p);
    // a dark acrylic board behind the tubes, so the glow reads on a light wall too
    rbox(g, 1.46, 0.42, 0.02, 0.04, mat('#17141F', { rough: 0.25 }), 0, 0, 0.012);
    for (const sx of [-1, 1]) cyl(g, 0.012, 0.012, 0.03, metal('#C9C2B4'), sx * 0.66, 0.16, 0.03, 8).rotation.x = Math.PI / 2;
    g.userData.lightAt = [0, 0, 0.4]; g.userData.lightColor = col; g.userData.lightPower = 0.6;
  };
  // a poster: pick one of eight designs (d.v)
  const POSTERS = [
    (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#FF9A62'); gr.addColorStop(1, '#6A3FA0'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#FFE08A'; c.beginPath(); c.arc(w / 2, h * 0.52, w * 0.26, Math.PI, 0); c.fill(); c.fillStyle = '#3A2063'; for (let i = 0; i < 5; i++) c.fillRect(0, h * 0.54 + i * 14, w, 6); },
    (c, w, h) => { c.fillStyle = '#0E1530'; c.fillRect(0, 0, w, h); c.fillStyle = '#FFF'; for (let i = 0; i < 60; i++) c.fillRect((i * 37) % w, (i * 61) % h, 2, 2); c.fillStyle = '#E8B04A'; c.beginPath(); c.arc(w * 0.62, h * 0.38, 36, 0, 7); c.fill(); c.strokeStyle = '#F6D58A'; c.lineWidth = 5; c.beginPath(); c.ellipse(w * 0.62, h * 0.38, 62, 14, -0.3, 0, 7); c.stroke(); },
    (c, w, h) => { c.fillStyle = '#DCEFF5'; c.fillRect(0, 0, w, h); c.fillStyle = '#7FA7B8'; c.beginPath(); c.moveTo(0, h * 0.75); c.lineTo(w * 0.35, h * 0.3); c.lineTo(w * 0.6, h * 0.62); c.lineTo(w * 0.8, h * 0.42); c.lineTo(w, h * 0.7); c.lineTo(w, h); c.lineTo(0, h); c.fill(); c.fillStyle = '#FFF'; c.beginPath(); c.moveTo(w * 0.28, h * 0.39); c.lineTo(w * 0.35, h * 0.3); c.lineTo(w * 0.42, h * 0.39); c.fill(); c.fillStyle = '#3F6E5A'; c.fillRect(0, h * 0.86, w, h * 0.14); },
    (c, w, h) => { c.fillStyle = '#F4E9D8'; c.fillRect(0, 0, w, h); const cols = ['#E8553D', '#F2C14E', '#3E7CB1', '#2F7D5B']; for (let i = 0; i < 4; i++) { c.fillStyle = cols[i]; c.beginPath(); c.arc(w * (0.3 + (i % 2) * 0.4), h * (0.3 + Math.floor(i / 2) * 0.4), w * 0.17, 0, 7); c.fill(); } },
    (c, w, h) => { c.fillStyle = '#1F8A8A'; c.fillRect(0, 0, w, h); c.strokeStyle = '#BFF1EA'; c.lineWidth = 6; for (let i = 0; i < 7; i++) { c.beginPath(); for (let x = 0; x <= w; x += 8) c.lineTo(x, h * 0.2 + i * 26 + Math.sin(x / 18 + i) * 8); c.stroke(); } },
    (c, w, h) => { c.fillStyle = '#FCE7EF'; c.fillRect(0, 0, w, h); c.fillStyle = '#2A2440'; c.beginPath(); c.ellipse(w / 2, h * 0.6, 54, 46, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(w / 2 - 46, h * 0.5); c.lineTo(w / 2 - 34, h * 0.3); c.lineTo(w / 2 - 14, h * 0.45); c.fill(); c.beginPath(); c.moveTo(w / 2 + 46, h * 0.5); c.lineTo(w / 2 + 34, h * 0.3); c.lineTo(w / 2 + 14, h * 0.45); c.fill(); c.fillStyle = '#F2C14E'; c.beginPath(); c.arc(w / 2 - 18, h * 0.58, 7, 0, 7); c.arc(w / 2 + 18, h * 0.58, 7, 0, 7); c.fill(); },
    (c, w, h) => { c.fillStyle = '#16141F'; c.fillRect(0, 0, w, h); c.fillStyle = '#FF8466'; c.font = 'bold 44px sans-serif'; c.textAlign = 'center'; c.fillText('25:00', w / 2, h * 0.45); c.fillStyle = '#F4F1EC'; c.font = 'bold 16px sans-serif'; c.fillText('ODAKLAN', w / 2, h * 0.62); c.fillText('KAZAN', w / 2, h * 0.72); },
    (c, w, h) => { const cols = ['#2F3542', '#E8553D', '#F2C14E', '#F4F1EC']; for (let y = 0; y < 6; y++) for (let x = 0; x < 4; x++) { c.fillStyle = cols[(x + y * 3) % 4]; c.fillRect(x * w / 4, y * h / 6, w / 4, h / 6); } },
  ];
  B.w_poster_art = (g, d = {}) => {
    const v = Math.max(0, Math.min(POSTERS.length - 1, d.v | 0));
    box(g, 0.62, 0.84, 0.02, '#F6F4EF', 0, 0, 0.01);
    const tex = PW.canvasTex(192, 256, POSTERS[v]);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.78), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 })); p.position.z = 0.022; g.add(p);
  };
  PW.POSTER_COUNT = POSTERS.length;
  PW.posterThumb = (v) => { const c = document.createElement('canvas'); c.width = 48; c.height = 64; const g = c.getContext('2d'); g.scale(48 / 192, 64 / 256); POSTERS[v](g, 192, 256); return c.toDataURL(); };
  /* ---------- public room atmosphere (user 2026-11-04: every place its own vibe, full of things to look at) ---------- */
  // game posters: invented games, each its own colours and pixel art (d.v)
  const pix = (c, x, y, s, rows, cols) => rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') { c.fillStyle = cols[ch]; c.fillRect(x + i * s, y + j * s, s, s); } }));
  const title = (c, w, t, y, col, size = 22) => { c.font = `900 ${size}px "Sora", "Trebuchet MS", sans-serif`; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = '#120F1C'; c.strokeText(t, w / 2, y); c.fillStyle = col; c.fillText(t, w / 2, y); };
  const GAME_POSTERS = [
    (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3B1D6E'); g.addColorStop(1, '#E8553D'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = '#2A1347'; for (let i = 0; i < 6; i++) c.fillRect(i * 34, h * 0.7 - (i % 3) * 18, 30, h); pix(c, 64, 70, 8, ['..yy..', '.yyyy.', 'yybbyy', 'yyyyyy', '.y..y.', 'y....y'], { y: '#FFD24F', b: '#120F1C' }); title(c, w, 'PİKSEL', 36, '#FFD24F'); title(c, w, 'MACERA', 214, '#FFFFFF', 26); },
    (c, w, h) => { c.fillStyle = '#070B1E'; c.fillRect(0, 0, w, h); c.fillStyle = '#FFF'; for (let i = 0; i < 70; i++) c.fillRect((i * 53) % w, (i * 97) % h, 2, 2); c.fillStyle = '#4FD8FF'; c.beginPath(); c.moveTo(w / 2, 90); c.lineTo(w / 2 + 30, 170); c.lineTo(w / 2 - 30, 170); c.fill(); c.fillStyle = '#FF8466'; c.beginPath(); c.moveTo(w / 2 - 14, 170); c.lineTo(w / 2, 200); c.lineTo(w / 2 + 14, 170); c.fill(); c.fillStyle = '#B48AFF'; c.beginPath(); c.arc(150, 60, 22, 0, 7); c.fill(); title(c, w, 'UZAY AKINI', 36, '#4FD8FF'); },
    (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#FF3FA4'); g.addColorStop(0.55, '#5B2BB5'); g.addColorStop(0.55, '#120F1C'); g.addColorStop(1, '#120F1C'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.strokeStyle = '#26E0FF'; c.lineWidth = 2; for (let i = -6; i <= 6; i++) { c.beginPath(); c.moveTo(w / 2, h * 0.55); c.lineTo(w / 2 + i * 40, h); c.stroke(); } for (let j = 0; j < 5; j++) { const y = h * 0.55 + j * j * 5 + j * 6; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } c.fillStyle = '#FFD24F'; c.beginPath(); c.arc(w / 2, h * 0.42, 34, Math.PI, 0); c.fill(); title(c, w, 'NEON YARIŞ', 40, '#FFFFFF'); },
    (c, w, h) => { c.fillStyle = '#1D2B1F'; c.fillRect(0, 0, w, h); c.fillStyle = '#2E4632'; for (let y = 0; y < h; y += 24) for (let x = (y / 24) % 2 ? 0 : 20; x < w; x += 40) c.fillRect(x, y, 36, 20); c.fillStyle = '#F2994A'; c.beginPath(); c.arc(60, 120, 10, 0, 7); c.arc(132, 120, 10, 0, 7); c.fill(); pix(c, 76, 130, 7, ['..ss..', '.ssss.', 'ss..ss', 'ssssss', 's.ss.s'], { s: '#E9E1D3' }); title(c, w, 'ZİNDAN', 40, '#F2994A', 28); },
    (c, w, h) => { c.fillStyle = '#7CC4F2'; c.fillRect(0, 0, w, h); c.fillStyle = '#6FBF63'; c.fillRect(0, h * 0.6, w, h); c.fillStyle = '#555'; c.beginPath(); c.moveTo(w * 0.3, h); c.lineTo(w * 0.45, h * 0.6); c.lineTo(w * 0.55, h * 0.6); c.lineTo(w * 0.7, h); c.fill(); for (const [x, col] of [[70, '#E8553D'], [120, '#3E7CB1']]) { c.fillStyle = col; c.fillRect(x - 18, 180, 36, 18); c.fillStyle = '#111'; c.fillRect(x - 16, 196, 8, 8); c.fillRect(x + 8, 196, 8, 8); } title(c, w, 'KART KUPASI', 40, '#FFD24F'); },
    (c, w, h) => { c.fillStyle = '#16141F'; c.fillRect(0, 0, w, h); const cols = ['#E8553D', '#F2C14E', '#6CBF6A', '#4FD8FF', '#B48AFF']; for (let i = 0; i < 5; i++) { c.fillStyle = cols[i]; c.fillRect(30 + i * 28, 200 - i * 26, 24, 26 + i * 26); } title(c, w, 'SEVİYE', 40, '#FFFFFF', 26); title(c, w, 'ATLA!', 68, '#6CBF6A', 26); },
  ];
  B.w_poster_game = (g, d = {}) => {
    const v = Math.max(0, Math.min(GAME_POSTERS.length - 1, d.v | 0));
    box(g, 0.66, 0.9, 0.025, '#111', 0, 0, 0.012);
    const tex = PW.canvasTex(192, 256, GAME_POSTERS[v]);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.82), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: '#FFFFFF', emissiveMap: tex, emissiveIntensity: 0.18 })); p.position.z = 0.027; g.add(p);
  };
  PW.GAME_POSTER_COUNT = GAME_POSTERS.length;
  const oldThumb = PW.posterThumb;
  PW.posterThumb = (v, id) => { if (id !== 'w_poster_game') return oldThumb(v); const c = document.createElement('canvas'); c.width = 48; c.height = 64; const x = c.getContext('2d'); x.scale(48 / 192, 64 / 256); GAME_POSTERS[v](x, 192, 256); return c.toDataURL(); };

  // langırt (table football): two teams on eight rods
  B.f_foosball = (g) => {
    legs4(g, 1.1, 0.62, 0.66, 0.035, '#1C1D22', 0.08);
    box(g, 1.24, 0.12, 0.74, '#C7432F', 0, 0.7, 0);
    box(g, 1.14, 0.012, 0.64, '#3FA34D', 0, 0.762, 0);
    box(g, 0.006, 0.002, 0.62, '#F6F4EF', 0, 0.769, 0); tor(g, 0.09, 0.004, '#F6F4EF', 0, 0.769, 0).rotation.x = Math.PI / 2;
    for (const sz of [-1, 1]) box(g, 1.24, 0.14, 0.05, '#A8362A', 0, 0.83, sz * 0.345);
    for (const sx of [-1, 1]) { box(g, 0.05, 0.14, 0.74, '#A8362A', sx * 0.595, 0.83, 0); box(g, 0.03, 0.06, 0.2, '#111', sx * 0.57, 0.8, 0); }
    const team = [0, 0, 1, 0, 1, 0, 1, 1], men = [1, 2, 3, 5, 5, 3, 2, 1];
    for (let i = 0; i < 8; i++) {
      const x = -0.49 + i * 0.14, t = team[i], col = t ? '#3E7CB1' : '#F2C14E';
      const rod = cyl(g, 0.009, 0.009, 1.1, metal('#C9CED6'), x, 0.85, 0, 8); rod.rotation.x = Math.PI / 2;
      const hz = t ? 0.56 : -0.56; const hd = cyl(g, 0.022, 0.022, 0.12, '#111', x, 0.85, hz, 10); hd.rotation.x = Math.PI / 2;
      for (let k = 0; k < men[i]; k++) { const z = (k - (men[i] - 1) / 2) * (0.56 / Math.max(men[i], 2)); box(g, 0.03, 0.09, 0.045, col, x, 0.81, z); sph(g, 0.018, col, x, 0.87, z, 8, 6); }
    }
    sph(g, 0.016, '#FFFFFF', 0.05, 0.785, 0.06, 10, 8);
  };
  // an arcade cabinet with a glowing screen and marquee
  B.f_arcade = (g, d = {}) => {
    const body = d.c || '#5B2BB5';
    box(g, 0.66, 0.9, 0.62, body, 0, 0.45, 0);
    box(g, 0.66, 0.8, 0.4, body, 0, 1.3, -0.11);
    const panel = box(g, 0.66, 0.06, 0.3, '#1C1D22', 0, 0.95, 0.16); panel.rotation.x = 0.25;
    sph(g, 0.03, '#E8553D', -0.15, 1.02, 0.18, 10, 8); cyl(g, 0.008, 0.008, 0.07, '#111', -0.15, 0.99, 0.18, 6);
    for (const [x, c] of [[0.05, '#4FD8FF'], [0.13, '#FFD24F'], [0.21, '#6CBF6A']]) cyl(g, 0.022, 0.022, 0.02, glow(c, 0.8), x, 0.99, 0.17, 12);
    const scr = PW.canvasTex(160, 128, (c, w, h) => { c.fillStyle = '#050713'; c.fillRect(0, 0, w, h); const cols = ['#FF3FA4', '#FFD24F', '#6CBF6A', '#4FD8FF']; for (let r = 0; r < 4; r++) for (let i = 0; i < 9; i++) { c.fillStyle = cols[r]; c.fillRect(10 + i * 16, 18 + r * 10, 12, 6); } c.fillStyle = '#F6F4EF'; c.fillRect(70, 112, 22, 5); c.beginPath(); c.arc(90, 86, 4, 0, 7); c.fill(); c.font = 'bold 10px monospace'; c.fillText('SKOR 2500', 6, 12); });
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4), new THREE.MeshStandardMaterial({ map: scr, emissive: '#FFFFFF', emissiveMap: scr, emissiveIntensity: 1.1 })); sm.position.set(0, 1.3, 0.095); sm.rotation.x = -0.12; g.add(sm);
    const mq = PW.canvasTex(256, 64, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#FF3FA4'); gr.addColorStop(1, '#26E0FF'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.font = '900 34px "Sora", sans-serif'; c.textAlign = 'center'; c.fillStyle = '#120F1C'; c.fillText(d.t || 'OYUN', w / 2, 45); });
    box(g, 0.66, 0.2, 0.36, body, 0, 1.8, -0.06);
    const mm = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.16), new THREE.MeshStandardMaterial({ map: mq, emissive: '#FFFFFF', emissiveMap: mq, emissiveIntensity: 1.2 })); mm.position.set(0, 1.8, 0.122); g.add(mm);
    for (const sx of [-1, 1]) box(g, 0.012, 1.7, 0.012, glow('#26E0FF', 2), sx * 0.334, 0.95, 0.3);
    g.userData.lightAt = [0, 1.3, 0.5]; g.userData.lightColor = '#9D7BFF'; g.userData.lightPower = 0.5;
  };
  // bilardo table
  B.f_pool = (g) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.14, 0.62, 0.14, '#4A2B18', sx * 0.9, 0.31, sz * 0.4);
    rbox(g, 2.1, 0.16, 1.1, 0.03, '#5A3520', 0, 0.7, 0);
    box(g, 1.86, 0.03, 0.86, mat('#24A866', { rough: 0.95 }), 0, 0.8, 0);
    for (const sz of [-1, 1]) box(g, 2.06, 0.07, 0.11, '#2E6B45', 0, 0.82, sz * 0.48);
    for (const sx of [-1, 1]) box(g, 0.11, 0.07, 0.86, '#2E6B45', sx * 0.98, 0.82, 0);
    for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) cyl(g, 0.045, 0.045, 0.02, '#111', sx * 0.92, 0.81, sz * 0.42, 12);
    const balls = ['#F2C14E', '#3E7CB1', '#E8553D', '#8E6CC1', '#F2994A', '#2F7D5B', '#7A2E2E', '#111', '#F2C14E', '#3E7CB1'];
    let k = 0; for (let row = 0; row < 4; row++) for (let i = 0; i <= row; i++) sph(g, 0.028, balls[k++ % balls.length], 0.35 + row * 0.05, 0.835, (i - row / 2) * 0.058, 10, 8);
    sph(g, 0.028, '#FFFFFF', -0.45, 0.835, 0.05, 10, 8);
    const cue = cyl(g, 0.008, 0.014, 1.4, '#D9B98A', -0.2, 0.86, -0.25, 8); cue.rotation.z = Math.PI / 2; cue.rotation.y = 0.15;
  };
  // dart board on a dark backing
  B.w_dart = (g) => {
    rbox(g, 0.62, 0.62, 0.03, 0.03, '#1C1D22', 0, 0, 0.015);
    const tex = PW.canvasTex(256, 256, (c, w) => {
      const m = w / 2; c.fillStyle = '#111'; c.beginPath(); c.arc(m, m, m, 0, 7); c.fill();
      for (let i = 0; i < 20; i++) { const a0 = (i - 0.5) * Math.PI / 10, a1 = (i + 0.5) * Math.PI / 10;
        for (const [r0, r1, c1, c2] of [[0.62, 0.95, '#E8553D', '#2F7D5B'], [0.1, 0.56, '#F2E6D3', '#1C1D22'], [0.56, 0.62, '#E8553D', '#2F7D5B'], [0.62, 0.9, '#F2E6D3', '#1C1D22']]) {
          c.fillStyle = i % 2 ? c1 : c2; c.beginPath(); c.arc(m, m, m * r1 * 0.85, a0, a1); c.arc(m, m, m * r0 * 0.85, a1, a0, true); c.fill(); } }
      c.fillStyle = '#2F7D5B'; c.beginPath(); c.arc(m, m, m * 0.085, 0, 7); c.fill(); c.fillStyle = '#E8553D'; c.beginPath(); c.arc(m, m, m * 0.04, 0, 7); c.fill();
    });
    const b = cyl(g, 0.24, 0.24, 0.04, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), 0, 0, 0.05, 40); b.rotation.x = Math.PI / 2; b.rotation.y = Math.PI / 2;
    for (const [x, y, c] of [[0.04, 0.06, '#FFD24F'], [-0.07, -0.02, '#4FD8FF'], [0.01, -0.09, '#FF3FA4']]) { const dt = cyl(g, 0.006, 0.003, 0.12, '#C9CED6', x, y, 0.13, 6); dt.rotation.x = Math.PI / 2; const f = box(g, 0.035, 0.002, 0.035, c, x, y, 0.19); f.rotation.z = 0.8; }
  };
  // café counter: wooden front, marble top, espresso machine, a cake under a glass dome, cups
  B.f_bar = (g) => {
    box(g, 2.2, 1.0, 0.62, '#6B4128', 0, 0.5, 0);
    for (let i = 0; i < 11; i++) box(g, 0.012, 0.86, 0.012, '#4A2B18', -1.0 + i * 0.2, 0.5, 0.315);
    box(g, 2.3, 0.05, 0.7, '#ECE7E0', 0, 1.025, 0.02);
    box(g, 0.42, 0.38, 0.34, metal('#C9CED6'), -0.65, 1.24, -0.08); box(g, 0.36, 0.06, 0.3, '#1C1D22', -0.65, 1.46, -0.08);
    for (const sx of [-1, 1]) cyl(g, 0.025, 0.02, 0.06, '#1C1D22', -0.65 + sx * 0.1, 1.1, 0.1, 8);
    sph(g, 0.012, glow('#5DE0B5'), -0.5, 1.36, 0.095, 6, 4);
    cyl(g, 0.17, 0.19, 0.02, metal('#C9CED6'), 0.25, 1.06, 0, 20); cyl(g, 0.13, 0.13, 0.1, '#F2C9A0', 0.25, 1.12, 0, 20); cyl(g, 0.131, 0.131, 0.02, '#E58BB0', 0.25, 1.17, 0, 20);
    for (let i = 0; i < 5; i++) sph(g, 0.014, '#C7432F', 0.25 + Math.cos(i * 1.26) * 0.08, 1.19, Math.sin(i * 1.26) * 0.08, 6, 4);
    const dome = sph(g, 0.17, mat('#DDF1FF', { opacity: 0.3, rough: 0.05 }), 0.25, 1.08, 0, 20, 12); dome.castShadow = false;
    for (let i = 0; i < 4; i++) cyl(g, 0.04, 0.032, 0.08, ['#F6F4EF', '#E8553D', '#3E7CB1', '#F2C14E'][i], 0.6 + (i % 2) * 0.1, 1.09 + Math.floor(i / 2) * 0.08, -0.12 + (i % 2) * 0.03, 12);
    box(g, 0.2, 0.26, 0.02, '#1C1D22', 0.92, 1.18, -0.1).rotation.x = -0.2;
  };
  // chalkboard menu
  B.w_menu = (g) => framed(g, 1.0, 0.7, PW.canvasTex(320, 224, (c, w, h) => {
    c.fillStyle = '#25302A'; c.fillRect(0, 0, w, h); c.fillStyle = '#F6F4EF'; c.textAlign = 'center'; c.font = 'bold 30px "Sora", sans-serif'; c.fillText('MENÜ', w / 2, 38);
    c.font = '18px "Sora", sans-serif'; c.textAlign = 'left';
    [['Filtre kahve', '45'], ['Latte', '60'], ['Demli çay', '15'], ['Cheesecake', '90'], ['Domates çorbası', '55']].forEach(([a, b], i) => { c.fillStyle = '#F6F4EF'; c.fillText(a, 26, 76 + i * 30); c.fillStyle = '#F2C14E'; c.textAlign = 'right'; c.fillText(b, w - 26, 76 + i * 30); c.textAlign = 'left'; });
  }), '#6B4128');
  // a big striped parasol for the terrace
  B.f_parasol = (g, d = {}) => {
    cyl(g, 0.22, 0.25, 0.08, '#3A3D44', 0, 0.04, 0, 20); cyl(g, 0.022, 0.022, 2.2, '#F6F4EF', 0, 1.15, 0, 8);
    const col = d.c || '#E8553D';
    const tex = PW.canvasTex(256, 32, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#F6F4EF' : col; c.fillRect(i * w / 8, 0, w / 8, h); } });
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.42, 16, 1, true), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.8 })); top.position.y = 2.2; g.add(top);
    sph(g, 0.04, '#F6F4EF', 0, 2.43, 0, 8, 6);
  };
  // a long planter of flowers
  B.f_planter = (g, d = {}) => {
    box(g, 1.2, 0.4, 0.42, '#8A5A3A', 0, 0.2, 0); for (let i = 0; i < 5; i++) box(g, 1.21, 0.012, 0.43, '#6B4128', 0, 0.06 + i * 0.075, 0);
    box(g, 1.14, 0.02, 0.36, '#4A3426', 0, 0.39, 0);
    const r = U.seeded(d.seed || 17), cols = ['#E8553D', '#F2C14E', '#E58BB0', '#FFFFFF', '#B48AFF'];
    for (let i = 0; i < 22; i++) { const x = -0.5 + r() * 1.0, z = -0.12 + r() * 0.24, h = 0.15 + r() * 0.25; cyl(g, 0.006, 0.006, h, '#3F7A3A', x, 0.4 + h / 2, z, 4); sph(g, 0.04 + r() * 0.025, cols[i % cols.length], x, 0.4 + h, z, 8, 6); }
    for (let i = 0; i < 10; i++) { const s = sph(g, 0.09, mat('#4C8C4A', { flat: true }), -0.5 + i * 0.11, 0.45, (i % 2 ? 1 : -1) * 0.08, 8, 6); s.scale.y = 0.6; }
  };
  PW.NEON_COLORS = ['#FF4FA0', '#FF8466', '#F2C14E', '#7CF29A', '#4FD8FF', '#8E6CFF', '#FFFFFF'];
  // a letter garland: one paper flag per letter of d.t, on a string
  B.w_garland = (g, d = {}) => {
    const text = (d.t || 'MERHABA').toLocaleUpperCase('tr').replace(/\s+/g, ' ').slice(0, 12);
    const letters = [...text]; const n = Math.max(1, letters.length), span = Math.min(1.7, 0.17 * n + 0.12);
    const cols = ['#E8553D', '#F2C14E', '#3E7CB1', '#2F7D5B', '#E58BB0', '#8E6CC1'];
    const sag = (x) => -0.06 * (1 - Math.pow((2 * x) / span, 2));
    const pts = []; for (let i = 0; i <= 16; i++) { const x = -span / 2 + (span * i) / 16; pts.push(new THREE.Vector3(x, sag(x), 0.03)); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#6B5B4B' })));
    letters.forEach((ch, i) => {
      const x = -span / 2 + (span * (i + 0.5)) / n;
      const tex = PW.canvasTex(64, 80, (c, w, h) => { c.fillStyle = cols[i % cols.length]; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0); c.lineTo(w / 2, h); c.fill(); c.fillStyle = '#FFF'; c.font = 'bold 34px sans-serif'; c.textAlign = 'center'; c.fillText(ch, w / 2, 38); });
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.19), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }));
      f.position.set(x, sag(x) - 0.095, 0.035); f.rotation.z = (i % 2 ? 1 : -1) * 0.04; g.add(f);
    });
  };
  /* ---------- shop expansion (user 2026-11-03): many take the player's colour d.c ---------- */
  const vpot = (g, r, h, col, y = 0) => lathe(g, [[0, 0], [r * 0.8, 0], [r, h * 0.85], [r * 1.05, h], [r * 0.95, h], [0, h]], mat(col, { rough: 0.7 }), 0, y, 0);
  B.f_flower_vase = (g, d = {}) => {
    lathe(g, [[0, 0], [0.09, 0], [0.12, 0.12], [0.07, 0.3], [0.08, 0.34], [0, 0.34]], mat('#E9E4DA', { rough: 0.3 }), 0, 0, 0);
    const col = d.c || '#E58BB0', r = U.seeded(d.seed || 7);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, rr = 0.03 + r() * 0.05, h = 0.5 + r() * 0.18;
      const st = cyl(g, 0.005, 0.005, h - 0.3, '#3E7A3E', Math.cos(a) * rr * 0.5, 0.3 + (h - 0.3) / 2, Math.sin(a) * rr * 0.5, 5); st.rotation.z = Math.cos(a) * 0.2; st.rotation.x = Math.sin(a) * 0.2;
      sph(g, 0.035, i % 3 === 0 ? '#F2C14E' : col, Math.cos(a) * rr * 1.6, h, Math.sin(a) * rr * 1.6, 10, 8);
    }
  };
  B.f_bird_paradise = (g) => {
    vpot(g, 0.2, 0.32, '#C9C2B4');
    const r = U.seeded(11);
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + r() * 0.3, h = 0.8 + r() * 0.6;
      const st = cyl(g, 0.01, 0.012, h, '#4F7F3A', 0, 0.3 + h / 2, 0, 5); st.rotation.set(Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25);
      const lf = sph(g, 0.13, mat(i % 2 ? '#3E8A4A' : '#4F9A55', { rough: 0.6 }), Math.cos(a) * 0.25 * h * 0.5, 0.3 + h, Math.sin(a) * 0.25 * h * 0.5, 10, 8); lf.scale.set(0.55, 2.1, 0.12); lf.rotation.set(Math.sin(a) * 0.3, -a, Math.cos(a) * 0.3);
    }
    for (let i = 0; i < 2; i++) { const f = cone(g, 0.03, 0.16, '#FF8A2B', 0.08 - i * 0.16, 1.25 + i * 0.1, 0.05, 6); f.rotation.z = -1.2 + i * 2.4; }
  };
  B.f_succulents = (g) => {
    rbox(g, 0.5, 0.08, 0.3, 0.02, '#B8875A', 0, 0.04, 0); box(g, 0.46, 0.01, 0.26, '#6B4A33', 0, 0.081, 0);
    const cols = ['#7FB069', '#9CC5A1', '#5E8C61', '#C3D9A0', '#86A873'];
    [[-0.16, -0.06], [-0.05, 0.05], [0.07, -0.05], [0.17, 0.06], [-0.18, 0.07]].forEach(([x, z], i) => {
      for (let k = 0; k < 6; k++) { const l = cone(g, 0.022, 0.07, cols[i], x + Math.cos(k) * 0.02, 0.12, z + Math.sin(k) * 0.02, 6); l.rotation.set(Math.sin(k) * 0.6, 0, Math.cos(k) * 0.6); }
    });
  };
  B.f_lamp_mushroom = (g, d = {}) => {
    const col = d.c || '#E8553D';
    lathe(g, [[0, 0], [0.09, 0], [0.06, 0.04], [0.045, 0.32], [0, 0.32]], mat('#F4ECDD', { rough: 0.6 }), 0, 0, 0);
    const cap = sph(g, 0.17, mat(col, { emissive: col, ei: 0.35, rough: 0.5 }), 0, 0.32, 0, 24, 12); cap.scale.set(1, 0.62, 1);
    for (let i = 0; i < 6; i++) { const a = i * 1.1; sph(g, 0.022, '#FFF7E8', Math.cos(a) * 0.1, 0.39 + (i % 2) * 0.01, Math.sin(a) * 0.1, 8, 6); }
    g.userData.lightAt = [0, 0.3, 0]; g.userData.lightColor = col; g.userData.lightPower = 0.7;
  };
  B.f_lantern = (g) => {
    box(g, 0.2, 0.03, 0.2, '#2A2B33', 0, 0.015, 0); box(g, 0.2, 0.03, 0.2, '#2A2B33', 0, 0.36, 0);
    for (const [x, z] of [[-0.09, -0.09], [0.09, -0.09], [-0.09, 0.09], [0.09, 0.09]]) box(g, 0.015, 0.33, 0.015, '#2A2B33', x, 0.19, z);
    box(g, 0.17, 0.3, 0.17, mat('#FFE7B0', { opacity: 0.35, rough: 0.1 }), 0, 0.19, 0);
    cyl(g, 0.03, 0.03, 0.1, mat('#F6EEDC'), 0, 0.08, 0, 10); sph(g, 0.02, glow('#FFB347', 2), 0, 0.15, 0, 8, 6);
    cone(g, 0.13, 0.08, '#2A2B33', 0, 0.41, 0, 4).rotation.y = Math.PI / 4; tor(g, 0.04, 0.006, '#2A2B33', 0, 0.48, 0);
    g.userData.lightAt = [0, 0.2, 0]; g.userData.lightColor = '#FFB347'; g.userData.flicker = true; g.userData.lightPower = 0.6;
  };
  B.f_skateboard = (g, d = {}) => {
    const col = d.c || '#3E7CB1';
    const dk = rbox(g, 0.78, 0.02, 0.21, 0.09, col, 0, 0.09, 0);
    box(g, 0.6, 0.004, 0.17, '#2A2B33', 0, 0.102, 0);
    for (const sx of [-1, 1]) { box(g, 0.04, 0.03, 0.16, metal('#B9BEC6'), sx * 0.25, 0.065, 0); for (const sz of [-1, 1]) { const w = cyl(g, 0.03, 0.03, 0.03, '#F2C14E', sx * 0.25, 0.03, sz * 0.09, 12); w.rotation.x = Math.PI / 2; } }
    dk.rotation.z = 0;
  };
  B.f_vase_tall = (g, d = {}) => {
    lathe(g, [[0, 0], [0.1, 0], [0.13, 0.15], [0.12, 0.35], [0.06, 0.55], [0.07, 0.6], [0, 0.6]], mat(d.c || '#3E7CB1', { rough: 0.25 }), 0, 0, 0);
    for (let i = 0; i < 3; i++) { const st = cyl(g, 0.004, 0.004, 0.5, '#B89B6E', 0, 0.8, 0, 4); st.rotation.set(0.15 * (i - 1), 0, 0.2 * (i - 1)); const t = cone(g, 0.03, 0.12, '#D9C8B0', Math.sin(0.2 * (i - 1)) * -0.25, 1.06, Math.sin(0.15 * (i - 1)) * 0.25, 6); t.rotation.z = 0.2 * (i - 1); }
  };
  B.f_easel = (g, d = {}) => {
    for (const sx of [-1, 1]) { const l = box(g, 0.035, 1.5, 0.035, WOOD, sx * 0.25, 0.72, 0.05); l.rotation.z = -sx * 0.12; }
    const bl = box(g, 0.035, 1.4, 0.035, WOOD, 0, 0.66, -0.3); bl.rotation.x = -0.3;
    box(g, 0.62, 0.04, 0.08, WOOD_D, 0, 0.55, 0.08);
    const v = Math.max(0, Math.min(7, d.v | 0));
    box(g, 0.56, 0.72, 0.03, '#F6F4EF', 0, 0.94, 0.07);
    const tex = PW.canvasTex(192, 256, POSTERS[v]);
    const cv = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.68), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })); cv.position.set(0, 0.94, 0.087); g.add(cv);
    for (const [x, c] of [[-0.2, '#E8553D'], [-0.14, '#3E7CB1'], [0.18, '#F2C14E']]) cyl(g, 0.01, 0.01, 0.12, c, x, 0.63, 0.1, 6).rotation.z = 1.4;
  };
  B.f_yoga_mat = (g, d = {}) => {
    const col = d.c || '#7FB069';
    rbox(g, 1.7, 0.012, 0.6, 0.04, col, 0, 0.006, 0);
    const roll = cyl(g, 0.07, 0.07, 0.6, col, 0.88, 0.07, 0, 18); roll.rotation.x = Math.PI / 2;
    box(g, 1.6, 0.001, 0.02, '#FFFFFF', 0, 0.013, 0.25); box(g, 1.6, 0.001, 0.02, '#FFFFFF', 0, 0.013, -0.25);
  };
  B.f_camera = (g) => {
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const l = cyl(g, 0.018, 0.014, 1.2, metal('#3A3D45'), Math.cos(a) * 0.12, 0.58, Math.sin(a) * 0.12, 8); l.rotation.set(Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2); }
    cyl(g, 0.02, 0.02, 0.1, '#2A2B33', 0, 1.18, 0, 8);
    rbox(g, 0.28, 0.18, 0.13, 0.02, '#1C1D22', 0, 1.3, 0); box(g, 0.08, 0.04, 0.06, '#1C1D22', -0.07, 1.41, 0); const lens = cyl(g, 0.06, 0.065, 0.13, '#2A2B33', 0, 1.29, 0.12, 16); lens.rotation.x = Math.PI / 2;
    const gl = cyl(g, 0.05, 0.05, 0.005, mat('#3A5A8A', { rough: 0.05, metal: 0.5 }), 0, 1.29, 0.188, 16); gl.rotation.x = Math.PI / 2;
    sph(g, 0.01, glow('#FF3B30', 2), 0.11, 1.36, 0.066, 6, 4);
  };
  B.f_bunny = (g) => {
    const W = mat('#F6F2EE', { rough: 0.95 });
    const b = sph(g, 0.13, W, 0, 0.12, 0, 18, 12); b.scale.set(1, 0.9, 1.2);
    sph(g, 0.085, W, 0, 0.24, 0.13, 16, 12);
    for (const sx of [-1, 1]) { const e = sph(g, 0.03, W, sx * 0.035, 0.37, 0.11, 10, 8); e.scale.set(0.7, 2.6, 0.6); e.rotation.z = -sx * 0.15; const ein = sph(g, 0.018, '#F2B8C6', sx * 0.035, 0.37, 0.125, 8, 6); ein.scale.set(0.6, 2.4, 0.3); ein.rotation.z = -sx * 0.15; sph(g, 0.012, '#1C1D22', sx * 0.04, 0.26, 0.2, 8, 6); }
    sph(g, 0.012, '#F2A0B4', 0, 0.23, 0.215, 8, 6); sph(g, 0.04, W, 0, 0.13, -0.16, 10, 8);
    g.userData.update = (t) => { b.scale.y = 0.9 + Math.sin(t * 2.2) * 0.02; };
  };
  B.f_fishbowl = (g) => {
    cyl(g, 0.12, 0.14, 0.4, '#6B4A33', 0, 0.2, 0, 16);
    const bowl = sph(g, 0.17, mat('#BFE6F5', { opacity: 0.3, rough: 0.05 }), 0, 0.55, 0, 24, 16); bowl.castShadow = false;
    const water = sph(g, 0.155, mat('#59B8E0', { opacity: 0.45, rough: 0.1 }), 0, 0.53, 0, 24, 16); water.scale.y = 0.85; water.castShadow = false;
    cyl(g, 0.12, 0.12, 0.02, '#E8D9B5', 0, 0.42, 0, 16);
    const fish = new THREE.Group(); fish.position.set(0, 0.55, 0); g.add(fish);
    const body = sph(fish, 0.035, '#FF8A2B', 0.07, 0, 0, 10, 8); body.scale.set(1.5, 1, 0.7); const tail = cone(fish, 0.03, 0.04, '#FFB347', 0.015, 0, 0, 4); tail.rotation.z = Math.PI / 2;
    g.userData.update = (t) => { fish.rotation.y = t * 0.8; fish.position.y = 0.55 + Math.sin(t * 2) * 0.015; };
  };
  B.f_parrot = (g) => {
    cyl(g, 0.02, 0.02, 1.1, metal('#C9A15A'), 0, 0.55, 0, 8); cyl(g, 0.2, 0.22, 0.03, metal('#C9A15A'), 0, 0.015, 0, 18);
    const cage = new THREE.Group(); cage.position.y = 1.1; g.add(cage);
    cyl(cage, 0.2, 0.2, 0.02, metal('#C9A15A'), 0, 0, 0, 18);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; cyl(cage, 0.004, 0.004, 0.45, metal('#C9A15A'), Math.cos(a) * 0.19, 0.22, Math.sin(a) * 0.19, 4); }
    for (let i = 0; i < 6; i++) { const arc = tor(cage, 0.19, 0.004, metal('#C9A15A'), 0, 0.44, 0, Math.PI); arc.rotation.y = (i / 6) * Math.PI; arc.scale.y = 0.55; } tor(cage, 0.03, 0.008, metal('#C9A15A'), 0, 0.56, 0);
    const perch = cyl(cage, 0.008, 0.008, 0.3, WOOD, 0, 0.15, 0, 6); perch.rotation.z = Math.PI / 2;
    const bird = new THREE.Group(); bird.position.set(0, 0.19, 0); cage.add(bird);
    const bd = sph(bird, 0.05, '#7FD34E', 0, 0.05, 0, 12, 10); bd.scale.set(0.9, 1.3, 0.9); sph(bird, 0.035, '#F2E14E', 0, 0.12, 0.01, 10, 8);
    const bk = cone(bird, 0.012, 0.025, '#E8A33D', 0, 0.115, 0.045, 6); bk.rotation.x = Math.PI / 2; sph(bird, 0.007, '#1C1D22', 0.02, 0.13, 0.03, 6, 4); sph(bird, 0.007, '#1C1D22', -0.02, 0.13, 0.03, 6, 4);
    const tl = cone(bird, 0.02, 0.1, '#3E7CB1', 0, -0.03, -0.04, 6); tl.rotation.x = -2.6;
    g.userData.update = (t) => { bird.rotation.y = Math.sin(t * 0.7) * 0.6; bird.position.y = 0.19 + Math.abs(Math.sin(t * 3)) * 0.01; };
  };
  B.f_hammock = (g, d = {}) => {
    const col = d.c || '#E9DCC8';
    cyl(g, 0.4, 0.42, 0.04, '#2A2B33', 0.15, 0.02, 0, 24);
    const pole = new THREE.Group(); g.add(pole);
    cyl(pole, 0.025, 0.025, 1.9, metal('#2A2B33'), 0.45, 0.95, 0, 8);
    const arm = cyl(pole, 0.02, 0.02, 0.6, metal('#2A2B33'), 0.2, 1.88, 0, 8); arm.rotation.z = Math.PI / 2 + 0.2;
    cyl(pole, 0.004, 0.004, 0.5, '#6B5B4B', 0, 1.6, 0, 4);
    const seat = new THREE.Group(); seat.position.set(0, 1.0, 0); g.add(seat);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 14, 0, Math.PI * 2, Math.PI * 0.32, Math.PI * 0.68), new THREE.MeshStandardMaterial({ color: col, roughness: 0.95, side: THREE.DoubleSide })); shell.scale.set(1, 1.15, 1); shell.castShadow = true; seat.add(shell);
    const cush = cyl(seat, 0.3, 0.3, 0.08, fabM(d, '#C7432F'), 0, -0.24, 0.02, 20);
    tor(seat, 0.36, 0.015, '#B89B6E', 0, 0.17, 0).rotation.x = Math.PI / 2;
    g.userData.update = (t) => { seat.rotation.z = Math.sin(t * 0.8) * 0.04; };
    void cush;
  };
  B.f_pouf = (g, d = {}) => {
    const col = d.c || '#D9C8B0';
    const p = cyl(g, 0.25, 0.25, 0.36, mat(col, { map: knitTex(), rough: 1 }), 0, 0.18, 0, 24);
    tor(g, 0.24, 0.025, mat(col, { rough: 1 }), 0, 0.36, 0).rotation.x = Math.PI / 2; tor(g, 0.24, 0.025, mat(col, { rough: 1 }), 0, 0.01, 0).rotation.x = Math.PI / 2;
    void p;
  };
  let knitT = null;
  function knitTex() { return knitT || (knitT = (() => { const t = PW.canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = 3; for (let x = 0; x < w; x += 8) { c.beginPath(); for (let y = 0; y <= h; y += 8) { c.lineTo(x + (y / 8) % 2 * 4, y); } c.stroke(); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 3); return t; })()); }
  function flatRug(g, w, d, draw, round = false) {
    const t = PW.canvasTex(256, Math.round(256 * d / w), draw);
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 1 });
    const mesh = new THREE.Mesh(round ? new THREE.CylinderGeometry(w / 2, w / 2, 0.025, 48) : new THREE.BoxGeometry(w, 0.025, d), m);
    mesh.position.y = 0.0125; mesh.receiveShadow = true; g.add(mesh);
  }
  B.f_rug_shag = (g, d = {}) => flatRug(g, 2, 1.4, (c, w, h) => { c.fillStyle = d.c || '#E8DCCB'; c.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${i % 2 ? 255 : 0},${i % 2 ? 255 : 0},${i % 2 ? 255 : 0},.08)`; c.fillRect((i * 53) % w, (i * 97) % h, 2, 5); } });
  B.f_rug_checker = (g, d = {}) => flatRug(g, 2, 2, (c, w, h) => { const a = d.c || '#2F3542', b = '#F4F1EC', n = 8; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { c.fillStyle = (x + y) % 2 ? a : b; c.fillRect((x * w) / n, (y * h) / n, w / n + 1, h / n + 1); } });
  B.f_rug_rainbow = (g) => flatRug(g, 2.2, 1.2, (c, w, h) => { c.fillStyle = '#F4EDE2'; c.fillRect(0, 0, w, h); const cols = ['#E8553D', '#F2A03D', '#F2C14E', '#7FB069', '#3E7CB1', '#8E6CC1']; cols.forEach((col, i) => { c.strokeStyle = col; c.lineWidth = 11; c.beginPath(); c.arc(w / 2, h * 0.95, w * 0.42 - i * 13, Math.PI, 0); c.stroke(); }); });
  // a coir doormat with the player's own words (d.t) in their colour (d.c)
  B.f_doormat = (g, d = {}) => flatRug(g, 1, 0.6, (c, w, h) => {
    c.fillStyle = '#C69C6D'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) { c.fillStyle = i % 2 ? 'rgba(90,60,30,.18)' : 'rgba(255,240,210,.12)'; c.fillRect((i * 37) % w, (i * 71) % h, 1, 3); }
    c.strokeStyle = d.c || '#2F3542'; c.lineWidth = 6; c.strokeRect(8, 8, w - 16, h - 16);
    const text = (d.t || 'Hoş geldin').slice(0, 18); let fs = 34;
    c.font = `800 ${fs}px "Sora", sans-serif`; while (c.measureText(text).width > w - 36 && fs > 14) { fs -= 2; c.font = `800 ${fs}px "Sora", sans-serif`; }
    c.fillStyle = d.c || '#2F3542'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2 + 2);
  });
  /* wall */
  B.w_ivy = (g) => {
    box(g, 0.5, 0.03, 0.18, WOOD, 0, 0, 0.09); vpot(g, 0.08, 0.13, '#E9E4DA', 0.015).position.z = 0.09;
    const r = U.seeded(5);
    for (let s2 = 0; s2 < 5; s2++) { const x0 = -0.2 + s2 * 0.1, len = 4 + Math.floor(r() * 6); for (let k = 0; k < len; k++) { const lf = sph(g, 0.035, k % 2 ? '#3E8A4A' : '#5CAA5A', x0 + Math.sin(k * 1.3 + s2) * 0.04, -0.03 - k * 0.09, 0.1 + r() * 0.05, 8, 6); lf.scale.set(1, 0.6, 0.4); } }
  };
  B.w_moon = (g) => {
    const moon = sph(g, 0.22, mat('#FFF4D6', { emissive: '#FFE7A8', ei: 0.7, rough: 0.9 }), 0, 0, 0.12, 24, 16);
    for (const [x, y, r] of [[0.06, 0.05, 0.04], [-0.07, -0.04, 0.03], [0.02, -0.1, 0.025]]) { const cr = sph(g, r, mat('#F0E1B8', { emissive: '#F0D890', ei: 0.4 }), x, y, 0.315, 10, 8); cr.scale.z = 0.3; }
    g.userData.lightAt = [0, 0, 0.4]; g.userData.lightColor = '#FFE7A8'; g.userData.lightPower = 0.6; void moon;
  };
  B.w_star_lights = (g) => {
    const r = U.seeded(3);
    for (let i = 0; i < 9; i++) {
      const x = -0.62 + i * 0.155, len = 0.35 + r() * 0.55;
      cyl(g, 0.002, 0.002, len, '#C9C2B4', x, -len / 2, 0.03, 3);
      const st = new THREE.Mesh(new THREE.ShapeGeometry(starShape(0.045)), glow('#FFE7A8', 1.8)); st.position.set(x, -len - 0.02, 0.035); g.add(st);
    }
    g.userData.lightAt = [0, -0.4, 0.3]; g.userData.lightColor = '#FFE7A8'; g.userData.lightPower = 0.4;
  };
  function starShape(r) { const s2 = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.PI / 2, rr = i % 2 ? r * 0.45 : r; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (i) s2.lineTo(x, y); else s2.moveTo(x, y); } return s2; }
  B.w_hoop = (g) => {
    rbox(g, 0.7, 0.45, 0.03, 0.02, '#F6F4EF', 0, 0.1, 0.015); box(g, 0.24, 0.18, 0.005, '#E8553D', 0, 0.02, 0.033);
    box(g, 0.2, 0.14, 0.006, '#F6F4EF', 0, 0.02, 0.034);
    const rim = tor(g, 0.15, 0.012, '#E8553D', 0, -0.12, 0.2); rim.rotation.x = Math.PI / 2;
    box(g, 0.04, 0.03, 0.08, '#E8553D', 0, -0.12, 0.06);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const n = cyl(g, 0.003, 0.003, 0.2, '#FFFFFF', Math.cos(a) * 0.12, -0.22, 0.2 + Math.sin(a) * 0.12, 3); n.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); }
  };
  B.w_vinyl = (g) => {
    const labels = ['#E8553D', '#F2C14E', '#3E7CB1', '#7FB069', '#E58BB0'];
    [[-0.4, 0.12], [0, 0.18], [0.4, 0.1], [-0.2, -0.18], [0.22, -0.16]].forEach(([x, y], i) => {
      const rec = cyl(g, 0.15, 0.15, 0.008, mat('#141218', { rough: 0.3, metal: 0.2 }), x, y, 0.01, 32); rec.rotation.x = Math.PI / 2;
      const lb = cyl(g, 0.05, 0.05, 0.004, labels[i], x, y, 0.016, 20); lb.rotation.x = Math.PI / 2;
    });
  };
  B.w_polaroid = (g) => {
    const pts = []; for (let i = 0; i <= 12; i++) { const x = -0.6 + i * 0.1; pts.push(new THREE.Vector3(x, -0.05 * (1 - Math.pow(x / 0.6, 2)), 0.02)); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#6B5B4B' })));
    for (let i = 0; i < 5; i++) {
      const x = -0.48 + i * 0.24, y = -0.05 * (1 - Math.pow(x / 0.6, 2)) - 0.12;
      const fr = box(g, 0.16, 0.19, 0.004, '#FBFAF6', x, y, 0.022); fr.rotation.z = (i % 2 ? 1 : -1) * 0.06;
      const ph = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.13), new THREE.MeshStandardMaterial({ map: PW.canvasTex(64, 60, POSTERS[(i * 3) % POSTERS.length]) })); ph.position.set(x, y + 0.02, 0.025); ph.rotation.z = fr.rotation.z; g.add(ph);
      box(g, 0.02, 0.04, 0.01, WOOD_L, x, y + 0.1, 0.026);
    }
  };
  B.w_mirror = (g, d = {}) => {
    const fr = tor(g, 0.27, 0.025, metal(d.c || '#C9A15A'), 0, 0, 0.03); void fr;
    const m = cyl(g, 0.265, 0.265, 0.01, mat('#DCE8F0', { rough: 0.02, metal: 0.9 }), 0, 0, 0.025, 40); m.rotation.x = Math.PI / 2;
  };
  /* desk-top */
  B.d_hourglass = (g) => {
    for (const y of [0.005, 0.2]) cyl(g, 0.055, 0.055, 0.012, WOOD_D, 0, y, 0, 16);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; cyl(g, 0.005, 0.005, 0.2, WOOD_D, Math.cos(a) * 0.045, 0.1, Math.sin(a) * 0.045, 5); }
    lathe(g, [[0, 0], [0.035, 0], [0.038, 0.04], [0.006, 0.095], [0.038, 0.15], [0.035, 0.19], [0, 0.19]], mat('#DCEFF5', { opacity: 0.35, rough: 0.05 }), 0, 0.01, 0);
    const sand = cone(g, 0.03, 0.04, '#E8C27A', 0, 0.035, 0, 12); sand.rotation.x = Math.PI; cone(g, 0.022, 0.03, '#E8C27A', 0, 0.13, 0, 12).rotation.x = Math.PI;
  };
  B.d_crystal = (g) => {
    cyl(g, 0.06, 0.07, 0.04, WOOD_D, 0, 0.02, 0, 16);
    sph(g, 0.075, mat('#C9E4FF', { opacity: 0.45, rough: 0.02, emissive: '#8EC5FF', ei: 0.35 }), 0, 0.11, 0, 24, 16).castShadow = false;
    sph(g, 0.03, glow('#B39DFF', 1.2), 0, 0.11, 0, 12, 8);
  };
  B.d_photo = (g) => {
    const fr = rbox(g, 0.16, 0.12, 0.015, 0.006, WOOD_D, 0, 0.065, 0); fr.rotation.x = -0.18;
    const ph = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.09), new THREE.MeshStandardMaterial({ map: PW.canvasTex(96, 72, POSTERS[2]) })); ph.position.set(0, 0.066, 0.009); ph.rotation.x = -0.18; g.add(ph);
    const st = box(g, 0.02, 0.1, 0.01, WOOD_D, 0, 0.05, -0.04); st.rotation.x = 0.35;
  };
  B.d_headphones = (g, d = {}) => {
    const col = d.c || '#2A2B33';
    cyl(g, 0.05, 0.06, 0.01, '#1C1D22', 0, 0.005, 0, 16); cyl(g, 0.008, 0.008, 0.2, metal('#9AA0AA'), 0, 0.1, 0, 8);
    const band = tor(g, 0.08, 0.012, col, 0, 0.2, 0, Math.PI); band.rotation.y = Math.PI / 2;
    for (const sz of [-1, 1]) { const cup = cyl(g, 0.045, 0.045, 0.035, col, 0, 0.13, sz * 0.085, 18); cup.rotation.x = Math.PI / 2; const pad = cyl(g, 0.04, 0.04, 0.012, '#1C1D22', 0, 0.13, sz * 0.064, 18); pad.rotation.x = Math.PI / 2; }
  };
  B.w_tv = (g) => { rbox(g, 1.4, 0.8, 0.05, 0.01, '#111', 0, 0, 0.025); const tex = PW.canvasTex(256, 144, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1F2C55'); gr.addColorStop(1, '#6A4FA3'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#F2C14E'; c.beginPath(); c.arc(190, 50, 22, 0, 7); c.fill(); c.fillStyle = '#0F1530'; c.beginPath(); c.moveTo(0, 144); c.lineTo(60, 80); c.lineTo(110, 120); c.lineTo(170, 70); c.lineTo(256, 144); c.fill(); c.fillStyle = '#FFF'; c.font = 'bold 16px sans-serif'; c.fillText('lo-fi odak radyosu', 12, 24); }); const p = new THREE.Mesh(new THREE.PlaneGeometry(1.34, 0.74), new THREE.MeshStandardMaterial({ map: tex, emissive: '#FFFFFF', emissiveMap: tex, emissiveIntensity: 0.8 })); p.position.z = 0.052; g.add(p); };


  /* ======== v2: textured materials + detailed hero furniture (override v1 builders) ======== */
  const WOOD_TONES = { oak: '#B9844F', walnut: '#7A4E2E', light: '#D9B98E', white: '#EDE8E0', black: '#2B2623', cherry: '#9C4F35' };
  PW.WOOD_TONES = WOOD_TONES;
  PW.FABRIC_COLORS = ['#5B6270', '#8E6CC1', '#2F7D5B', '#C7432F', '#E8803A', '#F2C14E', '#3E7CB1', '#E58BB0', '#D9C8B0', '#2A2B33', '#7FB069', '#A3C4D9'];
  const tcache = {};
  function grainTex(tone) {
    if (tcache['w' + tone]) return tcache['w' + tone];
    const t = PW.canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = tone; c.fillRect(0, 0, w, h);
      const r = U.seeded(U.hashStr(tone));
      for (let i = 0; i < 70; i++) { const y = r() * h; c.strokeStyle = `rgba(${r() < 0.5 ? '40,20,5' : '255,235,200'},${0.05 + r() * 0.09})`; c.lineWidth = 0.6 + r() * 2; c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= w; x += 16) c.lineTo(x, y + Math.sin(x * 0.03 + i) * 3 + (r() - 0.5) * 2); c.stroke(); }
      for (let i = 0; i < 4; i++) { const x = r() * w, y = r() * h; const g = c.createRadialGradient(x, y, 1, x, y, 10); g.addColorStop(0, 'rgba(40,20,5,.35)'); g.addColorStop(1, 'rgba(40,20,5,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(x, y, 14, 6, 0, 0, 7); c.fill(); }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return (tcache['w' + tone] = t);
  }
  function weaveTex() {
    if (tcache.weave) return tcache.weave;
    const t = PW.canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 3) { c.fillStyle = 'rgba(0,0,0,.05)'; c.fillRect(0, y, w, 1); } for (let x = 0; x < w; x += 3) { c.fillStyle = 'rgba(0,0,0,.04)'; c.fillRect(x, 0, 1, h); } const r = U.seeded(3); for (let i = 0; i < 600; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},.05)`; c.fillRect(r() * w, r() * h, 2, 2); } });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return (tcache.weave = t);
  }
  const mcache = {};
  const woodM = (d, k = 1) => { const tone = (d && WOOD_TONES[d.wd]) || WOOD_TONES.oak; const hex = k === 1 ? tone : shadeHex(tone, k); const key = 'wm' + hex; return mcache[key] || (mcache[key] = new THREE.MeshStandardMaterial({ color: '#ffffff', map: grainTex(hex), roughness: 0.62, envMapIntensity: 0.4 })); };
  const fabM = (d, def) => { const hex = (d && d.c) || def; const key = 'fm' + hex; return mcache[key] || (mcache[key] = new THREE.MeshStandardMaterial({ color: hex, map: weaveTex(), roughness: 0.95, envMapIntensity: 0.2 })); };
  function shadeHex(hex, k) { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); }
  PW.woodM = woodM; PW.fabM = fabM;
  const brass = () => mat('#C9A15A', { metal: 0.85, rough: 0.3 });
  const knob = (g, x, y, z) => sph(g, 0.016, brass(), x, y, z, 10, 8);

  B.f_desk_wood = (g, d = {}) => { const W = woodM(d), Wd = woodM(d, 0.8); rbox(g, 1.42, 0.055, 0.72, 0.02, W, 0, 0.735, 0); rbox(g, 1.3, 0.08, 0.6, 0.01, Wd, 0, 0.67, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = rbox(g, 0.05, 0.66, 0.05, 0.012, W, sx * 0.64, 0.33, sz * 0.3); l.rotation.z = sx * 0.04; } const dr = new THREE.Group(); dr.position.set(0.42, 0, 0); g.add(dr); rbox(dr, 0.4, 0.42, 0.6, 0.015, W, 0, 0.44, 0); for (let i = 0; i < 2; i++) { rbox(dr, 0.36, 0.17, 0.02, 0.008, Wd, 0, 0.55 - i * 0.2, 0.302); box(dr, 0.1, 0.014, 0.02, brass(), 0, 0.57 - i * 0.2, 0.318); } box(g, 0.5, 0.004, 0.32, mat('#3E5A4A', { rough: 0.9 }), -0.2, 0.765, 0.05); };
  B.f_desk_white = (g, d = {}) => { const top = mat('#F4F2EE', { rough: 0.45 }); rbox(g, 1.42, 0.04, 0.72, 0.015, top, 0, 0.745, 0); rbox(g, 1.42, 0.012, 0.72, 0.006, woodM(Object.assign({ wd: 'light' }, d)), 0, 0.722, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = cyl(g, 0.012, 0.012, 0.73, brass(), sx * 0.62, 0.365, sz * 0.28, 8); l.rotation.z = sx * 0.06; l.rotation.x = -sz * 0.04; } rbox(g, 0.32, 0.12, 0.5, 0.01, top, -0.45, 0.65, 0); box(g, 0.08, 0.01, 0.01, brass(), -0.45, 0.65, 0.252); };
  B.f_table_round = (g, d = {}) => { cyl(g, 0.56, 0.56, 0.045, woodM(d), 0, 0.745, 0, 40); cyl(g, 0.5, 0.48, 0.03, woodM(d, 0.82), 0, 0.715, 0, 40); lathe(g, [[0, 0], [0.26, 0], [0.26, 0.03], [0.06, 0.08], [0.04, 0.7], [0, 0.7]], mat('#2A2B33', { metal: 0.6, rough: 0.35 }), 0, 0, 0, 28); };
  B.f_table_long = (g, d = {}) => { const W = woodM(Object.assign({ wd: 'walnut' }, d)); rbox(g, 3.2, 0.08, 1.2, 0.025, W, 0, 0.72, 0); for (const sx of [-1, 1]) { rbox(g, 0.09, 0.66, 1.0, 0.02, W, sx * 1.4, 0.34, 0); rbox(g, 0.12, 0.05, 1.1, 0.02, W, sx * 1.4, 0.025, 0); } rbox(g, 2.7, 0.06, 0.08, 0.02, W, 0, 0.25, 0); box(g, 2.9, 0.005, 0.36, mat('#2F5D45', { rough: 0.95 }), 0, 0.762, 0); for (let i = 0; i < 2; i++) { const l = new THREE.Group(); l.position.set(-0.8 + i * 1.6, 0.765, 0); g.add(l); cyl(l, 0.06, 0.07, 0.02, brass(), 0, 0.01, 0, 16); cyl(l, 0.008, 0.008, 0.3, brass(), 0, 0.16, 0, 6); const sh = cyl(l, 0.04, 0.11, 0.1, mat('#2F7D5B', { rough: 0.4, double: true }), 0, 0.33, 0.04, 20); sh.rotation.x = 0.3; sph(l, 0.025, mat('#FFF1C9', { emissive: '#FFE3A0', ei: 2.5 }), 0, 0.3, 0.05, 8, 6); } g.userData.lightAt = [0, 1.1, 0]; g.userData.lightPower = 0.8; };
  B.f_chair_wood = (g, d = {}) => { const W = woodM(d), Wd = woodM(d, 0.85); rbox(g, 0.46, 0.045, 0.45, 0.018, W, 0, 0.44, 0); rbox(g, 0.4, 0.035, 0.38, 0.018, fabM(d, '#C9B79C'), 0, 0.475, 0.01); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = cyl(g, 0.022, 0.017, 0.43, Wd, sx * 0.19, 0.215, sz * 0.18, 10); l.rotation.z = sx * 0.04; l.rotation.x = -sz * 0.04; } for (const sx of [-1, 1]) { const b = cyl(g, 0.018, 0.02, 0.52, Wd, sx * 0.18, 0.72, -0.2, 10); b.rotation.x = -0.1; } for (let i = 0; i < 3; i++) { const sl = rbox(g, 0.36, 0.035, 0.022, 0.01, W, 0, 0.66 + i * 0.1, -0.215 - i * 0.01); sl.rotation.x = -0.1; } box(g, 0.34, 0.02, 0.02, Wd, 0, 0.13, 0.18); box(g, 0.34, 0.02, 0.02, Wd, 0, 0.13, -0.18); };
  B.f_chair_office = (g, d = {}) => { const F = fabM(d, '#2A2B33'); rbox(g, 0.52, 0.09, 0.5, 0.04, F, 0, 0.46, 0); const back = new THREE.Group(); back.position.set(0, 0.52, -0.24); back.rotation.x = -0.12; g.add(back); rbox(back, 0.48, 0.58, 0.07, 0.035, F, 0, 0.32, 0); for (let i = 0; i < 4; i++) box(back, 0.4, 0.006, 0.072, mat('#000', { opacity: 0.25 }), 0, 0.12 + i * 0.12, 0); box(back, 0.05, 0.3, 0.04, mat('#3E4250', { metal: 0.5, rough: 0.4 }), 0, -0.05, -0.02); cyl(g, 0.025, 0.025, 0.3, mat('#9AA0AA', { metal: 0.8, rough: 0.25 }), 0, 0.27, 0); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const leg = rbox(g, 0.3, 0.03, 0.045, 0.012, mat('#2A2B33', { metal: 0.5, rough: 0.4 }), Math.cos(a) * 0.15, 0.08, Math.sin(a) * 0.15); leg.rotation.y = -a; const w = cyl(g, 0.03, 0.03, 0.025, mat('#111'), Math.cos(a) * 0.29, 0.03, Math.sin(a) * 0.29, 12); w.rotation.z = Math.PI / 2; } for (const sx of [-1, 1]) { box(g, 0.035, 0.18, 0.035, mat('#2A2B33', { metal: 0.5 }), sx * 0.26, 0.57, -0.02); rbox(g, 0.07, 0.035, 0.26, 0.015, F, sx * 0.26, 0.67, 0.02); } };
  function sofaV2(g, w, F, Fd, d) { rbox(g, w, 0.24, 0.88, 0.07, F, 0, 0.28, 0); const n = Math.max(1, Math.round(w / 0.85)); const cw = (w - 0.32) / n; for (let i = 0; i < n; i++) { const x = -w / 2 + 0.16 + cw * (i + 0.5); rbox(g, cw - 0.02, 0.14, 0.64, 0.06, F, x, 0.46, 0.07); box(g, cw - 0.06, 0.004, 0.6, Fd, x, 0.533, 0.07); const bc = rbox(g, cw - 0.04, 0.42, 0.18, 0.08, F, x, 0.7, -0.25); bc.rotation.x = -0.14; } rbox(g, w, 0.58, 0.16, 0.07, F, 0, 0.6, -0.37); for (const sx of [-1, 1]) { rbox(g, 0.17, 0.46, 0.88, 0.07, F, sx * (w / 2 - 0.085), 0.44, 0); const r = cyl(g, 0.085, 0.085, 0.86, F, sx * (w / 2 - 0.085), 0.67, 0, 18); r.rotation.x = Math.PI / 2; } for (const sx of [-1, 1]) for (const sz of [-1, 1]) cone(g, 0.022, 0.15, woodM(Object.assign({ wd: 'walnut' }, d)), sx * (w / 2 - 0.1), 0.075, sz * 0.34, 10).rotation.x = Math.PI; }
  B.f_sofa = (g, d = {}) => { const F = fabM(d, '#5B6270'); sofaV2(g, 1.8, F, mat('#000', { opacity: 0.18 }), d); const p1 = rbox(g, 0.34, 0.32, 0.11, 0.06, fabM({}, '#F2C14E'), -0.55, 0.64, -0.14); p1.rotation.set(-0.3, 0.3, 0.12); const p2 = rbox(g, 0.3, 0.3, 0.1, 0.06, fabM({}, '#F6F4EF'), 0.6, 0.63, -0.15); p2.rotation.set(-0.3, -0.25, -0.1); const bl = rbox(g, 0.5, 0.02, 0.5, 0.01, fabM({}, '#C98FA6'), 0.45, 0.55, 0.12); bl.rotation.set(0, 0.3, 0.05); };
  B.f_sofa_l = (g, d = {}) => { const F = fabM(d, '#8E6CC1'); const s = new THREE.Group(); s.position.x = -0.3; g.add(s); sofaV2(s, 1.8, F, mat('#000', { opacity: 0.18 }), d); rbox(g, 0.82, 0.24, 1.5, 0.07, F, 0.9, 0.28, 0.32); rbox(g, 0.64, 0.14, 1.25, 0.06, F, 0.87, 0.46, 0.38); rbox(g, 0.17, 0.46, 1.5, 0.07, F, 1.24, 0.44, 0.32); const p = rbox(g, 0.32, 0.3, 0.1, 0.06, fabM({}, '#E58BB0'), 0.8, 0.63, -0.2); p.rotation.set(-0.3, -0.4, 0); };
  B.f_armchair = (g, d = {}) => { const F = fabM(d, '#2F7D5B'); rbox(g, 0.92, 0.24, 0.84, 0.07, F, 0, 0.3, 0); rbox(g, 0.62, 0.14, 0.62, 0.06, F, 0, 0.47, 0.07); const b = rbox(g, 0.6, 0.48, 0.16, 0.08, F, 0, 0.72, -0.26); b.rotation.x = -0.15; rbox(g, 0.9, 0.62, 0.16, 0.08, F, 0, 0.66, -0.36); for (const sx of [-1, 1]) { rbox(g, 0.15, 0.4, 0.82, 0.07, F, sx * 0.39, 0.48, 0); const r = cyl(g, 0.08, 0.08, 0.8, F, sx * 0.39, 0.68, 0, 18); r.rotation.x = Math.PI / 2; } for (const sx of [-1, 1]) for (const sz of [-1, 1]) cone(g, 0.024, 0.18, woodM(Object.assign({ wd: 'walnut' }, d)), sx * 0.36, 0.09, sz * 0.32, 10).rotation.x = Math.PI; const p = rbox(g, 0.32, 0.28, 0.1, 0.06, fabM({}, '#F6F4EF'), 0, 0.66, -0.15); p.rotation.x = -0.25; };
  B.f_beanbag = (g, d = {}) => { const F = fabM(d, '#E8803A'); const s = sph(g, 0.44, F, 0, 0.3, -0.04, 32, 24); s.scale.set(1, 0.68, 1); const b = sph(g, 0.32, F, 0, 0.55, -0.27, 28, 20); b.scale.set(1.1, 0.95, 0.62); const seam = tor(g, 0.43, 0.006, mat('#000', { opacity: 0.2 }), 0, 0.3, -0.04); seam.rotation.x = Math.PI / 2; seam.scale.set(1, 1, 0.68); };
  B.f_bed_single = (g, d = {}) => { const W = woodM(d); rbox(g, 1.12, 0.26, 2.12, 0.03, W, 0, 0.2, 0); rbox(g, 1.04, 0.2, 2.0, 0.07, mat('#F7F5F0', { rough: 0.9 }), 0, 0.41, 0.02); const bl = rbox(g, 1.1, 0.07, 1.35, 0.035, fabM(d, '#3E7CB1'), 0, 0.51, 0.36); rbox(g, 1.1, 0.06, 0.25, 0.03, mat('#F7F5F0', { rough: 0.9 }), 0, 0.53, -0.25); const p = rbox(g, 0.62, 0.14, 0.38, 0.07, mat('#FFFFFF', { rough: 0.9 }), 0, 0.56, -0.72); p.rotation.x = -0.1; rbox(g, 1.14, 0.82, 0.08, 0.03, W, 0, 0.5, -1.05); for (let i = 0; i < 5; i++) rbox(g, 0.12, 0.5, 0.02, 0.01, woodM(d, 0.85), -0.4 + i * 0.2, 0.55, -1.0); const t = rbox(g, 0.3, 0.25, 0.25, 0.02, fabM({}, '#E58BB0'), 0.35, 0.64, 0.6); t.rotation.y = 0.4; };
  B.f_bed_double = (g, d = {}) => { const W = woodM(Object.assign({ wd: 'walnut' }, d)); rbox(g, 1.72, 0.26, 2.22, 0.03, W, 0, 0.2, 0); rbox(g, 1.64, 0.21, 2.1, 0.07, mat('#F7F5F0', { rough: 0.9 }), 0, 0.42, 0.02); rbox(g, 1.68, 0.075, 1.38, 0.035, fabM(d, '#C98FA6'), 0, 0.53, 0.38); rbox(g, 1.68, 0.06, 0.3, 0.03, fabM({}, '#F2E6D3'), 0, 0.565, 0.0); for (const sx of [-1, 1]) { const p = rbox(g, 0.62, 0.15, 0.4, 0.07, mat('#FFFFFF', { rough: 0.9 }), sx * 0.4, 0.58, -0.74); p.rotation.x = -0.12; } const hb = rbox(g, 1.82, 1.0, 0.12, 0.05, fabM(d, '#C98FA6'), 0, 0.62, -1.08); for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) sph(g, 0.015, mat('#000', { opacity: 0.25 }), -0.75 + i * 0.3, 0.55 + j * 0.3, -1.02, 6, 4); for (const sx of [-1, 1]) { rbox(g, 0.46, 0.46, 0.42, 0.03, W, sx * 1.2, 0.23, -0.85); knob(g, sx * 1.2, 0.33, -0.63); const l = new THREE.Group(); l.position.set(sx * 1.2, 0.46, -0.9); g.add(l); lathe(l, [[0, 0], [0.07, 0], [0.09, 0.08], [0.05, 0.2], [0, 0.2]], mat('#E9E1D3', { rough: 0.4 }), 0, 0, 0, 20); const sh = cyl(l, 0.08, 0.12, 0.13, mat('#F6EBD8', { emissive: '#FFD9A0', ei: 0.7, double: true }), 0, 0.27, 0, 20); sh.castShadow = false; } g.userData.lightAt = [1.2, 0.8, -0.85]; g.userData.lightPower = 0.6; };
  B.f_lamp_floor = (g, d = {}) => { cyl(g, 0.17, 0.19, 0.03, mat('#2A2B33', { metal: 0.6, rough: 0.35 }), 0, 0.015, 0, 28); cyl(g, 0.014, 0.014, 1.5, brass(), 0, 0.77, 0, 8); const sh = lathe(g, [[0.15, 0], [0.24, 0], [0.24, 0.005], [0.15, 0.32], [0.145, 0.32]], mat(d.c || '#F2E6D3', { emissive: '#FFD9A0', ei: 0.55, double: true, rough: 0.9 }), 0, 1.44, 0, 32); sh.castShadow = false; sph(g, 0.05, mat('#FFF4D6', { emissive: '#FFE7B0', ei: 3 }), 0, 1.52, 0, 12, 8).castShadow = false; g.userData.lightAt = [0, 1.45, 0]; g.userData.lightPower = 1.2; };
  B.d_lamp = (g, d = {}) => { cyl(g, 0.075, 0.085, 0.022, mat(d.c || '#2A2B33', { metal: 0.4, rough: 0.4 }), 0, 0.011, 0, 20); const a1 = cyl(g, 0.009, 0.009, 0.28, mat(d.c || '#2A2B33', { metal: 0.4 }), 0.03, 0.15, 0, 6); a1.rotation.z = -0.25; sph(g, 0.015, brass(), 0.065, 0.285, 0, 8, 6); const a2 = cyl(g, 0.009, 0.009, 0.22, mat(d.c || '#2A2B33', { metal: 0.4 }), 0.0, 0.34, 0.06, 6); a2.rotation.x = 0.9; const h = cone(g, 0.075, 0.13, mat(d.c || '#F2C14E', { double: true, rough: 0.4 }), 0, 0.38, 0.16, 20); h.rotation.x = 2.4; sph(g, 0.032, mat('#FFF1C9', { emissive: '#FFE7B0', ei: 3.5 }), 0, 0.35, 0.19, 10, 8).castShadow = false; g.userData.lightAt = [0, 0.28, 0.24]; g.userData.lightPower = 0.8; };
  function leafGeo() { if (tcache.leaf) return tcache.leaf; const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(0.09, 0.05, 0.11, 0.2, 0, 0.3); s.bezierCurveTo(-0.11, 0.2, -0.09, 0.05, 0, 0); const g = new THREE.ShapeGeometry(s, 8); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -Math.abs(x) * 0.6 + Math.sin(y * 6) * 0.01 - y * y * 0.4); } g.computeVertexNormals(); return (tcache.leaf = g); }
  function plantLeaves(g, n, base, len, color, spread, seed, scale = 1) { const r = U.seeded(seed); const m = mat(color, { rough: 0.55, double: true }); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + r() * 0.5; const tilt = 0.4 + r() * spread; const st = new THREE.Group(); st.position.set(0, base, 0); st.rotation.set(0, a, 0); g.add(st); const stem = cyl(st, 0.006, 0.009, len, mat(shadeHex(color, 0.7)), 0, len / 2, 0, 5); const inner = new THREE.Group(); inner.rotation.x = tilt; st.add(inner); stem.parent.remove(stem); inner.add(stem); const lf = new THREE.Mesh(leafGeo(), m); lf.position.y = len; lf.rotation.x = 0.6 + r() * 0.5; lf.scale.setScalar((0.8 + r() * 0.5) * scale); lf.castShadow = true; inner.add(lf); } }
  B.f_monstera = (g) => { lathe(g, [[0, 0], [0.16, 0], [0.21, 0.34], [0.22, 0.36], [0.2, 0.36], [0, 0.34]], mat('#E9E1D3', { rough: 0.5 }), 0, 0, 0, 28); cyl(g, 0.19, 0.19, 0.01, mat('#4A3426'), 0, 0.33, 0, 20); plantLeaves(g, 11, 0.33, 0.42, '#2F7D4B', 0.7, 42, 1.4); plantLeaves(g, 6, 0.33, 0.25, '#3E9A5C', 0.3, 7, 1.1); };
  B.d_plant = (g) => { cyl(g, 0.055, 0.045, 0.08, mat('#C46A45', { rough: 0.6 }), 0, 0.04, 0, 16); plantLeaves(g, 7, 0.08, 0.06, '#3F8A4A', 0.6, 9, 0.45); };
  // ---- new cosy items ----
  B.f_candles = (g) => { const fl = []; [[0, 0.22, 0.05], [0.09, 0.15, 0.045], [-0.08, 0.11, 0.04]].forEach(([x, h, r]) => { cyl(g, r, r, h, mat('#F6EEDC', { rough: 0.6 }), x, h / 2, 0, 16); cyl(g, 0.003, 0.003, 0.02, mat('#222'), x, h + 0.01, 0, 4); const f = sph(g, 0.012, mat('#FFB347', { emissive: '#FFB347', ei: 4 }), x, h + 0.03, 0, 8, 6); f.scale.y = 2; f.castShadow = false; fl.push(f); }); cyl(g, 0.17, 0.17, 0.012, brass(), 0, 0.006, 0, 24); g.userData.update = (t) => fl.forEach((f, i) => { f.scale.y = 1.8 + Math.sin(t * 13 + i * 2) * 0.3; f.scale.x = 1 + Math.sin(t * 9 + i) * 0.15; }); g.userData.lightAt = [0, 0.3, 0]; g.userData.lightColor = '#FFA040'; g.userData.lightPower = 0.9; g.userData.flicker = true; };
  B.f_pendant = (g, d = {}) => { cyl(g, 0.005, 0.005, 1.4, mat('#222'), 0, 2.5, 0, 4); const sh = lathe(g, [[0.03, 0], [0.05, -0.02], [0.24, -0.2], [0.25, -0.22], [0.0, -0.22]], mat(d.c || '#2F7D5B', { double: true, rough: 0.4 }), 0, 1.8, 0, 32); sh.castShadow = false; sph(g, 0.05, mat('#FFF4D6', { emissive: '#FFE7B0', ei: 3 }), 0, 1.62, 0, 12, 8).castShadow = false; g.userData.lightAt = [0, 1.5, 0]; g.userData.lightPower = 1.4; };
  B.f_cushion = (g, d = {}) => { const F = fabM(d, '#E8803A'); const c = rbox(g, 0.6, 0.14, 0.6, 0.07, F, 0, 0.07, 0); sph(g, 0.02, mat('#000', { opacity: 0.25 }), 0, 0.145, 0, 8, 6); const c2 = rbox(g, 0.5, 0.12, 0.5, 0.06, fabM({}, '#F6F4EF'), 0.12, 0.2, -0.08); c2.rotation.y = 0.5; };
  B.f_teddy = (g) => { const F = fabM({}, '#B5835A'); const b = sph(g, 0.14, F, 0, 0.16, 0, 20, 16); b.scale.set(1, 1.1, 0.9); const h = sph(g, 0.11, F, 0, 0.36, 0.02, 20, 16); for (const sx of [-1, 1]) { sph(g, 0.04, F, sx * 0.08, 0.45, 0, 12, 8); sph(g, 0.05, F, sx * 0.13, 0.2, 0.06, 12, 8); sph(g, 0.055, F, sx * 0.08, 0.05, 0.09, 12, 8); sph(g, 0.014, mat('#111'), sx * 0.04, 0.38, 0.11, 8, 6); } const m = sph(g, 0.045, fabM({}, '#E9CDA8'), 0, 0.33, 0.1, 12, 8); m.scale.z = 0.7; sph(g, 0.015, mat('#111'), 0, 0.345, 0.135, 8, 6); const bow = tor(g, 0.07, 0.015, mat('#C7432F'), 0, 0.27, 0.05); bow.rotation.x = Math.PI / 2; };
  B.w_frames = (g) => { const cols = ['#E58BB0', '#7FB069', '#F2C14E', '#3E7CB1']; [[-0.35, 0.1, 0.3, 0.38], [0, -0.05, 0.28, 0.22], [0.32, 0.12, 0.26, 0.32], [0.02, 0.24, 0.2, 0.16]].forEach(([x, y, w, h], i) => { box(g, w + 0.04, h + 0.04, 0.025, woodM({ wd: i % 2 ? 'black' : 'oak' }), x, y, 0.012); const tex = PW.canvasTex(64, 64, (c) => { const gr = c.createLinearGradient(0, 0, 64, 64); gr.addColorStop(0, cols[i]); gr.addColorStop(1, '#22406E'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(22, 22, 9, 0, 7); c.fill(); c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.moveTo(0, 64); c.lineTo(26, 34); c.lineTo(44, 50); c.lineTo(64, 30); c.lineTo(64, 64); c.fill(); }); const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex })); p.position.set(x, y, 0.026); g.add(p); }); };
  B.w_cork = (g) => { box(g, 1.0, 0.7, 0.03, woodM({ wd: 'oak' }), 0, 0, 0.015); const tex = PW.canvasTex(256, 180, (c, w, h) => { c.fillStyle = '#C69C6D'; c.fillRect(0, 0, w, h); const r = U.seeded(2); for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '90,60,30' : '230,200,150'},.3)`; c.fillRect(r() * w, r() * h, 2, 2); } [['#FFF3A0', 30, 20, -0.1, 'YKS!'], ['#BDE4FF', 120, 30, 0.08, '4x25'], ['#FFC6D9', 60, 100, 0.05, 'Mola'], ['#C8F0C0', 170, 105, -0.06, 'Hedef']].forEach(([col, x, y, rot, txt]) => { c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = col; c.fillRect(0, 0, 70, 56); c.fillStyle = '#333'; c.font = 'bold 16px sans-serif'; c.fillText(txt, 8, 32); c.fillStyle = '#C7432F'; c.beginPath(); c.arc(35, 6, 5, 0, 7); c.fill(); c.restore(); }); }); const p = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.64), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 })); p.position.z = 0.031; g.add(p); };
  B.w_plantshelf = (g) => { rbox(g, 0.9, 0.035, 0.22, 0.01, woodM({ wd: 'light' }), 0, 0, 0.11); for (const sx of [-1, 1]) box(g, 0.02, 0.1, 0.18, brass(), sx * 0.32, -0.06, 0.09); const pl = new THREE.Group(); pl.position.set(-0.25, 0.02, 0.11); g.add(pl); B.d_plant(pl); const hang = new THREE.Group(); hang.position.set(0.22, 0.02, 0.11); g.add(hang); cyl(hang, 0.06, 0.05, 0.08, mat('#E9E1D3'), 0, 0.04, 0, 14); for (let i = 0; i < 6; i++) { const r = U.seeded(i + 4); const pts = []; for (let k = 0; k < 6; k++) pts.push(new THREE.Vector3(Math.sin(i) * 0.05 + (r() - 0.5) * 0.04, 0.07 - k * 0.08, 0.04 + Math.cos(i) * 0.03)); const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.006, 4), mat('#3F8A4A')); hang.add(tube); for (let k = 1; k < 6; k++) { const lf = sph(hang, 0.022, mat('#4C9A55', { rough: 0.5 }), pts[k].x + 0.015, pts[k].y, pts[k].z, 6, 4); lf.scale.set(1, 0.5, 0.7); } } books(g, 0.0, 0.02, 0.11, 0.2, 77, 0.16, 0.2); };

  // pets can have a name (user 2026-11-03): a little wooden sign with the name stands next to them
  function nameSign(g, text, x, z) {
    const st = new THREE.Group(); st.position.set(x, 0, z); g.add(st);
    cyl(st, 0.012, 0.012, 0.4, WOOD_D, 0, 0.2, 0, 6); st.rotation.y = 0.6;
    const tex = PW.canvasTex(256, 96, (c, w, h) => { c.fillStyle = '#C99A6B'; c.fillRect(0, 0, w, h); c.strokeStyle = '#7A4F31'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8); let fs = 50; c.font = `800 ${fs}px "Sora", sans-serif`; while (c.measureText(text).width > w - 30 && fs > 18) { fs -= 3; c.font = `800 ${fs}px "Sora", sans-serif`; } c.fillStyle = '#3A2414'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2 + 2); });
    box(st, 0.4, 0.15, 0.018, WOOD_L, 0, 0.42, 0);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.385, 0.142), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })); p.position.set(0, 0.42, 0.01); st.add(p);
  }
  for (const [id, x, z] of [['f_cat', 0.32, 0.1], ['f_dog', 0.45, 0.15], ['f_bunny', 0.28, 0.12], ['f_fishbowl', 0.3, 0.1], ['f_parrot', 0.32, 0.15]]) {
    const f = B[id]; if (!f) continue;
    B[id] = (g, d = {}) => { f(g, d); if (d.t) nameSign(g, String(d.t).slice(0, 12), x, z); };
  }

  /* -------------- aviation set ("Pist 25" hangar library, user 2026-11-08) -------------- */
  const AV_DARK = '#23272E', AV_PANEL = '#2E333B', AV_EDGE = '#3B414B';
  const screenGlow = (tex, k = 1.15) => new THREE.MeshStandardMaterial({ map: tex, emissive: '#FFFFFF', emissiveMap: tex, emissiveIntensity: k, roughness: 0.35 });
  function avScreen(kind) {
    return PW.canvasTex(256, 192, (c, w, h) => {
      c.fillStyle = '#05070B'; c.fillRect(0, 0, w, h);
      if (kind === 'pfd') {
        // attitude: sky over earth, a slightly banked horizon, pitch ladder, speed and altitude tapes
        c.save(); c.beginPath(); c.rect(48, 22, 160, 150); c.clip(); c.translate(128, 100); c.rotate(-0.08);
        c.fillStyle = '#1E73C8'; c.fillRect(-200, -200, 400, 200); c.fillStyle = '#8A5A2B'; c.fillRect(-200, 0, 400, 200);
        c.strokeStyle = '#FFFFFF'; c.lineWidth = 2; c.beginPath(); c.moveTo(-200, 0); c.lineTo(200, 0); c.stroke();
        c.lineWidth = 1.5; for (const p of [-30, -15, 15, 30]) { c.beginPath(); c.moveTo(-(p % 30 ? 14 : 24), p); c.lineTo(p % 30 ? 14 : 24, p); c.stroke(); }
        c.restore();
        c.strokeStyle = '#F2C14E'; c.lineWidth = 4; c.beginPath(); c.moveTo(92, 100); c.lineTo(116, 100); c.lineTo(122, 108); c.moveTo(164, 100); c.lineTo(140, 100); c.lineTo(134, 108); c.stroke();
        c.fillStyle = '#3A3F47'; c.fillRect(6, 22, 38, 150); c.fillRect(212, 22, 38, 150);
        c.fillStyle = '#FFFFFF'; c.font = 'bold 13px monospace'; c.textAlign = 'center';
        for (let i = -2; i <= 2; i++) { c.fillText(String(150 - i * 10), 25, 104 + i * 26); c.fillText(String(3500 - i * 100), 231, 104 + i * 26); }
        c.strokeStyle = '#2BE07A'; c.lineWidth = 2; c.strokeRect(6, 88, 38, 22); c.strokeRect(212, 88, 38, 22);
        c.fillStyle = '#D24BD2'; c.fillRect(44, 60, 4, 10);
        c.fillStyle = '#2BE07A'; c.font = 'bold 12px monospace'; c.fillText('SPEED   ALT   LOC  G/S', 128, 14);
      } else if (kind === 'nd') {
        // navigation display: compass arc, magenta route to the runway, a few green fixes
        c.strokeStyle = '#FFFFFF'; c.lineWidth = 2; c.beginPath(); c.arc(128, 176, 150, Math.PI * 1.18, Math.PI * 1.82); c.stroke();
        c.lineWidth = 1; for (let a = 0; a <= 12; a++) { const t = Math.PI * 1.18 + a * (Math.PI * 0.64 / 12); c.beginPath(); c.moveTo(128 + Math.cos(t) * 150, 176 + Math.sin(t) * 150); c.lineTo(128 + Math.cos(t) * 140, 176 + Math.sin(t) * 140); c.stroke(); }
        c.fillStyle = '#FFFFFF'; c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillText('25', 128, 20); c.fillText('22', 60, 40); c.fillText('28', 196, 40);
        c.strokeStyle = '#D24BD2'; c.lineWidth = 3; c.beginPath(); c.moveTo(128, 176); c.lineTo(128, 120); c.lineTo(170, 70); c.lineTo(160, 34); c.stroke();
        c.fillStyle = '#2BE07A'; for (const [x, y, n] of [[170, 70, 'ODAK'], [160, 34, 'HEDEF'], [80, 96, 'MOLA']]) { c.beginPath(); c.moveTo(x, y - 5); c.lineTo(x + 5, y); c.lineTo(x, y + 5); c.lineTo(x - 5, y); c.closePath(); c.fill(); c.fillText(n, x + (x > 128 ? 26 : -24), y + 4); }
        c.strokeStyle = '#2BE07A'; c.beginPath(); c.arc(128, 176, 70, Math.PI * 1.25, Math.PI * 1.75); c.stroke();
        c.fillStyle = '#F2C14E'; c.beginPath(); c.moveTo(128, 162); c.lineTo(136, 180); c.lineTo(120, 180); c.closePath(); c.fill();
        c.fillStyle = '#2BE07A'; c.textAlign = 'left'; c.fillText('GS 0  TAS 0', 8, 186); c.textAlign = 'right'; c.fillText('ESB 25 NM', 248, 186);
      } else {
        // engine display: two N1 dials and a status list
        for (const x of [70, 186]) {
          c.strokeStyle = '#FFFFFF'; c.lineWidth = 3; c.beginPath(); c.arc(x, 72, 40, Math.PI * 0.8, Math.PI * 2.2); c.stroke();
          c.strokeStyle = '#E8553D'; c.beginPath(); c.arc(x, 72, 40, Math.PI * 2.05, Math.PI * 2.2); c.stroke();
          c.strokeStyle = '#2BE07A'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, 72); c.lineTo(x + Math.cos(Math.PI * 1.55) * 36, 72 + Math.sin(Math.PI * 1.55) * 36); c.stroke();
          c.fillStyle = '#FFFFFF'; c.font = 'bold 14px monospace'; c.textAlign = 'center'; c.fillText('25.0', x, 104); c.font = '11px monospace'; c.fillText('N1', x, 126);
        }
        c.fillStyle = '#2BE07A'; c.font = 'bold 12px monospace'; c.textAlign = 'left';
        ['DOORS CLOSED', 'APU AVAIL', 'FOCUS  ARMED'].forEach((s, i) => c.fillText(s, 20, 150 + i * 15));
        c.fillStyle = '#4FB7FF'; c.fillText('T.O CONFIG OK', 150, 165);
      }
    });
  }
  // a desk with a sloped instrument panel, glareshield, side-stick, throttle quadrant and rudder pedals
  B.f_desk_cockpit = (g) => {
    rbox(g, 1.5, 0.05, 0.8, 0.02, AV_PANEL, 0, 0.735, 0);
    box(g, 1.46, 0.012, 0.012, mat('#E8B04A', { rough: 0.4, metal: 0.3 }), 0, 0.718, 0.4);
    for (const sx of [-1, 1]) box(g, 0.06, 0.71, 0.76, AV_DARK, sx * 0.71, 0.355, 0);
    box(g, 1.36, 0.42, 0.04, AV_DARK, 0, 0.5, -0.36);
    const p = new THREE.Group(); p.position.set(0, 0.76, -0.3); p.rotation.x = -0.38; g.add(p);
    box(p, 1.42, 0.34, 0.07, AV_DARK, 0, 0.17, 0);
    rbox(p, 1.48, 0.05, 0.2, 0.02, '#15181D', 0, 0.36, 0.04);
    [['pfd', -0.47], ['eicas', 0], ['nd', 0.47]].forEach(([k, x]) => {
      box(p, 0.39, 0.29, 0.01, '#0B0D11', x, 0.17, 0.036);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.27), screenGlow(avScreen(k))); s.position.set(x, 0.17, 0.043); p.add(s);
    });
    for (let i = 0; i < 6; i++) box(p, 0.035, 0.018, 0.012, glow(['#F2C14E', '#2BE07A', '#4FB7FF'][i % 3], 1.6), -0.6 + i * 0.03, 0.335, 0.04);
    // side-stick on the left (captain), throttle quadrant on the right
    cyl(g, 0.035, 0.045, 0.03, '#15181D', -0.6, 0.775, 0.12, 14);
    const st = PW.capsule(g, 0.018, 0.11, '#1C1F24', -0.6, 0.84, 0.12); st.rotation.x = -0.15;
    sph(g, 0.012, mat('#C7432F'), -0.6, 0.9, 0.105, 8, 6);
    rbox(g, 0.18, 0.07, 0.26, 0.015, '#1C1F24', 0.56, 0.79, 0.0);
    for (const sx of [-1, 1]) { const l = box(g, 0.012, 0.13, 0.012, metal('#AEB4BD'), 0.56 + sx * 0.04, 0.88, 0.02); l.rotation.x = -0.35; box(g, 0.05, 0.03, 0.04, mat('#15181D'), 0.56 + sx * 0.04, 0.94, 0.0); }
    // rudder pedals under the desk
    for (const sx of [-1, 1]) { const pd = rbox(g, 0.12, 0.2, 0.03, 0.01, '#3A3F47', sx * 0.18, 0.12, 0.05); pd.rotation.x = -0.5; }
  };
  // pilot seat: tall back with headrest, armrests and harness straps
  B.f_chair_pilot = (g) => {
    cyl(g, 0.24, 0.26, 0.05, AV_DARK, 0, 0.025, 0, 20); cyl(g, 0.05, 0.05, 0.36, metal('#8A9099'), 0, 0.22, 0, 12);
    for (const sz of [-1, 1]) box(g, 0.5, 0.03, 0.04, metal('#3A3F47'), 0, 0.06, sz * 0.18);
    rbox(g, 0.5, 0.1, 0.5, 0.04, '#3B3F46', 0, 0.45, 0.02);
    rbox(g, 0.44, 0.03, 0.42, 0.02, mat('#E9E2D6', { rough: 1 }), 0, 0.51, 0.03);
    const back = new THREE.Group(); back.position.set(0, 0.5, -0.22); back.rotation.x = -0.12; g.add(back);
    // a low sporty back, so the person in it still shows from behind (the room is seen from the back)
    rbox(back, 0.5, 0.4, 0.1, 0.04, '#3B3F46', 0, 0.2, 0);
    rbox(back, 0.42, 0.32, 0.02, 0.02, mat('#E9E2D6', { rough: 1 }), 0, 0.2, 0.05);
    for (const sx of [-1, 1]) box(back, 0.05, 0.32, 0.012, '#2F5FA8', sx * 0.1, 0.2, 0.066);
    box(back, 0.08, 0.06, 0.02, metal('#C9CED6'), 0, 0.12, 0.07);
    for (const sx of [-1, 1]) { rbox(g, 0.07, 0.05, 0.36, 0.02, '#2A2E34', sx * 0.27, 0.68, -0.01); box(g, 0.03, 0.18, 0.03, '#2A2E34', sx * 0.27, 0.58, -0.12); }
  };
  // turbofan engine on a display stand; the fan turns slowly (intake faces the front)
  B.f_jet_engine = (g) => {
    for (const sx of [-1, 1]) { box(g, 0.08, 0.06, 1.2, mat('#F2C14E', { rough: 0.5 }), sx * 0.34, 0.03, 0); for (const sz of [-1, 1]) box(g, 0.07, 0.44, 0.07, '#3A3F47', sx * 0.3, 0.25, sz * 0.32); }
    for (const sz of [-1, 1]) box(g, 0.68, 0.06, 0.08, '#3A3F47', 0, 0.46, sz * 0.32);
    const e = new THREE.Group(); e.position.set(0, 0.88, 0); e.rotation.y = -Math.PI / 2; g.add(e);
    const skin = mat('#C9CED6', { metal: 0.65, rough: 0.3, double: true });
    const nac = lathe(e, [[0.36, -0.5], [0.4, -0.35], [0.41, 0.1], [0.37, 0.48], [0.33, 0.5]], skin, 0, 0, 0, 40); nac.rotation.z = Math.PI / 2;
    const lip = tor(e, 0.355, 0.03, metal('#E6E9EE'), 0.5, 0, 0); lip.rotation.y = Math.PI / 2;
    const core = cyl(e, 0.2, 0.15, 0.9, metal('#7A808A'), -0.15, 0, 0, 28); core.rotation.z = Math.PI / 2;
    const nozzle = cone(e, 0.15, 0.32, metal('#5A5F68'), -0.72, 0, 0, 24); nozzle.rotation.z = Math.PI / 2;
    const fan = new THREE.Group(); fan.position.set(0.38, 0, 0); e.add(fan);
    const sp = cone(fan, 0.1, 0.2, metal('#ECEFF3'), 0.1, 0, 0, 24); sp.rotation.z = -Math.PI / 2;
    const bm = metal('#9EA5AF');
    for (let i = 0; i < 18; i++) { const b = new THREE.Group(); b.rotation.x = (i / 18) * Math.PI * 2; fan.add(b); const bl = box(b, 0.012, 0.25, 0.07, bm, 0, 0.2, 0); bl.rotation.y = 0.55; }
    const ring = tor(e, 0.4, 0.012, '#E8553D', -0.02, 0, 0); ring.rotation.y = Math.PI / 2;
    g.userData.update = (t) => (fan.rotation.x = t * 0.9);
  };
  // departures board; the "BİNİŞ" line blinks
  B.w_fids = (g) => {
    rbox(g, 1.5, 0.82, 0.06, 0.015, '#15181D', 0, 0, 0.03);
    const rows = [['07:25', 'PW 025', 'HAYALLERİN', 'A1', 'BİNİŞ'], ['08:10', 'TK 2124', 'ANKARA', 'B4', 'ZAMANINDA'], ['08:45', 'PW 050', 'DERİN ODAK', 'C2', 'ZAMANINDA'], ['09:30', 'TK 1985', 'LONDRA', 'D7', 'ZAMANINDA'], ['10:05', 'PW 090', 'MARATON', 'E3', 'ERTELENDİ'], ['11:20', 'TK 0001', 'NEW YORK', 'F1', 'ZAMANINDA']];
    const tex = PW.canvasTex(512, 280, () => {});
    const draw = (on) => { const c = tex.userData.ctx, w = 512, h = 280; c.fillStyle = '#0A0C10'; c.fillRect(0, 0, w, h); c.fillStyle = '#F2C14E'; c.font = 'bold 22px monospace'; c.textAlign = 'left'; c.fillText('KALKIŞ  ·  DEPARTURES', 14, 30); c.fillStyle = '#2B3038'; c.fillRect(10, 40, w - 20, 2);
      rows.forEach((r, i) => { const y = 70 + i * 34; c.fillStyle = i % 2 ? '#11141A' : '#0D1015'; c.fillRect(10, y - 22, w - 20, 30); c.font = 'bold 17px monospace'; c.fillStyle = '#FFD27A'; c.fillText(r[0], 16, y); c.fillText(r[1], 86, y); c.fillStyle = '#F6F0E8'; c.fillText(r[2], 182, y); c.fillStyle = '#FFD27A'; c.fillText(r[3], 342, y); const st = r[4]; c.fillStyle = st === 'BİNİŞ' ? '#2BE07A' : st === 'ERTELENDİ' ? '#E8553D' : '#9FD0FF'; if (st !== 'BİNİŞ' || on) c.fillText(st, 384, y); }); tex.needsUpdate = true; };
    draw(true);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.76), screenGlow(tex, 1.0)); s.position.z = 0.062; g.add(s);
    let last = -1; g.userData.update = (t) => { const k = Math.floor(t * 1.4) % 2; if (k !== last) { last = k; draw(k === 0); } };
    g.userData.lightAt = [0, 0, 0.4]; g.userData.lightColor = '#FFD27A'; g.userData.lightPower = 0.3;
  };
  // the classic "six pack" of flight instruments; needles move
  B.w_gauges = (g) => {
    rbox(g, 1.1, 0.74, 0.06, 0.02, '#1C1F24', 0, 0, 0.03);
    const names = ['HIZ', 'UFUK', 'İRTİFA', 'DÖNÜŞ', 'PUSULA', 'DİKEY'];
    const needles = [];
    names.forEach((n, i) => {
      const x = -0.34 + (i % 3) * 0.34, y = i < 3 ? 0.17 : -0.17;
      cyl(g, 0.15, 0.15, 0.03, metal('#3A3F47'), x, y, 0.07, 28).rotation.x = Math.PI / 2;
      const face = PW.canvasTex(128, 128, (c, w, h) => {
        c.fillStyle = '#0C0E12'; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill();
        if (n === 'UFUK') { c.save(); c.beginPath(); c.arc(64, 64, 56, 0, 7); c.clip(); c.fillStyle = '#1E73C8'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#8A5A2B'; c.fillRect(0, 64, 128, 64); c.strokeStyle = '#FFF'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 64); c.lineTo(128, 64); c.stroke(); c.restore(); c.strokeStyle = '#F2C14E'; c.lineWidth = 4; c.beginPath(); c.moveTo(34, 66); c.lineTo(56, 66); c.moveTo(72, 66); c.lineTo(94, 66); c.stroke(); }
        else { c.strokeStyle = '#F6F0E8'; c.lineWidth = 2; for (let k = 0; k < 36; k++) { const a = (k / 36) * Math.PI * 2; const r1 = k % 3 ? 52 : 46; c.beginPath(); c.moveTo(64 + Math.cos(a) * r1, 64 + Math.sin(a) * r1); c.lineTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58); c.stroke(); } if (n === 'HIZ') { c.strokeStyle = '#2BE07A'; c.lineWidth = 5; c.beginPath(); c.arc(64, 64, 55, 2.6, 4.6); c.stroke(); c.strokeStyle = '#E8553D'; c.beginPath(); c.arc(64, 64, 55, 5.6, 5.75); c.stroke(); } }
        c.fillStyle = '#F6F0E8'; c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.fillText(n, 64, 96);
      });
      const fm = new THREE.Mesh(new THREE.CircleGeometry(0.13, 32), screenGlow(face, 0.55)); fm.position.set(x, y, 0.087); g.add(fm);
      if (n !== 'UFUK') { const nd = new THREE.Group(); nd.position.set(x, y, 0.092); g.add(nd); box(nd, 0.012, 0.11, 0.006, mat('#F6F0E8', { emissive: '#F6F0E8', ei: 0.6 }), 0, 0.045, 0); needles.push([nd, i]); }
      tor(g, 0.135, 0.008, metal('#8A9099'), x, y, 0.09);
    });
    g.userData.update = (t) => { for (const [nd, i] of needles) nd.rotation.z = i === 2 ? -t * 0.2 : i === 4 ? t * 0.05 : -1.2 + Math.sin(t * 0.6 + i) * 0.35; };
  };
  // approach chart for runway 25
  B.w_chart = (g) => framed(g, 0.62, 0.86, PW.canvasTex(256, 356, (c, w, h) => {
    c.fillStyle = '#FBF8F0'; c.fillRect(0, 0, w, h); c.fillStyle = '#1C2A44'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center'; c.fillText('ILS  PİST 25', w / 2, 26); c.font = '11px sans-serif'; c.fillText('POMODORO WORLD · YAKLAŞMA KARTI', w / 2, 42);
    c.strokeStyle = '#1C2A44'; c.lineWidth = 1; c.strokeRect(12, 52, w - 24, 190);
    c.strokeStyle = '#B8C7D6'; for (let r = 30; r < 100; r += 22) { c.beginPath(); c.arc(w / 2, 150, r, 0, 7); c.stroke(); }
    c.fillStyle = '#2A2B33'; c.save(); c.translate(w / 2, 150); c.rotate(0.35); c.fillRect(-5, -34, 10, 68); c.restore();
    c.strokeStyle = '#C7432F'; c.lineWidth = 2; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(w / 2 + 24, 85); c.lineTo(w / 2 - 50, 230); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#1C2A44'; c.font = 'bold 11px sans-serif'; c.fillText('245°', w / 2 + 52, 96); c.fillText('ODAK', w / 2 - 54, 214);
    c.strokeStyle = '#1C2A44'; c.strokeRect(12, 252, w - 24, 90); c.beginPath(); c.moveTo(24, 268); c.lineTo(w - 30, 330); c.stroke(); c.fillRect(w - 40, 330, 24, 4);
    c.font = '10px sans-serif'; c.textAlign = 'left'; c.fillText('3° süzülüş', 30, 300); c.fillText('KARAR: HEDEF', 140, 280);
  }), '#2A2B33');
  // a wooden two-blade propeller on the wall
  B.w_propeller = (g) => {
    const W = mat('#9C5B2E', { rough: 0.5 });
    for (const s of [-1, 1]) { const bl = lathe(g, [[0, 0], [0.06, 0.05], [0.075, 0.3], [0.05, 0.7], [0, 0.76]], W, 0, 0, 0.05, 14); bl.scale.set(1, 1, 0.3); bl.rotation.z = s * Math.PI / 2; for (const yy of [0.68]) { const tip = cyl(g, 0.045, 0.04, 0.06, mat('#E6E9EE', { metal: 0.6, rough: 0.3 }), s * yy, 0, 0.05, 12); tip.rotation.z = Math.PI / 2; tip.scale.z = 0.4; } }
    cyl(g, 0.09, 0.09, 0.08, metal('#C9CED6'), 0, 0, 0.06, 20).rotation.x = Math.PI / 2;
    cone(g, 0.07, 0.1, metal('#E6E9EE'), 0, 0, 0.14, 20).rotation.x = Math.PI / 2;
  };
  // pilot headset on the desk
  B.d_headset = (g) => {
    const band = tor(g, 0.085, 0.01, '#2A2B33', 0, 0.09, 0, Math.PI); band.rotation.y = 0.3;
    for (const s of [-1, 1]) { const cup = cyl(g, 0.045, 0.05, 0.04, '#3A3F47', s * 0.08, 0.04, 0, 18); cup.rotation.z = Math.PI / 2; cup.position.x = s * 0.08 * Math.cos(0.3); cup.position.z = -s * 0.08 * Math.sin(0.3); }
    const mic = cyl(g, 0.004, 0.004, 0.12, '#15181D', 0.05, 0.04, 0.07, 6); mic.rotation.set(Math.PI / 2, 0, 0.6); sph(g, 0.012, '#15181D', 0.02, 0.04, 0.12, 8, 6);
  };
  // pilot logbook
  B.d_logbook = (g) => { rbox(g, 0.22, 0.03, 0.16, 0.006, '#1F3A5F', 0, 0.015, 0); box(g, 0.2, 0.022, 0.003, '#F6F0E8', 0.002, 0.016, 0.0805); box(g, 0.08, 0.002, 0.03, mat('#E8B04A', { metal: 0.6, rough: 0.3 }), 0, 0.031, -0.02); };

  PW.buildItem = function (id, data = {}) {
    const g = new THREE.Group();
    const f = B[id];
    if (f) f(g, data); else box(g, 0.3, 0.3, 0.3, '#F0F', 0, 0.15, 0);
    g.userData.itemId = id;
    return g;
  };
  PW.hasModel = (id) => !!B[id];

  /* -------------- seats -------------- */
  PW.seatsFor = function (id) {
    const d = PW.ITEM[id];
    if (!d || !d.seat) return [];
    if (id === 'f_sofa') return [{ x: -0.45, z: 0.08, h: 0.48 }, { x: 0.45, z: 0.08, h: 0.48 }];
    if (id === 'f_sofa_l') return [{ x: -0.95, z: 0.08, h: 0.48 }, { x: -0.1, z: 0.08, h: 0.48 }, { x: 0.85, z: 0.6, h: 0.48, ry: Math.PI / 2 * 0 }];
    if (id === 'f_armchair') return [{ x: 0, z: 0.1, h: 0.48 }];
    if (id === 'f_beanbag') return [{ x: 0, z: 0.1, h: 0.42 }];
    if (id === 'f_cushion') return [{ x: 0, z: 0, h: 0.2 }];
    if (id === 'f_stool') return [{ x: 0, z: 0, h: 0.48 }];
    if (id === 'f_chair_gaming') return [{ x: 0, z: 0.02, h: 0.51 }];
    if (id === 'f_chair_office') return [{ x: 0, z: 0.02, h: 0.49 }];
    if (id === 'f_chair_pilot') return [{ x: 0, z: 0.04, h: 0.51 }];
    return [{ x: 0, z: 0.02, h: 0.5 }];
  };

  /* -------------- room surfaces -------------- */
  const texCache = {};
  PW.floorTex = function (th, size) {
    const key = 'f' + th.id;
    if (texCache[key]) { const t = texCache[key]; t.repeat.set(size / 2, size / 2); return t; }
    const t = PW.canvasTex(512, 512, (c, w, h) => {
      c.fillStyle = th.floor; c.fillRect(0, 0, w, h);
      const r = U.seeded(U.hashStr(th.id));
      if (th.pat === 'plank') {
        for (let i = 0; i < 8; i++) { const off = r() * 400; for (let j = -1; j < 3; j++) { c.fillStyle = r() < 0.5 ? th.floor : th.floor2; c.globalAlpha = 0.35 + r() * 0.3; c.fillRect(j * 256 + off % 256, i * 64, 254, 62); } }
        c.globalAlpha = 0.25; c.strokeStyle = '#000'; for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); }
        c.globalAlpha = 0.08; for (let i = 0; i < 300; i++) { c.fillStyle = r() < 0.5 ? '#000' : '#fff'; c.fillRect(r() * w, r() * h, 30 + r() * 80, 1); }
      } else if (th.pat === 'tile') {
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? th.floor : th.floor2; c.fillRect(i * 128 + 2, j * 128 + 2, 124, 124); }
      } else if (th.pat === 'herring') {
        c.fillStyle = th.floor2; c.fillRect(0, 0, w, h);
        for (let y = -2; y < 10; y++) for (let x = -2; x < 10; x++) { c.save(); c.translate(x * 64 + (y % 2) * 32, y * 64); c.rotate((x + y) % 2 ? Math.PI / 4 : -Math.PI / 4); c.fillStyle = r() < 0.5 ? th.floor : th.floor2; c.fillRect(-42, -10, 84, 20); c.restore(); }
      } else if (th.pat === 'concrete') {
        for (let i = 0; i < 2000; i++) { c.fillStyle = 'rgba(' + (r() < 0.5 ? '0,0,0' : '255,255,255') + ',' + r() * 0.08 + ')'; c.fillRect(r() * w, r() * h, 3, 3); }
        c.strokeStyle = 'rgba(0,0,0,.2)'; c.strokeRect(0, 0, w, h);
      } else if (th.pat === 'tatami') {
        for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? th.floor : th.floor2; c.fillRect(i * 256 + 4, j * 128 + 4, 248, 120); c.strokeStyle = '#3A5A2E'; c.lineWidth = 6; c.strokeRect(i * 256 + 4, j * 128 + 4, 248, 120); }
        c.globalAlpha = 0.15; for (let y = 0; y < h; y += 4) { c.fillStyle = '#000'; c.fillRect(0, y, w, 1); }
      } else if (th.pat === 'carpet') {
        for (let i = 0; i < 4000; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.07})`; c.fillRect(r() * w, r() * h, 2, 2); }
      } else if (th.pat === 'checker') {
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? th.floor : th.floor2; c.fillRect(i * 64, j * 64, 64, 64); }
      } else if (th.pat === 'terrazzo') {
        const chips = ['#E8553D', '#F2C14E', '#3E7CB1', '#F4F1EC', '#2F3542', th.floor2];
        for (let i = 0; i < 520; i++) { c.fillStyle = chips[Math.floor(r() * chips.length)]; c.globalAlpha = 0.55 + r() * 0.4; c.beginPath(); const x = r() * w, y = r() * h, s2 = 3 + r() * 9; c.moveTo(x, y); c.lineTo(x + s2, y + r() * s2); c.lineTo(x + r() * s2, y + s2); c.fill(); }
        c.globalAlpha = 1;
      } else if (th.pat === 'hex') {
        const R6 = 36, hh = Math.sqrt(3) * R6;
        c.fillStyle = 'rgba(40,30,20,.35)'; c.fillRect(0, 0, w, h);
        for (let row = -1; row < h / hh + 1; row++) for (let col = -1; col < w / (R6 * 1.5) + 1; col++) {
          const cx = col * R6 * 1.5, cy = row * hh + (col % 2 ? hh / 2 : 0);
          c.fillStyle = r() < 0.18 ? th.floor2 : th.floor; c.beginPath(); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; c.lineTo(cx + Math.cos(a) * (R6 - 3), cy + Math.sin(a) * (R6 - 3)); } c.fill();
        }
      } else if (th.pat === 'marble') {
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 2; c.strokeRect(i * 128, j * 128, 128, 128); }
        c.lineCap = 'round';
        for (let v = 0; v < 22; v++) { c.strokeStyle = r() < 0.5 ? 'rgba(90,90,100,.22)' : 'rgba(190,160,110,.25)'; c.lineWidth = 1 + r() * 2.5; c.beginPath(); let x = r() * w, y = r() * h; c.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - 0.3) * 70; y += (r() - 0.5) * 60; c.lineTo(x, y); } c.stroke(); }
      } else if (th.pat === 'panel') {
        c.fillStyle = th.floor2; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { c.fillStyle = th.floor; c.fillRect(i * 256 + 6, j * 256 + 6, 244, 244); c.fillStyle = 'rgba(43,179,201,.5)'; c.fillRect(i * 256 + 20, j * 256 + 124, 216, 6); }
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(size / 2, size / 2);
    texCache[key] = t; return t;
  };
  PW.wallTex = function (th) {
    const key = 'w' + th.id; if (texCache[key]) return texCache[key];
    const t = PW.canvasTex(512, 512, (c, w, h) => {
      c.fillStyle = th.wall; c.fillRect(0, 0, w, h);
      const r = U.seeded(U.hashStr(th.id) + 1);
      const p = th.wallpat;
      if (p === 'brick') { for (let y = 0; y < 16; y++) for (let x = -1; x < 5; x++) { c.fillStyle = r() < 0.5 ? th.wall : th.wall2; c.fillRect(x * 128 + (y % 2) * 64 + 3, y * 32 + 3, 122, 26); } }
      else if (p === 'shoji') { c.fillStyle = '#F6F0E2'; c.fillRect(0, 0, w, h); c.fillStyle = th.trim; for (let i = 0; i <= 4; i++) c.fillRect(i * 128 - 4, 0, 8, h); for (let j = 0; j <= 6; j++) c.fillRect(0, j * 85 - 3, w, 6); }
      else if (p === 'logs') { for (let y = 0; y < 8; y++) { const gr = c.createLinearGradient(0, y * 64, 0, y * 64 + 64); gr.addColorStop(0, th.wall2); gr.addColorStop(0.5, th.wall); gr.addColorStop(1, th.wall2); c.fillStyle = gr; c.fillRect(0, y * 64, w, 62); } }
      else if (p === 'wainscot') { c.fillStyle = th.wall2; for (let i = 0; i < 8; i++) c.fillRect(i * 64 + 30, 0, 4, h * 0.62); c.fillStyle = '#5A3A26'; c.fillRect(0, h * 0.62, w, h * 0.38); c.fillStyle = th.trim; c.fillRect(0, h * 0.62, w, 8); c.fillStyle = '#47291A'; for (let i = 0; i < 4; i++) c.fillRect(i * 128 + 14, h * 0.68, 100, h * 0.26); }
      else if (p === 'cini') { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const cx = x * 128 + 64, cy = y * 128 + 64; c.strokeStyle = '#B8C7D6'; c.strokeRect(x * 128, y * 128, 128, 128); c.fillStyle = '#1F5FA8'; for (let k = 0; k < 8; k++) { c.save(); c.translate(cx, cy); c.rotate(k * Math.PI / 4); c.beginPath(); c.ellipse(0, -30, 9, 24, 0, 0, 7); c.fill(); c.restore(); } c.fillStyle = '#C7432F'; c.beginPath(); c.arc(cx, cy, 12, 0, 7); c.fill(); c.fillStyle = '#2F9A8B'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x * 128 + (k % 2) * 128, y * 128 + (k > 1 ? 128 : 0), 14, 0, 7); c.fill(); } } }
      else if (p === 'cockpit') {
        // cockpit side panels: riveted plates, a few switch rows and small annunciator lamps
        for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const px = x * 128 + 5, py = y * 128 + 5; c.fillStyle = (x + y) % 2 ? th.wall : th.wall2; c.fillRect(px, py, 118, 118); c.fillStyle = 'rgba(255,255,255,.18)'; for (const [rx, ry] of [[8, 8], [110, 8], [8, 110], [110, 110]]) { c.beginPath(); c.arc(px + rx, py + ry, 3, 0, 7); c.fill(); }
          if (r() < 0.45) { const n = 3 + Math.floor(r() * 4); for (let k = 0; k < n; k++) { c.fillStyle = '#15181D'; c.fillRect(px + 18 + k * 22, py + 40, 12, 26); c.fillStyle = '#C9CED6'; c.fillRect(px + 21 + k * 22, py + (r() < 0.5 ? 42 : 54), 6, 10); } }
          if (r() < 0.35) { c.fillStyle = ['#F2C14E', '#2BE07A', '#4FB7FF', '#E8553D'][Math.floor(r() * 4)]; c.fillRect(px + 20, py + 84, 30, 12); c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(px + 56, py + 84, 30, 12); } }
        c.fillStyle = th.trim; c.fillRect(0, 252, w, 4); }
      else if (p === 'panel') { for (let y = 0; y < 4; y++) for (let x = 0; x < 2; x++) { c.fillStyle = r() < 0.5 ? th.wall : th.wall2; c.fillRect(x * 256 + 4, y * 128 + 4, 248, 120); } c.fillStyle = th.trim; c.fillRect(0, 250, w, 6); }
      else if (p === 'stripe') { for (let x = 0; x < w; x += 64) { c.fillStyle = th.wall2; c.fillRect(x, 0, 28, h); } }
      else if (p === 'dots') { c.fillStyle = th.wall2; for (let y = 16; y < h; y += 48) for (let x = (y / 48) % 2 ? 40 : 16; x < w; x += 48) { c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill(); } }
      else if (p === 'floral') { for (let y = 32; y < h; y += 96) for (let x = (y / 96) % 2 ? 80 : 32; x < w; x += 96) { c.fillStyle = th.wall2; for (let k = 0; k < 5; k++) { const a = k * 1.256; c.beginPath(); c.ellipse(x + Math.cos(a) * 10, y + Math.sin(a) * 10, 8, 5, a, 0, 7); c.fill(); } c.fillStyle = th.trim || '#F2C14E'; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); } }
      else if (p === 'stars') { c.fillStyle = th.wall2; for (let i = 0; i < 46; i++) { const x = r() * w, y = r() * h, s2 = 5 + r() * 9; c.beginPath(); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? s2 * 0.45 : s2; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill(); } }
      else if (p === 'clouds') { c.fillStyle = th.wall2; for (let y = 50; y < h; y += 128) for (let x = (y / 128) % 2 ? 90 : 20; x < w + 60; x += 180) { for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + k * 18, y + (k % 2 ? -8 : 0), 16 + (k % 3) * 4, 0, 7); c.fill(); } } }
      else if (p === 'plaid') { c.globalAlpha = 0.35; c.fillStyle = th.wall2; for (let x = 0; x < w; x += 128) c.fillRect(x, 0, 48, h); for (let y = 0; y < h; y += 128) c.fillRect(0, y, w, 48); c.globalAlpha = 0.5; c.fillStyle = th.trim || '#C7432F'; for (let x = 60; x < w; x += 128) c.fillRect(x, 0, 4, h); for (let y = 60; y < h; y += 128) c.fillRect(0, y, w, 4); c.globalAlpha = 1; }
      else if (p === 'geo') { c.strokeStyle = th.wall2; c.lineWidth = 5; for (let y = 0; y < h + 64; y += 64) for (let x = 0; x < w + 64; x += 64) { c.beginPath(); c.moveTo(x, y + 32); c.lineTo(x + 32, y); c.lineTo(x + 64, y + 32); c.lineTo(x + 32, y + 64); c.closePath(); c.stroke(); } }
      else if (p === 'wave') { c.strokeStyle = th.wall2; c.lineWidth = 6; for (let y = 0; y < h; y += 40) { c.beginPath(); for (let x = 0; x <= w; x += 8) c.lineTo(x, y + Math.sin(x / 26) * 8); c.stroke(); } }
      else { c.globalAlpha = 0.05; for (let i = 0; i < 1500; i++) { c.fillStyle = r() < 0.5 ? '#000' : '#fff'; c.fillRect(r() * w, r() * h, 2, 2); } }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    texCache[key] = t; return t;
  };

  /* -------------- window views -------------- */
  function sky(c, w, h, stops) { const g = c.createLinearGradient(0, 0, 0, h); stops.forEach(([o, col]) => g.addColorStop(o, col)); c.fillStyle = g; c.fillRect(0, 0, w, h); }
  function stars(c, w, h, n, r) { for (let i = 0; i < n; i++) { c.fillStyle = 'rgba(255,255,255,' + (0.3 + r() * 0.7) + ')'; const s = r() < 0.1 ? 2 : 1; c.fillRect(r() * w, r() * h, s, s); } }
  function skyline(c, w, h, base, col, r, lit) { let x = 0; while (x < w) { const bw = 30 + r() * 60, bh = 60 + r() * 180; c.fillStyle = col; c.fillRect(x, base - bh, bw, bh); if (lit) for (let yy = base - bh + 8; yy < base - 6; yy += 12) for (let xx = x + 5; xx < x + bw - 6; xx += 10) if (r() < lit) { c.fillStyle = r() < 0.8 ? '#FFD58A' : '#BDE4FF'; c.fillRect(xx, yy, 5, 6); } x += bw + 2; } }
  function mountains(c, w, base, amp, col, r, peaks = 5) { c.fillStyle = col; c.beginPath(); c.moveTo(0, base); for (let i = 0; i <= peaks * 4; i++) { const x = (i / (peaks * 4)) * w; const y = base - amp * (0.4 + 0.6 * Math.abs(Math.sin(i * 0.8 + r() * 0.6))) * (i % 2 ? 0.7 : 1); c.lineTo(x, y); } c.lineTo(w, base + 400); c.lineTo(0, base + 400); c.fill(); }
  function tree(c, x, y, s, col) { c.fillStyle = col; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x, y - s * (1.2 - i * 0.35)); c.lineTo(x + s * (0.35 + i * 0.12), y - s * (0.5 - i * 0.3)); c.lineTo(x - s * (0.35 + i * 0.12), y - s * (0.5 - i * 0.3)); c.fill(); } }
  const VIEWS = {
    v_city_day(c, w, h, r) { sky(c, w, h, [[0, '#7FB8E8'], [0.7, '#CFE6F5'], [1, '#EAF3F8']]); c.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 6; i++) { const x = r() * w, y = 40 + r() * 120; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + k * 26, y + Math.sin(k) * 8, 22 + r() * 10, 0, 7); c.fill(); } } skyline(c, w, h, h, '#9DB0C4', r, 0); skyline(c, w, h, h, '#6E819A', r, 0); c.fillStyle = '#4C8C4A'; for (let i = 0; i < 20; i++) { c.beginPath(); c.arc(r() * w, h - 10, 20 + r() * 20, 0, 7); c.fill(); } },
    v_city_night(c, w, h, r) { sky(c, w, h, [[0, '#0B1030'], [0.6, '#2A2560'], [1, '#6A3C7A']]); stars(c, w, h * 0.5, 120, r); c.fillStyle = '#F6F0D8'; c.beginPath(); c.arc(w * 0.8, 80, 30, 0, 7); c.fill(); skyline(c, w, h, h, '#262448', r, 0.15); skyline(c, w, h, h, '#16152E', r, 0.35); },
    v_mountain(c, w, h, r) { sky(c, w, h, [[0, '#8EC5F0'], [0.6, '#E2F0F7'], [1, '#F6E8D2']]); mountains(c, w, h * 0.62, 200, '#9AA9C4', r, 4); c.fillStyle = '#FFFFFF'; mountains(c, w, h * 0.62, 120, 'rgba(255,255,255,0)', r); mountains(c, w, h * 0.7, 130, '#6F87A6', r, 6); c.fillStyle = '#5B9AC9'; c.fillRect(0, h * 0.72, w, h * 0.15); c.fillStyle = 'rgba(255,255,255,.3)'; for (let i = 0; i < 30; i++) c.fillRect(r() * w, h * 0.73 + r() * h * 0.12, 30 + r() * 40, 2); c.fillStyle = '#3F6B3E'; c.fillRect(0, h * 0.86, w, h); for (let i = 0; i < 40; i++) tree(c, r() * w, h * 0.9 + r() * 30, 40 + r() * 30, '#2E5232'); },
    v_bosphorus(c, w, h, r) { sky(c, w, h, [[0, '#F2A65A'], [0.5, '#F7C98B'], [1, '#FBE3C0']]); c.fillStyle = '#FFE7A8'; c.beginPath(); c.arc(w * 0.25, h * 0.45, 40, 0, 7); c.fill(); c.fillStyle = '#8C6A7E'; mountains(c, w, h * 0.6, 50, '#8C6A7E', r, 8); c.fillStyle = '#6E4F66'; c.beginPath(); c.moveTo(w * 0.55, h * 0.6); for (let i = 0; i < 7; i++) { const x = w * 0.58 + i * 30; c.lineTo(x, h * 0.6 - 30 - r() * 20); } c.lineTo(w, h * 0.6); c.fill(); const mx = w * 0.7; c.fillStyle = '#5A3F55'; c.beginPath(); c.arc(mx, h * 0.55, 40, Math.PI, 0); c.fill(); c.fillRect(mx - 40, h * 0.55, 80, 30); for (const dx of [-60, 60]) { c.fillRect(mx + dx - 4, h * 0.38, 8, h * 0.22); c.beginPath(); c.moveTo(mx + dx - 5, h * 0.38); c.lineTo(mx + dx, h * 0.31); c.lineTo(mx + dx + 5, h * 0.38); c.fill(); } c.fillStyle = '#3D6E99'; c.fillRect(0, h * 0.62, w, h); c.fillStyle = 'rgba(255,220,150,.45)'; for (let i = 0; i < 40; i++) c.fillRect(w * 0.15 + r() * w * 0.2, h * 0.64 + r() * h * 0.3, 20 + r() * 30, 2); c.strokeStyle = '#3A2E3A'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, h * 0.56); c.lineTo(w, h * 0.5); c.stroke(); c.lineWidth = 2; c.fillStyle = '#3A2E3A'; for (const tx of [w * 0.3, w * 0.75]) { c.fillRect(tx - 5, h * 0.25, 10, h * 0.4); } c.beginPath(); c.moveTo(0, h * 0.5); c.quadraticCurveTo(w * 0.3, h * 0.2, w * 0.3, h * 0.25); c.quadraticCurveTo(w * 0.52, h * 0.52, w * 0.75, h * 0.25); c.quadraticCurveTo(w * 0.85, h * 0.4, w, h * 0.45); c.stroke(); for (let i = 0; i < 30; i++) { const x = w * 0.3 + i * (w * 0.45 / 30); const yc = h * 0.25 + Math.sin((i / 30) * Math.PI) * h * 0.27; c.beginPath(); c.moveTo(x, yc); c.lineTo(x, h * 0.535 - (x / w) * h * 0.06); c.stroke(); } c.fillStyle = '#F6F4EF'; c.beginPath(); c.moveTo(w * 0.42, h * 0.8); c.lineTo(w * 0.52, h * 0.8); c.lineTo(w * 0.5, h * 0.83); c.lineTo(w * 0.44, h * 0.83); c.fill(); c.fillRect(w * 0.455, h * 0.775, 25, 8); },
    v_beach(c, w, h, r) { sky(c, w, h, [[0, '#4A3A78'], [0.45, '#E86A5A'], [0.62, '#F7B267'], [1, '#F7B267']]); c.fillStyle = '#FFE08A'; c.beginPath(); c.arc(w * 0.5, h * 0.6, 55, Math.PI, 0); c.fill(); c.fillStyle = '#2E5E8C'; c.fillRect(0, h * 0.6, w, h * 0.25); c.fillStyle = 'rgba(255,224,138,.5)'; for (let i = 0; i < 40; i++) c.fillRect(w * 0.5 - 60 + r() * 120, h * 0.62 + r() * h * 0.2, 10 + r() * 30, 2); c.fillStyle = '#E9C99A'; c.beginPath(); c.moveTo(0, h * 0.85); c.quadraticCurveTo(w * 0.5, h * 0.8, w, h * 0.86); c.lineTo(w, h); c.lineTo(0, h); c.fill(); c.strokeStyle = '#2A1F2E'; c.lineWidth = 8; c.beginPath(); c.moveTo(w * 0.1, h); c.quadraticCurveTo(w * 0.12, h * 0.6, w * 0.18, h * 0.42); c.stroke(); c.fillStyle = '#2A1F2E'; for (let k = 0; k < 6; k++) { c.save(); c.translate(w * 0.18, h * 0.42); c.rotate(k * 1.05); c.beginPath(); c.ellipse(45, 0, 50, 10, 0.3, 0, 7); c.fill(); c.restore(); } },
    v_cappadocia(c, w, h, r) { sky(c, w, h, [[0, '#8EC5F0'], [0.55, '#F9D7B5'], [1, '#F6C59A']]); const cols = ['#C7432F', '#F2C14E', '#3E7CB1', '#E58BB0', '#7FB069', '#E8803A']; for (let i = 0; i < 14; i++) { const x = r() * w, y = 30 + r() * h * 0.45, s = 8 + r() * 22; const col = cols[i % cols.length]; c.fillStyle = col; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x - s * 0.2, y - s, s * 0.4, s * 2); c.fillStyle = '#6B4630'; c.fillRect(x - s * 0.25, y + s * 1.25, s * 0.5, s * 0.35); c.strokeStyle = '#6B4630'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - s * 0.7, y + s * 0.6); c.lineTo(x - s * 0.25, y + s * 1.25); c.moveTo(x + s * 0.7, y + s * 0.6); c.lineTo(x + s * 0.25, y + s * 1.25); c.stroke(); } c.fillStyle = '#E2B48A'; for (let i = 0; i < 12; i++) { const x = r() * w, ch = 80 + r() * 120, cw = 30 + r() * 30; c.beginPath(); c.moveTo(x - cw, h); c.quadraticCurveTo(x - cw * 0.4, h - ch, x, h - ch - 10); c.quadraticCurveTo(x + cw * 0.4, h - ch, x + cw, h); c.fill(); c.fillStyle = '#C9946A'; c.beginPath(); c.arc(x, h - ch - 10, cw * 0.35, Math.PI, 0); c.fill(); c.fillStyle = '#6B4630'; c.fillRect(x - 4, h - ch * 0.6, 8, 12); c.fillStyle = '#E2B48A'; } c.fillStyle = '#C9946A'; c.fillRect(0, h * 0.92, w, h); },
    v_snow(c, w, h, r) { sky(c, w, h, [[0, '#A9BFD6'], [1, '#E8EEF4']]); mountains(c, w, h * 0.6, 120, '#C9D5E2', r, 5); c.fillStyle = '#F6F8FB'; c.fillRect(0, h * 0.75, w, h); for (let i = 0; i < 50; i++) { const x = r() * w, y = h * 0.65 + r() * h * 0.3, s = 30 + r() * 50; tree(c, x, y, s, '#2E5246'); c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(x, y - s * 1.2); c.lineTo(x + s * 0.15, y - s * 0.95); c.lineTo(x - s * 0.15, y - s * 0.95); c.fill(); } },
    v_rain(c, w, h, r, t) { sky(c, w, h, [[0, '#1B2233'], [1, '#3A4A66']]); skyline(c, w, h, h, '#2A3448', U.seeded(5), 0.25); skyline(c, w, h, h, '#1A2132', U.seeded(6), 0.4); c.strokeStyle = 'rgba(190,210,240,.45)'; c.lineWidth = 1.2; const rr = U.seeded(Math.floor((t || 0) * 12)); for (let i = 0; i < 220; i++) { const x = rr() * w, y = rr() * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 4, y + 18); c.stroke(); } c.fillStyle = 'rgba(200,220,255,.08)'; c.fillRect(0, 0, w, h); },
    v_clouds(c, w, h, r, t) { sky(c, w, h, [[0, '#3E7CB1'], [0.55, '#9FC7EA'], [1, '#FCE6C8']]); c.fillStyle = '#FFF4DA'; c.beginPath(); c.arc(w * 0.75, h * 0.35, 40, 0, 7); c.fill(); const off = ((t || 0) * 8) % w; for (let layer = 0; layer < 3; layer++) { c.fillStyle = ['rgba(255,255,255,.7)', 'rgba(255,250,240,.9)', '#FFFFFF'][layer]; const rr = U.seeded(20 + layer); for (let i = 0; i < 26; i++) { const x = (rr() * w * 1.2 + off * (layer + 1) * 0.5) % (w * 1.2) - w * 0.1, y = h * (0.62 + layer * 0.12) + rr() * 30; c.beginPath(); c.arc(x, y, 40 + rr() * 40, 0, 7); c.fill(); } } c.fillStyle = '#C9CED6'; c.beginPath(); c.moveTo(0, h * 0.88); c.lineTo(w * 0.45, h * 0.72); c.lineTo(w * 0.47, h * 0.75); c.lineTo(0, h); c.fill(); c.fillStyle = '#C7432F'; c.beginPath(); c.moveTo(w * 0.43, h * 0.73); c.lineTo(w * 0.47, h * 0.66); c.lineTo(w * 0.48, h * 0.75); c.fill(); },
    v_aurora(c, w, h, r, t) { sky(c, w, h, [[0, '#050B1E'], [1, '#13284A']]); stars(c, w, h * 0.7, 160, U.seeded(3)); const tt = t || 0; for (let b = 0; b < 3; b++) { const g = c.createLinearGradient(0, h * 0.1, 0, h * 0.6); g.addColorStop(0, 'rgba(120,255,200,0)'); g.addColorStop(0.5, ['rgba(110,255,190,.45)', 'rgba(120,200,255,.35)', 'rgba(200,120,255,.25)'][b]); g.addColorStop(1, 'rgba(120,255,200,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(0, h * 0.6); for (let x = 0; x <= w; x += 16) c.lineTo(x, h * (0.25 + b * 0.06) + Math.sin(x * 0.01 + tt * 0.6 + b) * 40 + Math.sin(x * 0.023 - tt * 0.4) * 20); c.lineTo(w, h * 0.6); c.fill(); } mountains(c, w, h * 0.78, 90, '#0B1730', U.seeded(4), 6); c.fillStyle = '#0A1426'; c.fillRect(0, h * 0.85, w, h); for (let i = 0; i < 40; i++) tree(c, U.seeded(i)() * w, h * 0.92, 40, '#08101F'); },
    v_space(c, w, h, r) { sky(c, w, h, [[0, '#02030A'], [1, '#0A0F24']]); stars(c, w, h, 300, r); const g = c.createRadialGradient(w * 0.5, h * 1.6, h * 0.8, w * 0.5, h * 1.6, h * 1.25); g.addColorStop(0, '#2E7BC9'); g.addColorStop(0.92, '#7FC1F0'); g.addColorStop(0.97, 'rgba(160,220,255,.6)'); g.addColorStop(1, 'rgba(160,220,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(w * 0.5, h * 1.6, h * 1.25, 0, 7); c.fill(); c.fillStyle = 'rgba(127,176,105,.8)'; for (let i = 0; i < 8; i++) { c.beginPath(); c.ellipse(w * 0.2 + r() * w * 0.6, h * 0.75 + r() * h * 0.25, 40 + r() * 60, 15 + r() * 20, r(), 0, 7); c.fill(); } c.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 12; i++) { c.beginPath(); c.ellipse(r() * w, h * 0.7 + r() * h * 0.3, 50 + r() * 50, 6 + r() * 8, r() * 0.4, 0, 7); c.fill(); } c.fillStyle = '#E9E3D0'; c.beginPath(); c.arc(w * 0.82, h * 0.2, 22, 0, 7); c.fill(); },
    // "Pist 25" at dusk, seen from the cockpit: the runway runs away from you, a tower beacon turns, planes take off
    v_runway(c, w, h, r, t) {
      const tt = t || 0, hz = h * 0.56, cx = w * 0.5;
      sky(c, w, h, [[0, '#14193A'], [0.32, '#3B3570'], [0.48, '#C2617A'], [0.56, '#F6A35C'], [0.6, '#3A3340'], [1, '#22232B']]);
      stars(c, w, h * 0.3, 70, U.seeded(9));
      c.fillStyle = 'rgba(255,214,150,.9)'; c.beginPath(); c.arc(w * 0.72, hz - 6, 26, Math.PI, 0); c.fill();
      // far hills and the airport skyline
      mountains(c, w, hz + 2, 26, '#4A3D57', U.seeded(4), 9);
      c.fillStyle = '#2C2836'; c.fillRect(0, hz - 2, w, 12);
      // terminal with lit windows (left) and the control tower (right)
      c.fillStyle = '#262330'; c.fillRect(w * 0.06, hz - 34, w * 0.24, 36); c.fillRect(w * 0.1, hz - 46, w * 0.12, 14);
      const rw = U.seeded(11); for (let x = w * 0.07; x < w * 0.29; x += 9) for (let y = hz - 30; y < hz - 4; y += 9) if (rw() < 0.55) { c.fillStyle = rw() < 0.8 ? '#FFD58A' : '#BDE4FF'; c.fillRect(x, y, 5, 4); }
      const tx = w * 0.83; c.fillStyle = '#262330'; c.fillRect(tx - 7, hz - 110, 14, 112); c.beginPath(); c.moveTo(tx - 26, hz - 112); c.lineTo(tx + 26, hz - 112); c.lineTo(tx + 20, hz - 132); c.lineTo(tx - 20, hz - 132); c.fill();
      c.fillStyle = 'rgba(160,230,255,.85)'; c.fillRect(tx - 19, hz - 129, 38, 12); c.fillStyle = '#262330'; c.fillRect(tx - 22, hz - 140, 44, 8); c.fillRect(tx - 1, hz - 156, 2, 16);
      const beacon = Math.floor(tt * 1.2) % 2; c.fillStyle = beacon ? '#7CFFB2' : '#FFFFFF'; c.beginPath(); c.arc(tx, hz - 158, 4, 0, 7); c.fill();
      c.fillStyle = Math.floor(tt * 0.8) % 2 ? '#FF3B30' : '#6A1A16'; c.beginPath(); c.arc(w * 0.18, hz - 49, 3, 0, 7); c.fill();
      // the runway in perspective: asphalt, edge lights, threshold bars, "25", centreline
      const nearW = w * 0.62, farW = w * 0.03;
      c.fillStyle = '#2E3038'; c.beginPath(); c.moveTo(cx - farW, hz + 6); c.lineTo(cx + farW, hz + 6); c.lineTo(cx + nearW, h); c.lineTo(cx - nearW, h); c.fill();
      c.fillStyle = '#2A3A2C'; c.beginPath(); c.moveTo(0, hz + 6); c.lineTo(cx - farW, hz + 6); c.lineTo(cx - nearW, h); c.lineTo(0, h); c.fill(); c.beginPath(); c.moveTo(w, hz + 6); c.lineTo(cx + farW, hz + 6); c.lineTo(cx + nearW, h); c.lineTo(w, h); c.fill();
      const at = (u) => { const k = Math.pow(u, 2.2); return { y: hz + 6 + (h - hz - 6) * k, half: farW + (nearW - farW) * k }; };
      c.fillStyle = 'rgba(240,240,235,.85)';
      for (let i = 0; i < 14; i++) { const a = at(i / 14 + 0.02), b = at(i / 14 + 0.045); c.beginPath(); c.moveTo(cx - a.half * 0.012 - 0.5, a.y); c.lineTo(cx + a.half * 0.012 + 0.5, a.y); c.lineTo(cx + b.half * 0.014 + 0.5, b.y); c.lineTo(cx - b.half * 0.014 - 0.5, b.y); c.fill(); }
      const th0 = at(0.86), th1 = at(0.95);
      for (let k = -4; k <= 4; k++) { if (!k) continue; const s = k / 4.6; c.beginPath(); c.moveTo(cx + th0.half * (s - 0.045), th0.y); c.lineTo(cx + th0.half * (s + 0.045), th0.y); c.lineTo(cx + th1.half * (s + 0.045), th1.y); c.lineTo(cx + th1.half * (s - 0.045), th1.y); c.fill(); }
      const n0 = at(0.7); c.save(); c.translate(cx, n0.y); c.scale(1, 0.32); c.font = `bold ${Math.round(n0.half * 0.42)}px sans-serif`; c.textAlign = 'center'; c.fillText('25', 0, 0); c.restore();
      for (let i = 0; i <= 22; i++) { const a = at(i / 22); const s = 1 + a.half / 140; for (const sx of [-1, 1]) { c.fillStyle = i > 18 ? '#FFD27A' : '#F6F4EF'; c.beginPath(); c.arc(cx + sx * a.half * 1.01, a.y, s, 0, 7); c.fill(); } }
      // taxiway with blue edge lights
      for (let i = 0; i < 16; i++) { const x = w * 0.02 + i * w * 0.018, y = hz + 14 + i * 3.2; c.fillStyle = '#4FA3FF'; c.beginPath(); c.arc(x, y, 1.4 + i * 0.08, 0, 7); c.fill(); }
      // a plane every 22 s: rolls at the far end, lifts off and climbs away to the left
      const cyc = (tt % 22) / 22;
      if (cyc < 0.7) {
        const u = cyc / 0.7, px = cx - u * w * 0.42, py = hz + 2 - Math.max(0, u - 0.25) * h * 0.55, sc = 0.55 + u * 0.9, ang = u > 0.25 ? 0.16 : 0;
        c.save(); c.translate(px, py); c.rotate(ang); c.scale(sc, sc);
        c.fillStyle = '#E9ECF2'; c.beginPath(); c.ellipse(0, 0, 30, 4.2, 0, 0, 7); c.fill();
        c.beginPath(); c.moveTo(22, -3); c.lineTo(34, -15); c.lineTo(38, -15); c.lineTo(32, -2); c.fill();
        c.fillStyle = '#C9CED6'; c.beginPath(); c.moveTo(-4, 1); c.lineTo(10, 8); c.lineTo(16, 8); c.lineTo(8, 1); c.fill();
        c.fillStyle = '#C7432F'; c.fillRect(30, -15, 6, 4);
        c.fillStyle = '#9FD0FF'; for (let k = -18; k < 16; k += 4) c.fillRect(k, -1.5, 2, 1.4);
        if (Math.floor(tt * 3) % 2) { c.fillStyle = '#FF3B30'; c.beginPath(); c.arc(-6, 2, 2, 0, 7); c.fill(); }
        c.fillStyle = 'rgba(255,250,220,.9)'; c.beginPath(); c.arc(-30, 1, 2.6, 0, 7); c.fill();
        c.restore();
      }
      // a soft cockpit glass sheen
      const gl = c.createLinearGradient(0, 0, w, h); gl.addColorStop(0, 'rgba(255,255,255,.05)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(255,255,255,.03)'); c.fillStyle = gl; c.fillRect(0, 0, w, h);
    },
  };
  PW.ANIMATED_VIEWS = { v_rain: 1, v_clouds: 1, v_aurora: 1, v_runway: 1 };
  PW.paintView = function (id, ctx, w, h, t) { const f = VIEWS[id] || VIEWS.v_city_day; ctx.clearRect(0, 0, w, h); f(ctx, w, h, U.seeded(U.hashStr(id)), t); };
  PW.viewSunColor = { v_runway: '#FFA866', v_city_night: '#6F7BD9', v_rain: '#7C8FB8', v_aurora: '#7FE0C2', v_space: '#9DB7FF', v_beach: '#FF9F6B', v_bosphorus: '#FFB070', v_snow: '#E6F0FF' };
  PW.viewIsNight = { v_city_night: 1, v_rain: 1, v_aurora: 1, v_space: 1 };
})();
