# Implementation Plan: Canonical Template Files for SDD Skills

> **For agentic workers:** Use sdd-tasks to generate an executable task list from this plan.

**Spec:** docs/specs/009-canonical-template-files/spec.md
**Created:** 2026-05-30

---

## Goal

Create seven standalone template files (one per SDD-generated document), update five skill `reference.md` files to reference those templates instead of embedding them, and add a structural compliance check as the first self-review item in each affected skill.

## Architecture

This is a pure documentation refactor — no runtime code, no data storage, no API surface. Each template file is extracted verbatim from the code block embedded in its skill's `reference.md`. The `reference.md` is then edited in two ways: (1) the embedded code block is replaced with a link directive, and (2) a structural compliance check is prepended to the existing self-review checklist. The two edits to each `reference.md` are done together in one phase to avoid touching the same file twice.

## Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Document format | Markdown | All SDD skill files are Markdown — FR-1 |
| Placeholder convention | `<angle brackets>` | Consistent with existing embedded templates — FR-4 |

## File Structure

New files created:
- `skills/sdd-specify/template.md` — canonical scaffold for `spec.md`
- `skills/sdd-plan/template.md` — canonical scaffold for `plan.md`
- `skills/sdd-tasks/template.md` — canonical scaffold for `tasks.md`
- `skills/sdd-brainstorm/template.md` — canonical scaffold for `design.md`
- `skills/sdd-research/template.md` — canonical scaffold for `research.md`
- `skills/sdd-plan/data-model-template.md` — canonical scaffold for `data-model.md`
- `skills/sdd-plan/contracts-api-template.md` — canonical scaffold for `contracts/api.md`

Files modified:
- `skills/sdd-specify/reference.md` — replace embedded spec template block; add compliance check
- `skills/sdd-plan/reference.md` — replace embedded plan, data-model, contracts blocks; add compliance check
- `skills/sdd-tasks/reference.md` — replace embedded tasks template block; add compliance check
- `skills/sdd-brainstorm/reference.md` — replace embedded design template block; add compliance check
- `skills/sdd-research/reference.md` — replace embedded research template block; add compliance check

## Complexity Tracking

(Empty section = all gates passed)

---

## Phase 0: No Contracts or Tests Required

This feature produces only Markdown files. There are no API endpoints, data models, or executable code. Verification is structural — reading files to confirm sections exist in order. Phase 0 is skipped per the Simplicity Gate.

---

## Phase 1: Create Template Files

**Implements:** FR-1, FR-4 | **Satisfies:** AC-1.1, AC-2.1, AC-3.1, AC-4.1, AC-5.1, AC-6.1, AC-7.1

All seven tasks in this phase touch different files and can be parallelized.

### 1.1 Create `skills/sdd-specify/template.md`

Precondition: verify `skills/sdd-specify/template.md` does not exist — `ls skills/sdd-specify/` should not list it.

Create `skills/sdd-specify/template.md` with this exact content:

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

Verify: read `skills/sdd-specify/template.md` — confirm all 10 required sections are present in order (Problem Statement → Goals → Non-Goals → Users and Context → User Stories → Functional Requirements → Non-Functional Requirements → Error Scenarios → Open Questions → Out of Scope).

### 1.2 Create `skills/sdd-plan/template.md`

Precondition: verify `skills/sdd-plan/template.md` does not exist.

Create `skills/sdd-plan/template.md` with this exact content:

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

Verify: read `skills/sdd-plan/template.md` — confirm all required sections are present in order (Goal → Architecture → Tech Stack → File Structure → Complexity Tracking → Phase 0 → Phase 1 → Phase N → Quickstart Validation).

### 1.3 Create `skills/sdd-tasks/template.md`

Precondition: verify `skills/sdd-tasks/template.md` does not exist.

Create `skills/sdd-tasks/template.md` with this exact content:

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
  ```<language>
  <complete test code>
  ```
  Run: `<command>` — expect: FAIL (endpoint not implemented)

---

## Sequential: Phase 1 — <Component Name>

*Complete T001–T002 before starting this phase.*

- [ ] **T003** Write failing unit test for `<function/class>`:
  ```<language>
  <complete test code>
  ```
- [ ] **T004** Verify T003 fails: run `<exact command>` — expect: `FAIL <reason>`
- [ ] **T005** Implement `<function/class>`:
  ```<language>
  <complete implementation code>
  ```
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

