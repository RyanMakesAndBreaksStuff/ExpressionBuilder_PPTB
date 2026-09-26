# Implementation Plan: Improve SDD Workflow Skills

> **For agentic workers:** Use sdd-tasks to generate an executable task list from this plan.

**Spec:** docs/specs/005-improve-sdd-workflow-skills/spec.md
**Created:** 2026-04-18

---

## Goal

Add missing structural sections to sdd-plan, sdd-tasks, sdd-execute, and sdd-specify SKILL.md files so each is self-sufficient for critical guidance without requiring reference.md.

## Architecture

Four SKILL.md files are edited in sequence. Each edit appends or inserts new sections derived from patterns in the superpowers writing-plans and executing-plans skills, adapted for the SDD context. No reference.md files are modified. All HARD-GATE blocks are preserved unchanged.

## Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Editing | Markdown + Edit tool | Skills are plain Markdown files |
| Verification | Read tool + manual checklist | No executable tests for markdown; verify by inspection |

## File Structure

- `skills/sdd-plan/SKILL.md` — add Scope Check, File Structure, No Placeholders, Self-Review, Execution Handoff (FR-1)
- `skills/sdd-tasks/SKILL.md` — add Bite-Sized Task Granularity, No Placeholders, Remember, Execution Handoff (FR-2)
- `skills/sdd-execute/SKILL.md` — add When to Stop and Ask, Remember, Integration (FR-3)
- `skills/sdd-specify/SKILL.md` — add Remember, Self-Review (FR-4)

## Complexity Tracking

All pre-implementation gates passed. No violations to document.

---

## Phase 0: Verification Baseline

**Implements:** All FRs (baseline before editing)

### 0.1 Read all four SKILL.md files

- [ ] Read `skills/sdd-plan/SKILL.md` — confirm current sections, locate insertion point after Quick Reference
- [ ] Read `skills/sdd-tasks/SKILL.md` — confirm current sections, locate insertion point after Quick Reference
- [ ] Read `skills/sdd-execute/SKILL.md` — confirm current sections, locate insertion point after Quick Reference
- [ ] Read `skills/sdd-specify/SKILL.md` — confirm current sections, locate insertion point after Quick Reference

**Verification:** All four files readable, HARD-GATE blocks identified and noted for preservation.

---

## Phase 1: Update sdd-plan SKILL.md

**Implements:** FR-1

### 1.1 Add Scope Check section

Insert after the HARD-GATE block, before "## When to Use":

```markdown
## Scope Check

If the spec covers multiple independent subsystems, suggest breaking it into sub-specs before planning. Each plan should produce working, testable software on its own.
```

- [ ] Insert Scope Check section
- [ ] Verify HARD-GATE block is unchanged
- [ ] Verify section appears before "## When to Use"

### 1.2 Add File Structure section

Append after "## Quick Reference":

```markdown
## File Structure

Before defining tasks, map every file that will be created or modified and its single responsibility. This informs task decomposition — each task should produce self-contained changes.

- Design units with clear boundaries and one responsibility per file
- Files that change together should live together
- In existing codebases, follow established patterns
```

- [ ] Insert File Structure section
- [ ] Verify it appears after Quick Reference

### 1.3 Add No Placeholders section

Append after File Structure:

```markdown
## No Placeholders

These are plan failures — never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "handle edge cases" (without code)
- "Write tests for the above" (without actual test code)
- "Similar to Task N" — repeat the code; tasks may be read out of order
- Steps that describe what to do without showing how (code blocks required for every code step)
- References to types or functions not defined in any task
```

- [ ] Insert No Placeholders section

### 1.4 Add Self-Review section

Append after No Placeholders:

```markdown
## Self-Review

After writing the complete plan, check inline — no subagent needed:

1. **Spec coverage** — every FR has a phase that implements it; list any gaps
2. **Placeholder scan** — search for patterns from "No Placeholders" above; fix any found
3. **Type consistency** — function names and signatures match across all phases

Fix issues before presenting to user.
```

- [ ] Insert Self-Review section

### 1.5 Add Execution Handoff section

Append at end of SKILL.md:

```markdown
## Execution Handoff

After saving `plan.md`, offer:

> "Plan complete. Next: run `sdd-superpowers:sdd-tasks` to generate the executable task list."
```

- [ ] Insert Execution Handoff section
- [ ] Read final sdd-plan SKILL.md — confirm all 5 sections present, no duplication, HARD-GATE intact
- [ ] Commit: `feat(005): add Scope Check, File Structure, No Placeholders, Self-Review, Execution Handoff to sdd-plan`

---

## Phase 2: Update sdd-tasks SKILL.md

**Implements:** FR-2

### 2.1 Add Bite-Sized Task Granularity section

Append after "## Quick Reference":

```markdown
## Bite-Sized Task Granularity

Each step is one action (2–5 minutes):
- "Write the failing test" — one step
- "Run it to verify it fails" — one step
- "Write minimal implementation" — one step
- "Run tests to verify they pass" — one step
- "Commit" — one step
```

- [ ] Insert Bite-Sized Task Granularity section

