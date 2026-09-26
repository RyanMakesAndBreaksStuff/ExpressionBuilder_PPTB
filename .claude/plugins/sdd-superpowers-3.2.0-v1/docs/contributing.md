# Contributing to SDD Superpowers

This guide is for developers working on the sdd-superpowers plugin itself.
For using the plugin in your own project, see `CLAUDE.md`.

## What Is SDD?

SDD inverts the traditional relationship between specs and code. Instead of writing code and hoping it matches intent, you write precise specifications first, then generate code from them. The spec is the authoritative artifact; code is its expression in a particular language and framework.

Key principles:
- **Specifications as lingua franca** — PRD, specification, and implementation plan are the primary artifacts
- **Executable specifications** — specs are precise enough to generate working, testable code
- **Test-first always** — no implementation code without a prior failing test
- **Traceability** — every technical decision traces back to a specific requirement
- **Evidence before assertions** — no completion claims without running verification commands

## Skills

| Skill | When to Use |
|-------|-------------|
| `sdd-workflow` | Start of any conversation — establishes mandatory skill invocation |
| `sdd-brainstorm` | Idea is fuzzy/exploratory, or a technical decision needs investigating → dialogue + 2-3 approaches + prd.md + docs/adr/ |
| `sdd-specify` | Idea is clear, or prd.md exists → structured specification (spec.md) |
| `sdd-plan` | Spec exists → architecture, contracts, data models, test-first plan |
| `sdd-tasks` | Plan exists → flat executable task list with parallelization hints |
| `sdd-execute` | Tasks exist → subagent dispatch with spec-compliance + code-quality review |
| `sdd-spec-update` | Change or addition to an approved spec → classify impact (PATCH/MINOR/MAJOR), version spec, propagate downstream |
| `sdd-review` | Spec completeness check (pre-plan) or implementation alignment (post-execute) |

## Workflow

```
Idea (fuzzy)                    Idea (clear)
 │                               │
 ▼                               │
sdd-brainstorm ──────────────────┤
 │  dialogue + 2-3 approaches    │
 │  prd.md + docs/adr/*.md       │
 │  + spec-review                │
 │                               │
 └───────────────────────────────┘
                                 │
                                 ▼
sdd-specify ──────────────────► docs/specs/NNN-feature/spec.md
 │  (fast-path if prd.md          + feature branch created
 │   already exists)
 │
 ├─(optional pre-plan check)───►
 │                              sdd-review (spec mode)
 │ ◄────────────────────────────┘
 │
 ▼
sdd-plan ─────────────────────► docs/specs/NNN-feature/plan.md
                                 docs/specs/NNN-feature/data-model.md
                                 docs/specs/NNN-feature/contracts/
 │
 ▼
sdd-tasks ────────────────────► docs/specs/NNN-feature/tasks.md
 │
 ▼
sdd-execute ──────────────────► Implementation with per-task subagents
 │    ▲                          Spec-compliance review after each task
 │    │ (mid-flight change)      Code-quality review after each task
 │  sdd-spec-update ────────────────► classify PATCH/MINOR/MAJOR
 │    │                          version spec, propagate downstream
 │    └── resume execution
 │
 ▼
sdd-review (impl mode) ───────► Coverage matrix + test verification
 │
 ▼
finishing-a-development-branch ──► merge / PR / keep / discard
```

## Bundled Skills (cloned from Superpowers)

| Situation | Skill |
|-----------|-------|
| Task fails or behavior unexpected | `systematic-debugging` |
| About to claim anything is complete | `verification-before-completion` |
| All tasks done, tests passing | `finishing-a-development-branch` |
| Any git operation in an SDD project (branches, commits, convention) | `using-git` |
| Any implementation task (every task) | `test-driven-development` |
| At a phase boundary during execution | `requesting-code-review` |
| Implementing fixes after review feedback | `receiving-code-review` |
| Dispatching 2+ independent tasks concurrently | `dispatching-parallel-agents` |
| Executing tasks in current session with subagents | `subagent-driven-development` |

## Directory Structure

```
memory/
  foundation.md   # Project identity — mission and principles. Loaded every session.
  MEMORY.md       # Index of all persistent memory files
  *.md            # Individual memory files (user, feedback, project, reference)
  steering/       # Operational context — loaded by skills when relevant
docs/
  git-convention.md # Branch naming regex, commit format, allowed types
  contributing.md   # This file
  specs/
    001-feature-name/
      prd.md           # Pre-spec product framing + links to ADRs (optional, from sdd-brainstorm)
      spec.md          # Specification — the source of truth
      plan.md          # Implementation plan
      data-model.md    # Entity definitions (optional)
      contracts/       # API/event contracts (optional)
      tasks.md         # Executable task list
      quickstart.md    # Smoke test scenarios
skills/
  sdd-workflow/
  sdd-brainstorm/
  sdd-specify/
  sdd-plan/
  sdd-tasks/
  sdd-execute/
  sdd-spec-update/
  sdd-review/
  systematic-debugging/
  verification-before-completion/
  finishing-a-development-branch/
```

## Quick Start (for plugin contributors)

```
# Fuzzy idea path:
1. "Use sdd-brainstorm to explore: [your idea]"
2. Answer questions, pick from 2-3 approaches, approve the PRD and any ADRs
3. sdd-brainstorm automatically invokes sdd-specify (fast-path)

# Clear idea path:
1. "Use sdd-specify to create a spec for: [your idea]"
2. Answer clarifying questions, approve the spec
3. "Use sdd-plan to plan this feature"
4. "Use sdd-tasks to generate the task list"
5. "Use sdd-execute to implement it"
6. "Use sdd-review to validate the implementation"
```
