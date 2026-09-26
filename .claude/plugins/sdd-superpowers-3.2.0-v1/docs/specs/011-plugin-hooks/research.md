# Research: Plugin Hooks for SDD Superpowers

**Feature:** docs/specs/011-plugin-hooks/ (pre-spec research)
**Date:** 2026-05-30

---

## Summary of Findings

- Claude Code supports **5 hook types** (command, http, mcp_tool, prompt, agent) across **31+ lifecycle events** — the most relevant for SDD enforcement are `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, and `SessionStart`.
- Plugin hooks belong in `hooks/hooks.json` at the **plugin root** (sibling to `.claude-plugin/`, not inside it) — this file does not yet exist in sdd-superpowers.
- The **Four Hard Gates** (`NO PLAN without spec` / `NO TASKS without plan` / `NO CODE without failing test` / `NO COMPLETION without evidence`) are currently enforced by documentation and manual skill invocation only; hooks can make them **automatic and unavoidable**.
- `PreToolUse` on the `Write|Edit` matcher is the highest-value single hook: it intercepts every code write before execution, creating the right injection point for `test-driven-development` enforcement.
- Hook exit code `2` blocks the action and feeds stderr to Claude as a reason — ideal for hard-gate enforcement without user prompts.

---

## Question 1: What hook types and lifecycle events are available?

### Context

Understanding the full hook surface tells us what SDD gates can be automated vs. what must stay documentation-enforced.

### Findings

#### Option A: Command hooks (shell scripts)

**Pros:** Full shell access; can read files, run git, call CLIs; deterministic; no external dependencies; exec form prevents injection  
**Cons:** Script maintenance overhead; harder to test; may be slow if spawning subprocesses  
**Best for:** Gate enforcement, file validation, git state checks

#### Option B: Prompt/Agent hooks

**Pros:** Can reason about ambiguous situations; no rigid logic needed; handles edge cases gracefully  
**Cons:** Non-deterministic; adds latency; consumes tokens; cannot reliably block  
**Best for:** Soft guidance, context injection, advisory warnings

#### Option C: HTTP hooks

**Pros:** Centralized logic; can call external services; easy to update without plugin changes  
**Cons:** Requires a running server; network dependency; latency; overkill for local enforcement  
**Best for:** Audit logging, remote validation services

### Recommendation

**Use command hooks** for all hard-gate enforcement — deterministic, fast, no external dependencies. Use agent/prompt hooks only for advisory context injection (e.g., surfacing relevant spec sections at session start).

**Key lifecycle events for SDD:**

| Event | SDD Use |
|-------|---------|
| `SessionStart` | Inject current spec state + open tasks as context |
| `UserPromptSubmit` | Detect spec-change requests, route to sdd-spec-update |
| `PreToolUse` on `Write\|Edit` | Enforce TDD gate before any code write |
| `PreToolUse` on `Bash` | Block git commits that skip spec/task gate |
| `PostToolUse` on `Bash` | Detect test failures, auto-offer systematic-debugging |
| `Stop` | Remind about verification-before-completion if completion language detected |

---

## Question 2: Where do plugin hooks live and how are they structured?

### Context

The plugin must ship hooks as part of its installable package. The location and format determines whether hooks auto-activate when the plugin is enabled.

### Findings

#### Option A: `hooks/hooks.json` at plugin root

**Pros:** Official plugin hook location; auto-loaded when plugin is enabled; versioned with the plugin; no user configuration needed  
**Cons:** Applies to all users who install the plugin (appropriate for workflow enforcement)  
**Best for:** Plugin-distributed hooks that enforce workflow discipline

#### Option B: `.claude/settings.json` hooks

**Pros:** Project-scoped; mergeable with existing user settings  
**Cons:** Not distributed with plugin; requires manual setup per project; not co-located with skill logic  
**Best for:** Per-project overrides, not plugin distribution

### Recommendation

**Use `hooks/hooks.json`** at the plugin root. The directory structure should be:

```
sdd-superpowers/
├── .claude-plugin/
│   └── plugin.json
├── hooks/
│   └── hooks.json        ← NEW: Plugin hook definitions
├── scripts/
│   └── hooks/            ← NEW: Shell scripts invoked by hooks
│       ├── session-start.sh
│       ├── pre-write-tdd-gate.sh
│       ├── pre-bash-git-gate.sh
│       └── post-bash-test-failure.sh
├── skills/
└── docs/
```

---

## Question 3: Which SDD gates map to which hook events?

### Context

The Four Hard Gates need to map to specific hook intercept points. Each gate has a natural "last responsible moment" where it can be enforced automatically.

### Findings

**Gate 1: NO PLAN without approved spec**

- Intercept point: Before `sdd-plan` skill is used
- Hook: `UserPromptSubmit` — detect "sdd-plan" or "plan this feature" in prompt
- OR: `PreToolUse` on `Write` — check if `plan.md` write target exists without `spec.md`
- Enforcement: `additionalContext` warning if `spec.md` missing or not in approved state

**Gate 2: NO TASKS without a plan**

- Intercept point: Before `sdd-tasks` skill is used
- Hook: `UserPromptSubmit` — detect "sdd-tasks" or "generate tasks"
- Enforcement: Check `plan.md` exists in the relevant spec dir; block with message if missing

**Gate 3: NO CODE without a prior failing test**

- Intercept point: Every `Write|Edit` tool call on non-test files
- Hook: `PreToolUse` on `Write|Edit`
- Enforcement: Check if a corresponding test file exists or was recently modified; inject TDD reminder
- Note: Cannot fully auto-enforce without understanding intent; best as `additionalContext` + soft block

**Gate 4: NO COMPLETION CLAIM without verification evidence**

- Intercept point: `Stop` event — detect completion language in last Claude message
- Hook: `Stop` — pattern match on "complete", "done", "finished", "all tasks"
- Enforcement: Inject reminder to run `verification-before-completion`

**Additional enforcement opportunities:**

| SDD Discipline | Hook | Matcher | Action | Mode |
|----------------|------|---------|--------|------|
| Session memory + context | `SessionStart` | — | Load `memory/MEMORY.md` + `constitution.md` + active spec + open tasks | `additionalContext` |
| TDD gate | `PreToolUse` | `Write\|Edit` | Remind about TDD before any code write | Soft advisory |
| Spec versioning on change | `PreToolUse` | `Write\|Edit` on `spec.md` | Redirect to `sdd-spec-update` | Soft advisory |
| Review before merge | `PreToolUse` | `Bash` with git push/merge | Warn if `sdd-review` not run | Soft advisory |
| Test failure detection | `PostToolUse` | `Bash` | Offer `systematic-debugging` on test failures | `additionalContext` |
| Completion + memory save | `Stop` | — | Remind `verification-before-completion`; prompt memory save | `additionalContext` |

---

## Question 4: What is the hook output format and blocking mechanism?

### Context

Understanding how hooks communicate decisions to Claude Code determines how much enforcement is feasible vs. advisory.

### Findings

**Exit code semantics:**

| Exit | Meaning | Effect on PreToolUse |
|------|---------|---------------------|
| `0` | Success | Parse stdout JSON; may add `additionalContext` |
| `2` | Hard block | Ignore stdout; feed stderr to Claude as block reason; tool call aborted |
| Other | Soft error | Ignore stdout; show stderr; execution continues |

**JSON output on exit 0:**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask|defer",
    "permissionDecisionReason": "Reason shown to user",
    "additionalContext": "Context injected into Claude's context window",
    "updatedInput": {}
  }
}
```

