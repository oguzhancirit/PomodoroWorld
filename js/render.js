/* Pomodoro World — rendering upgrade layer
   Ideas borrowed from how The Sims 4 makes small interiors read well:
   - contact shadows / ambient occlusion where objects meet the floor and walls meet each other
   - a soft rim light on characters so silhouettes read at camera distance
   - one "active character" marker that also tells you the state at a glance
   - Walls up / cutaway / walls down camera modes
   Performance: static furniture is merged per material (≈5× fewer draw calls), an adaptive governor
   drops expensive effects on slow devices, and the frame rate is capped while you sit in the focus screen. */
(function () {
  const PW = window.PW, U = PW.util, W = PW.World.prototype;
  const WALL_T = 0.16;

  /* ---------- shared textures ---------- */
  let _soft = null, _vgrad = null;
  function softTex() {
    if (_soft) return _soft;
    _soft = PW.canvasTex(128, 128, (c) => {
      c.clearRect(0, 0, 128, 128);
      c.save(); c.shadowColor = 'rgba(0,0,0,1)'; c.shadowBlur = 26; c.shadowOffsetX = 1000;
      c.fillStyle = '#000'; c.beginPath(); const x = 34 - 1000, y = 34, w = 60, h = 60, r = 14;
      c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.fill(); c.restore();
    });
    _soft.encoding = THREE.LinearEncoding; return _soft;
  }
  function vGradTex() {
    if (_vgrad) return _vgrad;
    _vgrad = PW.canvasTex(4, 128, (c) => { const g = c.createLinearGradient(0, 128, 0, 0); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.35, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.clearRect(0, 0, 4, 128); c.fillStyle = g; c.fillRect(0, 0, 4, 128); });
    _vgrad.encoding = THREE.LinearEncoding; return _vgrad;
  }
  const shadowMat = (tex, opacity) => new THREE.MeshBasicMaterial({ map: tex, color: '#000000', transparent: true, opacity, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

  /* ---------- static geometry merge (per item, per material) ---------- */
  function mergeList(list) {
    const names = Object.keys(list[0].geo.attributes);
    let vCount = 0, iCount = 0;
    for (const { geo } of list) { vCount += geo.attributes.position.count; iCount += geo.index ? geo.index.count : geo.attributes.position.count; }
    const arrays = {}; names.forEach((n) => (arrays[n] = new Float32Array(vCount * list[0].geo.attributes[n].itemSize)));
    const idx = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);
    const v = new THREE.Vector3(), nm = new THREE.Matrix3();
    let vo = 0, io = 0;
    for (const { geo, m } of list) {
      nm.getNormalMatrix(m); const n = geo.attributes.position.count; const flip = m.determinant() < 0;
      for (const name of names) {
        const a = geo.attributes[name], it = a.itemSize, dst = arrays[name], src = a.array;
        if (name === 'position') for (let i = 0; i < n; i++) { v.fromBufferAttribute(a, i).applyMatrix4(m); dst[(vo + i) * 3] = v.x; dst[(vo + i) * 3 + 1] = v.y; dst[(vo + i) * 3 + 2] = v.z; }
        else if (name === 'normal') for (let i = 0; i < n; i++) { v.fromBufferAttribute(a, i).applyMatrix3(nm).normalize(); dst[(vo + i) * 3] = v.x; dst[(vo + i) * 3 + 1] = v.y; dst[(vo + i) * 3 + 2] = v.z; }
        else for (let i = 0; i < n * it; i++) dst[vo * it + i] = src[i];
      }
      if (geo.index) { const s = geo.index.array; for (let i = 0; i < s.length; i += 3) { idx[io + i] = s[i] + vo; idx[io + i + 1] = s[flip ? i + 2 : i + 1] + vo; idx[io + i + 2] = s[flip ? i + 1 : i + 2] + vo; } io += s.length; }
      else { for (let i = 0; i < n; i += 3) { idx[io + i] = vo + i; idx[io + i + 1] = vo + (flip ? i + 2 : i + 1); idx[io + i + 2] = vo + (flip ? i + 1 : i + 2); } io += n; }
      vo += n;
    }
    const out = new THREE.BufferGeometry();
    names.forEach((n) => out.setAttribute(n, new THREE.BufferAttribute(arrays[n], list[0].geo.attributes[n].itemSize)));
    out.setIndex(new THREE.BufferAttribute(idx, 1)); out.computeBoundingSphere(); out.computeBoundingBox();
    return out;
  }
  const r3 = (x) => (x == null ? '' : Math.round(x * 1000) / 1000);
  function matSig(m) {
    if (!m.isMeshStandardMaterial || m.onBeforeCompile && m.onBeforeCompile.toString().length > 30 && !m.userData.rim) return m.uuid;
    return [m.type, m.color && m.color.getHexString(), m.emissive && m.emissive.getHexString(), r3(m.emissiveIntensity), r3(m.roughness), r3(m.metalness), m.map ? m.map.uuid : '', m.emissiveMap ? m.emissiveMap.uuid : '', m.transparent, r3(m.opacity), m.side, m.vertexColors, m.flatShading, r3(m.envMapIntensity), m.alphaTest, m.depthWrite].join(':');
  }
  PW.mergeStatic = function (g) {
    if (g.userData.update || g.userData.noMerge) return 0;
    g.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
    const buckets = new Map();
    g.traverse((o) => {
      if (!o.isMesh || Array.isArray(o.material) || o.userData.keep || !o.visible) return;
      const geo = o.geometry; if (!geo.attributes.position || geo.morphAttributes && Object.keys(geo.morphAttributes).length) return;
      const sig = Object.keys(geo.attributes).sort().map((k) => k + geo.attributes[k].itemSize + (geo.attributes[k].isInterleavedBufferAttribute ? '#IL' : '')).join(',');
      if (sig.includes('#IL')) return;
      const key = matSig(o.material) + '|' + sig + '|' + o.castShadow + o.receiveShadow + '|' + o.renderOrder;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({ o, geo, m: inv.clone().multiply(o.matrixWorld) });
    });
    let saved = 0;
    for (const list of buckets.values()) {
      if (list.length < 2) continue;
      const merged = new THREE.Mesh(mergeList(list), list[0].o.material);
      merged.castShadow = list[0].o.castShadow; merged.receiveShadow = list[0].o.receiveShadow; merged.renderOrder = list[0].o.renderOrder;
      list.forEach(({ o }) => o.parent && o.parent.remove(o));
      g.add(merged); saved += list.length - 1;
    }
    return saved;
  };

  // merge only the direct mesh children of a group (keeps every animated joint intact)
  PW.mergeShallow = function (group) {
    const buckets = new Map();
    for (const o of group.children) {
      if (!o.isMesh || o.userData.keep || Array.isArray(o.material) || !o.visible) continue;
      const geo = o.geometry; if (!geo.attributes.position) continue;
      const sig = Object.keys(geo.attributes).sort().map((k) => k + geo.attributes[k].itemSize + (geo.attributes[k].isInterleavedBufferAttribute ? '#IL' : '')).join(',');
      if (sig.includes('#IL')) continue;
      o.updateMatrix();
      const key = matSig(o.material) + '|' + sig + '|' + o.castShadow + o.receiveShadow + '|' + o.renderOrder;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({ o, geo, m: o.matrix.clone() });
    }
    for (const list of buckets.values()) {
      if (list.length < 2) continue;
      const merged = new THREE.Mesh(mergeList(list), list[0].o.material);
      merged.castShadow = list[0].o.castShadow; merged.receiveShadow = list[0].o.receiveShadow; merged.renderOrder = list[0].o.renderOrder;
      list.forEach(({ o }) => group.remove(o)); group.add(merged);
    }
  };
  const AvP = PW.Avatar.prototype, origBuild = AvP.build;
  AvP.build = function (cfg) {
    if (this.body && this.body.children.length) PW.disposeTree(this.body, false);
    origBuild.call(this, cfg);
    const P = this.parts || {};
    [P.skirt, P.mouth, this.halo].forEach((o) => o && (o.userData.keep = true));
    const groups = []; this.body.traverse((o) => { if (!o.isMesh) groups.push(o); });
    groups.forEach((g) => PW.mergeShallow(g));
    this.body.traverse((o) => { if (o.isMesh && o.material && !Array.isArray(o.material)) { PW.rimify(o.material); const m = o.material; if (m.isMeshStandardMaterial && !m.userData.envSet) { m.userData.envSet = true; m.envMapIntensity = Math.min(m.envMapIntensity, 0.45); } } });
  };

  /* ---------- material polish ---------- */
  function bumpify(m, scale) {
    if (!m || !m.isMeshStandardMaterial) return; m.userData = m.userData || {}; if (m.userData.bumped || !m.isMeshStandardMaterial || !m.map || m.transparent || m.bumpMap) return;
    m.userData.bumped = true; m.bumpMap = m.map; m.bumpScale = scale; m.needsUpdate = true;
  }
  PW.RIM = { value: new THREE.Color('#FFE6C8').multiplyScalar(0.5) };
  PW.rimify = function (m) {
    if (!m || !m.isMeshStandardMaterial) return; m.userData = m.userData || {}; if (m.userData.rim || !m.isMeshStandardMaterial || m.transparent) return;
    m.userData.rim = true;
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      sh.uniforms.uRim = PW.RIM;
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uRim;')
        .replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', 'float rimF = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.6);\n\toutgoingLight += uRim * rimF * (0.18 + diffuseColor.rgb * 0.55);\n\tgl_FragColor = vec4( outgoingLight, diffuseColor.a );');
    };
    m.customProgramCacheKey = () => 'pw-rim';
    m.needsUpdate = true;
  };
  const RIM_BY_MOOD = { day: ['#FFF1DC', 0.55], golden: ['#FFC48A', 0.8], night: ['#9BB2FF', 0.75], neon: ['#FF7AD9', 0.9], candle: ['#FFA05A', 0.8] };

  /* ---------- GPU memory: free what a rebuilt room / avatar leaves behind ---------- */
  // Every edit in the room designer rebuilds the room; without this, GPU memory grows with each click.
  const TEX_KEYS = ['map', 'bumpMap', 'emissiveMap', 'alphaMap', 'roughnessMap', 'normalMap', 'aoMap'];
  PW.disposeTree = function (root, withTextures) {
    if (!root) return;
    const mats = new Set();
    root.traverse((o) => { if (o.geometry && o.geometry.dispose) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m)); });
    mats.forEach((m) => { if (withTextures) TEX_KEYS.forEach((k) => m[k] && m[k].dispose && m[k].dispose()); if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u && u.value && u.value.isTexture && withTextures) u.value.dispose(); m.dispose && m.dispose(); });
  };
  /* ---------- room enhancement after every load ---------- */
  const origLoad = W.loadRoom;
  W.loadRoom = function (def) {
    const oldRoom = this.roomGroup, oldFx = this.fxGroup;
    origLoad.call(this, def);
    if (oldRoom && oldRoom !== this.roomGroup) PW.disposeTree(oldRoom, true);
    if (oldFx && oldFx !== this.fxGroup) PW.disposeTree(oldFx, true);
    try { this.enhanceRoom(); } catch (e) { console.warn('enhance failed', e); }
  };
  W.enhanceRoom = function () {
    const G = this.roomGroup, half = this.half, items = this.items || [];
    // fine surface relief on textured materials (wood grain, weave, tiles)
    G.traverse((o) => { if (o.isMesh && o.material && o.material.map && !o.material.transparent) bumpify(o.material, o.material.map.repeat && o.material.map.repeat.x > 1.5 ? 0.012 : 0.02); });
    // contact shadows under floor furniture
    const soft = softTex();
    this.itemGroups.forEach((g) => {
      const i = g.userData.itemIndex, it = items[i]; const d = it && PW.ITEM[it.id]; if (!d || d.wall || d.rug) return;
      let [fw, fd] = d.fp || [0.5, 0.5]; if ((it.r || 0) % 2) [fw, fd] = [fd, fw];
      const onTop = d.top && g.position.y > 0.05;
      const big = fw * fd;
      const op = onTop ? 0.45 : U.clamp(0.58 + big * 0.06, 0.58, 0.8);
      const pad = onTop ? 1.35 : 1.6;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(fw * pad + 0.12, fd * pad + 0.12), shadowMat(soft, op));
      m.rotation.x = -Math.PI / 2; m.position.set(g.position.x, (onTop ? g.position.y : 0) + 0.012, g.position.z); m.renderOrder = 2; m.userData.decal = true;
      G.add(m);
    });
    // occlusion where walls meet the floor and each other
    const vg = vGradTex();
    for (const [k, wg] of Object.entries(this.wallGroups)) {
      const tall = wg.userData.tall, L = this.half * 2;
      const base = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.75), shadowMat(vg, 0.42)); base.position.set(0, 0.375, WALL_T / 2 + 0.004); base.renderOrder = 2; base.userData.decal = true; tall.add(base);
      for (const sx of [-1, 1]) {
        const cm = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.42), shadowMat(vg, 0.22)); cm.rotation.z = sx * Math.PI / 2; cm.position.set(sx * (half - 0.21), 1.6, WALL_T / 2 + 0.004); cm.renderOrder = 2; cm.userData.decal = true; tall.add(cm);
      }
      // floor strip in front of each wall (stays when the wall is cut away)
      const fs = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.55), shadowMat(vg, 0.42)); fs.rotation.set(-Math.PI / 2, 0, Math.PI); fs.position.set(0, 0.006, WALL_T / 2 + 0.275); fs.renderOrder = 1; fs.userData.decal = true; wg.add(fs);
    }
    // fewer draw calls: merge each static item into one mesh per material
    let saved = 0; this.itemGroups.forEach((g) => (saved += PW.mergeStatic(g)));
    this.mergedSaved = saved;
    this.applyWallCut(true);
  };

  /* ---------- characters: rim light, warm skin, contact shadow ---------- */
  const origAdd = W.addAvatar;
  W.addAvatar = function (id, cfg, info) {
    const a = origAdd.call(this, id, cfg, info);
    if (a && !a.blob) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), shadowMat(softTex(), 0.5)); b.rotation.x = -Math.PI / 2; b.position.y = 0.014; b.renderOrder = 2; b.raycast = () => {};
      a.av.root.add(b); a.blob = b;
    }
    if (a) PW.polishAvatar(a.av);
    return a;
  };
  PW.polishAvatar = function (av) {
    av.root.traverse((o) => { if (o.isMesh && o.material && !Array.isArray(o.material)) PW.rimify(o.material); });
  };

  const origRemove = W.removeAvatar;
  W.removeAvatar = function (id) { const a = this.avatars.get(id); origRemove.call(this, id); if (a) PW.disposeTree(a.av.root, false); };

  /* ---------- active-character marker (Sims-style state gem) ---------- */
  const GEM_COL = { focus: '#3DDC84', paused: '#F2C14E', break: '#5AB0FF', idle: '#F06A4A' };
  W.ensureGem = function () {
    if (this.gem) return this.gem;
    const geo = new THREE.OctahedronGeometry(0.075, 0); geo.scale(0.78, 1.45, 0.78);
    const m = new THREE.MeshStandardMaterial({ color: '#3DDC84', emissive: '#3DDC84', emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.94 });
    this.gem = new THREE.Mesh(geo, m); this.gem.renderOrder = 6; this.gem.raycast = () => {}; this.scene.add(this.gem);
    return this.gem;
  };
  W.updateGem = function (dt) {
    const me = this.avatars.get('me'); const gem = this.ensureGem();
    if (!me || this.edit.on || this.hideTags) { gem.visible = false; return; }
    gem.visible = true;
    me.av.headWorld(this.tmpV); gem.position.set(this.tmpV.x, this.tmpV.y + 0.2 + Math.sin(this.time * 2.2) * 0.02, this.tmpV.z);
    gem.rotation.y += dt * 1.4;
    const want = GEM_COL[(me.info && me.info.status) || 'idle'] || GEM_COL.idle;
    if (gem.userData.col !== want) { gem.userData.col = want; gem.material.color.set(want); gem.material.emissive.set(want); }
  };

  /* ---------- camera / wall modes ---------- */
  const origCut = W.applyWallCut;
  W.wallMode = 'cut';
  W.applyWallCut = function (force) {
    if (this.wallMode === 'cut' || this.focusMode) return origCut.call(this, force);
    const up = this.wallMode === 'up';
    for (const k in this.wallGroups) { const g = this.wallGroups[k]; const c = !up; if (force || g.userData.cut !== c || g.userData.mode !== this.wallMode) { g.userData.cut = c; g.userData.mode = this.wallMode; g.userData.tall.visible = !c; g.userData.low.visible = c; } }
  };
  W.setWallMode = function (m) { this.wallMode = m; for (const k in this.wallGroups) this.wallGroups[k].userData.mode = null; this.applyWallCut(true); };
  W.toggleTopView = function () {
    this.topView = !this.topView;
    if (this.topView) { this.cam.tPhi = 0.22; this.cam.tTheta = Math.round(this.cam.theta / (Math.PI / 2)) * (Math.PI / 2); this.cam.tRadius = (this.baseRadius || 12) * 1.05; }
    else { this.cam.tPhi = 0.98; this.cam.tTheta = 0.62; this.cam.tRadius = (this.baseRadius || 12) * (this.w < 700 ? 1.35 : 1); }
    return this.topView;
  };

  /* ---------- build mode: green / red placement feedback ---------- */
  const overlaps = (a, b) => Math.abs(a.x - b.x) * 2 < a.w + b.w - 0.02 && Math.abs(a.z - b.z) * 2 < a.d + b.d - 0.02;
  const boxOf = (it) => { const d = PW.ITEM[it.id]; if (!d || d.wall || d.rug || d.top) return null; let [w, dd] = d.fp || [0.5, 0.5]; if ((it.r || 0) % 2) [w, dd] = [dd, w]; return { x: it.x, z: it.z, w, d: dd }; };
  const origMove = W.moveGhost;
  W.moveGhost = function () {
    origMove.call(this);
    const g = this.edit.ghost, pos = this.edit.pos; if (!g || !pos) return;
    let ok = true;
    if (!pos.w) { const me = boxOf(pos); if (me) ok = !(this.items || []).some((it) => { const b = boxOf(it); return b && overlaps(me, b); }); }
    this.edit.valid = ok;
    if (g.userData.tint !== ok) {
      g.userData.tint = ok;
      g.traverse((o) => { if (o.isMesh && o.material && o.material.emissive) { o.material.emissive.set(ok ? '#2BC46B' : '#E5483B'); o.material.emissiveIntensity = ok ? 0.28 : 0.55; } });
    }
  };
  const origPlace = W.placeGhost;
  W.placeGhost = function () { if (this.edit.ghost && this.edit.valid === false) { if (this.onInvalidPlace) this.onInvalidPlace(); return; } origPlace.call(this); };

  /* ---------- post: ambient occlusion on capable desktops ---------- */
  const origPost = W.setupPost;
  W.setupPost = function () {
    origPost.call(this);
    // tighter clip range = much better depth precision for AO and shadows (camera never gets closer than ~2 m)
    this.camera.near = 0.5; this.camera.far = 90; this.camera.updateProjectionMatrix();
    if (!this.post || !THREE.SAOPass || this.noAO) return;
    const r = this.renderer; const isTouch = matchMedia('(pointer: coarse)').matches;
    if (!r.capabilities.isWebGL2 || isTouch || (window.innerWidth || 0) < 900) return;
    try {
      const sao = new THREE.SAOPass(this.scene, this.camera, true, false, new THREE.Vector2(512, 512));
      // r128 bug: the depth texture is never wired into the AO/blur materials when depthTexture=true
      const dtex = sao.beautyRenderTarget.depthTexture; [sao.saoMaterial, sao.vBlurMaterial, sao.hBlurMaterial].forEach((m) => (m.uniforms.tDepth.value = dtex));
      const cheap = new THREE.MeshBasicMaterial({ color: 0xffffff });
      Object.assign(sao.params, { saoBias: 0.6, saoIntensity: 0.085, saoScale: 2, saoKernelRadius: 16, saoMinResolution: 0, saoBlur: true, saoBlurRadius: 5, saoBlurStdDev: 3, saoBlurDepthCutoff: 0.0018 });
      // AO at half resolution: big saving, the blur hides the upscale
      const ss = sao.setSize.bind(sao); sao.setSize = (w, h) => ss(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
      // keep FX-only geometry (light shafts, dust, decals, name gem) out of the depth/normal passes
      const origRender = sao.render.bind(sao); const self = this;
      sao.render = function (renderer, wb, rb, dt, mask) {
        const hidden = []; const hide = (o) => { if (o && o.visible) { o.visible = false; hidden.push(o); } };
        hide(self.fxGroup); hide(self.gem);
        self.roomGroup.traverse((o) => { if (o.userData.decal) hide(o); });
        for (const [, a] of self.avatars) hide(a.blob);
        const ob = self.scene.background; self.scene.background = null;
        // SAOPass re-renders the scene only to fill its depth texture: use an unlit material for that pass
        self.scene.overrideMaterial = cheap;
        origRender(renderer, wb, rb, dt, mask);
        self.scene.overrideMaterial = null;
        self.scene.background = ob; hidden.forEach((o) => (o.visible = true));
      };
      this.post.comp.insertPass(sao, 1); this.post.sao = sao;
      const sz = r.getSize(new THREE.Vector2()); sao.setSize(sz.x * r.getPixelRatio(), sz.y * r.getPixelRatio());
    } catch (e) { console.warn('AO off', e); }
  };

  /* ---------- mood: rim colour ---------- */
  const origMood = W.applyMood;
  W.applyMood = function () {
    origMood.call(this);
    const k = (this.def && this.def.mood) || 'day'; const rc = RIM_BY_MOOD[k] || RIM_BY_MOOD.day;
    PW.RIM.value.set(rc[0]).multiplyScalar(rc[1]);
    if (this.post && this.post.sao) this.post.sao.params.saoIntensity = k === 'day' || k === 'golden' ? 0.085 : 0.065;
  };

  /* ---------- frame governor ---------- */
  const origLoop = W.loop;
  W.loop = function () {
    if (this.paused) { requestAnimationFrame(this.loop); return; }
    const now = performance.now();
    if (this.fpsCap && this._lastF && now - this._lastF < 1000 / this.fpsCap - 3 && !document.hidden) { requestAnimationFrame(this.loop); return; }
    const last = this._lastF || now; this._lastF = now;
    origLoop.call(this);
    if (document.hidden) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    this.updateGem(dt);
    // adaptive quality: if frames are slow for a few seconds, shed the costliest effect first
    const pf = (this.perf = this.perf || { acc: 0, n: 0, t: 0, step: 0 });
    if (!this.fpsCap && dt > 0) { pf.acc += dt; pf.n++; }
    pf.t += dt;
    if (pf.t > 3 && pf.n > 20) {
      const avg = pf.acc / pf.n;
      if (avg > 0.034 && pf.step < 3) {
        pf.step++;
        if (pf.step === 1 && this.post && this.post.sao) { this.noAO = true; this.setupPost(); this.resize(); if (this.def) this.applyMood(); }
        else if (pf.step <= 2 && this.renderer.getPixelRatio() > 1) { this.renderer.setPixelRatio(Math.max(1, this.renderer.getPixelRatio() - 0.5)); this.resize(); }
        else if (this.quality === 'high') { this.setQuality('low'); }
        if (this.onPerfDrop) this.onPerfDrop(pf.step);
      }
      pf.acc = 0; pf.n = 0; pf.t = 0;
    }
  };
})();
