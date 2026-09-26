# Tasks: Improve SDD Workflow Skills

**Plan:** docs/specs/005-improve-sdd-workflow-skills/plan.md
**Generated:** 2026-04-18

> **For agentic workers:** Execute tasks in order within each phase. Phases 1–4 touch different files and can run concurrently — `[P]` marks these. Phase 0 (baseline reads) and Phase 5 (integration verification) are sequential bookends.

---

## Phase 0: Baseline Reads

*Read all target files before any edits. These can run in parallel.*

- [ ] **T001** `[P]` Read `skills/sdd-plan/SKILL.md` — note current section list and identify insertion points after Quick Reference and at end of file
- [ ] **T002** `[P]` Read `skills/sdd-tasks/SKILL.md` — note current section list and identify insertion points after Quick Reference and at end of file
- [ ] **T003** `[P]` Read `skills/sdd-execute/SKILL.md` — note current section list and identify insertion points after Quick Reference and at end of file
- [ ] **T004** `[P]` Read `skills/sdd-specify/SKILL.md` — note current section list and identify insertion points after Quick Reference and at end of file

---

## Phase 1 `[P]`: Update sdd-plan SKILL.md

*Independent of Phases 2–4. Touches only `skills/sdd-plan/SKILL.md`.*

- [ ] **T005** Insert **Scope Check** section after the HARD-GATE block, before `## When to Use`:
  ```markdown
  ## Scope Check

  If the spec covers multiple independent subsystems, suggest breaking it into sub-specs before planning. Each plan should produce working, testable software on its own.
  ```
  Verify: section appears before `## When to Use`, HARD-GATE block unchanged.

- [ ] **T006** Append **File Structure** section after `## Quick Reference`:
  ```markdown
  ## File Structure

  Before defining tasks, map every file that will be created or modified and its single responsibility. This informs task decomposition — each task should produce self-contained changes.

  - Design units with clear boundaries and one responsibility per file
  - Files that change together should live together
  - In existing codebases, follow established patterns
  ```
  Verify: section appears after Quick Reference.

- [ ] **T007** Append **No Placeholders** section after File Structure:
  ```markdown
  ## No Placeholders

  These are plan failures — never write them:
  - "TBD", "TODO", "implement later", "fill in details"
  - "Add appropriate error handling" / "handle edge cases" (without code)
  - "Write tests for the above" (without actual test code)
  - "Similar to Task N" — repeat the code; tasks may be read out of order
  - Steps that describe what to do without showing how (code blocks required for every code step)
  - References to types or functions not defined in any task
  ```
  Verify: section appears after File Structure.

- [ ] **T008** Append **Self-Review** section after No Placeholders:
  ```markdown
  ## Self-Review

  After writing the complete plan, check inline — no subagent needed:

  1. **Spec coverage** — every FR has a phase that implements it; list any gaps
  2. **Placeholder scan** — search for patterns from "No Placeholders" above; fix any found
  3. **Type consistency** — function names and signatures match across all phases

  Fix issues before presenting to user.
  ```
  Verify: section appears after No Placeholders.

- [ ] **T009** Append **Execution Handoff** section at end of file:
  ```markdown
  ## Execution Handoff

  After saving `plan.md`, offer:

  > "Plan complete. Next: run `sdd-superpowers:sdd-tasks` to generate the executable task list."
  ```
  Verify: section is last in file.

- [ ] **T010** Read `skills/sdd-plan/SKILL.md` — confirm all 5 new sections present (Scope Check, File Structure, No Placeholders, Self-Review, Execution Handoff), HARD-GATE block unchanged, no existing content removed.

- [ ] **T011** Commit:
  ```bash
  git add skills/sdd-plan/SKILL.md
  git commit -m "feat(005): add Scope Check, File Structure, No Placeholders, Self-Review, Execution Handoff to sdd-plan"
  ```

---

## Phase 2 `[P]`: Update sdd-tasks SKILL.md

*Independent of Phases 1, 3–4. Touches only `skills/sdd-tasks/SKILL.md`.*

- [ ] **T012** Append **Bite-Sized Task Granularity** section after `## Quick Reference`:
  ```markdown
  ## Bite-Sized Task Granularity

  Each step is one action (2–5 minutes):
  - "Write the failing test" — one step
  - "Run it to verify it fails" — one step
  - "Write minimal implementation" — one step
  - "Run tests to verify they pass" — one step
  - "Commit" — one step
  ```
  Verify: section appears after Quick Reference.

