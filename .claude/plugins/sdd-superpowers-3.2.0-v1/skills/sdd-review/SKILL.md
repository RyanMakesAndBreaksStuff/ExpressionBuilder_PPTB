---
name: sdd-review
description: Use when a spec needs a completeness check before planning, or when implementation claims to be complete and needs spec-alignment validation
---

# SDD: Review

**Announce at start:** "I'm using the sdd-review skill to validate spec-implementation alignment."

## Overview

<examples>
<example>
<context>All tasks in tasks.md are checked off and the user says "I think we're done."</context>
<correct>Invoke sdd-review (post-implementation mode). Validate every acceptance criterion against the current code before claiming completion or merging.</correct>
<incorrect>Accept the task checklist as proof of completion — checked tasks confirm work was attempted, not that it satisfies the spec.</incorrect>
</example>
</examples>

Two-mode skill: Mode A validates a spec is complete and implementable before planning; Mode B validates that implementation matches the spec after execution. In SDD, the spec is truth — this skill surfaces drift between spec and code before it becomes technical debt.

## When to Use

**Mode A (spec review):** before running `sdd-superpowers:sdd-plan`, when a spec has `[NEEDS CLARIFICATION]` items, or when a spec feels underspecified.

**Mode B (implementation review):** after `sdd-superpowers:sdd-execute` completes, before merging — confirms every acceptance criterion has a passing test.

**NOT for:** style reviews, code quality opinions, or general debugging.

## Quick Reference

| Mode | Trigger | Output |
|------|---------|--------|
| Mode A — Spec Review | "Review the spec before we plan" | READY TO PLAN or NEEDS REVISION |
| Mode B — Implementation Review | "Review the implementation for NNN" | SPEC-ALIGNED, DRIFT DETECTED, or INCOMPLETE |

```
NO COMPLETION CLAIMS WITHOUT RUNNING VERIFICATION COMMANDS AND READING THEIR OUTPUT
```

"Tests pass" requires running the command and reading output. "Spec-aligned" requires a line-by-line coverage matrix — not a general impression.

**REQUIRED READING before proceeding:** [reference.md](reference.md) — Mode A checklist (completeness, ambiguity scan, feasibility check), Mode B procedure (coverage matrix, drift detection, contract validation, test run), and full report templates.

## Integration

Required sub-skills:

| When | Sub-skill |
|------|-----------|
| Before claiming review complete (Mode B) | `sdd-superpowers:verification-before-completion` |

## Constraints

- Does NOT validate implementation without an approved spec.md to compare against
- Does NOT approve completion if any acceptance criterion lacks verification evidence

## Error Handling

- **No spec.md exists**: Halt. A spec must exist before implementation can be reviewed for alignment.
- **An acceptance criterion is untestable as written**: Flag it; do not skip it. Offer to rewrite the criterion with the user before reviewing.
- **User requests gate bypass**: The gate is "spec-alignment validation before merge." Explain that unchecked criteria may mean the feature is incomplete. Offer to review one story at a time to keep it fast.
