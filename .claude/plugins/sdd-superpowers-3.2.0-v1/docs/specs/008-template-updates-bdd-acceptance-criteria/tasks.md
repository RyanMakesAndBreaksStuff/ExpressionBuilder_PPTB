# Tasks: Template Updates — BDD Acceptance Criteria and Best Practices

**Plan:** docs/specs/008-template-updates-bdd-acceptance-criteria/plan.md
**Generated:** 2026-04-20

> **For agentic workers:** Execute tasks in order within each phase. Phases 1, 2, and 3 are independent and can run concurrently — they touch different files. Phase 4 (consistency check) must run after all three are complete. `[P]` marks tasks safe to parallelize.

---

## Parallel Group: Phases 1 + 2 + 3 (independent files)

Phases 1, 2, and 3 each target a different `reference.md` file. Dispatch them concurrently.

---

## Phase 1: skills/sdd-specify/reference.md

*Satisfies: AC-1.1, AC-1.2, AC-1.3, AC-4.1*

- [ ] **T001** `[P]` In `skills/sdd-specify/reference.md`, locate the spec.md template's User Stories section (around the `**Acceptance criteria:**` block in Step 4). Replace the existing acceptance-criteria placeholder block:
  ```markdown
  **Acceptance criteria:**
  - [ ] <Specific, testable outcome>
  - [ ] <Specific, testable outcome>
  - [ ] <Specific, testable outcome>
  ```
  With the BDD format:
  ```markdown
  **Acceptance criteria:**
  - [ ] **AC-1.1** Given <precondition / system state> When <user action or event> Then <observable, verifiable outcome>
  - [ ] **AC-1.2** Given <precondition> When <action> Then <outcome>
  ```

- [ ] **T002** `[P]` In `skills/sdd-specify/reference.md`, insert a new `## BDD Acceptance Criteria Rules` section immediately after the closing ` ``` ` of the spec.md template block (before `## Step 5: Self-Review`). Content to insert:
  ```markdown
  ## BDD Acceptance Criteria Rules

  Each acceptance criterion must follow the `Given / When / Then` format:

  - **Given** — the precondition or system state before the action
  - **When** — the user action, API call, or event that triggers the behavior
  - **Then** — the observable, verifiable outcome (what a test would assert)

  AC IDs follow `AC-<story_number>.<criterion_sequence>` (e.g., Story 1 → `AC-1.1`, `AC-1.2`; Story 2 → `AC-2.1`).

  **Valid example:**
  - [ ] **AC-1.1** Given a user is on the login page with valid credentials When they submit the login form Then they are redirected to the dashboard and a session token is set

  **Anti-patterns (fix before approval):**

  | Anti-pattern | Problem | Correction |
  |---|---|---|
  | "The system handles errors correctly" | No Given, no When, unobservable Then | Add all three clauses; name the specific error and expected response |
  | "Given a user When they click Then it works" | Then is not verifiable | Replace "it works" with a concrete, assertable outcome |
  | "Given <state> When <action> Then the user is happy" | Non-observable outcome | Replace with a measurable UI change, response code, or data state |
  | Criterion with only Then ("The page loads in under 2s") | Missing Given and When | Specify starting state and triggering action |

  ```

- [ ] **T003** `[P]` In `skills/sdd-specify/reference.md`, find Step 5: Self-Review. Add a BDD completeness check to the **Testability check** item (or as a new bullet after it):
  ```markdown
  **BDD completeness:** Does every acceptance criterion have all three clauses (Given, When, Then) and an `AC-N.M` ID? If not, rewrite before approval.
  ```

- [ ] **T004** `[P]` Verify Phase 1 changes: read `skills/sdd-specify/reference.md` and confirm:
  - The spec.md template User Stories section shows `AC-1.1` style IDs with inline `Given / When / Then`
  - A `## BDD Acceptance Criteria Rules` section exists with a valid example and anti-patterns table
  - Step 5: Self-Review contains the BDD completeness check

---

## Phase 2: skills/sdd-plan/reference.md

*Satisfies: AC-2.1, AC-2.2, AC-2.3, AC-4.2*

- [ ] **T005** `[P]` In `skills/sdd-plan/reference.md`, locate the plan.md template's Phase 1 header in Step 4. Replace:
  ```markdown
  ## Phase 1: <First Component>

  **Implements:** FR-1, FR-2
  **Files:** `src/path/file.ts`, `tests/path/test.ts`
  ```
  With:
  ```markdown
  ## Phase 1: <First Component>

  **Implements:** FR-1, FR-2 | **Satisfies:** AC-1.1, AC-1.2
  **Files:** `src/path/file.ts`, `tests/path/test.ts`
  ```
  Apply the same `| **Satisfies:** AC-N.M, AC-P.Q` addition to Phase 0 and Phase N headers in the template.

- [ ] **T006** `[P]` In `skills/sdd-plan/reference.md`, locate the Phase 0 contract test step in the template. Replace:
  ```markdown
  - [ ] Write contract test for <API endpoint/event>: verify request shape, response shape, error codes
  ```
  With:
  ```markdown
  - [ ] Write contract test for <API endpoint/event>: verify request shape, response shape, error codes (targets AC-N.M)
  ```

