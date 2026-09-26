# Feature 012: Task and Plan Completion Marking

**Status:** Approved
**Created:** 2026-05-30
**Branch:** `012-task-plan-completion-marking`

---

## Problem Statement

Two gaps exist in the current SDD hook and workflow infrastructure. First, after `sdd-execute` completes a task, `tasks.md` checkboxes are not marked `[x]` and `plan.md` phase headings carry no completion signal — artifacts drift out of sync with the actual implementation state, causing the next session to re-derive context incorrectly. Second, the existing `stop.sh` hook emits invalid JSON on every session end (`Hook JSON output validation failed`) because it uses a `hookSpecificOutput` structure that the Claude Code hook schema does not define for the Stop event; the session-end reminder is silently dropped on every run.

## Goals

- Mark each task `[x]` in `tasks.md` immediately after its subagent returns DONE during `sdd-execute`
- Detect when all tasks in `tasks.md` are complete and inject an advisory reminder to add inline `[DONE]` markers to `plan.md` phase headings
- Keep the completion hook silent during partial execution — no output until all tasks are done
- Fix `stop.sh` to use the top-level `systemMessage` field so the session-end reminder is actually delivered

## Non-Goals

- Automatically modifying `plan.md` from a bash script — mapping tasks to plan phases requires Claude's understanding; the hook is advisory only
- Marking tasks complete from outside `sdd-execute` (manual edits, other skills)
- Tracking completion at sub-task granularity within a single task
- Fixing other hooks beyond `stop.sh`

## Users and Context

**Primary users:** SDD practitioners using the sdd-superpowers plugin in Claude Code who run daily `sdd-execute` workflows
**Usage context:** Every session where `sdd-execute` is running tasks; hooks activate automatically and are silent outside SDD projects or during partial task completion
**User mental model:** Hooks are invisible infrastructure. Practitioners expect `tasks.md` to reflect current reality and `plan.md` to show which phases are done, without having to remember to update these manually.

## User Stories

### Story 1: Tasks marked complete as execution progresses

**As a** SDD practitioner running `sdd-execute`
**I want** each task in `tasks.md` to be marked `[x]` immediately after its subagent returns DONE
**So that** `tasks.md` always reflects the real implementation state and the next session starts with accurate context

**Acceptance criteria:**

- [ ] **AC-1.1** Given `sdd-execute` dispatches a subagent for a task When the subagent returns `DONE` Then `tasks.md` is edited to flip that task's `[ ]` to `[x]` before spec-compliance review begins
- [ ] **AC-1.2** Given `sdd-execute` dispatches a subagent for a task When the subagent returns `DONE_WITH_CONCERNS` Then `tasks.md` is edited to flip that task's `[ ]` to `[x]` before addressing the concern
- [ ] **AC-1.3** Given `sdd-execute` dispatches a subagent for a task When the subagent returns `BLOCKED` or `NEEDS_CONTEXT` Then `tasks.md` is NOT modified — the task remains `[ ]`

### Story 2: All-tasks-done triggers plan.md completion prompt

**As a** SDD practitioner
**I want** an automatic reminder to mark completed phases in `plan.md` when all tasks are done
**So that** `plan.md` reflects final state without me needing to remember to update it manually

**Acceptance criteria:**

- [ ] **AC-2.1** Given `tasks.md` is written or edited When all task checkbox lines in the file are `[x]` (zero `[ ]` remain) Then the `post-write-tasks-check` hook injects `additionalContext` instructing Claude to add `[DONE]` inline to each completed phase heading in `plan.md` and then invoke `sdd-review` Mode B
- [ ] **AC-2.2** Given `tasks.md` is written or edited When at least one task checkbox line is still `[ ]` Then the hook exits silently with no output
- [ ] **AC-2.3** Given `tasks.md` is written or edited When the file contains no checkbox lines (`[ ]` or `[x]`) Then the hook exits silently with no output
- [ ] **AC-2.4** Given a Write or Edit call targets any file that is not named `tasks.md` When the hook fires Then the hook exits silently with no output
- [ ] **AC-2.5** Given the hook fires in a directory without a `docs/specs/` folder When the hook runs Then it exits silently with no output

### Story 3: plan.md phase headings show inline completion state

**As a** SDD practitioner reviewing completed work
**I want** each finished phase heading in `plan.md` to show `[DONE]` inline
**So that** I can scan `plan.md` and immediately understand which phases have been implemented

**Acceptance criteria:**

