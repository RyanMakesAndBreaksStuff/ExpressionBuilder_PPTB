# Design: Skill Best-Practices Alignment (B + C)

**Date:** 2026-06-24
**Feature slug:** 016-skill-best-practices-alignment

---

## Problem

An audit of all 19 SDD skills against Anthropic's official skill authoring best practices
revealed two structural gaps that affect reliability across the entire portfolio:

1. **No `<examples>` XML blocks anywhere.** Per Anthropic's testing, when a skill lacks
   few-shot examples, Claude may follow its own priors instead of the skill's intent.
   Structured examples with correct/incorrect scenarios anchor behavior directly.

2. **No explicit `## Constraints` or `## Error Handling` sections.** Guardrails are
   implied in prose or `<HARD-GATE>` blocks, not structured. Edge-case behavior
   (missing context, user requesting a bypass) is undefined in most skills.

`writing-skills` is excluded — it is a meta-skill and out of scope.

---

## Scope

All **19 SDD skills**:

- dispatching-parallel-agents
- finishing-a-development-branch
- receiving-code-review
- requesting-code-review
- sdd-brainstorm
- sdd-execute
- sdd-init
- sdd-plan
- sdd-research
- sdd-review
- sdd-spec-update
- sdd-specify
- sdd-tasks
- sdd-workflow
- subagent-driven-development
- systematic-debugging
- test-driven-development
- using-git
- verification-before-completion

---

## Direction B — `<examples>` XML Blocks

### Placement

After `## Overview`, before the main workflow section.

### Format

```markdown
<examples>
<example>
<context>Short description of the triggering situation</context>
<correct>What Claude should do — invokes skill, follows protocol</correct>
<incorrect>The rationalization or shortcut Claude must NOT take</incorrect>
</example>
</examples>
```

### Coverage

**Phase 1 skills** (2 examples each — high ambiguity, common bypass rationalizations):

| Skill | Example 1 focus | Example 2 focus |
|---|---|---|
| test-driven-development | User says "I'll write the test after" | User says "it's just a one-liner" |
| systematic-debugging | User says "just patch line 42" | Unexpected test failure with obvious-looking cause |
| verification-before-completion | User says "the tests passed earlier" | User says "I can see it working" |
| sdd-specify | Clear feature request, no spec exists | Resuming after a gap — spec already exists |
| sdd-execute | tasks.md exists, user says "let's go" | User asks to skip a task |
| sdd-brainstorm | Fuzzy idea with competing approaches | Idea that sounds clear but has hidden trade-offs |
| requesting-code-review | Phase boundary reached | User says "looks good to me, let's merge" |

**Phase 2 skills** (1 example each — clarify the trigger boundary):

All remaining 12 skills get one example focused on the most common invocation confusion
(e.g. when NOT to invoke, or the most frequent bypass rationalization).

### Constraints on examples

- Examples show **when to invoke** and **what not to do instead** — not the internal workflow steps
- `<incorrect>` must reflect a real rationalization from the "Red Flags" list in sdd-workflow, not a strawman
- No example exceeds 3 sentences per field

---

## Direction C — `## Constraints` + `## Error Handling` Sections

### Placement

Appended as the final two sections before any closing notes.

### Format

```markdown
## Constraints

- Does NOT [hard boundary 1]
- Does NOT [hard boundary 2]
- [Gate: what cannot be bypassed under any circumstance]

## Error Handling

- **[Missing input]**: [What Claude does — ask, default, or halt]
- **[Ambiguous situation]**: [Default behavior]
- **User requests gate bypass**: Name the gate, explain why it holds, offer the correct path forward
```

### Rules

- Constraints use "Does NOT" language — declarative, not conditional
- Skills that already have `<HARD-GATE>` blocks get Constraints sections that match the gate language exactly (no contradiction)
- Every skill gets "**User requests gate bypass**" as the last Error Handling entry, because every skill has at least one gate
- Error Handling entries are concrete: name the specific missing input, not a generic "if something is wrong"

---

## Prioritization

**Phase 1** — 7 skills (highest traffic, most bypass risk):
`test-driven-development`, `systematic-debugging`, `verification-before-completion`,
`sdd-specify`, `sdd-execute`, `sdd-brainstorm`, `requesting-code-review`

**Phase 2** — 12 remaining skills.

Single spec, single branch (`016-skill-best-practices-alignment`), single clean commit.
Tasks split per skill to allow parallel execution.

---

## Non-Goals

- Rewriting skill bodies, logic, or workflow steps
- Adding `allowed-tools` frontmatter
- Modifying `writing-skills`
- Adding `when_to_use` frontmatter
- Changing description text (015 already fixed CSO violations)
- Splitting any skill into sub-files (none exceed 500 lines)

---

## Success Criteria

- Every skill's SKILL.md contains an `<examples>` block
- Every skill's SKILL.md contains `## Constraints` and `## Error Handling` sections
- No existing `<HARD-GATE>` block contradicts its skill's new Constraints section
- No skill exceeds 500 lines after additions (if any would, extract to reference.md first)
- All changes on branch `016-skill-best-practices-alignment`, single commit
