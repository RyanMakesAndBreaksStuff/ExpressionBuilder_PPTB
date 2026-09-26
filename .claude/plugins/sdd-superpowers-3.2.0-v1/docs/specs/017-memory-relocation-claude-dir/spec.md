# Feature 017: Memory Relocation to `.claude/`

**Status:** Approved
**Created:** 2026-07-03
**Branch:** `017-memory-relocation-claude-dir`

---

## Problem Statement

The `memory/` directory sits at the project root alongside source code, docs, skills, and
hooks — content that belongs to the project, not to the Claude runtime. Claude Code already
uses `.claude/` as its operational home (`settings.local.json`). Having memory live outside
`.claude/` blurs the line between "Claude runtime state" and "project content," making the
repo layout harder to reason about and the separation of concerns less clear. Similarly, the
root `CLAUDE.md` is a Claude-specific instructions file that belongs in `.claude/` alongside
the rest of Claude Code's configuration.

## Goals

- All Claude runtime files (`memory/`, `CLAUDE.md`) are consolidated under `.claude/`
- Hook scripts resolve memory paths correctly from the new location
- All skill prose references that Claude reads literally point to the new `.claude/memory/` location
- The `sdd-init` skill generates `.claude/CLAUDE.md` and `.claude/memory/` for new projects
- No intermediate broken state exists — migration is atomic

## Non-Goals

- Providing a migration helper script for existing user projects that still have `memory/` at root
- Adding backward-compatibility detection in hooks for both old and new paths
- Changing any memory file content, frontmatter format, or MEMORY.md index format
- Modifying hook logic, gate behavior, or skill workflow steps
- Updating any spec, plan, or tasks document under `docs/specs/`

## Users and Context

**Primary users:** Claude (the AI model) — reads skill prose and executes hook-injected paths at runtime  
**Secondary users:** SDD practitioners — understand where memory files live when editing them  
**Usage context:** Every session start (hook loads foundation.md and MEMORY.md); every skill invocation that scans `memory/steering/`; every memory file write (post-write-validate hook)  
**User mental model:** `.claude/` is where "Claude stuff" lives. Memory files, settings, and instructions all belong there. The project root is for project content.

## User Stories

### Story 1: Consolidated runtime directory

**As a** developer using the SDD Superpowers plugin  
**I want** all Claude-specific files (`memory/`, `CLAUDE.md`) to live under `.claude/`  
**So that** the project root contains only project content and the separation between runtime and source is immediately obvious

**Acceptance criteria:**

- [ ] **AC-1.1** Given the migration is complete, When I run `ls memory/` at the project root, Then the directory does not exist
- [ ] **AC-1.2** Given the migration is complete, When I run `ls .claude/memory/`, Then all previously-in-`memory/` files are listed (foundation.md, MEMORY.md, feedback files, project files, steering/)
- [ ] **AC-1.3** Given the migration is complete, When I check for `CLAUDE.md` at the project root, Then it does not exist
- [ ] **AC-1.4** Given the migration is complete, When I read `.claude/CLAUDE.md`, Then it contains the same content as the old root `CLAUDE.md` with all `memory/` path references updated to `.claude/memory/`

### Story 2: Session hook loads memory from new location

**As a** developer starting a Claude Code session in this project  
**I want** the session-start hook to inject foundation.md and MEMORY.md into working memory  
**So that** Claude has full project context regardless of where memory files physically live

**Acceptance criteria:**

- [ ] **AC-2.1** Given memory files are at `.claude/memory/foundation.md` and `.claude/memory/MEMORY.md`, When a session starts and the hook fires, Then the hook output includes the content of both files in `additionalContext`
- [ ] **AC-2.2** Given a project where `.claude/memory/foundation.md` does not exist, When the session-start hook fires, Then the hook exits cleanly with no output (does not error)

### Story 3: Post-write validation fires on new path

