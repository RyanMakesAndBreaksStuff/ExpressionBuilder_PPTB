# SDD Superpowers

A Claude Code plugin implementing **Specification-Driven Development (SDD)** — a methodology where specifications are the source of truth and code is their generated expression.

Built on the [superpowers](https://github.com/obra/superpowers) framework: skills enforce discipline through hard gates, iron laws, and verification requirements.

## Installation

```bash
# From superpowers-marketplace
/plugin install sdd-superpowers@superpowers-marketplace

# From claude-plugins-official
/plugin install sdd-superpowers
```

## What Is SDD?

SDD inverts the traditional relationship between specs and code. Instead of writing code and hoping it matches intent, you write precise specifications first, then generate code from them. The spec is the authoritative artifact; code is its expression in a particular language and framework.

**Key principles:**
- **Specifications as lingua franca** — PRD, specification, and implementation plan are the primary artifacts
- **Executable specifications** — specs are precise enough to generate working, testable code
- **Test-first always** — no implementation code without a prior failing test
- **Traceability** — every technical decision traces back to a specific requirement
- **Evidence before assertions** — no completion claims without running verification commands

## The Four Hard Gates

```
NO PLAN without an approved spec
NO CODE without a prior failing test
NO COMPLETION CLAIM without fresh verification evidence
```

## Skills

| Skill | When to Use |
|-------|-------------|
| `sdd-workflow` | Start of any conversation — establishes mandatory skill invocation |
| `sdd-init` | New project with no CLAUDE.md or docs/specs/ → mission charter ceremony + steering scaffold |
| `sdd-brainstorm` | Idea is fuzzy/exploratory, or a technical decision needs investigating → dialogue + 2-3 approaches + prd.md + docs/adr/ |
| `sdd-specify` | Idea is clear, or prd.md exists → structured specification (spec.md) |
| `sdd-plan` | Spec exists → architecture, contracts, data models, test-first plan |
| `sdd-execute` | Plan approved → invokes `subagent-driven-development` to orchestrate per-task subagents with spec-compliance + code-quality review |
| `sdd-spec-update` | Change or addition to an approved spec → classify impact (PATCH/MINOR/MAJOR), version spec, propagate downstream |
| `sdd-review` | Spec completeness check (pre-plan) or implementation alignment (post-execute) |
| `session-wrap` | End of session → captures memory candidates and narrative lessons before context is lost |

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
                                 + feature branch created
 │
 ▼
sdd-plan ─────────────────────► docs/specs/NNN-feature/plan.md
                                 docs/specs/NNN-feature/data-model.md
                                 docs/specs/NNN-feature/contracts/
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
sdd-review ───────────────────► Coverage matrix + test verification
 │
 ▼
finishing-a-development-branch ──► merge / PR / keep / discard
```

## Hooks

SDD Superpowers ships a set of Claude Code hooks — shell scripts that run automatically at specific lifecycle events. They are invisible infrastructure: when everything goes right, you don't notice them. Their job is to enforce the Four Hard Gates and keep project artifacts in sync without requiring manual discipline.

All hooks are registered in `hooks/hooks.json` and are silent outside SDD projects (directories without a `docs/specs/` tree).

### Why hooks instead of skill instructions?

Skills run only when Claude is asked to invoke them. Hooks run unconditionally, before or after every relevant tool call. This means the gates and reminders cannot be skipped — not by a distracted session, not by a subagent, not by forgetting to invoke the right skill.

### Hook reference

| Event | Script | What it does | Why it exists |
|-------|--------|-------------|---------------|
| `SessionStart` | `session-start.sh` | Injects `memory/foundation.md`, `memory/MEMORY.md`, and the active spec (first 50 lines) into every session's context | Claude would otherwise re-derive project conventions from scratch each session; this ensures it always starts with accurate project state |
| `PreToolUse` → Write on `plan.md` | `pre-write-plan-gate.sh` | Blocks writing `plan.md` unless a `spec.md` exists in the same folder **and** its status is `Approved` | Enforces the hard gate: **NO PLAN without an approved spec** |
| `PreToolUse` → Write or Edit (any file) | `pre-write-edit-state.sh` | Records `had_writes: true` in a per-session temp file | Gives `stop.sh` a signal to emit end-of-session reminders only when files were actually changed — stays silent on read-only sessions |
| `PostToolUse` → Write on `memory/*.md` | `post-write-memory-validate.sh` | Checks that a newly written memory file has valid YAML frontmatter (`name`, `description`, `metadata.type`) and is indexed in `memory/MEMORY.md` | Memory files missing frontmatter or index entries are invisible to future sessions; this catches structural errors immediately |
| `SubagentStart` | `subagent-start.sh` | Injects the active spec title, path, and objective section into every subagent's context | Subagents dispatched by `sdd-execute` start cold; without this they have no awareness of what feature they're implementing |
| `Stop` | `stop.sh` | At session end, if any writes occurred this session, emits a checklist reminder: invoke `session-wrap` to capture learnings, run `verification-before-completion` | Prevents the common failure mode of ending a session without persisting decisions or running final verification |

## Quick Start

```bash
# Fuzzy idea path:
# 1. Invoke sdd-brainstorm with your idea
# 2. Answer questions, pick from 2-3 approaches, approve the PRD and any ADRs
# 3. sdd-brainstorm automatically invokes sdd-specify (fast-path)

# Clear idea path:
# 1. Use sdd-specify to create a spec
# 2. Use sdd-plan to plan the feature
# 3. Use sdd-execute to implement it
#    (if requirements change mid-flight: use sdd-spec-update first)
# 4. Use sdd-review to validate the implementation
# 5. Use session-wrap at end of session to capture learnings
```

## Bundled Support Skills

These skills are invoked at specific SDD workflow points:

| Situation | Skill |
|-----------|-------|
| Task fails or behavior unexpected | `systematic-debugging` |
| About to claim anything is complete | `verification-before-completion` |
| All tasks done, tests passing | `finishing-a-development-branch` |
| Any git operation — branches, commits, convention | `using-git` |
| At a phase boundary during execution | `requesting-code-review` |
| Implementing fixes after review feedback | `receiving-code-review` |
| Dispatching 2+ independent tasks concurrently | `dispatching-parallel-agents` |
| Executing tasks in current session with subagents | `subagent-driven-development` |
| Each implementer subagent (dispatched from `subagent-driven-development`) | `test-driven-development` |
| Ending a session and want to preserve learnings | `session-wrap` |

**Skill hierarchy during execution:** `sdd-execute` (controller) → invokes `subagent-driven-development` → dispatches implementer subagents → each subagent invokes `test-driven-development`. TDD is enforced at the implementer-subagent level, not by the controller directly.

## Project Context (CLAUDE.md)

When `sdd-init` creates `CLAUDE.md` for a new project, it wires up a three-tier memory architecture loaded automatically each session:

| Tier | Source | What it contains |
|------|--------|-----------------|
| 0 — Identity | `memory/foundation.md` | Mission charter — tech stack, test strategy, conventions, deployment; loaded every session via `SessionStart` hook |
| 1 — Steering | `memory/steering/*.md` | Scoped operational context (e.g. `tech-stack.md`, `test-strategy.md`) loaded silently by the skills that need them |
| 2 — Episodic | `memory/MEMORY.md` + individual files | Persistent decisions, feedback, and project state indexed for future sessions |
| — | `docs/git-convention.md` | Branch naming regex, commit format, allowed types |
| — | `docs/specs/` | All feature specs, plans, and task lists |

This ensures Claude always starts with full project context rather than re-deriving conventions from scratch.

## Requirements

- [superpowers](https://github.com/obra/superpowers) plugin installed (`/plugin install superpowers@superpowers-marketplace`)

## License

MIT