### 2.2 Add No Placeholders section

Append after Bite-Sized Task Granularity:

```markdown
## No Placeholders

These are task failures — never write them:
- "TBD", "TODO", "implement later"
- "Add error handling" / "handle edge cases" (without code)
- "Similar to Task N" — repeat the code; tasks may be read out of order
- Steps that reference types or functions not defined in any prior task
- Verification steps without an exact command and expected output
```

- [ ] Insert No Placeholders section

### 2.3 Add Remember section

Append after No Placeholders:

```markdown
## Remember

- Exact file paths always — never relative or partial paths
- Complete code in every task — show the entire function, not just changed lines
- Exact commands with expected output — `pytest tests/foo.py::test_bar -v` / Expected: PASS
- Every implementation step must have a prior failing test step
```

- [ ] Insert Remember section

### 2.4 Add Execution Handoff section

Append at end of SKILL.md:

```markdown
## Execution Handoff

After saving `tasks.md`, offer:

> "Task list complete. Next: run `sdd-superpowers:sdd-execute` to begin implementation."
```

- [ ] Insert Execution Handoff section
- [ ] Read final sdd-tasks SKILL.md — confirm all 4 sections present, HARD-GATE intact
- [ ] Commit: `feat(005): add Bite-Sized Task Granularity, No Placeholders, Remember, Execution Handoff to sdd-tasks`

---

## Phase 3: Update sdd-execute SKILL.md

**Implements:** FR-3

### 3.1 Add When to Stop and Ask section

Append after "## Quick Reference":

```markdown
## When to Stop and Ask

**STOP executing immediately when:**
- A dependency is missing or broken
- A test fails repeatedly with no clear fix path
- An instruction in the plan is unclear or contradictory
- A plan gap prevents you from starting a task

Ask for clarification rather than guessing. Don't force through blockers.
```

- [ ] Insert When to Stop and Ask section

### 3.2 Add Remember section

Append after When to Stop and Ask:

```markdown
## Remember

- Follow plan steps exactly — don't improvise or optimize away steps
- Don't skip verifications
- Reference sub-skills when the plan says to
- Stop when blocked — never guess past a blocker
- Never start implementation on main/master without explicit user consent
```

- [ ] Insert Remember section

### 3.3 Add Integration section

Append at end of SKILL.md:

```markdown
## Integration

Required sub-skills during execution:

| When | Sub-skill |
|------|-----------|
| Every implementation task | `sdd-superpowers:test-driven-development` |
| Phase boundary | `sdd-superpowers:requesting-code-review` |
| About to claim done | `sdd-superpowers:verification-before-completion` |
| All tasks complete | `sdd-superpowers:finishing-a-development-branch` |
```

- [ ] Insert Integration section
- [ ] Read final sdd-execute SKILL.md — confirm all 3 sections present, HARD-GATE intact
- [ ] Commit: `feat(005): add When to Stop and Ask, Remember, Integration to sdd-execute`

---

## Phase 4: Update sdd-specify SKILL.md

**Implements:** FR-4

### 4.1 Add Remember section

Append after "## Quick Reference":

```markdown
## Remember

- Requirements describe WHAT, never HOW — no technology mentions in the spec
- Every acceptance criterion must be testable (convertible to a passing/failing test)
- Use `[NEEDS CLARIFICATION]` over vague text — never leave ambiguity unmarked
```

- [ ] Insert Remember section

### 4.2 Add Self-Review section

Append at end of SKILL.md:

```markdown
## Self-Review

After writing the spec, check inline — no subagent needed:

1. **Testability** — every acceptance criterion can become a passing/failing test
2. **No placeholders** — no vague text; `[NEEDS CLARIFICATION]` used where needed
3. **Goals vs Non-Goals** — each item is in the right section
4. **Open Questions** — all unknowns explicitly captured

Fix issues before presenting the spec to the user.
```

- [ ] Insert Self-Review section
- [ ] Read final sdd-specify SKILL.md — confirm both sections present, HARD-GATE intact
- [ ] Commit: `feat(005): add Remember, Self-Review to sdd-specify`

---

## Phase 5: Integration Verification

**Implements:** All FRs

- [ ] Read all four updated SKILL.md files — verify each required section is present per spec FR
- [ ] Confirm no HARD-GATE block was modified in any file
- [ ] Confirm no existing Quick Reference content was removed
- [ ] Commit: `feat(005): complete sdd workflow skill improvements`

---

## Quickstart Validation

1. Open `skills/sdd-plan/SKILL.md` — confirm Scope Check, File Structure, No Placeholders, Self-Review, Execution Handoff sections visible
2. Open `skills/sdd-tasks/SKILL.md` — confirm Bite-Sized Task Granularity, No Placeholders, Remember, Execution Handoff sections visible
3. Open `skills/sdd-execute/SKILL.md` — confirm When to Stop and Ask, Remember, Integration sections visible
4. Open `skills/sdd-specify/SKILL.md` — confirm Remember, Self-Review sections visible
5. Verify no HARD-GATE blocks were altered in any file
