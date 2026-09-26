# Feature 023: Retire sdd-tasks Skill Completely

**Status:** Approved
**Created:** 2026-07-04
**Branch:** `023-retire-sdd-tasks-skill`

---

## Problem Statement

`sdd-tasks` was deprecated in Feature 018 (taskless execute from plan). Its own `SKILL.md` carries a RETIRED banner, yet the skill file still has a live frontmatter `description` that reads "Use when an implementation plan is approved and needs to be broken down into executable tasks." Because Claude Code skill routing matches on that description, the skill still fires — pulling Claude into a retired workflow step that conflicts with what `sdd-execute` now does natively.

Additionally, nine other skill files still reference `sdd-tasks` by name in handoffs, routing tables, and examples. Each reference is a latent trigger that can send a user or agent down the retired path.

The result: a fully-retired skill that is still reachable by routing, still recommended by peers, and still capable of producing `tasks.md` files that `sdd-execute` will then redundantly process.

## Goals

- Eliminate all live routing surface for `sdd-tasks` so it can never be triggered by skill routing
- Remove or replace every cross-reference to `sdd-tasks` in peer skill files, substituting `sdd-execute` or `sdd-plan` as appropriate
- Leave the `sdd-tasks/` directory in place as an inert historical artifact, but strip its frontmatter description so it cannot match any trigger
- Remove the two hook scripts dedicated to the tasks workflow (`pre-write-tasks-gate.sh`, `post-write-tasks-check.sh`) and their test files
- Remove the `tasks.md` context injection from `session-start.sh`

## Non-Goals

- Deleting the `sdd-tasks/` directory or git history — preserved as a record of the retired approach
- Changing how `sdd-execute` consumes an existing `tasks.md` (backward-compat path stays)
- Changing any behavior of `sdd-plan`, `sdd-execute`, or other skills beyond reference text updates
- Updating `using-git` operation ownership — branch creation and doc-first commit remain unchanged, only the caller attribution text is updated
- Writing tests for the removed hooks — deletion requires removing their corresponding test files in `tests/hooks/`

## Users and Context

**Primary users:** Claude (the AI model) — reads skill prose at routing time; a live description causes spurious matches  
**Secondary users:** SDD practitioners — see stale handoff text ("next: run sdd-tasks") that sends them to a retired step  
**Usage context:** Any SDD session where a plan has just been approved — the current handoff in `sdd-plan` points to `sdd-tasks` instead of `sdd-execute`

---

## User Stories

### Story 1: sdd-tasks cannot be triggered by skill routing

**As a** developer in an SDD session  
**I want** `sdd-tasks` to be invisible to skill routing  
**So that** no combination of user phrasing or agent logic can land in the retired skill

**Acceptance criteria:**
- `sdd-tasks/SKILL.md` frontmatter `description` field is cleared or replaced with a non-triggering tombstone value (e.g., `"Retired — do not use"`)
- The skill body retains the RETIRED notice with a pointer to `sdd-execute`
- The `name` field is preserved so the file remains a valid but inert skill record

### Story 2: sdd-plan handoff points to sdd-execute

**As a** developer who just had a plan approved  
**I want** `sdd-plan` to hand off to `sdd-execute` directly  
**So that** there is no intermediate task-generation step in the standard workflow

**Acceptance criteria:**
- `sdd-plan/SKILL.md` execution handoff block recommends `sdd-execute`, not `sdd-tasks`
- `sdd-plan/reference.md` step list replaces the `sdd-tasks` step with `sdd-execute`
- `sdd-plan/template.md` header note no longer references `sdd-tasks`

### Story 3: All peer skill references updated

**As a** developer reading any SDD skill  
**I want** no skill to name `sdd-tasks` as a recommended next step or example action  
**So that** the workflow text is consistent with the actual implemented flow

**Acceptance criteria:**
- `sdd-spec-update/reference.md`: MAJOR change row updated to recommend `sdd-plan` → `sdd-execute` (no `sdd-tasks`)
- `sdd-brainstorm/SKILL.md`: pipeline example updated to `sdd-specify → sdd-plan → sdd-execute`
- `sdd-brainstorm/reference.md`: no-invoke list updated to remove `sdd-tasks`
- `using-git/SKILL.md` and `using-git/reference.md`: caller attribution for Operations A and B updated from `sdd-tasks` to `sdd-plan`/`sdd-execute` as appropriate
- `sdd-specify/reference.md`: branch-creation timing note updated to reference `sdd-execute` instead of `sdd-tasks`
- `subagent-driven-development/SKILL.md`: `sdd-tasks` line updated or removed
- `sdd-execute/SKILL.md`: incorrect-action example may retain the mention for contrast, or be updated — whichever is clearer

### Story 4: Task-related hooks are removed

**As a** developer in an SDD session  
**I want** no active hooks enforcing the retired tasks workflow  
**So that** the hook layer is consistent with the retired skill and cannot gate or prompt on `tasks.md` writes

**Acceptance criteria:**
- `scripts/hooks/pre-write-tasks-gate.sh` is deleted
- `scripts/hooks/post-write-tasks-check.sh` is deleted
- Their corresponding test files (`tests/hooks/test_pre-write-tasks-gate.sh`, `tests/hooks/test_post-write-tasks-check.sh`) are deleted
- `session-start.sh` no longer reads or injects open tasks from `tasks.md`
- After changes, `grep -r "tasks\.md" scripts/hooks/` returns no results (or only comments)

## Functional Requirements

1. `sdd-tasks/SKILL.md` must have its `description` frontmatter value changed to a tombstone string that will not match any routing query
2. Every file identified in Story 3 acceptance criteria must have its `sdd-tasks` reference replaced with the correct successor skill
3. No new reference to `sdd-tasks` may be introduced in any skill file as part of this change
4. `scripts/hooks/pre-write-tasks-gate.sh` and `scripts/hooks/post-write-tasks-check.sh` must be deleted along with their test files
5. All three entries referencing those scripts in `hooks/hooks.json` must be removed; the JSON must remain valid after removal
6. `session-start.sh` must have its `tasks.md` reading block removed; all other session-start logic must remain intact
7. After all changes, `grep -r "sdd-tasks" skills/` must return only the tombstone file itself, and `grep -r "tasks\.md" scripts/hooks/` must return no results

## Non-Functional Requirements

- All modified skill files must remain valid Markdown with correct YAML frontmatter
- Word counts of modified SKILL.md files must remain within the limits defined in `skill-writing.md` rules
- Changes are text-only — no new files created, no directory moves

## Error Scenarios

- **A reference is missed**: The spec lists nine affected skill files plus two hook scripts and `hooks.json`; implementation must grep for remaining `sdd-tasks` occurrences across `skills/` and `scripts/hooks/` after edits and fix any found
- **sdd-execute SKILL.md contrast example**: If removing the `sdd-tasks` mention makes the incorrect-action example unclear, rewrite it to name the correct action instead of the incorrect one

## Open Questions

None — scope is fully defined by the grep results.

## Out of Scope

- Removing the `sdd-tasks/` directory or its git history
- Changing `sdd-execute` behavior for legacy `tasks.md` files
- Updating the `sdd-workflow` quick-reference table (sdd-tasks does not appear there)
- Any change to `plugin.json` or skill version bumps
