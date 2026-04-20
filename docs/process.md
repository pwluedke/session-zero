The process.md is also pretty out of date beyond just the database section. Here's the full updated version with the database setup section added and everything else corrected:


Replace the entire contents of docs/process.md with the following:

markdown# Session Zero — Engineering Process

## Overview

A solo full-stack project managed as a professional engineering product. Every decision — from feature prioritization to deployment — follows the same process a senior engineering team would use.

---

## The Tools

| Role | Tool |
|---|---|
| Strategic planning | Claude.ai (Elara) |
| Implementation | Cursor + Claude Code (Gloom) |
| Issue tracking | GitHub Issues |
| Project management | GitHub Projects kanban |
| Version control | Git + GitHub |
| Testing | Playwright (E2E) + Jest (unit) |
| CI/CD | GitHub Actions |
| Hosting | Railway |
| Database | PostgreSQL (Railway) |
| Database GUI | TablePlus |
| AI features | Anthropic Claude API |

---

## Local Development Environment

### Prerequisites
- Node.js and npm
- PostgreSQL (local instance for development)
- TablePlus (database GUI)

### Install local Postgres
```bash
brew install postgresql@16
brew services start postgresql@16
createdb session_zero_dev
```

### Managing the local database

Start Postgres:
```bash
brew services start postgresql@16
```

Stop Postgres:
```bash
brew services stop postgresql@16
```

Check status:
```bash
brew services list
```

Postgres starts automatically on login by default after the initial `brew services start`. If it doesn't start after a Mac restart, run `brew services start postgresql@16` again.

### Configure .env
Create a `.env` file in the project root. For local development, point `DATABASE_URL` at your local instance:

```
ANTHROPIC_API_KEY=your_anthropic_api_key
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET=any_random_string
DATABASE_URL=postgresql://localhost/session_zero_dev
APP_URL=http://localhost:3000
```

### Start the server
```bash
node server.js
```

The `migrate()` function runs on every startup and creates all tables automatically if they don't exist.

### Database connections (TablePlus)

Two saved connections:

**session-zero-local** (for development)
| Field | Value |
|---|---|
| Host | 127.0.0.1 |
| Port | 5432 |
| User | your Mac username |
| Password | empty |
| Database | session_zero_dev |
| SSL | DISABLE |

**session-zero-railway** (production -- handle with care)
| Field | Value |
|---|---|
| Host | metro.proxy.rlwy.net |
| Port | 33843 |
| User | postgres |
| Password | (from Railway dashboard) |
| Database | railway |
| SSL | PREFERRED |

**Critical rule:** Never point `DATABASE_URL` at Railway credentials when running locally. The Railway database is production. Your family's real data lives there. Local development always uses the local Postgres instance.

### Seed the local database

Populate the local database with test users and data for manual testing:

```bash
node scripts/seed-dev.js
```

Never run this against production -- the script exits if `DATABASE_URL` contains `railway`.

### Running tests locally
Never start `node server.js` before running Playwright tests. Playwright manages its own server with `NODE_ENV=test` via the `webServer` config. Running both simultaneously causes auth to bypass incorrectly and all tests fail on the login page.

```bash
# Correct -- let Playwright manage the server
npx playwright test

# Check if port 3000 is already in use before testing
lsof -i :3000

# Kill an existing server if needed
kill -9 $(lsof -t -i:3000)
```

---

## The Process — Step by Step

### 1. Identify the Work

- New features, bugs, and infrastructure tasks start as a conversation with Elara
- We evaluate priority against the interview narrative and product value
- Work is scoped to small, achievable chunks

### 2. Start Every Session

```bash
/reflect
```

Reads `docs/diary.md` and outputs a session startup briefing. Run this at the start of every Gloom session to re-orient.

### 3. Generate GitHub Issues

- Use `/issue [description]` in Gloom -- uses the prompt in `/prompts/create-github-issues.md`
- Gloom generates structured issues with acceptance criteria and labels
- Elara reviews output -- checking for gaps, scope, and sequencing
- Issues created in GitHub and assigned to the correct Epic

### 4. Plan Before Implementing

```bash
/plan #[issue]
```

Gloom generates an implementation plan. No code is written until the plan is reviewed and approved by Paul (and Elara for architectural decisions). Never skip the plan step.

