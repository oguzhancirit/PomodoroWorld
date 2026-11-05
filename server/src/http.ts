// Small HTTP API next to the game rooms: read your wallet and buy from the shop.
// Prices always come from the server's own catalog; the client only says which item.
import type express from 'express';
import { likeRoom, sanitizeLikes, buy, levelFromXP, BuyRequest, ProfileRequest, RoomRequest, QuestRequest, clock, loginTick, claimQuest, claimLogin, setPledge, cancelPledge, noteDecor, FriendsRequest, socialOp, friendCode, type Room } from '@pw/shared';
import { matchMaker } from '@colyseus/core';
import { HomeRoom } from './rooms/HomeRoom';
import { LibraryRoom } from './rooms/LibraryRoom';
import { SocialRoom } from './rooms/SocialRoom';
import { profiles } from './profiles';
import { verifyGoogle, googleLogin } from './auth';

const QUEST_REASON: Record<string, string> = { unknown: 'Böyle bir görev yok.', not_done: 'Bu görev henüz bitmedi.', claimed: 'Bu ödülü zaten aldın.' };
const furnCount = (room: Room) => { const m = new Map<string, number>(); for (const it of room.items) m.set(it.id, (m.get(it.id) ?? 0) + 1); return m; };
const REASON: Record<string, string> = { unknown: 'Bu eşya bulunamadı.', owned: 'Bu zaten sende.', level: 'Seviyen yetmiyor.', coins: 'Jetonun yetmiyor.' };