Verify: read `skills/sdd-tasks/template.md` — confirm all required sections are present in order (header metadata → Parallel Group 0 → Sequential Phase 1 → Sequential Phase N → Task Summary).

### 1.4 Create `skills/sdd-brainstorm/template.md`

Precondition: verify `skills/sdd-brainstorm/template.md` does not exist.

Create `skills/sdd-brainstorm/template.md` with this exact content:

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

Verify: read `skills/sdd-brainstorm/template.md` — confirm all required sections are present in order (header metadata → Problem → Chosen Approach → Trade-offs & Rationale → Key Design Decisions → Out of Scope).

### 1.5 Create `skills/sdd-research/template.md`

Precondition: verify `skills/sdd-research/template.md` does not exist.

Create `skills/sdd-research/template.md` with this exact content:

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

Verify: read `skills/sdd-research/template.md` — confirm all required sections are present in order (header → Summary of Findings → Question blocks → Resolved Clarifications → Remaining Open Questions → Constraints Discovered).

### 1.6 Create `skills/sdd-plan/data-model-template.md`

Precondition: verify `skills/sdd-plan/data-model-template.md` does not exist.

Create `skills/sdd-plan/data-model-template.md` with this exact content:

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

Verify: read `skills/sdd-plan/data-model-template.md` — confirm all required sections are present (header, Entities heading, EntityName subheading, field table, Indexes, Relationships, Spec requirement).

### 1.7 Create `skills/sdd-plan/contracts-api-template.md`

Precondition: verify `skills/sdd-plan/contracts-api-template.md` does not exist.

Create `skills/sdd-plan/contracts-api-template.md` with this exact content:

```markdown
# API Contracts: <Feature Name>

## <VERB> /path/to/endpoint

**Purpose:** <What this endpoint does>
**Spec requirement:** <FR-X, Story Y>

### Request

```json
{
  "field": "type — description"
}
```

### Response (200 OK)

```json
{
  "field": "type — description"
}
```

### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| 400 | <validation failure> | {"error": "message"} |
| 404 | <not found condition> | {"error": "Not found"} |
| 409 | <conflict condition> | {"error": "message"} |
```

Verify: read `skills/sdd-plan/contracts-api-template.md` — confirm all required sections are present (header, endpoint heading with Purpose/Spec requirement, Request, Response, Error Responses).

Commit after all seven template files verified: `docs: add canonical template files for all SDD skills`

---

## Phase 2: Update Reference Files

**Implements:** FR-2, FR-3 | **Satisfies:** AC-1.2, AC-1.3, AC-2.2, AC-2.3, AC-3.2, AC-3.3, AC-4.2, AC-4.3, AC-5.2, AC-5.3, AC-6.2, AC-6.3, AC-7.2, AC-7.3

Each sub-phase touches a different file — they are independent and can be parallelized.

### 2.1 Update `skills/sdd-specify/reference.md`

**Part A — Replace embedded template block (FR-2, AC-1.2):**

In Step 4 ("Write the Specification"), locate the fenced code block that begins with ` ```markdown ` and contains `# Feature NNN: <Feature Name>`. Replace the entire code block (from the opening fence to the closing fence) with:

```
See [template.md](template.md) for the canonical spec.md structure. Fill in every section; use `<angle brackets>` placeholders only where shown in the template.
```

**Part B — Add compliance check to self-review (FR-3, AC-1.3):**

In Step 5 ("Self-Review the Spec"), immediately after the line `After writing, review the spec yourself (do NOT delegate this):`, insert as the first check:

```
**Structural compliance:** Does the generated `spec.md` contain all required sections from `template.md` in order (Problem Statement → Goals → Non-Goals → Users and Context → User Stories → Functional Requirements → Non-Functional Requirements → Error Scenarios → Open Questions → Out of Scope)? Fix any missing or reordered sections before continuing.
```

Verify Part A: read `skills/sdd-specify/reference.md` Step 4 — confirm no fenced code block containing `# Feature NNN:` remains; confirm link to `template.md` is present.
Verify Part B: read `skills/sdd-specify/reference.md` Step 5 — confirm "Structural compliance" is the first check listed under the self-review heading.

### 2.2 Update `skills/sdd-plan/reference.md`

**Part A — Replace three embedded template blocks (FR-2, AC-2.2, AC-6.2, AC-7.2):**

