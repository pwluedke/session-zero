# Session Zero: A Game Night Planner

[![Playwright Tests](https://github.com/pwluedke/session-zero/actions/workflows/playwright.yml/badge.svg)](https://github.com/pwluedke/session-zero/actions/workflows/playwright.yml)

**Live app: [somanygames.app](https://somanygames.app)**

### *So many games, so little night.*

A personal web application for planning game nights with family and friends. Filter your library by players, playtime, complexity, setup time, and more -- then get an AI-powered explanation of why each suggestion fits your group tonight.

Built as a portfolio project to demonstrate full-stack development, AI integration, and engineering workflow practices.

---

## Features

- Filter games by players, playtime, complexity, type, age, setup time, rating, and co-op mode
- "Why?" button -- Claude AI explains why a game fits tonight's group
- "Surprise Me" -- random pick from your full library
- Quick search bar -- live substring filtering across visible game cards
- Music player -- Spotify embed auto-matched to the selected game's theme
- Player Vault -- permanent player registry backed by Postgres, with avatars and last-played tracking
- Roll Call -- per-session check-in that automatically drives the player count filter
- Session dashboard -- score tracker, timer, dice roller, and Spotify player in one view
- Play history, player stats, and head-to-head records
- Game Library -- full CRUD for your game collection, with BGG CSV import and live sync
- BGG source tagging -- games show whether they came from BGG or were added manually
- Responsive navigation -- desktop top nav bar, mobile bottom nav bar
- Demo mode -- try the full app at [somanygames.app/demo](https://somanygames.app/demo) with no account required
- Google OAuth -- sign in with Google to save your library and player data across devices
- AI-powered CI failure analysis -- failed Playwright tests are automatically analyzed by Claude with root cause and suggested fix

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript (no frameworks -- intentional) |
| Backend | Node.js with Express |
| Auth | Google OAuth 2.0 via Passport.js |
| Database | PostgreSQL (Railway) |
| AI | Anthropic Claude API (`claude-opus-4-6`) |
| Music | Spotify Web API + Spotify Embed Player |
| Data | Migrating from localStorage to Postgres (Player Vault complete) |
| Testing | Playwright (E2E, Page Object Model) + Jest (unit) |
| CI/CD | GitHub Actions -- runs tests on every PR, AI failure analysis on failure |
| Hosting | Railway (auto-deploy on merge to main) |
| Domain | somanygames.app |
| Version Control | Git + GitHub |

---

## Local Setup

A live version is available at [somanygames.app](https://somanygames.app) -- no setup required. Try the demo at [somanygames.app/demo](https://somanygames.app/demo) without creating an account.

To run locally:

**Prerequisites:** Node.js, npm

```bash
git clone https://github.com/pwluedke/session-zero.git
cd session-zero
npm install
```

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=your_anthropic_api_key
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
BGG_API_TOKEN=your_bgg_api_token
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET=your_random_session_secret
DATABASE_URL=your_postgres_connection_string
APP_URL=http://localhost:3000
```

Start the server:

```bash
node server.js
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to the login page. Sign in with Google or visit [http://localhost:3000/demo](http://localhost:3000/demo) to try demo mode.

---

## Testing

End-to-end tests run against the live server using Playwright with a Page Object Model architecture. All external APIs are mocked with `page.route()` -- no live API calls in tests.

**Run the full suite:**

```bash
npx playwright test
```

**Important:** never start `node server.js` manually before running tests. Playwright manages its own server with `NODE_ENV=test` via the `webServer` config. Running both simultaneously causes auth to bypass incorrectly and tests will fail on the login page.

**Run a single test:**

```bash
npx playwright test --grep "test name here"
```

**Interactive UI mode:**

```bash
npx playwright test --ui
```

**Test coverage:**

| Area | Coverage |
|---|---|
| Page load | Title, desktop nav items |
| Player Vault | Add, remove, duplicate rejection, persistence after reload |
| Roll Call | Toggle updates player count filter |
| Find Games / Filters | Results, player count, complexity, no-results |
| Surprise Me | Returns exactly 1 game |
| Quick Search | Filters visible cards by name |
| BGG Sync | Merge logic, source preservation, error states |
| Session Modal | Opens with game title, timer start/pause |
| Game Library | Load, search, add, delete |
| Settings | Why? button toggle |
| History | Opens and renders |
| Stats | Tab switcher |
| Nav | Desktop and mobile nav items, active states |
| Demo mode | Landing page, demo data, banner, mock Why? response |

**AI failure analysis:** when tests fail in CI, the failure output is automatically piped to Claude for root cause analysis. The report is uploaded as a GitHub Actions artifact and printed to CI logs.

---

## Development Workflow

This project follows a structured engineering process documented in [docs/process.md](docs/process.md). Every decision -- from feature prioritization to deployment -- follows the same process a professional engineering team would use.

### The process

1. **Identify the work** -- new features start as a conversation with Elara (Claude.ai), evaluating priority and scope
2. **Create a GitHub Issue** -- using `/issue` or the prompt template in `/prompts/create-github-issues.md`
3. **Branch** -- `feature/short-description` or `fix/short-description`, never commit to main
4. **Plan** -- run `/plan #[issue]`, review the plan before any code is written
5. **Implement** -- run `/implement #[issue]`, full loop: write, test, fix, PR opens when tests pass
6. **Review** -- run `/review`, check against acceptance criteria and quality gates
7. **CI runs** -- GitHub Actions runs the full Playwright suite, blocks merge if tests fail
8. **Merge** -- Paul reviews and approves, human holds the final gate
9. **Deploy** -- Railway auto-deploys to somanygames.app within minutes of merge

### Claude Code Slash Commands

Custom slash commands in `.claude/commands/` standardize AI-assisted development. Commands encode project standards so they are enforced automatically.

| Command | Usage | What it does |
|---|---|---|
| `/plan` | `/plan #116` | Generates an implementation plan. No code written until approved. |
| `/implement` | `/implement #116` | Executes the approved plan. Full loop: write, test, fix, PR. |
| `/issue` | `/issue add BGG link to game cards` | Creates a structured GitHub Issue using the prompt library template. |
| `/review` | `/review` | Reviews the open PR against acceptance criteria, POM patterns, and quality gates. |
| `/diary` | `/diary` | Appends a session log entry to docs/diary.md. Run at end of each session. |
| `/reflect` | `/reflect` | Reads docs/diary.md and outputs a session startup briefing. Run at start of each session. |
| `/start` | `/start` | Verifies .env keys, starts the dev server, confirms database connection. |

### AI Governance

The `.claude/` folder is the control center for Claude Code (Gloom):

```
.claude/
├── commands/       -- slash commands available in every session
└── rules/
    └── testing.md  -- codified QA standards, auto-enforced on test files
```

`CLAUDE.md` in the repo root gives Gloom full project context at the start of every session -- architecture, conventions, migration state, and behavioral principles.

---

## AI Layer

This is what makes the project distinctive.

### Prompt Library (`/prompts/`)

Every repeatable AI interaction is documented as a versioned prompt:

| Prompt | Purpose |
|---|---|
| `create-github-issues.md` | Generate structured GitHub Issues from a feature description |
| `failure-analysis.md` | Analyze Playwright CI failures and suggest root cause and fix |

Prompts are treated like code -- versioned, tested against real inputs, and improved over time.

### AI in CI

When Playwright tests fail in GitHub Actions:
1. The failure output is filtered and piped to Claude via `scripts/analyze-failure.js`
2. Claude returns a structured report: what failed, probable root cause, affected file, suggested fix
3. The report is printed to CI logs and uploaded as a downloadable artifact

---

## Project Board

All work is tracked at [github.com/pwluedke/session-zero/issues](https://github.com/pwluedke/session-zero/issues).

### Epics

| # | Epic |
|---|---|
| #18 | Recommendation Engine |
| #19 | Session & Tournament Management |
| #20 | Library & Collection Management |
| #21 | Infrastructure & Quality |
| #102 | Player & Game Analytics |

### Recently Shipped

| # | Feature |
|---|---|
| #84 | BGG sync: merge instead of replace |
| #90-93 | Google OAuth, Postgres, Express migration |
| #98 | BGG link badge on game cards |
| #104 | Demo mode |
| #108 | Player Vault migrated to Postgres |
| #116 | Responsive navigation (desktop + mobile) |
| #121 | AI failure analyzer in CI pipeline |

### Open Backlog

**#18 Recommendation Engine**

| Issue | Title |
|---|---|
| #6 | Smart recommendations based on ratings |
| #7 | Player mood / vibe filter |
| #8 | Avoid repeats filter |
| #13 | Fuzzy search with match score |
| #100 | Discover panel -- suggest unowned games matching tonight's filters |

**#19 Session & Tournament Management**

| Issue | Title |
|---|---|
| #9 | Game night planner |
| #25 | Session panel: seating chart |
| #26 | Session panel: wheel of names |
| #28 | Session panel: photo upload |
| #29 | Session panel: notes and house rules |
| #57 | TCG support: card game tournament runner |

**#20 Library & Collection Management**

| Issue | Title |
|---|---|
| #85 | Source tagging: show game origin badge |
| #86 | BGG lookup when adding a game manually |
| #110 | Migrate game library to database |

**#21 Infrastructure & Quality**

| Issue | Title |
|---|---|
| #87 | Reset play data |
| #88 | Reset everything |
| #109 | Migrate Settings to database |
| #111 | Migrate play history and active sessions to database |
| #63 | Upload Playwright HTML report as artifact on failure |

**#102 Player & Game Analytics**

| Issue | Title |
|---|---|
| #103 | Play stats dashboard: charts and visualizations |
| #112 | Personalized game night summary email |

---

## License

Personal/portfolio project. Not licensed for redistribution.