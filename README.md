# Session Zero: A Game Night Planner

[Playwright Tests](https://github.com/pwluedke/session-zero/actions/workflows/playwright.yml)

**Live app: [somanygames.app](https://somanygames.app)**

### *So many games, so little night.*

A personal web application for planning game nights with family and friends. Filter your library by players, playtime, complexity, setup time, and more, then get an AI-powered explanation of why each suggestion fits your group tonight.

Built as a portfolio project to demonstrate full-stack development, AI integration, and engineering workflow practices.

---

## Features

- Filter games by players, playtime, complexity, type, age, setup time, rating, and co-op mode
- "Why?" button: Claude AI explains why a game fits tonight's group
- "Surprise Me": random pick from your full library
- Quick search bar: live substring filtering across visible game cards
- Music player: Spotify embed auto-matched to the selected game's theme
- Player Vault: permanent player registry with avatars and last-played tracking
- Roll Call: per-session check-in that automatically drives the player count filter
- Session dashboard: score tracker, timer, dice roller, and Spotify player in one view
- Play history, player stats, and head-to-head records
- Game Library: full CRUD for your game collection, with BGG CSV import
- BoardGameGeek live sync *(in progress - awaiting API token approval)*
- Fuzzy search with match scoring *(planned)*

---

## Application Pages & States

### Pages


| Name     | Description                                                         |
| -------- | ------------------------------------------------------------------- |
| **Home** | Main page. Roll Call, Games in Progress, filters, and game results. |


### Modal States


| Name                  | Trigger                      | Description                                                                |
| --------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| **Player Vault**      | "Player Vault" button        | Permanent player registry. Add, remove, and set avatars.                   |
| **Session Dashboard** | "Let's Play!" on a game card | Active session. Panels: Playing, Score Tracker, Timer, Music, Dice Roller. |
| **Session Feedback**  | "End Game" in Score Tracker  | Post-game form: star rating, Play Again, and notes per player.             |
| **Game Library**      | "Library" button             | Full game list with add, edit, delete, search, and BGG import.             |
| **Play History**      | "History" button             | Log of all finalized sessions with scores and feedback.                    |
| **Player Stats**      | "Stats" button               | Per-player win rates, games played, and head-to-head records.              |
| **Settings**          | "Settings" button            | BGG sync, CSV import, and AI feature toggles.                              |


### Home Sections


| Name                  | Condition             | Description                                             |
| --------------------- | --------------------- | ------------------------------------------------------- |
| **Roll Call**         | Always visible        | Toggle vault players in/out for tonight's session.      |
| **Games in Progress** | Paused sessions exist | Cards for paused sessions with a Resume Session button. |


### Key Actions


| Action               | Context                  | What it does                                                             |
| -------------------- | ------------------------ | ------------------------------------------------------------------------ |
| **Let's Play!**      | Expanded game card       | Opens Session Dashboard                                                  |
| **Pause**            | Session Dashboard header | Saves session state, returns to Home. Card appears in Games in Progress. |
| **Resume Session**   | Games in Progress        | Restores Session Dashboard to its exact prior state                      |
| **End Game**         | Score Tracker panel      | Validates scores, stops timer, opens Session Feedback                    |
| **Back**             | Session Feedback         | Returns to Session Dashboard with all state intact                       |
| **Finalize Session** | Session Feedback         | Saves all results and feedback to history, closes modal, returns to Home |


---

## Tech Stack


| Layer           | Technology                                                  |
| --------------- | ----------------------------------------------------------- |
| Frontend        | Vanilla HTML, CSS, JavaScript                               |
| Backend         | Node.js (built-in `http` module, no framework)              |
| AI              | Anthropic Claude API (`claude-opus-4-6`)                    |
| Music           | Spotify Web API + Spotify Embed Player                      |
| Data            | localStorage (migrating to persistent backend, see #32)     |
| Testing         | Playwright (end-to-end, 19 tests) · Jest (unit) *(planned)* |
| CI/CD           | GitHub Actions (PR #66 open)                                |
| Version Control | Git + GitHub                                                |


---

## Local Setup

A live version is available at [somanygames.app](https://somanygames.app) - no setup required.

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
```

Start the server:

```bash
node server.js
```

Open [http://localhost:3000](http://localhost:3000).

---

## Testing

End-to-end tests run against the live server using Playwright with a Page Object Model.

**19 tests across 7 Page Object files:**


| Area                 | Coverage                                      |
| -------------------- | --------------------------------------------- |
| Page load            | Title, header buttons                         |
| Player Vault         | Add, remove, duplicate rejection              |
| Roll Call            | Toggle updates player count filter            |
| Find Games / Filters | Results, player count, complexity, no-results |
| Surprise Me          | Returns exactly 1 game                        |
| Quick Search         | Filters visible cards by name                 |
| Session Modal        | Opens with game title, timer start/pause      |
| Game Library         | Load, search, add game, delete game           |
| Settings             | Why? button toggle                            |
| History Modal        | Opens and renders                             |
| Stats Modal          | Tab switcher                                  |


```bash
npx playwright test
```

---

## Development Workflow

This project follows a structured engineering process documented in [docs/process.md](docs/process.md).

### 1. Pick an Issue

- All features, bugs, and tasks are tracked as **GitHub Issues**
- Issues are organized on a **GitHub Projects** kanban board
- When starting work, assign the issue to yourself and move it to *In Progress*

### 2. Create a Feature Branch

- Never commit directly to `main`
- Branch names follow the pattern `feature/short-description` or `fix/short-description`

```bash
git checkout -b feature/dice-roller
```

### 3. Write the Code

- Development happens in **Cursor** with **Claude Code** assistance
- Changes are kept focused; one feature or fix per branch
- Code is reviewed for security, simplicity, and correctness before committing

### 4. Write Tests

- **Playwright** for end-to-end tests: full browser automation against the running app using Page Object Model
- **Jest** for unit tests: filter logic, data transformations, API helpers *(planned)*
- Tests are written alongside the feature, not after

### 5. Commit

- Small, focused commits with descriptive messages
- Commit messages explain *why*, not just *what*

```bash
git add <specific files>
git commit -m "Add dice roller to session dashboard"
```

### 6. Open a Pull Request

- PRs are created via the **GitHub CLI** (`gh pr create`) or GitHub web
- Every PR references its issue with `Closes #<issue-number>`
- PR description includes a summary of changes and a testing checklist

### 7. Review and Merge

- Diff is reviewed before merging, even on a solo project
- GitHub Actions runs the full Playwright suite automatically on every PR
- Branch protection on `main` requires the Playwright CI check to pass before merging - PRs are blocked until CI is green
- Merges into `main` only after review and CI pass

### 8. Issue Closes Automatically

- GitHub detects the `Closes #n` in the merged PR and closes the linked issue
- The feature branch is deleted after merge

## Claude Code Slash Commands

This project uses custom Claude Code slash commands to standardize how AI-assisted development works. Commands live in `.claude/commands/` and are available in any Claude Code session.


| Command              | Usage                                       | What it does                                                                           |
| -------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| `/plan`      | `/plan #104`                        | Generates an implementation plan for an issue. No code written until plan is approved. |
| `/implement` | `/implement #104`                   | Executes the approved plan. Full loop: write, test, fix, PR.                           |
| `/issue`     | `/issue add BGG link to game cards` | Creates a structured GitHub Issue using the prompt library template.                   |
| `/review`    | `/review`                           | Reviews the open PR against acceptance criteria, POM patterns, and quality gates.      |


### How to use them

bash

```bash
# Step 1 -- plan first, always
/plan #104

# Step 2 -- review the plan with Elara (Claude.ai), then approve
# Step 3 -- implement
/implement #104

# Step 4 -- review before merging
/review
```

### Why this matters

These commands encode the project's engineering standards directly into the workflow. Every plan automatically enforces POM testing patterns, API mocking requirements, and scope constraints -- without having to repeat them in every prompt.

---

## Project Board

All planned and in-progress work is tracked at:
[github.com/pwluedke/session-zero/issues](https://github.com/pwluedke/session-zero/issues)

### Epics


| #   | Epic                            |
| --- | ------------------------------- |
| #18 | Recommendation Engine           |
| #19 | Session & Tournament Management |
| #20 | Library & Collection Management |
| #21 | Infrastructure & Quality        |


### Shipped


| #   | Feature                                                    |
| --- | ---------------------------------------------------------- |
| #1  | Music player for selected game (Spotify)                   |
| #2  | Player registration (Player Vault + Roll Call)             |
| #3  | Play history log                                           |
| #4  | Player stats                                               |
| #5  | Head-to-head records                                       |
| #14 | End-to-end tests (Playwright, 23 tests, Page Object Model) |
| #15 | BGG collection sync                                        |
| #22 | Session modal: "Let's Play" UI shell                       |
| #23 | Session panel: timer                                       |
| #24 | Session panel: live score tracker                          |
| #27 | Session panel: virtual dice roller                         |
| #62 | Branch protection: require CI to pass before merge         |
| #84 | Fix BGG sync: merge instead of replace                     |
| #90 | Add Express and restructure server.js                      |
| #91 | Add database connection and schema                         |
| #92 | Implement Google OAuth with Passport                       |
| #93 | Add route protection middleware                            |


### Open Backlog

**#18 Recommendation Engine**


| Issue                                                     | Title                                        |
| --------------------------------------------------------- | -------------------------------------------- |
| [#6](https://github.com/pwluedke/session-zero/issues/6)   | Smart recommendations based on ratings       |
| [#7](https://github.com/pwluedke/session-zero/issues/7)   | Player mood / vibe filter                    |
| [#8](https://github.com/pwluedke/session-zero/issues/8)   | Avoid repeats filter                         |
| [#13](https://github.com/pwluedke/session-zero/issues/13) | Fuzzy search with match score                |
| [#17](https://github.com/pwluedke/session-zero/issues/17) | Player profiles and per-player game feedback |


**#19 Session & Tournament Management**


| Issue                                                     | Title                                                 |
| --------------------------------------------------------- | ----------------------------------------------------- |
| [#9](https://github.com/pwluedke/session-zero/issues/9)   | Game night planner                                    |
| [#25](https://github.com/pwluedke/session-zero/issues/25) | Session panel: seating chart & arrangement randomizer |
| [#26](https://github.com/pwluedke/session-zero/issues/26) | Session panel: wheel of names (random player picker)  |
| [#28](https://github.com/pwluedke/session-zero/issues/28) | Session panel: photo upload                           |
| [#29](https://github.com/pwluedke/session-zero/issues/29) | Session panel: notes and house rules                  |
| [#30](https://github.com/pwluedke/session-zero/issues/30) | Session panel: rules reference and BGG link           |
| [#57](https://github.com/pwluedke/session-zero/issues/57) | TCG support: card game tournament runner              |


**#20 Library & Collection Management**


| Issue                                                     | Title                                        |
| --------------------------------------------------------- | -------------------------------------------- |
| [#10](https://github.com/pwluedke/session-zero/issues/10) | Expansion tracker                            |
| [#11](https://github.com/pwluedke/session-zero/issues/11) | Wishlist                                     |
| [#12](https://github.com/pwluedke/session-zero/issues/12) | Loan tracker                                 |
| [#16](https://github.com/pwluedke/session-zero/issues/16) | BGG multi-list support                       |
| [#55](https://github.com/pwluedke/session-zero/issues/55) | BGG two-way sync                             |
| [#85](https://github.com/pwluedke/session-zero/issues/85) | Source tagging: show game origin badge in UI |
| [#86](https://github.com/pwluedke/session-zero/issues/86) | BGG lookup when adding a game manually       |
| [#98](https://github.com/pwluedke/session-zero/issues/98) | Add BGG link badge to suggested game cards   |


**#21 Infrastructure & Quality**


| Issue                                                     | Title                                                 |
| --------------------------------------------------------- | ----------------------------------------------------- |
| [#32](https://github.com/pwluedke/session-zero/issues/32) | Migrate Player Vault to persistent backend database   |
| [#33](https://github.com/pwluedke/session-zero/issues/33) | Create site mascot art (lineart dragon playing cards) |
| [#63](https://github.com/pwluedke/session-zero/issues/63) | Upload Playwright report as artifact on failure       |
| [#87](https://github.com/pwluedke/session-zero/issues/87) | Reset play data                                       |
| [#88](https://github.com/pwluedke/session-zero/issues/88) | Reset everything                                      |


---

## License

Personal/portfolio project. Not licensed for redistribution.