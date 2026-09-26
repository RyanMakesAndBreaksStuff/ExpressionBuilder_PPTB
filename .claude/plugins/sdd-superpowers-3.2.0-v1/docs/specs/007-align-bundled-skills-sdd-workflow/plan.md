# Feature 007: Implementation Plan

## Architecture Overview

This is a pure documentation update — no new code, no new skills, no runtime changes. All work consists of editing existing `SKILL.md`, `reference.md`, and prompt template files inside `skills/`.

Changes are grouped by skill, with each skill treated as an independent unit. Tasks within a skill are sequential (SKILL.md before reference.md before prompt files). Skills themselves are independent of each other and can be edited in parallel.

## Contracts

No API or data contracts — this is documentation only. The implicit contract is:
- All skill references use `sdd-superpowers:` namespace
- All SDD artifact paths use `docs/specs/NNN-feature/` structure
- Integration sections follow the standard format: Called by / Agent requirements / After

## Phase 1: Entry Point — sdd-workflow

**Goal:** Bring `sdd-workflow` to parity with `superpowers:using-superpowers` enforcement patterns.

Files:
- `skills/sdd-workflow/SKILL.md` — Add SUBAGENT-STOP, EXTREMELY-IMPORTANT, Instruction Priority, flowchart, TodoWrite requirement, Skill Types
- `skills/sdd-workflow/routing.md` — Add subagent-driven-development to skill map and mandatory conditions; enhance Red Flags with Reality column

## Phase 2: Execution Skills — subagent-driven-development

**Goal:** Replace all superpowers references with SDD equivalents; add SDD Source Files table; fix all prompt templates.

Files:
- `skills/subagent-driven-development/SKILL.md` — Fix flowchart, integration section, example paths
- `skills/subagent-driven-development/spec-reviewer-prompt.md` — Add spec.md injection
- `skills/subagent-driven-development/code-quality-reviewer-prompt.md` — Fix skill namespace
- `skills/subagent-driven-development/implementer-prompt.md` — Add TDD and using-git references

## Phase 3: Parallelization — dispatching-parallel-agents

**Goal:** Add SUBAGENT-STOP; make SDD-aware (tasks.md as source); replace debugging example with implementation example.

Files:
- `skills/dispatching-parallel-agents/SKILL.md` — Add SUBAGENT-STOP, SDD context, fix flowchart, add integration section
- `skills/dispatching-parallel-agents/reference.md` — Rewrite agent prompt template, example, and verification section

## Phase 4: Review Loop Skills — receiving-code-review, requesting-code-review

**Goal:** Add SDD-specific sources, YAGNI override rule, re-dispatch requirement, and correct namespaces.

Files:
- `skills/receiving-code-review/SKILL.md` — Add SDD invocation trigger
- `skills/receiving-code-review/reference.md` — Add Reviewer Subagents section, YAGNI note, re-dispatch step, integration
- `skills/requesting-code-review/SKILL.md` — Fix namespace, add code-quality clarification, expand When to Use, add integration
- `skills/requesting-code-review/code-reviewer.md` — Add code quality purpose, fix plan reference

## Phase 5: Implementation Discipline — test-driven-development, sdd-execute

**Goal:** Add SDD spec-awareness to TDD checklist; make verification-before-completion and mid-flight sdd-update explicit in sdd-execute.

Files:
- `skills/test-driven-development/SKILL.md` — Fix @testing-anti-patterns, add SDD checklist item, add integration section
- `skills/sdd-execute/SKILL.md` — Add mid-flight sdd-update section, add verification-before-completion to flow
- `skills/sdd-execute/reference.md` — Add verification-before-completion hard gate, add mid-flight sdd-update procedure

## Phase 6: Terminal Skill — finishing-a-development-branch

**Goal:** Fix integration section namespaces and add prerequisites.

Files:
- `skills/finishing-a-development-branch/reference.md` — Fix integration section (prerequisites, namespaces)
