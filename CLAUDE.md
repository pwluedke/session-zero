# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Session Zero is a vanilla HTML/CSS/JS + Node.js game night planning web app. Players filter a board game library by various criteria and get AI-powered recommendations. Built as a portfolio project demonstrating full-stack development, AI integration, and engineering workflow practices.

## Tech Stack
- Frontend: Vanilla HTML, CSS, JavaScript (no frameworks, no build step - intentional)
- Backend: Node.js with Express
- Auth: Google OAuth 2.0 via Passport.js
- Sessions: express-session backed by Postgres via connect-pg-simple
- Database: PostgreSQL (Railway)
- AI: Anthropic Claude API (claude-opus-4-6)
- Music: Spotify Web API + Spotify Embed Player
- Testing: Playwright with Page Object Model
- CI/CD: GitHub Actions
- Hosting: Railway (somanygames.app)
- Version control: Git + GitHub
- Data: Migrating from localStorage to Postgres (see Migration State below)

## Commands

Start the dev server:
```bash
node server.js
```

Run the full test suite (starts server automatically via webServer config):
```bash
npx playwright test
```

Run a single test by name:
```bash
npx playwright test --grep "test name here"
```

Run tests with the interactive UI:
```bash
npx playwright test --ui
```

## Architecture

### No build step
There is no bundler, transpiler, or framework. `index.html` is served directly. `app.js` and `style.css` are loaded as-is. Changes take effect on browser reload.

### Server (server.js)
Entry point. Sets up Express middleware in this exact order -- do not reorder:
1. dotenv
2. express()
3. CORS header
4. express.json()
5. migrate() - fire-and-forget DB warmup
6. session middleware - backed by Postgres when DATABASE_URL is set
7. passport config
8. passport.initialize() and passport.session()
9. requireAuth middleware
10. routes/auth.js
11. routes/api.js
12. routes/static.js
13. app.listen()

### Database
Local development uses a local Postgres instance (session_zero_dev). Never point DATABASE_URL at Railway when running locally -- that is the production database. Railway credentials are for production only.

### Routes
- `POST /api/why` - streams Claude API recommendation explanation
- `GET /api/spotify/playlist` - fetches Spotify playlists by game name
- `GET /api/bgg/collection` - proxies BGG XML API, returns normalized game objects
- `GET /api/players` - returns vault players for authenticated user
- `POST /api/players` - creates a player
- `PUT /api/players/:id` - updates player fields
- `DELETE /api/players/:id` - removes a player
- `GET /login` - serves login.html landing page
- `GET /demo` - serves index.html in demo mode
- `GET /auth/google` - initiates Google OAuth flow
- `GET /auth/google/callback` - handles OAuth callback, finds or creates user
- `GET /auth/logout` - destroys session, redirects to /login

### Authentication
- Google OAuth via Passport. `req.user` contains `{ id, google_id, email, display_name, avatar_url }` on all authenticated routes.
- `NODE_ENV=test` bypasses requireAuth entirely -- intentional for CI. This means Playwright tests cannot observe auth-blocking behavior. Use Jest unit tests for auth middleware logic.
- Static assets (.js, .css, .json) bypass requireAuth via file extension check -- never require auth for static files.

### Demo mode
- `/demo` serves the full app with static demo data and fictional players.
- `isDemoMode()` in app.js gates all API calls and localStorage writes.
- Demo players are hardcoded: Colonel Mustard, Miss Scarlett, Professor Plum, Mrs. Peacock.
- Demo data lives in `demo-games.json` -- Paul controls this file manually.
- Never modify demo behavior as a side effect of other changes.
- Never write real data to the database from demo mode.

### Frontend (app.js)
Single file organized into sections marked with `// -- Section Name --` comments. Sections: Player Vault, Roll Call, Settings, Filters, Game Cards, Why?, Session Modal, Spotify, Score Tracker, Timer, Dice Roller, Play History, Player Stats, Game Library, Quick Search.

All state is module-level `let` variables at the top of the file. No state management library.

### Player IDs
Player IDs are Postgres integers stringified at the API boundary via `normalizePlayer()`. All code that compares player IDs already goes through this function. Never compare raw IDs without normalizing first -- `'123' !== 123` bugs are real and have bitten us before.

### Modal pattern
Every modal is a `<div>` with a unique `data-testid`. Active state is toggled via `.classList.add('active')`. Session Dashboard is the main complex modal containing Score Tracker, Timer, Dice Roller, and Spotify panels in a left/right split layout.

