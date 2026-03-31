# Session Zero: A Game Night Planner
### *So many games, so little night.*

A personal web application for planning game nights with family and friends. Filter your library by players, playtime, complexity, setup time, and more — then get an AI-powered explanation of why each suggestion fits your group tonight.

Built as a portfolio project to demonstrate full-stack development, AI integration, and engineering workflow practices.

---

## Features

- Filter games by players, playtime, complexity, type, age, setup time, rating, and co-op mode
- Fuzzy/strict search toggle with match scoring *(planned)*
- "Why?" button — Claude AI explains why a game fits tonight's group
- "Surprise Me" — random pick from your full library
- Music player — Spotify embed matched to the selected game's theme *(in progress)*
- Player registration and tournament bracketing *(planned)*
- BoardGameGeek collection sync *(planned)*
- Play history, player stats, and head-to-head records *(planned)*

---

## Application Pages & States

### Pages

| Name | Description |
|---|---|
| **Home** | Main page. Roll Call, Games in Progress, filters, and game results. |

### Modal States

| Name | Trigger | Description |
|---|---|---|
| **Player Vault** | "Player Vault" button | Permanent player registry. Add, remove, and set avatars. |
| **Session Dashboard** | "Let's Play!" on a game card | Active session. Panels: Playing, Score Tracker, Timer, Music. |
| **Session Feedback** | "End Game" in Score Tracker | Post-game form: star rating, Play Again, and notes. |

### Home Sections

| Name | Condition | Description |
|---|---|---|
| **Roll Call** | Always visible | Toggle vault players in/out for tonight's session. |
| **Games in Progress** | Paused sessions exist | Cards for paused sessions with a Resume Session button. |

### Key Actions

| Action | Context | What it does |
|---|---|---|
| **Let's Play!** | Expanded game card | Opens Session Dashboard |
| **Pause** | Session Dashboard header | Saves session state, returns to Home. Card appears in Games in Progress. |
| **Resume Session** | Games in Progress | Restores Session Dashboard to its exact prior state |
| **End Game** | Score Tracker panel | Validates scores, stops timer, opens Session Feedback |
| **← Back** | Session Feedback | Returns to Session Dashboard with all state intact |
| **Finalize Session** | Session Feedback | Saves all results and feedback to history, closes modal, returns to Home |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Backend | Node.js (built-in `http` module, no framework) |
| AI | Anthropic Claude API (`claude-opus-4-6`) |
| Music | Spotify Web API + Spotify Embed Player |
| Data | Local JSON (migrating to BoardGameGeek API) |
| Testing | Jest (unit), Playwright (end-to-end) *(planned)* |
| CI/CD | GitHub Actions *(planned)* |
| Version Control | Git + GitHub |

---

## Local Setup

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
```

Start the server:

```bash
node server.js
```

Open [http://localhost:3000](http://localhost:3000).

---

## Development Workflow

This project follows a structured Git-based workflow, documented here for transparency and reproducibility.

### 1. Pick an Issue
- All features, bugs, and tasks are tracked as **GitHub Issues**
- Issues are organized on a **GitHub Projects** kanban board
- When starting work, assign the issue to yourself and move it to *In Progress*

### 2. Create a Feature Branch
- Never commit directly to `main`
- Branch names follow the pattern `feature/short-description` or `fix/short-description`

```bash
git checkout -b feature/music-player
```

### 3. Write the Code
- Development happens in **Cursor** with **Claude Code** assistance
- Changes are kept focused — one feature or fix per branch
- Code is reviewed for security, simplicity, and correctness before committing

### 4. Write Tests
- **Jest** for unit tests — filter logic, data transformations, API helpers
- **Playwright** for end-to-end tests — full browser automation against the running app
- Tests are written alongside the feature, not after

### 5. Commit
- Small, focused commits with descriptive messages
- Commit messages explain *why*, not just *what*

```bash
git add <specific files>
git commit -m "Add Spotify playlist embed to game cards"
```

### 6. Open a Pull Request
- PRs are created via the **GitHub CLI** (`gh pr create`) or GitHub web
- Every PR references its issue with `Closes #<issue-number>`
- PR description includes a summary of changes and a testing checklist

### 7. Review and Merge
- Diff is reviewed before merging — even on a solo project
- GitHub Actions runs the test suite automatically on every PR *(once configured)*
- Merges into `main` only after review passes

### 8. Issue Closes Automatically
- GitHub detects the `Closes #n` in the merged PR and closes the linked issue
- The feature branch is deleted after merge

---

## Project Board

All planned and in-progress work is tracked at:
[github.com/pwluedke/session-zero/issues](https://github.com/pwluedke/session-zero/issues)

### Epics

| # | Epic |
|---|---|
| #18 | Recommendation Engine |
| #19 | Session & Tournament Management |
| #20 | Library & Collection Management |
| #21 | Infrastructure & Quality |

### Current Backlog

| # | Feature |
|---|---|
| #1 | Music player for selected game (Spotify) |
| #2 | Player registration & tournament bracketing |
| #3 | Play history log |
| #4 | Player stats |
| #5 | Head-to-head records |
| #6 | Smart recommendations based on ratings |
| #7 | Player mood / vibe filter |
| #8 | Avoid repeats filter |
| #9 | Game night planner |
| #10 | Expansion tracker |
| #11 | Wishlist |
| #12 | Loan tracker |
| #13 | Fuzzy search with match score |
| #14 | Unit and end-to-end tests |
| #15 | BGG collection sync |
| #16 | BGG multi-list support |
| #17 | Player profiles and per-player game feedback |
| #22 | Session modal — "Let's Play" UI shell |
| #23 | Session panel — timer |
| #24 | Session panel — live score tracker |
| #25 | Session panel — seating chart & arrangement randomizer |
| #26 | Session panel — wheel of names |
| #27 | Session panel — virtual dice roller |
| #28 | Session panel — photo upload |
| #29 | Session panel — notes and house rules |
| #30 | Session panel — rules reference and BGG link |

---

## License

Personal/portfolio project. Not licensed for redistribution.
