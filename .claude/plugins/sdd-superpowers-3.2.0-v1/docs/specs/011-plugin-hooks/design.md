# Design: Plugin Hooks for SDD Superpowers

**Date:** 2026-05-30
**Feature:** 011-plugin-hooks

## Problem

The SDD workflow enforces four hard gates and a set of discipline rules (TDD, spec versioning, verification before completion) through documentation and manual skill invocation. This works but has two failure modes:

1. **Cold sessions** — every new session starts with no knowledge of the active spec, open tasks, or memory. Claude re-derives context from scratch, wasting time and risking inconsistent behavior.
2. **Gate bypass** — Claude (or the user) can write `plan.md` without an approved `spec.md`, write `tasks.md` without a `plan.md`, or skip memory saves between sessions. The only enforcement is "Claude read the routing doc and remembered."

Hooks turn key SDD discipline rules from "documented and hoped-for" into "automatic and unavoidable" — without requiring Claude to remember to invoke the right skill at the right moment.

## Chosen Approach

**Approach A + thin state signal, scoped aggressively to 6 high-confidence hooks.**

All gate enforcement is file-system based (checking existence of `spec.md`, `plan.md`, `tasks.md`). A minimal state file `.claude/sdd-state.json` tracks one signal that can't be derived from files: whether `Write|Edit` tool calls happened this session (used to avoid noisy Stop-hook firing on pure exploration sessions).

Hooks ship in `hooks/hooks.json` at the plugin root, auto-activated when the plugin is enabled (opt-out model). Shell scripts live in `scripts/hooks/` and are referenced via `${CLAUDE_PLUGIN_ROOT}`.

All hooks are SDD-project-aware: they first check for `docs/specs/` in `cwd` and exit 0 silently if not found.

**The 5 hooks:**

| # | Event | Matcher | Purpose | Mode |
|---|-------|---------|---------|------|
| 1 | `SessionStart` | — | Load `memory/MEMORY.md` + `constitution.md` + active spec summary | `additionalContext` |
| 2 | `PreToolUse` | `Write` on `*/plan.md` | Gate: check `spec.md` exists + is approved before plan can be written | `deny` if gate fails |
| 3 | `PreToolUse` | `Write` on `*/tasks.md` | Gate: check `plan.md` exists before tasks can be written | `deny` if gate fails |
| 4 | `PostToolUse` | `Write` on `memory/*.md` | Validate frontmatter + MEMORY.md index after every memory write | `additionalContext` |
| 5 | `SubagentStart` | — | Inject active task + spec summary into subagent context | `additionalContext` |
| 6 | `Stop` | — | If `SDD_HAD_WRITES=true`: remind memory save + verification-before-completion | `additionalContext` |

Hook 2 and 3 use hard `deny`; all others are advisory (`additionalContext`).

## Trade-offs & Rationale

**File-system gates over prompt pattern matching.**
`UserPromptSubmit` hooks that pattern-match on phrases like "sdd-plan" or "generate tasks" were evaluated and rejected. User phrasing is too varied to enumerate reliably — high false-negative rate, maintenance burden, and brittle to prompt rewording. Intercepting the actual `Write` call on the artifact file is exhaustive: regardless of how the user prompted, the file write cannot happen without triggering the gate.

**Soft advisory over hard block for all non-gate hooks.**
Only the two Hard Gate hooks (plan.md, tasks.md) use `permissionDecision: "deny"`. All others use `additionalContext`. This avoids advisory fatigue — if everything blocks, nothing is taken seriously. Hard blocks are reserved for the two invariants that, if violated, would corrupt the entire spec→plan→tasks→code chain.

**TDD gate dropped from hooks.**
A `PreToolUse` advisory on every `Write|Edit` was prototyped and rejected: it fires too broadly (config files, templates, docs, spec files themselves), and as a soft advisory it would quickly become noise that Claude pattern-matches past. TDD enforcement remains inside the `test-driven-development` skill where it's invoked with full context about what is being implemented.

**"Review before merge" git gate dropped.**
Unenforceable without a review artifact. `sdd-review` currently writes no marker file. Adding a `REVIEWED` marker file would require a separate spec change. Deferred — enforce in `finishing-a-development-branch` skill instead (already exists).

