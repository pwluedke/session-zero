# Session Zero - Project Diary

A running log of work sessions. Updated at the end of every session using /diary.
Read at the start of every session using /reflect.

---

## 2026-04-15

### Completed
- PR #117 merged: Restructure UI navigation for desktop and responsive (#116). Added a persistent bottom nav bar (mobile) and top nav links (desktop), merged History and Stats into a single "History" nav entry, wired up Profile modal with /api/me endpoint, guarded /api/me against undefined req.user in test mode, added Playwright nav tests with a NavPage object.
- PR #119 merged: Add project diary and diary/reflect slash commands. Created docs/diary.md, added .claude/commands/diary.md and .claude/commands/reflect.md prompt files so /diary and /reflect are available as slash commands.
- PR #120 opened: Fix modal scroll and mobile nav overlap (fix/modal-nav-scroll-fixes). Three nav follow-up fixes from #116: `.modal-overlay` padding-bottom on mobile so content is not hidden behind the bottom nav bar; `history-section-panel` and `profile-panel` height/overflow overrides so they scroll rather than clip; moved `overflow-y: auto` from `.profile-body` to `.profile-panel`.

### Decisions made
- History and Stats panels were merged into a single "History" nav entry rather than keeping them as separate destinations. Simpler nav, fewer modals.
- /api/me returns `{}` instead of 401 in test mode (NODE_ENV=test) so Playwright tests can load the nav without triggering auth failures.
- Diary and reflect prompts live in .claude/commands/ (project-level) rather than ~/.claude/commands/ (user-level) so they travel with the repo.

### In progress
- PR #120 open, awaiting review. Branch: fix/modal-nav-scroll-fixes.
- docs/diary.md has an uncommitted update on fix/modal-nav-scroll-fixes (this entry). Needs to be committed or moved to main.

### Up next
- Merge or get review on PR #120.
- Pick up one of the pending migration issues: #109 (Settings), #110 (Game Library), or #111 (Play History/Active Sessions).
- Run /reflect at the start of next session to re-orient.

### Notes
- Nav tests use a NavPage page object (tests/pages/NavPage.js). If nav structure changes, update NavPage first.
- The history-section-panel and profile-panel needed height: auto overrides because the session-modal desktop rule was locking height and hiding overflow on all .modal-overlay children. Watch for this pattern if new modals clip content.
- PR descriptions reference issue numbers with "Closes #n" -- keep this pattern, it auto-closes issues on merge.

---