1. In Step 3 ("Write Supporting Documents"), locate the `data-model.md` fenced code block (begins `# Data Model: <Feature Name>`). Replace the entire block with:
   ```
   See [data-model-template.md](data-model-template.md) for the canonical data-model.md structure.
   ```

2. In Step 3, locate the `contracts/api.md` fenced code block (begins `# API Contracts: <Feature Name>`). Replace the entire block with:
   ```
   See [contracts-api-template.md](contracts-api-template.md) for the canonical contracts/api.md structure.
   ```

3. In Step 4 ("Write the Main Plan"), locate the fenced code block that begins `# Implementation Plan: <Feature Name>`. Replace the entire block with:
   ```
   See [template.md](template.md) for the canonical plan.md structure. Fill in every section.
   ```

**Part B — Add compliance checks to self-review (FR-3, AC-2.3, AC-6.3, AC-7.3):**

In Step 5 ("Self-Review"), immediately after the `## Step 5: Self-Review` heading, insert as the first check:

```
**Structural compliance:** Does the generated `plan.md` contain all required sections from `template.md` in order (Goal → Architecture → Tech Stack → File Structure → Complexity Tracking → Phase 0 → implementation phases → Integration Verification → Quickstart Validation)? Fix any missing or reordered sections before continuing.

**Optional document compliance (conditional):** If `data-model.md` was created, does it contain all required sections from `data-model-template.md` in order (Entities heading → EntityName subheadings with field tables → Indexes, Relationships, Spec requirement per entity)? If `contracts/api.md` was created, does it contain all required sections from `contracts-api-template.md` in order (endpoint heading with Purpose/Spec requirement → Request → Response → Error Responses)?
```

Verify Part A: read `skills/sdd-plan/reference.md` — confirm no fenced code blocks beginning with `# Data Model:`, `# API Contracts:`, or `# Implementation Plan:` remain; confirm three template file references are present.
Verify Part B: read `skills/sdd-plan/reference.md` Step 5 — confirm "Structural compliance" and "Optional document compliance" are the first checks listed.

### 2.3 Update `skills/sdd-tasks/reference.md`

**Part A — Replace embedded template block (FR-2, AC-3.2):**

In Step 3 ("Write tasks.md"), locate the fenced code block beginning with `# Tasks: <Feature Name>`. Replace the entire block with:

```
See [template.md](template.md) for the canonical tasks.md structure. Fill in every section; every task must show exact code or commands.
```

**Part B — Add compliance check to validation step (FR-3, AC-3.3):**

In Step 4 ("Validate the Task List"), immediately after the `## Step 4: Validate the Task List` heading and the line `Check before presenting:`, insert as the first check:

```
**Structural compliance:** Does the generated `tasks.md` contain all required sections from `template.md` in order (header metadata → Parallel Group 0 → Sequential phase sections → Task Summary table)? Fix any missing or reordered sections before continuing.
```

Verify Part A: read `skills/sdd-tasks/reference.md` Step 3 — confirm no fenced code block beginning with `# Tasks:` remains; confirm link to `template.md` is present.
Verify Part B: read `skills/sdd-tasks/reference.md` Step 4 — confirm "Structural compliance" is the first check listed.

### 2.4 Update `skills/sdd-brainstorm/reference.md`

**Part A — Replace embedded template block (FR-2, AC-4.2):**

In "Writing the Design Document", locate the fenced code block beginning with `# Design: <Feature Name>`. Replace the entire block with:

```
See [template.md](template.md) for the canonical design.md structure. Fill in every section.
```

**Part B — Add compliance check before spec review loop (FR-3, AC-4.3):**

In "Writing the Design Document", after the instruction to write `design.md` and before the "## Spec Review Loop" heading, insert:

```
**Structural compliance check (before dispatching spec reviewer):** Does the written `design.md` contain all required sections from `template.md` in order (header metadata → Problem → Chosen Approach → Trade-offs & Rationale → Key Design Decisions → Out of Scope)? Fix any missing or reordered sections before dispatching the spec-document-reviewer subagent.
```

Verify Part A: read `skills/sdd-brainstorm/reference.md` "Writing the Design Document" — confirm no fenced code block beginning with `# Design:` remains; confirm link to `template.md` is present.
Verify Part B: read `skills/sdd-brainstorm/reference.md` — confirm "Structural compliance check" paragraph appears between the template reference and the "Spec Review Loop" heading.

