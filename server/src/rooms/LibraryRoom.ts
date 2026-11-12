// Step 4f: the library, a public study room for 10 strangers (v1 "Eski Kütüphane" look, drawn by the client from
// @pw/shared libraryRoom()). Everyone runs their own timer (PersonalRoom); a full library makes matchmaking open the
// next one.
import type { Client } from '@colyseus/core';
import { hallOf, type Hall } from '@pw/shared';
import { PersonalRoom } from './PersonalRoom';

export class LibraryRoom extends PersonalRoom {
  /** open libraries (one server process), for the friends list and the world list */
  static live = new Set<LibraryRoom>();
  /** which hall this is: the library or "Pist 25" (user 2026-11-08); an unknown or missing id means the library */
  hall: Hall = hallOf(undefined);
  protected seatCount() { return this.hall.seats; }

  onCreate(options: unknown) {
    this.hall = hallOf((options as { hall?: unknown } | undefined)?.hall);
    this.maxClients = this.hall.seats;
    super.onCreate(options);
    LibraryRoom.live.add(this);
  }
  onJoin(client: Client, options: unknown) {
    const want = (options as { hall?: unknown } | undefined)?.hall;
    if (want !== undefined && hallOf(want).id !== this.hall.id) throw new Error('Böyle bir yer yok.');
    super.onJoin(client, options);
  }
  onDispose() { super.onDispose(); LibraryRoom.live.delete(this); }

  get info() {
    return { kind: 'library', hall: this.hall.id, roomId: this.roomId, owner: '', ownerName: '', name: this.hall.name, open: true, n: this.state.players.size, cap: this.hall.seats, phase: 'idle' };
  }
}
