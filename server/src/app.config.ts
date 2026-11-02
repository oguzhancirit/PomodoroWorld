import { defineServer, defineRoom } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { StudyRoom } from './rooms/StudyRoom';

export const server = defineServer({
  transport: new WebSocketTransport(),
  rooms: {
    // players who chose the same pomodoro length share a room (25/5 with 25/5, 50/10 with 50/10)
    study_room: defineRoom(StudyRoom).filterBy(['preset']),
  },
  greet: false,
});
export default server;
