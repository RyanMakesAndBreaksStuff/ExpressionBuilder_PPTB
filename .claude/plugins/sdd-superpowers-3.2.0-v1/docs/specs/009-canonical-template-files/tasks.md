# Tasks: Canonical Template Files for SDD Skills

**Plan:** docs/specs/009-canonical-template-files/plan.md
**Generated:** 2026-05-30

> **For agentic workers:** Execute tasks in order. `[P]` tasks within the same parallel group can run concurrently. Never start a task that depends on another until that dependency is complete.

---

## Parallel Group 1: Create Template Files

All seven tasks touch different files — safe to run concurrently.

- [ ] **T001** `[P]` Create `skills/sdd-specify/template.md` with this exact content:

  ```markdown
  # Feature NNN: <Feature Name>

  **Status:** Draft
  **Created:** YYYY-MM-DD
  **Branch:** `NNN-<feature-slug>`

  ---

  ## Problem Statement

  <Clear description of the problem being solved. Focus on the WHY — what user pain or business need drives this? 2-4 sentences.>

  ## Goals

  - <Specific, measurable goal>
  - <Specific, measurable goal>

  ## Non-Goals

  - <What this feature explicitly does NOT do>
  - <Scope boundary that prevents scope creep>

  ## Users and Context

  **Primary users:** <Who uses this feature>
  **Secondary users:** <Who else is affected (optional)>
  **Usage context:** <When and how they use it>
  **User mental model:** <What users expect, their vocabulary>

  ## User Stories

  ### Story 1: <Name>

  **As a** <type of user>
  **I want** <to perform some action>
  **So that** <I achieve some goal>

  **Acceptance criteria:**

  - [ ] **AC-1.1** Given <precondition / system state> When <user action or event> Then <observable, verifiable outcome>
  - [ ] **AC-1.2** Given <precondition> When <action> Then <outcome>

  ### Story 2: <Name>

  ...

  ## Functional Requirements

  ### FR-1: <Requirement Name>

  <Description of what the system must do. Focus on WHAT, not HOW.>

  **Must:**
  - <Specific behavior>

  **Must not:**
  - <Explicit prohibition>

  ### FR-2: <Requirement Name>

  ...

  ## Non-Functional Requirements

  ### Performance

  - <Response time targets, throughput requirements>

  ### Security

  - <Authentication, authorization, data protection requirements>

  ### Reliability

  - <Availability, error handling, recovery requirements>

  ## Error Scenarios

  | Scenario | Expected Behavior |
  |----------|-------------------|
  | <What goes wrong> | <What the system should do> |

  ## Open Questions

  - [NEEDS CLARIFICATION: <specific question about ambiguous requirement>]

  ## Out of Scope (Future Considerations)

  - <Feature that was discussed but explicitly deferred>
  ```

- [ ] **T002** `[P]` Create `skills/sdd-plan/template.md` with this exact content:

  ```markdown
  # Implementation Plan: <Feature Name>

  > **For agentic workers:** Use sdd-tasks to generate an executable task list from this plan.

  **Spec:** docs/specs/<NNN>-<feature-slug>/spec.md
  **Research:** docs/specs/<NNN>-<feature-slug>/research.md (if applicable)
  **Created:** YYYY-MM-DD

  ---

  ## Goal

  <One sentence: what working software this plan produces.>

  ## Architecture

  <2-4 sentences describing the technical approach. Reference key decisions from research.md. Every sentence should connect to a spec requirement.>

  ## Tech Stack

  | Layer | Technology | Justification |
  |-------|-----------|---------------|
  | <layer> | <tech> | <spec/research rationale> |

  ## File Structure

  - `src/path/to/file.ts` — <responsibility>
  - `src/path/to/other.ts` — <responsibility>
  - `tests/path/to/test.ts` — <what it tests>

  ## Complexity Tracking

  <If any Pre-Implementation Gate failed, document here:>
  - **Gate:** <which gate>
  - **Violation:** <what complexity was added>
  - **Justification:** <specific spec requirement that forced it>

  (Empty section = all gates passed)

  ---

  ## Phase 0: Contracts and Tests First

  **Principle:** Define contracts and write tests before any implementation code.

  ### 0.1 Write Contract Tests

  - [ ] Write contract test for <API endpoint/event>: verify request shape, response shape, error codes (targets AC-N.M)
  - [ ] Run contract tests — confirm they FAIL (feature not implemented yet)
  - [ ] Commit: `test: add contract tests for <feature>`

  ### 0.2 Write Integration Tests

  - [ ] Write integration test for <Story 1 acceptance criterion>
  - [ ] Run — confirm FAIL
  - [ ] Commit: `test: add integration tests for <feature>`

  ---

  ## Phase 1: <First Component>

  **Implements:** FR-1, FR-2 | **Satisfies:** AC-1.1, AC-1.2
  **Files:** `src/path/file.ts`, `tests/path/test.ts`

  ### 1.1 <Specific Unit>

  - [ ] Write unit test:
    <complete test code>
  - [ ] Run: `<exact test command>` — expect: FAIL
  - [ ] Implement:
    <complete implementation code>
  - [ ] Run: `<exact test command>` — expect: PASS
  - [ ] Commit: `feat: implement <unit>`

  ---

  ## Phase N: Integration Verification

  **Implements:** All FRs | **Satisfies:** All ACs
  - [ ] Run full test suite: `<exact command>`
  - [ ] Verify all acceptance criteria from spec manually
  - [ ] Commit: `feat: complete <feature name>`

  ---

  ## Quickstart Validation

  <Concrete sequence of commands or UI steps that confirms the feature works end-to-end>
  ```

