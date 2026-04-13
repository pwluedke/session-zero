# /project:review
Review the current open PR against the acceptance criteria in its linked issue.
Check for:
- All acceptance criteria met
- Tests follow Page Object Model -- no raw selectors
- No live API calls in tests -- all external APIs mocked with page.route()
- PR description includes Closes #[issue number]
- No em dashes in any file
Report what passes, what fails, and what is missing.

At the end of every review, append this checklist with each item marked checked or unchecked based on your findings:

## Merge readiness checklist
- [ ] All acceptance criteria met
- [ ] All tests pass in CI
- [ ] No raw selectors in test files
- [ ] No live API calls in tests
- [ ] PR description includes Closes #[issue number]
- [ ] No em dashes in any file
- [ ] Reviewed and approved by Paul
- [ ] Feature branch will be deleted after merge
