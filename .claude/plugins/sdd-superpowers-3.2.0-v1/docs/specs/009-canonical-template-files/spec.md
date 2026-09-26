# Feature 009: Canonical Template Files for SDD Skills

**Status:** Approved
**Created:** 2026-05-30
**Branch:** `009-canonical-template-files`

---

## Problem Statement

The templates for `spec.md`, `plan.md`, `tasks.md`, and `design.md` are embedded as fenced code blocks inside each skill's `reference.md` file. Agents and engineers must locate a multi-hundred-line reference file, scan for the relevant code block, and mentally extract the template structure. When templates change, they must be edited in place inside prose — with no visual distinction between the template and the rules around it. There is also no enforcement: a skill may generate a document that diverges from its template and the self-review step has no canonical artifact to check compliance against.

## Goals

- Provide a standalone template file in each affected skill directory for every SDD-generated document
- Update each skill's `reference.md` to reference the template file rather than embed the template as a code block
- Update each skill's self-review checklist to explicitly verify structural compliance against the template
- Establish template files as the single source of truth for document structure in each skill
- Cover all seven SDD-generated documents: `spec.md`, `plan.md`, `tasks.md`, `design.md`, `research.md`, `data-model.md`, `contracts/api.md`

## Non-Goals

- Changing any existing approved or in-progress specs (001–008)
- Modifying workflow order, HARD-GATE wording, or skill invocation rules
- Adding new SDD workflow phases or skills
- Automating machine-readable validation (linting tooling) — compliance is agent-verified
- Creating templates for `contracts/events.md` — no canonical events template exists yet

## Users and Context

**Primary users:** Claude agents using `sdd-specify`, `sdd-plan`, `sdd-tasks`, `sdd-brainstorm`, and `sdd-research` to generate SDD documents
**Secondary users:** Human engineers reviewing generated documents for completeness and structure
**Usage context:** At each SDD phase transition — when a skill generates a new document, it references the canonical `template.md` and self-reviews compliance before presenting to the user
**User mental model:** A `template.md` file is a fill-in-the-blank scaffold. Everything in it is either a required heading, a placeholder to be replaced, or a required structural element. The template is not prose — it is structure.

## User Stories

### Story 1: Canonical spec.md Template

**As a** Claude agent using `sdd-specify`
**I want** a standalone `skills/sdd-specify/template.md` file that defines the exact structure of a spec.md
**So that** I can generate spec.md documents that reliably conform to the canonical structure without embedding or re-deriving it from prose

**Acceptance criteria:**

- [ ] **AC-1.1** Given `skills/sdd-specify/template.md` exists
      When an agent uses `sdd-specify` to write a new spec.md
      Then the generated spec.md contains every required section from `template.md` in the same order (Problem Statement, Goals, Non-Goals, Users and Context, User Stories, Functional Requirements, Non-Functional Requirements, Error Scenarios, Open Questions, Out of Scope)

- [ ] **AC-1.2** Given `sdd-specify/reference.md` has been updated
      When an agent reads the "Write the Specification" step
      Then it finds a reference to `template.md` rather than an embedded code block containing the spec structure

- [ ] **AC-1.3** Given the self-review step in `sdd-specify/reference.md`
      When the agent performs the self-review
      Then the checklist includes a structural compliance check: "Does the generated spec.md contain all required sections from `template.md` in order?"

### Story 2: Canonical plan.md Template

**As a** Claude agent using `sdd-plan`
**I want** a standalone `skills/sdd-plan/template.md` file that defines the exact structure of a plan.md
**So that** I can generate plan.md documents that reliably conform to the canonical structure

**Acceptance criteria:**

- [ ] **AC-2.1** Given `skills/sdd-plan/template.md` exists
      When an agent uses `sdd-plan` to write a new plan.md
      Then the generated plan.md contains every required section from `template.md` in the same order (header metadata, Pre-Implementation Gates, Phase 0 through final phase, Complexity Tracking, Self-Review)

- [ ] **AC-2.2** Given `sdd-plan/reference.md` has been updated
      When an agent reads the step for writing the main plan
      Then it finds a reference to `template.md` rather than an embedded code block containing the plan structure

- [ ] **AC-2.3** Given the self-review step in `sdd-plan/reference.md`
      When the agent performs the self-review
      Then the checklist includes a structural compliance check: "Does the generated plan.md contain all required sections from `template.md` in order?"

### Story 3: Canonical tasks.md Template

**As a** Claude agent using `sdd-tasks`
**I want** a standalone `skills/sdd-tasks/template.md` file that defines the exact structure of a tasks.md
**So that** I can generate tasks.md documents that reliably conform to the canonical structure

**Acceptance criteria:**

- [ ] **AC-3.1** Given `skills/sdd-tasks/template.md` exists
      When an agent uses `sdd-tasks` to write a new tasks.md
      Then the generated tasks.md contains every required section from `template.md` in the same order (header metadata, Phase sections with task checkboxes, Task Summary table)

