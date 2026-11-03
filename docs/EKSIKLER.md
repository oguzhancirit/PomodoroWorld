# v1 → v2 gap list (checked 2026-11-03, grep-verified by two scans of js/* + index.html)

## Planned already
- ✔ 4e Friends done: code + add, online/where, "Odasına git"/"Yanına git", "X geldi" toast, blocks (server profile `social`, `/api/friends`).
- ✔ 4f Library: 10-seat public study room (Dünya → Kütüphane).
- ✔ 4g Social spaces (NPCs demo-only). Left: Otur/Kalk buttons, walking/sitting not synced.
- ✔ Room settings panel. Left: names of removed people (v1 banNames) — shows "Oyuncu #TAG" unless a friend.
- ✔ 5: intro film (plays once in Odam, "Tanıtımı izle" in Karakterim) and backup (account key + name/look/to-dos/sounds; v1 files refused: no coins from files). ✔ Guided tour (home/Tour.tsx) once after the film (profile.toured). Help modal dropped (user, 2026-11-03).

## Last step (user, 2026-11-03): login + accounts
- Sign up / log in; a returning user is recognised and enters their room with the same saved character.
- First-time sign-up → intro film (step 5) → own room. Today identity is per-browser (pw2.identity pid/secret).
- Demo bots (Elif etc.) exist only in demo mode (DEMO_ONLY: artifact link or ?demo). Real site never shows bots;
  the old study hall and its bot fallback are gone (4f).

## Not yet planned — found by the scan
- ✔ Fixed: "Karakterim" button in Odam → character screen ("Kaydet ve odama dön").
- ✔ Person card (home/PersonCard.tsx): wave, add/remove friend, "Odamdan çıkar" (server kick → room ban), block. Left: unban list UI (room settings), "Profil → Engellenenler" (now in Dünya).
- Walking/sitting not synced: Player schema has no x/z; seat click in Odam not sent (sendSit only in R3F hall).
- ✔ Fixed (user, 2026-11-03): v1 focus screen in Odam (home/FocusScreen.tsx): pause/resume, skip, reset, Space/Esc, focus camera, task text + recent, round dots, category picker, presets + "Özel". Alone the card says "Odaklan"; only with a friend in the room "Birlikte odaklan" / "Birlikte başlat". Sounds now play in Odam too.
- Focus screen leftovers: autoNext, day timeline bar (fx-day), moodlet.
- Camera: flyIn, focusOn/unfollow unused.
- Settings form (#set-form): rename, sound on/off, NPC toggle, gfx quality, notifications, shareTask, filter toggle.
- ✔ Desktop notifications (toggle in Karakterim), wake lock during focus, blinking title at break, start/done sounds (client/src/alerts.ts, shared phaseAlert). Left: one-tab guard; timer survives reload (unverified).
- ✔ People list (Kişiler).
- ✔ Leagues + weekly board (you + friends; /api/friends sends lv, wx) at the top of İstatistik; "Bugün n/4" on the timer card.
- ✔ Level-up window with confetti + unlocked items (ui/LevelUp.tsx, shared unlocksAt). ✔ State gem moved above the name tag. Left: achievement toast outside rewards.
- Profile page: header, last-7-days bars, leaderboard.
- Chat: level badge, system lines, repeat-message block (isRepeat), short messages during focus (v1 allowed).
- Emotes: dance and gs (group-study invite) missing; clap/cheer use Wave clip; desk acts drink/stretch missing; tag timer (info.timer).
- ✔ "Birlikte" = follow a friend's personal timer (followPeer). Left: group invite emote (gs).
- Onboarding: welcome step, room-name field, "Odan hazır".
- Moodlet (MOODS/celebrate); a11y focus trap + aria-live.
- By decision, not ported: old face/clothes/personas (avatar b), PWA, Claude-room/P2P transports.

## User feedback round (2026-11-03, after step 5)
- ✔ Desk hands: palms down, fingers curl toward the palm (tools/retarget.mjs placeHand/curl sign).
- ✔ Focus screen hides chat, reactions, hint, name tags. Reactions behind one smiley (bottom left); day summary (pomodoros, focus, break minutes; breaks counted in this browser, client/src/breaks.ts).
- ✔ Slower levels: xpStep 100*L^1.4.
- ✔ Social spaces: one host bot each (demo only); library bots removed; Elif kept in your own room (demo guide). Seat heights measured on the drawn cushion (legacy/index.ts).
- ✔ Focus clock: white watch face, Oswald digits, 60 ticks as progress, one card with the setup.
- Note: the artifact demo still has the old hand clips (clips-*.json are read-blocked, so they cannot be published from here).
