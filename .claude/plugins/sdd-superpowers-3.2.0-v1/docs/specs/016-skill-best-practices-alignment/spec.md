# Feature 016: Skill Best-Practices Alignment

**Status:** Approved
**Created:** 2026-06-24
**Branch:** `016-skill-best-practices-alignment`

---

## Problem Statement

An audit of all 19 SDD skills against Anthropic's official skill authoring best practices
revealed two structural gaps that reduce reliability across the entire portfolio. No skill
uses `<examples>` XML blocks, which means Claude may follow its own priors rather than
the skill's intent when invocations are ambiguous. No skill defines explicit `## Constraints`
or `## Error Handling` sections, so boundary behavior — what the skill refuses to do and
what Claude should do when context is missing or a user requests a bypass — is either
buried in prose or left undefined. Both gaps affect every skill invocation, every session.

## Goals

- Every one of the 19 SDD skills contains at least one `<examples>` XML block with correct
  and incorrect invocation scenarios
- Every skill contains a `## Constraints` section listing what the skill explicitly refuses
  to do, using declarative "Does NOT" language
- Every skill contains a `## Error Handling` section specifying Claude's behavior for
  missing context, ambiguous situations, and gate-bypass requests
- No existing `<HARD-GATE>` block is contradicted by a skill's new `## Constraints` section
- No skill exceeds 500 lines after additions

## Non-Goals

- Rewriting skill bodies, logic, or workflow steps
- Modifying `writing-skills` (out of scope — meta-skill)
- Changing description text (015 already fixed CSO violations)
- Adding `allowed-tools`, `model`, or `effort` frontmatter
- Splitting any skill into sub-files (none approach the 500-line limit after additions)
- Adding `when_to_use` frontmatter
- Modifying `<HARD-GATE>` block wording — Constraints sections must match gates exactly

## Users and Context

**Primary users:** Claude (the AI model) executing a skill at invocation time
**Secondary users:** SDD practitioners reading skills to understand expected Claude behavior
**Usage context:** Every SDD skill invocation — brainstorm, specify, plan, execute, review, debug
**User mental model:** Skills are behavioral contracts. Examples show Claude what correct
behavior looks like. Constraints show what Claude must refuse. Error Handling shows what
Claude does when the contract cannot be fully executed.

## User Stories

### Story 1: Few-Shot Examples Anchor High-Risk Invocations

**As** Claude executing a high-bypass-risk skill (TDD, systematic-debugging,
verification-before-completion, sdd-specify, sdd-execute, sdd-brainstorm, requesting-code-review)
**I want** to see two concrete examples — one correct invocation and one bypass rationalization
I must not follow
**So that** I anchor my behavior to the skill's intent rather than my priors when the
situation is ambiguous

**Acceptance criteria:**

- [ ] **AC-1.1** Given a Phase 1 skill SKILL.md is loaded When Claude reads the skill
  Then it finds an `<examples>` block after `## Overview` containing exactly two `<example>`
  entries — one with the correct path and one with the bypass rationalization to reject
- [ ] **AC-1.2** Given an example entry When Claude reads the `<incorrect>` field Then
  the text matches a named rationalization from the sdd-workflow "Red Flags" table or
  from the skill's own bypass patterns
- [ ] **AC-1.3** Given an `<example>` block When Claude reads any field Then no single
  field (`<context>`, `<correct>`, `<incorrect>`) exceeds three sentences

### Story 2: Single Examples Clarify All Remaining Skills

**As** Claude executing any of the 12 Phase 2 skills
**I want** to see one example that clarifies the most common invocation confusion for
that skill (when NOT to invoke, or the most frequent skip rationalization)
**So that** I route correctly even for lower-traffic skills

**Acceptance criteria:**

- [ ] **AC-2.1** Given a Phase 2 skill SKILL.md is loaded When Claude reads the skill
  Then it finds an `<examples>` block containing at least one `<example>` entry
- [ ] **AC-2.2** Given a Phase 2 skill example When Claude reads `<context>` Then it
  describes a realistic invocation boundary or bypass scenario specific to that skill —
  not a generic placeholder

### Story 3: Constraints Declare Hard Boundaries

**As** Claude executing any SDD skill
**I want** a `## Constraints` section that explicitly lists what the skill refuses to do
**So that** I do not rationalize out-of-scope actions as being within the skill's remit

**Acceptance criteria:**

- [ ] **AC-3.1** Given any SDD skill SKILL.md is loaded When Claude reads the skill Then
  it finds a `## Constraints` section as one of the final two sections before any closing notes
- [ ] **AC-3.2** Given a `## Constraints` section When Claude reads each entry Then every
  entry begins with "Does NOT" followed by a concrete, verifiable prohibition
- [ ] **AC-3.3** Given a skill that contains a `<HARD-GATE>` block When the `## Constraints`
  section is added Then every constraint that corresponds to an existing gate uses identical
  prohibitive language — no contradiction or softening

### Story 4: Error Handling Specifies Boundary Behavior

**As** Claude executing any SDD skill when context is incomplete or a user requests a bypass
**I want** a `## Error Handling` section with concrete responses for each missing-input or
bypass scenario
**So that** I respond predictably rather than improvising

**Acceptance criteria:**

- [ ] **AC-4.1** Given any SDD skill SKILL.md is loaded When Claude reads the skill Then
  it finds a `## Error Handling` section immediately after `## Constraints`
