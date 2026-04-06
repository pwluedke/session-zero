# Testing Standards - Session Zero

## Philosophy
Tests validate behavior, not implementation. A passing test suite means the app works for users, not that the code looks correct. When in doubt, test what a user would do, not how the code does it.

AI augments testing - it does not replace human judgment. Generated tests are reviewed before merging. CI enforces the standard automatically. The human holds the final gate.

## Required Approach

### Page Object Model
- Every modal and page area has its own Page Object class in tests/pages/
- Test files interact with the app exclusively through Page Object methods
- Raw selectors (page.locator, page.getByText, etc.) never appear directly in test files
- If a selector needs to change, it changes in one place - the Page Object

### Test Isolation
- Every test starts with a clean state - localStorage cleared, page reloaded
- Tests never depend on execution order
- Tests never share state between them
- The beforeEach in app.spec.js handles this - do not remove it

### External API Mocking
- Never hit live APIs in tests (Anthropic, Spotify, BGG)
- Use Playwright's page.route() to intercept and mock API calls
- Test your own code - not third-party services
- Flaky tests from third-party downtime are worse than no tests

### TDD Loop for New Features
- Write the failing test first
- Hand it to Gloom to implement until green
- Tests are the spec - implementation follows the test, not the other way around

## Test Coverage Expectations

### Every new feature must include tests for:
- Happy path - the expected user flow works correctly
- Empty/zero state - what happens when there is no data
- Error state - what happens when something goes wrong
- Edge cases - boundary conditions relevant to the feature

### UI components must test:
- Element visibility and presence
- User interactions (click, type, toggle)
- State changes after interaction
- Persistence where applicable (localStorage round-trip)

### API integrations must test:
- Successful response - UI updates correctly
- Failed response - error state is handled gracefully
- Loading state - UI communicates that something is happening

## What Good Tests Look Like

Good test: validates a user behavior through a Page Object, is isolated, has a clear name that describes what it proves.

Bad test: uses raw selectors, depends on another test's state, tests implementation details rather than behavior, has a vague name like "settings works".

## Naming Conventions
- Test names describe the behavior being proven, not the code being called
- Format: "[action or condition] [expected result]"
- Examples:
  - "adding a player to the vault persists across reload"
  - "filtering by player count narrows results correctly"
  - "ending a session saves results to play history"

## PR Quality Gate
A PR is not ready to merge if:
- Any existing test fails
- New feature has no tests
- Tests use raw selectors instead of Page Objects
- Tests hit live external APIs
- Test names are vague or describe implementation rather than behavior
