/* Pomodoro World — realtime layer.
   Three interchangeable transports with one interface:
   - claude : claude.ai Artifact "room" capability (when the app runs as a published artifact)
   - p2p    : Trystero (WebRTC, serverless, Nostr signalling) when hosted anywhere else (e.g. GitHub Pages)
   - local  : BroadcastChannel between tabs of the same browser (offline fallback)
*/
(function () {
  const PW = window.PW;
  const APP_ID = 'pomodoro-world-oguzhan-v1';
  const TRYSTERO_URL = 'https://cdn.jsdelivr.net/npm/trystero@0.25.4/+esm';

  class Channel {
    constructor(name) { this.name = name; this._peers = []; this._pcb = []; this._ccb = []; this._ecb = []; this.me = null; this.connected = false; }
    onPeers(cb) { this._pcb.push(cb); cb(this._peers); }
    onChat(cb) { this._ccb.push(cb); }
    onEmote(cb) { this._ecb.push(cb); }
    _emitPeers(list) { this._peers = list; this._pcb.forEach((f) => f(list)); }
    _emitChat(m) { this._ccb.forEach((f) => f(m)); }
    _emitEmote(m) { this._ecb.forEach((f) => f(m)); }
  }

  /* ---------- claude.ai room capability ---------- */
  class ClaudeChannel extends Channel {
    constructor(name, api) {
      super(name); this.api = api; this.unsubs = [];
      this.unsubs.push(api.onPeers((ch) => this._emitPeers(ch.peers.filter((p) => p.kind === 'viewer').map((p) => ({ peer: p.peer, presence: p.presence || {}, isMe: !!p.sameTab, guest: p.guest })))));
      this.unsubs.push(api.on('chat', (m) => { if (m.sameTab) return; this._emitChat({ peer: m.peer, text: String((m.data && m.data.t) || '').slice(0, 240) }); }));
      this.unsubs.push(api.on('emote', (m) => { if (m.sameTab) return; this._emitEmote({ peer: m.peer, e: String((m.data && m.data.e) || '') }); }));
      if (api.onConnection) this.unsubs.push(api.onConnection((c) => (this.connected = c)));
    }
    setPresence(obj) { return this.api.presence(obj).catch(() => {}); }
    sendChat(text) { return this.api.emit('chat', { t: text }).catch(() => {}); }
    sendEmote(e) { return this.api.emit('emote', { e }).catch(() => {}); }
    leave() { this.unsubs.forEach((u) => { try { u(); } catch (e) {} }); if (this.api.leave) this.api.leave().catch(() => {}); }
  }
  class ClaudeNet {
    constructor(room) { this.mode = 'claude'; this.room = room; this.label = 'claude.ai canlı oda'; }
    lobby() { return new ClaudeChannel('lobby', this.room); }
    async join(name) { const r = await this.room.join(safeName(name)); return new ClaudeChannel(name, r); }
  }

  /* ---------- Trystero P2P ---------- */
  class P2PChannel extends Channel {
    constructor(name, mod) {
      super(name);
      this.room = mod.joinRoom({ appId: APP_ID }, name);
      this.selfId = mod.selfId; this.peers = new Map(); this.myPres = {};
      const mk = (n) => { const a = this.room.makeAction(n); if (Array.isArray(a)) return { send: a[0], set on(f) { a[1](f); } }; return { send: (d, o) => a.send(d, o), set on(f) { a.onMessage = f; } }; };
      this.aPres = mk('pres'); this.aChat = mk('chat'); this.aEmo = mk('emo');
      this.aPres.on = (data, ctx) => { const pid = ctx && ctx.peerId ? ctx.peerId : ctx; this.peers.set(pid, data || {}); this.flush(); };
      this.aChat.on = (data, ctx) => { const pid = ctx && ctx.peerId ? ctx.peerId : ctx; this._emitChat({ peer: pid, text: String((data && data.t) || '').slice(0, 240) }); };
      this.aEmo.on = (data, ctx) => { const pid = ctx && ctx.peerId ? ctx.peerId : ctx; this._emitEmote({ peer: pid, e: String((data && data.e) || '') }); };
      const onJoin = (pid) => { this.connected = true; this.aPres.send(this.myPres, { target: pid }); };
      const onLeave = (pid) => { this.peers.delete(pid); this.flush(); };
      this.room.onPeerJoin = onJoin; this.room.onPeerLeave = onLeave;
      this.flush();
    }
    flush() { const list = [{ peer: this.selfId, presence: this.myPres, isMe: true }]; for (const [p, pres] of this.peers) list.push({ peer: p, presence: pres, isMe: false }); this._emitPeers(list); }
    setPresence(obj) { Object.assign(this.myPres, obj); for (const k in obj) if (obj[k] === null) delete this.myPres[k]; clearTimeout(this._t); this._t = setTimeout(() => { try { this.aPres.send(this.myPres); } catch (e) {} }, 120); this.flush(); }
    sendChat(text) { try { this.aChat.send({ t: text }); } catch (e) {} }
    sendEmote(e) { try { this.aEmo.send({ e }); } catch (er) {} }
    leave() { try { this.room.leave(); } catch (e) {} }
  }
  class P2PNet {
    constructor(mod) { this.mode = 'p2p'; this.mod = mod; this.label = 'P2P (WebRTC)'; }
    lobby() { return new P2PChannel('lobby', this.mod); }
    async join(name) { return new P2PChannel(name, this.mod); }
  }

  /* ---------- same-browser fallback ---------- */
  class LocalChannel extends Channel {
    constructor(name) {
      super(name); this.id = PW.util.uid(); this.peers = new Map(); this.myPres = {};
      try { this.bc = new BroadcastChannel('pw-' + name); } catch (e) { this.bc = null; }
      if (this.bc) this.bc.onmessage = (ev) => this.onMsg(ev.data);
      this.post({ type: 'hello' });
      this.hb = setInterval(() => { this.post({ type: 'pres', data: this.myPres }); const now = Date.now(); let ch = false; for (const [p, v] of this.peers) if (now - v.seen > 15000) { this.peers.delete(p); ch = true; } if (ch) this.flush(); }, 5000);
      this.flush();
    }
    post(m) { if (this.bc) try { this.bc.postMessage(Object.assign({ from: this.id }, m)); } catch (e) {} }
    onMsg(m) {
      if (!m || m.from === this.id) return;
      if (m.type === 'hello') { this.post({ type: 'pres', data: this.myPres }); return; }
      if (m.type === 'pres') { this.peers.set(m.from, { pres: m.data || {}, seen: Date.now() }); this.flush(); }
      if (m.type === 'bye') { this.peers.delete(m.from); this.flush(); }
      if (m.type === 'chat') this._emitChat({ peer: m.from, text: String(m.t || '').slice(0, 240) });
      if (m.type === 'emo') this._emitEmote({ peer: m.from, e: m.e });
    }
    flush() { const list = [{ peer: this.id, presence: this.myPres, isMe: true }]; for (const [p, v] of this.peers) list.push({ peer: p, presence: v.pres, isMe: false }); this._emitPeers(list); }
    setPresence(obj) { Object.assign(this.myPres, obj); for (const k in obj) if (obj[k] === null) delete this.myPres[k]; clearTimeout(this._t); this._t = setTimeout(() => this.post({ type: 'pres', data: this.myPres }), 100); this.flush(); }
    sendChat(t) { this.post({ type: 'chat', t }); }
    sendEmote(e) { this.post({ type: 'emo', e }); }
    leave() { this.post({ type: 'bye' }); clearInterval(this.hb); if (this.bc) this.bc.close(); }
  }
  class LocalNet { constructor() { this.mode = 'local'; this.label = 'Yerel (bu tarayıcı)'; } lobby() { return new LocalChannel('lobby'); } async join(name) { return new LocalChannel(name); } }

  function safeName(n) { return String(n).toLowerCase().replace(/[^a-z0-9_.-]/g, '-').replace(/^[^a-z0-9]+/, 'r').slice(0, 48) || 'room'; }
  const withTimeout = (p, ms) => Promise.race([p, new Promise((res) => setTimeout(() => res(null), ms))]);

  PW.createNet = async function () {
    const inClaude = !!(window.claude && typeof window.claude.use === 'function');
    if (inClaude) {
      try { const room = await withTimeout(window.claude.use('room'), 10000); if (room) return new ClaudeNet(room); } catch (e) {}
      return new LocalNet();
    }
    if (location.protocol.startsWith('http') && !PW.FORCE_LOCAL) {
      try { const mod = await withTimeout(import(TRYSTERO_URL), 8000); if (mod && mod.joinRoom) return new P2PNet(mod); } catch (e) { console.warn('P2P unavailable, using local mode', e); }
    }
    return new LocalNet();
  };
  PW.safeRoomName = safeName;
})();
