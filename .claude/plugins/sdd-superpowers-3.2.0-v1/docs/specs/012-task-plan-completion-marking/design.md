# Design: Task and Plan Completion Marking

**Feature slug:** 012-task-plan-completion-marking
**Status:** Approved for spec
**Created:** 2026-05-30

---

## Problem

Two related gaps in the current SDD hook and workflow infrastructure:

### Gap 1: Completion state not tracked in artifacts

After `sdd-execute` finishes a task (or all tasks), `tasks.md` and `plan.md` are not updated to reflect completion. There is no step that marks `[ ]` → `[x]` in `tasks.md` per task, and no step that marks `[DONE]` on plan phase headings when all tasks in that phase complete. The artifacts drift out of sync with reality.

Failure modes:
1. **Mid-execution drift** — `tasks.md` still shows `[ ]` on a task that was implemented and reviewed; next session re-derives context incorrectly
2. **End-of-execution gap** — all tasks done, but `plan.md` phases still show no completion signal; session end context is ambiguous

### Gap 2: `stop.sh` hook outputs invalid JSON schema

The existing `stop.sh` hook produces a JSON validation error at session end:

```
Stop hook error: Hook JSON output validation failed — (root): Invalid input
```

Root cause: `stop.sh` outputs `hookSpecificOutput.hookEventName: "Stop"` but the Claude Code hook schema has **no `hookSpecificOutput` entry for the Stop event**. The Stop hook must use top-level fields only. The correct field for injecting session-end context is `systemMessage`.

Incorrect (current):
```json
{
  "hookSpecificOutput": {
    "hookEventName": "Stop",
    "additionalContext": "..."
  }
}
```

Correct:
```json
{
  "systemMessage": "..."
}
```

---

## Goals

- Mark each task `[x]` in `tasks.md` immediately after its subagent returns DONE
- Detect when all tasks are complete and automatically nudge Claude to mark `plan.md` phase headings with `[DONE]` inline
- Keep the completion hook silent during partial execution (no noise mid-flow)
- Reuse the existing PostToolUse hook pattern established by `post-write-memory-validate.sh`
- Fix `stop.sh` to use `systemMessage` at the top level instead of the invalid `hookSpecificOutput` structure

---

## Non-Goals

- Automatically modifying `plan.md` from a bash script (requires Claude intelligence to map tasks → phases)
- Marking tasks complete from outside `sdd-execute` (e.g. manual edits, other skills)
- Tracking completion at sub-task granularity within a single task

---

## Design

### Layer 1 — `sdd-execute` skill instruction (the actor)

Add an explicit step to the per-task loop in `sdd-execute/SKILL.md` and `sdd-execute/reference.md`:

> After each subagent returns `DONE` or `DONE_WITH_CONCERNS`:
> Edit `tasks.md` — flip the corresponding `[ ]` to `[x]` before proceeding to spec-compliance review.

This is intelligent: Claude knows which task just completed.

### Layer 2 — `post-write-tasks-check.sh` hook (the enforcer)

New PostToolUse hook that fires after every Write/Edit targeting `tasks.md`.

**Behaviour:**

| Condition | Output |
|-----------|--------|
| File path does not match `*/tasks.md` | Silent exit 0 |
| Not in an SDD project (`docs/specs/` absent) | Silent exit 0 |
| At least one `[ ]` remains | Silent exit 0 |
| All tasks are `[x]` (zero `[ ]` remaining) | Inject `additionalContext` reminder |

**Injected context when all tasks done:**

```
All tasks in tasks.md are complete.

Next steps:
1. Add [DONE] inline to each completed phase heading in plan.md
   Example: "## Phase 1: Foundation" → "## Phase 1: Foundation [DONE]"
2. Invoke sdd-review Mode B to validate spec-implementation alignment.
```

### plan.md heading convention

When Claude marks phases done, it appends ` [DONE]` to the markdown heading:

```markdown
## Phase 1: Foundation [DONE]

## Phase 2: Core Logic [DONE]

## Phase 3: Integration
```

No new sections added. No structural changes to `plan.md`. Pure inline append.

---

## Files Changed

| File | Change |
|------|--------|
| `skills/sdd-execute/SKILL.md` | Add per-task step: mark `[x]` after DONE |
| `skills/sdd-execute/reference.md` | Add same step to the full procedure |
| `scripts/hooks/post-write-tasks-check.sh` | New hook script |
| `scripts/hooks/stop.sh` | Fix JSON output — replace `hookSpecificOutput` with top-level `systemMessage` |
| `.claude/settings.json` | Register new hook under PostToolUse |
| `tests/hooks/test_post_write_tasks_check.sh` | New test file |
| `tests/hooks/test_stop.sh` | Add test for correct `systemMessage` output format |

---

## Hook Registration (`.claude/settings.json` pattern)

```json
{
  "event": "PostToolUse",
  "matcher": { "tool_name": ["Write", "Edit"] },
  "command": "scripts/hooks/post-write-tasks-check.sh"
}
```

---

## Test Scenarios

### post-write-tasks-check.sh
1. **Partial completion** — tasks.md has mixed `[ ]` / `[x]` → hook is silent
2. **All complete** — tasks.md has only `[x]` → hook injects `additionalContext` reminder
3. **Empty tasks.md** — no task lines → hook is silent
4. **Non-SDD project** — no `docs/specs/` → hook is silent
5. **Wrong file** — Write to a file that is not `tasks.md` → hook is silent

### stop.sh (fix)
6. **Writes occurred** — output JSON contains top-level `systemMessage`, no `hookSpecificOutput` key
7. **No writes** — silent exit 0, no JSON output
