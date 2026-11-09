// "Arkadaşını çağır" (user 2026-11-09): open calls between an owner in their room and an online friend.
// A call lives CALL_TTL_MS; an accepted call lets the friend in (even into an invite-only room) for a minute and
// pays the welcome (invite.ts) to both when the friend really arrives.
import crypto from 'node:crypto';
import { CALL_TTL_MS } from '@pw/shared';

export interface Call { id: string; owner: string; ownerName: string; target: string; targetName: string; at: number; state: 'open' | 'accepted' }
const ARRIVE_MS = 60_000, AGAIN_MS = 20_000;

export class CallBook {
  private calls = new Map<string, Call>();
  private last = new Map<string, number>();
  private sweep(now: number) { for (const [id, c] of this.calls) if (now - c.at > (c.state === 'open' ? CALL_TTL_MS : CALL_TTL_MS + ARRIVE_MS)) this.calls.delete(id); }
  /** null when the same friend was called a moment ago */
  open(owner: string, ownerName: string, target: string, targetName: string, now = Date.now()): Call | null {
    this.sweep(now);
    const k = owner + '>' + target;
    if (now - (this.last.get(k) ?? 0) < AGAIN_MS) return null;
    this.last.set(k, now);
    const c: Call = { id: crypto.randomBytes(8).toString('hex'), owner, ownerName, target, targetName, at: now, state: 'open' };
    this.calls.set(c.id, c); return c;
  }
  /** the called friend answers; anyone else (or a late answer) gets null */
  answer(id: string, pid: string, now = Date.now()): Call | null {
    this.sweep(now);
    const c = this.calls.get(id);
    return c && c.target === pid && c.state === 'open' ? c : null;
  }
  accept(c: Call, now = Date.now()) { c.state = 'accepted'; c.at = now; }
  drop(id: string) { this.calls.delete(id); }
  /** the friend walked in after accepting: the call is used up (returns it once) */
  arrived(owner: string, pid: string, now = Date.now()): Call | null {
    this.sweep(now);
    for (const c of this.calls.values()) if (c.owner === owner && c.target === pid && c.state === 'accepted') { this.calls.delete(c.id); return c; }
    return null;
  }
}
export const calls = new CallBook();