- [ ] **T013** Append **No Placeholders** section after Bite-Sized Task Granularity:
  ```markdown
  ## No Placeholders

  These are task failures — never write them:
  - "TBD", "TODO", "implement later"
  - "Add error handling" / "handle edge cases" (without code)
  - "Similar to Task N" — repeat the code; tasks may be read out of order
  - Steps that reference types or functions not defined in any prior task
  - Verification steps without an exact command and expected output
  ```
  Verify: section appears after Bite-Sized Task Granularity.

- [ ] **T014** Append **Remember** section after No Placeholders:
  ```markdown
  ## Remember

  - Exact file paths always — never relative or partial paths
  - Complete code in every task — show the entire function, not just changed lines
  - Exact commands with expected output — e.g. `pytest tests/foo.py::test_bar -v` / Expected: PASS
  - Every implementation step must have a prior failing test step
  ```
  Verify: section appears after No Placeholders.

- [ ] **T015** Append **Execution Handoff** section at end of file:
  ```markdown
  ## Execution Handoff

  After saving `tasks.md`, offer:

  > "Task list complete. Next: run `sdd-superpowers:sdd-execute` to begin implementation."
  ```
  Verify: section is last in file.

- [ ] **T016** Read `skills/sdd-tasks/SKILL.md` — confirm all 4 new sections present (Bite-Sized Task Granularity, No Placeholders, Remember, Execution Handoff), HARD-GATE block unchanged.

- [ ] **T017** Commit:
  ```bash
  git add skills/sdd-tasks/SKILL.md
  git commit -m "feat(005): add Bite-Sized Task Granularity, No Placeholders, Remember, Execution Handoff to sdd-tasks"
  ```

---

## Phase 3 `[P]`: Update sdd-execute SKILL.md

*Independent of Phases 1–2, 4. Touches only `skills/sdd-execute/SKILL.md`.*

- [ ] **T018** Append **When to Stop and Ask** section after `## Quick Reference`:
  ```markdown
  ## When to Stop and Ask

  **STOP executing immediately when:**
  - A dependency is missing or broken
  - A test fails repeatedly with no clear fix path
  - An instruction in the plan is unclear or contradictory
  - A plan gap prevents you from starting a task

  Ask for clarification rather than guessing. Don't force through blockers.
  ```
  Verify: section appears after Quick Reference.

- [ ] **T019** Append **Remember** section after When to Stop and Ask:
  ```markdown
  ## Remember

  - Follow plan steps exactly — don't improvise or optimize away steps
  - Don't skip verifications
  - Reference sub-skills when the plan says to
  - Stop when blocked — never guess past a blocker
  - Never start implementation on main/master without explicit user consent
  ```
  Verify: section appears after When to Stop and Ask.

- [ ] **T020** Append **Integration** section at end of file:
  ```markdown
  ## Integration

  Required sub-skills during execution:

  | When | Sub-skill |
  |------|-----------|
  | Every implementation task | `sdd-superpowers:test-driven-development` |
  | Phase boundary | `sdd-superpowers:requesting-code-review` |
  | About to claim done | `sdd-superpowers:verification-before-completion` |
  | All tasks complete | `sdd-superpowers:finishing-a-development-branch` |
  ```
  Verify: section is last in file.

- [ ] **T021** Read `skills/sdd-execute/SKILL.md` — confirm all 3 new sections present (When to Stop and Ask, Remember, Integration), HARD-GATE block unchanged.

- [ ] **T022** Commit:
  ```bash
  git add skills/sdd-execute/SKILL.md
  git commit -m "feat(005): add When to Stop and Ask, Remember, Integration to sdd-execute"
  ```

---

## Phase 4 `[P]`: Update sdd-specify SKILL.md

*Independent of Phases 1–3. Touches only `skills/sdd-specify/SKILL.md`.*

- [ ] **T023** Append **Remember** section after `## Quick Reference`:
  ```markdown
  ## Remember

  - Requirements describe WHAT, never HOW — no technology mentions in the spec
  - Every acceptance criterion must be testable (convertible to a passing/failing test)
  - Use `[NEEDS CLARIFICATION]` over vague text — never leave ambiguity unmarked
  ```
  Verify: section appears after Quick Reference.

