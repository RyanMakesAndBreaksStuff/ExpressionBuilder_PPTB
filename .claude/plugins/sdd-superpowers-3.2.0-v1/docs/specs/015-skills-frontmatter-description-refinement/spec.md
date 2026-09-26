# Feature 015: Skills Frontmatter and Description Refinement

**Status:** Approved
**Version:** 2.0.0
**Created:** 2026-06-24
**Branch:** `015-skills-frontmatter-description-refinement`

---

## Change Log

| Version | Change |
|---------|--------|
| 1.0.0 | Initial approved spec (5 stories including allowed-tools) |
| 2.0.0 | MAJOR — removed Story 3 (allowed-tools frontmatter); skills choose tools freely |

---

## Problem Statement

An audit of all 19 SDD skills against Anthropic's official skill authoring best practices and the community frontmatter reference (shanraisshan/claude-code-best-practice) revealed three categories of defects:

1. **CSO violations in descriptions** — Five skill descriptions contain workflow summaries or process details. Per Anthropic's testing, when a description summarises what the skill *does*, Claude may follow the description as a shortcut and skip the skill body entirely. The trigger in a description must be *when to use*, never *what happens*.

2. **Missing `user-invocable: false` on sdd-workflow** — `sdd-workflow` is always auto-invoked by `CLAUDE.md`; it is never a user slash command. Its presence in the `/` menu causes confusion and accidental invocations. The `user-invocable: false` frontmatter field hides it from the menu while keeping it auto-triggerable.

3. **Two content bugs** — A broken integration table row in `sdd-execute` renders outside the table, hiding a sub-skill reference; and an inconsistent lowercase section heading in `systematic-debugging` ("## your human partner's Signals You're Doing It Wrong") breaks document style.

---

## Goals

- Fix all five CSO-violating descriptions so they contain only triggering conditions
- Add `user-invocable: false` to `sdd-workflow`
- Fix the broken table row in `sdd-execute/SKILL.md`
- Fix the heading capitalisation in `systematic-debugging/SKILL.md`

---

## Non-Goals

- Rewriting skill bodies, logic, or workflow steps (descriptions and frontmatter only, except the two content bugs)
- Adding `allowed-tools` frontmatter — skills choose their tools freely with no pre-declaration
- Adding `model` or `effort` frontmatter overrides (insufficient evidence of benefit without evaluation data)
- Introducing a formal evaluation file structure (separate concern)
- Modifying `writing-skills` (treated as a meta-skill, out of scope per user direction)
- Progressive disclosure splitting of `test-driven-development` or `systematic-debugging` (both are under the 500-line limit)
- Adding `when_to_use` frontmatter (the CSO description fixes make it redundant for this skill set)

---

## Users and Context

**Primary user:** Claude itself — reading skill descriptions at session start to decide which skill to load, and reading skill bodies once loaded.

**Secondary user:** Developers — seeing `sdd-workflow` in the slash menu (confusion), and reading rendered skill content in the IDE (broken table, broken heading).

**Usage context:** Every SDD session. Descriptions are evaluated at startup; frontmatter fields affect menu rendering; content bugs surface whenever the affected skill body is read.

---

## User Stories

### Story 1: Description as Pure Trigger (CSO Fix)

**As** Claude evaluating which skill to invoke  
**I want** skill descriptions to contain only triggering conditions — never workflow summaries or output descriptions  
**So that** I read the full skill body rather than shortcutting from a description that already tells me what to do

**Acceptance criteria:**

- [ ] **AC-1.1** `sdd-workflow` description is `"Use when starting any conversation in an SDD project"` — the trailing phrase `"— establishes skill invocation order"` is removed
- [ ] **AC-1.2** `sdd-brainstorm` description ends after the triggering condition; the clause `"when you need to explore 2-3 directions and agree on a design first"` is removed
- [ ] **AC-1.3** `sdd-tasks` description no longer contains the output description `"ordered, checkboxed task list"` or the sequencing phrase `"after sdd-plan and before sdd-execute"`
- [ ] **AC-1.4** `sdd-spec-update` description no longer contains the workflow clause `"to assess impact, version the spec, and propagate changes downstream"`
- [ ] **AC-1.5** `verification-before-completion` description no longer contains the process instruction `"— run the verification command and read the output before making any success claim"`
- [ ] **AC-1.6** All five revised descriptions remain in third person, begin with "Use when", and include enough specificity for Claude to distinguish this skill from adjacent ones

