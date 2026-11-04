// Your own room ("Odam") as a live place: friends come in and study with you on one shared timer.
// Small on purpose: capacity = seats in the room (2..5). Only the owner can open it; guests need an open
// room or the invite token, and the ban list always wins. The timer waits until someone presses start.
import { validate, type Client } from '@colyseus/core';
import { z } from 'zod';
import { parseJoin, PlayerId, PlayerSecret, homeEntry, homeCapacity, roomSeats, ROOM_KEYS, HOME_MAX, cleanName, type Room as RoomData } from '@pw/shared';
import { PersonalRoom } from './PersonalRoom';
import { HomeRoomState } from './state';
import { profiles } from '../profiles';

const HomeJoin = z.object({ owner: PlayerId, pid: PlayerId, secret: PlayerSecret, token: z.string().max(12).optional() });
const KickMsg = z.object({ id: z.string().max(40) });
const REFUSE: Record<string, string> = {
  closed: 'Bu oda kapalı: girmek için davet linki gerekiyor.',
  banned: 'Bu odaya giremezsin.',
  full: 'Oda dolu: bütün sandalyeler dolu.',
};

export class HomeRoom extends PersonalRoom {
  /** live rooms by owner, so saving your room updates it right away (single server process) */
  static live = new Map<string, HomeRoom>();
  // Colyseus' own limit stays above the seat count; homeEntry decides (the owner always fits)
  maxClients = HOME_MAX + 1;
  state = new HomeRoomState() as any;
  owner = '';
  private room: RoomData | null = null;
  private ownerName = '';

  constructor() {
    super();
    this.messages = {
      ...this.messages,
      // person card "Odamdan çıkar" (v1 kick): only the owner; the guest goes on the room's ban list
      kick: validate(KickMsg, (client: Client, { id }) => {
        if (this.profileOf.get(client.sessionId)?.pid !== this.owner || id === client.sessionId) return;
        const target = this.state.players.get(id), prof = profiles.get(this.owner);
        if (!target || !prof) return;
        if (target.code && !prof.room.ban.includes(target.code)) this.applyRoom(profiles.setRoom(prof, { ...prof.room, ban: [...prof.room.ban, target.code] }));
        const c = this.clients.getById(id);
        this.gone.add(id);
        c?.send('kicked', {});
        // out of the room right away (a server-side close is not a "consented" leave, so do not wait for it)
        if (c) { this.onLeave(c); c.leave(); }
      }),
    } as any;
  }

  /** seats come from the furniture (a sofa holds two) */
  get capacity() { return this.room ? homeCapacity(this.room) : 2; }
  protected seatCount() { return this.room ? roomSeats(this.room) : 0; }

  onCreate(options: unknown) {
    const o = HomeJoin.safeParse(options);
    this.owner = o.success ? o.data.owner : '';
    super.onCreate(options);
    this.state.owner = this.owner;
    const prof = this.owner ? profiles.get(this.owner) : null;
    if (prof) this.applyRoom(prof.room);
    if (this.owner && !HomeRoom.live.has(this.owner)) HomeRoom.live.set(this.owner, this);
  }

  onJoin(client: Client, options: unknown) {
    const o = HomeJoin.safeParse(options);
    if (!o.success || o.data.owner !== this.owner || !this.room) throw new Error('Oyuncu kimliği doğrulanamadı.');
    const { pid, token } = o.data;
    // only the owner can open the room; a guest arriving first finds it offline
    if (pid !== this.owner && !this.state.players.size) throw new Error('Bu oda şu an çevrimiçi değil.');
    // your old self (a reload) does not hold a chair against you
    if (profiles.open(pid, parseJoin(options).secret)) this.replaceTwins(pid);
    const count = this.state.players.size;
    const verdict = homeEntry(this.room, { pid, owner: this.owner, count, token });
    if (verdict !== 'ok') throw new Error(REFUSE[verdict]);
    super.onJoin(client, options);
    if (pid === this.owner) this.state.ownerName = this.ownerName = cleanName(parseJoin(options).name) || 'Oyuncu';
    this.meta();
  }

  onLeave(client: Client) { super.onLeave(client); this.meta(); }
  onDispose() { super.onDispose(); if (HomeRoom.live.get(this.owner) === this) HomeRoom.live.delete(this.owner); }

  /** the owner saved their room: everyone inside sees the new look; seats past the new count are freed */
  applyRoom(room: RoomData) {
    this.room = room;
    const look: Record<string, unknown> = {}; for (const k of ROOM_KEYS) if (room[k] !== undefined) look[k] = room[k];
    this.state.layout = JSON.stringify(look);
    this.state.name = room.name;
    const n = this.seatCount();
    this.state.players.forEach((p: { seatIndex: number }) => { if (p.seatIndex >= n) p.seatIndex = -1; });
    this.meta();
  }

  get info() { const r = this.room; return { kind: 'home', roomId: this.roomId, owner: this.owner, ownerName: this.ownerName, name: r?.name ?? 'Odam', open: !!r?.open, n: this.state.players.size, cap: this.capacity, phase: 'idle' }; }

  /** what the world list shows (open rooms only appear there) */
  private meta() {
    const r = this.room;
    this.setMetadata({ owner: this.owner, ownerName: this.ownerName, name: r?.name ?? 'Odam', cat: r?.cat ?? 'Genel', open: !!r?.open, n: this.state.players.size, cap: this.capacity });
  }
}
