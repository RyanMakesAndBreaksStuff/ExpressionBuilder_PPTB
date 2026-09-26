# Feature 011: Plugin Hooks for SDD Superpowers

**Status:** Approved
**Created:** 2026-05-30
**Branch:** `011-plugin-hooks`

---

## Problem Statement

The SDD workflow enforces its four hard gates and discipline rules entirely through documentation and manual skill invocation — Claude must read the routing guide and remember to invoke the right skill at the right moment. This creates two recurring failure modes: sessions start cold with no knowledge of the active spec, open tasks, or accumulated memory, causing Claude to re-derive context from scratch each time; and hard gate invariants (no plan without approved spec, no tasks without plan) can be silently bypassed because there is no automatic enforcement at the moment of violation. Hooks turn the most critical SDD discipline rules from "documented and hoped-for" into "automatic and unavoidable" without adding friction to the normal workflow.

## Goals

- Eliminate cold-session context loss by automatically injecting memory, constitution, and active spec context at the start of every session in an SDD project
- Enforce Hard Gate 1 (no `plan.md` without an approved `spec.md`) automatically, with an actionable denial message naming the corrective skill
- Enforce Hard Gate 2 (no `tasks.md` without a `plan.md`) automatically, with an actionable denial message naming the corrective skill
- Protect memory file integrity by validating frontmatter and MEMORY.md index consistency immediately after every memory write
- Improve subagent alignment during parallel execution by injecting the active task and spec summary into every subagent at start
- Close the memory loop across sessions by reminding Claude to save learnings and verify completion at session end — only when actual file writes occurred

## Non-Goals

- Enforcing Hard Gate 3 (no code without a failing test) via hooks — remains inside the `test-driven-development` skill
- Enforcing Hard Gate 4 (no completion claim without evidence) as a hard block — Stop hook is advisory only
- Detecting test failures via Bash output inspection — handled by the `systematic-debugging` skill
- Intercepting user prompt text to detect skill-invocation intent — fragile pattern matching; not in scope
- Supporting HTTP, prompt, or agent hook types — command hooks only for determinism and zero external dependencies
- Providing a UI for per-user hook configuration — users override via `.claude/settings.local.json`
- Enforcing a "review before merge" git gate — deferred until `sdd-review` writes a reviewable artifact
- Injecting full memory context into subagents — active task + spec summary only; full context is too heavy for parallel execution

## Users and Context

**Primary users:** SDD practitioners using the sdd-superpowers plugin in Claude Code — developers who run daily SDD workflows (brainstorm → specify → plan → tasks → execute)
**Secondary users:** Subagents dispatched by `sdd-execute` during parallel implementation tasks
**Usage context:** Every Claude Code session opened in a project that has a `docs/specs/` directory; hooks activate automatically and are silent outside SDD projects
**User mental model:** Hooks are invisible infrastructure — practitioners do not invoke them directly. They expect the session to "just know" what they were working on, and to be stopped by a clear, actionable message if they try to skip a workflow phase.

## User Stories

### Story 1: Session starts with full project context

**As a** SDD practitioner
**I want** my Claude Code session to automatically load my project memory, constitution, and active spec context at start
**So that** I can continue work immediately without re-explaining the project state or re-reading docs manually

**Acceptance criteria:**

- [ ] **AC-1.1** Given a Claude Code session starts in a project with a `docs/specs/` directory When the `SessionStart` event fires Then `memory/constitution.md` and `memory/MEMORY.md` are injected as `additionalContext` before the first user turn
- [ ] **AC-1.2** Given the current git branch matches a `docs/specs/NNN-*/` directory When the session starts Then the first 50 lines of that spec's `spec.md` are included in the injected context
- [ ] **AC-1.3** Given the active spec has a `tasks.md` file When the session starts Then only the unchecked tasks (lines matching `- [ ]`) from `tasks.md` are included in the context injection
- [ ] **AC-1.4** Given a Claude Code session starts in a project **without** a `docs/specs/` directory When the `SessionStart` event fires Then no context is injected and the hook exits silently with no output or side effects

### Story 2: Hard Gate — plan requires approved spec

**As a** SDD practitioner
**I want** the system to automatically block writing `plan.md` unless an approved `spec.md` already exists
**So that** the spec→plan→tasks→code chain is never corrupted by skipping the specification phase

**Acceptance criteria:**

