---
name: sdd-init
description: Use when starting a new project that has no CLAUDE.md and no docs/specs/ directory
---

# SDD Init

## Overview

<examples>
<example>
<context>A project directory exists with a CLAUDE.md and docs/specs/ directory already set up.</context>
<correct>Do NOT invoke sdd-init — the project foundation already exists. Use sdd-specify to start a new feature.</correct>
<incorrect>Run sdd-init anyway to "refresh" the foundation — it will overwrite existing steering files and memory entries.</incorrect>
</example>
</examples>

Establishes the project foundation for a new SDD project: guides the user through a 4-question Mission Charter ceremony, then writes `.claude/memory/foundation.md`, auto-generates steering files in `.claude/memory/steering/`, and scaffolds `docs/specs/`, a root `CLAUDE.md`, a `.claude/CLAUDE.md`, and `docs/git-convention.md`. Finishes with a `claude doctor` health check. No feature work begins before the foundation file is approved.

## When to Use

- The project has no `CLAUDE.md` AND no `docs/specs/` directory
- Starting a brand-new repo from scratch
- NOT when either `CLAUDE.md` or `docs/specs/` already exists — check first

## Quick Reference

Files created by sdd-init:

| File | Purpose |
|------|---------|
| `.claude/memory/foundation.md` | Foundation file — mission statement + 3–5 project-specific principles |
| `.claude/memory/steering/tech-stack.md` | Tech stack context — loaded by sdd-brainstorm, sdd-specify, sdd-plan, sdd-execute, sdd-review |
| `.claude/memory/steering/test-strategy.md` | Test philosophy — loaded by sdd-plan, sdd-execute, sdd-review |
| `.claude/memory/steering/conventions.md` | Code conventions — loaded by sdd-specify, sdd-plan, sdd-execute, sdd-review |
| `.claude/memory/steering/team-practices.md` | Team practices — loaded by sdd-plan, sdd-review, using-git |
| `.claude/integrations.md` | Empty custom-skill-integration manifest — populated later by `sdd-superpowers:sdd-integrations` |
| `docs/specs/.gitkeep` | Spec directory scaffold |
| `CLAUDE.md` (repo root) | Real project docs from the `init` skill (build/test/lint commands, code style, structure) |
| `.claude/CLAUDE.md` | SDD workflow/memory/gates configuration block |
| `docs/git-convention.md` | Branch naming + commit format rules |
| `.claude/rules/*.md` | Per-topic rule files — best practices, anti-patterns, conventions inferred from stack |
| `.claude/settings.json` | Allowed/blocked tools, ignore patterns, and automation hooks inferred from stack |

Flags: `--fast` skips Q3 (failure modes) — use for returning users or time-constrained sessions.

## Process Summary

1. Detect project context (subagent, silent) + check for existing foundation file
2. Mission Charter: 4 questions via structured UI (Q1 mission, Q2 non-negotiables, Q3 failure modes, Q4 amendment) — Q3 skipped if `--fast`
3. Draft foundation from answers → user approval gate → write `.claude/memory/foundation.md`
4. Rules generation: detect stack → check for source files → up to 5 parallel subagents (3 web-research + 2 codebase exploration when source files exist) → merge findings (codebase patterns take precedence on conflict) → user review (approve/tweak/skip) → write `.claude/rules/*.md` and `settings.json`
5. Auto-generate 4 steering files from detected context + research results → write `.claude/memory/steering/*.md`
6. Create scaffold files (root CLAUDE.md via `init`, `.claude/CLAUDE.md`, docs/specs/.gitkeep, docs/git-convention.md) in one uninterrupted sequence
7. Initial commit → run `claude doctor` health check → hand off to `sdd-superpowers:sdd-workflow`

<HARD-GATE>
Do NOT create any feature specs, plans, or code until the foundation file is approved and the scaffold is written.
</HARD-GATE>

**REQUIRED READING before proceeding:** [reference.md](reference.md) — the full initialisation procedure, Mission Charter ceremony, steering file templates, scaffold templates, and error scenarios.

## Constraints

- Does NOT create any feature specs, plans, or code until the foundation file is approved and the scaffold is written
- Does NOT overwrite an existing root CLAUDE.md, .claude/CLAUDE.md, or .claude/memory/foundation.md without explicit user confirmation

## Error Handling

- **Project already has CLAUDE.md and docs/specs/**: Redirect to sdd-specify for new features — do not re-run init.
- **User cannot answer a Mission Charter question**: Mark it [NEEDS CLARIFICATION] and continue; the foundation can be amended later via the Amendment Process.
- **User requests gate bypass**: The gate is "no feature work before foundation approval." Explain that without a foundation there is no mission to validate features against. Offer to complete the four-question ceremony — it takes under ten minutes.
