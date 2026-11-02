/* Pomodoro World — procedural ambient soundscapes (no audio files: everything is synthesised with WebAudio,
   so it works offline, costs no bandwidth and never hits a copyright problem). */
(function () {
  const PW = window.PW;
  let ctx = null, master = null; const buffers = {}; const live = {};

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.7;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
      master.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  function noise(type) {
    if (buffers[type]) return buffers[type];
    const len = ctx.sampleRate * 6, b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch); let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (type === 'white') d[i] = w * 0.5;
        else if (type === 'pink') { b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; }
        else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
      }
      // crossfade the loop seam
      const f = 2000; for (let i = 0; i < f; i++) { const t = i / f; d[len - f + i] = d[len - f + i] * (1 - t) + d[i] * t; }
    }
    return (buffers[type] = b);
  }
  const src = (type) => { const s = ctx.createBufferSource(); s.buffer = noise(type); s.loop = true; s.start(0, Math.random() * 5); return s; };
  const filt = (type, f, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const gain = (v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const lfo = (freq, depth, target, offset) => { const o = ctx.createOscillator(); o.frequency.value = freq; const g = gain(depth); o.connect(g).connect(target); if (offset != null) target.value = offset; o.start(); return o; };
  // short one-shot noise or tone events, scheduled on a jittered timer
  function every(minMs, maxMs, fn) { let t = null, on = true; const go = () => { if (!on) return; try { fn(); } catch (e) {} t = setTimeout(go, minMs + Math.random() * (maxMs - minMs)); }; t = setTimeout(go, Math.random() * maxMs); return () => { on = false; clearTimeout(t); }; }
  function burst(out, { f = 3000, q = 1, dur = 0.04, vol = 0.2, type = 'bandpass' }) {
    const s = ctx.createBufferSource(); s.buffer = noise('white'); const b = filt(type, f, q); const g = gain(0); s.connect(b).connect(g).connect(out);
    const t = ctx.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.start(t, Math.random() * 4); s.stop(t + dur + 0.05);
  }
  function tone(out, { f0, f1, dur, vol, type = 'sine' }) {
    const o = ctx.createOscillator(); o.type = type; const g = gain(0); o.connect(g).connect(out); const t = ctx.currentTime;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.05);
  }

  const LAYERS = {
    rain: { n: 'Yağmur', i: '<path d="M7 15a5 5 0 1 1 1-9.9A6 6 0 0 1 19 9a4 4 0 0 1-1 7.9"/><path d="M8 19l-1 2M12 18l-1 3M16 19l-1 2"/>',
      build(out) { const s = src('pink'); s.connect(filt('highpass', 450)).connect(filt('lowpass', 7500)).connect(gain(0.9)).connect(out);
        const stop = every(25, 110, () => burst(out, { f: 2500 + Math.random() * 3500, q: 1.5, dur: 0.03 + Math.random() * 0.05, vol: 0.06 + Math.random() * 0.12 }));
        return () => { stop(); s.stop(); }; } },
    cafe: { n: 'Kafe', i: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3"/>',
      build(out) { const a = src('brown'); a.connect(filt('lowpass', 500)).connect(gain(0.6)).connect(out);
        const v = src('pink'); const bp = filt('bandpass', 850, 1.1); const vg = gain(0.35); v.connect(bp).connect(vg).connect(out); const l1 = lfo(0.23, 0.18, vg.gain, 0.32); const l2 = lfo(0.11, 250, bp.frequency, 850);
        const stop = every(2500, 8000, () => { const f = 2200 + Math.random() * 1600; tone(out, { f0: f, f1: f * 0.98, dur: 0.5, vol: 0.05 }); tone(out, { f0: f * 2.7, f1: f * 2.6, dur: 0.3, vol: 0.02 }); });
        return () => { stop(); a.stop(); v.stop(); l1.stop(); l2.stop(); }; } },
    fire: { n: 'Şömine', i: '<path d="M12 3c3 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 0 2 1 3 2 3 0-3 0-5 1-7z"/>',
      build(out) { const s = src('brown'); s.connect(filt('lowpass', 420)).connect(gain(0.9)).connect(out);
        const stop = every(40, 260, () => burst(out, { f: 1800 + Math.random() * 4000, type: 'highpass', dur: 0.008 + Math.random() * 0.02, vol: 0.05 + Math.random() * 0.25 }));
        return () => { stop(); s.stop(); }; } },
    forest: { n: 'Orman', i: '<path d="M12 3l6 9h-4l4 6H6l4-6H6z"/><path d="M12 18v3"/>',
      build(out) { const s = src('pink'); const bp = filt('bandpass', 600, 0.4); s.connect(bp).connect(gain(0.55)).connect(out); const l = lfo(0.06, 280, bp.frequency, 600);
        const stop = every(3000, 11000, () => { const n = 2 + Math.floor(Math.random() * 3), base = 2600 + Math.random() * 1500; for (let k = 0; k < n; k++) setTimeout(() => tone(out, { f0: base, f1: base * (1.25 + Math.random() * 0.3), dur: 0.09 + Math.random() * 0.06, vol: 0.035 }), k * 140); });
        return () => { stop(); s.stop(); l.stop(); }; } },
    waves: { n: 'Dalgalar', i: '<path d="M3 15c3 0 3-3 6-3s3 3 6 3 3-3 6-3"/><path d="M3 19c3 0 3-3 6-3s3 3 6 3 3-3 6-3"/>',
      build(out) { const s = src('brown'); const lp = filt('lowpass', 900); const g = gain(0.5); s.connect(lp).connect(g).connect(out); const l = lfo(0.11, 0.42, g.gain, 0.5); const l2 = lfo(0.11, 500, lp.frequency, 900);
        return () => { s.stop(); l.stop(); l2.stop(); }; } },
    brown: { n: 'Odak gürültüsü', i: '<path d="M3 12h2l2-6 3 12 3-9 2 5 2-2h4"/>',
      build(out) { const s = src('brown'); s.connect(filt('lowpass', 900)).connect(gain(0.8)).connect(out); return () => s.stop(); } },
  };

  const S = (PW.sound = { LAYERS, playing: false });
  S.ok = () => !!(window.AudioContext || window.webkitAudioContext);
  S.suggest = (view) => ({ v_rain: ['rain'], v_beach: ['waves'], v_bosphorus: ['waves', 'cafe'], v_snow: ['fire', 'forest'], v_mountain: ['forest'], v_cappadocia: ['forest'], v_aurora: ['fire'], v_space: ['brown'], v_clouds: ['brown'], v_city_night: ['rain'], v_city_day: ['cafe'] }[view] || ['rain']);
  S.setMaster = (v) => { if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.1); };
  // bring the running layers in line with the desired mix
  S.apply = (mix, play, vol) => {
    if (!play && !Object.keys(live).length) return;
    if (!ensure()) return;
    S.setMaster(vol == null ? 0.7 : vol);
    for (const id of Object.keys(LAYERS)) {
      const want = play ? +(mix[id] || 0) : 0;
      const L = live[id];
      if (want > 0 && !L) { const g = gain(0); g.connect(master); const stop = LAYERS[id].build(g); g.gain.setTargetAtTime(want, ctx.currentTime, 0.6); live[id] = { g, stop }; }
      else if (want > 0 && L) L.g.gain.setTargetAtTime(want, ctx.currentTime, 0.15);
      else if (!want && L) { L.g.gain.setTargetAtTime(0, ctx.currentTime, 0.4); const st = L.stop; delete live[id]; setTimeout(() => { try { st(); L.g.disconnect(); } catch (e) {} }, 1800); }
    }
    S.playing = Object.keys(live).length > 0;
  };
  S.unlock = () => { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); };
})();