- [ ] **T003** `[P]` Create `skills/sdd-tasks/template.md` with this exact content:

  ```markdown
  # Tasks: <Feature Name>

  **Plan:** docs/specs/<NNN>-<feature-slug>/plan.md
  **Generated:** YYYY-MM-DD

  > **For agentic workers:** Execute tasks in order. `[P]` tasks within the same parallel group can run concurrently. Never start an implementation task without the prior test task completed and confirmed red.

  ---

  ## Parallel Group 0: Setup and Contracts

  Tasks in this group can run in parallel.

  - [ ] **T001** `[P]` Create directory structure: `mkdir -p src/<path> tests/<path>`
  - [ ] **T002** `[P]` Write contract test for `POST /endpoint`:
    Run: `<command>` — expect: FAIL (endpoint not implemented)

  ---

  ## Sequential: Phase 1 — <Component Name>

  *Complete T001–T002 before starting this phase.*

  - [ ] **T003** Write failing unit test for `<function/class>`
  - [ ] **T004** Verify T003 fails: run `<exact command>` — expect: `FAIL <reason>`
  - [ ] **T005** Implement `<function/class>`
  - [ ] **T006** Verify T003 passes: run `<exact command>` — expect: `PASS`
  - [ ] **T007** Commit: `git add <files> && git commit -m "feat: <description>"`

  ---

  ## Sequential: Phase N — Integration

  *All prior phases must be complete.*

  - [ ] **TNNN** Run full test suite: `<command>` — expect: ALL PASS
  - [ ] **TNNN** Verify AC-1.1: Given <precondition> When <action> Then confirm <outcome> — run `<exact command or UI step>`
  - [ ] **TNNN** Final commit: `git add . && git commit -m "feat: complete <feature>"`

  ---

  ## Task Summary

  | Range | Phase | Can Parallelize? | Spec ACs Covered |
  |-------|-------|-----------------|-----------------|
  | T001–T002 | Setup & Contracts | Yes (within group) | — |
  | T003–T007 | <Phase 1> | No (sequential) | AC-1.1, AC-1.2 |

  **Total tasks:** <N>
  **Estimated parallel speedup:** <X>x (Y tasks parallelizable)
  ```

- [ ] **T004** `[P]` Create `skills/sdd-brainstorm/template.md` with this exact content:

  ```markdown
  # Design: <Feature Name>

  **Date:** YYYY-MM-DD
  **Feature:** NNN-<feature-slug>

  ## Problem

  <What problem this solves and who experiences it.>

  ## Chosen Approach

  <The approach selected from the options explored, written out concretely.>

  ## Trade-offs & Rationale

  <Why this approach was chosen over the alternatives. What was given up.>

  ## Key Design Decisions

  <Specific decisions made during brainstorming that constrain implementation.>

  ## Out of Scope

  <What was explicitly discussed and excluded.>
  ```

