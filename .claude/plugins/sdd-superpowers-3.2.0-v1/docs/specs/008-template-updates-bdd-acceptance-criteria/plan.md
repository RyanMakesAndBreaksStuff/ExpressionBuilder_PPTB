# Implementation Plan: Template Updates — BDD Acceptance Criteria and Best Practices

> **For agentic workers:** Use sdd-tasks to generate an executable task list from this plan.

**Spec:** docs/specs/008-template-updates-bdd-acceptance-criteria/spec.md
**Created:** 2026-04-20

---

## Goal

Update the `spec.md`, `plan.md`, and `tasks.md` embedded templates in the three SDD skill reference files so that acceptance criteria follow BDD `Given / When / Then` format with `AC-N.M` IDs, plan phase headers reference those IDs, and task verification steps cite them — making all three documents form a traceable chain.

## Architecture

This is a pure documentation update — no runtime code, no new skills, no tests. All work consists of targeted edits to three existing `reference.md` files inside `skills/`. Each file is independent; they can be edited in any order or in parallel. The only shared constraint is AC ID format consistency (`AC-N.M`) which must be identical across all three templates.

## Tech Stack

Not applicable — documentation only.

## File Structure

- `skills/sdd-specify/reference.md` — spec.md template (User Stories section) + new BDD Rules section
- `skills/sdd-plan/reference.md` — plan.md template (phase headers) + self-review AC coverage step
- `skills/sdd-tasks/reference.md` — tasks.md template (verification tasks + Task Summary table) + verification task rules section

## Complexity Tracking

(Empty — all pre-implementation gates passed. Documentation-only change.)

---

## Phase 1: sdd-specify/reference.md — BDD Template and Rules

**Implements:** FR-1, FR-2 | **Satisfies:** AC-1.1, AC-1.2, AC-1.3, AC-4.1

### 1.1 Update spec.md template: User Stories acceptance-criteria block

Replace the flat-checkbox acceptance-criteria block in the spec.md template with BDD format.

Current template block (inside User Stories):
```markdown
**Acceptance criteria:**
- [ ] <Specific, testable outcome>
- [ ] <Specific, testable outcome>
- [ ] <Specific, testable outcome>
```

Replace with:
```markdown
**Acceptance criteria:**
- [ ] **AC-1.1** Given <precondition / system state> When <user action or event> Then <observable, verifiable outcome>
- [ ] **AC-1.2** Given <precondition> When <action> Then <outcome>
```

Rules:
- AC IDs follow `AC-<story_number>.<criterion_sequence>` (Story 1 → AC-1.1, AC-1.2; Story 2 → AC-2.1, etc.)
- All three clauses (Given, When, Then) are inline on a single line, bold-labeled
- Every criterion must have all three clauses — omitting any is a self-review failure

### 1.2 Add BDD Acceptance Criteria Rules section to sdd-specify/reference.md

Insert a new "BDD Acceptance Criteria Rules" section immediately after the spec.md template (before Step 5: Self-Review).

Content:
```markdown
## BDD Acceptance Criteria Rules

Each acceptance criterion must follow the `Given / When / Then` format:

- **Given** — the precondition or system state before the action
- **When** — the user action, API call, or event that triggers the behavior
- **Then** — the observable, verifiable outcome (what a test would assert)

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

### 1.3 Update Self-Review checklist in sdd-specify/reference.md

In Step 5: Self-Review, add a BDD completeness check:

Add to the **Testability check** item (or as a new bullet):
> **BDD completeness:** Does every acceptance criterion have all three clauses (Given, When, Then) and an AC-N.M ID? If not, rewrite before approval.

---

## Phase 2: sdd-plan/reference.md — Phase Headers and AC Coverage

**Implements:** FR-3 | **Satisfies:** AC-2.1, AC-2.2, AC-2.3, AC-4.2

### 2.1 Update plan.md template: phase headers to include AC references

Current phase header format in the template:
```markdown
## Phase 1: <First Component>

**Implements:** FR-1, FR-2
**Files:** `src/path/file.ts`, `tests/path/test.ts`
```

Replace with:
```markdown
## Phase 1: <First Component>

