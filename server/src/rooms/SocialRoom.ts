// Step 4g: v1 social spaces (Meydan Kafe, Çatı Terası, Oyun Salonu). A place to meet: chat is always open here
// (and counts for the social quest), everyone keeps their own timer, a crowd is split into salons of 16 (v1).
import type { Client } from '@colyseus/core';
import { isSocialId, socialRoom, roomSeats, SOCIAL, SOCIAL_CAP } from '@pw/shared';
import { PersonalRoom } from './PersonalRoom';

export class SocialRoom extends PersonalRoom {
  static live = new Set<SocialRoom>();
  maxClients = SOCIAL_CAP;
  space = '';
  private seats = 0;

  onCreate(options: unknown) {
    const space = (options as { space?: unknown } | undefined)?.space;
    if (!isSocialId(space)) throw new Error('Böyle bir yer yok.');
    this.space = space;
    this.seats = roomSeats(socialRoom(space)!);
    super.onCreate(options);
    SocialRoom.live.add(this);
  }
  onDispose() { super.onDispose(); SocialRoom.live.delete(this); }
  onJoin(client: Client, options: unknown) {
    if ((options as { space?: unknown } | undefined)?.space !== this.space) throw new Error('Böyle bir yer yok.');
    super.onJoin(client, options);
  }

  protected seatCount() { return this.seats; }
  /** the place to talk: chat is open whatever your own timer says */
  protected chatOpen() { return true; }

  get info() {
    return { kind: 'social', space: this.space, roomId: this.roomId, owner: '', ownerName: '', name: SOCIAL.find((s) => s.id === this.space)?.name ?? '', open: true, n: this.state.players.size, cap: SOCIAL_CAP, phase: 'idle' };
  }
}
