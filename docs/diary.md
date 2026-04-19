# Session Zero - Project Diary

A running log of work sessions. Updated at the end of every session using /diary.
Read at the start of every session using /reflect.

---

## 2026-04-15

### Completed
- PR #117 merged: Restructure UI navigation for desktop and responsive (#116). Added a persistent bottom nav bar (mobile) and top nav links (desktop), merged History and Stats into a single "History" nav entry, wired up Profile modal with /api/me endpoint, guarded /api/me against undefined req.user in test mode, added Playwright nav tests with a NavPage object.
- PR #119 merged: Add project diary and diary/reflect slash commands. Created docs/diary.md, added .claude/commands/diary.md and .claude/commands/reflect.md prompt files so /diary and /reflect are available as slash commands.
- PR #120 opened: Fix modal scroll and mobile nav overlap (fix/modal-nav-scroll-fixes). Three nav follow-up fixes from #116: `.modal-overlay` padding-bottom on mobile so content is not hidden behind the bottom nav bar; `history-section-panel` and `profile-panel` height/overflow overrides so they scroll rather than clip; moved `overflow-y: auto` from `.profile-body` to `.profile-panel`.

### Decisions made
- History and Stats panels were merged into a single "History" nav entry rather than keeping them as separate destinations. Simpler nav, fewer modals.
- /api/me returns `{}` instead of 401 in test mode (NODE_ENV=test) so Playwright tests can load the nav without triggering auth failures.
- Diary and reflect prompts live in .claude/commands/ (project-level) rather than ~/.claude/commands/ (user-level) so they travel with the repo.

### In progress
- PR #120 open, awaiting review. Branch: fix/modal-nav-scroll-fixes.
- docs/diary.md has an uncommitted update on fix/modal-nav-scroll-fixes (this entry). Needs to be committed or moved to main.

### Up next
- Merge or get review on PR #120.
- Pick up one of the pending migration issues: #109 (Settings), #110 (Game Library), or #111 (Play History/Active Sessions).
- Run /reflect at the start of next session to re-orient.

### Notes
- Nav tests use a NavPage page object (tests/pages/NavPage.js). If nav structure changes, update NavPage first.
- The history-section-panel and profile-panel needed height: auto overrides because the session-modal desktop rule was locking height and hiding overflow on all .modal-overlay children. Watch for this pattern if new modals clip content.
- PR descriptions reference issue numbers with "Closes #n" -- keep this pattern, it auto-closes issues on merge.

---

## 2026-04-18

### Completed
- PR #125 merged (previous session): Fix BGG badge linking to Google search instead of BGG (#124). Added case-insensitive name-matching in `mergeBGGGames()` to backfill `bggId` on manual games during sync.
- PR #127 merged (previous session): Migrate Settings from localStorage to Postgres (#109). Added `settings` table, `GET/PUT /api/settings` routes, `initSettings()` in app.js, settings mock in Playwright `beforeEach`.
- PR #128 opened: Migrate Game Library from localStorage to Postgres (#110). Full games CRUD API (`GET`, `POST`, `PUT`, `DELETE`, `POST /api/games/sync`), write-through caching in app.js, import prompt for existing localStorage data, `library.seedGames()` Page Object helper, 3 new import prompt tests, `DEFAULT_TEST_GAMES` constant replaces games.json dependency in tests.
- PR #129 opened: Migrate Play History and Active Sessions to Postgres (#111). Added `sessions`, `session_players` (with feedback columns), and `active_sessions` (JSONB) tables. Seven new API routes. Import prompts for both `sz-history` and `sz-active-sessions`. 10 new tests: finalize flow, pause, resume, empty state, 6 import prompt tests. Total test count: 61.
- Issue #130 created: PWA support -- add to home screen on mobile.
- PR #131 opened: Add `docs/ai-strategy.md` (QA AI strategy document, no code changes).

### Decisions made
- Game library: write-through caching pattern (optimistic in-memory update + fire-and-forget API). Same pattern used for all subsequent migrations.
- Game library: no `games.json` fallback for new users -- empty library is acceptable. Tests supply games via `DEFAULT_TEST_GAMES` mock.
- History schema: denormalized `game_name TEXT NOT NULL` alongside nullable `game_id FK` so history entries survive game deletion.
- Active sessions: stored as JSONB blob (`data JSONB`) rather than normalized columns -- it's a serialized state snapshot, not a queryable table.
- History schema: added `mode`, `outcome`, `low_score_wins` columns and per-player feedback columns (`feedback_rating`, `feedback_play_again`, `feedback_notes`) that the issue spec omitted.
- Import prompts: all four data types (vault, games, history, active sessions) follow the same pattern -- prompt appears if API returns empty and localStorage key exists.
- `POST /api/history/sync` added for bulk history import (same pattern as `POST /api/games/sync`).

