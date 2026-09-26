---
name: sdd-execute
description: Use when a plan is approved and implementation should begin
model: sonnet
effort: high
---

# SDD: Execute

**Announce at start:** "I'm using the sdd-execute skill to implement this feature."

## Overview

<examples>
<example>
<context>plan.md is approved. User says "let's start implementing."</context>
<correct>Invoke sdd-execute. Verify the current branch is correct, read plan.md + spec.md, derive work units into TodoWrite, then dispatch subagents in work-unit order.</correct>
<incorrect>Generate a tasks.md list before starting — execution derives work units directly from plan.md.</incorrect>
</example>
<example>
<context>User says "skip task 3, it's not blocking anything right now."</context>
<correct>Explain why task ordering exists (dependencies, test-before-implementation). Offer to clarify whether task 3 is truly independent before deciding.</correct>
<incorrect>Skip task 3 and proceed to task 4 — skipped tasks leave gaps in test coverage and may break later tasks that assume task 3 is complete.</incorrect>
</example>
</examples>

Implement a feature by dispatching a fresh subagent per task; each subagent's own TDD cycle is the quality gate. Parallel task groups run concurrently. Subagents never inherit session context — you construct exactly what they need. Exactly one review happens in the whole flow: `sdd-superpowers:sdd-review` (Mode B), after all units are committed.

## When to Use

- A `plan.md` is approved and implementation is ready to start
- Derive work units from `plan.md` + `spec.md`
- NOT on `main`/`master` — a feature branch must exist

<HARD-GATE>
Do NOT start implementation on main/master. Verify branch before any subagent dispatch.
</HARD-GATE>

<HARD-GATE>
Never implement work units directly in this session. Every work unit requires a fresh subagent dispatched via sdd-superpowers:subagent-driven-development. Implementing directly bypasses TDD and commit discipline.
</HARD-GATE>

## Quick Reference

Execution flow:

```
Verify branch + baseline
→ Read plan.md + spec.md → derive work units → record in TodoWrite
→ Restart detection: check git log for completed work units → skip matched units
→ Sequential units: one subagent at a time
→ Parallel units: dispatch concurrently, wait for all
→ After each unit: commit directly once its own tests pass (include plan section heading in commit message)
→ Mid-flight change: STOP → sdd-spec-update → resume
After all units: verification-before-completion → sdd-review (once)
→ If gaps: derive fixes, re-dispatch, re-run sdd-review — repeat until aligned; escalate to user if the same AC is unresolved in 2 of the last 3 rounds
→ finishing-a-development-branch
```

Implementer status handling:

| Status | Action |
|--------|--------|
| DONE | Commit directly, then mark unit complete in TodoWrite |
| DONE_WITH_CONCERNS | Mark unit complete in TodoWrite; if correctness concern fix first; if observational proceed |
| NEEDS_CONTEXT | Provide context, re-dispatch |
| BLOCKED | Assess: context / model upgrade / split task / escalate |

**REQUIRED READING before first dispatch:** [reference.md](reference.md) — full subagent prompt construction, parallel group safety checks, model selection guide, and repeated-failure escalation paths.

## When to Stop and Ask

Four things stop execution — nothing else:

- An irreversible or destructive operation
- A security-sensitive action
- A side effect outside the current worktree that norms say you ask about
  first (a merge, a push to a shared branch, a publish)
- A plan so broken that every path forward is a guess

Everything else — an unclear instruction, a plan gap, a conflict between two
work units, a cap you'd otherwise ask to exceed — gets a ruling, not a stop.
Decide it yourself: the spec is the binding authority, the plan is its
argument, and your judgment settles what neither answers. Record every
ruling in TodoWrite (or the commit message for the unit it affects) as
`Ruling: <what you decided> — <why> — <what it costs if wrong>`, and keep
executing. A wrong ruling costs rework your human partner can see and undo;
a session parked on a question costs their whole day and buys nothing.

For the four things above: stop and ask.

## Mid-Flight Spec Changes

If the user requests a change, addition, or correction during execution:

1. **STOP** — do not implement the change directly
2. Invoke `sdd-superpowers:sdd-spec-update` to classify impact (PATCH / MINOR / MAJOR) and version the spec
3. Propagate the change to `plan.md` as directed by `sdd-spec-update`
4. Resume execution from the updated work units

Never update work units or plan directly without running `sdd-superpowers:sdd-spec-update` first.

## Remember

- Follow plan steps exactly — don't improvise or optimize away steps
- Don't skip verifications
- Reference sub-skills when the plan says to
- Rule on ambiguity and keep going — reserve stopping for the four things in "When to Stop and Ask"
- Never start implementation on main/master without explicit user consent

## Integration

Required sub-skills during execution:

| When | Sub-skill |
|------|-----------|
| Executing tasks in current session | `sdd-superpowers:subagent-driven-development` |
| Dispatching a parallel task group (2+ tasks) | `sdd-superpowers:dispatching-parallel-agents` |
| Per-task commits | `sdd-superpowers:using-git` |
| Implementing fixes after sdd-review (Mode B) finds gaps | `sdd-superpowers:receiving-code-review` |
| Task fails or behavior unexpected | `sdd-superpowers:systematic-debugging` |
| About to claim done | `sdd-superpowers:verification-before-completion` |
| All tasks complete | `sdd-superpowers:sdd-review` (once, required before merge) |
| sdd-review reports SPEC-ALIGNED | `sdd-superpowers:finishing-a-development-branch` |

> **Note:** `sdd-superpowers:test-driven-development` is mandated for **implementer subagents** dispatched by `subagent-driven-development` — not invoked directly by the controller.

## Constraints

- Does NOT start implementation on main/master — branch must be verified before any subagent is dispatched
- Does NOT skip work units — if a unit seems unnecessary, rule on it (record why in TodoWrite) rather than bypassing it silently
- Does NOT begin a new task until the prior task's verification step has passed

## Error Handling

- **plan.md does not exist**: Surface error: "No plan.md found at docs/specs/NNN-feature/plan.md. Run sdd-plan first." Halt.
- **plan.md has no sections**: Surface error: "plan.md has no sections to derive work units from. Ensure plan.md follows the standard plan template." Halt.
- **Current branch is main/master**: Stop. Ask the user to confirm the correct feature branch before any implementation begins.
- **A task is blocked by an unresolved dependency**: Rule on how to proceed (record the ruling in TodoWrite) rather than skipping the task or reordering silently — surface to the user only if the blocker is one of the four things in "When to Stop and Ask."
- **User requests gate bypass**: The gate is "no implementation on main/master." Explain the risk of implementing directly on main. Offer to create the feature branch first.
