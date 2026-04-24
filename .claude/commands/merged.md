# /merged
Post-merge local sync. Run after a PR merges on GitHub.

Usage: `/merged <PR number>`

## Step 1 -- Verify the PR is merged
Run:
```bash
gh pr view $ARGUMENTS --json state,mergedAt,headRefName
```
If `state` is not `MERGED`, stop and report. Do not proceed.

Capture `headRefName` -- this is the feature branch to delete.

## Step 2 -- Sync main
Run:
```bash
git checkout main
git pull
```

## Step 3 -- Delete the local feature branch
Run:
```bash
git branch -d <headRefName>
```
If the delete fails for any reason, stop and report the error. Do not use `-D` (force delete) without explicit user confirmation.

## Step 4 -- Confirm clean state
Run:
```bash
git status
```
Confirm the working tree is clean.

## Step 5 -- Report
Output a single summary:
- PR number merged
- Branch deleted
- main is now at `<short SHA>` (via `git rev-parse --short HEAD`)
