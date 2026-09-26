# Feature 010: Improve Skill Trigger Routing in SDD Workflow

**Status:** Approved
**Created:** 2026-05-30
**Branch:** `010-improve-skill-trigger-routing`

---

## Problem Statement

Four bundled skills — `test-driven-development`, `requesting-code-review`, `receiving-code-review`, and `systematic-debugging` — fail to trigger reliably in practice. The sdd-workflow Quick Reference trigger descriptions are situational ("Phase boundary during execution") rather than action-based, and there are no language-pattern triggers to match exact user phrases ("review this", "it's not working"). Agents can rationalize past situational language; they cannot rationalize past an exact phrase match or a pre-action red flag that fires at the moment of the forbidden action.

## Goals

- The four failing skills trigger reliably when the agent is about to write code, receives review feedback, is asked for a review, or encounters unexpected behavior.
- The sdd-workflow routing layer matches exact user phrases to the correct bundled skill without requiring the user to name the skill explicitly.
- Agent pre-action red flags in `sdd-workflow/SKILL.md` intercept rationalization at the moment it would otherwise succeed.

## Non-Goals

- Modifying any bundled skill SKILL.md files (spec 007 already aligned those)
- Adding new bundled skills or new workflow steps
- Updating skill frontmatter `description:` fields
- Changing the SDD workflow order or methodology
- Modifying any file outside `sdd-workflow/SKILL.md` and `sdd-workflow/routing.md`

## Users and Context

**Primary users:** Claude agents operating within an SDD project, reading sdd-workflow before any action
**Secondary users:** Human developers who invoke sdd-workflow and observe whether skills fire correctly
**Usage context:** Every SDD session — at the start of implementation, when receiving review, when asking for a review, when something breaks
**User mental model:** Users expect saying "review this" or "it's not working" to automatically invoke the right skill; they should not need to name the skill explicitly

## User Stories

### Story 1: TDD triggers before any implementation code

**As a** Claude agent in an SDD project
**I want** `sdd-superpowers:test-driven-development` to be invoked every time I am about to write implementation code — whether I am a dispatched subagent or operating directly
**So that** I never write production code without a prior failing test

**Acceptance criteria:**

- [ ] **AC-1.1** Given the agent is about to write any new function, class, method, or file modification When the agent reads the Quick Reference table in sdd-workflow/SKILL.md Then the trigger description for `test-driven-development` explicitly states "Before writing any implementation code — subagent or direct"
- [ ] **AC-1.2** Given the agent is about to write implementation code When the agent reads routing.md Then an agent-action trigger row maps "Writes any implementation code (new function, class, fix, modification)" to `sdd-superpowers:test-driven-development`
- [ ] **AC-1.3** Given the agent is rationalizing "I'll write the test after" When the agent reads the Common Mistakes section of sdd-workflow/SKILL.md Then an entry explicitly names "Writing implementation code before invoking `test-driven-development`" and the rationalization phrase "I'll write the test after"

### Story 2: Phrase-matched triggers for review skills

**As a** Claude agent in an SDD project
**I want** the routing layer to match exact user phrases ("review this", "the reviewer said", "what do you think of this code") to the correct review skill
**So that** review skills fire when the user naturally requests or gives a review, without needing to name the skill

**Acceptance criteria:**

- [ ] **AC-2.1** Given the user says any of: "review this", "can you review", "take a look", "LGTM?", "what do you think of this code" When the agent reads the Trigger Language section in routing.md Then a user-language trigger row maps those phrases to `sdd-superpowers:requesting-code-review`
- [ ] **AC-2.2** Given the user pastes review feedback, or says "the reviewer said", "based on this feedback", or "fixing review comments" When the agent reads the Trigger Language section in routing.md Then a user-language trigger row maps those signals to `sdd-superpowers:receiving-code-review`
- [ ] **AC-2.3** Given the agent is about to implement any change from review feedback When the agent reads routing.md Then an agent-action trigger row maps "Implements any change from review feedback" to `sdd-superpowers:receiving-code-review`
- [ ] **AC-2.4** Given the Quick Reference table in sdd-workflow/SKILL.md When the agent reads it Then the `requesting-code-review` row reads "User says 'review this'/'can you review', OR at any phase boundary"
- [ ] **AC-2.5** Given the Quick Reference table in sdd-workflow/SKILL.md When the agent reads it Then the `receiving-code-review` row reads "Review feedback received (from human or reviewer subagent) — before implementing any change"
- [ ] **AC-2.6** Given the agent is rationalizing "I'll just implement the review feedback directly" When the agent reads Common Mistakes Then entries exist for both responding to "review this" without invoking `requesting-code-review` and implementing feedback without invoking `receiving-code-review`

### Story 3: Systematic-debugging triggers before any fix attempt

**As a** Claude agent in an SDD project
**I want** `sdd-superpowers:systematic-debugging` to be invoked when something is broken OR before I propose any fix — not only when a task explicitly fails
**So that** I never skip root-cause investigation because the failure was subtle or I thought I already knew the answer

