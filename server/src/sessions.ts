// One account, one place (server-wide). Every room that pays rewards claims the player id here when someone joins.
// If the same player already sits in another room (another tab, another timer length, the library, Odam…),
// that older seat is kicked, so one focus is never paid twice. A seat frees the id only while it still owns it.
export interface Seat { room: string; sessionId: string; kick(): void; /** a message to this player's open game (friend calls) */ send?(type: string, msg: unknown): void; /** is this seat's line up right now? (a dropped seat only waits for its player) */ live?(): boolean }

export class SessionRegistry {
  private active = new Map<string, Seat>();
  claim(pid: string, seat: Seat) {
    const old = this.active.get(pid);
    this.active.set(pid, seat);   // set first: the kicked seat's own leave must not free the new one
    if (old && (old.room !== seat.room || old.sessionId !== seat.sessionId)) old.kick();
  }
  holds(pid: string, room: string, sessionId: string) {
    const s = this.active.get(pid);
    return !!s && s.room === room && s.sessionId === sessionId;
  }
  /** is this player in a room right now, and which one */
  roomOf(pid: string) { return this.active.get(pid)?.room ?? null; }
  /** is another window of this player really online (not just a seat waiting after a drop)? */
  liveSeat(pid: string) { const s = this.active.get(pid); return !!s && (s.live ? s.live() : true); }
  /** send to wherever this player is; false when they are not online */
  sendTo(pid: string, type: string, msg: unknown) { const s = this.active.get(pid); if (!s?.send) return false; s.send(type, msg); return true; }
  /** how many players have a seat (online or waiting after a drop) */
  get count() { return this.active.size; }
  release(pid: string, room: string, sessionId: string) {
    if (this.holds(pid, room, sessionId)) this.active.delete(pid);
  }
}

export const sessions = new SessionRegistry();
