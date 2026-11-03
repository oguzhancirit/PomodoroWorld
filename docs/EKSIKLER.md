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
- ✔ Demo has the new hand/emote clips (published from a scratchpad copy).

## Night round (2026-11-03): login, game, shop + personal style
- ✔ Sign-in page after the user's example (ui/Login.tsx): framed cards (film clip, character creator, people together), Google (Google's own button; server checks the token: server/src/auth.ts, /api/auth/google, needs GOOGLE_CLIENT_ID on the server and VITE_GOOGLE_CLIENT_ID in the build), Apple "Yakında", guest. Guest progress moves into a new Google account; the look (name + avatar) is kept on the account (/api/look). First run: film → character → room + tour (profile.made).
- ✔ Extras: dice "Şansıma" in character creation, live "people focusing now" line, account box in Karakterim (link Google / sign out).
- ✔ Speed: screens are lazy chunks; the sign-in page loads ~109 KB instead of 537 KB.
- ✔ Timer: flip cards in the room timer card; the focus screen keeps the plain ring. Chat starts folded; chat and day summary side by side.
- ✔ Karakterim = wardrobe of owned parts (name/body/colours fixed after creation).
- ✔ Oyun Salonu: console + TV item (f_console, also in the shop), "Pomo Canavarları" one-player creature battle (shared/src/monsters.ts, ui/MonsterGame.tsx). Next: two players.
- ✔ Personal touches on room items (shared room.ts: c colour, t own text ≤18 cleaned/censored, v design): own neon sign, design poster, letter garland, doormat with own words; free colour pickers everywhere.
- ✔ 29 new shop things (plants, lights, hobbies, pets that move, rugs, wall pieces, desk things); shop search + "Yeni" / "Kişiselleştirilebilir" filters.
- ✔ Floating room effects (snow, sakura, fireflies, leaves, stardust, bubbles; Room.fx, level-gated), 7 new wall/floor patterns, 7 new one-click looks.
- ✔ Demo-only "Deneme paketi" in the shop (+3000 coins, level 10) to try everything.
- Left: Google client id from the user; Apple sign-in (needs a paid Apple developer account); two-player Pomo Canavarları.
