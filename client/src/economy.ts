// Wallet access for the page. Online: the server owns the wallet (HTTP + room messages).
// Demo mode: the same shared rules run here and the wallet is kept in this browser.
import { buy as buyRule, newWallet, sanitizeWallet, type Wallet } from '@pw/shared';
import { useStore } from './store';
import { identity } from './identity';
import { DEMO_ONLY, HTTP_BASE } from './config';

const LOCAL_KEY = 'pw2.wallet';
export function loadLocalWallet(): Wallet { try { return sanitizeWallet(JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null')); } catch { return newWallet(); } }
export function saveLocalWallet(w: Wallet) { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(w)); } catch { /* ignore */ } }

export async function refreshWallet() {
  if (DEMO_ONLY) { useStore.getState().set({ wallet: loadLocalWallet() }); return; }
  try {
    const r = await fetch(`${HTTP_BASE}/api/profile`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(identity()) });
    const j = await r.json(); if (j.ok) useStore.getState().set({ wallet: sanitizeWallet(j.wallet) });
  } catch { /* offline: keep what we have */ }
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
