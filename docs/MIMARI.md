# Architecture / file map
Read the section you need, not the whole file.

## shared (pure rules, tested)
- `src/economy.ts` — ECON, levels, `rewardFocus`, CATALOG (avatar parts + old room catalog), `buy`, `owns`, `sanitizeWallet` (old KayKit `furn.*` items are refunded as coins), `STARTER`.
- `src/quests.ts` — daily/weekly QUESTS, 7-day login reward, pledge; `clock(now, tz)` = player's own day/week; `loginTick`, `claimQuest`, `claimLogin`, `setPledge`, `noteChat`, `noteDecor`, `questsReady`. `rewardFocus` also fills stats (hours, session log with category, weekXP) and quest progress.
- `src/roomCatalog.ts` — GENERATED from old `js/data.js` by `tools/extract-room-catalog.mjs`.
- `src/room.ts` — old room format, starter room with 2 chairs, `roomSeats`, `homeCapacity`, `homeEntry`, `inviteCode`/`parseInvite`, `sanitizeRoom`, `roomAllowedFor` (owned items + level-locked surfaces), `placedCount`, `available`.
- `src/timer.ts`, `chat.ts`, `seats.ts`, `avatar.ts`, `protocol.ts` (zod schemas).

## server
- `src/http.ts` — `/api/profile` (= daily login, takes `tz`), `/api/buy`, `/api/room` (new furniture → decorator quest), `/api/quest` (claim, login reward, pledge), `/health` (CORS `*`).
- `src/profiles.ts` — JSON-file store; keeps only `sha256('pw:'+secret)`; `PW_DATA` sets the file.
- `src/rooms/HomeRoom.ts` — step 4: your own room live (`home`, filterBy owner). Only the owner opens it; guests: open room or invite token, ban list, capacity = seats (2..5, `homeEntry`). Timer idle until a `timer {action:start|stop}` message. `HomeRoom.live` lets `/api/room` push the new look. State `layout` = ROOM_KEYS JSON (no token/ban).
- `src/rooms/StudyRoom.ts` — shared study room: same timer for all, chat closed during focus, rewards from tracked focus. `PW_TIME_SCALE` speeds up tests.
- Deploy: Render free plan (`render.yaml`), Node 22.

## client
- `src/config.ts` — `DEMO_ONLY` (no server URL and not local, e.g. Claude artifact → bot demo).
- `src/economy.ts` — wallet/room load & save (demo: localStorage `pw2.wallet`, `pw2.room`; online: HTTP plus a local backup copy).
- `src/ui/Panels.tsx` — tool buttons + panels: Görevler, Yapılacaklar, Ortam sesleri, İstatistik. `src/todos.ts` (localStorage `pw2.todos`), `src/sound.ts` (port of `js/sound.js`, settings `pw2.sound`).
- `src/store.ts` — zustand; `screen`: lobby | room | home; `place` = the live room on the home screen (mine or a friend's: owner, layout JSON, cap).
- `src/net.ts` — `openHome()` (owner joinOrCreate `home`), `visitHome(code)` (guest `join`), `sendTimer`, `wire()` copies any room state into the store. Server unreachable → `LocalRoom(…, 'home')` (local timer; demo: one bot friend visits).
- `src/ui/World.tsx` — "Dünya" panel: invite link (`#oda-OWNER-TOKEN`, read in `App.tsx`), code box, open rooms (`GET /api/world`), study hall, social spaces (soon).
- App starts in Odam when the profile has a name (Lobby = character creation).
- `src/home/` — `HomeRoom.tsx` (Odam: draws players from the store with the old engine — sit by server seat index, bubbles, emotes; timer/chat/emotes from `ui/RoomUI.tsx`), `EditBar.tsx` (old editor tabs and tools), `engine.ts` (ROOM_STYLES, thumbs, undo history).
- `src/legacy/shim.ts` — runs old r128 code on three r186: lights ×π, point light decay 0 + range ×0.5, scene `environmentIntensity = 0.3`, `encoding`→`colorSpace`, multisample target, SAO off. `js/world.js` adds an ACES tone-map pass only when `THREE.OutputPass` exists (v1 unaffected).
- `src/legacy/avatarAdapter.ts` — the new avatar with the old `PW.Avatar` API (installed in `legacy/index.ts`).
- `src/scene/`, `src/avatar/` — R3F study room and Quaternius avatars (CC0).

## Testing in a browser
Playwright Chromium + swiftshader is slow (~40–90 s per step). Use `?lite`, scaled screenshots, and run long scripts in the background with output to a log file.

## Demo link
Claude artifact: https://claude.ai/artifact/2tQrEgaG6KtSWz5RdVRqMz
