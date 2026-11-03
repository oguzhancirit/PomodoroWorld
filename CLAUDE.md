# Pomodoro World — agent notes
<!-- Kısa tutuldu: bu dosya her oturumda baştan okunur, her kelimesi token harcar. Ayrıntılar docs/ altında. -->

## Talk to the user
- User: Oğuzhan. Reply in **simple Turkish**, like explaining to a 10-year-old. Short updates, no step-by-step recaps.
- Keep going without asking permission for routine work. Ask only for real decisions (see "Open decision").

## Mission (user's own rule)
Nothing from v1 is thrown away. First port every old feature **completely** into v2, then improve quality on top. Do not reinvent.
- v1 = `index.html` + `js/*.js` (three r128 style, global `window.PW`). v2 = npm workspaces `shared/` (rules, pure TS) · `server/` (Colyseus 0.18 + express) · `client/` (Vite, React 19, R3F, zustand).
- Port order: 1 economy+shop ✔ · 2 personal room "Odam" ✔ · 3 quests, to-dos, sounds, stats ✔ · **4 Odam-centred world ← next (plan: docs/ADIM4.md)** · 5 intro film + **backup** (backup required; offline/PWA NOT wanted).
- Odam leftovers: room settings (name, desc, category, open/closed, invite link, ban list — old `js/ui.js` "roomset"), phone camera too close, solo timer in Odam. Step-3 leftovers: to-dos are browser-only (add to backup in step 5); "social" quest counts study-room break chat (add social-space chat in step 4).

## Avatar decision (made: b)
New Quaternius avatar everywhere. The old engine draws it through `client/src/legacy/avatarAdapter.ts` (old `PW.Avatar` API, cfg = avatar code). Old clothing items are not shown.

## Commands
- Install: `npm install --ignore-scripts --legacy-peer-deps` (flag required, npm 10.9 bug)
- Test: `npm test 2>&1 | grep -E "Tests |FAIL|×"` (shared 96 + server 34 pass) · Build: `cd client && npx vite build 2>&1 | tail -3`
- Dev: `npm run dev:server` + `npm run dev:client`; routes `/?home` (Odam), `?demo` (bots, no server), `?lite` (light graphics)
- Artifact demo build: `npm run build:artifact`

## Rules
- Game logic: **TDD** (tests in `shared/test`, `server/test`). Find the root cause before fixing. Fresh evidence (test/build/screenshot) before saying "done".
- Small commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Tell the user what will be pushed before pushing. No `reset --hard`, no force push.
- New dependency: MIT only (else ask; TypeScript is Apache-2.0 so there is no `tsc` — Vite build + tests are the check), maintained, ≥2 weeks old, no `curl|sh`, no secrets, `.env` stays ignored. Never type passwords.
- Never edit `shared/src/roomCatalog.ts` by hand: regenerate with `node tools/extract-room-catalog.mjs`.

## Context & token rules (details: docs/context-ve-token.md)
- Read narrowly: `grep -n` first, then `Read` with offset/limit. `index.html` (124 KB) and `js/*.js` are large — never read them whole.
- Do not open generated/binary files: `*.glb`, `*.glb.json`, `client/public/avatars/clips-*.json`, `package-lock.json`, `tools/*-src/`, `client/dist*` (blocked in `.claude/settings.json`).
- Pipe long output through `tail`/`grep` (tests, builds, logs). Screenshots at `scale ≤ 0.6`, `?lite`.
- Broad searches across many files → a subagent returns a short summary; keep the main context for the work.
- `/compact` after a milestone (after exploring, after a step is committed), not mid-change. `/clear` between unrelated tasks. Write state worth keeping into this file or `docs/`, not only into chat.

## Where things are
File map and engine details: `docs/MIMARI.md` — read it when you start a new area.
