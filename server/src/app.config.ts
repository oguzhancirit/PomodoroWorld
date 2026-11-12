import { defineServer, defineRoom } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import express from 'express';
import { StudyRoom } from './rooms/StudyRoom';
import { HomeRoom } from './rooms/HomeRoom';
import { LibraryRoom } from './rooms/LibraryRoom';
import { SocialRoom } from './rooms/SocialRoom';
import { routes } from './http';

export const server = defineServer({
  transport: new WebSocketTransport(),
  rooms: {
    // players who chose the same pomodoro length share a room (25/5 with 25/5, 50/10 with 50/10)
    study_room: defineRoom(StudyRoom).filterBy(['preset']),
    // step 4: one live room per owner ("Odam"), friends join it
    home: defineRoom(HomeRoom).filterBy(['owner']),
    // step 4f: the 10-seat public library (everyone keeps their own timer, so any length fits)
    library: defineRoom(LibraryRoom, { hall: 'library' }),
    // "Pist 25" (user 2026-11-08): the aviation study hall, same room type with its own layout and 8 cockpit seats
    pist25: defineRoom(LibraryRoom, { hall: 'pist25' }),
    // step 4g: v1 social spaces, one set of salons per space
    social: defineRoom(SocialRoom).filterBy(['space']),
  },
  greet: false,
  express: (app) => routes(app, express.json({ limit: '48kb' })),
});
export default server;