export function routes(app: express.Application, json: express.RequestHandler) {
  app.use('/api', (req, res, next) => {
    // the game page may live on another address (GitHub Pages) than the server
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return void res.sendStatus(204);
    next();
  });
  app.use('/api', json);
  app.post('/api/profile', (req, res) => {
    const b = ProfileRequest.safeParse(req.body);
    const p = b.success ? profiles.open(b.data.pid, b.data.secret) : null;
    if (!b.success || !p) return void res.status(403).json({ ok: false, error: 'Oyuncu kimliği doğrulanamadı.' });
    // opening the game is the daily login
    const tz = b.data.tz ?? p.wallet.tz;
    profiles.update(p, loginTick({ ...p.wallet, tz }, clock(Date.now(), tz)));
    res.json({ ok: true, wallet: p.wallet, room: p.room, level: levelFromXP(p.wallet.xp), look: p.look ?? null });
  });
  // Google sign-in (step 6): the page sends Google's ID token (+ the guest id to carry its progress over)
  app.post('/api/auth/google', async (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    if (!clientId) return void res.status(503).json({ ok: false, error: 'Google girişi bu sunucuda henüz açık değil.' });
    const body = (req.body ?? {}) as { credential?: unknown; guest?: { pid?: unknown; secret?: unknown } };
    const user = await verifyGoogle(typeof body.credential === 'string' ? body.credential : '', clientId);
    if (!user) return void res.status(401).json({ ok: false, error: 'Google girişi doğrulanamadı, tekrar dene.' });
    const r = googleLogin(profiles, user, body.guest);
    res.json({ ok: true, pid: r.pid, secret: r.secret, isNew: r.isNew, moved: r.moved, look: r.look, google: { name: user.name ?? '', given: user.given ?? '', picture: user.picture ?? '' } });
  });
  // your name and character, so the same look opens on your other devices
  app.post('/api/look', (req, res) => {
    const b = ProfileRequest.safeParse(req.body);
    const p = b.success ? profiles.open(b.data.pid, b.data.secret) : null;
    if (!b.success || !p) return void res.status(403).json({ ok: false, error: 'Oyuncu kimliği doğrulanamadı.' });
    profiles.setLook(p, req.body as { name?: unknown; avatar?: unknown });
    res.json({ ok: true, look: p.look ?? null });
  });
  // room likes (user 2026-11-03): a visitor likes a friend's room once; anyone may ask the count
  app.post('/api/like', (req, res) => {
    const b = ProfileRequest.safeParse(req.body);
    const p = b.success ? profiles.open(b.data.pid, b.data.secret) : null;
    if (!b.success || !p) return void res.status(403).json({ ok: false, error: 'Oyuncu kimliği doğrulanamadı.' });
    const body = req.body as { owner?: unknown; op?: unknown };
    const owner = typeof body.owner === 'string' ? profiles.get(body.owner) : null;
    if (!owner) return void res.status(404).json({ ok: false, error: 'Bu oda bulunamadı.' });
    let likes = sanitizeLikes(owner.likes);
    if (body.op === 'like') { const r = likeRoom(likes, p.pid, owner.pid); if (r.ok) { likes = r.likes; profiles.setLikes(owner, likes); } }
    res.json({ ok: true, n: likes.n, liked: likes.by.includes(p.pid) });
  });
  app.post('/api/buy', (req, res) => {
    const b = BuyRequest.safeParse(req.body);
    const p = b.success ? profiles.open(b.data.pid, b.data.secret) : null;
    if (!b.success || !p) return void res.status(403).json({ ok: false, error: 'Oyuncu kimliği doğrulanamadı.' });
    const r = buy(p.wallet, b.data.itemId);
    if (!r.ok) return void res.status(400).json({ ok: false, reason: r.reason, error: REASON[r.reason], wallet: p.wallet });
    profiles.update(p, r.wallet);
    res.json({ ok: true, wallet: r.wallet, item: r.item.id });
  });
  app.post('/api/room', (req, res) => {
    const b = RoomRequest.safeParse(req.body);
    const p = b.success ? profiles.open(b.data.pid, b.data.secret) : null;
    if (!b.success || !p) return void res.status(403).json({ ok: false, error: 'Oyuncu kimliği doğrulanamadı.' });
    const before = furnCount(p.room);
    const room = profiles.setRoom(p, b.data.room), after = furnCount(room);
    let added = 0; for (const [id, n] of after) added += Math.max(0, n - (before.get(id) ?? 0));
    if (added) profiles.update(p, noteDecor(p.wallet, added, clock(Date.now(), p.wallet.tz)));
    HomeRoom.live.get(p.pid)?.applyRoom(room);
    res.json({ ok: true, room, wallet: p.wallet });
  });
  // the "Dünya" panel: open rooms that have someone inside and a free chair (no ids beyond the owner's)
  app.get('/api/world', async (_req, res) => {
    const list = await matchMaker.query({ name: 'home' });
    const rooms = list.map((r) => r.metadata as { owner: string; ownerName: string; name: string; cat: string; open: boolean; n: number; cap: number } | undefined)
      .filter((m): m is NonNullable<typeof m> => !!m && m.open && m.n > 0 && m.n < m.cap)
      .sort((a, b) => b.n - a.n).slice(0, 60)
      .map(({ owner, ownerName, name, cat, n, cap }) => ({ owner, ownerName, name, cat, n, cap }));
    let library = 0; for (const r of LibraryRoom.live) library += r.state.players.size;
    const social: Record<string, number> = {}; for (const r of SocialRoom.live) social[r.space] = (social[r.space] ?? 0) + r.state.players.size;
    res.json({ rooms, library, social });
  });
  app.post('/api/quest', (req, res) => {
    const b = QuestRequest.safeParse(req.body);
    const p = b.success ? profiles.open(b.data.pid, b.data.secret) : null;
    if (!b.success || !p) return void res.status(403).json({ ok: false, error: 'Oyuncu kimliği doğrulanamadı.' });
    const k = clock(Date.now(), p.wallet.tz), q = b.data;
    if (q.action === 'pledge' || q.action === 'unpledge') {
      const w = q.action === 'pledge' ? setPledge(p.wallet, q.min, q.days, k) : cancelPledge(p.wallet);
      if (w === p.wallet) return void res.status(400).json({ ok: false, error: 'Bu söz seçeneği yok.', wallet: p.wallet });
      profiles.update(p, w); return void res.json({ ok: true, wallet: w });
    }
    const r = q.action === 'login' ? claimLogin(p.wallet, k) : claimQuest(p.wallet, q.id, k);
    if (!r.ok) return void res.status(400).json({ ok: false, reason: r.reason, error: QUEST_REASON[r.reason], wallet: p.wallet });
    profiles.update(p, r.wallet);
    res.json({ ok: true, wallet: r.wallet, gained: r.gained, levelUp: r.levelUp, name: r.name });
  });
  // step 4e: friends (v1 friendsHTML): add / remove / block by code; the list says who is online and where
  app.post('/api/friends', (req, res) => {
    const b = FriendsRequest.safeParse(req.body);
    const p = b.success ? profiles.open(b.data.pid, b.data.secret) : null;
    if (!b.success || !p) return void res.status(403).json({ ok: false, error: 'Oyuncu kimliği doğrulanamadı.' });
    const { op, target, name } = b.data;
    if (op !== 'list') {
      if (!target) return void res.status(400).json({ ok: false, error: 'Arkadaş kodu geçersiz.' });
      const r = socialOp(p.social, { op, target, name }, p.pid, Date.now());
      if (!r.ok) return void res.status(400).json({ ok: false, error: r.reason === 'self' ? 'Bu senin kendi kodun.' : 'Liste dolu.' });
      profiles.setSocial(p, r.social);
    }
    // where everyone is right now (one server process: the live rooms are in memory)
    const at = new Map<string, { name: string; room: HomeRoom | LibraryRoom | SocialRoom }>();
    for (const room of HomeRoom.live.values()) for (const [pid, nm] of room.whoIsHere()) if (!at.has(pid) || room.owner === pid) at.set(pid, { name: nm, room });
    for (const room of LibraryRoom.live) for (const [pid, nm] of room.whoIsHere()) if (!at.has(pid)) at.set(pid, { name: nm, room });
    for (const room of SocialRoom.live) for (const [pid, nm] of room.whoIsHere()) if (!at.has(pid)) at.set(pid, { name: nm, room });
    let renamed = false;
    const week = clock(Date.now(), p.wallet.tz).week;
    const list = Object.entries(p.social.friends).map(([pid, f]) => {
      const here = at.get(pid), fw = profiles.get(pid)?.wallet;
      // level and this week's XP for the weekly board (v1 renderProfile "Haftalık sıralama")
      const rank = { lv: fw ? levelFromXP(fw.xp).level : 1, wx: fw?.stats.weekXP[week] ?? 0 };
      // the name follows what the friend calls themselves now (v1 friendSeen)
      if (here && here.name !== f.n) { f.n = here.name; renamed = true; }
      const seen = profiles.get(pid)?.seen ?? 0;
      return here
        ? { pid, code: friendCode(pid), n: f.n, ...rank, online: true, seen: Date.now(), where: { ...here.room.info, phase: here.room.phaseOfCode(pid) } }
        : { pid, code: friendCode(pid), n: f.n, ...rank, online: false, seen };
    }).sort((x, y) => Number(y.online) - Number(x.online) || y.seen - x.seen);
    if (renamed) profiles.setSocial(p, p.social);
    const blocked = Object.entries(p.social.blocked).map(([pid, e]) => ({ pid, n: e.n }));
    res.json({ ok: true, code: friendCode(p.pid), friends: list, blocked });
  });
  app.get('/health', (_req, res) => void res.send('ok'));
}
