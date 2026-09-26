---
name: subagent-driven-development
description: Use when executing implementation plans with independent tasks in the current session
model: sonnet
effort: high
---

# Subagent-Driven Development

## Overview

<examples>
<example>
<context>tasks.md has 8 tasks where task 4 depends on output from task 3, and task 7 depends on task 6.</context>
<correct>Dispatch tasks 1–2 in parallel if independent, then task 3 sequentially, then task 4 after task 3 is confirmed complete — respecting the dependency chain throughout.</correct>
<incorrect>Dispatch all 8 tasks concurrently — dependent tasks will fail or produce incorrect results when their prerequisites are not yet complete.</incorrect>
</example>
</examples>

Execute implementation plans by dispatching a fresh subagent per task, each one following TDD end-to-end.

**Why subagents:** You delegate tasks to specialized agents with isolated context. By precisely crafting their instructions and context, you ensure they stay focused and succeed at their task. They should never inherit your session's context or history — you construct exactly what they need. This also preserves your own context for coordination work.

**Core principle:** Fresh subagent per task + TDD red-green-refactor = high quality, fast iteration. The implementer's own failing-test-then-passing-test cycle is the quality gate — no review subagent runs after it.

## When to Use

```dot
digraph when_to_use {
    "sdd-execute invoked?" [shape=diamond];
    "Have tasks.md or plan.md?" [shape=diamond];
    "Tasks mostly independent?" [shape=diamond];
    "Use subagent-driven-development" [shape=box];
    "Run sdd-plan first" [shape=box];
    "Re-order or split tightly coupled tasks" [shape=box];

    "sdd-execute invoked?" -> "Have tasks.md or plan.md?" [label="yes"];
    "sdd-execute invoked?" -> "Run sdd-plan first" [label="no — neither exists"];
    "Have tasks.md or plan.md?" -> "Tasks mostly independent?" [label="yes"];
    "Have tasks.md or plan.md?" -> "Run sdd-plan first" [label="no — neither exists"];
    "Tasks mostly independent?" -> "Use subagent-driven-development" [label="yes"];
    "Tasks mostly independent?" -> "Re-order or split tightly coupled tasks" [label="no"];
}
```

**Position in the SDD workflow:**

```
sdd-execute (controller) ← invokes this skill
  └─ subagent-driven-development (orchestrator) ← YOU ARE HERE
       └─ implementer subagent (one per work unit)
            └─ test-driven-development (inside each implementer)
```

**Role:** This skill is invoked by `sdd-execute` (the controller) to orchestrate session-based execution. It is not a peer of `sdd-execute` — `sdd-execute` calls it. Users never invoke this skill directly.

**How it works:**
- Reads `tasks.md` (task-driven mode) or derives work units from `plan.md` + `spec.md` (plan-driven mode)
- Fresh subagent per work unit (no context pollution)
- Each unit's own TDD cycle (red-green-refactor) is the quality gate — no post-hoc review stage
- Faster iteration (no human-in-loop between units)

## The Process

```dot
digraph process {
    rankdir=TB;

    subgraph cluster_per_task {
        label="Per Task";
        "Dispatch implementer subagent (./implementer-prompt.md)" [shape=box];
        "Implementer subagent asks questions?" [shape=diamond];
        "Answer questions, provide context" [shape=box];
        "Implementer subagent implements (TDD), tests pass, commits" [shape=box];
        "Mark task complete in TodoWrite" [shape=box];
    }

    "Read tasks.md (if exists) or derive work units from plan.md + spec.md; create TodoWrite" [shape=box];
    "More tasks remain?" [shape=diamond];
    "All units done — return control to sdd-execute" [shape=box style=filled fillcolor=lightgreen];

    "Read tasks.md (if exists) or derive work units from plan.md + spec.md; create TodoWrite" -> "Dispatch implementer subagent (./implementer-prompt.md)";
    "Dispatch implementer subagent (./implementer-prompt.md)" -> "Implementer subagent asks questions?";
    "Implementer subagent asks questions?" -> "Answer questions, provide context" [label="yes"];
    "Answer questions, provide context" -> "Dispatch implementer subagent (./implementer-prompt.md)";
    "Implementer subagent asks questions?" -> "Implementer subagent implements (TDD), tests pass, commits" [label="no"];
    "Implementer subagent implements (TDD), tests pass, commits" -> "Mark task complete in TodoWrite";
    "Mark task complete in TodoWrite" -> "More tasks remain?";
    "More tasks remain?" -> "Dispatch implementer subagent (./implementer-prompt.md)" [label="yes"];
    "More tasks remain?" -> "All units done — return control to sdd-execute" [label="no"];
}
```

