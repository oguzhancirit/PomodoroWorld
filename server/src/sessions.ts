// One account, one place: a player id may be in only one study room tab at a time.
// Opening a new tab removes the old one, so the same person is never paid twice for one focus.
export interface Seat { room: string; sessionId: string; kick(): void }

export class SessionRegistry {
  private active = new Map<string, Seat>();
  claim(pid: string, seat: Seat) {
    const old = this.active.get(pid);
    this.active.set(pid, seat);
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
