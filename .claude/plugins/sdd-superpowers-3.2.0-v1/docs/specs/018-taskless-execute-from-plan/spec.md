# Feature 018: Taskless Execute — Drive Implementation Directly from Plan

**Status:** Approved
**Created:** 2026-07-04
**Branch:** `018-taskless-execute-from-plan`

---

## Problem Statement

The SDD workflow requires a dedicated `sdd-tasks` step between planning and execution. This step generates a `tasks.md` file — a flat, exhaustive, atomic task list — before any implementation begins. The list is frequently long, detailed, and expensive to produce upfront. Practitioners experience it as friction that delays the actual work without proportionate value: the plan already captures intent, scope, and structure. The task list re-states that intent at a finer level of detail that the executor and implementer subagents can derive themselves at runtime.

## Goals

- Eliminate `tasks.md` as a required artifact for the execution path
- Allow `sdd-execute` to drive implementation directly from `spec.md` + `plan.md`
- Preserve all existing TDD discipline and the two-stage review loop (spec compliance → code quality)
- Keep full backward compatibility: features with an existing `tasks.md` continue to work unchanged
- Preserve session-level progress visibility via TodoWrite

## Non-Goals

- Modifying the `plan.md` format or adding new sections to it to support execution
- Providing a migration helper for in-flight features that already have a `tasks.md`
- Changing the spec-compliance or code-quality reviewer prompts
- Changing the `test-driven-development` skill
- Adding cross-session persistence for the derived execution outline
- Removing the `sdd-tasks` skill file from the repository (it is retired from the workflow but not deleted)

## Users and Context

**Primary users:** Claude (the AI model) — reads skill prose and drives the execution loop at runtime
**Secondary users:** SDD practitioners — invoke `sdd-execute` after plan approval and observe progress
**Usage context:** Every session where a plan has been approved and implementation should begin; restart scenarios where a session died mid-execution
**User mental model:** After approving a plan, the natural next step is to start building — not to generate another document. The plan IS the execution guide.

## User Stories

### Story 1: Execute directly after plan approval

**As a** developer who has just approved a `plan.md`
**I want** to invoke `sdd-execute` and begin implementation immediately
**So that** I do not have to generate and review a `tasks.md` file before any code is written

**Acceptance criteria:**

- [ ] **AC-1.1** Given `plan.md` is approved and `tasks.md` does not exist When `sdd-execute` is invoked Then the controller reads `plan.md` and `spec.md` and derives a work-unit outline without writing any file to disk
- [ ] **AC-1.2** Given the controller has derived work units When the first implementer subagent is dispatched Then it receives the full `spec.md` content, the relevant plan section text, and an explicit TDD red-green-refactor mandate in its prompt
- [ ] **AC-1.3** Given `tasks.md` already exists for this feature When `sdd-execute` is invoked Then the controller uses `tasks.md` as-is (existing behavior) and does not enter plan-driven mode

### Story 2: Controller derives right-sized work units

**As the** `sdd-execute` controller
**I want** to derive appropriately-sized work units from `plan.md` sections
**So that** each implementer subagent receives a unit of work that fits within one TDD red-green-refactor cycle

**Acceptance criteria:**

- [ ] **AC-2.1** Given `plan.md` has N sections When the controller derives work units Then each work unit is scoped to one plan section or sub-section and is sized to be completable in a single implementer subagent dispatch
- [ ] **AC-2.2** Given two plan sections that modify different files and have no stated dependency between them When the controller analyzes the outline Then those sections are marked as parallelizable and dispatched concurrently
- [ ] **AC-2.3** Given two plan sections where the plan text states or implies an ordering constraint When the controller analyzes the outline Then those sections are marked sequential and dispatched in order
- [ ] **AC-2.4** Given a plan section whose dependency status cannot be determined from plan text or file-level disjointness When the controller analyzes the outline Then that section defaults to sequential execution

### Story 3: Resume after session interruption

**As a** developer whose session died mid-execution
**I want** to re-invoke `sdd-execute` and have the controller resume from where it left off
**So that** already-completed work units are not re-implemented

**Acceptance criteria:**

- [ ] **AC-3.1** Given a session was interrupted mid-execution When `sdd-execute` is re-invoked Then the controller re-reads `plan.md`, re-derives the execution outline, and checks `git log` for commits referencing each work unit's plan section heading
- [ ] **AC-3.2** Given a work unit whose plan section heading appears in at least one commit message When the controller checks git history Then that unit is marked complete in TodoWrite and skipped
- [ ] **AC-3.3** Given a work unit with no matching commit message When the controller checks git history Then that unit is treated as incomplete and dispatched normally

### Story 4: Workflow routing reflects the new path

**As a** developer following the SDD workflow
**I want** `sdd-workflow` to route me from plan approval directly to `sdd-execute`
**So that** I am never directed to the retired `sdd-tasks` step

**Acceptance criteria:**

- [ ] **AC-4.1** Given `plan.md` is approved and `tasks.md` does not exist When I consult `sdd-workflow` routing Then the guidance reads "Plan approved → `sdd-execute`" with no mention of `sdd-tasks` as a required intermediate step
- [ ] **AC-4.2** Given the workflow hard gates When they are read Then the gate `NO TASKS without a plan` is absent and the active gates are `NO PLAN without an approved spec`, `NO CODE without a prior failing test`, and `NO COMPLETION CLAIM without fresh verification evidence`

## Functional Requirements

### FR-1: Plan-driven execution mode in `sdd-execute`

`sdd-execute` must detect the absence of `tasks.md` and activate plan-driven mode automatically.

