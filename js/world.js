/* Pomodoro World — 3D world: renderer, rooms, avatars on screen, camera, editor */
(function () {
  const PW = window.PW;
  const U = PW.util;
  const WALL_H = 3.2, WALL_T = 0.16;

  PW.normItems = (items) => (items || []).map((it) => {
    if (Array.isArray(it)) {
      if (typeof it[1] === 'string') return { id: it[0], w: it[1], x: it[2] || 0, r: 0 };
      return { id: it[0], x: it[1], z: it[2], r: it[3] || 0 };
    }
    return Object.assign({}, it);
  });

  class World {
    constructor(host, tagsHost) {
      this.host = host; this.tagsHost = tagsHost;
      const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
      r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
      host.appendChild(r.domElement);
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
      this.cam = { theta: 0.62, phi: 0.98, radius: 11, target: new THREE.Vector3(0, 0.8, 0), tTarget: new THREE.Vector3(0, 0.8, 0), tRadius: 11 };
      this.roomGroup = new THREE.Group(); this.scene.add(this.roomGroup);
      this.avGroup = new THREE.Group(); this.scene.add(this.avGroup);
      this.avatars = new Map();
      this.animated = []; this.seats = []; this.wallGroups = {}; this.itemGroups = [];
      this.clock = new THREE.Clock(); this.time = 0;
      this.ray = new THREE.Raycaster(); this.ptr = new THREE.Vector2();
      this.tmpV = new THREE.Vector3();
      this.onClick = null; this.edit = { on: false, ghost: null, ghostDef: null, rot: 0, sel: -1 };
      this.setupLights();
      this.setupInput();
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
    }
    setupLights() {
      this.hemi = new THREE.HemisphereLight('#FFF4E6', '#7A6A5A', 0.55); this.scene.add(this.hemi);
      this.amb = new THREE.AmbientLight('#FFFFFF', 0.18); this.scene.add(this.amb);
      const s = this.sun = new THREE.DirectionalLight('#FFE9CF', 1.25);
      s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0004; s.shadow.normalBias = 0.02;
      this.scene.add(s); this.scene.add(s.target);
      this.pointLights = [];
      for (let i = 0; i < 6; i++) { const p = new THREE.PointLight('#FFD9A0', 0, 5, 2); this.scene.add(p); this.pointLights.push(p); }
    }
    resize() {
      const w = this.host.clientWidth || window.innerWidth, h = this.host.clientHeight || window.innerHeight;
      this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
      this.w = w; this.h = h;
      const narrow = w < 700;
      this.cam.tRadius = this.baseRadius ? this.baseRadius * (narrow ? 1.35 : 1) : this.cam.tRadius;
    }
    setupInput() {
      const el = this.renderer.domElement; el.style.touchAction = 'none';
      let down = null, pts = new Map(), pinch0 = 0;
      el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); down = { x: e.clientX, y: e.clientY, th: this.cam.theta, ph: this.cam.phi, moved: false, btn: e.button }; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
      el.addEventListener('pointermove', (e) => {
        this.updatePtr(e);
        if (this.edit.ghost) this.moveGhost();
        if (!down || !pts.has(e.pointerId)) return;
        pts.set(e.pointerId, [e.clientX, e.clientY]);
        if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0) { this.cam.tRadius = U.clamp(this.cam.tRadius * (pinch0 / d), 3.5, 26); pinch0 = d; } down.moved = true; return; }
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (Math.abs(dx) + Math.abs(dy) > 6) down.moved = true;
        if (down.moved) { this.cam.theta = down.th - dx * 0.006; this.cam.phi = U.clamp(down.ph - dy * 0.005, 0.32, 1.38); }
      });
      const up = (e) => { pts.delete(e.pointerId); if (!down) return; if (!down.moved && pts.size === 0) { this.updatePtr(e); this.handleClick(); } if (pts.size === 0) down = null; };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); down = null; });
      el.addEventListener('wheel', (e) => { e.preventDefault(); this.cam.tRadius = U.clamp(this.cam.tRadius * (1 + Math.sign(e.deltaY) * 0.09), 3.5, 26); }, { passive: false });
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    updatePtr(e) { const r = this.renderer.domElement.getBoundingClientRect(); this.ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); }
    floorHit() { this.ray.setFromCamera(this.ptr, this.camera); const t = -this.ray.ray.origin.y / this.ray.ray.direction.y; if (t < 0 || !isFinite(t)) return null; return this.ray.ray.origin.clone().add(this.ray.ray.direction.clone().multiplyScalar(t)); }
    handleClick() {
      if (this.edit.ghost) { this.placeGhost(); return; }
      this.ray.setFromCamera(this.ptr, this.camera);
      // avatars first
      const avHits = this.ray.intersectObjects(this.avGroup.children, true);
      if (avHits.length) { let o = avHits[0].object; while (o && !o.userData.avId) o = o.parent; if (o && this.onClick) return this.onClick({ type: 'avatar', id: o.userData.avId }); }
      const hits = this.ray.intersectObjects(this.itemGroups.filter((g) => g.visible && g.parent && g.parent.visible), true);
      if (hits.length) {
        let o = hits[0].object; while (o && o.userData.itemIndex == null) o = o.parent;
        if (o) {
          const idx = o.userData.itemIndex;
          if (this.edit.on) { this.select(idx); return this.onClick && this.onClick({ type: 'edit-select', index: idx }); }
          const seat = this.seats.findIndex((s) => s.itemIndex === idx && !s.taken);
          const anySeat = this.seats.findIndex((s) => s.itemIndex === idx);
          if (anySeat >= 0 && this.onClick) return this.onClick({ type: 'seat', idx: seat >= 0 ? seat : anySeat });
        }
      }
      if (this.edit.on) { this.select(-1); return this.onClick && this.onClick({ type: 'edit-select', index: -1 }); }
      const p = this.floorHit();
      if (p && this.onClick) { const h = this.half - 0.35; this.onClick({ type: 'floor', x: U.clamp(p.x, -h, h), z: U.clamp(p.z, -h, h) }); }
    }

    /* ---------------- rooms ---------------- */
    loadRoom(def) {
      this.def = def;
      const size = def.size || 7, half = (this.half = size / 2);
      const th = PW.ITEM[def.theme] || PW.THEMES[0];
      // clear
      this.roomGroup.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.type === 'PlaneGeometry') o.geometry.dispose(); });
      this.scene.remove(this.roomGroup); this.roomGroup = new THREE.Group(); this.scene.add(this.roomGroup);
      this.animated = []; this.itemGroups = []; this.wallGroups = {}; this.lightSpots = [];
      const G = this.roomGroup;
      // ground outside (soft base)
      const base = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.95, size * 1.0, 0.4, 48), PW.mat('#2A2840', { rough: 1 }));
      base.position.y = -0.21; base.receiveShadow = true; G.add(base);
      // floor
      const fm = new THREE.MeshStandardMaterial({ map: PW.floorTex(th, size), roughness: 0.82 });
      const floor = new THREE.Mesh(new THREE.BoxGeometry(size + WALL_T * 2, 0.12, size + WALL_T * 2), fm); floor.position.y = -0.06; floor.receiveShadow = true; G.add(floor);
      // walls
      const wt = PW.wallTex(th).clone(); wt.needsUpdate = true; wt.repeat.set(size / 3.2, 1); wt.wrapS = wt.wrapT = THREE.RepeatWrapping;
      const wm = new THREE.MeshStandardMaterial({ map: wt, roughness: 0.92 });
      const trim = PW.mat(th.trim, { rough: 0.6 });
      const mkWall = (key, len) => {
        const g = new THREE.Group(); G.add(g); this.wallGroups[key] = g;
        const tall = new THREE.Group(); g.add(tall); g.userData.tall = tall;
        const low = new THREE.Group(); g.add(low); g.userData.low = low;
        if (key === 'w0') {
          const ww = 2.6, y0 = 0.95, y1 = 2.55, side = (len - ww) / 2;
          for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(side, WALL_H, WALL_T), wm); m.position.set(sx * (ww / 2 + side / 2), WALL_H / 2, 0); m.receiveShadow = true; m.castShadow = true; tall.add(m); }
          const bot = new THREE.Mesh(new THREE.BoxGeometry(ww, y0, WALL_T), wm); bot.position.set(0, y0 / 2, 0); tall.add(bot);
          const topw = new THREE.Mesh(new THREE.BoxGeometry(ww, WALL_H - y1, WALL_T), wm); topw.position.set(0, (WALL_H + y1) / 2, 0); topw.castShadow = true; tall.add(topw);
          const fr = PW.mat('#F6F4EF', { rough: 0.5 });
          PW.box(tall, ww + 0.12, 0.08, 0.26, fr, 0, y0, 0.06); PW.box(tall, ww + 0.12, 0.08, 0.2, fr, 0, y1, 0.0);
          for (const sx of [-1, 1]) PW.box(tall, 0.08, y1 - y0, 0.2, fr, sx * (ww / 2), (y0 + y1) / 2, 0);
          PW.box(tall, 0.05, y1 - y0, 0.06, fr, 0, (y0 + y1) / 2, 0); PW.box(tall, ww, 0.05, 0.06, fr, 0, (y0 + y1) / 2 + 0.2, 0);
          const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, y1 - y0), new THREE.MeshStandardMaterial({ color: '#CFE8FF', transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.2 })); glass.position.set(0, (y0 + y1) / 2, 0.0); tall.add(glass);
          // view
          const vt = this.viewTex = PW.canvasTex(1024, 512, (c, w, h) => PW.paintView(def.view, c, w, h, 0));
          const vp = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.2), new THREE.MeshBasicMaterial({ map: vt, toneMapped: false }));
          vp.position.set(0, 1.75, -0.36); tall.add(vp);
          this.viewAnimated = !!PW.ANIMATED_VIEWS[def.view]; this.viewT = 0;
          // curtains
          const cm = PW.mat(th.wall2, { rough: 0.95 });
          for (const sx of [-1, 1]) { for (let i = 0; i < 3; i++) { const c = PW.cyl(tall, 0.07, 0.09, 1.9, cm, sx * (ww / 2 + 0.25 + i * 0.1), 1.65, 0.18, 10); } }
          PW.cyl(tall, 0.02, 0.02, ww + 1.2, PW.mat('#2A2B33', { metal: 0.6, rough: 0.3 }), 0, 2.68, 0.18, 8).rotation.z = Math.PI / 2;
        } else {
          const m = new THREE.Mesh(new THREE.BoxGeometry(len, WALL_H, WALL_T), wm); m.position.y = WALL_H / 2; m.receiveShadow = true; m.castShadow = true; tall.add(m);
        }
        PW.box(tall, len, 0.12, 0.04, trim, 0, 0.06, WALL_T / 2 + 0.01);
        PW.box(tall, len, 0.06, 0.05, trim, 0, WALL_H - 0.03, WALL_T / 2 + 0.01);
        // low cutaway version
        const lm = new THREE.Mesh(new THREE.BoxGeometry(len, 0.28, WALL_T), wm); lm.position.y = 0.14; lm.receiveShadow = true; low.add(lm);
        PW.box(low, len, 0.04, WALL_T + 0.02, trim, 0, 0.29, 0);
        low.visible = false;
        return g;
      };
      const L = size + WALL_T * 2;
      const w0 = mkWall('w0', L); w0.position.set(0, 0, -half - WALL_T / 2);
      const w1 = mkWall('w1', L); w1.position.set(-half - WALL_T / 2, 0, 0); w1.rotation.y = Math.PI / 2;
      const w2 = mkWall('w2', L); w2.position.set(0, 0, half + WALL_T / 2); w2.rotation.y = Math.PI;
      const w3 = mkWall('w3', L); w3.position.set(half + WALL_T / 2, 0, 0); w3.rotation.y = -Math.PI / 2;
      // items
      const items = (this.items = PW.normItems(def.items));
      const desks = [];
      items.forEach((it, i) => { const d = PW.ITEM[it.id]; if (d && d.surface) desks.push({ i, it, d }); });
      const surfaceAt = (x, z) => {
        for (const { it, d } of desks) { let [fw, fd] = d.fp; if (it.r % 2) [fw, fd] = [fd, fw]; if (Math.abs(x - it.x) <= fw / 2 + 0.02 && Math.abs(z - it.z) <= fd / 2 + 0.02) return d.surface; }
        return 0;
      };
      this.surfaceAt = surfaceAt;
      items.forEach((it, i) => {
        const d = PW.ITEM[it.id]; if (!d) return;
        const g = PW.buildItem(it.id, { seed: i * 13 + 5 });
        g.userData.itemIndex = i;
        if (d.wall) {
          const wg = this.wallGroups[it.w] || this.wallGroups.w0;
          g.position.set(it.x || 0, d.wy || 1.6, WALL_T / 2 + 0.005);
          wg.userData.tall.add(g);
        } else {
          g.position.set(it.x, d.top ? surfaceAt(it.x, it.z) : 0, it.z);
          g.rotation.y = (it.r || 0) * Math.PI / 2;
          G.add(g);
        }
        g.traverse((o) => { if (o.isMesh) { if (o.castShadow !== false && !d.rug) o.castShadow = true; o.receiveShadow = true; } });
        this.itemGroups.push(g);
        if (g.userData.update) this.animated.push(g);
        if (g.userData.lightAt) this.lightSpots.push(g);
      });
      // seats
      this.seats = [];
      items.forEach((it, i) => {
        const sd = PW.seatsFor(it.id); if (!sd.length) return;
        const rot = (it.r || 0) * Math.PI / 2;
        sd.forEach((s) => {
          const c = Math.cos(rot), sn = Math.sin(rot);
          const x = it.x + s.x * c + s.z * sn, z = it.z - s.x * sn + s.z * c;
          const ry = rot + (s.ry || 0);
          // a desk in front (0.35..0.8 forward)?
          const fx = Math.sin(ry), fz = Math.cos(ry);
          let deskH = 0; for (const dd of [0.45, 0.6, 0.75]) { const hgt = surfaceAt(x + fx * dd, z + fz * dd); if (hgt) { deskH = hgt; break; } }
          this.seats.push({ x, z, ry, h: s.h, itemIndex: i, desk: deskH > 0, taken: null });
        });
      });
      // lights: sun direction from window
      const night = !!PW.viewIsNight[def.view];
      const sunC = PW.viewSunColor[def.view] || '#FFE9CF';
      this.sun.color.set(sunC); this.sun.intensity = night ? 0.45 : 1.25;
      this.sun.position.set(-size * 0.25, 6.5, -half - 4); this.sun.target.position.set(size * 0.1, 0, half * 0.4);
      const sc = this.sun.shadow.camera; sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size; sc.near = 0.5; sc.far = 30; sc.updateProjectionMatrix();
      this.hemi.intensity = night ? 0.32 : 0.55; this.hemi.color.set(night ? '#9AA8E0' : '#FFF4E6');
      this.amb.intensity = night ? 0.12 : 0.18;
      this.renderer.toneMappingExposure = night ? 1.15 : 1.05;
      this.roomGroup.updateMatrixWorld(true);
      this.pointLights.forEach((p) => (p.intensity = 0));
      this.lightSpots.slice(0, 6).forEach((g, i) => { const p = this.pointLights[i]; const v = new THREE.Vector3(...g.userData.lightAt); g.localToWorld(v); p.position.copy(v); p.color.set(g.userData.lightColor || '#FFD9A0'); p.intensity = (g.userData.lightPower || 1) * (night ? 1.3 : 0.6); p.distance = 5.5; });
      this.scene.background = new THREE.Color(night ? '#151427' : '#2B2A44');
      this.scene.fog = null;
      this.baseRadius = size * 1.45 + 1.5;
      this.cam.tRadius = this.baseRadius * (this.w < 700 ? 1.35 : 1);
      this.cam.tTarget.set(0, 0.6, 0);
      // re-seat avatars
      for (const [id, a] of this.avatars) { if (a.seatIdx != null) { const s = a.seatIdx; a.seatIdx = null; this.sitAvatar(id, s < this.seats.length ? s : null); } }
      this.applyWallCut(true);
      if (this.edit.on) this.select(this.edit.sel);
    }
    applyWallCut(force) {
      const p = this.camera.position, h = this.half;
      const cut = { w0: p.z < -h * 0.2 || false, w2: p.z > -h * 0.4, w1: p.x < -h * 0.2, w3: p.x > h * 0.2 };
      // show the two walls facing the camera, cut the other two (diorama)
      const ax = Math.abs(p.x), az = Math.abs(p.z);
      cut.w0 = p.z < 0 && az > ax * 0.45; cut.w2 = p.z > 0 && az > ax * 0.45; cut.w1 = p.x < 0 && ax > az * 0.45; cut.w3 = p.x > 0 && ax > az * 0.45;
      for (const k in this.wallGroups) { const g = this.wallGroups[k]; const c = !!cut[k]; if (force || g.userData.cut !== c) { g.userData.cut = c; g.userData.tall.visible = !c; g.userData.low.visible = c; } }
    }

    /* ---------------- avatars ---------------- */
    addAvatar(id, cfg, info = {}) {
      if (this.avatars.has(id)) { this.updateAvatarInfo(id, info); return this.avatars.get(id); }
      const av = new PW.Avatar(cfg);
      av.root.userData.avId = id;
      this.avGroup.add(av.root);
      const tag = document.createElement('div'); tag.className = 'tag' + (info.isMe ? ' me' : '') + (info.npc ? ' npc' : '');
      tag.innerHTML = '<div class="bubble" hidden></div><div class="nm"><span class="lv"></span><span class="n"></span><span class="st"></span></div>';
      this.tagsHost.appendChild(tag);
      const a = { id, av, tag, info: {}, seatIdx: null, pos: new THREE.Vector3(), target: null, cfgKey: JSON.stringify(cfg) };
      this.avatars.set(id, a);
      this.updateAvatarInfo(id, info);
      const p = info.pos || this.spawnPoint();
      av.root.position.set(p.x, 0, p.z); av.root.rotation.y = Math.random() * 6;
      return a;
    }
    spawnPoint() { const h = (this.half || 3) - 0.8; return { x: U.rand(-h, h) * 0.6, z: h * 0.7 }; }
    updateAvatarInfo(id, info) {
      const a = this.avatars.get(id); if (!a) return;
      Object.assign(a.info, info);
      const q = (s) => a.tag.querySelector(s);
      q('.n').textContent = a.info.name || 'Misafir';
      q('.lv').textContent = a.info.level || 1;
      const st = a.info.status || '';
      const stEl = q('.st'); stEl.className = 'st ' + st; stEl.textContent = st === 'focus' ? (a.info.timer || 'odak') : st === 'break' ? 'mola' : '';
      stEl.hidden = !st;
      if (info.cfg) { const key = JSON.stringify(info.cfg); if (key !== a.cfgKey) { a.cfgKey = key; a.av.build(info.cfg); } }
    }
    removeAvatar(id) { const a = this.avatars.get(id); if (!a) return; if (a.seatIdx != null && this.seats[a.seatIdx]) this.seats[a.seatIdx].taken = null; this.avGroup.remove(a.av.root); a.tag.remove(); this.avatars.delete(id); }
    clearAvatars(keep) { for (const id of [...this.avatars.keys()]) if (id !== keep) this.removeAvatar(id); }
    freeSeat(prefDesk = true, avoid) {
      const order = this.seats.map((s, i) => i).filter((i) => !this.seats[i].taken && i !== avoid);
      order.sort((a, b) => (this.seats[b].desk - this.seats[a].desk) || (a - b));
      if (prefDesk) { const d = order.find((i) => this.seats[i].desk); if (d != null) return d; }
      return order.length ? order[0] : null;
    }
    sitAvatar(id, idx) {
      const a = this.avatars.get(id); if (!a) return false;
      if (a.seatIdx != null && this.seats[a.seatIdx] && this.seats[a.seatIdx].taken === id) this.seats[a.seatIdx].taken = null;
      a.seatIdx = null; a.target = null;
      if (idx == null || !this.seats[idx]) { a.av.setState('stand'); return false; }
      const s = this.seats[idx];
      if (s.taken && s.taken !== id) { return false; }
      s.taken = id; a.seatIdx = idx;
      a.av.root.position.set(s.x, 0, s.z); a.av.root.rotation.y = s.ry;
      a.av.seatH = s.h; a.av.setState('sit'); a.av.applyPose(false);
      return true;
    }
    standAvatar(id) { const a = this.avatars.get(id); if (!a) return; if (a.seatIdx != null && this.seats[a.seatIdx]) { const s = this.seats[a.seatIdx]; s.taken = null; a.av.root.position.set(s.x + Math.sin(s.ry) * -0.55, 0, s.z + Math.cos(s.ry) * -0.55); } a.seatIdx = null; a.av.setState('stand'); }
    walkTo(id, x, z) { const a = this.avatars.get(id); if (!a) return; if (a.seatIdx != null) this.standAvatar(id); a.target = new THREE.Vector3(x, 0, z); }
    setAct(id, act) { const a = this.avatars.get(id); if (a) a.av.act = act; }
    emote(id, e) { const a = this.avatars.get(id); if (a) a.av.doEmote(e, 3200); }
    bubble(id, text) {
      const a = this.avatars.get(id); if (!a) return;
      const b = a.tag.querySelector('.bubble'); b.textContent = text; b.hidden = false; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
      a.av.say(Math.min(4500, 900 + text.length * 70));
      clearTimeout(a.bubT); a.bubT = setTimeout(() => (b.hidden = true), 4500 + Math.min(4000, text.length * 60));
    }
    focusOn(id) { const a = this.avatars.get(id); if (!a) { this.cam.tTarget.set(0, 0.6, 0); return; } this.followId = id; }
    unfollow() { this.followId = null; this.cam.tTarget.set(0, 0.6, 0); }

    /* ---------------- editor ---------------- */
    setEdit(on) { this.edit.on = on; if (!on) { this.cancelGhost(); this.select(-1); } }
    select(idx) {
      this.edit.sel = idx;
      if (this.selBox) { this.scene.remove(this.selBox); this.selBox = null; }
      if (idx >= 0 && this.itemGroups[idx]) { this.selBox = new THREE.BoxHelper(this.itemGroups[idx], '#FFD24F'); this.scene.add(this.selBox); }
    }
    startGhost(id, rot = 0) {
      this.cancelGhost();
      const d = PW.ITEM[id]; const g = PW.buildItem(id, { seed: 99 });
      g.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.6; o.castShadow = false; } });
      this.edit.ghost = g; this.edit.ghostDef = d; this.edit.rot = rot; this.scene.add(g); this.moveGhost();
    }
    rotateGhost() { if (this.edit.ghost) { this.edit.rot = (this.edit.rot + 1) % 4; this.moveGhost(); return true; } return false; }
    cancelGhost() { if (this.edit.ghost) { this.scene.remove(this.edit.ghost); this.edit.ghost = null; this.edit.ghostDef = null; } }
    moveGhost() {
      const g = this.edit.ghost, d = this.edit.ghostDef; if (!g) return;
      const h = this.half;
      if (d.wall) {
        this.ray.setFromCamera(this.ptr, this.camera);
        const walls = Object.entries(this.wallGroups).filter(([k, wg]) => wg.userData.tall.visible);
        let best = null;
        for (const [k, wg] of walls) { const hit = this.ray.intersectObject(wg.userData.tall, true)[0]; if (hit && (!best || hit.distance < best.d)) best = { k, d: hit.distance, p: hit.point }; }
        if (!best) { g.visible = false; this.edit.pos = null; return; }
        g.visible = true;
        const k = best.k, p = best.p;
        let u = k === 'w0' ? p.x : k === 'w2' ? -p.x : k === 'w1' ? -p.z : p.z;
        u = Math.round(U.clamp(u, -h + (d.ww || 1) / 2 + 0.1, h - (d.ww || 1) / 2 - 0.1) * 4) / 4;
        const wg = this.wallGroups[k]; const v = new THREE.Vector3(u, d.wy || 1.6, WALL_T / 2 + 0.03); wg.localToWorld(v);
        g.position.copy(v); g.rotation.y = wg.rotation.y;
        this.edit.pos = { id: d.id, w: k, x: u };
      } else {
        const p = this.floorHit(); if (!p) return;
        let [fw, fd] = d.fp || [0.5, 0.5]; if (this.edit.rot % 2) [fw, fd] = [fd, fw];
        const x = Math.round(U.clamp(p.x, -h + fw / 2, h - fw / 2) * 4) / 4, z = Math.round(U.clamp(p.z, -h + fd / 2, h - fd / 2) * 4) / 4;
        g.visible = true; g.position.set(x, d.top ? (this.surfaceAt(x, z) || 0) : 0, z); g.rotation.y = this.edit.rot * Math.PI / 2;
        this.edit.pos = { id: d.id, x, z, r: this.edit.rot };
      }
    }
    placeGhost() { const pos = this.edit.pos; if (!pos) return; const cb = this.onPlace; this.cancelGhost(); if (cb) cb(pos); }

    /* ---------------- loop ---------------- */
    loop() {
      requestAnimationFrame(this.loop);
      const dt = Math.min(0.05, this.clock.getDelta()); this.time += dt;
      const c = this.cam;
      if (this.followId && this.avatars.has(this.followId)) { const r = this.avatars.get(this.followId).av.root.position; c.tTarget.set(r.x * 0.6, 0.8, r.z * 0.6); }
      c.target.lerp(c.tTarget, 1 - Math.pow(0.02, dt));
      c.radius += (c.tRadius - c.radius) * (1 - Math.pow(0.01, dt));
      const sp = Math.sin(c.phi);
      this.camera.position.set(c.target.x + c.radius * sp * Math.sin(c.theta), c.target.y + c.radius * Math.cos(c.phi), c.target.z + c.radius * sp * Math.cos(c.theta));
      this.camera.lookAt(c.target);
      if (this.half) this.applyWallCut(false);
      for (const g of this.animated) g.userData.update(this.time, dt);
      if (this.viewAnimated && this.viewTex) { this.viewT += dt; if (this.viewT > 0.11) { this.viewT = 0; PW.paintView(this.def.view, this.viewTex.userData.ctx, 1024, 512, this.time); this.viewTex.needsUpdate = true; } }
      // avatars
      for (const [id, a] of this.avatars) {
        const av = a.av, root = av.root;
        if (a.target) {
          const dx = a.target.x - root.position.x, dz = a.target.z - root.position.z, dist = Math.hypot(dx, dz);
          if (dist < 0.05) { a.target = null; av.setState('stand'); if (a.onArrive) { const f = a.onArrive; a.onArrive = null; f(); } }
          else { av.setState('walk'); const sp = Math.min(dist, dt * 1.9); root.position.x += (dx / dist) * sp; root.position.z += (dz / dist) * sp; const want = Math.atan2(dx, dz); let d = want - root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); root.rotation.y += d * Math.min(1, dt * 10); }
        }
        av.update(dt, this.time);
        // tag
        av.headWorld(this.tmpV); this.tmpV.y += 0.12;
        this.tmpV.project(this.camera);
        const vis = this.tmpV.z < 1 && Math.abs(this.tmpV.x) < 1.2 && Math.abs(this.tmpV.y) < 1.2;
        a.tag.style.display = vis ? '' : 'none';
        if (vis) { const x = (this.tmpV.x * 0.5 + 0.5) * this.w, y = (-this.tmpV.y * 0.5 + 0.5) * this.h; a.tag.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; a.tag.style.zIndex = String(1000 - Math.round(this.tmpV.z * 500)); }
      }
      if (this.selBox) this.selBox.update();
      this.renderer.render(this.scene, this.camera);
    }
  }
  PW.World = World;

  /* ---------------- avatar preview (character studio) ---------------- */
  class Preview {
    constructor(host) {
      this.host = host;
      const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
      host.appendChild(r.domElement);
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
      this.scene.add(new THREE.HemisphereLight('#FFF6EC', '#6A5A7A', 0.8));
      const d = new THREE.DirectionalLight('#FFE9D6', 1.1); d.position.set(2, 4, 3); d.castShadow = true; d.shadow.mapSize.set(1024, 1024); this.scene.add(d);
      const rim = new THREE.DirectionalLight('#9DB7FF', 0.6); rim.position.set(-3, 2, -3); this.scene.add(rim);
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.08, 48), PW.mat('#E9DCC8', { rough: 0.9 })); plat.position.y = -0.04; plat.receiveShadow = true; this.scene.add(plat);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.77, 0.015, 8, 64), PW.mat('#E8553D', { emissive: '#E8553D', ei: 0.5 })); ring.rotation.x = Math.PI / 2; this.scene.add(ring);
      this.rot = 0.4; this.zoom = 'full'; this.clock = new THREE.Clock(); this.t = 0;
      let drag = null;
      r.domElement.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, r: this.rot }; r.domElement.setPointerCapture(e.pointerId); });
      r.domElement.addEventListener('pointermove', (e) => { if (drag) this.rot = drag.r + (e.clientX - drag.x) * 0.012; });
      r.domElement.addEventListener('pointerup', () => (drag = null));
      r.domElement.style.touchAction = 'none';
      this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
      new ResizeObserver(() => this.resize()).observe(host); this.resize();
    }
    resize() { const w = this.host.clientWidth || 300, h = this.host.clientHeight || 300; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    setAvatar(cfg) { if (this.av) this.scene.remove(this.av.root); this.av = new PW.Avatar(cfg); this.scene.add(this.av.root); this.av.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); }
    setZoom(z) { this.zoom = z; }
    wave() { if (this.av) this.av.doEmote('wave', 2400); }
    loop() {
      if (!this.host.isConnected) return;
      requestAnimationFrame(this.loop);
      if (this.host.offsetParent === null) return;
      const dt = Math.min(0.05, this.clock.getDelta()); this.t += dt;
      const Z = { full: [0.92, 4.4], head: [1.52, 2.0], torso: [1.15, 2.7], legs: [0.5, 2.9] }[this.zoom] || [0.92, 4.4];
      const ty = Z[0], dist = Z[1];
      this.cy = this.cy == null ? ty : this.cy + (ty - this.cy) * 0.12; this.cd = this.cd == null ? dist : this.cd + (dist - this.cd) * 0.12;
      this.camera.position.set(0, this.cy + 0.18, this.cd); this.camera.lookAt(0, this.cy, 0);
      if (this.av) { this.av.root.rotation.y = this.rot; this.av.update(dt, this.t); }
      this.renderer.render(this.scene, this.camera);
    }
  }
  PW.Preview = Preview;

  /* ---------------- thumbnails ---------------- */
  let thumbR = null, thumbS = null, thumbC = null;
  const thumbCache = {};
  PW.thumb = function (id, avatarBase) {
    const d = PW.ITEM[id]; if (!d) return '';
    const key = id + (d.cat === 'avatar' ? '|' + (avatarBase ? avatarBase.g + avatarBase.sk + avatarBase.hc : '') : '');
    if (thumbCache[key]) return thumbCache[key];
    if (d.cat === 'theme') return (thumbCache[key] = themeSwatch(d));
    if (d.cat === 'view') return (thumbCache[key] = viewSwatch(d));
    if (d.cat === 'size') return (thumbCache[key] = sizeSwatch(d));
    if (!thumbR) {
      thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); thumbR.setSize(160, 160); thumbR.outputEncoding = THREE.sRGBEncoding; thumbR.toneMapping = THREE.ACESFilmicToneMapping;
      thumbR.toneMappingExposure = 0.95; thumbS = new THREE.Scene(); thumbS.add(new THREE.HemisphereLight('#FFF6EC', '#4A3F5E', 0.55)); const dl = new THREE.DirectionalLight('#FFF1E0', 1.15); dl.position.set(2, 4, 4); thumbS.add(dl); const dl2 = new THREE.DirectionalLight('#9DB7FF', 0.35); dl2.position.set(-3, 1, -2); thumbS.add(dl2);
      thumbC = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
    }
    let obj;
    if (d.cat === 'avatar') {
      const base = Object.assign({}, avatarBase || PW.defaultAvatar(d.g === 'f' ? 'f' : 'm'));
      if (d.g === 'f') base.g = 'f'; if (d.g === 'm') base.g = 'm';
      if (d.slot === 'hair') base.hs = id; else if (d.slot === 'beard') base.fh = id; else if (d.slot === 'top') base.top = id; else if (d.slot === 'bottom') base.bot = id; else if (d.slot === 'shoes') base.sh = id; else if (d.slot === 'acc') base.acc = [id];
      if (d.slot !== 'acc') base.acc = [];
      const av = new PW.Avatar(base); av.update(0.016, 0); obj = av.root;
      const zone = { hair: [1.72, 1.15], beard: [1.66, 0.9], acc: d.sub === 'neck' ? [1.4, 1.2] : d.sub === 'back' ? [1.25, 2.0] : d.sub === 'wrist' ? [1.0, 1.6] : [1.72, 1.2], top: [1.2, 2.0], bottom: [0.5, 2.1], shoes: [0.12, 1.1] }[d.slot] || [1, 3];
      if (d.sub === 'back') obj.rotation.y = Math.PI * 0.8; else obj.rotation.y = 0.35;
      thumbC.position.set(0, zone[0] + 0.1, zone[1]); thumbC.lookAt(0, zone[0], 0);
    } else {
      obj = PW.buildItem(id, { seed: 3 });
      obj.rotation.y = d.wall ? 0 : -0.6;
      const bb = new THREE.Box3().setFromObject(obj); const sz = bb.getSize(new THREE.Vector3()), ct = bb.getCenter(new THREE.Vector3());
      const m = Math.max(sz.x, sz.y, sz.z) || 1;
      thumbC.position.set(ct.x + m * 0.9, ct.y + m * 0.75, ct.z + m * 1.9); thumbC.lookAt(ct);
    }
    thumbS.add(obj); thumbR.render(thumbS, thumbC); thumbS.remove(obj);
    return (thumbCache[key] = thumbR.domElement.toDataURL('image/png'));
  };
  function themeSwatch(th) { const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d'); const ft = PW.floorTex(th, 4).image, wt = PW.wallTex(th).image; g.drawImage(wt, 0, 0, 512, 300, 0, 0, 160, 96); g.drawImage(ft, 0, 0, 256, 128, 0, 96, 160, 64); g.fillStyle = th.trim; g.fillRect(0, 92, 160, 6); return c.toDataURL(); }
  function viewSwatch(v) { const c = document.createElement('canvas'); c.width = 256; c.height = 160; const g = c.getContext('2d'); PW.paintView(v.id, g, 256, 160, 2); g.strokeStyle = '#F6F4EF'; g.lineWidth = 10; g.strokeRect(0, 0, 256, 160); g.fillStyle = '#F6F4EF'; g.fillRect(124, 0, 8, 160); return c.toDataURL(); }
  function sizeSwatch(s) { const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d'); const n = s.size; const cell = 120 / 11; g.fillStyle = '#3A3858'; g.fillRect(0, 0, 160, 160); g.fillStyle = '#E8553D'; const w = n * cell; g.fillRect(80 - w / 2, 80 - w / 2, w, w); g.strokeStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(80 - w / 2 + i * cell, 80 - w / 2); g.lineTo(80 - w / 2 + i * cell, 80 + w / 2); g.stroke(); g.beginPath(); g.moveTo(80 - w / 2, 80 - w / 2 + i * cell); g.lineTo(80 + w / 2, 80 - w / 2 + i * cell); g.stroke(); } return c.toDataURL(); }
})();
