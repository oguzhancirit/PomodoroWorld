// Wallet access for the page. Online: the server owns the wallet (HTTP + room messages).
// Demo mode: the same shared rules run here and the wallet is kept in this browser.
import { xpStep,
  buy as buyRule, newWallet, sanitizeWallet, sanitizeRoom, roomAllowedFor, clock, loginTick, claimQuest, claimLogin, setPledge, cancelPledge, noteDecor,
  type Wallet, type Room, type Payout,
} from '@pw/shared';
import { useStore } from './store';
import { identity } from './identity';
import { DEMO_ONLY, HTTP_BASE } from './config';
import { wakeServer } from './wake';

const LOCAL_KEY = 'pw2.wallet';
export function loadLocalWallet(): Wallet { try { return sanitizeWallet(JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null')); } catch { return newWallet(); } }
export function saveLocalWallet(w: Wallet) { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(w)); } catch { /* ignore */ } }

const ROOM_KEY = 'pw2.room';
export function loadLocalRoom(w: Wallet): Room { try { return roomAllowedFor(w, JSON.parse(localStorage.getItem(ROOM_KEY) || 'null') ?? undefined); } catch { return roomAllowedFor(w, null); } }

/** this device's time zone, minutes east of UTC: quests reset at the player's own midnight */
/** demo only: a try-out pack (3000 coins, level 10) so every new shop thing can be tried without hours of focus */
export function demoBoost() {
  if (!DEMO_ONLY) return;
  const st = useStore.getState(); const w0 = st.wallet ?? loadLocalWallet();
  let xp = 0; for (let L = 1; L < 10; L++) xp += xpStep(L);
  const w = { ...w0, coins: w0.coins + 3000, xp: Math.max(w0.xp, xp) }; saveLocalWallet(w); st.set({ wallet: w });
}
export const myTz = () => -new Date().getTimezoneOffset();
/** the player's calendar right now (day, week, hour) */
export const myClock = () => clock(Date.now(), myTz());

export async function refreshWallet() {
  if (DEMO_ONLY) {
    // opening the game is the daily login, as on the server
    const wallet = loginTick({ ...loadLocalWallet(), tz: myTz() }, myClock()); saveLocalWallet(wallet);
    useStore.getState().set({ wallet, room: useStore.getState().room ?? loadLocalRoom(wallet) }); return;
  }
  try {
    if (!(await wakeServer())) throw new Error('server asleep');
    const r = await fetch(`${HTTP_BASE}/api/profile`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...identity(), tz: myTz() }) });
    const j = await r.json(); if (j.ok) useStore.getState().set({ wallet: sanitizeWallet(j.wallet), room: sanitizeRoom(j.room) });
  } catch {
    // server not reachable: keep what we have, or start from this browser's copy so the room still opens
    const st = useStore.getState(); if (!st.wallet) { const wallet = loadLocalWallet(); st.set({ wallet, room: st.room ?? loadLocalRoom(wallet) }); }
  }
}

/** Quests: claim a reward, the daily login reward, or make/drop a promise. Returns an error text or null. */
export type QuestAction = { action: 'login' } | { action: 'claim'; id: string } | { action: 'pledge'; min: number; days: number } | { action: 'unpledge' };
const QUEST_REASON: Record<string, string> = { unknown: 'Böyle bir görev yok.', not_done: 'Bu görev henüz bitmedi.', claimed: 'Bu ödülü zaten aldın.' };
export async function questAction(a: QuestAction): Promise<string | null> {
  const st = useStore.getState();
  const showPay = (gained: { xp: number; coins: number }, levelUp: number, name: string) => st.set({ reward: { ...gained, lines: [name], levelUp, at: Date.now() } });
  if (DEMO_ONLY) {
    const w0 = st.wallet ?? loadLocalWallet(), k = myClock();
    if (a.action === 'pledge' || a.action === 'unpledge') {
      const w = a.action === 'pledge' ? setPledge(w0, a.min, a.days, k) : cancelPledge(w0);
      saveLocalWallet(w); st.set({ wallet: w }); return null;
    }
    const r: Payout = a.action === 'login' ? claimLogin(w0, k) : claimQuest(w0, a.id, k);
    if (!r.ok) return QUEST_REASON[r.reason];
    saveLocalWallet(r.wallet); st.set({ wallet: r.wallet }); showPay(r.gained, r.levelUp, r.name); return null;
  }
  try {
    const r = await fetch(`${HTTP_BASE}/api/quest`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...identity(), ...a }) });
    const j = await r.json();
    if (j.wallet) st.set({ wallet: sanitizeWallet(j.wallet) });
    if (j.ok && j.gained) showPay(j.gained, j.levelUp, j.name);
    return j.ok ? null : j.error || 'Olmadı, tekrar dene.';
  } catch { return 'Sunucuya ulaşılamadı.'; }
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
  const st = useStore.getState(); const before = st.room; st.set({ room });
  // a copy in this browser too: opens offline and is a backup if the server is down
  try { localStorage.setItem(ROOM_KEY, JSON.stringify(room)); } catch { /* ignore */ }
  if (DEMO_ONLY) {
    // new furniture in the room moves the decorator quest (the server does the same online)
    const count = (r: Room | null) => { const m = new Map<string, number>(); for (const it of r?.items ?? []) m.set(it.id, (m.get(it.id) ?? 0) + 1); return m; };
    const a = count(before), b = count(room); let added = 0; for (const [id, n] of b) added += Math.max(0, n - (a.get(id) ?? 0));
    const wallet = useStore.getState().wallet;
    if (added && wallet) { const w = noteDecor(wallet, added, myClock()); saveLocalWallet(w); st.set({ wallet: w }); }
    return;
  }
  if (roomTimer) clearTimeout(roomTimer);
  roomTimer = setTimeout(async () => {
    roomTimer = null;
    try {
      const r = await fetch(`${HTTP_BASE}/api/room`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...identity(), room }) });
      const j = await r.json();
      if (j.wallet) useStore.getState().set({ wallet: sanitizeWallet(j.wallet) });
      // the server removed something (not owned any more): show its version
      if (!j.ok) return; const theirs = sanitizeRoom(j.room), mine = useStore.getState().room;
      if (!mine || JSON.stringify(theirs) !== JSON.stringify(sanitizeRoom(mine))) useStore.getState().set({ room: theirs });
    } catch { st.flash('Oda kaydedilemedi, internetini kontrol et.'); }
  }, 600);
}
