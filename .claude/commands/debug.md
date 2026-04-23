# /debug
Systematic debugging using a 4-phase root cause process.

## Phase 1 -- Reproduce reliably
Before touching any code:
- Confirm the bug exists and is reproducible
- Document the exact steps to reproduce
- Identify what "fixed" looks like -- what specific behavior proves it works?
- Never skip this phase. Fixing a bug you can't reproduce is guessing.

## Phase 2 -- Isolate
Narrow down where, not why:
- Identify the smallest possible reproduction case
- Rule out environmental issues (cache, stale build, wrong branch)
- Find the exact file, function, and line range where the failure originates
- Use console.log or temporary assertions to confirm assumptions -- don't trust intuition

## Phase 3 -- Root cause
Find the actual cause, not a symptom:
- Ask "why" at least three times before writing a fix
- Distinguish between the symptom (what broke) and the cause (why it broke)
- Check git log for recent changes to the affected area
- A fix that addresses a symptom will let the real bug resurface elsewhere

## Phase 4 -- Verify the fix
Confirm the fix works AND didn't break anything else:
- Run the specific reproduction steps from Phase 1 -- confirm the bug is gone
- Run the full test suite -- confirm nothing regressed
- If the bug had no test, write a regression test before closing
- "I think it's fixed" is not verification. Run the steps.