**Acceptance criteria:**

- [ ] **AC-3.1** Given the user says "it's not working", "getting an error", "this fails", "weird behavior", or "why is X happening" When the agent reads the Trigger Language section in routing.md Then a user-language trigger row maps those phrases to `sdd-superpowers:systematic-debugging`
- [ ] **AC-3.2** Given the agent is about to propose or apply any fix When the agent reads routing.md Then an agent-action trigger row maps "Proposes or applies any fix for a failure or unexpected behavior" to `sdd-superpowers:systematic-debugging`
- [ ] **AC-3.3** Given the Quick Reference table in sdd-workflow/SKILL.md When the agent reads it Then the `systematic-debugging` row reads "Test fails, error appears, unexpected behavior, OR before proposing any fix"
- [ ] **AC-3.4** Given the agent is rationalizing "I already know the fix" When the agent reads Common Mistakes Then an entry explicitly names "Proposing a fix without first invoking `systematic-debugging`" and the consequence "symptom fix without root cause = regression risk"

## Functional Requirements

### FR-1: Trigger Language section in `routing.md`

A new `## Trigger Language` section must be added to `sdd-workflow/routing.md` after the full Skill Map table (`## The SDD Skill Map (Full)`) and before `## When Each Skill Is Mandatory`.

**Must:**
- Contain a "User-language triggers" sub-table with columns: "If the user says…" and "Invoke"
- Contain an "Agent-action triggers" sub-table with columns: "Before the agent…" and "Invoke"
- User-language table must include rows for: `requesting-code-review` (review phrases), `receiving-code-review` (feedback phrases), `systematic-debugging` (error/broken phrases)
- Agent-action table must include rows for: `test-driven-development` (writing code), `systematic-debugging` (proposing fix), `requesting-code-review` (moving to next phase), `receiving-code-review` (implementing feedback)
- Follow the existing `routing.md` Markdown table formatting convention

**Must not:**
- Duplicate or replace the Skill Map table — this section supplements it with phrase-level specificity
- Reference any skills not already in the Skill Map

### FR-2: Updated Quick Reference rows in `sdd-workflow/SKILL.md`

The four affected rows in the Quick Reference table must be updated to action-based descriptions.

**Must:**
- `systematic-debugging` row: "Test fails, error appears, unexpected behavior, OR before proposing any fix"
- `requesting-code-review` row: "User says 'review this'/'can you review', OR at any phase boundary"
- `receiving-code-review` row: "Review feedback received (from human or reviewer subagent) — before implementing any change"
- `test-driven-development` row: "Before writing any implementation code — subagent or direct"

**Must not:**
- Change any other rows in the Quick Reference table
- Add new rows to the Quick Reference table

### FR-3: New Common Mistakes entries in `sdd-workflow/SKILL.md`

Four new entries must be appended to the existing `## Common Mistakes` section.

**Must:**
- Entry 1: "Writing implementation code before invoking `sdd-superpowers:test-driven-development` — 'I'll write the test after' is the rationalization"
- Entry 2: "Responding to 'review this' without invoking `sdd-superpowers:requesting-code-review` — the skill dispatches a structured reviewer, not an ad-hoc read"
- Entry 3: "Implementing review feedback without invoking `sdd-superpowers:receiving-code-review` — the skill enforces verify-before-implement"
- Entry 4: "Proposing a fix without first invoking `sdd-superpowers:systematic-debugging` — symptom fix without root cause = regression risk"
- Follow bullet-point format consistent with existing Common Mistakes entries

**Must not:**
- Remove or modify any existing Common Mistakes entries
- Add entries for skills not covered by this spec

## Non-Functional Requirements

### Scannability

- The Quick Reference table in `sdd-workflow/SKILL.md` must remain under 25 rows after changes
- The Trigger Language section must use two separate tables (user-language and agent-action), not one merged table — they represent distinct trigger types

### Consistency

- All table formatting in `routing.md` must match existing table style (pipe-separated Markdown, consistent header underline width)
- Skill references in new content must use fully-qualified `sdd-superpowers:` namespace

### Minimality

- No new files created — changes are confined to two existing files
- No changes to bundled skill SKILL.md files
- No changes to `routing.md` sections other than the insertion of the new Trigger Language section

## Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Trigger Language section inserted in wrong location in routing.md | Section must appear after `## The SDD Skill Map (Full)` and before `## When Each Skill Is Mandatory` — verify by reading surrounding headings |
| Quick Reference row update changes the wrong row | Verify by skill name in the right-hand column before and after the change |
| Common Mistakes entry duplicates an existing entry | Check all existing entries before appending — if equivalent entry exists, update it rather than duplicate |

## Open Questions

None.

## Out of Scope (Future Considerations)

- Updating skill frontmatter `description:` fields for improved system-level matching
- Adding language-pattern triggers for other bundled skills beyond the 4 identified
- Adding a "Trigger Language" equivalent section to individual bundled skill SKILL.md files