- [ ] **AC-2.1** Given a `Write` call targets a path matching `docs/specs/*/plan.md` When no `spec.md` exists in the same spec directory Then the write is denied with a message containing the actual spec directory path and `"Run sdd-specify first."`
- [ ] **AC-2.2** Given a `Write` call targets a path matching `docs/specs/*/plan.md` When `spec.md` exists but does not contain `Status: Approved` Then the write is denied with the message: `"SDD Gate: spec.md exists but is not approved. Set Status: Approved in spec.md before planning."`
- [ ] **AC-2.3** Given a `Write` call targets a path matching `docs/specs/*/plan.md` When `spec.md` exists and contains `Status: Approved` Then the write is allowed and no message is emitted

### Story 3: Hard Gate — tasks require plan

**As a** SDD practitioner
**I want** the system to automatically block writing `tasks.md` unless a `plan.md` already exists in the same spec directory
**So that** tasks are never generated from a non-existent or incomplete plan

**Acceptance criteria:**

- [ ] **AC-3.1** Given a `Write` call targets a path matching `docs/specs/*/tasks.md` When no `plan.md` exists in the same spec directory Then the write is denied with a message containing the actual spec directory path and `"Run sdd-plan first."`
- [ ] **AC-3.2** Given a `Write` call targets a path matching `docs/specs/*/tasks.md` When `plan.md` exists in the same spec directory Then the write is allowed and no message is emitted
- [ ] **AC-3.3** Given a `Write` call targets any path **not** matching `docs/specs/*/tasks.md` When the gate hook fires Then the hook exits silently without blocking

### Story 4: Memory writes are validated immediately

**As a** SDD practitioner
**I want** memory files to be validated for correct structure immediately after they are written
**So that** malformed memory files are caught before they corrupt the memory index or go unnoticed until the next session

**Acceptance criteria:**

- [ ] **AC-4.1** Given a `Write` call completes on a file matching `memory/*.md` When the file does not contain YAML frontmatter with all three required fields (`name`, `description`, `metadata.type`) Then `additionalContext` is injected naming each missing field and instructing Claude to fix the file
- [ ] **AC-4.2** Given a `Write` call completes on a file matching `memory/*.md` When the file has valid frontmatter AND the `name` slug from frontmatter does not appear as a link in `memory/MEMORY.md` Then `additionalContext` is injected instructing Claude to add the entry to `memory/MEMORY.md`
- [ ] **AC-4.3** Given a `Write` call completes on a file matching `memory/*.md` When the file has valid frontmatter AND the `name` slug is already present in `memory/MEMORY.md` Then the hook exits silently with no output

### Story 5: Subagents start with active task and spec context

**As a** SDD practitioner running `sdd-execute` with parallel subagents
**I want** each subagent to automatically receive the current task description and spec summary at start
**So that** subagents stay aligned with the spec without requiring me to repeat that context in every subagent prompt

**Acceptance criteria:**

- [ ] **AC-5.1** Given a `SubagentStart` event fires in an SDD project When the active spec directory is detected Then the spec title, objective (first `## Objective` or `## Problem Statement` section, up to 10 lines), and active spec path are injected as `additionalContext`
- [ ] **AC-5.2** Given a `SubagentStart` event fires in an SDD project When no active spec directory can be detected Then the hook exits silently with no output and no context injection

### Story 6: Session end prompts memory save and completion check

**As a** SDD practitioner
**I want** a reminder to save memory and verify completion at the end of any session where I wrote files
**So that** learnings are never lost between sessions and I never accidentally skip `verification-before-completion`

**Acceptance criteria:**

- [ ] **AC-6.1** Given a `Stop` event fires When no `Write` or `Edit` tool calls occurred during the session Then the hook exits silently with no output
- [ ] **AC-6.2** Given a `Stop` event fires When at least one `Write` or `Edit` tool call occurred during the session Then `additionalContext` is injected with two reminders: (1) save any new learnings to `memory/` before the session ends, (2) run `verification-before-completion` before claiming any work is done
- [ ] **AC-6.3** Given the session state tracking whether writes occurred When the session ends Then the state is reset so the next session starts fresh with `had_writes: false`

## Functional Requirements

### FR-1: SDD Project Detection

Every hook must silently exit without any output or side effects when executed outside an SDD project.

**Must:**
- Check for the existence of a `docs/specs/` directory in the current working directory before executing any logic
- Exit with code 0 and no output when `docs/specs/` is not found

