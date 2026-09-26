# Feature 004: Apply Writing-Skills Best Practices to SDD Skill Set

**Status:** Draft
**Created:** 2026-04-17
**Branch:** `004-apply-writing-skills-best-practices`

---

## Problem Statement

The SDD skill set violates the writing-skills best practices established in `writing-skills/` in two ways. First, several SKILL.md `description` fields summarize workflow steps rather than stating triggering conditions, causing Claude to shortcut skill execution (CSO violation). Second, all 18 skills exceed the 500-word target — most averaging ~1100 words, with `sdd-init` at 2282 — bloating context on every load. Additionally, `writing-skills/` itself is not a proper bundled skill in the repo, making it unavailable as a callable skill within the SDD workflow.

## Goals

- Move `writing-skills/` into `skills/writing-skills/` as a proper peer skill with valid SKILL.md frontmatter
- Fix all 18 SDD SKILL.md `description` fields to comply with CSO rules (third-person, "Use when…", no workflow summaries, ≤1024 chars)
- Reduce each SKILL.md to ≤500 words; reduce `sdd-workflow` to ≤200 words
- Add or fix standard structure sections where missing: Overview, When to Use, Quick Reference, Common Mistakes

## Non-Goals

- Renaming skills (no gerund-form renames of existing skill directory names)
- Rewriting the content logic or rules of any skill (structure and weight changes only, not behavioral changes)
- Creating new skills beyond bundling writing-skills
- Modifying `docs/specs/` structure or `CLAUDE.md`

## Users and Context

**Primary users:** Developers working in this SDD repo using Claude Code  
**Usage context:** Every conversation — sdd-workflow loads immediately; other skills load on demand  
**User mental model:** Skills should load fast, be discoverable by keyword, and execute correctly without Claude shortcutting based on description summaries

## User Stories

### Story 1: Bundled Writing Guide
**As a** developer adding a new skill to this repo  
**I want to** invoke `writing-skills` as a callable skill within the SDD workflow  
**So that** I get structured guidance on skill authoring without leaving the project

**Acceptance criteria:**
- [ ] `skills/writing-skills/SKILL.md` exists with valid YAML frontmatter (`name`, `description`)
- [ ] `writing-skills/` at repo root is removed (content moved, not duplicated)
- [ ] `writing-skills` is discoverable via Claude's skill list in this project

### Story 2: CSO-Compliant Descriptions
**As a** Claude agent starting a conversation in this project  
**I want to** read skill descriptions that state only triggering conditions  
**So that** I load and fully execute the skill body rather than shortcutting based on the description

**Acceptance criteria:**
- [ ] All 18 SKILL.md `description` fields start with "Use when…" or equivalent trigger-only phrasing
- [ ] No description summarizes the skill's workflow, steps, or process
- [ ] All descriptions are written in third person
- [ ] All descriptions are ≤1024 characters

### Story 3: Token-Efficient Skills
**As a** Claude agent loading SDD skills during execution  
**I want to** load lightweight SKILL.md files  
**So that** context window is preserved for conversation history and actual work

**Acceptance criteria:**
- [ ] `sdd-workflow/SKILL.md` is ≤200 words
- [ ] All other SKILL.md files are ≤500 words
- [ ] Heavy content moved to separate reference files (e.g., `reference.md`, `checklist.md`) within the same skill directory, referenced from SKILL.md
- [ ] No content is deleted — only reorganized into separate files or compressed

### Story 4: Standard Structure
**As a** developer reading a skill for guidance  
**I want to** find consistent section headers across all skills  
**So that** I can quickly scan to the relevant part

**Acceptance criteria:**
- [ ] Each SKILL.md contains at minimum: Overview (1-2 sentence core principle), When to Use (bullet list), and Quick Reference (table or bullets)
- [ ] Common Mistakes section present in skills that enforce discipline (test-driven-development, verification-before-completion, systematic-debugging, sdd-workflow)
- [ ] No section contains "TBD", "TODO", or vague placeholders

## Functional Requirements

