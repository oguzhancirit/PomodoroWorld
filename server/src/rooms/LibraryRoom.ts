// Step 4f: the library, a public study room for 10 strangers (v1 "Eski Kütüphane" look, drawn by the client from
// @pw/shared libraryRoom()). Like the study hall the shared timer always runs and nobody can stop it; a full library
// makes matchmaking open the next one. Players with the same pomodoro length share a library (filterBy preset).
import { LIBRARY_SEATS, LIBRARY_NAME } from '@pw/shared';
import { StudyRoom } from './StudyRoom';

export class LibraryRoom extends StudyRoom {
  /** open libraries (one server process), for the friends list and the world list */
  static live = new Set<LibraryRoom>();
  maxClients = LIBRARY_SEATS;
  protected seatCount() { return LIBRARY_SEATS; }

  onCreate(options: unknown) { super.onCreate(options); LibraryRoom.live.add(this); }
  onDispose() { super.onDispose(); LibraryRoom.live.delete(this); }

  get info() {
    return { kind: 'library', roomId: this.roomId, owner: '', ownerName: '', name: LIBRARY_NAME, open: true, n: this.state.players.size, cap: LIBRARY_SEATS, phase: this.state.timer.phase as string };
  }
}