**Must:**
- Check for `tasks.md` at `docs/specs/NNN-feature/tasks.md` before reading `plan.md`
- If `tasks.md` is absent, read `plan.md` and `spec.md` and proceed in plan-driven mode
- If `tasks.md` is present, use it as-is (existing behavior, no change)
- In plan-driven mode, derive work units before dispatching any subagent
- Track derived work units in session TodoWrite (not written to disk)

**Must not:**
- Write a `tasks.md` file to disk in plan-driven mode
- Require the user to generate a `tasks.md` before execution can begin
- Dispatch any implementer subagent before the work-unit outline is derived and recorded in TodoWrite

### FR-2: Work unit derivation

The controller must produce a flat, ordered list of work units from `plan.md` sections before dispatch.

**Must:**
- Scope each work unit to one `plan.md` section or sub-section
- Size each work unit to be implementable by one subagent in a single TDD cycle (write failing test → make pass → commit)
- Record each work unit as a TodoWrite entry with the plan section heading as the title
- Inject into each implementer prompt: (a) full `spec.md` content, (b) the specific plan section text for this unit, (c) explicit TDD red-green-refactor mandate, (d) instruction to include the plan section heading in the commit message

**Must not:**
- Derive work units that span multiple plan sections in a single dispatch
- Produce work units so large that a single subagent cannot implement them in one pass
- Allow implementer subagents to self-determine work boundaries

### FR-3: Parallelization inference

The controller must determine which work units can run concurrently.

**Must:**
- Mark two units as parallelizable if the plan text explicitly states they are independent
- Mark two units as parallelizable if they modify disjoint sets of files with no ordering constraint in the plan
- Default to sequential when parallelism cannot be confirmed by either condition
- Dispatch parallelizable units concurrently using the same concurrent-dispatch rules as the existing `subagent-driven-development` skill

**Must not:**
- Invent parallelism that is not derivable from plan text or file-level disjointness
- Dispatch sequentially-dependent units concurrently

### FR-4: Restart and resume

The controller must be able to resume a partially-completed execution after session interruption.

**Must:**
- On re-invocation, re-read `plan.md` and re-derive the full work-unit outline
- For each derived unit, search `git log` for any commit message containing the unit's plan section heading
- Mark units with a matching commit as complete in TodoWrite and skip them
- Dispatch only units with no matching commit

**Must not:**
- Re-implement work units that already have a matching commit in git history
- Require the user to manually specify which units are complete on restart

### FR-5: `sdd-workflow` routing update

The workflow skill must be updated to reflect the retired `sdd-tasks` step.

**Must:**
- Remove `sdd-tasks` from the quick-reference routing table
- Change the "Plan exists" row to route directly to `sdd-execute`
- Remove the hard gate `NO TASKS without a plan` from the gates list and from all gate displays
- Retain all other gates unchanged

**Must not:**
- Reference `sdd-tasks` as a required step in any routing path
- Reference `tasks.md` as a required artifact before execution

### FR-6: `subagent-driven-development` source of truth update

The `subagent-driven-development` skill must be updated to read `plan.md` instead of `tasks.md` in plan-driven mode.

**Must:**
- Replace "Read tasks.md + spec.md" with "Read plan.md + spec.md, derive work units" in the process description
- Update the SDD Source Files table to list `plan.md` as the primary source (with `tasks.md` as fallback when it exists)
- Retain the full dispatch/review loop (implementer → spec-compliance → code-quality) unchanged
- Retain the implementer status handling table unchanged

**Must not:**
- Change the two-stage review loop
- Change the implementer, spec-reviewer, or code-quality-reviewer prompt templates

## Non-Functional Requirements

### Performance

- Work unit derivation must complete before the first subagent is dispatched; the derivation step is expected to be fast (one read of `plan.md` + one read of `spec.md` + inline analysis)

### Reliability

- If `plan.md` cannot be read when `tasks.md` is absent, `sdd-execute` must surface a clear error and halt rather than dispatching subagents with incomplete context
- Restart detection via `git log` must be a read-only operation with no side effects

### Maintainability

- The `sdd-tasks` skill file is retired but not deleted; its `SKILL.md` must note that it is retired and point to `sdd-execute` as the replacement path

## Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| `tasks.md` absent and `plan.md` absent when `sdd-execute` is invoked | Surface error: "No plan.md found at docs/specs/NNN-feature/plan.md. Run sdd-plan first." Halt. |
| `plan.md` present but has no sections | Surface error: "plan.md has no sections to derive work units from. Ensure plan.md follows the standard plan template." Halt. |
| A derived work unit is too large for a single implementer subagent | Implementer returns BLOCKED. Controller splits the unit into two sub-units, updates TodoWrite, re-dispatches. |
| Session interrupted; git log check finds no matching commits for any unit | All units treated as incomplete; full execution resumes from the beginning. |
| Session interrupted; git log check finds commits for some units | Matched units marked complete and skipped; remaining units dispatched in dependency order. |
| Implementer subagent omits plan section heading from commit message | Restart detection cannot identify the unit as complete; unit is re-dispatched. Implementer prompt must include the heading-in-commit-message requirement. |

## Open Questions

- None. All design decisions were resolved during brainstorming.

## Out of Scope (Future Considerations)

- Modifying `plan.md` format to add explicit execution metadata (dependency markers, estimated size)
- Cross-session persistence of the derived execution outline (a `session-state.md` or similar)
- A migration helper that converts existing `tasks.md` files into plan-section-aware formats
- Removing the `sdd-tasks` skill file from the repository
- Changing restart detection to use a mechanism other than git commit message matching
