import { schema, t, type SchemaType } from '@colyseus/schema';

export const Player = schema({
  name: t.string(),
  avatar: t.string(),        // short avatar code, see @pw/shared encodeAvatar
  seatIndex: t.number(),
  pose: t.string(),          // "sit" | "idle" | "walk"
  activity: t.string(),      // "type" | "write" | "read" (desk animation while focusing)
  bubble: t.string(),        // last chat line, cleared after a few seconds
  connected: t.boolean().default(true),
  level: t.number(),
}, 'Player');
export type Player = SchemaType<typeof Player>;

export const Timer = schema({
  phase: t.string(),         // "focus" | "short_break" | "long_break" | "idle"
  phaseEndsAt: t.number(),   // server time in ms
  pausedLeft: t.number().default(0), // >0 while paused: ms left (v1 "Duraklat")
  round: t.number(),
}, 'Timer');

export const StudyRoomState = schema({
  players: t.map(Player),
  timer: Timer,
  preset: t.string(),
}, 'StudyRoomState');
export type StudyRoomState = SchemaType<typeof StudyRoomState>;

/** someone's own room (step 4): the study room state plus whose room it is and how it looks */
export const HomeRoomState = schema({
  players: t.map(Player),
  timer: Timer,
  preset: t.string(),
  owner: t.string(),         // owner's player id
  name: t.string(),          // room name
  ownerName: t.string(),     // shown to guests: "Oğuzhan'ın odası"
  layout: t.string(),        // JSON of the room's look (ROOM_KEYS only: never the invite token or ban list)
}, 'HomeRoomState');
export type HomeRoomState = SchemaType<typeof HomeRoomState>;
