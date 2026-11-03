# v1 → v2 gap list (checked 2026-11-03, grep-verified by two scans of js/* + index.html)

## Planned already
- ✔ 4e Friends done: code + add, online/where, "Odasına git"/"Yanına git", "X geldi" toast, blocks (server profile `social`, `/api/friends`).
- 4f Library: th_library 10-seat public study room.
- 4g Social spaces: PUBLIC_ROOMS meydan/teras/oyun + NPCs (NPC_NAMES, NPC_TOPICS, NPC_LINES_*), salon split, Otur/Kalk; social chat → d_social.
- Room settings (ui.renderRoomSet): name, desc, ROOM_CATS, open/closed, new link, unban list. Rules exist; no UI, no HTTP fields.
- 5: intro film (PW.cinema, 3 chapters), backup export/import (+ to-dos), help modal, guided tour (TOUR).

## Last step (user, 2026-11-03): login + accounts
- Sign up / log in; a returning user is recognised and enters their room with the same saved character.
- First-time sign-up → intro film (step 5) → own room. Today identity is per-browser (pw2.identity pid/secret).
- Demo bots (Elif etc.) exist only in demo mode (DEMO_ONLY: artifact link or ?demo). Real site never shows bots;
  the old study hall still falls back to bots if the server is down — removed with 4f.

## Not yet planned — found by the scan
- ✔ Fixed: "Karakterim" button in Odam → character screen ("Kaydet ve odama dön").
- ✔ Person card (home/PersonCard.tsx): wave, add/remove friend, "Odamdan çıkar" (server kick → room ban), block. Left: unban list UI (room settings), "Profil → Engellenenler" (now in Dünya).
- Walking/sitting not synced: Player schema has no x/z; seat click in Odam not sent (sendSit only in R3F hall).
- ✔ Fixed (user, 2026-11-03): v1 focus screen in Odam (home/FocusScreen.tsx): pause/resume, skip, reset, Space/Esc, focus camera, task text + recent, round dots, category picker, presets + "Özel". Alone the card says "Odaklan"; only with a friend in the room "Birlikte odaklan" / "Birlikte başlat". Sounds now play in Odam too.
- Focus screen leftovers: autoNext, day timeline bar (fx-day), moodlet.
- Camera: flyIn, focusOn/unfollow unused.
- Settings form (#set-form): rename, sound on/off, NPC toggle, gfx quality, notifications, shareTask, filter toggle.
- Desktop notifications, wake lock, blinking title at break; one-tab guard; timer survives reload (unverified).
- People list (#people): level, status, friend/NPC tags.
- HUD: title, league chip, "Bugün n/4" goal. Leagues (PW.LEAGUES, leagueFor) + weekly leaderboard (weekXP exists).
- Level-up modal with confetti + unlocked items; achievement toast outside rewards.
- Profile page: header, last-7-days bars, leaderboard.
- Chat: level badge, system lines, repeat-message block (isRepeat), short messages during focus (v1 allowed).
- Emotes: dance and gs (group-study invite) missing; clap/cheer use Wave clip; desk acts drink/stretch missing; tag timer (info.timer).
- Group sessions "Birlikte" (startGroup/followPeer) — mostly replaced by shared HomeRoom timer.
- Onboarding: welcome step, room-name field, "Odan hazır".
- Moodlet (MOODS/celebrate); a11y focus trap + aria-live.
- By decision, not ported: old face/clothes/personas (avatar b), PWA, Claude-room/P2P transports.
