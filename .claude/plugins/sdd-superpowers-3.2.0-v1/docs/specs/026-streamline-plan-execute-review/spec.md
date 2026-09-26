# Feature 026: Streamline Plan and Execute Review Lifecycle

**Status:** Approved
**Created:** 2026-08-15
**Branch:** `026-streamline-plan-execute-review`

---

## Problem Statement

`sdd-plan` produces plans with mandatory Architecture, Tech Stack, File Structure, and Complexity Tracking sections on top of each phase, and never uses Claude Code's native Plan Mode — plans are written straight to disk with only a chat-based approval. `sdd-execute` runs three layers of review before a single unit of work is done: a spec-compliance subagent review, a code-quality subagent review, and — at every phase boundary — a blocking `requesting-code-review` gate. Only after all of that does the single post-implementation `sdd-review` (Mode B) run. TDD (red-green-refactor) already gates correctness per unit; the extra review layers add latency and interruption without a commensurate increase in caught defects, and the plan format's boilerplate sections make every plan longer than the phase content actually requires.

This feature collapses the lifecycle to: a compact, Plan-Mode-driven `plan.md` → TDD-only execution via `subagent-driven-development`/`dispatching-parallel-agents` → exactly one spec-alignment review (`sdd-review` Mode B) after all phases are committed → an automatic follow-up loop if that single review finds gaps, bounded by an escalation rule so it cannot run forever.

## Goals

