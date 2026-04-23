# Testing Standards

## Testing strategy by issue type

### Feature or Enhancement
Acceptance-Driven Development.
- Acceptance criteria in the GitHub Issue define what must be true
- Gloom implements the feature and writes tests in the same PR
- Tests verify the acceptance criteria are met -- not implementation details
- Tests are never written after the PR is merged

### Bug fix
Regression-first. Always.
- Write a failing test that reproduces the bug before touching any code
- Fix the bug until the test passes
- The test stays in the suite permanently as a regression guard
- A bug fix PR without a regression test is incomplete

### Refactor
Characterization-first.
- Run the full test suite and record passing state before touching any code
- If the behavior being refactored is not covered by existing tests, write characterization tests first -- tests that describe what the code currently does
- Refactor the code
- Full suite must pass with no test changes -- if a test fails, the refactor changed behavior unintentionally
- No new behavior = no new tests needed beyond characterization

## Labels and what they mean

| Label | Meaning | Testing approach |
|---|---|---|
| `feature` | Net new functionality | Acceptance-Driven |
| `enhancement` | Improvement to existing feature | Acceptance-Driven |
| `bug` | Fixing broken behavior | Regression-first |
| `refactor` | Implementation change, no behavior change | Characterization-first |

## The key question before any piece of work
"Am I adding new behavior or preserving existing behavior?"
- Adding new behavior = Acceptance-Driven
- Preserving existing behavior = Characterization-first
- Fixing broken behavior = Regression-first

## General testing rules
- All tests use Page Object Model -- no raw selectors in test files
- External APIs mocked with `page.route()` -- never hit live APIs in tests
- Every test is fully isolated -- `beforeEach` clears all state
- Test names describe behavior, not implementation
  - Good: "adding a player persists after reload"
  - Bad: "POST /api/players works"
- The Why? button (/api/why) is never tested with Playwright -- it hits a paid API
- NODE_ENV=test bypasses auth and AI calls entirely -- intentional
