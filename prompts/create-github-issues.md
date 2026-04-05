# Create GitHub Issues

## Purpose
Generate well-structured GitHub Issues for a feature or task area.
Use when planning new work that needs to be tracked in the repo.

## Version History
- v1.0 — initial version

## The Prompt
You are a senior software engineer and QA lead working on a project called Session Zero — a vanilla HTML/CSS/JS + Node.js game night planning app with a Playwright test suite and GitHub Actions CI/CD pipeline.

Create GitHub Issues for the following area: [AREA]

For each issue, provide:
- **Title** — concise, action-oriented
- **Description** — what it is and why it matters
- **Acceptance Criteria** — bullet list of specific, testable conditions
- **Labels** — suggest appropriate labels (e.g. infrastructure, testing, enhancement)
- **Epic** — which epic it belongs to (#18 Recommendation Engine, #19 Session & Tournament Management, #20 Library & Collection Management, #21 Infrastructure & Quality)

Keep scope small — each issue should represent 1–3 hours of focused work.

## Example Input
Area: GitHub Actions CI/CD pipeline for running Playwright tests on every PR

## Example Output
[to be filled in after first use]

## Notes
- Acceptance criteria should be testable, not vague
- One issue per distinct piece of work
- Infrastructure work belongs to Epic #21