- [ ] **AC-3.2** Given `sdd-tasks/reference.md` has been updated
      When an agent reads the "Write tasks.md" step
      Then it finds a reference to `template.md` rather than an embedded code block containing the tasks structure

- [ ] **AC-3.3** Given the self-review step in `sdd-tasks/reference.md`
      When the agent performs the self-review
      Then the checklist includes a structural compliance check: "Does the generated tasks.md contain all required sections from `template.md` in order?"

### Story 4: Canonical design.md Template

**As a** Claude agent using `sdd-brainstorm`
**I want** a standalone `skills/sdd-brainstorm/template.md` file that defines the exact structure of a design.md
**So that** I can generate design.md documents that reliably conform to the canonical structure

**Acceptance criteria:**

- [ ] **AC-4.1** Given `skills/sdd-brainstorm/template.md` exists
      When an agent uses `sdd-brainstorm` to write a new design.md
      Then the generated design.md contains every required section from `template.md` in the same order (header metadata, Problem, Chosen Approach, Trade-offs & Rationale, Key Design Decisions, Out of Scope)

- [ ] **AC-4.2** Given `sdd-brainstorm/reference.md` has been updated
      When an agent reads the "Write design doc" step
      Then it finds a reference to `template.md` rather than an embedded code block containing the design structure

- [ ] **AC-4.3** Given the self-review step in `sdd-brainstorm/reference.md`
      When the agent performs the self-review
      Then the checklist includes a structural compliance check: "Does the generated design.md contain all required sections from `template.md` in order?"

### Story 5: Canonical research.md Template

**As a** Claude agent using `sdd-research`
**I want** a standalone `skills/sdd-research/template.md` file that defines the exact structure of a research.md
**So that** I can generate research.md documents that reliably conform to the canonical structure

**Acceptance criteria:**

- [ ] **AC-5.1** Given `skills/sdd-research/template.md` exists
      When an agent uses `sdd-research` to write a new research.md
      Then the generated research.md contains every required section from `template.md` in the same order (header metadata, Summary of Findings, per-question blocks with Context/Findings/Recommendation, Resolved Clarifications, Remaining Open Questions, Constraints Discovered)

- [ ] **AC-5.2** Given `sdd-research/reference.md` has been updated
      When an agent reads the "Write Research Document" step
      Then it finds a reference to `template.md` rather than an embedded code block containing the research structure

- [ ] **AC-5.3** Given the self-review step in `sdd-research/reference.md`
      When the agent performs the self-review
      Then the checklist includes a structural compliance check: "Does the generated `research.md` contain all required sections from `template.md` in order?"

### Story 6: Canonical data-model.md Template

**As a** Claude agent using `sdd-plan`
**I want** a standalone `skills/sdd-plan/data-model-template.md` file that defines the exact structure of a data-model.md
**So that** when the feature requires data entities, I generate a data-model.md that reliably conforms to the canonical structure

**Acceptance criteria:**

- [ ] **AC-6.1** Given `skills/sdd-plan/data-model-template.md` exists
      When an agent uses `sdd-plan` and the feature has data entities requiring a data-model.md
      Then the generated data-model.md contains every required section from `data-model-template.md` in the same order (header, Entities with field tables, Indexes, Relationships, Spec requirement)

- [ ] **AC-6.2** Given `sdd-plan/reference.md` has been updated
      When an agent reads the "Write Supporting Documents" step for data-model.md
      Then it finds a reference to `data-model-template.md` rather than an embedded code block

- [ ] **AC-6.3** Given the self-review step in `sdd-plan/reference.md`
      When the agent has created a data-model.md
      Then the checklist includes a conditional compliance check: "If data-model.md was created, does it contain all required sections from `data-model-template.md` in order?"

### Story 7: Canonical contracts/api.md Template

**As a** Claude agent using `sdd-plan`
**I want** a standalone `skills/sdd-plan/contracts-api-template.md` file that defines the exact structure of a contracts/api.md
**So that** when the feature has API surfaces, I generate a contracts/api.md that reliably conforms to the canonical structure

**Acceptance criteria:**

- [ ] **AC-7.1** Given `skills/sdd-plan/contracts-api-template.md` exists
      When an agent uses `sdd-plan` and the feature has API endpoints requiring a contracts/api.md
      Then the generated contracts/api.md contains every required section from `contracts-api-template.md` in the same order (header, per-endpoint blocks with Purpose/Spec requirement/Request/Response/Error Responses)

- [ ] **AC-7.2** Given `sdd-plan/reference.md` has been updated
      When an agent reads the "Write Supporting Documents" step for contracts/api.md
      Then it finds a reference to `contracts-api-template.md` rather than an embedded code block

- [ ] **AC-7.3** Given the self-review step in `sdd-plan/reference.md`
      When the agent has created a contracts/api.md
      Then the checklist includes a conditional compliance check: "If contracts/api.md was created, does it contain all required sections from `contracts-api-template.md` in order?"