- [ ] **AC-4.2** Given a `## Error Handling` section When Claude reads the entries Then
  every entry names a specific scenario (e.g. "**Missing spec**", "**Ambiguous scope**")
  and specifies a concrete response action (ask, halt, or default to a named behavior)
- [ ] **AC-4.3** Given any SDD skill When the user requests a gate bypass Then the
  `## Error Handling` section contains a "**User requests gate bypass**" entry that
  instructs Claude to: name the gate, explain why it holds, and offer the correct path forward

## Functional Requirements

### FR-1: `<examples>` Block Placement and Structure

Each skill's `<examples>` block must appear after `## Overview` and before the skill's
main workflow section. The block wraps one or more `<example>` entries. Each entry
contains three child elements: `<context>`, `<correct>`, `<incorrect>`.

**Must:**
- Place `<examples>` after `## Overview`
- Include `<context>`, `<correct>`, and `<incorrect>` in every `<example>`
- Keep each field to three sentences or fewer

**Must not:**
- Place examples inside other sections or after workflow steps
- Use `<incorrect>` fields that describe strawman errors not reflective of real bypass rationalizations
- Include internal workflow steps in examples — examples cover invocation decisions only

### FR-2: Phase 1 Skills — Two Examples Each

The seven Phase 1 skills must contain two examples: one correct-path scenario and one
bypass-rationalization scenario specific to that skill.

Phase 1 skills: `test-driven-development`, `systematic-debugging`,
`verification-before-completion`, `sdd-specify`, `sdd-execute`, `sdd-brainstorm`,
`requesting-code-review`

**Must:**
- Include exactly two `<example>` entries in the Phase 1 `<examples>` block
- Target the two most common bypass rationalizations for each skill

**Must not:**
- Reuse generic bypass scenarios across Phase 1 skills — each must be skill-specific

### FR-3: Phase 2 Skills — One Example Each

The twelve Phase 2 skills must contain one example focused on the most common invocation
boundary confusion (when not to invoke, or the most frequent skip pattern).

Phase 2 skills: `dispatching-parallel-agents`, `finishing-a-development-branch`,
`receiving-code-review`, `sdd-init`, `sdd-plan`, `sdd-research`, `sdd-review`,
`sdd-spec-update`, `sdd-tasks`, `sdd-workflow`, `subagent-driven-development`, `using-git`

**Must:**
- Include at least one `<example>` entry per Phase 2 skill

**Must not:**
- Use placeholder context descriptions that do not reflect real usage patterns

### FR-4: `## Constraints` Section

All 19 skills must have a `## Constraints` section as the second-to-last section in the
skill body (before `## Error Handling`).

**Must:**
- List 2–5 concrete prohibitions using "Does NOT" language
- Match existing `<HARD-GATE>` language word-for-word where a gate already covers the constraint

**Must not:**
- Introduce new gates not already in the skill body
- Soften existing gate language (e.g. "rarely does" instead of "Does NOT")
- Use conditional language ("may not", "should not") — constraints are absolute

### FR-5: `## Error Handling` Section

All 19 skills must have a `## Error Handling` section as the last section in the skill body.

**Must:**
- Name each scenario with a bolded label (e.g. `**Missing spec**:`)
- Specify a concrete response action: ask the user for the missing input, halt with an
  explanation, or default to a named behavior
- Include a `**User requests gate bypass**` entry in every skill

**Must not:**
- Use vague responses like "handle gracefully" or "use judgment"
- Omit the gate-bypass entry even for skills with no other error scenarios

### FR-6: 500-Line Limit

No skill's SKILL.md may exceed 500 lines after the additions from this spec are applied.

**Must:**
- Check line count before and after edits for each skill
- If additions would push a skill over 500 lines, extract the largest existing section to
  a new or existing reference file and link it from SKILL.md before adding examples and sections

**Must not:**
- Ship a skill over 500 lines

## Non-Functional Requirements

### Readability

- `## Constraints` and `## Error Handling` must use parallel structure: same indentation,
  same label format (`**Scenario name**:`), same action-verb style
- Examples must be readable in isolation — no cross-references to other sections required
  to understand them

### Consistency

- The `<examples>` block format must be identical across all 19 skills: same XML tag names,
  same child-element order (`<context>`, `<correct>`, `<incorrect>`)
- The final two sections of every skill must always be `## Constraints` then `## Error Handling`

## Error Scenarios

| Scenario | Expected Behavior |
|---|---|
| A skill would exceed 500 lines after adding examples and sections | Extract largest existing non-core section to reference.md, add link in SKILL.md, then add examples and sections |
| A `<HARD-GATE>` block and a proposed Constraints entry say different things about the same prohibition | Keep the HARD-GATE language verbatim; write the Constraints entry to match it exactly |
| A Phase 2 skill has no clear invocation-boundary confusion to illustrate | Use the most common rationalization for skipping the skill entirely as the example context |
| An existing skill already has an informal constraints list in prose | Replace the prose list with the formal `## Constraints` section using "Does NOT" language |

## Open Questions

None. All design decisions resolved in `design.md`.

## Out of Scope (Future Considerations)

- `writing-skills` — excluded as a meta-skill
- Adding `when_to_use` frontmatter (CSO description fixes in 015 make this redundant)
- Splitting any skill into sub-files for progressive disclosure (no skill approaches 500 lines)
- Adding `model` or `effort` frontmatter (insufficient evaluation data)
- Modifying skill descriptions (covered by 015)
