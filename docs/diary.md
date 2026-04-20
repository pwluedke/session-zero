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

## 2026-04-18 (late night)

### Completed
- Resend domain verification completed for somanygames.app -- DKIM verified, SPF and DMARC records added to Porkbun DNS. New user approval email confirmed working end-to-end locally and in production.
- Local Postgres development environment set up -- `session_zero_dev` database created, `DATABASE_URL` in `.env` updated to point at local instance. App no longer develops against Railway production database.
- TablePlus configured with two saved connections: `session-zero-local` (local dev) and `session-zero-railway` (production, handle with care).
- `docs/process.md` updated with full local development environment setup including database connection details and TablePlus configuration.
- Issues closed: #6 (superseded by #135), #142 (absorbed into #147 and #141).
- Issues created: #132 (BGG rating display), #133 (Table Rating), #134 (complexity fix), #135 (Epic: Intelligent Suggestion Engine), #136-#138 (suggestion engine skeleton issues), #139-#143 (admin/approval cluster), #144 (weighted scoring), #147 (Why? toggle to admin).
- Epic housekeeping: #136, #137, #138, #144 linked to #135. #103 and #113 linked to #102. #147 epic updated from #20 to #21.
- Portfolio plan document overhauled -- weekly structure removed, replaced with priority-based structure reflecting current state.
- Google AI Essentials certificate started.
- Prompt Engineering for Generative AI (LinkedIn) -- completed.

### Decisions made
- Local development always uses local Postgres (`session_zero_dev`). Railway DATABASE_URL is production -- never used locally.
- `games.json` is demo-only going forward. New users see an empty library with a BGG sync prompt. No seeding from games.json on first login.
- All user-facing AI features gated behind a single `ai_enabled` boolean per user (not separate per-feature flags). Covers Why?, suggestion engine, and any future AI features.
- `ai_daily_limit` integer on users table (null = unlimited, default 20) controls rate limiting per user. Configured per user in admin panel.
- Table Rating chosen as the name for group session average ratings (10-point scale, matches BGG).
- Full AI suggestion engine (Option A) approved -- Claude receives all context and returns ranked suggestions with scores and explanations. Not the current backwards flow of suggest-then-explain.
- All CI-facing AI (failure analyzer, release notes) is not controlled by user-facing feature flags -- managed in code and environment variables only.
- Resend chosen for transactional email. Domain verification required SPF, DKIM, and DMARC records in Porkbun DNS.
- 0 = unlimited rejected for ai_daily_limit in favor of null = unlimited (industry standard pattern).

### In progress
- #140 merged (admin role + email notification).
- #141 (admin panel UI) -- next in the admin cluster, depends on #140.
- Resend SPF records still propagating in Porkbun DNS -- DKIM already verified.

### Up next
- Plan and implement #141 (admin panel UI) -- user management, approve/deny, ai_enabled checkbox, ai_daily_limit input.
- Plan and implement #147 (move Why? toggle to admin, replace with ai_enabled).
- Run /reflect at the start of next session.

### Notes
- Never point DATABASE_URL at Railway credentials locally -- that is live production data.
- TablePlus Cmd+T opens a new SQL query tab. Cmd+R refreshes the table view.
- Resend fires on INSERT path only (new users) -- not on SELECT path (returning users). If email doesn't fire, check if the user already exists in the database.
- `prompt=select_account` on Google OAuth means the account picker always shows -- essential for testing with multiple accounts.
- The admin cluster dependency order is: #139 (done) → #140 (done) → #143 (done) → #141 → #147 → #142 (now redundant, absorbed into #141/#147).
- Suggestion engine issues #136-#138 and #144 all tagged do-not-implement -- skeleton only until the ratings and real-world signals work is complete.
- /reflect will suggest PWA as next up based on older diary entries -- ignore it. Current priority is #141 admin panel UI.
---

## 2026-04-19

### Completed
- PR #150 merged: Admin panel UI (#141). Full `admin.html` replacing the placeholder: pending users section (Approve/Deny per row), active users section (inline `ai_enabled` checkbox, `ai_daily_limit` input, Revoke button), bulk "Enable AI for all" / "Disable AI for all" buttons. Session invalidation on deny/revoke via direct DELETE on `session` table. Admin self-protection (Revoke/Deny disabled for own row). Demo mode guard on admin nav.
- Schema: `ai_enabled BOOLEAN DEFAULT TRUE` and `ai_daily_limit INTEGER DEFAULT 20` columns added to users table.
- `apiFetch` interceptor added to `app.js`: all `/api/` calls redirect to `/login` on 401 or 403 in non-demo mode. Two `/api/me` calls in `initAdminNav` and `fetchAndRenderProfile` kept as direct `fetch` (handle errors silently on load).
- `id` added to `/api/me` response (needed by admin panel for self-protection logic).
- `AdminPage` page object created (`tests/pages/AdminPage.js`). 9 new Playwright tests. Total: 74 passing.
- `scripts/seed-dev.js` added to main: populates local DB with test users (Paul as admin, Alice/Bob approved, Carol/Dave pending) and 13 games for Alice and Bob. Railway guard exits if `DATABASE_URL` contains `railway`. `ADMIN_EMAIL` guard exits if env var not set.
- Seed script hardened: `ADMIN_EMAIL` from `.env` used for admin row (no hardcoded email). `zerosession0@gmail.com` removed from seed -- real OAuth accounts must sign in via Google to get a valid `google_id`.
- `docs/process.md` updated with seed script docs and Manual Testing Workflow section.