### 2.5 Update `skills/sdd-research/reference.md`

**Part A — Replace embedded template block (FR-2, AC-5.2):**

In Step 4 ("Write Research Document"), locate the fenced code block beginning with `# Research: <Feature Name>`. Replace the entire block with:

```
See [template.md](template.md) for the canonical research.md structure. Fill in every section.
```

**Part B — Add compliance check to verify step (FR-3, AC-5.3):**

In Step 6 ("Verify Before Claiming Complete"), immediately after `Before reporting research as done, confirm:`, insert as the first checklist item:

```
- [ ] **Structural compliance:** Does the generated `research.md` contain all required sections from `template.md` in order (header → Summary of Findings → Question blocks with Context/Findings/Recommendation → Resolved Clarifications → Remaining Open Questions → Constraints Discovered)?
```

Verify Part A: read `skills/sdd-research/reference.md` Step 4 — confirm no fenced code block beginning with `# Research:` remains; confirm link to `template.md` is present.
Verify Part B: read `skills/sdd-research/reference.md` Step 6 — confirm "Structural compliance" is the first checklist item.

Commit after all five reference files verified: `docs: update skill reference files to use canonical templates`

---

## Phase 3: Integration Verification

**Implements:** All FRs | **Satisfies:** All ACs

- [ ] Verify all 7 template files exist: `ls skills/sdd-specify/template.md skills/sdd-plan/template.md skills/sdd-tasks/template.md skills/sdd-brainstorm/template.md skills/sdd-research/template.md skills/sdd-plan/data-model-template.md skills/sdd-plan/contracts-api-template.md`
- [ ] Verify AC-1.2: read `skills/sdd-specify/reference.md` Step 4 — confirm link to `template.md` is present and no embedded `# Feature NNN:` code block remains
- [ ] Verify AC-1.3: read `skills/sdd-specify/reference.md` Step 5 — confirm "Structural compliance" is the first self-review item
- [ ] Verify AC-2.2: read `skills/sdd-plan/reference.md` Step 4 — confirm link to `template.md` present, no embedded `# Implementation Plan:` code block remains
- [ ] Verify AC-2.3: read `skills/sdd-plan/reference.md` Step 5 — confirm "Structural compliance" is the first item
- [ ] Verify AC-3.2: read `skills/sdd-tasks/reference.md` Step 3 — confirm link to `template.md` present, no `# Tasks:` code block remains
- [ ] Verify AC-3.3: read `skills/sdd-tasks/reference.md` Step 4 — confirm "Structural compliance" is the first item
- [ ] Verify AC-4.2: read `skills/sdd-brainstorm/reference.md` "Writing the Design Document" — confirm link to `template.md` present, no `# Design:` code block remains
- [ ] Verify AC-4.3: read `skills/sdd-brainstorm/reference.md` — confirm "Structural compliance check" paragraph is between template reference and "Spec Review Loop"
- [ ] Verify AC-5.2: read `skills/sdd-research/reference.md` Step 4 — confirm link to `template.md` present, no `# Research:` code block remains
- [ ] Verify AC-5.3: read `skills/sdd-research/reference.md` Step 6 — confirm "Structural compliance" is the first checklist item
- [ ] Verify AC-6.2: read `skills/sdd-plan/reference.md` Step 3 — confirm link to `data-model-template.md` present, no `# Data Model:` code block remains
- [ ] Verify AC-6.3: read `skills/sdd-plan/reference.md` Step 5 — confirm conditional data-model compliance check is present
- [ ] Verify AC-7.2: read `skills/sdd-plan/reference.md` Step 3 — confirm link to `contracts-api-template.md` present, no `# API Contracts:` code block remains
- [ ] Verify AC-7.3: read `skills/sdd-plan/reference.md` Step 5 — confirm conditional contracts compliance check is present
- [ ] Commit: `docs: complete 009 canonical template files`

---

## Quickstart Validation

After implementation:
1. Open any skill's `reference.md` — confirm no fenced code blocks starting with `# Feature NNN:`, `# Implementation Plan:`, `# Tasks:`, `# Design:`, `# Research:`, `# Data Model:`, or `# API Contracts:` exist
2. Open any skill's template file — confirm it reads as a clean fill-in-the-blank scaffold with no process instructions
3. Open any skill's self-review section — confirm "Structural compliance" appears before all other checks