### FR-1: writing-skills Bundling
Move `writing-skills/` to `skills/writing-skills/`. The existing `SKILL.md` at the root of `writing-skills/` becomes the primary entry point. Supporting files (`anthropic-best-practices.md`, `testing-skills-with-subagents.md`, `persuasion-principles.md`, `render-graphs.js`, `graphviz-conventions.dot`, `examples/`) move with it.

**Must:**
- Preserve all existing file content verbatim (move, not rewrite)
- Update the SKILL.md frontmatter `name` and `description` fields to comply with CSO rules
- Remove the `writing-skills/` directory from repo root after move

**Must not:**
- Alter the body content of `writing-skills/SKILL.md` beyond frontmatter

### FR-2: Description Field Rewrites
Each of the 18 existing SDD skills must have its `description` field reviewed and rewritten if it contains workflow summaries.

**Must:**
- Descriptions state only: when to use (triggering conditions, symptoms, situations)
- Descriptions written in third person
- Descriptions ≤1024 characters total (including the `description:` key)

**Must not:**
- Descriptions mention steps, processes, or what happens after the skill is invoked

### FR-3: Word Count Reduction
Each SKILL.md must be trimmed to target word counts using progressive disclosure.

**Must:**
- `sdd-workflow`: ≤200 words in SKILL.md body
- All other skills: ≤500 words in SKILL.md body
- Overflow content moved to named reference files in the same directory (e.g., `routing.md`, `gates.md`, `checklist.md`)
- SKILL.md links to reference files with explicit "See [filename.md]" references

**Must not:**
- Delete any existing rules, gates, checklists, or process steps — only relocate them
- Create reference files deeper than one level from SKILL.md (no nested references)

### FR-4: Structure Standardization
Each SKILL.md must include standard sections.

**Must:**
- `## Overview` — core principle in 1-2 sentences
- `## When to Use` — bullet list of symptoms/triggers + when NOT to use
- `## Quick Reference` — table or bullet list for scanning common operations
- `## Common Mistakes` — in discipline-enforcing skills only

**Must not:**
- Add sections that duplicate content already expressed in the routing table or other skills

## Non-Functional Requirements

### Performance
- Each SKILL.md load adds ≤500 words to context (measured by `wc -w`)
- `sdd-workflow` adds ≤200 words to context

### Reliability
- No existing skill behavior, rules, or gates are weakened or removed by this change
- All cross-skill references remain valid after move of writing-skills

## Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| A skill cannot reach ≤500 words without losing essential gate language | Relocate gate language to a reference file — no content may be deleted, no word-count exception is permitted |
| `writing-skills/` contains files with internal relative links | Update relative links to remain valid after move to `skills/writing-skills/` |
| A skill's description cannot start "Use when…" without sounding wrong | Use equivalent trigger-only phrasing and note deviation |

## Open Questions

*(None — all resolved.)*

- **sdd-init word target:** Applies the same ≤500-word target. No exception.
- **writing-skills in routing table:** Remains discoverable-only. Not added to sdd-workflow routing table.
- **subagent-driven-development:** Exempt from FR-3 word-count reduction and FR-4 structure standardization. Its current content (process flowchart, worked example, status-handling detail) is intentional and should not be trimmed. verify.sh excludes this skill from word-count and section checks.

## Implementation Notes

Changes made during execution that extended beyond FR-1 through FR-4:

- **`sdd-superpowers:` namespace prefix:** All cross-skill references in backticks across every `SKILL.md` and `reference.md` were updated from bare skill names (e.g. `` `sdd-plan` ``) to fully-qualified names (e.g. `` `sdd-superpowers:sdd-plan` ``), matching the `Skill` tool invocation format.
- **HARD-GATE blocks in `sdd-plan` and `sdd-tasks`:** Explicit approval gates added — `sdd-plan` blocks until `spec.md` is user-approved and all `[NEEDS CLARIFICATION]` items are resolved; `sdd-tasks` blocks until `plan.md` is user-approved.

## Out of Scope (Future Considerations)

- Renaming skill directories to gerund form (e.g., `sdd-specify` → `specifying`)
- Adding new skills to the repo
- Automated word-count CI enforcement
- Translating writing-skills tests/evaluations into runnable form
