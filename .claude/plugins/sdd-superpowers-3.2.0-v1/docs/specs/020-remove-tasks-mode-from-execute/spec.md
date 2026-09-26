# Feature 020: Remove tasks.md Mode from sdd-execute

**Status:** Approved
**Created:** 2026-07-04
**Branch:** `020-remove-tasks-mode-from-execute`

---

## Problem Statement

`sdd-execute` currently operates in two modes: task-driven (when `tasks.md` exists) and plan-driven (when it does not). This dual-mode design was introduced in spec 018 as a backward-compatibility measure for features that already had a `tasks.md`. The plan-driven mode has since proven sufficient for all execution scenarios. The mode-detection logic — checking for `tasks.md`, branching behavior accordingly, maintaining `[x]` checkboxes in `tasks.md` — adds cognitive overhead both for practitioners reading the skill and for Claude executing it at runtime. It also creates inconsistency: two practitioners invoking the same skill may experience different behavior depending on whether a file happens to exist on disk.

## Goals

- Remove the tasks.md detection step and task-driven execution path from `sdd-execute` entirely
- Make plan-driven execution the single, unconditional mode for `sdd-execute`
- Simplify the skill prose so there is no branching logic, no mode announcement, and no reference to `tasks.md` as an execution input
- Preserve all TDD discipline, two-stage review, parallel dispatch, and restart-detection behavior

## Non-Goals

- Removing the `sdd-tasks` skill file from the repository
- Removing `tasks.md` files from existing feature spec directories
- Changing `plan.md` format or content requirements
- Changing the `subagent-driven-development` skill
- Changing the `test-driven-development` skill
- Providing a migration guide for in-flight features that have a `tasks.md`

## Users and Context

**Primary users:** Claude (the AI model) — reads `sdd-execute` skill prose and drives the execution loop at runtime  
**Secondary users:** SDD practitioners — invoke `sdd-execute` and observe a simpler, single-mode execution flow  
**Usage context:** Every session where a `plan.md` is approved and implementation should begin  
**User mental model:** `sdd-execute` reads the plan and starts building — no file detection, no mode announcement, no ambiguity

---

## User Stories

### Story 1: Single execution mode regardless of disk state

**As a** developer invoking `sdd-execute`  
**I want** the skill to always operate from `plan.md` + `spec.md`  
**So that** execution behavior is identical whether or not a `tasks.md` file exists on disk

**Acceptance criteria:**

- [ ] **AC-1.1** Given `plan.md` exists and `tasks.md` does not exist When `sdd-execute` is invoked Then the controller reads `plan.md` and `spec.md` and derives work units — no file detection step occurs
- [ ] **AC-1.2** Given `plan.md` exists and `tasks.md` also exists on disk When `sdd-execute` is invoked Then the controller still reads `plan.md` and `spec.md` and derives work units — `tasks.md` is not read and not used
- [ ] **AC-1.3** Given `sdd-execute` is invoked When any status is reported for a completed work unit Then the skill does not attempt to mark `[x]` in any `tasks.md` file

### Story 2: No mode-detection prose in the skill

**As a** practitioner reading the `sdd-execute` skill  
**I want** to see a single, linear execution flow with no branching on `tasks.md`  
**So that** I understand exactly what will happen without needing to know which files exist

**Acceptance criteria:**

- [ ] **AC-2.1** Given the updated `sdd-execute` SKILL.md When read by a practitioner Then it contains no reference to `tasks.md` as an execution input or mode trigger
- [ ] **AC-2.2** Given the updated `sdd-execute` SKILL.md When read by a practitioner Then the execution flow description shows a single linear path (no conditional branches for tasks.md presence)
- [ ] **AC-2.3** Given the updated `sdd-execute` reference.md When read by Claude at runtime Then it contains no instruction to check for `tasks.md`, read it, or use it to drive execution

### Story 3: Error handling updated to reflect single mode

**As a** developer whose `plan.md` is missing  
**I want** `sdd-execute` to surface a clear error  
**So that** I know to run `sdd-plan` before retrying

**Acceptance criteria:**

- [ ] **AC-3.1** Given `plan.md` does not exist When `sdd-execute` is invoked Then the skill surfaces: "No plan.md found. Run sdd-plan first." and halts — no fallback to `tasks.md`
- [ ] **AC-3.2** Given the updated error handling section When read Then there is no error scenario entry for "tasks.md does not exist" — it is no longer a recognized condition

---

## Functional Requirements

- **FR-1** `sdd-execute` SKILL.md must not contain the phrase "tasks.md" as an execution input or mode trigger
- **FR-2** `sdd-execute` SKILL.md execution flow must describe a single path: verify branch → read plan.md + spec.md → derive work units → dispatch subagents
- **FR-3** `sdd-execute` reference.md must not contain any instruction to detect, read, or act on the presence or absence of `tasks.md`
- **FR-4** The status handling table must not reference marking `[x]` in `tasks.md`
- **FR-5** The error handling section must not list "tasks.md does not exist" as a recognized error scenario
- **FR-6** All examples in SKILL.md that show tasks.md-driven behavior must be removed or replaced with plan-driven equivalents
- **FR-7** The `description` frontmatter of SKILL.md must not reference `tasks.md`

## Non-Functional Requirements

- **NFR-1** The updated skill must be shorter than the current version — removing a mode should reduce prose, not add to it
- **NFR-2** No placeholder text ("TBD", "TODO") introduced anywhere in the updated skill files

---

## Error Scenarios

- **plan.md does not exist**: Surface error "No plan.md found at docs/specs/NNN-feature/plan.md. Run sdd-plan first." Halt. No fallback.
- **plan.md has no sections**: Surface error "plan.md has no sections to derive work units from. Ensure plan.md follows the standard plan template." Halt.
- **Current branch is main/master**: Stop. Ask the user to confirm the correct feature branch.

---

## Open Questions

_None._

---

## Out of Scope

- Removing `sdd-tasks` skill file from the repository
- Removing existing `tasks.md` files from spec directories
- Changing `subagent-driven-development` or `test-driven-development` skills
- Updating spec 018 retroactively