- `sdd-plan` calls `EnterPlanMode` before drafting and exits via the plan-approval flow (`ExitPlanMode`) before writing `plan.md` to disk
- `plan.md`'s per-phase format is compacted to: header (Implements/Satisfies/Files) + a short goal + only the necessary code/contract snippets — no mandatory standalone Architecture/Tech Stack/File Structure headings; Complexity Tracking becomes an optional per-phase note instead of a mandatory top-level section
- `sdd-execute` drops the per-unit spec-compliance review, the per-unit code-quality review, and the per-phase-boundary `requesting-code-review` gate — TDD is the only quality gate during execution
- `sdd-execute` keeps subagent dispatch (`subagent-driven-development`, `dispatching-parallel-agents`), per-unit commits, and restart detection unchanged
- Exactly one review occurs after code exists in the whole lifecycle: `sdd-review` Mode B, run once after all phases are committed
- If that single review reports `DRIFT DETECTED` or `INCOMPLETE`, `sdd-execute` automatically derives corrective work units, dispatches implementers, commits, and re-runs `sdd-review` Mode B — repeating without asking the user — until it reports `SPEC-ALIGNED`
- The follow-up loop is bounded: if the *same* acceptance criterion appears unresolved in any 2 of the last 3 `sdd-review` Mode B rounds, `sdd-execute` stops looping and escalates to the user. (Widened from a strict "2 consecutive rounds" rule after code review found that rule doesn't catch an AC that oscillates — unresolved, then resolved, then unresolved again — which could loop indefinitely without ever triggering a strictly-consecutive check. The 3-round rolling window catches oscillation while still allowing genuinely different gaps to be fixed round over round.)

## Non-Goals

- Changing `sdd-review` Mode A (pre-plan spec completeness check)
- Changing `test-driven-development` skill content — TDD stays exactly as documented; this feature makes it the *only* execution-time quality gate, not a different one
- Changing the `data-model.md` / `contracts/api.md` template structures — still produced only when a feature needs them
- Restoring or further modifying `sdd-tasks` (already retired by spec 023)
- Changing branch or commit conventions in `docs/git-convention.md`
- Making the follow-up-loop escalation threshold user-configurable — fixed at "same AC unresolved in 2 of the last 3 rounds"

**Amendment (approved in-session during planning):** `subagent-driven-development` and `dispatching-parallel-agents` were originally listed as Non-Goals, but their own SKILL.md content — not just `sdd-execute`'s — defines the per-unit two-stage review as a core, mandatory behavior. Removing per-unit review (Goals above) is impossible without editing them. See FR-12 through FR-15.

## Users and Context

**Primary users:** Claude — reads `sdd-plan`/`sdd-execute`/`sdd-review`/`sdd-workflow` skill prose and drives planning and execution at runtime
**Secondary users:** SDD practitioners — invoke `sdd-plan` and `sdd-execute`, approve plans through Plan Mode, and see one review at the end instead of scattered reviews throughout
**Usage context:** Every `sdd-plan` invocation (planning a feature) and every `sdd-execute` invocation (implementing an approved plan) in an SDD project
**User mental model:** "The plan is quick to read and I approve it through Claude Code's normal plan-approval UI. Execution then runs mostly unattended, with tests as the safety net, and I only see one review at the very end — unless something's still wrong, in which case it fixes itself once more before asking me."

---

## User Stories

### Story 1: Compact, Plan-Mode-driven planning

**As a** developer running `sdd-plan`
**I want** the skill to enter Plan Mode and produce a short, phase-by-phase plan
**So that** I approve the plan quickly through Claude Code's native approval flow, without wading through boilerplate sections

**Acceptance criteria:**

- [ ] **AC-1.1** Given a user invokes `sdd-plan` with an approved spec When the skill begins drafting Then it calls `EnterPlanMode` before producing plan content
- [ ] **AC-1.2** Given the plan.md draft is complete When the skill is ready to persist it Then it exits Plan Mode via the approval flow (`ExitPlanMode`) before writing `plan.md` to disk
- [ ] **AC-1.3** Given the generated `plan.md` When read Then each phase section contains only a header (Implements/Satisfies/Files), a 1-3 sentence goal, and necessary code/contract snippets — with no separate top-level Architecture, Tech Stack, or File Structure headings
- [ ] **AC-1.4** Given a Pre-Implementation Gate fails for a specific phase When the plan is generated Then a Complexity Tracking note appears only under that phase, not as a mandatory empty top-level section
- [ ] **AC-1.5** Given the updated `sdd-plan/template.md` When compared to the previous version Then the required per-phase skeleton has fewer mandatory subheadings

### Story 2: TDD-only execution, no per-unit or per-phase review

**As a** developer running `sdd-execute`
**I want** each work unit validated only by its own failing-then-passing tests
**So that** execution proceeds without waiting on spec-compliance, code-quality, or phase-boundary review subagents

**Acceptance criteria:**

- [ ] **AC-2.1** Given an implementer subagent reports DONE for a work unit When `sdd-execute` processes the result Then it proceeds directly to commit — no spec-compliance review subagent is dispatched
- [ ] **AC-2.2** Given a work unit is committed When `sdd-execute` proceeds Then no code-quality review subagent is dispatched for that unit
- [ ] **AC-2.3** Given all work units in a phase are committed When `sdd-execute` moves to the next phase Then no `requesting-code-review` invocation occurs at that boundary
- [ ] **AC-2.4** Given the updated `sdd-execute` SKILL.md and reference.md When read Then neither contains an instruction to dispatch a "spec-compliance review" subagent, a "code-quality review" subagent, or a "phase boundary review" step
- [ ] **AC-2.5** Given a parallel task group finishes When `sdd-execute` proceeds Then it commits each unit directly once its own tests pass — no per-task or per-group review subagent is dispatched

### Story 3: Exactly one spec-alignment review, after everything is implemented

**As a** developer running `sdd-execute`
**I want** `sdd-review` Mode B to run exactly once, after all phases are committed
**So that** I get a single, authoritative spec-alignment check instead of reviews scattered throughout execution

**Acceptance criteria:**

- [ ] **AC-3.1** Given all work units across all phases are committed When `sdd-execute` reaches final verification Then it runs the full test suite once, then dispatches `sdd-review` (Mode B) exactly once
- [ ] **AC-3.2** Given `sdd-review` Mode B reports `SPEC-ALIGNED` When `sdd-execute` receives this result Then it proceeds to `finishing-a-development-branch` without any further review
- [ ] **AC-3.3** Given the updated `sdd-execute/reference.md` When read Then it describes exactly one unconditional dispatch of `sdd-review` Mode B in the base execution flow

### Story 4: Automatic, bounded follow-up when the final review finds gaps

**As a** developer whose feature has spec drift or incomplete coverage
**I want** `sdd-execute` to automatically fix and re-check gaps found by the single final review, without looping forever
**So that** I don't have to manually restart execution myself, and I'm not left waiting on a stuck loop

**Acceptance criteria:**

- [ ] **AC-4.1** Given `sdd-review` Mode B reports `DRIFT DETECTED` or `INCOMPLETE` When `sdd-execute` receives this result Then it derives corrective/missing work units from the reviewer's findings, dispatches implementer subagents (following TDD), commits, and re-runs `sdd-review` Mode B — without asking the user to confirm each round
- [ ] **AC-4.2** Given the same acceptance criterion has been reported unresolved in 2 of the last 3 `sdd-review` Mode B rounds (whether consecutive or with an intervening round where it was resolved) When `sdd-execute` evaluates the latest result Then it stops looping and escalates to the user with the specific unresolved AC, instead of attempting another automatic round
- [ ] **AC-4.3** Given `sdd-review` Mode B reports `SPEC-ALIGNED` after one or more follow-up rounds When `sdd-execute` receives this result Then it proceeds to `finishing-a-development-branch`

---

## Functional Requirements

### FR-1: Plan Mode entry in sdd-plan

`sdd-plan` SKILL.md and reference.md must instruct calling `EnterPlanMode` before drafting plan content, and exiting via the plan-approval flow (`ExitPlanMode`) before writing `plan.md` to disk.

**Must:**
- Call `EnterPlanMode` at the start of drafting
- Exit Plan Mode via the normal approval flow once the draft is complete, before any file write

**Must not:**
- Write `plan.md` to disk before the Plan Mode approval flow completes

### FR-2: Compact per-phase plan template

`sdd-plan/template.md` must define each phase as: header (Implements/Satisfies/Files) + short goal prose + code/contract snippets, with no required standalone Architecture/Tech Stack/File Structure headings. Complexity Tracking becomes a per-phase optional note.

**Must:**
- Keep the header line format `**Implements:** ... | **Satisfies:** ... **Files:** ...`
- Allow Complexity Tracking notes inline under the phase they apply to

**Must not:**
- Require Architecture, Tech Stack, or File Structure as mandatory top-level headings

### FR-3: No per-unit spec-compliance review

`sdd-execute` SKILL.md and reference.md must not contain any instruction to dispatch a spec-compliance review subagent after a work unit.

### FR-4: No per-unit code-quality review

`sdd-execute` SKILL.md and reference.md must not contain any instruction to dispatch a code-quality review subagent after a work unit.

### FR-5: No phase-boundary review gate

`sdd-execute` SKILL.md and reference.md must not contain a phase-boundary `requesting-code-review` step.

### FR-6: Exactly one sdd-review Mode B dispatch

`sdd-execute` SKILL.md and reference.md must describe exactly one dispatch of `sdd-review` (Mode B) in the base execution flow, occurring after all phases are committed and the full test suite has run once.

### FR-7: Automatic follow-up loop

`sdd-execute/reference.md` must describe a follow-up loop: on `DRIFT DETECTED`/`INCOMPLETE`, derive corrective work units from the reviewer's findings, dispatch implementers (TDD), commit, and re-run `sdd-review` Mode B — without prompting the user between rounds.

### FR-8: Loop escalation rule

`sdd-execute/reference.md` must describe an escalation rule: track the unresolved-AC set for each of the last 3 `sdd-review` Mode B rounds; if the same acceptance criterion appears unresolved in 2 of those 3 rounds (consecutive or not), stop looping and surface it to the user with the specific AC.

**Must not:**
- Attempt another automatic follow-up round once an AC has hit the 2-of-3 threshold

### FR-9: Execution-flow diagram updated

`sdd-execute` SKILL.md's Quick Reference execution-flow block must reflect the new flow: no per-unit/per-phase review steps, one final review, and the bounded follow-up loop.

### FR-10: sdd-workflow routing updated

`sdd-workflow` SKILL.md's Quick Reference and Common Mistakes sections must stop directing `requesting-code-review` to run "at any phase boundary" during `sdd-execute`. `requesting-code-review` remains listed for its general, ad hoc trigger ("user says 'review this'"), which is unrelated to `sdd-execute`'s internal flow.

### FR-11: sdd-execute Integration table updated

`sdd-execute` SKILL.md's Integration table must remove the "phase boundary → `requesting-code-review`" row. `receiving-code-review` remains listed, now scoped to fixing findings from the single `sdd-review` Mode B dispatch (including follow-up rounds) rather than per-unit review feedback.

### FR-12: subagent-driven-development drops two-stage review

`subagent-driven-development/SKILL.md` must not describe spec-compliance or code-quality review as part of its per-unit process (Overview, Core Principle, Process diagram, Quality Gates, Red Flags, Example Workflow, Integration). It must still describe fresh-subagent-per-unit dispatch, status handling, and TDD as the per-unit quality gate.

**Must not:**
- Contain a diagram node, red flag, or integration bullet that dispatches a spec-compliance or code-quality reviewer subagent per unit

### FR-13: dispatching-parallel-agents drops two-stage review

`dispatching-parallel-agents/SKILL.md` and `reference.md` must not describe spec-compliance or code-quality review as part of the post-dispatch procedure for a parallel group. Each unit is committed directly once its own tests pass.

### FR-14: requesting-code-review scoped to ad hoc/standalone use only

`requesting-code-review/SKILL.md` must not list "after spec compliance passes for each task in subagent-driven-development," "...each parallel task in dispatching-parallel-agents," or "after completing a phase in sdd-execute (blocking gate)" as mandatory triggers. Its ad hoc ("user says 'review this'") and standalone pre-merge triggers remain.

### FR-15: receiving-code-review trigger list updated

`receiving-code-review/SKILL.md`'s "When to Use" must replace the reference to spec-compliance/code-quality reviewer subagents in `sdd-execute`/`subagent-driven-development` with: after `sdd-review` (Mode B) returns issues during `sdd-execute`'s follow-up loop, or after `requesting-code-review` returns issues in an ad hoc review.

## Non-Functional Requirements

### Simplicity

- **NFR-1** The compact `plan.md` template must have a strictly shorter required per-phase skeleton (fewer mandatory subheadings) than the current template, for a phase of equivalent complexity.
- **NFR-2** No placeholder text ("TBD", "TODO", "implement later") is introduced anywhere in the updated skill files.

### Reliability

- **NFR-3** The follow-up loop must have a bounded worst case (FR-8's 2-of-3-rounds escalation rule) — it must never be able to run indefinitely without eventually surfacing to the user, including when the unresolved AC oscillates rather than repeating on strictly consecutive rounds.

---

## Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| `sdd-review` Mode B reports the same acceptance criterion unresolved in 2 of the last 3 rounds | Escalate to the user with the specific AC; do not attempt another automatic fix round |
| Plan Mode is unavailable in the current environment | Fall back to presenting the `plan.md` draft as a normal message for explicit approval before writing it to disk — never write without approval |
| A work unit's own tests pass locally but the single final `sdd-review` Mode B still finds drift | Treat `sdd-review` Mode B as authoritative over unit-level test results; derive corrective work units from its findings, not from re-litigating unit tests |
| `plan.md` does not exist when `sdd-execute` is invoked | Unchanged from current behavior: surface "No plan.md found... Run sdd-plan first." Halt |

---

## Open Questions

_None._

## Out of Scope (Future Considerations)

- Changes to `sdd-review` Mode A
- Changes to `test-driven-development` skill content
- Changes to `data-model.md` / `contracts/api.md` template structures
- Restoring or further modifying `sdd-tasks`
- Changes to `docs/git-convention.md`
- A user-configurable follow-up-loop escalation threshold
