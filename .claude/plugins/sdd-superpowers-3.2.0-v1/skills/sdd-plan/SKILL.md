---
name: sdd-plan
description: Use when a feature spec exists and needs to become a technical implementation plan
model: opus
effort: high
---

# SDD: Plan

**Announce at start:** "I'm using the sdd-plan skill to create the implementation plan."

## Overview

Transform a feature specification into a complete, executable implementation plan. Every architecture choice, data model, and API contract must be justified by a requirement in `spec.md` — if a decision has no spec backing, question whether it belongs.

<examples>
<example>
<context>spec.md exists but its status is still "Draft" and three [NEEDS CLARIFICATION] items remain open.</context>
<correct>Do NOT start planning. Redirect to sdd-specify to resolve the clarifications and obtain explicit approval before planning begins.</correct>
<incorrect>Plan against the Draft spec — the open items will surface as unknowns mid-plan and produce an incomplete or incorrect plan.</incorrect>
</example>
</examples>

<HARD-GATE>
Do NOT start planning until ALL of the following are true:
1. `spec.md` exists at `docs/specs/NNN-slug/spec.md`
2. The user has explicitly approved the spec in this session
3. Zero `[NEEDS CLARIFICATION]` items remain in the spec
4. `spec.md` status is `Approved` (not `Draft`)

If any condition fails: stop. If unsure whether the spec is ready, run `sdd-superpowers:sdd-review` (Mode A) first.
</HARD-GATE>

## Scope Check

If the spec covers multiple independent subsystems, suggest breaking it into sub-specs before planning. Each plan should produce working, testable software on its own.

## When to Use

- `spec.md` exists and the user has explicitly approved it
- No `[NEEDS CLARIFICATION]` items remain in the spec
- Optionally: one or more `docs/adr/<NNN>-*.md` files exist with technical decisions for this feature
- NOT before a spec exists — run `sdd-superpowers:sdd-specify` first
- NOT when spec has unresolved open questions — resolve them first

## Quick Reference

Outputs produced by sdd-plan:

| Artifact | Location | Required? |
|----------|----------|-----------|
| `plan.md` | `docs/specs/NNN-slug/plan.md` | Always |
| `data-model.md` | `docs/specs/NNN-slug/data-model.md` | If feature involves data storage |
| `contracts/api.md` | `docs/specs/NNN-slug/contracts/api.md` | If feature exposes an API |
| `quickstart.md` | `docs/specs/NNN-slug/quickstart.md` | Recommended |

Call `EnterPlanMode` before drafting; call `ExitPlanMode` (the approval flow) once the draft is ready, before writing `plan.md` to disk.

Plan structure: Goal → Phases (each: `Implements`/`Satisfies`/`Files` header + a short goal + only the necessary code/contract snippets → contracts-first → implementation → integration verification). No mandatory standalone Architecture, Tech Stack, or File Structure sections — fold anything essential into the phase text; Complexity Tracking is an optional per-phase note, not a required top-level section.

Pre-implementation gates checked before planning: Simplicity Gate (≤3 components), Anti-Abstraction Gate (no unnecessary wrappers), Integration-First Gate (contracts before code).

**REQUIRED READING before proceeding:** [reference.md](reference.md) — pre-implementation gate checklists, full plan template, data-model and contracts templates, self-review checklist, and verification gate.

## File Structure

Before defining tasks, map every file that will be created or modified and its single responsibility. This informs task decomposition — each task should produce self-contained changes.

- Design units with clear boundaries and one responsibility per file
- Files that change together should live together
- In existing codebases, follow established patterns

## Phase Right-Sizing

A phase is the smallest unit that carries its own test cycle and produces an
independently verifiable deliverable. When drawing phase boundaries: fold
setup, configuration, scaffolding, and documentation steps into the phase
whose deliverable needs them; split only where one phase's outcome could be
judged correct while its neighbor's is not. Each phase ends with an
independently testable deliverable.

## No Placeholders

These are plan failures — never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "handle edge cases" (without code)
- "Write tests for the above" (without actual test code)
- "Similar to Phase N" — repeat the code; phases may be read out of order
- Steps that describe what to do without showing how (code blocks required for every code step)
- References to types or functions not defined in any phase

## Self-Review

After writing the complete plan, check inline — no subagent needed:

1. **Spec coverage** — every FR has a phase that implements it; list any gaps
2. **Placeholder scan** — search for patterns from "No Placeholders" above; fix any found
3. **Type consistency** — function names and signatures match across all phases

Fix issues before presenting to user.

## Execution Handoff

After saving `plan.md`, offer:

> "Plan complete. Next: run `sdd-superpowers:sdd-execute` to begin implementation."

## Constraints

- Does NOT start planning until spec.md exists, the user has explicitly approved the spec in this session, and the spec has zero [NEEDS CLARIFICATION] items
- Does NOT make architectural or technology decisions not traceable to a spec requirement
- Does NOT produce a plan while any of the four HARD-GATE conditions are unmet

## Error Handling

- **`EnterPlanMode`/`ExitPlanMode` are unavailable in the current environment**: Fall back to presenting the `plan.md` draft as a normal message and asking for explicit approval before writing it to disk. Never write `plan.md` without approval, with or without Plan Mode.
- **Spec has [NEEDS CLARIFICATION] items**: Resolve them in spec.md before planning begins.
- **No ADR exists for a feature with unresolved tech choices**: Offer to invoke `sdd-superpowers:sdd-brainstorm` narrowly to produce the missing ADR first; note that planning without it may require plan revision.
- **User requests gate bypass**: The gate is "no plan without an approved spec." Explain that a plan built on a Draft spec will need rework when the spec changes. Offer to resolve the open items first — it is faster than reworking the plan.
