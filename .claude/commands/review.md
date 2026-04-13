# /project:review
Review the current open PR against the acceptance criteria in its linked issue.
Check for:
- All acceptance criteria met
- Tests follow Page Object Model -- no raw selectors
- No live API calls in tests -- all external APIs mocked with page.route()
- PR description includes Closes #[issue number]
- No em dashes in any file
Report what passes, what fails, and what is missing.
