/* Pomodoro World — 3D world v2: renderer + post-processing, rooms with personal surfaces,
   light moods, window light shafts, dust motes, avatars, camera, editor, preview, thumbnails */
(function () {
  const PW = window.PW;
  const U = PW.util;
  const WALL_H = 3.2, WALL_T = 0.16;

  PW.MOODS = {
    day: { env: 1, name: 'Gün ışığı', sun: '#FFE9CF', sunI: 1.45, hemi: 0.36, hemiC: '#FFF4E6', hemiG: '#7A6A5A', amb: 0.07, exp: 0.94, lamp: 0.55, bloom: 0.28, bg: '#2B2A44', shafts: 0.55, dust: 1 },
    golden: { env: 0.8, name: 'Altın saat', sun: '#FFAE68', sunI: 1.6, hemi: 0.3, hemiC: '#FFD3A8', hemiG: '#6A4A4A', amb: 0.05, exp: 0.9, lamp: 0.8, bloom: 0.45, bg: '#36263A', shafts: 0.85, dust: 1 },
    night: { env: 0.22, name: 'Gece lambası', sun: '#6F7BD9', sunI: 0.3, hemi: 0.14, hemiC: '#8A9AE0', hemiG: '#2A2440', amb: 0.05, exp: 1.0, lamp: 1.7, bloom: 0.8, bg: '#111124', shafts: 0.12, dust: 0.45 },
    neon: { env: 0.3, name: 'Neon', sun: '#7A4CFF', sunI: 0.35, hemi: 0.22, hemiC: '#B48AFF', hemiG: '#201640', amb: 0.1, exp: 1.12, lamp: 1.3, bloom: 1.05, bg: '#120D24', shafts: 0.08, dust: 0.3, neon: ['#FF3FA4', '#26D8FF'] },
    candle: { env: 0.2, name: 'Mum ışığı', sun: '#FF8A3A', sunI: 0.2, hemi: 0.16, hemiC: '#FFB070', hemiG: '#2A1610', amb: 0.06, exp: 1.18, lamp: 2.0, bloom: 0.75, bg: '#180F0C', shafts: 0, dust: 0.5, flicker: true },
  };
  PW.FLOOR_TYPES = [['plank', 'Parke'], ['herring', 'Balıksırtı'], ['tile', 'Karo'], ['checker', 'Dama'], ['tatami', 'Tatami'], ['carpet', 'Halıfleks'], ['concrete', 'Beton'], ['panel', 'Panel'], ['terrazzo', 'Terrazzo'], ['hex', 'Altıgen Karo'], ['marble', 'Mermer']];
  PW.WALL_PATTERNS = [['plain', 'Düz'], ['stripe', 'Çizgili'], ['dots', 'Puantiye'], ['floral', 'Çiçekli'], ['wave', 'Dalga'], ['brick', 'Tuğla'], ['wainscot', 'Lambri'], ['cini', 'Çini'], ['shoji', 'Shoji'], ['logs', 'Kütük'], ['panel', 'Panel'], ['stars', 'Yıldızlı'], ['clouds', 'Bulutlu'], ['plaid', 'Ekose'], ['geo', 'Geometrik']];
  PW.WALL_COLORS = ['#F2EDE4', '#E9DCC8', '#F4D9E2', '#D8E7D0', '#B9C9AE', '#CFE0EE', '#A9C2DE', '#2D3E63', '#33513F', '#A8553E', '#E8C99A', '#C9B3E0', '#F5E6B8', '#3A3A44', '#E7B9A0', '#8FB7B0'];
  PW.FLOOR_COLORS = ['#B07D52', '#8F6140', '#D9B98E', '#6E4F3A', '#5A3A26', '#D9D2C7', '#B65B3E', '#C8C08A', '#5D5550', '#9AA3AD', '#E8DCCB', '#7A8F6E'];
  const DARK = { night: 1, neon: 1, candle: 1 };
  PW.viewFor = (def) => (def.view === 'v_city_day' && DARK[def.mood] ? 'v_city_night' : def.view);
  PW.defaultMoodFor = (view) => (PW.viewIsNight[view] ? 'night' : ['v_beach', 'v_bosphorus', 'v_cappadocia'].includes(view) ? 'golden' : 'day');

  PW.normItems = (items) => (items || []).map((it) => {
    if (Array.isArray(it)) {
      if (typeof it[1] === 'string') return { id: it[0], w: it[1], x: it[2] || 0, r: 0 };
      return { id: it[0], x: it[1], z: it[2], r: it[3] || 0, c: it[4] || undefined, wd: it[5] || undefined };
    }
    return Object.assign({}, it);
  });
  // theme-like object describing the room's surfaces (theme preset + personal overrides)
  PW.surfaceOf = (def) => {
    const th = PW.ITEM[def.theme] || PW.THEMES[0];
    const shade = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
    const wall = def.wall || th.wall, floor = def.floorC || th.floor;
    return {
      id: [def.theme, wall, def.wallPat || th.wallpat || 'plain', floor, def.floorT || th.pat].join('|'),
      wall, wall2: def.wall ? shade(wall, 0.86) : th.wall2, wallpat: def.wallPat || th.wallpat || 'plain',
      floor, floor2: def.floorC ? shade(floor, 0.82) : th.floor2, pat: def.floorT || th.pat,
      trim: def.trim || th.trim, curtain: def.curtain || th.wall2,
    };
  };

  /* ---------- small shaders ---------- */
  function shaftMaterial(color) {
    return new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0.3 }, uTime: { value: 0 } },
      vertexShader: 'varying float vF; varying vec2 vUv; attribute float fade; void main(){ vF = fade; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 uColor; uniform float uOpacity; uniform float uTime; varying float vF; varying vec2 vUv; void main(){ float stripes = 0.75 + 0.25 * sin(vUv.x * 18.0 + uTime * 0.3); gl_FragColor = vec4(uColor, uOpacity * vF * stripes); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
  }
  function dotSprite() {
    return PW.canvasTex(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
  }
  const GradeShader = {
    uniforms: { tDiffuse: { value: null }, uVig: { value: 0.32 }, uSat: { value: 1.08 }, uWarm: { value: 0.0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig; uniform float uSat; uniform float uWarm; varying vec2 vUv;
      void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 col = c.rgb;
        col = pow(max(col, vec3(0.0)), vec3(1.0/2.2));
        float l = dot(col, vec3(0.299,0.587,0.114)); col = mix(vec3(l), col, uSat);
        col += vec3(uWarm, uWarm*0.4, -uWarm*0.5);
        float d = distance(vUv, vec2(0.5)); col *= 1.0 - uVig * smoothstep(0.35, 0.9, d);
        gl_FragColor = vec4(col, c.a); }`,
  };

  const ToneShader = {
    uniforms: { tDiffuse: { value: null }, uExp: { value: 1.05 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uExp; varying vec2 vUv;
      vec3 RRTAndODTFit(vec3 v){ vec3 a = v*(v+0.0245786)-0.000090537; vec3 b = v*(0.983729*v+0.4329510)+0.238081; return a/b; }
      void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 col = c.rgb * uExp / 0.6;
        const mat3 IN = mat3(vec3(0.59719,0.07600,0.02840), vec3(0.35458,0.90834,0.13383), vec3(0.04823,0.01566,0.83777));
        const mat3 OUT = mat3(vec3(1.60475,-0.10208,-0.00327), vec3(-0.53108,1.10813,-0.07276), vec3(-0.07367,-0.00605,1.07602));
        col = OUT * RRTAndODTFit(IN * col);
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a); }`,
  };

  class World {
    constructor(host, tagsHost, opts = {}) {
      this.host = host; this.tagsHost = tagsHost; this.quality = opts.quality || 'high';
      const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }));
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality === 'high' ? 2 : 1.25));
      r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
      r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
      host.appendChild(r.domElement);
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
      this.cam = { theta: 0.62, phi: 0.98, radius: 11, target: new THREE.Vector3(0, 0.8, 0), tTarget: new THREE.Vector3(0, 0.8, 0), tRadius: 11, tTheta: null, tPhi: null };
      this.roomGroup = new THREE.Group(); this.scene.add(this.roomGroup);
      this.fxGroup = new THREE.Group(); this.scene.add(this.fxGroup);
      this.avGroup = new THREE.Group(); this.scene.add(this.avGroup);
      this.avatars = new Map();
      this.animated = []; this.seats = []; this.wallGroups = {}; this.itemGroups = []; this.flickers = [];
      this.clock = new THREE.Clock(); this.time = 0;
      this.ray = new THREE.Raycaster(); this.ptr = new THREE.Vector2(); this.tmpV = new THREE.Vector3();
      this.onClick = null; this.edit = { on: false, ghost: null, ghostDef: null, rot: 0, sel: -1 };
      this.setupLights(); this.setupEnv(); this.setupPost(); this.setupInput(); this.resize();
      window.addEventListener('resize', () => this.resize());
      this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
    }
    setupLights() {
      this.hemi = new THREE.HemisphereLight('#FFF4E6', '#7A6A5A', 0.5); this.scene.add(this.hemi);
      this.amb = new THREE.AmbientLight('#FFFFFF', 0.16); this.scene.add(this.amb);
      const s = (this.sun = new THREE.DirectionalLight('#FFE9CF', 1.25));
      s.castShadow = true; s.shadow.mapSize.set(this.quality === 'high' ? 2048 : 1024, this.quality === 'high' ? 2048 : 1024); s.shadow.bias = -0.0004; s.shadow.normalBias = 0.02; s.shadow.radius = 4;
      this.scene.add(s); this.scene.add(s.target);
      this.pointLights = [];
      for (let i = 0; i < 7; i++) { const p = new THREE.PointLight('#FFD9A0', 0, 5, 2); this.scene.add(p); this.pointLights.push(p); }
      this.neonLights = [new THREE.PointLight('#FF3FA4', 0, 9, 2), new THREE.PointLight('#26D8FF', 0, 9, 2)]; this.neonLights.forEach((l) => this.scene.add(l));
    }
    setupEnv() {
      try { if (THREE.RoomEnvironment) { const pm = new THREE.PMREMGenerator(this.renderer); this.scene.environment = pm.fromScene(new THREE.RoomEnvironment(), 0.04).texture; } } catch (e) {}
    }
    setupPost() {
      this.post = null;
      if (this.quality !== 'high' || !THREE.EffectComposer || !THREE.UnrealBloomPass) return;
      try {
        const r = this.renderer; const size = r.getDrawingBufferSize(new THREE.Vector2());
        let rt = null;
        if (r.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget) { rt = new THREE.WebGLMultisampleRenderTarget(size.x || 1, size.y || 1, { format: THREE.RGBAFormat, type: THREE.HalfFloatType }); }
        const comp = new THREE.EffectComposer(r, rt || undefined);
        comp.addPass(new THREE.RenderPass(this.scene, this.camera));
        // three r150+: tone mapping is no longer applied when rendering into a render target, so do it here (same ACES as r128)
        let tone = null; if (THREE.OutputPass) { tone = new THREE.ShaderPass(ToneShader); comp.addPass(tone); }
        const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.55, 0.86); comp.addPass(bloom);
        const grade = new THREE.ShaderPass(GradeShader); comp.addPass(grade);
        this.post = { comp, bloom, grade, tone };
      } catch (e) { console.warn('post fx off', e); this.post = null; }
    }
    setQuality(q) { if (q === this.quality) return; this.quality = q; this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q === 'high' ? 2 : 1.25)); this.setupPost(); this.resize(); if (this.def) this.applyMood(); }
    resize() {
      const w = this.host.clientWidth || window.innerWidth, h = this.host.clientHeight || window.innerHeight;
      this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
      this.w = w; this.h = h;
      if (this.post) { this.post.comp.setSize(w, h); this.post.comp.setPixelRatio && this.post.comp.setPixelRatio(this.renderer.getPixelRatio()); this.post.bloom.setSize(w / 2, h / 2); }
      if (this.baseRadius && !this.focusMode) this.cam.tRadius = this.baseRadius * (w < 700 ? 1.35 : 1);
    }
    setupInput() {
      const el = this.renderer.domElement; el.style.touchAction = 'none';
      let down = null; const pts = new Map(); let pinch0 = 0;
      el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); down = { x: e.clientX, y: e.clientY, th: this.cam.theta, ph: this.cam.phi, moved: false }; this.cam.tTheta = null; this.cam.tPhi = null; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
      el.addEventListener('pointermove', (e) => {
        this.updatePtr(e); if (this.edit.ghost) this.moveGhost();
        if (!down || !pts.has(e.pointerId)) return;
        pts.set(e.pointerId, [e.clientX, e.clientY]);
        if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0) { this.cam.tRadius = U.clamp(this.cam.tRadius * (pinch0 / d), 2.2, 26); pinch0 = d; } down.moved = true; return; }
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (Math.abs(dx) + Math.abs(dy) > 6) down.moved = true;
        if (down.moved) { this.cam.theta = down.th - dx * 0.006; this.cam.phi = U.clamp(down.ph - dy * 0.005, 0.32, 1.42); }
      });
      const up = (e) => { pts.delete(e.pointerId); if (!down) return; if (!down.moved && pts.size === 0) { this.updatePtr(e); this.handleClick(); } if (pts.size === 0) down = null; };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); down = null; });
      el.addEventListener('wheel', (e) => { e.preventDefault(); this.cam.tRadius = U.clamp(this.cam.tRadius * (1 + Math.sign(e.deltaY) * 0.09), 2.2, 26); }, { passive: false });
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    updatePtr(e) { const r = this.renderer.domElement.getBoundingClientRect(); this.ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); }
    floorHit() { this.ray.setFromCamera(this.ptr, this.camera); const t = -this.ray.ray.origin.y / this.ray.ray.direction.y; if (t < 0 || !isFinite(t)) return null; return this.ray.ray.origin.clone().add(this.ray.ray.direction.clone().multiplyScalar(t)); }
    handleClick() {
      if (this.edit.ghost) { this.placeGhost(); return; }
      this.ray.setFromCamera(this.ptr, this.camera);
      const avHits = this.ray.intersectObjects(this.avGroup.children, true);
      if (avHits.length && !this.edit.on) { let o = avHits[0].object; while (o && !o.userData.avId) o = o.parent; if (o && this.onClick) return this.onClick({ type: 'avatar', id: o.userData.avId }); }
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
      const S = PW.surfaceOf(def);
      this.scene.remove(this.roomGroup); this.roomGroup = new THREE.Group(); this.scene.add(this.roomGroup);
      this.scene.remove(this.fxGroup); this.fxGroup = new THREE.Group(); this.scene.add(this.fxGroup);
      this.animated = []; this.itemGroups = []; this.wallGroups = {}; this.lightSpots = []; this.flickers = [];
      const G = this.roomGroup;
      // plinth under the diorama
      const base = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.98, size * 1.04, 0.5, 64), PW.mat('#1D1B2C', { rough: 0.95 })); base.position.y = -0.26; base.receiveShadow = true; G.add(base);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(size * 0.99, 0.03, 8, 96), PW.mat('#4A4566', { emissive: '#FF8466', ei: 0.12, rough: 0.4 })); rim.rotation.x = Math.PI / 2; rim.position.y = -0.01; G.add(rim);
      // floor (+ thin trim edge)
      const fm = new THREE.MeshStandardMaterial({ map: PW.floorTex(S, size), roughness: S.pat === 'carpet' ? 1 : 0.7, envMapIntensity: 0.4 });
      const floor = new THREE.Mesh(new THREE.BoxGeometry(size + WALL_T * 2, 0.14, size + WALL_T * 2), fm); floor.position.y = -0.07; floor.receiveShadow = true; G.add(floor);
      // walls
      const wt = PW.wallTex(S).clone(); wt.needsUpdate = true; wt.repeat.set(size / 3.2, 1); wt.wrapS = wt.wrapT = THREE.RepeatWrapping;
      const wm = new THREE.MeshStandardMaterial({ map: wt, roughness: 0.92, envMapIntensity: 0.25 });
      const trim = PW.mat(S.trim, { rough: 0.55 });
      const cm = PW.fabM ? PW.fabM({ c: S.curtain }, S.curtain) : PW.mat(S.curtain);
      const mkWall = (key, len) => {
        const g = new THREE.Group(); G.add(g); this.wallGroups[key] = g;
        const tall = new THREE.Group(); g.add(tall); g.userData.tall = tall;
        const low = new THREE.Group(); g.add(low); g.userData.low = low;
        if (key === 'w0') {
          const ww = 2.6, y0 = 0.95, y1 = 2.55, side = (len - ww) / 2;
          for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(side, WALL_H, WALL_T), wm); m.position.set(sx * (ww / 2 + side / 2), WALL_H / 2, 0); m.receiveShadow = true; m.castShadow = true; tall.add(m); }
          const bot = new THREE.Mesh(new THREE.BoxGeometry(ww, y0, WALL_T), wm); bot.position.set(0, y0 / 2, 0); bot.receiveShadow = true; tall.add(bot);
          const topw = new THREE.Mesh(new THREE.BoxGeometry(ww, WALL_H - y1, WALL_T), wm); topw.position.set(0, (WALL_H + y1) / 2, 0); topw.castShadow = true; tall.add(topw);
          const fr = PW.mat('#F6F4EF', { rough: 0.45 });
          PW.rbox(tall, ww + 0.18, 0.07, 0.34, 0.02, fr, 0, y0, 0.09); PW.box(tall, ww + 0.12, 0.08, 0.2, fr, 0, y1, 0.0);
          for (const sx of [-1, 1]) PW.box(tall, 0.08, y1 - y0, 0.2, fr, sx * (ww / 2), (y0 + y1) / 2, 0);
          PW.box(tall, 0.05, y1 - y0, 0.07, fr, 0, (y0 + y1) / 2, 0); PW.box(tall, ww, 0.05, 0.07, fr, 0, (y0 + y1) / 2 + 0.2, 0);
          const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, y1 - y0), new THREE.MeshStandardMaterial({ color: '#CFE8FF', transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0.3, envMapIntensity: 1 })); glass.position.set(0, (y0 + y1) / 2, 0.0); tall.add(glass);
          const vt = (this.viewTex = PW.canvasTex(1024, 512, (c, w, h) => PW.paintView(PW.viewFor(def), c, w, h, 0)));
          const vp = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.2), new THREE.MeshBasicMaterial({ map: vt, toneMapped: false }));
          vp.position.set(0, 1.75, -0.36); tall.add(vp); this.viewPlane = vp;
          this.viewAnimated = !!PW.ANIMATED_VIEWS[def.view]; this.viewT = 0;
          // curtains: soft folds
          for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { const c = PW.cyl(tall, 0.06, 0.085, 1.95, cm, sx * (ww / 2 + 0.2 + i * 0.085), 1.62, 0.2, 12); c.scale.z = 0.7; }
          for (const sx of [-1, 1]) { const tie = PW.tor(tall, 0.17, 0.012, PW.mat('#C9A15A', { metal: 0.8, rough: 0.3 }), sx * (ww / 2 + 0.33), 1.3, 0.2); tie.rotation.x = Math.PI / 2; tie.scale.set(1, 0.55, 1); }
          PW.cyl(tall, 0.018, 0.018, ww + 1.3, PW.mat('#2A2B33', { metal: 0.6, rough: 0.3 }), 0, 2.68, 0.2, 8).rotation.z = Math.PI / 2;
          for (const sx of [-1, 1]) PW.sph(tall, 0.035, PW.mat('#C9A15A', { metal: 0.8, rough: 0.3 }), sx * (ww / 2 + 0.66), 2.68, 0.2, 10, 8);
          // sill plant
          if (def.sill) { const sp = new THREE.Group(); sp.position.set(0.85, y0 + 0.04, 0.12); tall.add(sp); if (PW.hasModel('d_plant')) { const pl = PW.buildItem('d_plant'); sp.add(pl); } }
        } else {
          const m = new THREE.Mesh(new THREE.BoxGeometry(len, WALL_H, WALL_T), wm); m.position.y = WALL_H / 2; m.receiveShadow = true; m.castShadow = true; tall.add(m);
        }
        PW.box(tall, len, 0.13, 0.045, trim, 0, 0.065, WALL_T / 2 + 0.012);
        PW.box(tall, len, 0.07, 0.06, trim, 0, WALL_H - 0.035, WALL_T / 2 + 0.012);
        PW.box(tall, len, WALL_T + 0.04, 0.04, trim, 0, WALL_H + 0.01, 0).rotation.x = Math.PI / 2;
        const lm = new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, WALL_T), wm); lm.position.y = 0.15; lm.receiveShadow = true; low.add(lm);
        PW.box(low, len, 0.04, WALL_T + 0.02, trim, 0, 0.31, 0);
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
      const desks = []; items.forEach((it, i) => { const d = PW.ITEM[it.id]; if (d && d.surface) desks.push({ i, it, d }); });
      const surfaceAt = (x, z) => { for (const { it, d } of desks) { let [fw, fd] = d.fp; if (it.r % 2) [fw, fd] = [fd, fw]; if (Math.abs(x - it.x) <= fw / 2 + 0.02 && Math.abs(z - it.z) <= fd / 2 + 0.02) return d.surface; } return 0; };
      this.surfaceAt = surfaceAt;
      items.forEach((it, i) => {
        const d = PW.ITEM[it.id]; if (!d) return;
        const g = PW.buildItem(it.id, { seed: i * 13 + 5, c: it.c, wd: it.wd, t: it.t, v: it.v }); g.userData.itemIndex = i;
        if (d.wall) { const wg = this.wallGroups[it.w] || this.wallGroups.w0; g.position.set(it.x || 0, d.wy || 1.6, WALL_T / 2 + 0.005); wg.userData.tall.add(g); }
        else { g.position.set(it.x, d.top ? surfaceAt(it.x, it.z) : 0, it.z); g.rotation.y = (it.r || 0) * Math.PI / 2; G.add(g); }
        g.traverse((o) => { if (o.isMesh) { if (!o.material.transparent && !d.rug) o.castShadow = true; o.receiveShadow = true; } });
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
          const x = it.x + s.x * c + s.z * sn, z = it.z - s.x * sn + s.z * c, ry = rot + (s.ry || 0);
          const fx = Math.sin(ry), fz = Math.cos(ry);
          let deskH = 0; for (const dd of [0.45, 0.6, 0.75]) { const hgt = surfaceAt(x + fx * dd, z + fz * dd); if (hgt) { deskH = hgt; break; } }
          this.seats.push({ x, z, ry, h: s.h, itemIndex: i, desk: deskH > 0, taken: null });
        });
      });
      this.buildAtmosphere();
      this.applyMood();
      this.baseRadius = size * 1.45 + 1.5;
      if (!this.focusMode) { this.cam.tRadius = this.baseRadius * (this.w < 700 ? 1.35 : 1); this.cam.tTarget.set(0, 0.6, 0); }
      for (const [id, a] of this.avatars) { if (a.seatIdx != null) { const s = a.seatIdx; a.seatIdx = null; this.sitAvatar(id, s < this.seats.length ? s : null); } }
      this.applyWallCut(true);
      if (this.edit.on) this.select(this.edit.sel);
    }
    buildAtmosphere() {
      const half = this.half, F = this.fxGroup;
      // window light shaft: frustum from the window opening toward the floor along the sun direction
      const dir = new THREE.Vector3(0.18, -0.62, 1).normalize();
      const wx = 1.2, y0 = 1.0, y1 = 2.5, z0 = -half + 0.05;
      const corners = [[-wx, y0], [wx, y0], [wx, y1], [-wx, y1]].map(([x, y]) => new THREE.Vector3(x, y, z0));
      const floorPts = corners.map((p) => { const t = -p.y / dir.y; return p.clone().add(dir.clone().multiplyScalar(t * 0.98)); });
      const pos = [], fade = [], uv = [], idx = [];
      const quad = (a, b, c, d, fa, fb) => { const o = pos.length / 3; [a, b, c, d].forEach((p) => pos.push(p.x, p.y + 0.01, p.z)); fade.push(fa, fa, fb, fb); uv.push(0, 0, 1, 0, 1, 1, 0, 1); idx.push(o, o + 1, o + 2, o, o + 2, o + 3); };
      for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(corners[i], corners[j], floorPts[j], floorPts[i], 0.9, 0.0); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('fade', new THREE.Float32BufferAttribute(fade, 1)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
      this.shaft = new THREE.Mesh(g, shaftMaterial('#FFE3B0')); this.shaft.renderOrder = 5; F.add(this.shaft);
      // floor light patch
      const patchTex = PW.canvasTex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); });
      const pc = floorPts.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(0.25);
      this.patch = new THREE.Mesh(new THREE.PlaneGeometry(wx * 2.4, Math.abs(floorPts[2].z - floorPts[1].z) + 1.2), new THREE.MeshBasicMaterial({ map: patchTex, color: '#FFD9A0', transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
      this.patch.rotation.x = -Math.PI / 2; this.patch.position.set(pc.x, 0.012, pc.z); F.add(this.patch);
      // dust motes
      const N = 160; const dp = new Float32Array(N * 3); this.dustSeed = [];
      for (let i = 0; i < N; i++) { const x = U.rand(-half + 0.3, half - 0.3), y = U.rand(0.2, 2.8), z = U.rand(-half + 0.3, half - 0.3); dp.set([x, y, z], i * 3); this.dustSeed.push([x, y, z, Math.random() * 6]); }
      const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
      this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.035, map: dotSprite(), color: '#FFE9C8', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      F.add(this.dust);
    }
    applyMood() {
      const def = this.def; if (!def) return;
      const M = PW.MOODS[def.mood] || PW.MOODS[PW.defaultMoodFor(def.view)];
      this.mood = M;
      const size = def.size || 7, half = size / 2;
      this.sun.color.set(M.sun); this.sun.intensity = M.sunI;
      this.sun.position.set(-size * 0.25, 6.5, -half - 4); this.sun.target.position.set(size * 0.1, 0, half * 0.4);
      const sc = this.sun.shadow.camera; sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size; sc.near = 0.5; sc.far = 30; sc.updateProjectionMatrix();
      this.hemi.intensity = M.hemi; this.hemi.color.set(M.hemiC); this.hemi.groundColor.set(M.hemiG);
      this.amb.intensity = M.amb; this.renderer.toneMappingExposure = M.exp;
      this.scene.background = new THREE.Color(M.bg);
      this.roomGroup.updateMatrixWorld(true);
      this.pointLights.forEach((p) => (p.intensity = 0));
      this.lightSpots.slice(0, this.pointLights.length).forEach((g, i) => { const p = this.pointLights[i]; const v = new THREE.Vector3(...g.userData.lightAt); g.localToWorld(v); p.position.copy(v); p.color.set(g.userData.lightColor || '#FFD3A0'); p.userData.base = (g.userData.lightPower || 1) * M.lamp; p.intensity = p.userData.base; p.distance = 6; p.userData.flicker = !!(g.userData.flicker || M.flicker); });
      if (M.neon) { this.neonLights[0].color.set(M.neon[0]); this.neonLights[1].color.set(M.neon[1]); this.neonLights[0].position.set(-half + 0.6, 2.4, -half + 0.6); this.neonLights[1].position.set(half - 0.6, 2.2, half * 0.2); this.neonLights.forEach((l) => (l.intensity = 1.6)); } else this.neonLights.forEach((l) => (l.intensity = 0));
      if (this.shaft) { this.shaft.material.uniforms.uOpacity.value = 0.13 * M.shafts; this.shaft.material.uniforms.uColor.value.set(M.sun); this.shaft.visible = M.shafts > 0.02; }
      if (this.patch) { this.patch.material.opacity = 0.25 * M.shafts; this.patch.material.color.set(M.sun); this.patch.visible = M.shafts > 0.02; }
      if (this.dust) { this.dust.material.opacity = 0.5 * M.dust; this.dust.material.color.set(M.neon ? '#E8D8FF' : '#FFE9C8'); }
      this.applyEnv();
      if (this.viewPlane) { const dark = DARK[def.mood] && !PW.viewIsNight[PW.viewFor(def)]; this.viewPlane.material.color.set(dark ? (def.mood === 'neon' ? '#7A64B8' : '#56609A') : def.mood === 'golden' && !PW.viewIsNight[def.view] ? '#FFE0C4' : '#FFFFFF'); }
      if (this.post) { this.post.bloom.strength = M.bloom; this.post.bloom.threshold = 0.82; this.post.grade.uniforms.uWarm.value = def.mood === 'golden' || def.mood === 'candle' ? 0.025 : 0; }
    }
    applyEnv(root) {
      const f = (this.mood && this.mood.env) || 1;
      (root || this.scene).traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) { if (m.envMapIntensity == null) continue; if (m.userData.env0 == null) m.userData.env0 = m.envMapIntensity; m.envMapIntensity = m.userData.env0 * f; } });
    }
    applyWallCut(force) {
      const p = this.camera.position; const ax = Math.abs(p.x), az = Math.abs(p.z);
      const cut = { w0: p.z < 0 && az > ax * 0.45, w2: p.z > 0 && az > ax * 0.45, w1: p.x < 0 && ax > az * 0.45, w3: p.x > 0 && ax > az * 0.45 };
      if (this.focusMode) { cut.w2 = true; cut.w3 = true; cut.w1 = p.x < 0 && ax > az * 0.45; }
      for (const k in this.wallGroups) { const g = this.wallGroups[k]; const c = !!cut[k]; if (force || g.userData.cut !== c) { g.userData.cut = c; g.userData.tall.visible = !c; g.userData.low.visible = c; } }
    }

    /* ---------------- avatars ---------------- */
    addAvatar(id, cfg, info = {}) {
      if (this.avatars.has(id)) { this.updateAvatarInfo(id, info); return this.avatars.get(id); }
      const av = new PW.Avatar(cfg); av.root.userData.avId = id; this.avGroup.add(av.root); this.applyEnv(av.root);
      const tag = document.createElement('div'); tag.className = 'tag' + (info.isMe ? ' me' : '') + (info.npc ? ' npc' : '');
      tag.innerHTML = '<div class="bubble" hidden></div><div class="nm"><span class="lv"></span><span class="n"></span><span class="st"></span></div>';
      this.tagsHost.appendChild(tag);
      const a = { id, av, tag, info: {}, seatIdx: null, target: null, cfgKey: JSON.stringify(cfg) };
      this.avatars.set(id, a); this.updateAvatarInfo(id, info);
      const p = info.pos || this.spawnPoint(); av.root.position.set(p.x, 0, p.z); av.root.rotation.y = Math.random() * 6;
      return a;
    }
    spawnPoint() { const h = (this.half || 3) - 0.8; return { x: U.rand(-h, h) * 0.6, z: h * 0.7 }; }
    updateAvatarInfo(id, info) {
      const a = this.avatars.get(id); if (!a) return;
      Object.assign(a.info, info);
      const q = (s) => a.tag.querySelector(s);
      q('.n').textContent = a.info.name || 'Misafir'; q('.lv').textContent = a.info.level || 1;
      const st = a.info.status || ''; const stEl = q('.st'); stEl.className = 'st ' + st; stEl.textContent = st === 'focus' ? (a.info.timer || 'odak') : st === 'break' ? 'mola' : ''; stEl.hidden = !st || st === 'paused';
      if (info.cfg) { const key = JSON.stringify(info.cfg); if (key !== a.cfgKey) { a.cfgKey = key; a.av.build(info.cfg); this.applyEnv(a.av.root); } }
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
      const s = this.seats[idx]; if (s.taken && s.taken !== id) return false;
      s.taken = id; a.seatIdx = idx;
      a.av.root.position.set(s.x, 0, s.z); a.av.root.rotation.y = s.ry; a.av.seatH = s.h; a.av.setState('sit');
      return true;
    }
    standAvatar(id) { const a = this.avatars.get(id); if (!a) return; if (a.seatIdx != null && this.seats[a.seatIdx]) { const s = this.seats[a.seatIdx]; s.taken = null; a.av.root.position.set(s.x - Math.sin(s.ry) * 0.55, 0, s.z - Math.cos(s.ry) * 0.55); } a.seatIdx = null; a.av.setState('stand'); }
    walkTo(id, x, z) { const a = this.avatars.get(id); if (!a) return; if (a.seatIdx != null) this.standAvatar(id); a.target = new THREE.Vector3(x, 0, z); }
    setAct(id, act) { const a = this.avatars.get(id); if (a) a.av.act = act; }
    emote(id, e) { const a = this.avatars.get(id); if (a) a.av.doEmote(e, 3200); }
    bubble(id, text) {
      const a = this.avatars.get(id); if (!a) return;
      const b = a.tag.querySelector('.bubble'); b.textContent = text; b.hidden = false; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
      a.av.say(Math.min(4500, 900 + text.length * 70));
      clearTimeout(a.bubT); a.bubT = setTimeout(() => (b.hidden = true), 4500 + Math.min(4000, text.length * 60));
    }
    focusOn(id) { if (this.avatars.has(id)) this.followId = id; }
    unfollow() { this.followId = null; this.cam.tTarget.set(0, 0.6, 0); }
    // close, cosy framing on one avatar (focus screen)
    setFocusCam(id) {
      if (!id) { this.focusMode = false; this.followId = null; this.cam.tTarget.set(0, 0.6, 0); this.cam.tRadius = this.baseRadius * (this.w < 700 ? 1.35 : 1); this.cam.tPhi = 0.98; this.cam.tTheta = 0.62; return; }
      const a = this.avatars.get(id); if (!a) return;
      this.focusMode = true; this.followId = null;
      const r = a.av.root; const ry = r.rotation.y;
      this.cam.tTarget.set(r.position.x + Math.sin(ry) * 0.25, 1.05, r.position.z + Math.cos(ry) * 0.25);
      this.cam.tRadius = this.w < 700 ? 5.4 : 4.7; this.cam.tPhi = 1.06; this.cam.tTheta = ry + 0.6;
    }
    flyIn() { this.cam.radius = 34; this.cam.phi = 0.45; this.cam.theta = this.cam.theta - 1.6; this.cam.tTheta = 0.62; this.cam.tPhi = 0.98; }

    /* ---------------- editor ---------------- */
    setEdit(on) { this.edit.on = on; if (!on) { this.cancelGhost(); this.select(-1); } }
    select(idx) { this.edit.sel = idx; if (this.selBox) { this.scene.remove(this.selBox); this.selBox = null; } if (idx >= 0 && this.itemGroups[idx]) { this.selBox = new THREE.BoxHelper(this.itemGroups[idx], '#FFD24F'); this.scene.add(this.selBox); } }
    startGhost(id, rot = 0, extra = {}) {
      this.cancelGhost();
      const d = PW.ITEM[id]; const g = PW.buildItem(id, Object.assign({ seed: 99 }, extra));
      g.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.6; o.castShadow = false; } });
      this.edit.ghost = g; this.edit.ghostDef = d; this.edit.rot = rot; this.edit.extra = extra; this.scene.add(g); this.moveGhost();
    }
    rotateGhost() { if (this.edit.ghost) { this.edit.rot = (this.edit.rot + 1) % 4; this.moveGhost(); return true; } return false; }
    cancelGhost() { if (this.edit.ghost) { this.scene.remove(this.edit.ghost); this.edit.ghost = null; this.edit.ghostDef = null; } }
    moveGhost() {
      const g = this.edit.ghost, d = this.edit.ghostDef; if (!g) return; const h = this.half;
      if (d.wall) {
        this.ray.setFromCamera(this.ptr, this.camera);
        let best = null;
        for (const [k, wg] of Object.entries(this.wallGroups)) { if (!wg.userData.tall.visible) continue; const hit = this.ray.intersectObject(wg.userData.tall, true)[0]; if (hit && (!best || hit.distance < best.d)) best = { k, d: hit.distance, p: hit.point }; }
        if (!best) { g.visible = false; this.edit.pos = null; return; }
        g.visible = true; const k = best.k, p = best.p;
        let u = k === 'w0' ? p.x : k === 'w2' ? -p.x : k === 'w1' ? -p.z : p.z;
        u = Math.round(U.clamp(u, -h + (d.ww || 1) / 2 + 0.1, h - (d.ww || 1) / 2 - 0.1) * 4) / 4;
        const wg = this.wallGroups[k]; const v = new THREE.Vector3(u, d.wy || 1.6, WALL_T / 2 + 0.03); wg.localToWorld(v);
        g.position.copy(v); g.rotation.y = wg.rotation.y; this.edit.pos = { id: d.id, w: k, x: u };
      } else {
        const p = this.floorHit(); if (!p) return;
        let [fw, fd] = d.fp || [0.5, 0.5]; if (this.edit.rot % 2) [fw, fd] = [fd, fw];
        const x = Math.round(U.clamp(p.x, -h + fw / 2, h - fw / 2) * 4) / 4, z = Math.round(U.clamp(p.z, -h + fd / 2, h - fd / 2) * 4) / 4;
        g.visible = true; g.position.set(x, d.top ? this.surfaceAt(x, z) || 0 : 0, z); g.rotation.y = (this.edit.rot * Math.PI) / 2;
        this.edit.pos = Object.assign({ id: d.id, x, z, r: this.edit.rot }, this.edit.extra || {});
      }
    }
    placeGhost() { const pos = this.edit.pos; if (!pos) return; const cb = this.onPlace; this.cancelGhost(); if (cb) cb(pos); }

    /* ---------------- loop ---------------- */
    loop() {
      requestAnimationFrame(this.loop);
      if (document.hidden) return;
      const dt = Math.min(0.05, this.clock.getDelta()); this.time += dt;
      const c = this.cam;
      if (this.followId && this.avatars.has(this.followId)) { const r = this.avatars.get(this.followId).av.root.position; c.tTarget.set(r.x * 0.6, 0.8, r.z * 0.6); }
      const k1 = 1 - Math.pow(0.02, dt), k2 = 1 - Math.pow(0.03, dt);
      c.target.lerp(c.tTarget, k1);
      c.radius += (c.tRadius - c.radius) * k2;
      if (c.tTheta != null) { let d = c.tTheta - c.theta; d = Math.atan2(Math.sin(d), Math.cos(d)); c.theta += d * k2; if (Math.abs(d) < 0.002) c.tTheta = null; }
      if (c.tPhi != null) { c.phi += (c.tPhi - c.phi) * k2; if (Math.abs(c.tPhi - c.phi) < 0.002) c.tPhi = null; }
      const sp = Math.sin(c.phi);
      this.camera.position.set(c.target.x + c.radius * sp * Math.sin(c.theta), c.target.y + c.radius * Math.cos(c.phi), c.target.z + c.radius * sp * Math.cos(c.theta));
      this.camera.lookAt(c.target);
      // focus framing: slide the avatar to the side (desktop) or top (phone) so the timer has room
      const wide = this.w >= 900; const ox = this.focusMode && wide ? -0.2 : 0, oy = this.focusMode && !wide ? 0.2 : 0;
      this.vo = this.vo || { x: 0, y: 0 }; this.vo.x += (ox - this.vo.x) * k2; this.vo.y += (oy - this.vo.y) * k2;
      if (Math.abs(this.vo.x) > 0.001 || Math.abs(this.vo.y) > 0.001) { this.camera.setViewOffset(this.w, this.h, this.vo.x * this.w, this.vo.y * this.h, this.w, this.h); this._vo = true; }
      else if (this._vo) { this.camera.clearViewOffset(); this._vo = false; }
      if (this.half) this.applyWallCut(false);
      for (const g of this.animated) g.userData.update(this.time, dt);
      for (const p of this.pointLights) if (p.userData.flicker && p.intensity > 0) p.intensity = p.userData.base * (0.85 + Math.sin(this.time * 11 + p.id) * 0.08 + Math.sin(this.time * 23) * 0.05);
      if (this.viewAnimated && this.viewTex) { this.viewT += dt; if (this.viewT > 0.11) { this.viewT = 0; PW.paintView(PW.viewFor(this.def), this.viewTex.userData.ctx, 1024, 512, this.time); this.viewTex.needsUpdate = true; } }
      if (this.shaft) this.shaft.material.uniforms.uTime.value = this.time;
      if (this.dust) { const a = this.dust.geometry.attributes.position; for (let i = 0; i < this.dustSeed.length; i++) { const s = this.dustSeed[i]; a.setXYZ(i, s[0] + Math.sin(this.time * 0.2 + s[3]) * 0.25, ((s[1] + this.time * 0.04 + s[3]) % 2.8) + 0.1, s[2] + Math.cos(this.time * 0.17 + s[3]) * 0.25); } a.needsUpdate = true; }
      for (const [, a] of this.avatars) {
        const av = a.av, root = av.root;
        if (a.target) {
          const dx = a.target.x - root.position.x, dz = a.target.z - root.position.z, dist = Math.hypot(dx, dz);
          if (dist < 0.05) { a.target = null; av.setState('stand'); if (a.onArrive) { const f = a.onArrive; a.onArrive = null; f(); } }
          else { av.setState('walk'); const s = Math.min(dist, dt * 1.9 * (PW.walkBoost || 1)); root.position.x += (dx / dist) * s; root.position.z += (dz / dist) * s; const want = Math.atan2(dx, dz); let d = want - root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); root.rotation.y += d * Math.min(1, dt * 10); }
        }
        av.update(dt, this.time);
        av.headWorld(this.tmpV); this.tmpV.y += 0.1; this.tmpV.project(this.camera);
        const vis = this.tmpV.z < 1 && Math.abs(this.tmpV.x) < 1.2 && Math.abs(this.tmpV.y) < 1.2 && !this.hideTags;
        a.tag.style.display = vis ? '' : 'none';
        if (vis) { const x = (this.tmpV.x * 0.5 + 0.5) * this.w, y = (-this.tmpV.y * 0.5 + 0.5) * this.h; a.tag.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; a.tag.style.zIndex = String(1000 - Math.round(this.tmpV.z * 500)); }
      }
      if (this.selBox) this.selBox.update();
      if (this.post) { if (this.post.tone) this.post.tone.uniforms.uExp.value = this.renderer.toneMappingExposure; this.post.comp.render(dt); } else this.renderer.render(this.scene, this.camera);
    }
  }
  PW.World = World;

  /* ---------------- avatar preview (character studio) ---------------- */
  class Preview {
    constructor(host) {
      this.host = host;
      const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }));
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.95; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
      host.appendChild(r.domElement);
      this.scene = new THREE.Scene();
      try { if (THREE.RoomEnvironment) { const pm = new THREE.PMREMGenerator(r); this.scene.environment = pm.fromScene(new THREE.RoomEnvironment(), 0.04).texture; } } catch (e) {}
      this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
      this.scene.add(new THREE.HemisphereLight('#FFF6EC', '#6A5A7A', 0.42));
      const d = new THREE.DirectionalLight('#FFE9D6', 1.15); d.position.set(2, 4, 3); d.castShadow = true; d.shadow.mapSize.set(1024, 1024); d.shadow.radius = 4; this.scene.add(d);
      const rim = new THREE.DirectionalLight('#9DB7FF', 0.7); rim.position.set(-3, 2, -3); this.scene.add(rim);
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.08, 64), PW.mat('#E9DCC8', { rough: 0.9 })); plat.position.y = -0.04; plat.receiveShadow = true; this.scene.add(plat);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.77, 0.015, 8, 64), PW.mat('#E8553D', { emissive: '#E8553D', ei: 0.6 })); ring.rotation.x = Math.PI / 2; this.scene.add(ring);
      this.rot = 0.35; this.zoom = 'full'; this.clock = new THREE.Clock(); this.t = 0;
      let drag = null;
      r.domElement.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, r: this.rot }; r.domElement.setPointerCapture(e.pointerId); });
      r.domElement.addEventListener('pointermove', (e) => { if (drag) this.rot = drag.r + (e.clientX - drag.x) * 0.012; });
      r.domElement.addEventListener('pointerup', () => (drag = null));
      r.domElement.style.touchAction = 'none';
      this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
      new ResizeObserver(() => this.resize()).observe(host); this.resize();
    }
    resize() { const w = this.host.clientWidth || 300, h = this.host.clientHeight || 300; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    setAvatar(cfg) { if (this.av) this.scene.remove(this.av.root); this.av = new PW.Avatar(cfg); this.scene.add(this.av.root); }
    setZoom(z) { this.zoom = z; }
    wave() { if (this.av) this.av.doEmote('wave', 2400); }
    loop() {
      if (!this.host.isConnected) return;
      requestAnimationFrame(this.loop);
      if (this.host.offsetParent === null) return;
      const dt = Math.min(0.05, this.clock.getDelta()); this.t += dt;
      const ht = (this.av && this.av.cfg.ht) || 1;
      const Z = { full: [0.92, 4.4], face: [1.55 * ht, 1.25], head: [1.52 * ht, 2.0], torso: [1.15 * ht, 2.7], legs: [0.5, 2.9] }[this.zoom] || [0.92, 4.4];
      this.cy = this.cy == null ? Z[0] : this.cy + (Z[0] - this.cy) * 0.12; this.cd = this.cd == null ? Z[1] : this.cd + (Z[1] - this.cd) * 0.12;
      this.camera.position.set(0, this.cy + 0.15, this.cd); this.camera.lookAt(0, this.cy, 0);
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
    const key = id + (d.cat === 'avatar' ? '|' + (avatarBase ? [avatarBase.g, avatarBase.sk, avatarBase.hc, avatarBase.tc, avatarBase.hs].join(',') : '') : '');
    if (thumbCache[key]) return thumbCache[key];
    if (d.cat === 'theme') return (thumbCache[key] = themeSwatch(d));
    if (d.cat === 'view') return (thumbCache[key] = viewSwatch(d));
    if (d.cat === 'size') return (thumbCache[key] = sizeSwatch(d));
    if (!thumbR) {
      thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); thumbR.setSize(160, 160); thumbR.outputEncoding = THREE.sRGBEncoding; thumbR.toneMapping = THREE.ACESFilmicToneMapping; thumbR.toneMappingExposure = 0.95;
      thumbS = new THREE.Scene(); thumbS.add(new THREE.HemisphereLight('#FFF6EC', '#4A3F5E', 0.55)); const dl = new THREE.DirectionalLight('#FFF1E0', 1.15); dl.position.set(2, 4, 4); thumbS.add(dl); const dl2 = new THREE.DirectionalLight('#9DB7FF', 0.35); dl2.position.set(-3, 1, -2); thumbS.add(dl2);
      try { if (THREE.RoomEnvironment) { const pm = new THREE.PMREMGenerator(thumbR); thumbS.environment = pm.fromScene(new THREE.RoomEnvironment(), 0.04).texture; } } catch (e) {}
      thumbC = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
    }
    let obj;
    if (d.cat === 'avatar') {
      const base = Object.assign({}, avatarBase || PW.defaultAvatar(d.g === 'f' ? 'f' : 'm'));
      if (d.g === 'f') base.g = 'f'; if (d.g === 'm') base.g = 'm';
      if (d.slot === 'hair') base.hs = id; else if (d.slot === 'beard') base.fh = id; else if (d.slot === 'top') base.top = id; else if (d.slot === 'bottom') base.bot = id; else if (d.slot === 'shoes') base.sh = id; else if (d.slot === 'acc') base.acc = [id];
      if (d.slot !== 'acc') base.acc = [];
      const av = new PW.Avatar(base); av.update(0.016, 0); obj = av.root;
      const ht = base.ht || 1;
      const zone = { hair: [1.62 * ht, 1.25], beard: [1.55 * ht, 0.95], acc: d.sub === 'neck' ? [1.38 * ht, 1.2] : d.sub === 'back' ? [1.25 * ht, 2.0] : d.sub === 'wrist' ? [1.0, 1.6] : [1.62 * ht, 1.25], top: [1.2 * ht, 2.0], bottom: [0.55, 2.1], shoes: [0.1, 1.0] }[d.slot] || [1, 3];
      obj.rotation.y = d.sub === 'back' ? Math.PI * 0.8 : 0.35;
      thumbC.position.set(0, zone[0] + 0.08, zone[1]); thumbC.lookAt(0, zone[0], 0);
    } else {
      obj = PW.buildItem(id, { seed: 3 }); obj.rotation.y = d.wall ? 0 : -0.6;
      const bb = new THREE.Box3().setFromObject(obj); const sz = bb.getSize(new THREE.Vector3()), ct = bb.getCenter(new THREE.Vector3());
      const m = Math.max(sz.x, sz.y, sz.z) || 1;
      thumbC.position.set(ct.x + m * 0.9, ct.y + m * 0.75, ct.z + m * 1.9); thumbC.lookAt(ct);
    }
    thumbS.add(obj); thumbR.render(thumbS, thumbC); thumbS.remove(obj);
    return (thumbCache[key] = thumbR.domElement.toDataURL('image/png'));
  };
  function themeSwatch(th) { const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d'); const S = { id: th.id, wall: th.wall, wall2: th.wall2, wallpat: th.wallpat, floor: th.floor, floor2: th.floor2, pat: th.pat, trim: th.trim }; const ft = PW.floorTex(S, 4).image, wt = PW.wallTex(S).image; g.drawImage(wt, 0, 0, 512, 300, 0, 0, 160, 96); g.drawImage(ft, 0, 0, 256, 128, 0, 96, 160, 64); g.fillStyle = th.trim; g.fillRect(0, 92, 160, 6); return c.toDataURL(); }
  function viewSwatch(v) { const c = document.createElement('canvas'); c.width = 256; c.height = 160; const g = c.getContext('2d'); PW.paintView(v.id, g, 256, 160, 2); g.strokeStyle = '#F6F4EF'; g.lineWidth = 10; g.strokeRect(0, 0, 256, 160); g.fillStyle = '#F6F4EF'; g.fillRect(124, 0, 8, 160); return c.toDataURL(); }
  function sizeSwatch(s) { const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d'); const n = s.size; const cell = 120 / 11; g.fillStyle = '#3A3858'; g.fillRect(0, 0, 160, 160); g.fillStyle = '#E8553D'; const w = n * cell; g.fillRect(80 - w / 2, 80 - w / 2, w, w); g.strokeStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(80 - w / 2 + i * cell, 80 - w / 2); g.lineTo(80 - w / 2 + i * cell, 80 + w / 2); g.stroke(); g.beginPath(); g.moveTo(80 - w / 2, 80 - w / 2 + i * cell); g.lineTo(80 + w / 2, 80 - w / 2 + i * cell); g.stroke(); } return c.toDataURL(); }
  PW.surfaceSwatch = (kind, val, def) => { const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d'); const S = PW.surfaceOf(Object.assign({}, def, kind === 'wallPat' ? { wallPat: val } : kind === 'floorT' ? { floorT: val } : {})); const img = kind === 'floorT' ? PW.floorTex(S, 4).image : PW.wallTex(S).image; g.drawImage(img, 0, 0, 256, 256, 0, 0, 96, 96); return c.toDataURL(); };
})();
