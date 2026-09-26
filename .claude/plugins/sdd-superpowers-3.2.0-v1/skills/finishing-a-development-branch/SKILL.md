---
name: finishing-a-development-branch
description: Use when implementation is complete, all tests pass, and a decision is needed on how to integrate the work
model: sonnet
effort: high
---

# Finishing a Development Branch

## Overview

<examples>
<example>
<context>All tasks in tasks.md are checked off but the test suite has two failing tests.</context>
<correct>Halt. Fix the failing tests before presenting integration options — a branch with failing tests is not complete.</correct>
<incorrect>Present the integration options anyway and let the user decide — failing tests are a blocker, not a trade-off.</incorrect>
</example>
</examples>

Verify tests, prepare a merge commit message, and present integration options: merge locally, create PR, or keep. Discard happens only on explicit request.

**Core principle:** Verify tests → Prepare message → Present options → Execute choice → Clean up.

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

## When to Use

- After `sdd-superpowers:sdd-review` reports SPEC-ALIGNED and all tasks are complete
- All tests passing on the feature branch
- Choosing between merge / PR / keep
- **NOT** before tests pass — fix failures first
- **NOT** before `sdd-superpowers:sdd-review` in the SDD workflow

## Quick Reference

| Step | Action |
|------|--------|
| 1 | Verify tests pass (`npm test` / `pytest` / etc.) |
| 2 | Determine base branch |
| 2.5 | Invoke `sdd-superpowers:using-git` — Merge Commit Message |
| 3 | Present exactly 3 options |
| 4 | Execute chosen option |
| 5 | Cleanup worktree (only if one was used) |
| 6 | Invoke `sdd-superpowers:session-wrap` quick mode |

**The options (present verbatim):**

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)

Which option?
```

**After the chosen option and any cleanup complete, invoke `sdd-superpowers:session-wrap` quick mode to capture session learnings before closing.**

**Discarding the work happens only in response to an explicit request** to throw it away — it is never a standing menu item. See [reference.md](reference.md) for the discard flow and its typed-confirmation requirement.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Proceeding with failing tests | Always verify tests before offering options |
| Open-ended question instead of the 3 options | Present exactly the 3 options above, verbatim |
| Cleaning up worktree for Option 2 or 3 | Only clean up for Option 1 (and confirmed discards), and only if a worktree was used |
| Offering to discard because the feature "seems done" | The menu is complete as written; discard happens only when your human partner asks for it in so many words |
| Deleting work without confirmation | Require typed "discard" for the discard flow |
| Force-pushing without explicit request | Never force push unless user explicitly asked |
| `git worktree remove --force` on refusal | The refusal means untracked files exist only there — show your human partner and ask, never force |

**REQUIRED READING before proceeding:** [reference.md](reference.md) — per-option commands and worktree cleanup detail.

## Constraints

- Does NOT present integration options while tests are failing
- Does NOT claim merge-ready without running the full test suite

## Error Handling

- **Tests are failing**: Halt. Fix failing tests before choosing an integration option.
- **No test suite exists**: Document what was manually verified before presenting options.
- **User requests gate bypass**: Tests must pass before integration. Explain that merging failing tests breaks main; offer to fix failures first.
