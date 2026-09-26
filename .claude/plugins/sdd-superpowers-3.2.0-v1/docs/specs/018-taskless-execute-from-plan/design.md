# Design: Taskless Execute — Drive Implementation Directly from Plan

**Date:** 2026-07-04
**Feature:** 018-taskless-execute-from-plan

## Problem

The SDD workflow currently requires a dedicated `sdd-tasks` step between planning and execution. This step generates a `tasks.md` file — a flat, atomic, exhaustive task list — before any implementation begins. The list is often very long, detailed, and expensive to produce upfront. Practitioners experience it as overhead that delays the actual work without adding proportionate value: the plan already captures intent, scope, and structure. The tasks list re-states that intent at a lower level of detail that the executor (and implementer subagents) could derive themselves.

## Chosen Approach

**Eliminate `tasks.md` and the `sdd-tasks` skill from the execution path. Drive implementation directly from `spec.md` + `plan.md`.**

The `sdd-execute` controller reads `plan.md` and `spec.md` once at session start, derives a lightweight execution outline in memory (tracked via session TodoWrite — not written to disk), determines which plan sections are independent, and dispatches one implementer subagent per derived work unit. Each implementer receives: the full `spec.md` content, the relevant plan section text, and an explicit TDD red-green-refactor mandate in its prompt. The two-stage review loop (spec compliance → code quality) runs after each implementer, unchanged. The controller derives parallelization from plan section dependencies, not from pre-marked `[P]` tags.

Concretely:

1. Controller reads `plan.md` + `spec.md`.
2. Controller derives an execution outline: a list of work units, each scoped to one plan section or sub-section, right-sized to be implementable by one subagent in one TDD cycle. This lives only in the controller's TodoWrite and session context.
3. Controller determines which units are independent (can parallelize) vs. sequential (share state or have ordering constraints).
4. For each unit (in dependency order): dispatch implementer subagent → spec-compliance review → code-quality review → mark complete.
5. When all units are done: `verification-before-completion` → `sdd-review` → `finishing-a-development-branch`.

## Trade-offs & Rationale

**Why Approach B over Approach A (plan sections = 1:1 subagent units):**
Plan sections vary too much in scope. A section titled "Implement authentication middleware" may be 3× the work of "Add config key." Treating them as equal dispatch units produces bloated or trivially small subagent calls. The controller derives appropriately-sized units before dispatching, avoiding this variance.

**Why Approach B over Approach C (implementer decides its own TDD cycles):**
Delegating TDD granularity to the implementer loses the atomicity discipline that makes TDD effective. The controller enforces one-behavior-per-test cycles by right-sizing work units before dispatch. Approach C allows a lazy implementer to write one broad test for an entire section.

**What is given up:**
- `tasks.md` is a persistent, reviewable artifact. Without it, the execution outline is ephemeral — if the session dies mid-execution, the controller re-derives it from `plan.md` on restart (cheap, but requires re-running `sdd-execute`).
- The upfront `[P]` parallelization markers in `tasks.md` gave a human-reviewable parallel-safety audit before any code ran. The controller now derives parallelization at runtime — correct for most plans, but requires the controller to reason about file-level dependencies rather than reading pre-computed markers.

## Key Design Decisions

1. **`sdd-tasks` skill is retired.** It is removed from the workflow routing table in `sdd-workflow`. The gate `NO TASKS without a plan` is removed. The new gate chain is: `NO CODE without a prior failing test` (unchanged) and `NO EXECUTION without an approved plan`.

2. **Execution outline lives in TodoWrite only.** No new disk artifact is introduced. The controller's session TodoWrite IS the task tracker. This avoids a new intermediate artifact while preserving progress visibility within the session.

3. **`subagent-driven-development` source of truth changes from `tasks.md` → plan sections.** The skill's "Read tasks.md + spec.md" step becomes "Read plan.md + spec.md, derive work units." The rest of the dispatch/review loop is unchanged.

4. **TDD enforcement stays in the implementer prompt.** The `test-driven-development` skill is injected into each implementer subagent's prompt exactly as before. No change to TDD mechanics.

5. **Parallelization derived from plan structure.** The controller identifies independent plan sections and dispatches them concurrently. A section is independent if: (a) the plan explicitly states it has no dependency on another section, or (b) it modifies different files than all currently in-flight sections. When neither condition can be confirmed, the controller defaults to sequential execution. The controller does not invent parallelism — it must be derivable from the plan text or file-level disjointness.

6. **Restart behavior.** If a session dies mid-execution, the user re-invokes `sdd-execute`. The controller re-reads `plan.md`, re-derives the outline, then checks `git log` for commits whose messages reference each work unit's section heading. Sections with a matching commit are marked complete in TodoWrite and skipped. No data is lost — git commit history is the restart source of truth, which requires implementer subagents to include the plan section heading in their commit messages.

## Out of Scope

- Modifying `plan.md` format or adding new sections to it to support execution (plan.md stays as-is).
- Providing a migration path for in-flight features that already have a `tasks.md`. If a `tasks.md` exists when `sdd-execute` is invoked, the controller uses it as-is (existing behavior). Plan-driven mode activates only when `tasks.md` is absent.
- Changing anything about the spec-compliance or code-quality reviewer prompts.
- Changing the TDD skill itself.
- Changing the two-stage review loop.
- Adding persistence of the derived execution outline between sessions (TodoWrite is sufficient for the session lifetime).
