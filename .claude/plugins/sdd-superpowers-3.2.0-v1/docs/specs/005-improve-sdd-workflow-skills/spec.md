# Spec: Improve SDD Workflow Skills

**Feature:** 005-improve-sdd-workflow-skills
**Status:** Approved

---

## Problem Statement

The core SDD workflow skills (sdd-plan, sdd-tasks, sdd-execute, sdd-specify) lack structural sections that their superpowers counterparts (writing-plans, executing-plans) include. As a result, SKILL.md files are not self-sufficient — critical guidance is deferred to reference.md, making skills harder to follow in practice. An agent reading only SKILL.md may miss essential guardrails, anti-patterns, and handoff instructions.

---

## Goals

- Make each core SDD workflow SKILL.md self-contained for the most critical guidance
- Add structural sections from superpowers that are missing in sdd skills
- Preserve the SKILL.md/reference.md split — reference.md remains the home for templates, full checklists, and detailed examples
- Maintain all existing HARD-GATE blocks and SDD discipline

---

## Non-Goals

- Rewriting reference.md files (templates and detailed processes stay as-is)
- Changing the SDD workflow order or methodology
- Modifying non-workflow skills (systematic-debugging, finishing-a-development-branch, etc.)
- Adding new workflow skills

---

## Users and Context

**Primary user:** Claude (the agent) reading SKILL.md during a live session.
**Secondary user:** Human reviewing what the skill does before invoking it.

Skills are loaded once per invocation. If critical guidance isn't in SKILL.md, the agent may not encounter it in time to act on it.

---

## User Stories

### Story 1: Agent uses sdd-plan without gaps
As an agent executing sdd-plan, I need File Structure, No Placeholders, Scope Check, Self-Review, and Execution Handoff sections so I produce a complete, implementable plan without needing to read reference.md for basic guardrails.

**Acceptance criteria:**
- sdd-plan SKILL.md contains a File Structure section instructing the agent to map files before defining tasks
- sdd-plan SKILL.md contains a No Placeholders section listing anti-patterns (TBD, TODO, "add error handling", etc.)
- sdd-plan SKILL.md contains a Scope Check section for detecting multi-subsystem specs
- sdd-plan SKILL.md contains a Self-Review checklist (spec coverage, placeholder scan, type consistency)
- sdd-plan SKILL.md contains an Execution Handoff offering sdd-tasks as next step

### Story 2: Agent uses sdd-tasks without gaps
As an agent executing sdd-tasks, I need Bite-Sized Task Granularity, No Placeholders, Remember, and Execution Handoff sections so I produce atomic, unambiguous tasks ready for sdd-execute.

**Acceptance criteria:**
- sdd-tasks SKILL.md contains Bite-Sized Task Granularity with examples (write test → verify RED → implement → verify GREEN → commit)
- sdd-tasks SKILL.md contains No Placeholders anti-patterns section
- sdd-tasks SKILL.md contains a Remember section with key rules (exact paths, complete code, exact commands)
- sdd-tasks SKILL.md contains Execution Handoff pointing to sdd-execute

### Story 3: Agent uses sdd-execute without gaps
As an agent executing sdd-execute, I need When to Stop and Ask, Remember, and Integration sections so I don't guess past blockers or miss required sub-skills.

**Acceptance criteria:**
- sdd-execute SKILL.md contains a When to Stop and Ask section listing explicit stop conditions (blocker, test failure, unclear instruction, repeated failure)
- sdd-execute SKILL.md contains a Remember section (follow plan exactly, don't skip verifications, stop when blocked)
- sdd-execute SKILL.md contains an Integration section listing required sub-skills (test-driven-development, verification-before-completion, requesting-code-review, finishing-a-development-branch)

### Story 4: Agent uses sdd-specify without gaps
As an agent executing sdd-specify, I need a Self-Review and Remember section so I catch incomplete specs before handing off to sdd-plan.

**Acceptance criteria:**
- sdd-specify SKILL.md contains a Self-Review section (spec coverage, testability of acceptance criteria, no vague placeholders)
- sdd-specify SKILL.md contains a Remember section (WHAT not HOW, testable criteria, [NEEDS CLARIFICATION] over vague text)

---

## Functional Requirements

### FR-1: sdd-plan SKILL.md additions
1. **Scope Check section** — if spec covers multiple independent subsystems, suggest breaking into sub-specs before planning
2. **File Structure section** — before defining tasks, map files to create/modify with one clear responsibility each
3. **No Placeholders section** — list forbidden patterns: TBD, TODO, "add appropriate error handling", "similar to Task N", steps without code
4. **Self-Review section** — inline checklist: spec coverage, placeholder scan, type/signature consistency
5. **Execution Handoff section** — after saving plan.md, offer sdd-tasks as next step

### FR-2: sdd-tasks SKILL.md additions
1. **Bite-Sized Task Granularity section** — each step is one action (2-5 min): write test / verify RED / implement / verify GREEN / commit
2. **No Placeholders section** — same anti-patterns as sdd-plan
3. **Remember section** — exact file paths, complete code in every task, exact commands with expected output
4. **Execution Handoff section** — after saving tasks.md, offer sdd-execute as next step

### FR-3: sdd-execute SKILL.md additions
1. **When to Stop and Ask section** — explicit stop conditions: missing dependency, repeated test failure, unclear instruction, plan gap that prevents starting
2. **Remember section** — follow plan exactly, don't skip verifications, reference sub-skills when plan says to, stop when blocked (don't guess)
3. **Integration section** — required sub-skills: test-driven-development (every task), verification-before-completion (before done claim), requesting-code-review (phase boundary), finishing-a-development-branch (all tasks done)

### FR-4: sdd-specify SKILL.md additions
1. **Remember section** — requirements describe WHAT not HOW, every acceptance criterion must be testable, use [NEEDS CLARIFICATION] not vague text
2. **Self-Review section** — inline checklist: each requirement is testable, no vague placeholders, open questions captured, goals/non-goals are distinct

### FR-5: Spec status gate across workflow
1. **sdd-specify** — after user explicitly approves the spec, prompt to update `Status: Draft` → `Status: Approved` in spec.md before handing off
2. **sdd-plan HARD-GATE** — add check: spec.md status must be `Approved` (not `Draft`) before planning begins
3. **sdd-tasks HARD-GATE** — add check: spec.md status must be `Approved` before task generation begins

---

## Non-Functional Requirements

- Each addition must fit within SKILL.md's role as a summary — no full templates or multi-step procedures (those stay in reference.md)
- Sections should be concise: a heading, 3-7 bullet points or a compact table — not paragraphs
- No duplication between SKILL.md and reference.md (SKILL.md contains the rule; reference.md contains the example)

---

## Error Scenarios

- **Section already partially exists**: check for existing content before adding — do not duplicate
- **Addition conflicts with HARD-GATE logic**: preserve all existing HARD-GATE blocks unchanged
- **Section is too long**: if a section exceeds 10 lines in SKILL.md, it belongs in reference.md with a pointer

---

## Open Questions

None.

---

## Out of Scope

- sdd-brainstorm, sdd-research, sdd-review, sdd-init, sdd-workflow SKILL.md changes
- reference.md rewrites
- New skills or workflow steps
- Changing existing HARD-GATE wording (FR-5 adds to HARD-GATEs, does not rewrite them)