`sdd-execute` runs the single spec-alignment review (`sdd-review` Mode B) and `finishing-a-development-branch` after this skill returns control — not this skill itself.

## Pre-Dispatch Conflict Scan

Before dispatching the first work unit, scan `plan.md` once for conflicts and
write down what you checked:

- tasks/phases that contradict each other or the plan's Global Constraints
  block (see `sdd-superpowers:sdd-plan`)
- anything a task explicitly mandates that would fail `sdd-review`'s rubric
  (a test that asserts nothing, verbatim duplication of a logic block)

Record the scan in TodoWrite before dispatching the first unit: one entry per
pair of units that share a file or interface (what one produces against what
the other consumes, and what you found), one entry per unit (whether its own
text agrees with itself). If the scan is clean, proceed without comment. If
it surfaces a conflict, rule on it — the spec is the binding authority, the
plan is its argument — and record the ruling before dispatching Task 1. The
end-of-execution `sdd-review` remains the net for conflicts that only emerge
from implementation.

## Batching Small Same-Shape Work

When the plan lists several tasks that are each a small, independent edit of
the same kind — the same one-line fix, constant change, or field addition
repeated across files — do not dispatch one subagent per task. Compose ONE
dispatch brief listing every file and its change, send the whole batch to a
single implementer subagent, and treat its diff as one unit for commit and
TodoWrite purposes. Reserve one-dispatch-per-task for work that needs its
own judgment or its own tests.

## Model Selection

**Implementer subagents:** Omit the `model` param — they inherit the calling session's model. Implementation is the highest-stakes role (writes the code that ships), so don't downgrade it to save cost.

**Exception — escalation:** If an implementer reports BLOCKED because the task requires more reasoning than it's getting, re-dispatch with an explicit, more capable `model` override (see Handling Implementer Status below).

## Handling Implementer Status

Implementer subagents report one of four statuses. Handle each appropriately:

**DONE:** Commit the unit's work (via `sdd-superpowers:using-git`) and mark it complete in TodoWrite.

**DONE_WITH_CONCERNS:** The implementer completed the work but flagged doubts. Read the concerns before proceeding. If the concerns are about correctness or scope, address them before committing. If they're observations (e.g., "this file is getting large"), note them and proceed to commit.

**NEEDS_CONTEXT:** The implementer needs information that wasn't provided. Provide the missing context and re-dispatch.

**BLOCKED:** The implementer cannot complete the task. Assess the blocker:
1. If it's a context problem, provide more context and re-dispatch with the same model
2. If the task requires more reasoning, re-dispatch with a more capable model
3. If the task is too large, break it into smaller pieces
4. If the plan itself is wrong, escalate to the human

**Never** ignore an escalation or force the same model to retry without changes. If the implementer said it's stuck, something needs to change.

## SDD Source Files

Before dispatching any subagent, read these files once and keep the content in context:

| File | Purpose |
|------|---------|
| `docs/specs/NNN-feature/tasks.md` | Primary task source when present — extract full text per task (task-driven mode) |
| `docs/specs/NNN-feature/plan.md` | Primary source when tasks.md is absent — derive work units from sections (plan-driven mode); always include as implementer context |
| `docs/specs/NNN-feature/spec.md` | Authoritative spec — inject the relevant sections into the implementer's prompt so it knows what it's building toward |

Never make subagents read these files themselves. Extract and inject the relevant content into each prompt.

## Prompt Templates

- `./implementer-prompt.md` - Dispatch implementer subagent

## Example Workflow

