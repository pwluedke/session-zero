# Session Zero — Engineering Process

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
| Testing | Playwright + Page Object Model |
| CI/CD | GitHub Actions |
| Hosting | Railway *(in progress)* |
| AI features | Anthropic Claude API |

---

## The Process — Step by Step

### 1. Identify the Work

- New features, bugs, and infrastructure tasks start as a conversation with Elara
- We evaluate priority against the interview narrative and product value
- Work is scoped to small, achievable chunks

### 2. Generate GitHub Issues

- Use the prompt in `/prompts/create-github-issues.md`
- Gloom generates structured issues with acceptance criteria and labels
- Elara reviews output — checking for gaps, scope, and sequencing
- Issues created in GitHub and assigned to the correct Epic

### 3. Branch

- Never commit directly to main
- Branch name follows `feature/` or `fix/` convention
- One branch per issue

### 4. Implement

- Gloom executes the work in Cursor
- Implementation follows the acceptance criteria in the issue exactly
- Scope stays focused — one feature or fix per branch

### 5. Test

- Playwright tests written alongside the feature, not after
- Tests use Page Object Model — no raw selectors in test files
- All existing tests must still pass before opening a PR

### 6. Commit

- Small, focused commits
- Messages explain why, not just what

### 7. Pull Request

- PR opened via GitHub CLI or web
- References issue with `Closes #n`
- Description includes summary of changes and testing checklist
- Elara reviews the PR before merge when architecture decisions are involved

### 8. CI Runs Automatically

- GitHub Actions runs full Playwright suite on every PR
- Branch protection blocks merge if tests fail
- HTML report uploads on failure for debugging

### 9. Merge

- Merge only after CI passes
- Feature branch deleted after merge
- Issue closes automatically via `Closes #n`

### 10. Deploy

- Merge to `main` triggers auto-deploy to Railway *(in progress)*
- Environment variables managed via Railway dashboard
- Live app updated within minutes of merge

---

## The AI Layer

This is what makes the process distinctive.

### Prompt Library (`/prompts/`)

Every repeatable AI interaction is documented as a versioned prompt with:

- Purpose and usage instructions
- The prompt itself
- Example input and output
- Changelog showing iterations and lessons learned

### Current Prompts

| Prompt | Purpose |
|---|---|
| `create-github-issues.md` | Generate structured GitHub Issues from a feature area |
| `test-generation.md` | *(coming)* Generate Playwright test cases from user stories |
| `failure-analysis.md` | *(coming)* Analyze CI failures and suggest root causes |
| `release-notes.md` | *(coming)* Generate release summaries from commits |
| `game-recommendation.md` | *(coming)* Document the "Why?" feature prompt and iterations |

### AI in CI *(coming)*

- Failed Playwright runs pipe output to Claude API
- Root cause analysis saved as markdown report
- Release notes generated from merged PRs automatically

---

## What This Demonstrates

| Skill | Evidence |
|---|---|
| Engineering ownership | Conceived, built, and shipped a full-stack app |
| Project management | GitHub Issues, epics, kanban, structured backlog |
| Quality management | Playwright suite, POM architecture, CI enforcement |
| Release management | GitHub Actions, branch protection, auto-deploy |
| AI integration | Claude API in product, prompt library, AI QA layer |
| Prompt engineering | Versioned prompts, documented outputs, iterative improvement |
| Engineering leadership | Directing AI effectively to execute a technical vision |

---

*Last updated: April 2026*
*This is a living document — updated as the process evolves.*