### 5. Branch

- Never commit directly to main
- Branch name follows `feature/` or `fix/` convention
- One branch per issue

### 6. Implement

```bash
/implement #[issue]
```

- Gloom executes the work in Cursor
- TDD loop: failing tests written first, then implementation until green
- Scope stays focused -- one feature or fix per branch

### 7. Review

```bash
/review
```

Gloom reviews the open PR against acceptance criteria, POM patterns, and quality gates before Paul opens it for merge.

### 8. Pull Request

- PR opened via GitHub CLI or web
- References issue with `Closes #n`
- Description includes summary of changes and testing checklist
- Elara reviews the PR before merge when architecture decisions are involved

### 9. CI Runs Automatically

- GitHub Actions runs full Playwright suite on every PR
- Branch protection blocks merge if tests fail
- On failure: HTML report uploaded as artifact, Claude AI analyzes the failure and outputs root cause analysis to CI logs

### 10. Merge

- Paul reviews and approves -- human holds the final gate
- Merge only after CI passes
- Feature branch deleted after merge
- Issue closes automatically via `Closes #n`

### 11. Deploy

- Merge to `main` triggers auto-deploy to Railway
- Live app updated at somanygames.app within minutes of merge

### 12. End Every Session

```bash
/diary
```

Appends a session log entry to `docs/diary.md`. Captures what was completed, decisions made, what's in progress, and what's next.

---

## The AI Layer

This is what makes the process distinctive.

### Two-AI Workflow

| Agent | Tool | Role |
|---|---|---|
| Elara | Claude.ai desktop | Strategy, planning, architecture, review, interview prep |
| Gloom | Claude Code in Cursor | Implementation, testing, PRs |

All implementation work starts with a plan reviewed by Elara before Gloom executes. Elara never writes code. Gloom never makes architectural decisions without approval.

### Claude Code Governance (`.claude/`)

```
.claude/
├── commands/       -- slash commands available in every session
│   ├── plan.md
│   ├── implement.md
│   ├── issue.md
│   ├── review.md
│   ├── diary.md
│   ├── reflect.md
│   └── start.md
└── rules/
    └── testing.md  -- codified QA standards, auto-enforced
```

`CLAUDE.md` in the repo root gives Gloom full project context at session start -- architecture, migration state, conventions, and behavioral principles derived from Andrej Karpathy's observations on LLM coding pitfalls.

### Prompt Library (`/prompts/`)

Every repeatable AI interaction is documented as a versioned prompt:

| Prompt | Purpose | Status |
|---|---|---|
| `create-github-issues.md` | Generate structured GitHub Issues from a feature description | Complete |
| `failure-analysis.md` | Analyze CI failures and suggest root cause and fix | Complete |
| `test-generation.md` | Generate Playwright test cases from user stories | Planned |
| `release-notes.md` | Generate release summaries from commits | Planned |
| `game-recommendation.md` | Document the "Why?" prompt with iteration history | Planned |

### AI in CI

When Playwright tests fail in GitHub Actions:
1. Failure output is filtered and piped to Claude via `scripts/analyze-failure.js`
2. Claude returns a structured report: what failed, probable root cause, affected file, suggested fix
3. Report printed to CI logs and uploaded as a downloadable artifact

---

## What This Demonstrates

| Skill | Evidence |
|---|---|
| Engineering ownership | Conceived, built, and shipped a full-stack app used by real people |
| Project management | GitHub Issues, epics, kanban, structured backlog |
| Quality management | Playwright + Jest suite, POM architecture, CI enforcement |
| Release management | GitHub Actions, branch protection, Railway auto-deploy |
| AI integration | Claude API in product, prompt library, AI failure analysis in CI |
| Prompt engineering | Versioned prompts, documented outputs, iterative improvement |
| Engineering leadership | Two-AI workflow, governance layer, standards that scale to a team |
| Full-stack architecture | OAuth, Postgres, Express, vanilla JS, responsive design |
| Database management | Postgres schema design, migrations, localStorage to DB migration |
| Security | RBAC, user approval gate, rate limiting, feature flags |

---

*Last updated: April 2026*
*This is a living document -- updated as the process evolves.*