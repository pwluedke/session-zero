# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Session Zero is a vanilla HTML/CSS/JS + Node.js game night planning web app. Players filter a board game library by various criteria and get AI-powered recommendations. Built as a portfolio project demonstrating full-stack development, AI integration, and engineering workflow practices.

## Tech Stack
- Frontend: Vanilla HTML, CSS, JavaScript (no frameworks, no build step - intentional)
- Backend: Node.js with built-in http module (no Express)
- AI: Anthropic Claude API (claude-opus-4-6)
- Music: Spotify Web API + Spotify Embed Player
- Testing: Playwright with Page Object Model
- CI/CD: GitHub Actions
- Version control: Git + GitHub
- Data: games.json (local), migrating to BoardGameGeek API

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
Three API routes, everything else is static file serving:
- `POST /api/why` - sends game + filter context to Claude API, streams back a recommendation explanation
- `GET /api/spotify/playlist?game=&type=` or `?query=` - fetches a playlist from Spotify and returns up to 5 results as `{ playlists: [{ embedUrl, name }] }`
- `GET /api/bgg/collection?username=` - proxies BoardGameGeek XML API, parses it, returns normalized game objects (blocked on BGG API token)

### Frontend (app.js)
Single 1800-line file organized into sections marked with `// ── Section Name ──` comments. Sections map directly to features: Player Vault, Roll Call, Settings, Filters, Game Cards, Why?, Session Modal, Spotify, Score Tracker, Timer, Dice Roller, Play History, Player Stats, Game Library, Quick Search.

All state is module-level `let` variables at the top of the file. No state management library.

### Data / localStorage
All persistence is localStorage. Keys:
- `sz-games` - game library array (overrides games.json if present)
- `sz-vault` - permanent player registry
- `sz-settings` - user preferences (showWhyBtn, bggUsername, bggLastSync)
- `sz-history` - finalized session results
- `sz-active-sessions` - paused (in-progress) sessions

On startup, `sz-games` is loaded from localStorage if present, otherwise fetched from `games.json`.

### Modal pattern
Every modal is a `<div>` with a unique `data-testid`. Active state is toggled via `.classList.add('active')`. Session Dashboard is the main complex modal - it contains Score Tracker, Timer, Dice Roller, and Spotify panels as sub-sections within a left/right split layout.

### Session lifecycle
`openSession(index)` sets the global `sessionGame` and `sessionPlayers`, then initializes all sub-components (score tracker, timer, dice, Spotify). `pauseSession()` serializes full state to `sz-active-sessions`. `resumeSession(id)` restores it. `finalizeSession()` writes to `sz-history` and clears the active session.

### Tests (tests/)
All tests live in `tests/app.spec.js`. Page objects live in `tests/pages/`. Each page object maps to one modal or page area. `beforeEach` clears localStorage and reloads so tests are fully isolated. The `playwright.config.js` `webServer` block starts `node server.js` automatically - no manual server startup needed for tests.

## Conventions
- Branch names: feature/short-description or fix/short-description
- Never commit directly to main
- One issue per branch, one feature per PR
- PR descriptions always include Closes #n referencing the issue
- Commit messages explain why, not just what
- Test files use Page Object Model - no raw selectors in test files
- External APIs are mocked in tests using page.route() - never hit live APIs in tests
- Never use em dashes in any file. Use commas, semicolons, colons, regular dashes, or parentheses instead.
- Always ask "show me your plan first" before any new feature implementation
- New features follow TDD loop: write failing test first, then implement until green

## Files You Should Never Modify Directly
- .env (environment variables - never touch)
- package-lock.json (only modified by npm)
- games.json (game data - only modify if explicitly asked)
- .github/workflows/ (CI config - only modify if explicitly asked)

## Working Approach
- Always present a plan before implementing anything destructive or architectural
- Run tests after implementation - PRs only get opened when tests pass
- Scope stays focused - one feature or fix per session
- Use /compact when the session gets long to preserve output quality
- When creating GitHub Issues, follow the template in /prompts/create-github-issues.md
- The prompt library lives in /prompts/ -- check it before starting any repeatable task
- Use /project:plan before any implementation -- never skip the plan step
- Use /project:issue to create GitHub Issues -- keeps prompt library in sync
- Use /project:review before merging any PR
