# Implementation Plan: Feature 015 — Skills Frontmatter and Description Refinement

**Spec:** `docs/specs/015-skills-frontmatter-description-refinement/spec.md` (v2.0.0)
**Branch:** `015-skills-frontmatter-description-refinement`

---

## Goal

Apply two categories of targeted edits to 7 skill SKILL.md files: fix five CSO-violating descriptions (with `user-invocable: false` on sdd-workflow), and repair two content bugs. No `allowed-tools` frontmatter. No skill logic, body content, or workflow steps change beyond the named bugs.

---

## Architecture

No new files. No new abstractions. Pure text edits to existing files.

---

## Tech Stack

- Markdown + YAML frontmatter (Edit tool)
- Bash `grep` for verification

---

## File Change Map

| File | Changes |
|------|---------|
| `skills/sdd-workflow/SKILL.md` | Description fix (FR-1) + `user-invocable: false` (FR-2) |
| `skills/sdd-brainstorm/SKILL.md` | Description fix (FR-1) |
| `skills/sdd-tasks/SKILL.md` | Description fix (FR-1) |
| `skills/sdd-spec-update/SKILL.md` | Description fix (FR-1) |
| `skills/verification-before-completion/SKILL.md` | Description fix (FR-1) |
| `skills/sdd-execute/SKILL.md` | Table bug fix (FR-3) |
| `skills/systematic-debugging/SKILL.md` | Heading fix (FR-3) |

---

## Phases

### Phase 1 — Description CSO Fixes + sdd-workflow Frontmatter

All five files are independent. All can run concurrently.

#### Task A — sdd-workflow: description + user-invocable

**Current frontmatter:**
```yaml
---
name: sdd-workflow
description: Use when starting any conversation in an SDD project — establishes skill invocation order
---
```

**New frontmatter:**
```yaml
---
name: sdd-workflow
description: Use when starting any conversation in an SDD project
user-invocable: false
---
```

**Verification:**
```bash
grep "^description:\|user-invocable" skills/sdd-workflow/SKILL.md
```
Expected: description ends at "SDD project"; `user-invocable: false` present

#### Task B — sdd-brainstorm: description fix

**Current:**
```yaml
description: Use when an idea is fuzzy, exploratory, or has competing approaches — before sdd-specify, when you need to explore 2-3 directions and agree on a design first
```

**New:**
```yaml
description: Use when an idea is fuzzy, exploratory, or has competing approaches that need design exploration before specification
```

**Verification:**
```bash
grep "^description:" skills/sdd-brainstorm/SKILL.md
```
Expected: no mention of "2-3 directions" or "agree on a design"

#### Task C — sdd-tasks: description fix

**Current:**
```yaml
description: Use when an implementation plan exists and needs to become an ordered, checkboxed task list — after sdd-plan and before sdd-execute
```

**New:**
```yaml
description: Use when an implementation plan is approved and needs to be broken down into executable tasks
```

**Verification:**
```bash
grep "^description:" skills/sdd-tasks/SKILL.md
```
Expected: no mention of "checkboxed", "after sdd-plan", or "before sdd-execute"

#### Task D — sdd-spec-update: description fix

**Current:**
```yaml
description: Use when a user describes a change, addition, or correction to an in-progress feature — after a spec exists but before or during implementation — to assess impact, version the spec, and propagate changes downstream
```

**New:**
```yaml
description: Use when a user describes a change, addition, or correction to an approved spec — during or before implementation
```

**Verification:**
```bash
grep "^description:" skills/sdd-spec-update/SKILL.md
```
Expected: no mention of "assess impact", "version the spec", or "propagate"

#### Task E — verification-before-completion: description fix

**Current:**
```yaml
description: Use when about to claim work is complete, fixed, or passing — run the verification command and read the output before making any success claim
```

**New:**
```yaml
description: Use when about to claim work is complete, fixed, or passing
```

**Verification:**
```bash
grep "^description:" skills/verification-before-completion/SKILL.md
```
Expected: description ends at "passing"

---

### Phase 2 — Content Bug Fixes

#### Task F — sdd-execute: fix broken integration table

**Problem:** A `> **Note:**` block appears between table rows, breaking the Markdown table.

**Old (Integration section body):**
```markdown
| When | Sub-skill |
|------|-----------|
| Executing tasks in current session | `sdd-superpowers:subagent-driven-development` |
| Dispatching a parallel task group (2+ tasks) | `sdd-superpowers:dispatching-parallel-agents` |
| Per-task commits | `sdd-superpowers:using-git` |

> **Note:** `sdd-superpowers:test-driven-development` is mandated for **implementer subagents** dispatched by `subagent-driven-development` — not invoked directly by the controller.
| Phase boundary | `sdd-superpowers:requesting-code-review` |
| Implementing fixes after review feedback | `sdd-superpowers:receiving-code-review` |
| Task fails or behavior unexpected | `sdd-superpowers:systematic-debugging` |
| About to claim done | `sdd-superpowers:verification-before-completion` |
| All tasks complete | `sdd-superpowers:sdd-review` (required before merge) |
| sdd-review passes | `sdd-superpowers:finishing-a-development-branch` |
```

**New:**
```markdown
| When | Sub-skill |
|------|-----------|
| Executing tasks in current session | `sdd-superpowers:subagent-driven-development` |
| Dispatching a parallel task group (2+ tasks) | `sdd-superpowers:dispatching-parallel-agents` |
| Per-task commits | `sdd-superpowers:using-git` |
| Phase boundary | `sdd-superpowers:requesting-code-review` |
| Implementing fixes after review feedback | `sdd-superpowers:receiving-code-review` |
| Task fails or behavior unexpected | `sdd-superpowers:systematic-debugging` |
| About to claim done | `sdd-superpowers:verification-before-completion` |
| All tasks complete | `sdd-superpowers:sdd-review` (required before merge) |
| sdd-review passes | `sdd-superpowers:finishing-a-development-branch` |

> **Note:** `sdd-superpowers:test-driven-development` is mandated for **implementer subagents** dispatched by `subagent-driven-development` — not invoked directly by the controller.
```

**Verification:**
```bash
grep -n "finishing-a-development-branch\|Note:" skills/sdd-execute/SKILL.md
```
Expected: `finishing-a-development-branch` line < `Note:` line

#### Task G — systematic-debugging: fix heading capitalisation

**Old:** `## your human partner's Signals You're Doing It Wrong`  
**New:** `## Your Human Partner's Signals You're Doing It Wrong`

**Verification:**
```bash
grep "^## [Yy]our" skills/systematic-debugging/SKILL.md
```
Expected: capital Y and H

---

## Self-Review

**Spec coverage:**

| FR | Tasks covering it |
|----|------------------|
| FR-1 (description CSO fixes) | Phase 1, Tasks A–E |
| FR-2 (user-invocable: false) | Phase 1, Task A |
| FR-3 (content bugs) | Phase 2, Tasks F–G |

All FRs covered. No gaps. No `allowed-tools` anywhere.

**Placeholder scan:** No TBD or vague steps.

---

## Execution Handoff

Plan complete. Next: run `sdd-superpowers:sdd-tasks` to generate the executable task list.