**Must not:**
- Emit any output, warning, or error when running outside an SDD project
- Modify any files or state when running outside an SDD project

### FR-2: Active Spec Detection

A shared library script must detect the active spec directory and make it available to all hook scripts.

**Must:**
- Derive the active spec directory by matching the current git branch name against `docs/specs/NNN-*/` directory names (primary method)
- Fall back to the most recently modified directory under `docs/specs/*/` when the branch name does not match any spec directory (fallback method)
- Export the result as a variable usable by calling hook scripts
- Return empty/unset when neither method yields a match

**Must not:**
- Fail with a non-zero exit code when git is unavailable — fall back gracefully
- Require any external dependencies beyond `git`, `ls`, and POSIX shell built-ins

### FR-3: Session Context Injection

At session start, the plugin must inject project memory and active spec context as `additionalContext`.

**Must:**
- Always inject `memory/constitution.md` full content when the file exists
- Always inject `memory/MEMORY.md` full content when the file exists
- Inject the first 50 lines of the active spec's `spec.md` when an active spec is detected
- Inject only unchecked task lines (lines matching `^- \[ \]`) from the active spec's `tasks.md` when the file exists
- Concatenate all injected content in the order: constitution → memory index → spec summary → open tasks

**Must not:**
- Inject content from specs other than the active spec
- Inject checked/completed tasks from `tasks.md`
- Block session start if any source file is missing — skip missing files silently

### FR-4: Plan Gate Enforcement

Writing a `plan.md` file in any spec directory must be blocked unless an approved `spec.md` exists in the same directory.

**Must:**
- Match writes to any path ending in `plan.md` within `docs/specs/`
- Deny the write with a `permissionDecision: "deny"` response when `spec.md` is absent
- Deny the write with a `permissionDecision: "deny"` response when `spec.md` is present but does not contain `Status: Approved`
- Include the corrective action (`Run sdd-specify first` or `Set Status: Approved`) in the denial reason

**Must not:**
- Block writes to `plan.md` files outside the `docs/specs/` directory tree
- Emit any output when the gate condition is satisfied (spec exists and is approved)

### FR-5: Tasks Gate Enforcement

Writing a `tasks.md` file in any spec directory must be blocked unless a `plan.md` exists in the same directory.

**Must:**
- Match writes to any path ending in `tasks.md` within `docs/specs/`
- Deny the write with a `permissionDecision: "deny"` response when `plan.md` is absent in the same spec directory
- Include the corrective action (`Run sdd-plan first`) in the denial reason

**Must not:**
- Block writes to `tasks.md` files outside the `docs/specs/` directory tree
- Emit any output when the gate condition is satisfied (plan.md exists)

### FR-6: Memory Write Validation

After every write to a file under `memory/`, the plugin must validate the file's frontmatter and its presence in the memory index.

**Must:**
- Fire after `Write` completes on any file matching `memory/*.md`
- Check for YAML frontmatter presence and the three required fields: `name`, `description`, `metadata.type`
- Check that the `name` slug from frontmatter is referenced as a link in `memory/MEMORY.md`
- Inject `additionalContext` listing each specific issue found, with exact instructions for correction

**Must not:**
- Block or fail the write — validation is post-write and advisory only
- Validate files outside the `memory/` directory

### FR-7: Subagent Context Injection

At the start of every subagent, the plugin must inject the active task and spec summary as `additionalContext`.

**Must:**
- Fire on the `SubagentStart` event in SDD projects
- Include the spec title and objective section (up to 10 lines of the first `## Objective` or `## Problem Statement` section)
- Include the active spec file path
- Exit silently when no active spec is detected

**Must not:**
- Inject full memory context — active spec summary and path only
- Block subagent start if the active spec cannot be detected

### FR-8: Session Write State Tracking

The plugin must track whether any `Write` or `Edit` tool calls occurred during the session, to condition the Stop hook behavior.

**Must:**
- Set a persistent session state flag when any `Write` or `Edit` tool call is intercepted
- Make this flag readable by the Stop hook script
- Reset the flag at session end (after the Stop hook reads it)

**Must not:**
- Store any data in the state file beyond the boolean write-occurred flag
- Fail if the state file cannot be written — Stop hook should handle missing state file as `had_writes: false`

### FR-9: Conditional Session End Reminder