**Key constraint:** `permissionDecision: "deny"` with exit code 0 blocks the tool AND provides a reason. Exit code 2 also blocks but is harsher. For SDD enforcement, prefer exit 0 + `"deny"` with a clear `permissionDecisionReason` that names the missing gate condition.

**Multiple hooks:** When multiple hooks match, the most restrictive `permissionDecision` wins: `deny > defer > ask > allow`.

### Recommendation

For hard-gate violations use `permissionDecision: "deny"` with a clear message naming the SDD gate and the corrective skill to invoke. For advisory injections (context, reminders) use `additionalContext` on exit 0 with `"allow"`.

---

## Question 5: What environment variables and context does each hook receive?

### Context

Hooks need to know the current spec state, active branch, and working directory to make gating decisions.

### Findings

Every hook receives via `stdin` (JSON):
- `hook_event_name` — event type
- `session_id` — current session
- `cwd` — current working directory
- `transcript_path` — path to full conversation transcript

`PreToolUse` additionally receives:
- `tool_name` — name of the tool being called
- `tool_input` — full input object (e.g., `file_path` for Write, `command` for Bash)

`UserPromptSubmit` additionally receives:
- `prompt` — the full user prompt text

Shell hooks also inherit all environment variables set via `CLAUDE_ENV_FILE` from `SessionStart`.

