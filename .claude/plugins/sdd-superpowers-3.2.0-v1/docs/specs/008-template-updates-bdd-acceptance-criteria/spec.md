# Feature 008: Template Updates — BDD Acceptance Criteria and Best Practices

**Status:** Approved
**Created:** 2026-04-20
**Branch:** `008-template-updates-bdd-acceptance-criteria`

---

## Problem Statement

The `spec.md`, `plan.md`, and `tasks.md` templates embedded in `sdd-specify/reference.md`, `sdd-plan/reference.md`, and `sdd-tasks/reference.md` use acceptance criteria as flat checkboxes with no standard structure. This makes it impossible to know — at a glance — what precondition, trigger, and outcome each criterion tests. Engineers and agents writing and reading these docs must mentally reconstruct context that the criterion itself should encode. The result is ambiguous, untraceable criteria that can pass review despite not matching user intent.

## Goals

- Replace all acceptance-criteria placeholders in `spec.md` template with BDD-style `Given / When / Then` format
- Update `plan.md` template so every phase header explicitly traces to spec requirements and acceptance criteria
- Update `tasks.md` template so acceptance-criteria verification tasks use BDD language matching the spec
- Make the three templates internally consistent: spec criteria drive plan phases which drive task verification steps
- Document BDD format rules and anti-patterns in each skill's reference.md alongside its template

## Non-Goals

- Changing any existing approved or in-progress specs (008 template changes are forward-only)
- Modifying skill logic, workflow order, or HARD-GATE wording
- Adding new SDD workflow steps or phases
- Updating `design.md`, `research.md`, `data-model.md`, or `contracts/` templates
- Backfilling BDD criteria into specs 001–007

## Users and Context

**Primary users:** Claude agents writing specs, plans, and task lists inside an SDD project
**Secondary users:** Human engineers reviewing those documents for completeness and testability
**Usage context:** At each SDD phase transition — when sdd-specify creates spec.md, when sdd-plan creates plan.md, when sdd-tasks creates tasks.md
**User mental model:** BDD Given/When/Then is familiar from behavior-driven testing frameworks. Agents expect to copy the template pattern and fill in domain-specific values. Engineers expect criteria to read like test scenarios, not vague goals.

## User Stories

### Story 1: BDD Acceptance Criteria in spec.md

**As a** Claude agent using `sdd-specify`
**I want** the spec.md template to show BDD-style acceptance criteria
**So that** every criterion I write encodes context, trigger, and expected outcome in a testable, unambiguous form

**Acceptance criteria:**

- [ ] **Given** the spec.md template in `sdd-specify/reference.md` is used to write a new spec
      **When** the agent fills in User Stories → Acceptance criteria
      **Then** each criterion follows the format: `Given <precondition> / When <action> / Then <observable outcome>`

- [ ] **Given** an acceptance criterion is written using the BDD template
      **When** the self-review step checks testability
      **Then** the criterion can be directly converted to a failing test without additional clarification

- [ ] **Given** the BDD format rules are defined in `sdd-specify/reference.md`
      **When** an agent writes a criterion that omits Given, When, or Then
      **Then** the self-review checklist flags it as a placeholder anti-pattern and requires rewrite

### Story 2: Plan Phases Trace to Spec Criteria

**As a** Claude agent using `sdd-plan`
**I want** the plan.md template's phase headers to explicitly reference the acceptance criteria they implement
**So that** every technical decision in the plan traces back to a specific, verifiable spec requirement

**Acceptance criteria:**

- [ ] **Given** the plan.md template in `sdd-plan/reference.md` is used to write a new plan
      **When** the agent writes a Phase header
      **Then** the header includes both the FR references and the Acceptance Criteria IDs (e.g., `AC-1.1`, `AC-1.2`) it satisfies

- [ ] **Given** a plan.md is complete
      **When** the self-review step checks spec coverage
      **Then** every acceptance criterion from spec.md maps to at least one plan phase, and unmapped criteria are flagged as gaps

- [ ] **Given** a plan phase is written
      **When** the agent validates traceability
      **Then** no phase exists without a corresponding FR or AC reference in its header

### Story 3: Task Verification Steps Use BDD Language

**As a** Claude agent using `sdd-tasks`
**I want** acceptance-criteria verification tasks in tasks.md to mirror the BDD language from spec.md
**So that** the done-state for each task is unambiguous and directly verifiable against the spec

**Acceptance criteria:**

- [ ] **Given** a verification task is generated in tasks.md
      **When** it corresponds to a spec acceptance criterion
      **Then** the task description reproduces the criterion's Given/When/Then text and names the spec section (e.g., `Story 1, AC-1.1`)

- [ ] **Given** a tasks.md is generated from a plan
      **When** the final integration phase is written
      **Then** each acceptance criterion in the spec has a corresponding verification task that cites it by ID

- [ ] **Given** the tasks.md template in `sdd-tasks/reference.md` is updated
      **When** an agent uses it to generate a task list
      **Then** the template's verification-task example shows BDD format with a spec citation

### Story 4: BDD Rules Documented in Each Reference

**As a** human engineer reviewing the SDD skill files
**I want** clear BDD format rules and anti-patterns documented near each template
**So that** agents and engineers know what valid criteria look like without needing to consult external documentation

