// Wallet access for the page. Online: the server owns the wallet (HTTP + room messages).
// Demo mode: the same shared rules run here and the wallet is kept in this browser.
import { buy as buyRule, newWallet, sanitizeWallet, sanitizeRoom, roomAllowedFor, type Wallet, type Room } from '@pw/shared';
import { useStore } from './store';
import { identity } from './identity';
import { DEMO_ONLY, HTTP_BASE } from './config';

const LOCAL_KEY = 'pw2.wallet';
export function loadLocalWallet(): Wallet { try { return sanitizeWallet(JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null')); } catch { return newWallet(); } }
export function saveLocalWallet(w: Wallet) { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(w)); } catch { /* ignore */ } }

const ROOM_KEY = 'pw2.room';
export function loadLocalRoom(w: Wallet): Room { try { return roomAllowedFor(w, JSON.parse(localStorage.getItem(ROOM_KEY) || 'null') ?? undefined); } catch { return roomAllowedFor(w, null); } }

export async function refreshWallet() {
  if (DEMO_ONLY) { const wallet = loadLocalWallet(); useStore.getState().set({ wallet, room: loadLocalRoom(wallet) }); return; }
  try {
    const r = await fetch(`${HTTP_BASE}/api/profile`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(identity()) });
    const j = await r.json(); if (j.ok) useStore.getState().set({ wallet: sanitizeWallet(j.wallet), room: sanitizeRoom(j.room) });
  } catch {
    // server not reachable: keep what we have, or start from this browser's copy so the room still opens
    const st = useStore.getState(); if (!st.wallet) { const wallet = loadLocalWallet(); st.set({ wallet, room: st.room ?? loadLocalRoom(wallet) }); }
  }
}

const REASON: Record<string, string> = { unknown: 'Bu eşya bulunamadı.', owned: 'Bu zaten sende.', level: 'Seviyen yetmiyor.', coins: 'Jetonun yetmiyor.' };
export async function buyItem(itemId: string): Promise<string | null> {
  const st = useStore.getState();
  if (DEMO_ONLY) {
    const r = buyRule(st.wallet ?? loadLocalWallet(), itemId);
    if (!r.ok) return REASON[r.reason];
    saveLocalWallet(r.wallet); st.set({ wallet: r.wallet }); return null;
  }
  try {
    const r = await fetch(`${HTTP_BASE}/api/buy`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...identity(), itemId }) });
    const j = await r.json();
    if (j.wallet) st.set({ wallet: sanitizeWallet(j.wallet) });
    return j.ok ? null : j.error || 'Satın alınamadı.';
  } catch { return 'Sunucuya ulaşılamadı.'; }
}

/** Save my room. It shows at once; online the server keeps only what I own and answers with that. */
let roomTimer: ReturnType<typeof setTimeout> | null = null;
export function saveRoom(room: Room) {
  const st = useStore.getState(); st.set({ room });
  // a copy in this browser too: opens offline and is a backup if the server is down
  try { localStorage.setItem(ROOM_KEY, JSON.stringify(room)); } catch { /* ignore */ }
  if (DEMO_ONLY) return;
  if (roomTimer) clearTimeout(roomTimer);
  roomTimer = setTimeout(async () => {
    roomTimer = null;
    try {
      const r = await fetch(`${HTTP_BASE}/api/room`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...identity(), room }) });
      const j = await r.json();
      // the server removed something (not owned any more): show its version
      if (!j.ok) return; const theirs = sanitizeRoom(j.room), mine = useStore.getState().room;
      if (!mine || JSON.stringify(theirs) !== JSON.stringify(sanitizeRoom(mine))) useStore.getState().set({ room: theirs });
    } catch { st.flash('Oda kaydedilemedi, internetini kontrol et.'); }
  }, 600);
}