## Functional Requirements

### FR-1: Standalone Template Files

A template file must be created for every SDD-generated document.

**Must:**
- Exist at `skills/sdd-specify/template.md` — for `spec.md`
- Exist at `skills/sdd-plan/template.md` — for `plan.md`
- Exist at `skills/sdd-tasks/template.md` — for `tasks.md`
- Exist at `skills/sdd-brainstorm/template.md` — for `design.md`
- Exist at `skills/sdd-research/template.md` — for `research.md`
- Exist at `skills/sdd-plan/data-model-template.md` — for `data-model.md`
- Exist at `skills/sdd-plan/contracts-api-template.md` — for `contracts/api.md`
- Contain only the document scaffold: required headings, placeholder text, and structural elements — no process instructions
- Use placeholder text in the format `<Placeholder description>` for every section an agent must fill in
- List every required section in the order it must appear in the generated document
- Mark optional sections explicitly as `(optional)` in the template heading

**Must not:**
- Contain skill process instructions (those remain in `reference.md`)
- Contain workflow rules, gates, or anti-patterns (those remain in `reference.md`)
- Reference other skills or cross-skill concepts

### FR-2: Reference File Updates

The `reference.md` file for every affected skill must be updated to reference the template file instead of embedding the template as a code block.

**Affected files:** `sdd-specify/reference.md`, `sdd-plan/reference.md`, `sdd-tasks/reference.md`, `sdd-brainstorm/reference.md`, `sdd-research/reference.md`

**Must:**
- Replace each embedded template code block with a directive: `See [<template-filename>](<template-filename>) for the canonical document structure.`
- Retain all process steps, rules, anti-patterns, and quality gates — only the embedded template block is replaced
- Keep the step that instructs the agent to write the document; update it to reference the template file as the structure source
- For `sdd-plan/reference.md`: replace the `data-model.md` and `contracts/api.md` embedded blocks with references to `data-model-template.md` and `contracts-api-template.md` respectively

**Must not:**
- Remove or reorder any existing process steps
- Alter HARD-GATE language or self-review checklist items (except to add the new compliance check)
- Change the output file paths (`docs/specs/<NNN>-<feature-slug>/<document>.md`)

### FR-3: Self-Review Compliance Check

Every affected skill's self-review step must include a structural compliance check against its template file.

**Must:**
- Add one checklist item as the first item in the self-review checklist: "**Structural compliance:** Does the generated document contain all required sections from `<template-filename>` in order?"
- For optional documents (`data-model.md`, `contracts/api.md`), the check must be conditional: "If `<document>` was created, does it contain all required sections from `<template-filename>` in order?"
- Require the agent to fix any missing or reordered sections before presenting the document to the user

**Must not:**
- Remove any existing self-review checklist items
- Require machine-readable validation — agent inspection is sufficient

### FR-4: Template Completeness

Each `template.md` must be complete enough to generate a structurally valid document without consulting `reference.md`.

**Must:**
- Include every section heading that appears in the generated document
- Include placeholder text for every variable section
- Include static boilerplate (e.g., Status: Draft, Created: YYYY-MM-DD) that appears verbatim in every generated document
- Be usable as a fill-in-the-blank scaffold

**Must not:**
- Omit any section that is required in the generated document
- Include optional sections without clearly marking them as optional

## Non-Functional Requirements

### Conciseness
Each `template.md` must be self-contained and focused. No section should contain process explanations — those belong in `reference.md`. Templates should be scannable in under 30 seconds.

### Backward Compatibility
Existing specs 001–008 are not modified. Template changes apply only to documents generated after this feature merges.

### Consistency
All template files follow the same formatting conventions: placeholder text uses `<angle brackets>`, optional sections are marked `(optional)`, and required sections have no qualifier.

## Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Agent generates a spec.md missing the "Error Scenarios" section | Structural compliance check in self-review flags the missing section; agent adds it before presenting to user |
| Agent generates a plan.md with sections in a different order than `template.md` | Structural compliance check flags the reordering; agent corrects order before presenting |
| A template placeholder is left unfilled in the generated document | Existing placeholder anti-pattern check (already in `reference.md`) catches it |
| Agent writes a design.md without consulting `template.md` | Structural compliance check catches any missing required sections during self-review |
| Agent creates a data-model.md but skips the compliance check because it is optional | The self-review conditional item is worded to trigger when the document was created; agent must apply it |
| Agent creates a contracts/api.md with only Request/Response but omits Error Responses | Structural compliance check flags the missing section; agent adds it before presenting |
| Agent generates a research.md with no "Resolved Clarifications" section | Structural compliance check flags it; agent adds the section (may be empty if no spec clarifications were resolved) |

## Open Questions

None.

## Out of Scope (Future Considerations)

- Machine-readable schema validation for generated documents
- Automated diff tooling to detect template drift
- Template for `contracts/events.md` — no canonical events structure exists yet
- Retroactive migration of specs 001–008 to new template format
