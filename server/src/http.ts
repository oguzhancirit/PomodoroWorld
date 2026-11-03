// Small HTTP API next to the game rooms: read your wallet and buy from the shop.
// Prices always come from the server's own catalog; the client only says which item.
import type express from 'express';
import { buy, levelFromXP, BuyRequest, ProfileRequest, RoomRequest, QuestRequest, clock, loginTick, claimQuest, claimLogin, setPledge, cancelPledge, noteDecor, type Room } from '@pw/shared';
import { profiles } from './profiles';

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
    res.json({ ok: true, wallet: p.wallet, room: p.room, level: levelFromXP(p.wallet.xp) });
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
    res.json({ ok: true, room, wallet: p.wallet });
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
  app.get('/health', (_req, res) => void res.send('ok'));
}
