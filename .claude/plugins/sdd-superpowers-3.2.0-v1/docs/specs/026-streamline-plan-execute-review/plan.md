# Implementation Plan: Streamline Plan and Execute Review Lifecycle

**Spec:** docs/specs/026-streamline-plan-execute-review/spec.md
**Created:** 2026-08-15

---

## Goal

Collapse the SDD lifecycle to a compact, Plan-Mode-driven `plan.md`, TDD-only execution with zero per-unit/per-phase review, and exactly one bounded spec-alignment review at the end.

---

## Phase 0: Amend spec Non-Goals

**Implements:** (spec process) | **Satisfies:** enables FR-12–FR-15
**Files:** `docs/specs/026-streamline-plan-execute-review/spec.md`

Per-unit review turned out to be a core, documented behavior of `subagent-driven-development` and `dispatching-parallel-agents` themselves, not just something `sdd-execute` layers on top. Amend the approved spec's Non-Goals (narrow to just `test-driven-development`) and add FR-12–FR-15 covering those two skills plus `requesting-code-review`/`receiving-code-review`, before touching any skill file.

- [x] Grep confirms the old Non-Goals wording exists (RED)
- [x] Replace the Non-Goals bullet and Out of Scope duplicate; add the Amendment note and FR-12–FR-15
- [x] Grep confirms new wording present, old wording absent (GREEN)
- [x] Commit: `docs(026-streamline-plan-execute-review): amend spec Non-Goals and add FR-12..FR-15`

---

## Phase 1: subagent-driven-development drops two-stage review

**Implements:** FR-12 | **Satisfies:** AC-2.1, AC-2.2, AC-2.4, AC-2.5
**Files:** `skills/subagent-driven-development/SKILL.md`, `skills/subagent-driven-development/spec-reviewer-prompt.md` (delete), `skills/subagent-driven-development/code-quality-reviewer-prompt.md` (delete)

TDD (red-green-refactor) becomes the only quality gate per unit. Rewrite Overview/Core Principle, the Process diagram, Quality Gates, Red Flags, the worked example, and Integration to remove the spec-compliance/code-quality reviewer dispatch; delete the now-orphaned prompt templates.

- [x] Grep confirms "spec compliance"/"code quality"/reviewer-prompt references exist (RED)
- [x] Rewrite SKILL.md; delete both prompt files
- [x] Grep confirms zero remaining references (GREEN)
- [x] Commit: `refactor(subagent-driven-development): drop per-unit two-stage review`

---

## Phase 2: dispatching-parallel-agents drops two-stage review

**Implements:** FR-13 | **Satisfies:** AC-2.5
**Files:** `skills/dispatching-parallel-agents/SKILL.md`, `skills/dispatching-parallel-agents/reference.md`

Mirror Phase 1 for the parallel-group path: each unit commits directly once its own tests pass; no spec-compliance/code-quality dispatch after the group returns.

- [x] Grep confirms "spec compliance review per"/"code quality review per" exist (RED)
- [x] Edit both files' post-dispatch procedure and Quick Reference/Integration
- [x] Grep confirms zero remaining references (GREEN)
- [x] Commit: `refactor(dispatching-parallel-agents): drop per-unit two-stage review`

---

## Phase 3: requesting-code-review / receiving-code-review rescoped

**Implements:** FR-14, FR-15 | **Satisfies:** AC-2.4
**Files:** `skills/requesting-code-review/SKILL.md`, `skills/receiving-code-review/SKILL.md`

`requesting-code-review` stays alive for ad hoc ("review this") and standalone pre-merge use — confirmed via grep that nothing else's Integration table calls it. Remove its three mandatory triggers tied to the removed flows. Update `receiving-code-review`'s trigger list to point at `sdd-review` Mode B follow-up findings and `requesting-code-review`'s ad hoc output instead.

- [x] Grep confirms old mandatory-trigger wording exists (RED)
- [x] Edit both SKILL.md files
- [x] Grep confirms zero remaining references (GREEN)
- [x] Commit: `refactor(requesting-code-review,receiving-code-review): scope to ad hoc use`

---

## Phase 4: sdd-execute — TDD-only, single bounded follow-up review

**Implements:** FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, FR-11 | **Satisfies:** AC-2.1–AC-2.5, AC-3.1–AC-3.3, AC-4.1–AC-4.3
**Files:** `skills/sdd-execute/SKILL.md`, `skills/sdd-execute/reference.md`

Remove per-unit spec-compliance review (3c), code-quality review (3d), and phase-boundary review (3f) from the execution flow — commit follows directly after DONE. Add Step 4b: a bounded follow-up loop after the single `sdd-review` Mode B dispatch — on `DRIFT DETECTED`/`INCOMPLETE`, derive fixes, re-dispatch, re-run; escalate to the user if the same AC is unresolved in 2 of the last 3 rounds (catches oscillation, not just back-to-back repeats — widened after code review).

- [x] Grep confirms "spec-compliance review"/"code-quality review"/"phase boundary" exist (RED)
- [x] Edit Quick Reference flow diagram, Integration table, status-handling table (SKILL.md); delete 3c/3d/3f, add Step 4b (reference.md)
- [x] Grep confirms zero remaining references outside the explicit negation sentence in Step 4b (GREEN)
- [x] Commit: `refactor(sdd-execute): TDD-only execution, single bounded follow-up review`

---

## Phase 5: sdd-plan — Plan Mode entry, compact template

**Implements:** FR-1, FR-2 | **Satisfies:** AC-1.1–AC-1.5
**Files:** `skills/sdd-plan/SKILL.md`, `skills/sdd-plan/reference.md`, `skills/sdd-plan/template.md`