At session end, the plugin must inject a reminder to save memory and verify completion — but only when file writes occurred.

**Must:**
- Fire on the `Stop` event in SDD projects
- Check the session write state flag before injecting any content
- Inject two reminders when `had_writes` is true: (1) save new learnings to `memory/`, (2) run `verification-before-completion`
- Exit silently when `had_writes` is false or the state file is absent

**Must not:**
- Block session stop — Stop hook is advisory only
- Fire in non-SDD projects

### FR-10: Hook Distribution and Activation

Hooks must ship as part of the plugin and activate automatically when the plugin is enabled.

**Must:**
- Define all hooks in a `hooks/hooks.json` file at the plugin root (sibling to `.claude-plugin/`)
- Reference hook scripts via `${CLAUDE_PLUGIN_ROOT}` paths so they work regardless of install location
- Use `type: "command"` for all hooks
- Be enabled by default when the plugin is enabled (opt-out model)

**Must not:**
- Require any manual configuration step after plugin installation
- Use HTTP, prompt, or agent hook types

## Non-Functional Requirements

### Performance

- Every hook script must complete within 2 seconds under normal conditions (git branch check, file existence check, file reads up to 200 lines)
- The session context injection script must not read more than 4 files per session start
- Hook scripts doing file traversal must not scan more than one directory level deep in `docs/specs/`

### Security

- Hook scripts must use exec form (with explicit `args`) rather than shell form when calling scripts with user-controlled path components, to prevent shell injection
- The session state file must contain only a boolean value — no conversation content, transcript excerpts, or user data
- Hook scripts must not log to disk or external services

### Reliability

- If any hook script exits with a non-zero, non-2 code (unexpected error), Claude Code must continue the session unblocked — hooks must never crash a session
- If `memory/constitution.md` or `memory/MEMORY.md` is missing, the `SessionStart` hook must continue with whichever files are available rather than failing
- If the git command fails in `detect-active-spec.sh`, the script must fall back to the most recently modified spec directory without propagating the git error

## Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| `docs/specs/` directory not found at session start | Hook exits 0 silently; no context injected; no error shown |
| `memory/constitution.md` missing at session start | Hook injects only the files that exist; skips missing files without error |
| Git unavailable when detecting active spec | Falls back to most-recently-modified spec directory; no error output |
| No spec directory matches current branch and fallback finds none | Hook exits 0 silently; no spec context injected |
| Plan gate fires but `spec.md` is in wrong directory | Denial message names the expected path and corrective skill |
| Memory validation finds missing `name` field | `additionalContext` states: `"memory/[filename].md is missing the 'name' field in frontmatter"` (actual filename substituted) |
| Memory file exists but `MEMORY.md` index is missing | `additionalContext` instructs Claude to create `memory/MEMORY.md` and add the entry |
| Session state file write fails (permissions) | Stop hook reads missing state file as `had_writes: false`; session ends without reminder |
| Hook script crashes with unexpected error (exit 1) | Claude Code session continues unblocked; error shown in transcript but does not stop work |
| `SubagentStart` fires with no detectable active spec | Hook exits 0 silently; subagent starts with no additional context |

## Open Questions

- [NEEDS CLARIFICATION: What is the maximum safe size (in characters) for `additionalContext` injection before it meaningfully compresses Claude's effective context window? The session start hook may inject up to ~4 files; a cap may be needed for large specs.]

## Out of Scope (Future Considerations)

- **TDD enforcement via hooks** — kept inside the `test-driven-development` skill; hooks fire too broadly on non-implementation writes
- **Hard Gate 3 (no code without failing test)** — skill-enforced; hook-based enforcement requires understanding implementation intent, not just file path
- **Hard Gate 4 (no completion claim without evidence)** — Stop hook provides advisory reminder only; hard blocking deferred
- **"Review before merge" git gate** — requires `sdd-review` to write a reviewable artifact first; deferred to a future spec
- **Test failure detection via Bash output** — framework-specific output parsing; handled by `systematic-debugging` skill
- **UserPromptSubmit pattern matching** — brittle; replaced by file-write interception
- **Full memory context in subagents** — too heavy for parallel execution; active task + spec summary is sufficient
- **HTTP, prompt, or agent hook types** — command hooks provide all needed capability without external dependencies
- **Per-user hook configuration UI** — users manage overrides via `.claude/settings.local.json`
