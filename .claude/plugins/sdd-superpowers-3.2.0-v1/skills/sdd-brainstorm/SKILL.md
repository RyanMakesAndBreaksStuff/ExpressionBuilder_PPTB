---
name: sdd-brainstorm
description: Use when an idea is fuzzy, exploratory, has competing approaches, or needs a technology/architecture decision investigated before specification
model: opus
effort: high
---

# SDD: Brainstorm

**Announce at start:** "I'm using the sdd-brainstorm skill to explore this idea, investigate options, and decide on an approach before specifying."

## Overview

Turn fuzzy ideas into a validated PRD and formal architecture decisions through collaborative dialogue. Produces `prd.md` (why/what, product-level) and, for each significant technical choice, an ADR at `docs/adr/<NNN>-<slug>.md`. Both feed directly into `sdd-superpowers:sdd-specify` as a fast-path input, skipping questions already answered here.

<examples>
<example>
<context>User says "I'm thinking we might want some kind of notification system — not sure if push, email, or in-app."</context>
<correct>Invoke sdd-brainstorm. The idea has competing approaches and an unresolved technology choice — explore and decide before specifying.</correct>
<incorrect>Jump straight to sdd-specify with "notification system" as the feature — the competing approaches will surface as [NEEDS CLARIFICATION] items that block the spec.</incorrect>
</example>
<example>
<context>User says "I want to add dark mode, it's clear: a CSS variable toggle. Can we just spec it?"</context>
<correct>If the approach is genuinely settled and no technical option needs investigating, go directly to sdd-specify. Brainstorm is for fuzzy ideas or open technical decisions — not every idea needs it.</correct>
<incorrect>Invoke sdd-brainstorm for every idea regardless of fuzziness — clear ideas waste brainstorm overhead and slow delivery.</incorrect>
</example>
</examples>

<HARD-GATE>
Do NOT invoke sdd-specify, sdd-plan, or any implementation skill until the user has approved prd.md and every ADR it links to. Do NOT write code. This skill produces ONLY prd.md and ADR files.
</HARD-GATE>

## When to Use

- The idea is vague, exploratory, or has competing approaches ("I'm thinking about…", "what if we…")
- A technical decision needs investigation before committing — library/framework choice, performance target, security requirement, external integration
- NOT when the idea is already clear and no technical option needs investigating — go straight to `sdd-superpowers:sdd-specify`
- NOT when another brainstorm has already produced `prd.md` — skip to `sdd-superpowers:sdd-specify`

## Quick Reference

Brainstorm outputs two kinds of artifacts:
- `docs/specs/NNN-<feature-slug>/prd.md` — one per feature: the WHY/WHAT
- `docs/adr/<NNN>-<slug>.md` — one per significant technical decision: the HOW and why that option

| Step | Action |
|------|--------|
| 1 | Explore project context; check `docs/specs/` and `docs/adr/` for related work |
| 2 | Ask clarifying questions (one at a time) — purpose, constraints, success criteria, technical requirements |
| 3 | Propose 2-3 approaches with trade-offs + recommendation |
| 4 | Identify which decisions warrant an ADR (hard to reverse, genuinely competing options) |
| 5 | Investigate ADR-worthy decisions; build a decision matrix per decision |
| 6 | Present design in sections, get approval per section |
| 7 | Write ADR file(s) (`Status: Proposed`), then `prd.md` |
| 8 | Spec review loop on `prd.md` + linked ADRs together (max 3 iterations) |
| 9 | User reviews written PRD and ADRs; on approval, flip ADR status to `Accepted` |
| 10 | Invoke `sdd-superpowers:sdd-specify` with the `prd.md` path |

Key principles: one question per message, YAGNI ruthlessly, always 2-3 approaches before settling, decompose multi-subsystem ideas before brainstorming any single piece, only write an ADR for decisions that are hard to reverse or have genuine trade-offs.

**REQUIRED READING before proceeding:** [reference.md](reference.md) — full checklist, process flow diagram, `prd.md` and ADR templates, investigation guides (library/performance/security/integration), spec review loop procedure, and visual companion guide.

## Constraints

- Does NOT invoke sdd-specify, sdd-plan, or any implementation skill until the user has explicitly approved `prd.md` and every linked ADR
- Does NOT write code — this skill produces only `prd.md` and ADR files
- Does NOT produce a spec — `prd.md` and ADRs feed into sdd-specify; they are different artifacts
- Does NOT write an ADR for a trivial or obvious decision — mention it inline in `prd.md` instead

## Error Handling

- **`prd.md` already exists from a prior brainstorm session**: Skip directly to `sdd-superpowers:sdd-specify` fast-path — do not re-run brainstorm.
- **User wants to jump straight to implementation**: Stop. Redirect through sdd-specify → sdd-plan → sdd-execute first; implementation without a spec has no source of truth.
- **A new technical question surfaces after the spec is already written (e.g., during sdd-plan)**: Re-invoke sdd-brainstorm narrowly for that single decision — produce one more ADR, do not block planning entirely on a full re-run.
- **User requests gate bypass**: The gate is "no sdd-specify or implementation before PRD and ADR approval." Explain that without approved decisions, the spec will reflect the first approach considered rather than the best one, and later features will have no record of why this choice was made. Offer to complete the review — it is a short approval step.