- [ ] **T007** `[P]` In `skills/sdd-plan/reference.md`, locate Step 5: Self-Review. Find the **Spec coverage** line and replace it:

  Current:
  ```markdown
  **Spec coverage:** For each functional requirement in the spec, can you point to a specific phase/task in the plan that implements it? List gaps.
  ```
  Replace with:
  ```markdown
  **Spec coverage:** For each FR in the spec, can you point to a specific phase that implements it? For each acceptance criterion (`AC-N.M`) in the spec, can you point to a phase that satisfies it? List any unmapped FRs or ACs as gaps — they must be covered before planning is complete.
  ```

- [ ] **T008** `[P]` In `skills/sdd-plan/reference.md`, locate the `## Plan Quality Rules` section. Add a new rule at the top of that section:
  ```markdown
  **AC traceability in phase headers:**
  Every phase header must include a `| **Satisfies:** AC-N.M, AC-P.Q` clause listing the spec acceptance criteria it delivers. Use the same `AC-N.M` IDs from `spec.md`. Example:
  `**Implements:** FR-1, FR-2 | **Satisfies:** AC-1.1, AC-2.3`

  ```

- [ ] **T009** `[P]` Verify Phase 2 changes: read `skills/sdd-plan/reference.md` and confirm:
  - Phase 1 template header shows `| **Satisfies:** AC-1.1, AC-1.2`
  - Phase 0 contract test step includes `(targets AC-N.M)`
  - Step 5 Spec coverage check mentions `AC-N.M` coverage
  - Plan Quality Rules section opens with the AC traceability rule

---

## Phase 3: skills/sdd-tasks/reference.md

*Satisfies: AC-3.1, AC-3.2, AC-3.3, AC-4.3*

- [ ] **T010** `[P]` In `skills/sdd-tasks/reference.md`, locate the tasks.md template's integration phase section. Replace:
  ```markdown
  - [ ] **TNNN** Verify acceptance criterion 1: <exact verification step>
  ```
  With:
  ```markdown
  - [ ] **TNNN** Verify AC-1.1: Given <precondition> When <action> Then confirm <outcome> — run `<exact command or UI step>`
  ```

- [ ] **T011** `[P]` In `skills/sdd-tasks/reference.md`, locate the Task Summary table in the tasks.md template. Replace:
  ```markdown
  | Range | Phase | Can Parallelize? |
  |-------|-------|-----------------|
  | T001–T002 | Setup & Contracts | Yes (within group) |
  | T003–T007 | <Phase 1> | No (sequential) |
  ```
  With:
  ```markdown
  | Range | Phase | Can Parallelize? | Spec ACs Covered |
  |-------|-------|-----------------|-----------------|
  | T001–T002 | Setup & Contracts | Yes (within group) | — |
  | T003–T007 | <Phase 1> | No (sequential) | AC-1.1, AC-1.2 |
  ```

- [ ] **T012** `[P]` In `skills/sdd-tasks/reference.md`, locate Step 4: Validate the Task List. Add a new `**Verification task format:**` block at the end of that section:
  ```markdown
  **Verification task format:** Every task that verifies an acceptance criterion must:
  - Cite the AC ID from spec.md (e.g., `AC-1.1`)
  - Reproduce the Given/When/Then text from the spec criterion inline
  - Name the exact command or UI steps to confirm the outcome

  Example:
  - [ ] **T012** Verify AC-2.1: Given the user has no active session When they visit `/dashboard` Then confirm they are redirected to `/login` — run `curl -I http://localhost:3000/dashboard` and assert `Location: /login` in response headers
  ```

- [ ] **T013** `[P]` Verify Phase 3 changes: read `skills/sdd-tasks/reference.md` and confirm:
  - Integration phase verification task shows `Verify AC-1.1: Given ... When ... Then confirm ...`
  - Task Summary table has a "Spec ACs Covered" column
  - Step 4 ends with the verification task format block and example

---

## Sequential: Phase 4 — Cross-File Consistency Check

*All of Phases 1, 2, 3 must be complete before starting.*

- [ ] **T014** Read all three updated files (`skills/sdd-specify/reference.md`, `skills/sdd-plan/reference.md`, `skills/sdd-tasks/reference.md`) and verify:
  - AC ID format is identical (`AC-N.M`) in all three templates
  - BDD clause labels (`Given`, `When`, `Then`) are spelled and capitalized identically across all three
  - No stray placeholder text remains outside of intentional `<angle-bracket>` template slots

- [ ] **T015** Commit all changes: `git add skills/sdd-specify/reference.md skills/sdd-plan/reference.md skills/sdd-tasks/reference.md && git commit -m "feat: update spec/plan/tasks templates with BDD acceptance criteria and AC traceability"`

---

## Task Summary

| Range | Phase | Can Parallelize? | Spec ACs Covered |
|-------|-------|-----------------|-----------------|
| T001–T004 | sdd-specify/reference.md | Yes (within phase) | AC-1.1, AC-1.2, AC-1.3, AC-4.1 |
| T005–T009 | sdd-plan/reference.md | Yes (within phase) | AC-2.1, AC-2.2, AC-2.3, AC-4.2 |
| T010–T013 | sdd-tasks/reference.md | Yes (within phase) | AC-3.1, AC-3.2, AC-3.3, AC-4.3 |
| T014–T015 | Cross-file consistency + commit | No (sequential) | FR-5 |

**Total tasks:** 15
**Estimated parallel speedup:** ~3x (T001–T013 fully parallelizable across three phases)