- [ ] **T005** `[P]` Create `skills/sdd-research/template.md` with this exact content:

  ```markdown
  # Research: <Feature Name>

  **Feature:** docs/specs/<NNN>-<feature-slug>/spec.md
  **Date:** YYYY-MM-DD

  ---

  ## Summary of Findings

  <3-5 bullet points of the most important findings that will affect implementation decisions.>

  ---

  ## Question 1: <Research Question>

  ### Context

  <Why this question matters for implementation.>

  ### Findings

  #### Option A: <Name>

  **Pros:** <list>
  **Cons:** <list>
  **Best for:** <use case>

  #### Option B: <Name>

  **Pros:** <list>
  **Cons:** <list>
  **Best for:** <use case>

  ### Recommendation

  **Use <Option X>** because <specific rationale tied to spec requirements>.

  ---

  ## Question 2: <Research Question>

  ...

  ---

  ## Resolved Clarifications

  Items from the spec's `[NEEDS CLARIFICATION]` list that research has resolved:

  | Question | Resolution | Source |
  |----------|------------|--------|
  | <Original question> | <Answer> | <Evidence> |

  ---

  ## Remaining Open Questions

  Items that require product/business decisions (cannot be resolved by research alone):

  - [DECISION NEEDED: <question for the human>]

  ---

  ## Constraints Discovered

  Technical or organizational constraints that MUST be respected in the implementation plan:

  - <Constraint and its source>
  ```

- [ ] **T006** `[P]` Create `skills/sdd-plan/data-model-template.md` with this exact content:

  ```markdown
  # Data Model: <Feature Name>

  ## Entities

  ### <EntityName>

  | Field | Type | Constraints | Description |
  |-------|------|-------------|-------------|
  | id | uuid | PK, not null | Primary identifier |
  | <field> | <type> | <constraints> | <purpose> |

  **Indexes:** <list indexed fields and why>
  **Relationships:** <foreign keys and cardinality>
  **Spec requirement:** <FR-X that drives this entity>

  ---
  ```

- [ ] **T007** `[P]` Create `skills/sdd-plan/contracts-api-template.md` with this exact content:

  ```markdown
  # API Contracts: <Feature Name>

  ## <VERB> /path/to/endpoint

  **Purpose:** <What this endpoint does>
  **Spec requirement:** <FR-X, Story Y>

  ### Request

  {
    "field": "type — description"
  }

  ### Response (200 OK)

  {
    "field": "type — description"
  }

  ### Error Responses

  | Status | Condition | Body |
  |--------|-----------|------|
  | 400 | <validation failure> | {"error": "message"} |
  | 404 | <not found condition> | {"error": "Not found"} |
  | 409 | <conflict condition> | {"error": "message"} |
  ```

---

## Parallel Group 2: Verify Template Files

Run after Group 1 completes. All verify tasks are independent — safe to run concurrently.

- [ ] **T008** `[P]` Verify AC-1.1: Read `skills/sdd-specify/template.md` — confirm all 10 sections present in order: Problem Statement, Goals, Non-Goals, Users and Context, User Stories, Functional Requirements, Non-Functional Requirements, Error Scenarios, Open Questions, Out of Scope. Expected: all 10 headings found.

- [ ] **T009** `[P]` Verify AC-2.1: Read `skills/sdd-plan/template.md` — confirm all required sections present in order: Goal, Architecture, Tech Stack, File Structure, Complexity Tracking, Phase 0, Phase 1, Phase N, Quickstart Validation. Expected: all headings found.

- [ ] **T010** `[P]` Verify AC-3.1: Read `skills/sdd-tasks/template.md` — confirm all required sections present in order: header metadata, Parallel Group 0, Sequential Phase 1, Sequential Phase N, Task Summary. Expected: all headings found.

- [ ] **T011** `[P]` Verify AC-4.1: Read `skills/sdd-brainstorm/template.md` — confirm all required sections present in order: header metadata, Problem, Chosen Approach, Trade-offs & Rationale, Key Design Decisions, Out of Scope. Expected: all 5 headings found.

- [ ] **T012** `[P]` Verify AC-5.1: Read `skills/sdd-research/template.md` — confirm all required sections present in order: header metadata, Summary of Findings, Question block (Context/Findings/Recommendation), Resolved Clarifications, Remaining Open Questions, Constraints Discovered. Expected: all headings found.