**As a** developer writing a new memory file  
**I want** the post-write-validate hook to validate files written to `.claude/memory/`  
**So that** frontmatter quality gates apply to the new location

**Acceptance criteria:**

- [ ] **AC-3.1** Given a Write tool call targeting `.claude/memory/foo.md`, When the PostToolUse hook fires, Then it validates frontmatter and reports issues if name, description, or metadata.type are missing
- [ ] **AC-3.2** Given a Write tool call targeting a path outside `.claude/memory/`, When the PostToolUse hook fires, Then it exits cleanly without validating
- [ ] **AC-3.3** Given `.claude/memory/foundation.md`, `.claude/memory/MEMORY.md`, or `.claude/memory/steering/*.md` is written, When the PostToolUse hook fires, Then it exits cleanly (exempt files bypass validation)

### Story 4: Skills read steering files from new location

**As** Claude executing an SDD skill  
**I want** skill prose instructions to reference `.claude/memory/steering/` correctly  
**So that** when I scan for steering files I look in the right place

**Acceptance criteria:**

- [ ] **AC-4.1** Given all skill files have been updated, When I grep for `memory/steering/` across all files in `skills/`, Then zero matches are returned
- [ ] **AC-4.2** Given all skill files have been updated, When I grep for `memory/foundation.md` across all files in `skills/`, Then zero matches are returned
- [ ] **AC-4.3** Given `.claude/memory/steering/tech-stack.md` exists with `loaded-by: sdd-plan`, When `sdd-plan` is invoked, Then the skill instruction correctly directs Claude to scan `.claude/memory/steering/`

### Story 5: sdd-init generates correct structure for new projects

**As a** developer initializing a new SDD project  
**I want** `sdd-init` to create `.claude/CLAUDE.md` and `.claude/memory/` with the correct structure  
**So that** newly initialized projects use the consolidated `.claude/` layout from the start

**Acceptance criteria:**

- [ ] **AC-5.1** Given a project with no existing `.claude/CLAUDE.md` or `memory/`, When `sdd-init` runs and completes Step 3, Then `.claude/memory/foundation.md` is written (not `memory/foundation.md`)
- [ ] **AC-5.2** Given a project with no existing steering files, When `sdd-init` runs and completes Step 5, Then `.claude/memory/steering/tech-stack.md`, `.claude/memory/steering/test-strategy.md`, `.claude/memory/steering/conventions.md`, and `.claude/memory/steering/team-practices.md` are written
- [ ] **AC-5.3** Given a project with no existing `.claude/CLAUDE.md`, When `sdd-init` runs and completes the CLAUDE.md step, Then `.claude/CLAUDE.md` is written using the updated template (referencing `.claude/memory/`)
- [ ] **AC-5.4** Given `sdd-init` completes successfully, When I run `ls memory/` at the project root, Then the directory does not exist

## Functional Requirements

### FR-1: File Migration

All files currently under `memory/` must be moved to `.claude/memory/`. The `memory/` directory at the project root must not exist after migration.

**Must:**
- Move `memory/foundation.md` → `.claude/memory/foundation.md`
- Move `memory/MEMORY.md` → `.claude/memory/MEMORY.md`
- Move all `memory/*.md` feedback and project files → `.claude/memory/*.md`
- Move all `memory/steering/*.md` → `.claude/memory/steering/*.md`
- Remove the now-empty `memory/` directory

**Must not:**
- Modify memory file content (body text and frontmatter are unchanged)
- Leave any file in the old `memory/` location

### FR-2: CLAUDE.md Migration

The root `CLAUDE.md` must be replaced by `.claude/CLAUDE.md` with updated internal path references.

**Must:**
- Create `.claude/CLAUDE.md` with the same content as the current root `CLAUDE.md` except `memory/` → `.claude/memory/` in the Memory section
- Delete the root `CLAUDE.md` after `.claude/CLAUDE.md` is created

**Must not:**
- Change the Hard Gates section, the skill invocation instruction, or any content outside the Memory section path references