### Session lifecycle
`openSession(index)` sets global `sessionGame` and `sessionPlayers`, initializes all sub-components. `pauseSession()` serializes full state to `sz-active-sessions`. `resumeSession(id)` restores it. `finalizeSession()` writes to `sz-history` and clears the active session.

### Tests (tests/)
All tests live in `tests/app.spec.js`. Page objects live in `tests/pages/`. Each page object maps to one modal or page area. `beforeEach` clears localStorage and reloads -- tests are fully isolated. The `playwright.config.js` `webServer` block starts the server automatically with `NODE_ENV=test`.

## Current Migration State

Migrating from localStorage to Postgres. Before touching any persistence code, check this table:

| Data | Storage | Status |
|---|---|---|
| Player Vault | Postgres | Complete (#108) |
| Settings | localStorage | Pending (#109) |
| Game Library | localStorage | Pending (#110) |
| Play History | localStorage | Pending (#111) |
| Active Sessions | localStorage | Pending (#111) |

Never write new localStorage persistence for Player Vault data -- it lives in the database.
When touching any other data, check this table before choosing localStorage vs API call.

## Core Principles

### 1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

- State assumptions explicitly -- if uncertain, ask rather than guess
- Present multiple interpretations -- don't pick silently when ambiguity exists
- Push back when warranted -- if a simpler approach exists, say so
- Stop when confused -- name what's unclear and ask for clarification
- Always present a plan before implementing anything destructive or architectural

### 2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked
- No abstractions for single-use code
- No flexibility or configurability that wasn't requested
- No error handling for impossible scenarios
- If 200 lines could be 50, rewrite it

The test: would a senior engineer say this is overcomplicated? If yes, simplify.

### 3. Surgical Changes
Touch only what you must. Clean up only your own mess.

- Don't improve adjacent code, comments, or formatting unless asked
- Don't refactor things that aren't broken
- Match existing style, even if you'd do it differently
- If you notice something wrong outside the scope of the task: mention it, do not fix it, do not create a branch for it. Paul will decide whether to create an issue.
- Remove imports/variables/functions that YOUR changes made unused
- Don't remove pre-existing dead code unless asked
- Every changed line should trace directly to the request

### 4. Goal-Driven Execution
Define success criteria. Loop until verified.

- Write failing tests first, then implement until green (TDD loop)
- For multi-step tasks, state a brief plan with a verification step for each
- PRs are only opened when all tests pass -- not before
- Use /compact when sessions get long to preserve output quality

## Testing Standards

- All tests use Page Object Model -- no raw selectors anywhere in test files
- External APIs are mocked with `page.route()` -- never hit live APIs in tests
- Every test is fully isolated -- `beforeEach` clears all state, tests never share data
- Seed test state via `page.evaluate()` directly into localStorage or memory
- New features require tests for: happy path, empty/zero state, error state, edge cases
- API integrations require tests for: success response, failure response, loading state
- Test names describe behavior, not implementation: "adding a player persists after reload" not "POST /api/players works"
- The Why? button (/api/why) is never tested with Playwright -- it hits a paid API

## Conventions
- Branch names: feature/short-description or fix/short-description
- Never commit directly to main
- One issue per branch, one feature per PR
- PR descriptions always include Closes #n referencing the issue
- Commit messages explain why, not just what
- Never use em dashes in any file. Use commas, semicolons, colons, regular dashes, or parentheses instead.

## Files You Should Never Modify Directly
- `.env` - environment variables, never touch
- `package-lock.json` - only modified by npm
- `games.json` - game data, only modify if explicitly asked
- `demo-games.json` - demo library, Paul controls this manually
- `.github/workflows/` - CI config, only modify if explicitly asked
- `db/schema.sql` - database schema, only modify if explicitly asked
- `config/passport.js` - auth configuration, touch carefully and only if asked
- `middleware/requireAuth.js` - security-critical, changes require explicit approval

## Working Approach
- Always ask "show me your plan first" before any new feature implementation
- Run tests after implementation -- PRs only open when tests pass
- Scope stays focused -- one feature or fix per session
- When creating GitHub Issues, follow the template in /prompts/create-github-issues.md
- The prompt library lives in /prompts/ -- check it before starting any repeatable task
- Use /plan before any implementation -- never skip the plan step
- Use /issue to create GitHub Issues -- keeps prompt library in sync
- Use /review before merging any PR
- docs/diary.md is the project diary -- run /reflect at the start of each session and /diary at the end