- [ ] **T024** Append **Self-Review** section at end of file:
  ```markdown
  ## Self-Review

  After writing the spec, check inline — no subagent needed:

  1. **Testability** — every acceptance criterion can become a passing/failing test
  2. **No placeholders** — no vague text; `[NEEDS CLARIFICATION]` used where needed
  3. **Goals vs Non-Goals** — each item is in the right section
  4. **Open Questions** — all unknowns explicitly captured

  Fix issues before presenting the spec to the user.
  ```
  Verify: section is last in file.

- [ ] **T025** Read `skills/sdd-specify/SKILL.md` — confirm both new sections present (Remember, Self-Review), HARD-GATE block unchanged.

- [ ] **T026** Commit:
  ```bash
  git add skills/sdd-specify/SKILL.md
  git commit -m "feat(005): add Remember, Self-Review to sdd-specify"
  ```

---

## Phase 5 `[P]`: Update sdd-specify SKILL.md — Status Prompt

*Independent of Phase 6. Touches only `skills/sdd-specify/SKILL.md`.*

- [ ] **T027** In `skills/sdd-specify/SKILL.md`, append to the existing **Self-Review** section (or after it if Self-Review was just added in Phase 4):
  ```markdown
  After the user approves the spec, update `Status: Draft` → `Status: Approved` in spec.md before handing off to sdd-plan.
  ```
  Verify: status-update prompt appears in sdd-specify SKILL.md.

- [ ] **T028** Commit:
  ```bash
  git add skills/sdd-specify/SKILL.md
  git commit -m "feat(005): prompt status update to Approved in sdd-specify"
  ```

---

## Phase 6 `[P]`: Add Status Gate to sdd-plan and sdd-tasks HARD-GATEs

*Independent of Phase 5. Touches `skills/sdd-plan/SKILL.md` and `skills/sdd-tasks/SKILL.md`.*

- [ ] **T029** In `skills/sdd-plan/SKILL.md`, add to the HARD-GATE block a new condition:
  ```markdown
  4. `spec.md` status is `Approved` (not `Draft`)
  ```
  Verify: condition 4 appears inside the HARD-GATE block, existing conditions 1–3 unchanged.

- [ ] **T030** In `skills/sdd-tasks/SKILL.md`, add to the HARD-GATE block a new condition:
  ```markdown
  3. `spec.md` status is `Approved` (not `Draft`)
  ```
  Verify: condition 3 appears inside the HARD-GATE block, existing conditions 1–2 unchanged.

- [ ] **T031** Commit:
  ```bash
  git add skills/sdd-plan/SKILL.md skills/sdd-tasks/SKILL.md
  git commit -m "feat(005): add spec status Approved gate to sdd-plan and sdd-tasks"
  ```

---

## Phase 7: Integration Verification

*Run after all parallel phases complete.*

- [ ] **T032** Read `skills/sdd-plan/SKILL.md` — verify: Scope Check, File Structure, No Placeholders, Self-Review, Execution Handoff all present; HARD-GATE has 4 conditions including status check; Quick Reference unchanged
- [ ] **T033** Read `skills/sdd-tasks/SKILL.md` — verify: Bite-Sized Task Granularity, No Placeholders, Remember, Execution Handoff all present; HARD-GATE has 3 conditions including status check; Quick Reference unchanged
- [ ] **T034** Read `skills/sdd-execute/SKILL.md` — verify: When to Stop and Ask, Remember, Integration all present; HARD-GATE block intact; Quick Reference unchanged
- [ ] **T035** Read `skills/sdd-specify/SKILL.md` — verify: Remember, Self-Review both present with status-update prompt; HARD-GATE block intact; Quick Reference unchanged

---

## Task Summary

| Range | Phase | Parallelizable? |
|-------|-------|-----------------|
| T001–T004 | Baseline reads | Yes (within group) |
| T005–T011 | sdd-plan edits | Yes (vs Phases 2–4) |
| T012–T017 | sdd-tasks edits | Yes (vs Phases 1, 3–4) |
| T018–T022 | sdd-execute edits | Yes (vs Phases 1–2, 4) |
| T023–T026 | sdd-specify edits | Yes (vs Phases 1–3) |
| T027–T030 | Integration verification | No (sequential bookend) |

**Total tasks:** 30
**Parallelizable:** T001–T004 (4 reads), Phases 1–4 edit groups (parallel across phases)
