# Implementation Plan: Improve Skill Trigger Routing in SDD Workflow

> **For agentic workers:** Use sdd-tasks to generate an executable task list from this plan.

**Spec:** docs/specs/010-improve-skill-trigger-routing/spec.md
**Created:** 2026-05-30

---

## Goal

Update `sdd-workflow/SKILL.md` and `sdd-workflow/routing.md` so that four bundled skills — `test-driven-development`, `requesting-code-review`, `receiving-code-review`, and `systematic-debugging` — trigger reliably via action-based Quick Reference rows, explicit Common Mistakes entries, and a new Trigger Language phrase-matching section.

## Architecture

All changes are targeted Markdown edits to two files in `skills/sdd-workflow/`. No new files are created. Phase 1 updates `SKILL.md` (the primary trigger surface loaded on every skill invocation). Phase 2 inserts the Trigger Language section into `routing.md` (the detailed routing reference read when more specificity is needed). Phase 3 verifies all acceptance criteria by grepping for required strings.

## Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Editing | Markdown text edits | All changes are to `.md` skill files — no code, no build step |
| Verification | `grep` / file read | AC verification requires confirming exact strings are present in specific files |

## File Structure

- `skills/sdd-workflow/SKILL.md` — Quick Reference table (4 row updates) + Common Mistakes section (4 new entries) [FR-2, FR-3]
- `skills/sdd-workflow/routing.md` — new `## Trigger Language` section inserted before `## When Each Skill Is Mandatory` [FR-1]

## Complexity Tracking

(Empty — all gates passed)

---

## Phase 0: Verify Baseline (Tests First)

**Implements:** Pre-condition for all FRs | **Satisfies:** Pre-condition for all ACs

Confirm the strings we are about to add are NOT yet present and the strings we are about to replace ARE present. This is the RED state — verifying what we have before changing it.

### 0.1 Verify current SKILL.md Quick Reference contains old trigger text

```bash
grep -n "Each implementer subagent" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
grep -n "Phase boundary during execution" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
grep -n "Implementing fixes after review feedback" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
grep -n "Task fails" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
```

Expected: each grep returns exactly 1 match. These are the rows that will be replaced.

### 0.2 Verify current SKILL.md does NOT yet contain new trigger text

```bash
grep -c "Before writing any implementation code" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
grep -c "Trigger Language" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
grep -c "User-language triggers" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
grep -c "I'll write the test after" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
```

Expected: all return `0`. If any return non-zero, the change already exists — skip that step.

### 0.3 Verify routing.md insertion point exists

```bash
grep -n "When Each Skill Is Mandatory" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
grep -n "Routing: Brainstorm vs. Specify" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
```

Expected: both return exactly 1 match with a line number. The Trigger Language section will be inserted between these two headings.

---

## Phase 1: Update `sdd-workflow/SKILL.md`

**Implements:** FR-2, FR-3 | **Satisfies:** AC-1.1, AC-1.3, AC-2.4, AC-2.5, AC-2.6, AC-3.3, AC-3.4

### 1.1 Update the four Quick Reference rows (FR-2)

Replace the four affected rows in the Quick Reference table. The rows appear consecutively in the table and must be replaced exactly.

Edit `skills/sdd-workflow/SKILL.md`:

```
old_string:
| Task fails | `sdd-superpowers:systematic-debugging` |
| About to claim done | `sdd-superpowers:verification-before-completion` |
| Merge decision | `sdd-superpowers:finishing-a-development-branch` |
| Any git operation (branch, commit, convention) | `sdd-superpowers:using-git` |
| Phase boundary during execution | `sdd-superpowers:requesting-code-review` |
| Implementing fixes after review feedback | `sdd-superpowers:receiving-code-review` |
| Dispatching 2+ independent tasks concurrently | `sdd-superpowers:dispatching-parallel-agents` |
| Executing tasks in current session with subagents | `sdd-superpowers:subagent-driven-development` |
| Each implementer subagent (dispatched from subagent-driven-development) | `sdd-superpowers:test-driven-development` |

new_string:
| Test fails, error appears, unexpected behavior, OR before proposing any fix | `sdd-superpowers:systematic-debugging` |
| About to claim done | `sdd-superpowers:verification-before-completion` |
| Merge decision | `sdd-superpowers:finishing-a-development-branch` |
| Any git operation (branch, commit, convention) | `sdd-superpowers:using-git` |
| User says 'review this'/'can you review', OR at any phase boundary | `sdd-superpowers:requesting-code-review` |
| Review feedback received (from human or reviewer subagent) — before implementing any change | `sdd-superpowers:receiving-code-review` |
| Dispatching 2+ independent tasks concurrently | `sdd-superpowers:dispatching-parallel-agents` |
| Executing tasks in current session with subagents | `sdd-superpowers:subagent-driven-development` |
| Before writing any implementation code — subagent or direct | `sdd-superpowers:test-driven-development` |
```

Verify (GREEN):

```bash
grep "Before writing any implementation code" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
grep "User says 'review this'" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
grep "Review feedback received" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
grep "Test fails, error appears" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
```

Expected: each returns 1 match.

### 1.2 Append four Common Mistakes entries (FR-3)

The existing Common Mistakes section ends with:
```
- Invoking this skill inside a subagent task — subagents skip this skill entirely
```

Append four new entries immediately after that line:

