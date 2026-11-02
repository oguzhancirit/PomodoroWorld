// Small HTTP API next to the game rooms: read your wallet and buy from the shop.
// Prices always come from the server's own catalog; the client only says which item.
import type express from 'express';
import { buy, levelFromXP, BuyRequest, ProfileRequest, RoomRequest } from '@pw/shared';
import { profiles } from './profiles';

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
    if (!p) return void res.status(403).json({ ok: false, error: 'Oyuncu kimliği doğrulanamadı.' });
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
    res.json({ ok: true, room: profiles.setRoom(p, b.data.room) });
  });
  app.get('/health', (_req, res) => void res.send('ok'));
}