- [ ] **T013** `[P]` Verify AC-6.1: Read `skills/sdd-plan/data-model-template.md` — confirm all required sections present: header, Entities heading, EntityName subheading with field table, Indexes, Relationships, Spec requirement. Expected: all elements found.

- [ ] **T014** `[P]` Verify AC-7.1: Read `skills/sdd-plan/contracts-api-template.md` — confirm all required sections present: header, endpoint heading with Purpose/Spec requirement, Request, Response (200 OK), Error Responses. Expected: all headings found.

---

## Sequential: Commit Template Files

*Complete Groups 1 and 2 before this task.*

- [ ] **T015** Commit all seven template files:
  `git add skills/sdd-specify/template.md skills/sdd-plan/template.md skills/sdd-tasks/template.md skills/sdd-brainstorm/template.md skills/sdd-research/template.md skills/sdd-plan/data-model-template.md skills/sdd-plan/contracts-api-template.md && git commit -m "docs: add canonical template files for all SDD skills"`

---

## Parallel Group 3: Update Reference Files

Each task touches a different file — safe to run concurrently.

- [ ] **T016** `[P]` Update `skills/sdd-specify/reference.md`:

  **Part A — Replace embedded template block (AC-1.2):**
  In Step 4 ("Write the Specification"), find the fenced code block that begins with the line containing `# Feature NNN: <Feature Name>`. Replace the entire fenced block (from opening ` ```markdown ` fence to its closing fence) with:
  ```
  See [template.md](template.md) for the canonical spec.md structure. Fill in every section; use `<angle brackets>` placeholders only where shown in the template.
  ```

  **Part B — Add compliance check (AC-1.3):**
  In Step 5 ("Self-Review the Spec"), immediately after the line `After writing, review the spec yourself (do NOT delegate this):`, insert as the first paragraph before any existing check:
  ```
  **Structural compliance:** Does the generated `spec.md` contain all required sections from `template.md` in order (Problem Statement → Goals → Non-Goals → Users and Context → User Stories → Functional Requirements → Non-Functional Requirements → Error Scenarios → Open Questions → Out of Scope)? Fix any missing or reordered sections before continuing.
  ```

- [ ] **T017** `[P]` Update `skills/sdd-plan/reference.md`:

  **Part A — Replace data-model embedded block (AC-6.2):**
  In Step 3 ("Write Supporting Documents"), find the fenced code block beginning with `# Data Model: <Feature Name>`. Replace the entire block with:
  ```
  See [data-model-template.md](data-model-template.md) for the canonical data-model.md structure.
  ```

  **Part B — Replace contracts embedded block (AC-7.2):**
  In Step 3, find the fenced code block beginning with `# API Contracts: <Feature Name>`. Replace the entire block with:
  ```
  See [contracts-api-template.md](contracts-api-template.md) for the canonical contracts/api.md structure.
  ```

  **Part C — Replace plan embedded block (AC-2.2):**
  In Step 4 ("Write the Main Plan"), find the fenced code block beginning with `# Implementation Plan: <Feature Name>`. Replace the entire block with:
  ```
  See [template.md](template.md) for the canonical plan.md structure. Fill in every section.
  ```

  **Part D — Add compliance checks (AC-2.3, AC-6.3, AC-7.3):**
  In Step 5 ("Self-Review"), immediately after the `## Step 5: Self-Review` heading, insert before any existing check:
  ```
  **Structural compliance:** Does the generated `plan.md` contain all required sections from `template.md` in order (Goal → Architecture → Tech Stack → File Structure → Complexity Tracking → Phase 0 → implementation phases → Integration Verification → Quickstart Validation)? Fix any missing or reordered sections before continuing.

  **Optional document compliance (conditional):** If `data-model.md` was created, does it contain all required sections from `data-model-template.md` in order (Entities heading → EntityName subheadings with field tables → Indexes, Relationships, Spec requirement per entity)? If `contracts/api.md` was created, does it contain all required sections from `contracts-api-template.md` in order (endpoint heading with Purpose/Spec requirement → Request → Response → Error Responses)?
  ```

- [ ] **T018** `[P]` Update `skills/sdd-tasks/reference.md`:

  **Part A — Replace embedded template block (AC-3.2):**
  In Step 3 ("Write tasks.md"), find the fenced code block beginning with `# Tasks: <Feature Name>`. Replace the entire block with:
  ```
  See [template.md](template.md) for the canonical tasks.md structure. Fill in every section; every task must show exact code or commands.
  ```

  **Part B — Add compliance check (AC-3.3):**
  In Step 4 ("Validate the Task List"), immediately after `Check before presenting:`, insert as the first check before any existing item:
  ```
  **Structural compliance:** Does the generated `tasks.md` contain all required sections from `template.md` in order (header metadata → Parallel Group 0 → Sequential phase sections → Task Summary table)? Fix any missing or reordered sections before continuing.
  ```

- [ ] **T019** `[P]` Update `skills/sdd-brainstorm/reference.md`:

  **Part A — Replace embedded template block (AC-4.2):**
  In "Writing the Design Document", find the fenced code block beginning with `# Design: <Feature Name>`. Replace the entire block with:
  ```
  See [template.md](template.md) for the canonical design.md structure. Fill in every section.
  ```

  **Part B — Add compliance check before spec review loop (AC-4.3):**
  After the template reference inserted in Part A and before the `## Spec Review Loop` heading, insert:
  ```
  **Structural compliance check (before dispatching spec reviewer):** Does the written `design.md` contain all required sections from `template.md` in order (header metadata → Problem → Chosen Approach → Trade-offs & Rationale → Key Design Decisions → Out of Scope)? Fix any missing or reordered sections before dispatching the spec-document-reviewer subagent.
  ```

- [ ] **T020** `[P]` Update `skills/sdd-research/reference.md`:

  **Part A — Replace embedded template block (AC-5.2):**
  In Step 4 ("Write Research Document"), find the fenced code block beginning with `# Research: <Feature Name>`. Replace the entire block with:
  ```
  See [template.md](template.md) for the canonical research.md structure. Fill in every section.
  ```

  **Part B — Add compliance check (AC-5.3):**
  In Step 6 ("Verify Before Claiming Complete"), immediately after `Before reporting research as done, confirm:`, insert as the first checklist item before existing items:
  ```
  - [ ] **Structural compliance:** Does the generated `research.md` contain all required sections from `template.md` in order (header → Summary of Findings → Question blocks with Context/Findings/Recommendation → Resolved Clarifications → Remaining Open Questions → Constraints Discovered)?
  ```

---

## Parallel Group 4: Verify Reference File Updates

Run after Group 3 completes. All verify tasks are independent — safe to run concurrently.

- [ ] **T021** `[P]` Verify AC-1.2 + AC-1.3: Read `skills/sdd-specify/reference.md`:
  - Step 4 must contain link to `template.md` and must NOT contain a fenced code block with `# Feature NNN:`. Expected: link found, embedded block absent.
  - Step 5 must have "Structural compliance" as the first check. Expected: "Structural compliance" appears before "Coverage check".

- [ ] **T022** `[P]` Verify AC-2.2 + AC-2.3 + AC-6.2 + AC-6.3 + AC-7.2 + AC-7.3: Read `skills/sdd-plan/reference.md`:
  - Step 3 must contain links to `data-model-template.md` and `contracts-api-template.md`; must NOT contain fenced blocks with `# Data Model:` or `# API Contracts:`. Expected: both links found, both embedded blocks absent.
  - Step 4 must contain link to `template.md`; must NOT contain fenced block with `# Implementation Plan:`. Expected: link found, block absent.
  - Step 5 must have "Structural compliance" and "Optional document compliance" as the first two checks. Expected: both found before "Spec coverage".

- [ ] **T023** `[P]` Verify AC-3.2 + AC-3.3: Read `skills/sdd-tasks/reference.md`:
  - Step 3 must contain link to `template.md` and must NOT contain fenced block with `# Tasks:`. Expected: link found, embedded block absent.
  - Step 4 must have "Structural compliance" as the first check. Expected: found before "Red-before-green".

- [ ] **T024** `[P]` Verify AC-4.2 + AC-4.3: Read `skills/sdd-brainstorm/reference.md`:
  - "Writing the Design Document" section must contain link to `template.md` and must NOT contain fenced block with `# Design:`. Expected: link found, embedded block absent.
  - "Structural compliance check" paragraph must appear between the template link and "## Spec Review Loop". Expected: found in correct position.

- [ ] **T025** `[P]` Verify AC-5.2 + AC-5.3: Read `skills/sdd-research/reference.md`:
  - Step 4 must contain link to `template.md` and must NOT contain fenced block with `# Research:`. Expected: link found, embedded block absent.
  - Step 6 must have "Structural compliance" as the first checklist item. Expected: found before existing items.

---

## Sequential: Commit Reference File Updates

*Complete Groups 3 and 4 before this task.*

- [ ] **T026** Commit all five updated reference files:
  `git add skills/sdd-specify/reference.md skills/sdd-plan/reference.md skills/sdd-tasks/reference.md skills/sdd-brainstorm/reference.md skills/sdd-research/reference.md && git commit -m "docs: update skill reference files to use canonical templates"`

---

## Sequential: Phase 3 — Integration Verification

*Complete T026 before starting.*

- [ ] **T027** Verify all 7 template files exist:
  Run: `ls skills/sdd-specify/template.md skills/sdd-plan/template.md skills/sdd-tasks/template.md skills/sdd-brainstorm/template.md skills/sdd-research/template.md skills/sdd-plan/data-model-template.md skills/sdd-plan/contracts-api-template.md`
  Expected: all 7 paths listed with no "No such file" errors.

- [ ] **T028** Spot-check no embedded template blocks remain in any reference file:
  Run: `grep -r "# Feature NNN\|# Implementation Plan:\|# Tasks:\|# Design:\|# Research:\|# Data Model:\|# API Contracts:" skills/sdd-specify/reference.md skills/sdd-plan/reference.md skills/sdd-tasks/reference.md skills/sdd-brainstorm/reference.md skills/sdd-research/reference.md`
  Expected: no output (zero matches).

- [ ] **T029** Spot-check all compliance checks are in place:
  Run: `grep -l "Structural compliance" skills/sdd-specify/reference.md skills/sdd-plan/reference.md skills/sdd-tasks/reference.md skills/sdd-brainstorm/reference.md skills/sdd-research/reference.md`
  Expected: all 5 files listed.

- [ ] **T030** Spot-check template files contain no process instructions:
  Run: `grep -l "Step 1\|Step 2\|HARD-GATE\|Hard Gate" skills/sdd-specify/template.md skills/sdd-plan/template.md skills/sdd-tasks/template.md skills/sdd-brainstorm/template.md skills/sdd-research/template.md skills/sdd-plan/data-model-template.md skills/sdd-plan/contracts-api-template.md`
  Expected: no output (zero matches — templates contain no process instructions).

- [ ] **T031** Final commit:
  `git add docs/specs/009-canonical-template-files/ && git commit -m "docs: complete 009 canonical template files"`

---

## Task Summary

| Range | Phase | Can Parallelize? | Spec ACs Covered |
|-------|-------|-----------------|-----------------|
| T001–T007 | Create template files | Yes (within group) | AC-1.1, AC-2.1, AC-3.1, AC-4.1, AC-5.1, AC-6.1, AC-7.1 |
| T008–T014 | Verify template files | Yes (within group) | AC-1.1, AC-2.1, AC-3.1, AC-4.1, AC-5.1, AC-6.1, AC-7.1 |
| T015 | Commit templates | No | — |
| T016–T020 | Update reference files | Yes (within group) | AC-1.2, AC-1.3, AC-2.2, AC-2.3, AC-3.2, AC-3.3, AC-4.2, AC-4.3, AC-5.2, AC-5.3, AC-6.2, AC-6.3, AC-7.2, AC-7.3 |
| T021–T025 | Verify reference updates | Yes (within group) | AC-1.2, AC-1.3, AC-2.2, AC-2.3, AC-3.2, AC-3.3, AC-4.2, AC-4.3, AC-5.2, AC-5.3, AC-6.2, AC-6.3, AC-7.2, AC-7.3 |
| T026 | Commit reference updates | No | — |
| T027–T031 | Integration verification | No (sequential) | All 21 ACs |

**Total tasks:** 31
**Estimated parallel speedup:** ~3x (Groups 1+2 and Groups 3+4 each cut to ~1/7 wall time)
