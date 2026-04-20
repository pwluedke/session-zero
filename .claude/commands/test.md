# /test
Switch to the branch for a given PR number and start the server for manual testing.

Usage: /test #[PR number]

Steps:
1. Run: gh pr view [PR number] --json headRefName --jq '.headRefName' to get the branch name
2. Run: git checkout [branch name]
3. Kill any existing process on port 3000: kill -9 $(lsof -t -i:3000) 2>/dev/null
4. Run: node server.js

After starting, confirm which branch is active and the server URL.
