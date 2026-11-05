// One account, one place (server-wide). Every room that pays rewards claims the player id here when someone joins.
// If the same player already sits in another room (another tab, another timer length, the library, Odam…),
// that older seat is kicked, so one focus is never paid twice. A seat frees the id only while it still owns it.
export interface Seat { room: string; sessionId: string; kick(): void }

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
  release(pid: string, room: string, sessionId: string) {
    if (this.holds(pid, room, sessionId)) this.active.delete(pid);
  }
}

export const sessions = new SessionRegistry();