**For SDD gate checks, hooks need to:**
1. Derive the active spec directory from `cwd` and the git branch name
2. Check file existence (`spec.md`, `plan.md`, `tasks.md`) relative to `docs/specs/`
3. Detect active spec from branch name convention (e.g., `feature/011-plugin-hooks`)

### Recommendation

Create a shared `scripts/hooks/lib/detect-active-spec.sh` sourced by all gate-checking hooks. It derives the active spec directory from either:
1. The current git branch name matched against `docs/specs/NNN-*/`
2. The most recently modified spec directory as a fallback

---

## Resolved Clarifications

No prior spec exists for this feature — this is pre-spec research.

| Question | Resolution | Source |
|----------|------------|--------|
| Where do plugin hooks live? | `hooks/hooks.json` at plugin root (not inside `.claude-plugin/`) | Claude Code plugin documentation |
| Can hooks block tool calls? | Yes — `PreToolUse` with exit 2 or `permissionDecision: "deny"` | Claude Code hooks reference |
| Do hooks auto-load with plugin? | Yes — when plugin is enabled, `hooks/hooks.json` loads automatically | Claude Code plugin documentation |
| What hook types support blocking? | Command, HTTP, MCP Tool (Prompt/Agent are advisory only) | Claude Code hooks reference |

---

## Remaining Open Questions

*All decisions resolved — none remaining.*

## Resolved Decisions (2026-05-30)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| TDD gate enforcement mode | **Soft advisory** (`additionalContext`) | Less intrusive; write proceeds but Claude receives TDD reminder; avoids blocking non-implementation writes |
| Hook activation on install | **Opt-out (enabled by default)** | Zero-config experience; users can disable specific hooks in local settings |
| SDD project detection | **Required** — check `docs/specs/` before any SDD gate fires | Prevents hooks firing on non-SDD projects |
| Stop hook completion reminder | **Yes** — inject `verification-before-completion` reminder on `Stop` | Follow skill recommendation; not too noisy given it only fires on session end |
| Memory on `SessionStart` | **Load `memory/MEMORY.md` + `memory/constitution.md`** as `additionalContext` | Gives Claude full project memory and principles at start of every session |
| Memory on `Stop` | **Inject reminder** to save new learnings to `memory/` before session ends | Ensures memory is kept current across sessions |

---

## Constraints Discovered

- **Plugin root location**: `hooks/hooks.json` must be at the plugin root (sibling to `.claude-plugin/`), not inside `.claude-plugin/` — the plugin directory is for metadata only.
- **No spec file required at hook time**: Hooks execute in shell context without access to Claude's understanding of the conversation; all gate logic must be file-system based (checking for `spec.md`, `plan.md`, etc. existence and content).
- **Hook scripts must be self-contained**: Each script receives JSON on stdin and must output valid JSON or nothing; sourcing shared libs is fine but all paths must be absolute or relative to `${CLAUDE_PLUGIN_ROOT}`.
- **Async hooks for heavy operations**: Any hook doing git operations, file traversal, or network calls should use `"async": true` to avoid blocking the session turn.
- **SDD project detection required**: Not every project using this plugin is an SDD project. Hooks must first check whether `docs/specs/` exists in `cwd` before enforcing SDD gates, otherwise they'll fire on unrelated projects.
- **`CLAUDE_PLUGIN_ROOT` variable**: Hook commands can use `${CLAUDE_PLUGIN_ROOT}` to reference scripts shipped with the plugin; this is the canonical way to bundle hook scripts.