```
old_string:
- Invoking this skill inside a subagent task — subagents skip this skill entirely

new_string:
- Invoking this skill inside a subagent task — subagents skip this skill entirely
- Writing implementation code before invoking `sdd-superpowers:test-driven-development` — "I'll write the test after" is the rationalization
- Responding to "review this" without invoking `sdd-superpowers:requesting-code-review` — the skill dispatches a structured reviewer, not an ad-hoc read
- Implementing review feedback without invoking `sdd-superpowers:receiving-code-review` — the skill enforces verify-before-implement
- Proposing a fix without first invoking `sdd-superpowers:systematic-debugging` — symptom fix without root cause = regression risk
```

Verify (GREEN):

```bash
grep "I'll write the test after" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
grep "symptom fix without root cause" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
grep "dispatches a structured reviewer" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
grep "enforces verify-before-implement" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
```

Expected: each returns 1 match.

Commit: `docs(010): update sdd-workflow SKILL.md trigger descriptions and common mistakes`

---

## Phase 2: Insert Trigger Language Section into `routing.md`

**Implements:** FR-1 | **Satisfies:** AC-1.2, AC-2.1, AC-2.2, AC-2.3, AC-3.1, AC-3.2

### 2.1 Insert `## Trigger Language` section before `## When Each Skill Is Mandatory`

The insertion anchor is the heading `## When Each Skill Is Mandatory`. Insert the new section immediately before it.

Edit `skills/sdd-workflow/routing.md`:

```
old_string:
## When Each Skill Is Mandatory

new_string:
## Trigger Language

The following tables map exact user phrases and agent-action signals to bundled skills. These supplement the Skill Map above with phrase-level specificity — use when the situation description in the Skill Map is insufficient.

### User-language triggers

| If the user says… | Invoke |
|-------------------|--------|
| "review this", "can you review", "take a look", "LGTM?", "what do you think of this code" | `sdd-superpowers:requesting-code-review` |
| Pastes review feedback, "the reviewer said", "based on this feedback", "fixing review comments" | `sdd-superpowers:receiving-code-review` |
| "it's not working", "getting an error", "this fails", "weird behavior", "why is X happening" | `sdd-superpowers:systematic-debugging` |

### Agent-action triggers

| Before the agent… | Invoke |
|-------------------|--------|
| Writes any implementation code (new function, class, fix, modification) | `sdd-superpowers:test-driven-development` |
| Proposes or applies any fix for a failure or unexpected behavior | `sdd-superpowers:systematic-debugging` |
| Moves to the next implementation phase | `sdd-superpowers:requesting-code-review` |
| Implements any change from review feedback | `sdd-superpowers:receiving-code-review` |

---

## When Each Skill Is Mandatory
```

Verify (GREEN):

```bash
grep -n "Trigger Language" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
grep "User-language triggers" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
grep "Agent-action triggers" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
grep "it's not working" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
grep "Writes any implementation code" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
```

Expected: all return matches. Confirm `## Trigger Language` appears before `## When Each Skill Is Mandatory` by checking line numbers.

Commit: `docs(010): add Trigger Language section to sdd-workflow routing.md`

---

## Phase 3: Integration Verification

**Implements:** All FRs | **Satisfies:** All ACs

### 3.1 Verify all AC strings are present

```bash
# AC-1.1: TDD row in SKILL.md
grep "Before writing any implementation code — subagent or direct" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md

# AC-1.2: TDD in agent-action table in routing.md
grep "Writes any implementation code" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md

# AC-1.3: TDD Common Mistakes entry with rationalization phrase
grep "I'll write the test after" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md

# AC-2.1: requesting-code-review user-language trigger
grep "review this.*can you review" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md || grep "review this" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md

# AC-2.2: receiving-code-review user-language trigger
grep "the reviewer said" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md

# AC-2.3: receiving-code-review agent-action trigger
grep "Implements any change from review feedback" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md

# AC-2.4: requesting-code-review row in SKILL.md
grep "User says 'review this'" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md

# AC-2.5: receiving-code-review row in SKILL.md
grep "Review feedback received" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md

# AC-2.6: Common Mistakes entries for review skills
grep "dispatches a structured reviewer" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
grep "enforces verify-before-implement" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md

# AC-3.1: systematic-debugging user-language trigger
grep "it's not working" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md

# AC-3.2: systematic-debugging agent-action trigger
grep "Proposes or applies any fix" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md

# AC-3.3: systematic-debugging row in SKILL.md
grep "Test fails, error appears" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md

# AC-3.4: systematic-debugging Common Mistakes entry
grep "symptom fix without root cause" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
```

All 14 greps must return matches. Any miss = incomplete implementation, do not proceed.

### 3.2 Verify section order in routing.md

```bash
grep -n "The SDD Skill Map\|Trigger Language\|When Each Skill Is Mandatory" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
```

Expected: line numbers increase in order — Skill Map < Trigger Language < When Each Skill Is Mandatory.

### 3.3 Verify no old trigger text remains

```bash
grep "Each implementer subagent (dispatched from subagent-driven-development)" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
grep "^| Phase boundary during execution |" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
grep "^| Implementing fixes after review feedback |" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
grep "^| Task fails |" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
```

Expected: all return empty (no matches). Old text fully replaced.

---

## Quickstart Validation

Read both updated files and confirm by eye:

1. `skills/sdd-workflow/SKILL.md` Quick Reference table — the 4 updated rows use action-based language
2. `skills/sdd-workflow/SKILL.md` Common Mistakes — 4 new entries visible at the bottom of the section
3. `skills/sdd-workflow/routing.md` — `## Trigger Language` section with two sub-tables appears before `## When Each Skill Is Mandatory`