**Test failure detection via PostToolUse Bash dropped.**
Distinguishing test-runner failures from other Bash failures requires parsing output that varies by test framework, language, and project. High false-positive risk. The `systematic-debugging` skill handles this at the moment the error is surfaced to Claude; no hook needed.

**SubagentStart scoped to active task + spec summary only.**
Full memory context injection into every subagent was considered and rejected — too heavy for parallel execution where many subagents run concurrently. Each subagent gets: the current task description (from tasks.md), the spec title + objective, and the active spec path. Enough to stay aligned without flooding context.

**Stop hook is conditional on `SDD_HAD_WRITES`.**
Without this signal, the completion reminder fires on every exploratory session (pure Q&A, research, brainstorming), creating noise. `PreToolUse` on `Write|Edit` sets `SDD_HAD_WRITES=true` in the session env file; Stop reads it. If no writes happened, Stop exits 0 with no output.

## Key Design Decisions

1. **Hook location:** `hooks/hooks.json` at plugin root (sibling to `.claude-plugin/`). Scripts at `scripts/hooks/`. Both are new directories.

2. **SDD project detection:** Every hook script's first action is:
   ```bash
   [ -d "${CWD}/docs/specs" ] || exit 0
   ```
   Hooks are silent on non-SDD projects.

3. **Active spec detection** via shared lib `scripts/hooks/lib/detect-active-spec.sh`:
   - Primary: parse current git branch name against `docs/specs/NNN-*/` pattern
   - Fallback: most recently modified spec directory
   - Exported as `$ACTIVE_SPEC_DIR` for use in all hook scripts

4. **State file** `.claude/sdd-state.json` stores only: `{ "had_writes": bool }`. Set by a thin `PreToolUse Write|Edit` hook (separate from the gate hooks #2/#3) that fires on **all** `Write|Edit` calls, writes `had_writes: true` to the state file, and exits 0 immediately. This is not listed as a standalone hook in the table above because it performs no gate logic — it is an implementation detail of hook #6 (Stop). Read by `Stop` hook. Intentionally minimal — not a general-purpose state store.

5. **Memory validation** (hook 4) checks:
   - File has YAML frontmatter with `name`, `description`, `metadata.type` fields
   - File's `name` slug appears as a link in `memory/MEMORY.md`
   - On failure: `additionalContext` tells Claude exactly what's missing and how to fix it

6. **Session context injection** (hook 1) loads in this order, concatenated:
   - `memory/constitution.md` (always)
   - `memory/MEMORY.md` index (always)
   - Active spec's `spec.md` first 50 lines (if active spec detected)
   - Active spec's `tasks.md` unchecked tasks only (if tasks.md exists)

7. **Hook activation:** Opt-out — enabled by default when plugin is enabled. Individual hooks can be disabled per-project via `.claude/settings.local.json` override.

8. **Hook type:** All hooks use `type: "command"` (shell scripts). No HTTP, prompt, or agent hook types — deterministic, no external dependencies, no token cost.

9. **Denial messages** for hard gates are actionable and name the corrective skill:
   - Gate 2 (plan.md): `"SDD Gate: spec.md not found or not approved in docs/specs/NNN-*/. Run sdd-specify first, or check spec status field."`
   - Gate 3 (tasks.md): `"SDD Gate: plan.md not found in docs/specs/NNN-*/. Run sdd-plan first."`

## Out of Scope

- **TDD enforcement via hooks** — kept inside the `test-driven-development` skill
- **"Review before merge" git gate** — deferred; requires `sdd-review` to write an artifact first
- **Test failure detection** via `PostToolUse Bash` — handled by `systematic-debugging` skill
- **UserPromptSubmit pattern matching** — fragile; replaced by file-write interception
- **Full memory context in subagents** — too heavy for parallel execution; active task + spec summary only
- **HTTP, prompt, or agent hook types** — command hooks only for this feature
- **Per-user hook configuration UI** — users manage via `.claude/settings.local.json` directly
- **Gate enforcement for Gate 3 (NO CODE without test)** — not in this feature; remains skill-enforced
- **Gate enforcement for Gate 4 (NO COMPLETION without evidence)** — advisory only via Stop hook
