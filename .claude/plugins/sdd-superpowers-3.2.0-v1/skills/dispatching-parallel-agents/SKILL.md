---
name: dispatching-parallel-agents
description: Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies
model: sonnet
effort: high
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>

# Dispatching Parallel Agents

## Overview

<examples>
<example>
<context>Three implementation tasks exist but all write to the same shared configuration file.</context>
<correct>Identify the shared resource; execute the tasks sequentially to avoid write conflicts rather than dispatching them in parallel.</correct>
<incorrect>Mark all three [P] and dispatch concurrently — concurrent writes to the same file produce race conditions and corrupted output.</incorrect>
</example>
</examples>

Delegate independent tasks to specialized agents with isolated context. Each agent receives only what it needs — no session history — keeping them focused and results verifiable. Parallel dispatch turns N sequential tasks into 1 concurrent round.

In SDD, this skill is invoked from within `sdd-superpowers:sdd-execute` when a task group in `tasks.md` has 2+ independent tasks that can be built concurrently without shared state.

## When to Use

```dot
digraph when_to_use {
    "2+ work units in this phase?" [shape=diamond];
    "Are they independent?" [shape=diamond];
    "Sequential agents (subagent-driven-development)" [shape=box];
    "Can they work in parallel?" [shape=diamond];
    "Sequential agents (subagent-driven-development)" [shape=box];
    "Parallel dispatch" [shape=box];

    "2+ work units in this phase?" -> "Are they independent?" [label="yes"];
    "2+ work units in this phase?" -> "Sequential agents (subagent-driven-development)" [label="no - single unit"];
    "Are they independent?" -> "Sequential agents (subagent-driven-development)" [label="no - coupled"];
    "Are they independent?" -> "Can they work in parallel?" [label="yes"];
    "Can they work in parallel?" -> "Parallel dispatch" [label="yes - different files/subsystems"];
    "Can they work in parallel?" -> "Sequential agents (subagent-driven-development)" [label="no - shared state"];
}
```

**Position in the SDD workflow:**

```
sdd-execute (controller)
  └─ subagent-driven-development (orchestrator)
       └─ dispatching-parallel-agents ← YOU ARE HERE (when 2+ units are independent)
            └─ implementer subagents (concurrent)
                 └─ test-driven-development (inside each)
```

**Use when:** `sdd-execute` has 2+ work units in the current phase (from `tasks.md` in task-driven mode, or derived from `plan.md` in plan-driven mode) that touch different files or subsystems with no shared output dependencies.

**Don't use when:** work units are coupled (one depends on another's output); units modify the same files; only one unit remains in the phase.

## Quick Reference

Safe to parallelize:
- Tasks touching different source files
- Tasks touching different test files
- Tasks with no shared output dependencies

NOT safe to parallelize:
- Tasks modifying the same file
- Tasks where one depends on another's output
- Exploratory debugging (root cause unknown)

After agents return: review each summary → check for conflicts → commit each unit directly once its own tests pass → run full suite → mark units complete in TodoWrite.

**Model selection:** Omit the `model` param on each parallel dispatch — these agents do the actual implementation work, so they inherit the calling session's model rather than a cheaper one.

**REQUIRED READING before proceeding:** [reference.md](reference.md) — the full dispatch pattern, agent prompt template, worked example, and post-dispatch review procedure.

## Integration

**Invoked from:**
- `sdd-superpowers:sdd-execute` — when a task group has 2+ independent tasks

**Each dispatched agent must use:**
- `sdd-superpowers:test-driven-development` — write failing test first, then implement
- `sdd-superpowers:using-git` — commit with proper convention

**After all parallel agents return:**
- Commit each unit directly once its own tests pass (TDD already gated correctness)
- Mark tasks complete in TodoWrite
- Continue to next phase with `sdd-superpowers:sdd-execute`

## Constraints

- Does NOT dispatch tasks that share mutable state or write to the same file concurrently
- Does NOT parallelize tasks that have sequential dependencies (task B requires task A's output)

## Error Handling

- **Tasks appear independent but share a common resource**: Identify the shared resource explicitly; execute those tasks sequentially instead.
- **User requests gate bypass**: The gate is "no concurrent dispatch for tasks with shared state." Explain the race condition risk. Offer to map out which tasks are truly independent before dispatching.
