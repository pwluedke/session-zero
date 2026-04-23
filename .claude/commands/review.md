# /review
Review the open PR in two explicit passes before recommending merge.

## Pass 1 -- Spec compliance
Does this PR deliver exactly what was asked?
- Read the linked GitHub Issue acceptance criteria line by line
- Confirm every AC item is implemented and testable
- Flag any AC item that is missing, partially implemented, or interpreted differently than specified
- Check that the PR description references the issue with "Closes #n"
- Do not proceed to Pass 2 if any AC item is unmet -- report the gaps first

## Pass 2 -- Code quality
Is the code well built and consistent with the project?
- Surgical changes only -- every changed line traces to the issue. Flag any drive-by refactoring or unrelated changes.
- No em dashes anywhere in any file
- No new localStorage writes for data that belongs in Postgres
- External APIs mocked in tests -- no live API calls
- Page Object Model used in all test files -- no raw selectors
- Demo mode unaffected -- isDemoMode() guards in place where needed
- No dead code, unused imports, or variables left behind
- Matches existing code style and conventions

## After both passes
State one of:
- APPROVED -- both passes clean, ready to merge
- CHANGES REQUESTED -- list specific items by pass, block merge until resolved
- QUESTION -- something needs clarification before a verdict

Never approve a PR that fails Pass 1. A well-written PR that doesn't meet the spec is not done.