**Acceptance criteria:**

- [ ] **Given** `sdd-specify/reference.md` is read
      **When** the section on acceptance criteria is reached
      **Then** it contains: the BDD format definition, a valid example, and at least three anti-pattern examples with corrections

- [ ] **Given** `sdd-plan/reference.md` is read
      **When** the section on phase headers is reached
      **Then** it contains the AC-reference format with an example showing `Implements: FR-1, FR-2 | Satisfies: AC-1.1, AC-2.3`

- [ ] **Given** `sdd-tasks/reference.md` is read
      **When** the section on verification tasks is reached
      **Then** it contains an example verification task that cites a spec AC by ID and reproduces the Given/When/Then text

## Functional Requirements

### FR-1: spec.md Template — BDD Acceptance Criteria Format

The acceptance-criteria block in the User Stories section of the spec.md template must be updated from a flat checklist to a BDD structured format.

**Must:**
- Use the format: `Given <precondition> / When <action or event> / Then <observable, verifiable outcome>`
- Present each criterion as a single checkbox item with the BDD clause on separate indented lines or inline
- Include placeholder text that makes the three clauses visually distinct
- Support multiple criteria per story (at least 2–3 in the template example)
- Assign each criterion an ID (`AC-N.M` where N is story number, M is criterion sequence) for downstream traceability

**Must not:**
- Use free-form bullet points as the primary acceptance-criteria format
- Leave any criterion clause (`Given`, `When`, `Then`) as optional or unlabeled

### FR-2: spec.md Template — BDD Rules Section

A "BDD Acceptance Criteria Rules" section must be added to `sdd-specify/reference.md` near the template.

**Must:**
- Define Given, When, Then in one sentence each
- Show one complete valid BDD criterion example
- List at least three anti-patterns with corrections:
  - Vague outcome: "system works correctly" → name the observable behavior
  - Missing precondition: no Given clause → specify the required state
  - Non-observable Then: "user is happy" → specify the measurable output or UI change

**Must not:**
- Describe implementation details (no technology mentions)
- Exceed 30 lines in the reference file

### FR-3: plan.md Template — Acceptance Criteria Traceability in Phase Headers

Phase headers in the plan.md template must be updated to include AC references alongside FR references.

**Must:**
- Phase header format: `**Implements:** FR-N, FR-M | **Satisfies:** AC-N.M, AC-P.Q`
- The Spec Coverage self-review step must verify every AC from spec.md maps to a plan phase
- Phase 0 (Contracts and Tests First) must include a step that lists which ACs each contract test will verify

**Must not:**
- Require a plan phase for every individual AC (one phase may cover multiple ACs)
- Change the phase/section structure of the template beyond the header format

### FR-4: tasks.md Template — Verification Tasks with BDD Citations

Verification tasks in the tasks.md template must reference spec ACs explicitly.

**Must:**
- Integration-phase verification tasks must cite the AC ID and reproduce the Given/When/Then text
- Format: `Verify AC-N.M: Given <precondition> / When <action> / Then confirm <outcome>`
- The task template example must show at least one BDD-cited verification task
- The Task Summary table must include a "Spec ACs Covered" column

**Must not:**
- Require BDD language for non-verification tasks (setup, commit, directory creation)
- Duplicate full test code inside the verification task (cite the test file and AC only)

### FR-5: Consistency Constraint

The AC IDs defined in spec.md must be the same IDs referenced in plan.md phase headers and tasks.md verification tasks.

**Must:**
- AC numbering in spec.md follows `AC-<story_number>.<criterion_sequence>` (e.g., `AC-1.1`, `AC-2.3`)
- plan.md phase headers reference ACs by the same ID scheme
- tasks.md verification tasks cite the same AC IDs

**Must not:**
- Use different ID schemes in different documents for the same criterion

## Non-Functional Requirements

### Conciseness
Template additions must not make reference.md files significantly longer. BDD rules sections must be ≤30 lines each. Phase header changes are additive (one line per header), not rewrites.

### Backward Compatibility
Existing specs 001–007 are not touched. Template updates apply only to new specs created after this feature is merged.

### Clarity
BDD format must be self-evident to an agent reading it for the first time without needing external context.

## Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Agent writes a criterion with only `Then` (missing `Given` and `When`) | Self-review checklist in spec step flags the criterion as a BDD anti-pattern and requires rewrite before approval |
| Plan phase header missing AC reference | Spec coverage self-review step in sdd-plan flags the unmapped ACs as gaps and blocks the "plan complete" claim |
| Task verification step cites an AC ID that does not exist in spec.md | sdd-tasks validation step catches the mismatch and requires correction before presenting the task list |
| spec.md AC ID numbering is inconsistent (e.g., skips AC-1.2) | sdd-specify self-review step flags the gap and requires sequential IDs before approval |

## Open Questions

None.

## Out of Scope (Future Considerations)

- Automated tooling to validate AC ID consistency across spec/plan/tasks
- Linting rules for BDD format compliance
- Retroactive migration of specs 001–007 to BDD format
- BDD format in `design.md` (brainstorm output — different artifact lifecycle)