### Decisions made
- **Deny = hard delete**: denying a pending user deletes them from the database. If they sign in again, they start a new pending request. Prevents denied users from polluting the pending list.
- **Revoke = set `approved = false`**: moves user back to pending list. Admin can re-approve later.
- `apiFetch` exception for `/api/me`: nav and profile fetches handle 401/403 silently rather than redirecting mid-load.
- `ai_daily_limit` renders blank when `null` (unlimited); clearing the input saves `null`.
- `zerosession0@gmail.com` excluded from seed: it's a real Google account that needs OAuth sign-in to get a real `google_id`. Fake seed IDs would break the sign-in flow.
- **AI suggestion engine returns exactly 3 recommendations, not 5**: curated and decisive UX, reduces paradox of choice, strong picks with visible match scores are more compelling than a longer diluted list. Cost difference is negligible.

### In progress
- Nothing open. PR #150 merged, all branches clean.

### Up next
- Plan and implement #147 (move Why? toggle to admin, replace per-user `show_why_btn` setting with `ai_enabled` flag).
- Manual testing of admin panel at localhost:3000/admin with seeded users.
- Run /reflect at the start of next session.

### Notes
- Run `node scripts/seed-dev.js` once after a fresh DB setup. Idempotent -- safe to re-run, skips existing rows.
- Never run the seed script with a Railway `DATABASE_URL` -- the guard exits immediately.
- Multiple concurrent Playwright runs caused port 3000 contention and false failures during this session. Always kill the dev server before running tests (`/stop local`), and never run two Playwright processes simultaneously.
- The admin cluster dependency order is now complete: #139 done → #140 done → #143 done → #141 done → **#147** next.

---

## 2026-04-20

### Completed
- PR #151 opened: Move Why? toggle from Settings to admin-controlled `ai_enabled` flag (feature/why-btn-to-admin, Closes #147).
  - `show_why_btn` column dropped from `settings` table via `ALTER TABLE settings DROP COLUMN IF EXISTS show_why_btn` in `schema.sql`.
  - New OAuth users explicitly set `ai_enabled = FALSE` in `config/passport.js` INSERT.
  - `initAdminNav()` renamed to `initUserState()` in `app.js`; now reads both `role` and `ai_enabled` from `/api/me` and toggles `hide-why` CSS class on body.
  - AI Features settings row removed from `index.html`.
  - `SettingsModal` page object cleaned of `whyBtn`, `toggleWhyBtn()`, `expectWhyBtnOn/Off()`.
  - Two new Playwright tests replacing old Why? toggle tests: "Why? button is hidden when ai_enabled is false", "Why? button is visible when ai_enabled is true". 74/74 passing.
- Design decision note appended to 2026-04-19 diary entry: AI suggestion engine returns exactly 3 recommendations, not 5.
- Comment posted on GitHub issue #135 with the same design decision rationale.
- `scripts/seed-dev.js` fully rewritten: resets all non-admin data, then seeds 1 test user (`TEST_USER_EMAIL`), 6 Dungeon Crawler Carl players, 18 games, 67 sessions with 7 hardcoded story patterns, and 1 paused Root active session (212 session_player rows). Uses `seedrandom` npm package with seed `'dungeon-crawler-carl'` for deterministic data.
- `.claude/commands/test.md` added: `/test #N` command checks out a PR branch and starts the server.
- `seedrandom` added to `package.json`.

### Decisions made
- **Seed script is now destructive (RESET)**: deletes all non-admin users and their data before seeding. Designed for repeated use during stats dashboard development -- a clean slate every run.
- **7 hardcoded story patterns** in seed data to support stats dashboard QA: Carl's Small World dominance, Princess Donut hates Catan, the forgotten Everdell gem, Katia's coop streak, Prepotente's suspicious win rate, recent Wingspan/Azul hot streak, Ticket to Ride rivalry between Carl and Mordecai.
- **Everdell and Catan excluded from random fill** to preserve their story integrity ("forgotten gem" must never appear in recent sessions; "all Catan sessions" must follow the PD-hates-Catan pattern).
- **Coop games excluded from random fill** so Katia's coop streak pattern holds -- every coop session includes Katia.
- **Prepotente excluded from random fill players** -- only 5 total sessions to make the suspicious win rate stat visible.

### In progress
- PR #151 open (feature/why-btn-to-admin): Closes #147. Branch pushed, awaiting manual testing and merge.
- Local DB seeded with comprehensive test dataset. Server running on feature/why-btn-to-admin for manual testing.

### Up next
- Manually test PR #151 at localhost:3000 -- verify Why? button visibility is controlled by `ai_enabled`, not the Settings toggle.
- Merge PR #151 once manual testing passes.
- Plan and implement stats dashboard (issue TBD) using the seeded dataset.
- Run /reflect at the start of next session.

### Notes
- `node scripts/seed-dev.js` now resets all data on every run. Do not run it if you have data you want to keep.
- The `TEST_USER_EMAIL` env var must be set (already present as `zerosession0@gmail.com` in `.env`). Sign in with that Google account via OAuth to test as the seeded user.
- Active session for Root is in the DB with `id = 'seed-active-001'`. It will appear in the UI if the resume session flow is wired up.
- Session mode values used in seed: `'points'` and `'winlose'` (matches app's `scoreMode` defaults, not the schema's `DEFAULT 'scores'`). Worth verifying this doesn't cause display issues in the stats dashboard.