Add `EnterPlanMode` before drafting and `ExitPlanMode` before writing `plan.md` to disk. Rewrite `template.md`: drop standalone Architecture/Tech Stack/File Structure sections; each phase becomes header (`Implements`/`Satisfies`/`Files`) + short goal + code, with Complexity Tracking as an optional per-phase note.

- [x] Grep confirms no `EnterPlanMode`/`ExitPlanMode` references exist yet (RED)
- [x] Edit SKILL.md (Quick Reference), reference.md (Step 0.5 entry, Step 4 exit, Step 5 structural-compliance check), rewrite template.md
- [x] Grep confirms `EnterPlanMode`/`ExitPlanMode` present, no stray top-level Architecture/Tech Stack/File Structure headings in template.md (GREEN)
- [x] Commit: `refactor(sdd-plan): enter Plan Mode, compact per-phase plan template`

---

## Phase 6: sdd-workflow routing updated

**Implements:** FR-10 | **Satisfies:** AC-2.3
**Files:** `skills/sdd-workflow/SKILL.md`, `skills/sdd-workflow/routing.md`

Drop the "OR at any phase boundary" clause and the stale phase-boundary routing row/mandatory-trigger bullets; update `receiving-code-review`'s mandatory-trigger bullet to match Phase 3.

- [x] Grep confirms "phase boundary" references exist (RED)
- [x] Edit SKILL.md Quick Reference row and routing.md's table + mandatory-trigger bullets
- [x] Grep confirms zero remaining references (GREEN)
- [x] Commit: `refactor(sdd-workflow): stop routing to phase-boundary review`

---

## Phase 7: Integration Verification

**Implements:** All FRs | **Satisfies:** All ACs

- [x] Run: `grep -rn "spec-compliance review\|code-quality review\|phase boundary" skills/` — zero hits (the first pass here was case-sensitive and missed a capitalized table — see Phase 8)
- [x] Run: `grep -rln "spec-reviewer-prompt\|code-quality-reviewer-prompt" skills/` — zero hits
- [x] Spot-check frontmatter (`name`, `description`) on every edited SKILL.md
- [x] Build the FR/AC coverage matrix against this plan's phases (Story 1–4 in spec.md) — confirm every AC maps to a phase above
- [x] Commit: `docs(026-streamline-plan-execute-review): add plan`

---

## Phase 8: Post-review fixes

**Implements:** FR-1, FR-2, FR-3, FR-4, FR-8, FR-12, FR-14, FR-15 | **Satisfies:** AC-1.1, AC-1.2, AC-2.1, AC-2.2, AC-4.2
**Files:** `skills/receiving-code-review/reference.md`, `skills/sdd-plan/reference.md`, `skills/sdd-plan/SKILL.md`, `skills/sdd-execute/reference.md`, `skills/sdd-execute/SKILL.md`, `skills/requesting-code-review/code-reviewer.md`, `skills/requesting-code-review/SKILL.md`, `docs/specs/026-streamline-plan-execute-review/spec.md`

`requesting-code-review` dispatched a code-review subagent against the Phase 0–7 diff. It found: (1) `receiving-code-review/reference.md` — a "required reading" companion file that Phase 3 never listed — still described the deleted per-unit reviewer flow in detail; (2) `sdd-plan/reference.md`'s user-facing handoff message still said "two-stage review"; (3) `sdd-execute/reference.md`'s Model Selection Guide table used capitalized "Spec-compliance review"/"Code-quality review" rows that survived the case-sensitive Phase 7 grep; (4) `requesting-code-review/code-reviewer.md`'s actual reviewer prompt still assumed spec compliance had already passed, no longer true now that this skill is ad hoc/standalone; (5) a frontmatter/body contradiction I introduced in Phase 3 (`requesting-code-review/SKILL.md` calling pre-merge review "optional" while the body still marks it "Mandatory"). It also found a genuine design gap in FR-8's escalation rule: "unresolved 2 consecutive rounds" never triggers if the same AC oscillates (resolved, then unresolved, then resolved...) rather than repeating back-to-back, which could violate NFR-3's no-indefinite-looping guarantee. Per user decision, widened FR-8/NFR-3/AC-4.2 in spec.md to "unresolved in 2 of the last 3 rounds" and updated Step 4b accordingly.

- [x] Fix all 4 stale/contradictory file:line references found by review
- [x] Amend spec.md's FR-8, NFR-3, AC-4.2, Error Scenarios row, and Goals bullet to the 2-of-3-rounds rule
- [x] Update `sdd-execute/reference.md` Step 4b and `SKILL.md`'s flow-diagram line to track the last 3 rounds' unresolved-AC sets instead of just the immediately preceding round
- [x] Add the Plan-Mode-unavailable fallback (spec's own Error Scenarios row, never implemented) to `sdd-plan/SKILL.md` Error Handling and `reference.md`
- [x] Re-run the verification grep case-insensitively (`grep -rniE`) across all of `skills/` — zero hits outside the known out-of-scope `sdd-tasks/reference.md:105` (spec 026's Non-Goals exclude touching `sdd-tasks` further) and this plan's own historical note
- [ ] Commit: `docs(026-streamline-plan-execute-review): apply code review fixes`

---

## Quickstart Validation

1. Open `skills/sdd-execute/SKILL.md` and confirm the Quick Reference execution flow shows no per-unit/phase review steps and describes the bounded follow-up loop.
2. Open `skills/sdd-plan/template.md` and confirm a phase has only a header + goal + code — no Architecture/Tech Stack/File Structure heading.
3. Open `skills/subagent-driven-development/SKILL.md` and confirm the Process diagram has no reviewer-subagent nodes.
4. `grep -rn "EnterPlanMode\|ExitPlanMode" skills/sdd-plan/` returns hits in both SKILL.md and reference.md.
