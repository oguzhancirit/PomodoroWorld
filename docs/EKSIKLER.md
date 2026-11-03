# v1 → v2 gap list (checked 2026-11-03, grep-verified by two scans of js/* + index.html)

## Planned already
- 4e Friends: friend code/add, online + where, "Odasına git"/"Yanına git", "X geldi" toast (v1 features.js friendsHTML, net.js lobby presence at/atn).
- 4f Library: th_library 10-seat public study room.
- 4g Social spaces: PUBLIC_ROOMS meydan/teras/oyun + NPCs (NPC_NAMES, NPC_TOPICS, NPC_LINES_*), salon split, Otur/Kalk; social chat → d_social.
- Room settings (ui.renderRoomSet): name, desc, ROOM_CATS, open/closed, new link, unban list. Rules exist; no UI, no HTTP fields.
- 5: intro film (PW.cinema, 3 chapters), backup export/import (+ to-dos), help modal, guided tour (TOUR).

## Not yet planned — found by the scan
- Blocking: cannot return to Lobby once named → name, character and preset cannot be changed. Needs a profile/settings entry.
- Person card on avatar click (ui.openPerson): add friend, kick/ban from my room, block, wave, study together. Engine fires onClick avatar; HomeRoom.tsx ignores it.
- Walking/sitting not synced: Player schema has no x/z; seat click in Odam not sent (sendSit only in R3F hall).
- Focus screen (openFocus): pause/resume, skip, Space key, focus camera (setFocusCam), task text + recent, round dots, minimise/mini dock, custom preset, autoNext, category picker in Odam.
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
