---
name: sdd-specify
description: Use when a user describes a new feature, idea, or problem without an existing spec — before any planning, research, or code
---

# SDD: Specify

**Announce at start:** "I'm using the sdd-specify skill to create a feature specification."

## Overview

Turn ideas (or an approved PRD from `sdd-superpowers:sdd-brainstorm`) into a precise, executable specification. The specification is the source of truth — code serves specs, not the other way around. A spec written here drives all downstream planning and code generation.

<examples>
<example>
<context>User says "we need to add rate limiting to the API."</context>
<correct>Invoke sdd-specify. Create spec.md capturing the problem, goals, user stories, and acceptance criteria before any planning or code begins.</correct>
<incorrect>Jump to planning ("we could use a token bucket approach") or ask about implementation approach — specs describe WHAT, and they come before HOW.</incorrect>
</example>
<example>
<context>User says "the idea is clear enough, let's just start the plan."</context>
<correct>A clear idea still needs a written spec — spec.md is what plan, tasks, and code are validated against. Create it first.</correct>
<incorrect>Proceed to sdd-plan without a spec — there is then no source of truth to validate the plan against.</incorrect>
</example>
</examples>

<HARD-GATE>
Do NOT write any implementation code, scaffold any project, or make any architectural decisions until a spec is approved and written. This skill produces ONLY the specification.
</HARD-GATE>

## When to Use

- A new feature, idea, or problem needs to be formalized
- `sdd-superpowers:sdd-brainstorm` has completed and `prd.md` exists (fast-path)
- NOT when spec already exists — go to `sdd-superpowers:sdd-plan`
- NOT when the idea is still fuzzy — run `sdd-superpowers:sdd-brainstorm` first

## Quick Reference

Spec output: `docs/specs/NNN-<slug>/spec.md`

Spec sections: Problem Statement → Goals → Non-Goals → Users and Context → User Stories (with acceptance criteria) → Functional Requirements → Non-Functional Requirements → Error Scenarios → Open Questions → Out of Scope

**Fast-path:** if `prd.md` exists from `sdd-superpowers:sdd-brainstorm`, Steps 2–3 are skipped — the PRD is formalized directly.

**REQUIRED READING before proceeding:** [reference.md](reference.md) — the full process (Steps 1–8), spec.md template, self-review checklist, placeholder anti-patterns, and handoff options.

## Remember

- Requirements describe WHAT, never HOW — no technology mentions in the spec
- Every acceptance criterion must be testable (convertible to a passing/failing test)
- Use `[NEEDS CLARIFICATION]` over vague text — never leave ambiguity unmarked

## Self-Review

After writing the spec, check inline — no subagent needed:

1. **Testability** — every acceptance criterion can become a passing/failing test
2. **No placeholders** — no vague text; `[NEEDS CLARIFICATION]` used where needed
3. **Goals vs Non-Goals** — each item is in the right section
4. **Open Questions** — all unknowns explicitly captured

Fix issues before presenting the spec to the user.

## Execution Handoff

After the user explicitly approves the spec:
1. Update `Status: Draft` → `Status: Approved` in `spec.md`.
2. Offer: "Spec complete and approved. Next: run `sdd-superpowers:sdd-plan` to create the implementation plan."

## Constraints

- Does NOT write implementation code, scaffold any project, or make architectural decisions — this skill produces only spec.md
- Does NOT proceed to sdd-plan or any downstream skill before the spec is explicitly approved
- Does NOT leave [NEEDS CLARIFICATION] items unresolved in the final approved spec

## Error Handling

- **Spec already exists for this feature**: Redirect to `sdd-superpowers:sdd-plan` if no plan exists, or to `sdd-superpowers:sdd-spec-update` if a change is needed.
- **Idea is still fuzzy with competing approaches**: Redirect to `sdd-superpowers:sdd-brainstorm` before proceeding — a fuzzy idea produces a fuzzy spec.
- **User requests gate bypass**: The gate is "no planning or code before an approved spec." Explain that without a spec there is no source of truth for plan validation. Offer to write the spec — it is the fastest path to a trustworthy plan.