```
You: I'm using sdd-superpowers:subagent-driven-development to execute this plan.

[Read docs/specs/NNN-feature/tasks.md if it exists; otherwise read plan.md + spec.md and derive work units]
[Extract all work units with full text and context]
[Create TodoWrite with all work units]

Task 1: Hook installation script

[Get Task 1 text and context (already extracted)]
[Dispatch implementation subagent with full task text + context]

Implementer: "Before I begin - should the hook be installed at user or system level?"

You: "User level (~/.config/superpowers/hooks/)"

Implementer: "Got it. Implementing now..."
[Later] Implementer:
  - Implemented install-hook command (TDD: failing test → minimal implementation → passing test)
  - Added tests, 5/5 passing
  - Self-review: Found I missed --force flag, added it
  - Committed
  - Status: DONE

[Mark Task 1 complete]

Task 2: Recovery modes

[Get Task 2 text and context (already extracted)]
[Dispatch implementation subagent with full task text + context]

Implementer: [No questions, proceeds]
Implementer:
  - Added verify/repair modes (TDD throughout)
  - 8/8 tests passing
  - Self-review: All good
  - Committed
  - Status: DONE

[Mark Task 2 complete]

...

[After all tasks]
[Return control to sdd-execute for the single spec-alignment review]

Done!
```

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "I'll just fix this small thing myself instead of dispatching a subagent" | Direct fixes bypass TDD and commit discipline. Dispatch a fix subagent even for small changes. |
| "This subagent's context is basically the same as the last one's" | Fresh subagents never inherit session history. Construct exactly the context this task needs, every time. |
| "The implementer seems stuck, I'll just answer differently and hope" | A stuck implementer needs a decision: more context, a stronger model, a smaller task, or escalation — not a repeated attempt with the same inputs. |
| "Two tasks touch nearby code, parallel dispatch should be fine" | Shared files mean shared risk of conflicting edits. Sequence them. |

## Red Flags

**Never:**
- Start implementation on main/master branch without explicit user consent
- Skip TDD (write implementation before a failing test exists)
- Proceed with a failing test suite
- Dispatch multiple implementation subagents in parallel (conflicts) — use `sdd-superpowers:dispatching-parallel-agents` instead
- Let an implementer subagent spawn its own subagents (helpers or reviewers) — escalate to the controller instead
- Make subagent read plan file (provide full text instead)
- Skip scene-setting context (subagent needs to understand where task fits)
- Ignore subagent questions (answer before letting them proceed)
- Move to the next task while the current unit's tests are failing

**If subagent asks questions:**
- Answer clearly and completely
- Provide additional context if needed
- Don't rush them into implementation

**If subagent fails task:**
- Dispatch fix subagent with specific instructions
- Don't try to fix manually (context pollution)

## Integration

**Invoked by:**
- `sdd-superpowers:sdd-execute` — the controller that reads `tasks.md` or `plan.md`, derives work units, and delegates orchestration to this skill

**Each implementer subagent must use:**
- `sdd-superpowers:test-driven-development` — TDD is mandated inside every implementer subagent; the controller injects this mandate into the subagent prompt

**Skills used during orchestration:**
- `sdd-superpowers:using-git` — for per-unit commits (convention validation, conflict detection)

**Upstream (provides input to this skill):**
- `sdd-superpowers:sdd-plan` — creates `plan.md` (plan-driven mode source of truth)

**Downstream (owned by the caller, not this skill):**
- `sdd-superpowers:sdd-review` (Mode B) and `sdd-superpowers:finishing-a-development-branch` — run once by `sdd-execute` after this skill returns control, not per-unit

## Constraints

- Does NOT dispatch tasks that have sequential dependencies concurrently
- Does NOT allow a subagent to inherit the main session's conversation history — each subagent receives only the context constructed for its specific task

## Error Handling

- **A subagent returns a failure**: Do not dispatch the next dependent task. Surface the failure to the user and decide whether to retry, fix the task definition, or debug first with systematic-debugging.
- **Tasks appear parallelizable but share a file**: Identify the shared file; execute those tasks sequentially instead.
- **User requests gate bypass**: The gate is "no concurrent dispatch for dependent tasks." Explain the failure mode. Offer to map out the dependency graph before dispatching.