- [ ] **AC-3.1** Given all tasks in a plan phase are complete When Claude marks that phase done Then the phase heading in `plan.md` is updated from `## Phase N: Name` to `## Phase N: Name [DONE]` with no other structural changes to the file
- [ ] **AC-3.2** Given a phase heading already contains `[DONE]` When Claude processes completion Then the heading is not modified a second time (no `[DONE] [DONE]`)
- [ ] **AC-3.3** Given some phases are complete and some are not When Claude marks done phases Then only the headings for completed phases receive `[DONE]` — incomplete phase headings are unchanged

### Story 4: Stop hook delivers session-end reminder without errors

**As a** SDD practitioner ending a session
**I want** the session-end reminder (save memory, run verification) to be delivered without a JSON validation error
**So that** the reminder is actually surfaced and not silently dropped

**Acceptance criteria:**

- [ ] **AC-4.1** Given a `Stop` event fires When at least one `Write` or `Edit` tool call occurred during the session Then `stop.sh` outputs JSON with a top-level `systemMessage` field containing the session-end checklist — no `hookSpecificOutput` key present
- [ ] **AC-4.2** Given a `Stop` event fires When no `Write` or `Edit` tool calls occurred during the session Then `stop.sh` exits silently with code 0 and produces no output
- [ ] **AC-4.3** Given `stop.sh` runs in any session When the hook completes Then the output JSON passes Claude Code hook schema validation with no errors

## Functional Requirements

### FR-1: sdd-execute per-task completion marking

The `sdd-execute` skill must include an explicit step in the per-task loop to mark the completed task in `tasks.md`.

**Must:**
- Mark `[x]` on the specific task line immediately after the subagent returns `DONE` or `DONE_WITH_CONCERNS`
- Mark the task before proceeding to spec-compliance review
- Leave the task as `[ ]` when the subagent returns `BLOCKED` or `NEEDS_CONTEXT`

**Must not:**
- Mark a task complete speculatively before the subagent result is known
- Modify any other task lines when marking one task done

### FR-2: post-write-tasks-check hook

A new PostToolUse hook script `scripts/hooks/post-write-tasks-check.sh` must fire after every Write or Edit tool call.

**Must:**
- Exit silently (code 0, no output) when the written file path does not end in `tasks.md`
- Exit silently when the current directory is not an SDD project (no `docs/specs/` present)
- Exit silently when at least one `[ ]` checkbox remains in `tasks.md`
- Exit silently when `tasks.md` contains no checkbox lines
- Output a JSON object with `hookSpecificOutput.hookEventName: "PostToolUse"` and `hookSpecificOutput.additionalContext` containing the next-steps message when all task lines are `[x]`

**Must not:**
- Modify `tasks.md` or `plan.md` directly
- Block the Write/Edit operation (this is PostToolUse, not PreToolUse)
- Emit output for non-SDD projects

### FR-3: stop.sh JSON schema fix

The existing `scripts/hooks/stop.sh` must be updated to use valid hook output schema for the Stop event.

**Must:**
- Output `{ "systemMessage": "<checklist text>" }` when writes occurred (no `hookSpecificOutput` wrapper)
- Pass Claude Code hook JSON schema validation on every invocation
- Preserve the existing session-end checklist message content

**Must not:**
- Include `hookSpecificOutput`, `hookEventName`, or `additionalContext` keys in the output — these are not valid for the Stop event

## Non-Functional Requirements

### Reliability

- All hooks must exit silently (code 0, no output) when not in an SDD project — existing requirement from feature 011, must not regress
- `post-write-tasks-check.sh` must handle a missing or empty `tasks.md` without error

### Performance

- `post-write-tasks-check.sh` reads `tasks.md` once and exits — no recursive file scans

## Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| `tasks.md` does not exist when hook fires | Hook exits silently — grep on non-existent file returns no lines, treated as "no checkbox lines" |
| `tasks.md` has only `[x]` lines with no preceding `[ ]` (e.g. freshly all-done) | Hook injects the all-tasks-done advisory context |
| Session state file missing when `stop.sh` runs | Treat as `had_writes: false` — exit silently |
| `plan.md` has a heading already containing `[DONE]` when Claude marks phases | Claude must not append a second `[DONE]` — idempotent edit |

## Open Questions

- None — design approved.

## Out of Scope (Future Considerations)

- Automatically modifying `plan.md` phase headings from the bash hook script — requires Claude-level understanding of task-to-phase mapping
- Marking tasks complete from outside `sdd-execute` (e.g. manual edits trigger completion marking)
- Per-task hook enforcement (only write-to-tasks.md triggers the hook, not subagent result detection)
- Fixing JSON schema issues in hooks other than `stop.sh`