**Implements:** FR-1, FR-2 | **Satisfies:** AC-1.1, AC-1.2
**Files:** `src/path/file.ts`, `tests/path/test.ts`
```

Apply the same change to Phase 0 and Phase N headers in the template.

### 2.2 Update Phase 0 template to list AC targets per contract test

In the Phase 0 template block, update the contract test step:

Current:
```markdown
- [ ] Write contract test for <API endpoint/event>: verify request shape, response shape, error codes
```

Replace with:
```markdown
- [ ] Write contract test for <API endpoint/event>: verify request shape, response shape, error codes (targets AC-N.M)
```

### 2.3 Update Self-Review step in sdd-plan/reference.md: AC coverage check

In Step 5: Self-Review, update the **Spec coverage** check:

Current:
> **Spec coverage:** For each functional requirement in the spec, can you point to a specific phase/task in the plan that implements it? List gaps.

Replace with:
> **Spec coverage:** For each FR in the spec, can you point to a specific phase that implements it? For each acceptance criterion (AC-N.M) in the spec, can you point to a phase that satisfies it? List any unmapped FRs or ACs as gaps — they must be covered before planning is complete.

### 2.4 Add AC reference format note to sdd-plan/reference.md

Add a short note in the Plan Quality Rules section (or immediately before the template):

```markdown
**AC traceability in phase headers:**
Every phase header must include a `| **Satisfies:** AC-N.M, AC-P.Q` clause listing the spec acceptance criteria it delivers. Use the same `AC-N.M` IDs from `spec.md`. Example:
`**Implements:** FR-1, FR-2 | **Satisfies:** AC-1.1, AC-2.3`
```

---

## Phase 3: sdd-tasks/reference.md — Verification Tasks and Task Summary

**Implements:** FR-4, FR-5 | **Satisfies:** AC-3.1, AC-3.2, AC-3.3, AC-4.3

### 3.1 Update tasks.md template: integration-phase verification tasks

In the Sequential: Phase N — Integration section of the tasks.md template, replace:

Current:
```markdown
- [ ] **TNNN** Verify acceptance criterion 1: <exact verification step>
```

Replace with:
```markdown
- [ ] **TNNN** Verify AC-1.1: Given <precondition> When <action> Then confirm <outcome> — run `<exact command or UI step>`
```

### 3.2 Update tasks.md template: Task Summary table

Add a "Spec ACs Covered" column to the Task Summary table:

Current:
```markdown
| Range | Phase | Can Parallelize? |
|-------|-------|-----------------|
| T001–T002 | Setup & Contracts | Yes (within group) |
| T003–T007 | <Phase 1> | No (sequential) |
```

Replace with:
```markdown
| Range | Phase | Can Parallelize? | Spec ACs Covered |
|-------|-------|-----------------|-----------------|
| T001–T002 | Setup & Contracts | Yes (within group) | — |
| T003–T007 | <Phase 1> | No (sequential) | AC-1.1, AC-1.2 |
```

### 3.3 Add verification task rules to sdd-tasks/reference.md

Add a new "Verification Task Rules" subsection in Step 4: Validate the Task List:

```markdown
**Verification task format:** Every task that verifies an acceptance criterion must:
- Cite the AC ID from spec.md (e.g., `AC-1.1`)
- Reproduce the Given/When/Then text from the spec criterion inline
- Name the exact command or UI steps to confirm the outcome

Example:
- [ ] **T012** Verify AC-2.1: Given the user has no active session When they visit `/dashboard` Then confirm they are redirected to `/login` — run `curl -I http://localhost:3000/dashboard` and assert `Location: /login` in response headers
```

---

## Phase 4: Integration Verification

**Implements:** FR-5 | **Satisfies:** AC-1.1, AC-2.1, AC-3.1 (cross-document consistency)

- [ ] Read all three updated reference.md files and confirm AC ID format is identical (`AC-N.M`) across all three templates
- [ ] Confirm that the BDD clause labels (`Given`, `When`, `Then`) are spelled and formatted identically in spec, plan, and tasks templates
- [ ] Confirm no placeholder text remains in any updated section (no `<precondition>` etc. outside template placeholders)

---

## Quickstart Validation

After all edits are applied:
1. Open `skills/sdd-specify/reference.md` → find the spec.md template → verify User Stories section shows `AC-1.1` style IDs and inline BDD format
2. Open `skills/sdd-plan/reference.md` → find Phase 1 template header → verify it shows `| **Satisfies:** AC-1.1, AC-1.2`
3. Open `skills/sdd-tasks/reference.md` → find Phase N Integration section → verify verification task shows `Verify AC-1.1: Given ... When ... Then confirm ...`
4. Confirm AC IDs use the same `AC-N.M` numbering scheme in all three files