### FR-3: Hook Script Path Updates

Two hook scripts contain hardcoded `${CWD}/memory/` paths that must be updated.

**Must:**
- In `scripts/hooks/session-start.sh`: replace `${CWD}/memory/foundation.md` with `${CWD}/.claude/memory/foundation.md` and `${CWD}/memory/MEMORY.md` with `${CWD}/.claude/memory/MEMORY.md`
- In `scripts/hooks/post-write-memory-validate.sh`: replace the `*/memory/*.md` path pattern with `*/.claude/memory/*.md`; replace the exempt-path patterns (`*/memory/foundation.md`, `*/memory/MEMORY.md`, `*/memory/steering/*.md`) with their `.claude/memory/` equivalents; replace `${CWD}/memory/MEMORY.md` with `${CWD}/.claude/memory/MEMORY.md`

**Must not:**
- Change hook logic, exit codes, validation rules, or output structure

### FR-4: Skill Prose Updates

All skill files under `skills/` that instruct Claude to read from `memory/` must be updated to `.claude/memory/`.

**Must:**
- Replace every occurrence of `memory/steering/` with `.claude/memory/steering/` in all skill files
- Replace every occurrence of `memory/foundation.md` with `.claude/memory/foundation.md` in all skill files
- Replace every occurrence of `memory/MEMORY.md` with `.claude/memory/MEMORY.md` in all skill files
- Replace every occurrence of `memory/constitution.md` with `.claude/memory/constitution.md` in all skill files (legacy migration references in sdd-init)
- After updates, `grep -r "memory/" skills/` must return zero matches

**Must not:**
- Change skill workflow steps, gate text, examples, constraints, or error handling sections beyond the path strings

### FR-5: sdd-init Template and Reference Updates

The `sdd-init` skill drives project initialization. Its template and reference doc must be updated to produce the new layout.

**Must:**
- Update `skills/sdd-init/templates/claude-md.md` to reference `.claude/memory/` paths
- Update all path references in `skills/sdd-init/reference.md` from `memory/` to `.claude/memory/`
- Update `skills/sdd-init/SKILL.md` artifact table to show `.claude/memory/` paths
- Update the `sdd-init` detection logic: check for `.claude/memory/foundation.md` instead of `memory/foundation.md`

**Must not:**
- Change the number of steering files generated, their content templates, or the initialization workflow steps

## Non-Functional Requirements

### Correctness

- After migration, all existing tests in `tests/` must pass without modification
- No skill may reference an old `memory/` path after migration

### Atomicity

- The migration is performed as a single branch; no intermediate commit leaves the project in a partially-migrated state where some references point to the old path and some to the new path

### Discoverability

- The new layout must be self-evident: a developer reading `.claude/CLAUDE.md` sees the Memory section pointing to `.claude/memory/`; a developer listing `.claude/` sees both `memory/` and `settings.local.json`

## Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Session-start hook fires and `.claude/memory/foundation.md` does not exist | Hook exits cleanly (exit 0) with no output; no error emitted |
| Post-write-validate hook receives a file path matching `*/.claude/memory/*.md` with no frontmatter | Hook reports missing frontmatter and required fields in `additionalContext` |
| `sdd-init` is run on a project that still has the old `memory/` layout at root | `sdd-init` detects `memory/foundation.md` (old path) and announces: "A `memory/foundation.md` was found at the old location. Migrate it to `.claude/memory/foundation.md` before re-invoking sdd-init." No files are written. |
| `grep -r "memory/" skills/` returns matches after the skill update pass | Migration is incomplete; remaining matches must be fixed before the PR is merged |

## Open Questions

None. Design was approved prior to specification.

## Out of Scope (Future Considerations)

- A migration helper script for user projects that already shipped with `memory/` at root
- Backward-compatibility detection in hooks that falls back to `memory/` if `.claude/memory/` is absent
- Documenting the `.claude/` layout in README.md