### Story 2: sdd-workflow Hidden from Slash Menu

**As** a developer typing `/` in Claude Code  
**I want** `sdd-workflow` to not appear in the slash menu  
**So that** I am not confused by a skill I never invoke directly (it is auto-triggered by CLAUDE.md)

**Acceptance criteria:**

- [ ] **AC-2.1** `sdd-workflow/SKILL.md` frontmatter contains `user-invocable: false`
- [ ] **AC-2.2** The skill remains auto-triggerable from `CLAUDE.md`'s `invoke sdd-superpowers:sdd-workflow` instruction — `user-invocable: false` does not disable auto-invocation
- [ ] **AC-2.3** No other skill has `user-invocable: false` added (sdd-workflow is the only skill never directly invoked by a user)

### Story 3: Fixed Integration Table in sdd-execute

**As** a developer or Claude reading `sdd-execute/SKILL.md`  
**I want** the Integration sub-skills table to render correctly with all rows inside the table  
**So that** no sub-skill reference is hidden outside the table boundary

**Acceptance criteria:**

- [ ] **AC-3.1** The `> **Note:**` block in `sdd-execute/SKILL.md` is moved to below the Integration table (was between table rows)
- [ ] **AC-3.2** The Integration table in `sdd-execute/SKILL.md` renders with no rows appearing outside the table boundary

### Story 4: Consistent Heading Capitalisation in systematic-debugging

**As** a developer reading `systematic-debugging/SKILL.md`  
**I want** all section headings to follow consistent title case  
**So that** the document looks professional and the heading is correctly parseable as a section marker

**Acceptance criteria:**

- [ ] **AC-4.1** The heading `## your human partner's Signals You're Doing It Wrong` is changed to `## Your Human Partner's Signals You're Doing It Wrong`

---

## Functional Requirements

**FR-1 — Description CSO rules (derived from Story 1):**  
A skill description MUST contain only triggering conditions (when to use). It MUST NOT contain: output descriptions (what the skill produces), workflow summaries (what the skill does step-by-step), sequencing directives (after X, before Y), or process instructions (how to use the skill).

**FR-2 — user-invocable frontmatter (derived from Story 2):**  
`sdd-workflow/SKILL.md` MUST have `user-invocable: false` in its YAML frontmatter. No other skill in this feature receives this field.

**FR-3 — Content bug repair (derived from Stories 3–4):**  
Broken Markdown that prevents correct rendering (a misplaced `>` block that breaks a table) and inconsistent heading capitalisation MUST be corrected. Corrections MUST be minimal — only the defective text is changed.

---

## Non-Functional Requirements

**NFR-1 — No behaviour change:** Every skill's workflow logic, content, and instructions remain identical after this change. Only frontmatter fields, descriptions (one line each), and the two content bugs are modified.

**NFR-2 — Description length:** No revised description exceeds 200 characters.

**NFR-3 — All 19 skills remain functional:** After changes, every skill body is syntactically valid Markdown with well-formed YAML frontmatter.

---

## Error Scenarios

**E-1 — `user-invocable: false` not recognised:** If the running version does not support `user-invocable`, `sdd-workflow` continues to appear in the slash menu — no regression in auto-invocation behaviour.

---

## Open Questions

None.

---

## Out of Scope

- `allowed-tools` frontmatter on any skill
- Evaluation file structure for skills
- `model` or `effort` frontmatter additions
- Any rewrite of skill body content beyond the two named bugs
- Changes to `writing-skills`
- Progressive disclosure splits for `test-driven-development` or `systematic-debugging`
- Changes to `CLAUDE.md` or memory files
