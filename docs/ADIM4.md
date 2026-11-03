# Step 4 plan — the world grows around "Odam"

User decision (Nov 2026): **(b) new Quaternius avatar everywhere**. The 25-seat shared study hall is not wanted:
studying happens in small rooms. Order of priority:
1. **Odam first** — the app opens in your own room (as in v1). Friends join you there. Starter room has **2 chairs**;
   room capacity = seats in the room (max 5).
2. **Library** — a 10-seat public study room (v1 look: `th_library`), new instance when full.
3. **Social spaces** — v1 `PUBLIC_ROOMS` (Meydan Kafe, Çatı Terası, Oyun Salonu): walk, chat, emotes, NPCs.
A "Dünya" (world) button opens the rest: friends, open rooms, invite code, library, social spaces (v1 `ui.renderWorld`).

## Sub-steps (each: tests → build → screenshot → commit)
- **4a** Adapter: new avatar inside the old engine (`client/src/legacy/avatarAdapter.ts`, same API as old `PW.Avatar`:
  `root, build(cfg), setState, act, seatH, doEmote, update, headWorld`). Odam uses the player's avatar code.
- **4b** Rules: starter room with 2 chairs, `roomSeats(room)` / `homeCapacity` (shared, TDD).
- **4c** Server `HomeRoom` (Colyseus, one per owner): owner's saved room as layout, capacity from seats, invite token,
  ban list, open/closed, shared timer + rewards (reuse StudyRoom logic). Demo mode: bots visit.
- **4d** Client: app starts in Odam; guests drawn with the adapter; timer in Odam; Dünya panel (open rooms, invite code).
- **4e** Friends (v1 `features.js` friendsHTML): add from people you met, online/where, join them.
- **4f** Library (10 seats) on the old engine; retire the R3F 25-seat hall from the menu.
- **4g** Social spaces + social-space chat counts for the "social" quest; room settings panel (old `roomset`).

## Notes
- Old `PW.Avatar` stays as `PW.OldAvatar` (item thumbnails); the world uses the adapter.
- Seat data: `ROOM_FURN[].seat` (count per item) is enough for capacity on the server.
