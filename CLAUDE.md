# Session Zero - CLAUDE.md

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

## Conventions
- Branch names: feature/short-description or fix/short-description
- Never commit directly to main
- One issue per branch, one feature per PR
- PR descriptions always include Closes #n referencing the issue
- Commit messages explain why, not just what
- Test files use Page Object Model - no raw selectors in test files
- External APIs are mocked in tests using page.route() - never hit live APIs in tests
- Never use em dashes in any file. Use commas, semicolons, colons, regular dashes, or parentheses instead.

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