### In progress
- PR #128 open (feature/game-library-db): Game Library migration, Closes #110.
- PR #129 open (feature/history-db): History + Active Sessions migration, Closes #111.
- PR #131 open (docs/ai-strategy): docs only, no tests required.

### Up next
- Merge PRs #128, #129, #131 after review.
- Plan and implement #130 (PWA support): manifest.json, service worker, iOS/Android meta tags.
- Run /reflect at the start of next session.

### Notes
- The localStorage migration sequence (#108 through #111) is now complete. All four data types persist in Postgres.
- `beforeEach` in app.spec.js now mocks four APIs: `/api/players`, `/api/games`, `/api/history`, `/api/sessions/active`. All are stateful within each test via closure variables.
- `library.seedGames()` and `history.seedHistory()` use LIFO Playwright route registration to override the `beforeEach` default -- a pattern to follow for any future seeding needs.
- `scoreMode` defaults to `'points'` in app.js (not `'winlose'`), so `session.finalize()` can click End Game without selecting an outcome first. Important for tests.
- The `req.user` undefined errors in server logs during tests are pre-existing (settings route hits real server in test mode) -- not caused by this session's work.

---

## 2026-04-18 (evening)

### Completed
- PR #145 merged: Add user approval gate (#139). New OAuth users land in a `pending` state (`approved = FALSE`) and are redirected to `pending.html` with a sign-out link. `requireAuth` blocks unapproved users with redirect (pages) or 403 (API). Existing users unaffected via `DEFAULT TRUE` migration. 4 new Jest unit tests, 1 new Playwright test for the `/pending` route. Total tests: 62 Playwright + 4 Jest.
- PR #148 merged: Fix logout session persistence and Google account picker (fix/auth-logout-and-account-picker). Two bugs in `routes/auth.js`: (1) `req.session.destroy()` was called outside the `req.logout()` callback, so the session survived logout and looped back to `/pending`; (2) Google OAuth was auto-selecting the last account rather than showing the picker -- fixed with `prompt=select_account`.

### Decisions made
- Approval gate uses `approved BOOLEAN DEFAULT TRUE` so existing users are not locked out on migration; only new signups start unapproved.
- `requireAuth` handles unapproved users inline (no separate middleware) -- redirects HTML requests to `/pending`, returns 403 for API requests.
- `pending.html` is a static page served without auth so unapproved users can reach it and sign out.
- `prompt=select_account` added permanently to Google OAuth -- always show account picker, never auto-select.
- Post-deploy step required: delete test users and set `role='admin'` on Paul's account manually via SQL.

### In progress
- No open PRs. All branches merged to main.

### Up next
- Pick up PWA support (#130): `manifest.json`, service worker, iOS/Android meta tags.
- Consider implementing role-based access (`role` column already on users table) if admin features are needed.
- Run /reflect at the start of next session.

### Notes
- The logout bug (session surviving `req.logout()`) was caught because unapproved users could not escape the `/pending` loop even after signing out. Root cause: async `destroy()` must be called inside the `req.logout(done)` callback, not after it.
- `routes/auth.js` is now the only file changed on the merged branch -- a clean, minimal fix.
- Post-deploy SQL checklist is in the PR #145 description for reference if new test users need to be cleaned up again.

---

## 2026-04-18 (night)

### Completed
- PR #149 merged: Add admin role system and new user email notifications (feature/admin-role-and-permissions). `role` column on users table put to use; admin-gated routes and email notification logic added.
- `/start local` and `/stop local` subcommands added to `.claude/commands/`. `/stop local` kills whatever is on port 3000; `/start local` validates `.env` and starts the server.
- `CLAUDE.md` updated with a "Local database" section noting that `DATABASE_URL` must point at the local Postgres instance during development, never at Railway.
- `docs/process.md` updated with start/stop/status commands for local Postgres (`brew services start/stop postgresql@16`, `brew services list`). Committed and pushed directly to main (docs only).

### Decisions made
- Docs-only changes (process.md) pushed directly to main without a PR -- acceptable for pure documentation with no code impact.
- `/start` and `/stop` use a `local` subcommand argument to distinguish from future remote variants.

### In progress
- Nothing open. All branches merged.

### Up next
- Pick up PWA support (#130): `manifest.json`, service worker, iOS/Android meta tags.
- Run /reflect at the start of next session.

### Notes
- `/stop local` pattern: `kill -9 $(lsof -t -i:3000) 2>/dev/null` -- graceful if nothing is running.
- The `local` vs remote subcommand distinction is not yet implemented for remote -- just a naming convention for now.

---
