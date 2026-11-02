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
  round: t.number(),
}, 'Timer');

export const StudyRoomState = schema({
  players: t.map(Player),
  timer: Timer,
  preset: t.string(),
}, 'StudyRoomState');
export type StudyRoomState = SchemaType<typeof StudyRoomState>;
