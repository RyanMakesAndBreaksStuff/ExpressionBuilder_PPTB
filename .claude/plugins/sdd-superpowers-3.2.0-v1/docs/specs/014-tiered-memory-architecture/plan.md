# Implementation Plan: Tiered Memory Architecture

> **For agentic workers:** Use sdd-tasks to generate an executable task list from this plan.

**Spec:** docs/specs/014-tiered-memory-architecture/spec.md
**Research:** docs/specs/014-tiered-memory-architecture/research.md
**Created:** 2026-06-24

---

## Goal

Rename `constitution.md` → `foundation.md`, add a hook whitelist for Tier 0/Tier 1 files, ship a minimal sdd-init CLAUDE.md template, update the sdd-init skill to emit `foundation.md`, and migrate this repo's own CLAUDE.md to the boot layer.

## Architecture

All changes are file edits across two shell scripts, two skill markdown files, two hook test files, and four repo files (CLAUDE.md, constitution.md, a new contributing.md, a stale memory file). No new dependencies, no new hook types — every change is a targeted substitution grounded in a spec requirement. The PostToolUse:Write hook gains a three-pattern `case` block that exits before validation for whitelisted paths; the SessionStart hook gets a one-line filename swap.

## Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Hook scripts | Bash | FR-6 (hook whitelist), FR-1 (session-load) — existing hook infrastructure |
| Skill instructions | Markdown | FR-2, FR-3, FR-4 — skills are markdown files read by the Skill tool |
| Template | Markdown | FR-3 — CLAUDE.md template per spec AC-2.1 |
| Tests | Bash | TDD requirement — tests precede implementation |

## File Structure

**Created:**
- `skills/sdd-init/templates/claude-md.md` — boot-layer CLAUDE.md template with sentinel (FR-3)
- `docs/contributing.md` — plugin contributor reference moved from CLAUDE.md (FR-5, AC-3.5)
- `memory/foundation.md` — Tier 0 foundation file (renamed from constitution.md, AC-3.1)

**Modified:**
- `scripts/hooks/session-start.sh` — constitution.md → foundation.md reference (AC-1.5, AC-3.2)
- `scripts/hooks/post-write-memory-validate.sh` — add whitelist case block (FR-6, AC-3.4)
- `skills/sdd-init/reference.md` — 7 touch points: existence check, file paths, schema, template reference (FR-2, FR-3, FR-4)
- `skills/sdd-init/SKILL.md` — 5 constitution references → foundation (AC-3.6)
- `CLAUDE.md` — trim to boot layer + add sentinel + update memory pointer (AC-3.3)
- `memory/project_constitution_format.md` — update filename reference, remove stale hook warning (AC-3.7)

**Deleted:**
- `memory/constitution.md` — superseded by `memory/foundation.md`

**Test files modified:**
- `tests/hooks/test_session_start.sh` — fixture + assertion update
- `tests/hooks/test_post_write_memory_validate.sh` — three whitelist test cases added
- `tests/hooks/test_subagent_start.sh` — must-not assertion updated

## Complexity Tracking

All pre-implementation gates pass:
- **Simplicity Gate:** ≤3 major components (hook scripts, sdd-init skill, repo self-migration) ✓
- **Anti-Abstraction Gate:** shell scripts used directly, no wrappers ✓
- **Integration-First Gate:** no APIs; contract = hook output format (unchanged) ✓

**FR-7 note (Tier 2 Dedup Rule):** FR-7 requires Claude to scan MEMORY.md before writing and apply same-type + overlapping-entity dedup logic. This behavior is enforced by the auto-memory system instructions in the Claude Code session prompt — not by any file in this repo. No implementation phase is needed; FR-7 is satisfied by the existing auto-memory system. AC-4.1 and AC-4.2 are verified behaviorally (observe Claude's behavior during session). AC-4.3 (200-line pruning) is likewise in the auto-memory instructions and outside this repo's scope.

---

## Phase 0: Failing Tests First [DONE]

**Implements:** FR-6, FR-1 | **Satisfies:** AC-1.5, AC-3.2, AC-3.4 (test preconditions)
**Files:** `tests/hooks/test_session_start.sh`, `tests/hooks/test_post_write_memory_validate.sh`, `tests/hooks/test_subagent_start.sh`

Write all failing tests before touching any implementation file. Baseline: 9 test files pass.

### 0.1 Update test_session_start.sh fixture and assertion

Replace the `constitution.md` fixture and its matching assertion so the test expects `foundation.md`:

In `tests/hooks/test_session_start.sh`, replace:
```bash
echo "# Constitution content" > "$TMP/memory/constitution.md"
```
with:
```bash
echo "# Foundation content" > "$TMP/memory/foundation.md"
```

Replace assertion:
```bash
assert_contains "$OUTPUT" "Constitution content" "AC-1.1: constitution.md injected"
```
with:
```bash
assert_contains "$OUTPUT" "Foundation content" "AC-1.1: foundation.md injected"
```

- [ ] Run: `bash tests/hooks/test_session_start.sh`
- [ ] Confirm: AC-1.1 FAILS — "Foundation content" not found (hook still reads constitution.md which no longer exists in fixture)
- [ ] Commit: `test: update session_start fixture to foundation.md`

### 0.2 Add whitelist test cases to test_post_write_memory_validate.sh

Insert before `rm -rf "$TMP"` in `tests/hooks/test_post_write_memory_validate.sh`:

```bash
# FR-6 whitelist: foundation.md silenced
echo "# Foundation" > "$TMP/memory/foundation.md"
INPUT=$(make_input "$TMP" "$TMP/memory/foundation.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "FR-6 whitelist: silent for foundation.md"

# FR-6 whitelist: MEMORY.md silenced
echo "# Memory" > "$TMP/memory/MEMORY.md"
INPUT=$(make_input "$TMP" "$TMP/memory/MEMORY.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "FR-6 whitelist: silent for MEMORY.md"

# FR-6 whitelist: steering file silenced
mkdir -p "$TMP/memory/steering"
echo "# Tech Stack" > "$TMP/memory/steering/tech-stack.md"
INPUT=$(make_input "$TMP" "$TMP/memory/steering/tech-stack.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "FR-6 whitelist: silent for steering file"
```

- [ ] Run: `bash tests/hooks/test_post_write_memory_validate.sh`
- [ ] Confirm: 3 new cases FAIL — no whitelist exists yet
- [ ] Commit: `test: add whitelist cases to post_write_memory_validate`

### 0.3 Update test_subagent_start.sh must-not assertion

In `tests/hooks/test_subagent_start.sh`, replace:
```bash
if echo "$OUTPUT" | grep -qi "constitution"; then
```
with:
```bash
if echo "$OUTPUT" | grep -qi "foundation\|constitution"; then
```

- [ ] Run: `bash tests/hooks/test_subagent_start.sh`
- [ ] Confirm: still PASSES (subagent-start.sh loads neither file — this is a forward-proofing update)
- [ ] Commit: `test: extend subagent_start must-not to cover foundation`

---

## Phase 1: SessionStart Hook — foundation.md Reference [DONE]

**Implements:** FR-1 | **Satisfies:** AC-1.5, AC-3.2
**Files:** `scripts/hooks/session-start.sh`

### 1.1 Swap constitution.md → foundation.md in session-start.sh

In `scripts/hooks/session-start.sh`, replace:
```bash
if [ -f "${CWD}/memory/constitution.md" ]; then
  append_section "memory/constitution.md" "$(cat "${CWD}/memory/constitution.md")"
fi
```
with:
```bash
if [ -f "${CWD}/memory/foundation.md" ]; then
  append_section "memory/foundation.md" "$(cat "${CWD}/memory/foundation.md")"
fi
```

- [ ] Run: `bash tests/hooks/test_session_start.sh`
- [ ] Confirm: all assertions PASS including "Foundation content"
- [ ] Run: `bash tests/hooks/run_all.sh`
- [ ] Confirm: 9 files pass, 0 fail
- [ ] Commit: `fix: session-start hook reads foundation.md instead of constitution.md`

---

## Phase 2: PostToolUse:Write Hook — Whitelist [DONE]

**Implements:** FR-6 | **Satisfies:** AC-3.4
**Files:** `scripts/hooks/post-write-memory-validate.sh`

### 2.1 Insert whitelist case block

In `scripts/hooks/post-write-memory-validate.sh`, after the existing path filter:
```bash
case "$FILE_PATH" in
  */memory/*.md) ;;
  *) exit 0 ;;
esac
```
Insert immediately after (before the `[ -f "$FILE_PATH" ] || exit 0` line):
```bash
case "$FILE_PATH" in
  */memory/foundation.md|*/memory/MEMORY.md|*/memory/steering/*.md) exit 0 ;;
esac
```

Full updated block in context:
```bash
case "$FILE_PATH" in
  */memory/*.md) ;;
  *) exit 0 ;;
esac

case "$FILE_PATH" in
  */memory/foundation.md|*/memory/MEMORY.md|*/memory/steering/*.md) exit 0 ;;
esac

[ -f "$FILE_PATH" ] || exit 0
```

- [ ] Run: `bash tests/hooks/test_post_write_memory_validate.sh`
- [ ] Confirm: all 7 assertions PASS (4 original + 3 new whitelist cases)
- [ ] Run: `bash tests/hooks/run_all.sh`
- [ ] Confirm: 9 files pass, 0 fail
- [ ] Commit: `feat: whitelist foundation.md, MEMORY.md, steering files in memory validation hook`

---

## Phase 3: sdd-init CLAUDE.md Template [DONE]

**Implements:** FR-3 | **Satisfies:** AC-2.1, AC-2.2, AC-2.5
**Files:** `skills/sdd-init/templates/claude-md.md` (new)

### 3.1 Create templates directory and claude-md.md

Create `skills/sdd-init/templates/claude-md.md` with this exact content:

```markdown
<!-- sdd-init: generated -->
# [Project Name]

Before starting work, invoke `sdd-superpowers:sdd-workflow`.

## Memory

Memory lives in `memory/` — see `memory/MEMORY.md` for the index.
Project identity is in `memory/foundation.md`.
Steering files in `memory/steering/` are loaded by skills when relevant.

## Hard Gates

- NO PLAN without an approved spec
- NO TASKS without a plan
- NO CODE without a prior failing test
- NO COMPLETION CLAIM without fresh verification evidence
```

- [ ] Verify sentinel present: `head -1 skills/sdd-init/templates/claude-md.md` → outputs `<!-- sdd-init: generated -->`
- [ ] Verify no skills table: `grep -c "| \`sdd-" skills/sdd-init/templates/claude-md.md` → outputs `0`
- [ ] Verify hard gates present: `grep -c "NO PLAN" skills/sdd-init/templates/claude-md.md` → outputs `1`
- [ ] Commit: `feat: add CLAUDE.md boot-layer template for sdd-init`

---

## Phase 4: sdd-init/reference.md — Seven Touch Points [DONE]

**Implements:** FR-2, FR-3, FR-4 | **Satisfies:** AC-1.1, AC-1.2, AC-1.3, AC-1.4, AC-2.1, AC-2.2, AC-2.3, AC-2.4
**Files:** `skills/sdd-init/reference.md`

### 4.1 Update HARD-GATE text

Replace:
```
Do NOT create any feature specs, plans, or code until the constitution is approved and the scaffold is written. This skill produces ONLY the project foundation.
```
with:
```
Do NOT create any feature specs, plans, or code until the foundation file is approved and the scaffold is written. This skill produces ONLY the project foundation.
```

### 4.2 Update Step 1.5 heading and existence check (4 states)

Replace the entire `### Constitution Existence Check` block:
```markdown
### Constitution Existence Check

After the exploration subagent returns, check `memory/constitution.md`:

- **If `memory/constitution.md` does not exist:** proceed to Step 2 normally.
- **If `memory/constitution.md` exists and contains `## Article I`:**
  Announce: "An existing nine-article constitution was found at `memory/constitution.md`. Migration to the new mission-charter format is not yet supported. To start fresh: rename or delete the existing file, then re-invoke `sdd-init`. No files will be written."
  **STOP — do not proceed to Step 2 or any scaffold step.**
- **If `memory/constitution.md` exists and does NOT contain `## Article I`:**
  Announce: "A constitution already exists at `memory/constitution.md`. Skipping Phase 1 — proceeding to steering file scaffold."
  Jump to Step 5.2 (steering file generation).
```
with:
```markdown
### Foundation Existence Check

After the exploration subagent returns, check for existing foundation and constitution files:

- **If `memory/foundation.md` exists:**
  Announce: "foundation.md already exists — project already initialized. No files will be written."
  **STOP — do not proceed to Step 2 or any scaffold step.**
- **If `memory/constitution.md` exists and contains `## Article I`:**
  Announce: "An existing nine-article constitution was found at `memory/constitution.md`. Run migration before re-initializing: rename `memory/constitution.md` → `memory/foundation.md`, then re-invoke `sdd-init`. No files will be written."
  **STOP — do not proceed to Step 2 or any scaffold step.**
- **If both `memory/constitution.md` and `memory/foundation.md` exist:**
  Announce: "Conflicting state — both `memory/constitution.md` and `memory/foundation.md` exist. Resolve manually before re-invoking `sdd-init`. No files will be written."
  **STOP — do not proceed to Step 2 or any scaffold step.**
- **If `memory/constitution.md` exists and does NOT contain `## Article I`:**
  Announce: "A mission-charter constitution exists at `memory/constitution.md`. Rename it to `memory/foundation.md` to complete migration, then re-invoke `sdd-init`. No files will be written."
  **STOP — do not proceed to Step 2 or any scaffold step.**
- **If neither file exists:** proceed to Step 2 normally.
```

### 4.3 Update Step 3 title, path, and file schema

Replace section heading and file content block:

Old heading: `## Step 3: Write memory/constitution.md`
New heading: `## Step 3: Write memory/foundation.md`

Old announce line: `Announce: "Writing \`memory/constitution.md\`."`
New announce line: `Announce: "Writing \`memory/foundation.md\`."`

Old file schema:
```markdown
# [Project Name] Constitution

> Loaded every session. To amend, follow the Amendment Process below.
```
New file schema:
```markdown
# [Project Name] Foundation

> Loaded every session. To amend, follow the Amendment Process below.
```

### 4.4 Update Step 5.1 reference

Replace:
```
Confirm that `memory/constitution.md` was written in Step 3.
```
with:
```
Confirm that `memory/foundation.md` was written in Step 3.
```

### 4.5 Update Step 5.4 — sentinel detection + template reference + updated block

Replace the entire `### Step 5.4 Create or update CLAUDE.md` section:

```markdown
### Step 5.4 Create or update CLAUDE.md

**Detection order:**
1. If `CLAUDE.md` does not exist → create it (see template below)
2. If `CLAUDE.md` exists and contains `## Project Foundation` → skip (already initialised)
3. If `CLAUDE.md` exists and contains `## SDD Workflow` but not `## Project Foundation` → append the `## Project Foundation` block; show the user exactly what will be appended and get approval before writing
4. If `CLAUDE.md` exists with neither marker → append the `## Project Foundation` block after showing diff and getting approval

**`## Project Foundation` block to write or append:**

\```markdown
## Project Foundation

Before any feature work, read:
- `memory/constitution.md` — Mission and principles. Loaded every session.
- `memory/steering/` — Operational context. Loaded by skills when relevant.
  Each file's `loaded-by` frontmatter shows which skills incorporate it silently.
\```
```

with:

```markdown
### Step 5.4 Create or update CLAUDE.md

**Detection order:**
1. If `CLAUDE.md` does not exist → write from `skills/sdd-init/templates/claude-md.md`, substituting `[Project Name]` with the project name detected in Step 1.5
2. If `CLAUDE.md` first line is `<!-- sdd-init: generated -->` → skip (already initialised by sdd-init)
3. If `CLAUDE.md` exists without the sentinel → append the `## Project Foundation` block below after showing the user what will be appended and getting approval

**`## Project Foundation` block to append (backward-compat path):**

\```markdown
## Project Foundation

Before any feature work, read:
- `memory/foundation.md` — Mission and principles. Loaded every session.
- `memory/steering/` — Operational context. Loaded by skills when relevant.
  Each file's `loaded-by` frontmatter shows which skills incorporate it silently.
\```
```

### 4.6 Update Step 5.6 git add command

Replace:
```bash
git add memory/constitution.md memory/steering/ docs/specs/.gitkeep CLAUDE.md docs/git-convention.md
```
with:
```bash
git add memory/foundation.md memory/steering/ docs/specs/.gitkeep CLAUDE.md docs/git-convention.md
```

### 4.7 Update Step 6 handoff

Replace:
```
- `memory/constitution.md` — [Created/Updated] Mission Charter governing all implementation plans
```
with:
```
- `memory/foundation.md` — [Created/Updated] Foundation file: mission and principles loaded every session
```

- [ ] Verify all 7 touch points applied: `grep -n "constitution" skills/sdd-init/reference.md | grep -v "Article I\|nine-article\|migration"` → outputs 0 lines (only legitimate historical references remain)
- [ ] Commit: `feat: update sdd-init reference.md to generate foundation.md and use sentinel CLAUDE.md detection`

---

## Phase 5: sdd-init/SKILL.md — Constitution References [DONE]

**Implements:** FR-4 | **Satisfies:** AC-3.6
**Files:** `skills/sdd-init/SKILL.md`

### 5.1 Update all constitution references in SKILL.md

Apply these replacements in `skills/sdd-init/SKILL.md`:

| Old text | New text |
|----------|----------|
| `writes \`memory/constitution.md\`` | `writes \`memory/foundation.md\`` |
| `Mission Charter — mission statement + 3–5 project-specific principles` | `Foundation file — mission statement + 3–5 project-specific principles` |
| `check for existing constitution` | `check for existing foundation file` |
| `Draft constitution from answers → user approval gate → write \`memory/constitution.md\`` | `Draft foundation from answers → user approval gate → write \`memory/foundation.md\`` |
| `until the constitution is approved` | `until the foundation file is approved` |

- [ ] Verify: `grep -c "constitution" skills/sdd-init/SKILL.md` → outputs `0`
- [ ] Commit: `feat: update sdd-init SKILL.md to reference foundation.md`

---

## Phase 6: Repo Self-Migration [DONE]

**Implements:** FR-1, FR-3, FR-5 | **Satisfies:** AC-3.1, AC-3.2, AC-3.3, AC-3.4, AC-3.5, AC-3.7
**Files:** `memory/constitution.md` (delete), `memory/foundation.md` (create), `CLAUDE.md`, `docs/contributing.md` (create), `memory/project_constitution_format.md`

### 6.1 Rename constitution.md → foundation.md

Copy content of `memory/constitution.md` to `memory/foundation.md`, changing only the file title:

Old title: `# SDD Superpowers Constitution`
New title: `# SDD Superpowers Foundation`

Then delete `memory/constitution.md`.

- [ ] Verify: `ls memory/constitution.md` → "No such file or directory"
- [ ] Verify: `head -1 memory/foundation.md` → `# SDD Superpowers Foundation`
- [ ] Verify: `grep "Loaded every session" memory/foundation.md` → match found

### 6.2 Create docs/contributing.md

Create `docs/contributing.md` with the content removed from CLAUDE.md (What Is SDD, Skills table, Workflow diagram, Bundled Skills table, Directory Structure, Quick Start):

```markdown
# Contributing to SDD Superpowers

This guide is for developers working on the sdd-superpowers plugin itself.
For using the plugin in your own project, see `CLAUDE.md`.

## What Is SDD?

SDD inverts the traditional relationship between specs and code. Instead of writing code and hoping it matches intent, you write precise specifications first, then generate code from them. The spec is the authoritative artifact; code is its expression in a particular language and framework.

Key principles:
- **Specifications as lingua franca** — PRD and implementation plan are the primary artifacts
- **Executable specifications** — specs are precise enough to generate working, testable code
- **Test-first always** — no implementation code without a prior failing test
- **Traceability** — every technical decision traces back to a specific requirement
- **Evidence before assertions** — no completion claims without running verification commands

## Skills

| Skill | When to Use |
|-------|-------------|
| `sdd-workflow` | Start of any conversation — establishes mandatory skill invocation |
| `sdd-brainstorm` | Idea is fuzzy/exploratory → dialogue + 2-3 approaches + design.md |
| `sdd-specify` | Idea is clear, or design.md exists → structured PRD (spec.md) |
| `sdd-research` | Unresolved tech choices, performance/security requirements before planning |
| `sdd-plan` | Spec exists → architecture, contracts, data models, test-first plan |
| `sdd-tasks` | Plan exists → flat executable task list with parallelization hints |
| `sdd-execute` | Tasks exist → subagent dispatch with spec-compliance + code-quality review |
| `sdd-spec-update` | Change or addition to an approved spec → classify impact (PATCH/MINOR/MAJOR), version spec, propagate downstream |
| `sdd-review` | Spec completeness check (pre-plan) or implementation alignment (post-execute) |

## Workflow

\```
Idea (fuzzy)                    Idea (clear)
 │                               │
 ▼                               │
sdd-brainstorm ──────────────────┤
 │  dialogue + 2-3 approaches    │
 │  design.md + spec-review      │
 │                               │
 └───────────────────────────────┘
                                 │
                                 ▼
sdd-specify ──────────────────► docs/specs/NNN-feature/spec.md
 │  (fast-path if design.md       + feature branch created
 │   already exists)
 │
 ├─(complex features)──────────►
 │                              sdd-research ──► docs/specs/NNN-feature/research.md
 │ ◄────────────────────────────┘
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
\```

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

\```
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
      spec.md          # PRD — the source of truth
      research.md      # Technical investigation (optional)
      plan.md          # Implementation plan
      data-model.md    # Entity definitions (optional)
      contracts/       # API/event contracts (optional)
      tasks.md         # Executable task list
      quickstart.md    # Smoke test scenarios
skills/
  sdd-workflow/
  sdd-brainstorm/
  sdd-specify/
  sdd-research/
  sdd-plan/
  sdd-tasks/
  sdd-execute/
  sdd-spec-update/
  sdd-review/
  systematic-debugging/
  verification-before-completion/
  finishing-a-development-branch/
\```

## Quick Start (for plugin contributors)

\```
# Fuzzy idea path:
1. "Use sdd-brainstorm to explore: [your idea]"
2. Answer questions, pick from 2-3 approaches, approve design
3. sdd-brainstorm automatically invokes sdd-specify (fast-path)

# Clear idea path:
1. "Use sdd-specify to create a spec for: [your idea]"
2. Answer clarifying questions, approve the spec
3. "Use sdd-plan to plan this feature"
4. "Use sdd-tasks to generate the task list"
5. "Use sdd-execute to implement it"
6. "Use sdd-review to validate the implementation"
\```
```

- [ ] Verify: `grep "What Is SDD" docs/contributing.md` → match found

### 6.3 Rewrite CLAUDE.md to boot layer

Replace the entire content of `CLAUDE.md` with:

```markdown
<!-- sdd-init: generated -->
# SDD Superpowers

Before starting work, invoke `sdd-superpowers:sdd-workflow`.

## Memory

Memory lives in `memory/` — see `memory/MEMORY.md` for the index.
Project identity is in `memory/foundation.md`.
Steering files in `memory/steering/` are loaded by skills when relevant.

## Hard Gates

- NO PLAN without an approved spec
- NO TASKS without a plan
- NO CODE without a prior failing test
- NO COMPLETION CLAIM without fresh verification evidence

## Project Context

Before starting any work, read these sources:

| Source | What it contains |
|--------|-----------------|
| `memory/foundation.md` | Mission and principles. Loaded every session. |
| `memory/MEMORY.md` | Index of all persistent memory files |
| `docs/git-convention.md` | Branch naming regex, commit format, allowed types |
| `docs/specs/` | All feature specs, plans, and task lists |

Always check `docs/specs/` for existing specs before starting a new feature.

> For plugin contributor reference (skills, workflow, directory structure): see `docs/contributing.md`
```

- [ ] Verify sentinel: `head -1 CLAUDE.md` → `<!-- sdd-init: generated -->`
- [ ] Verify no skills table: `grep -c "| \`sdd-" CLAUDE.md` → `0`
- [ ] Verify no workflow diagram: `grep -c "sdd-brainstorm ──" CLAUDE.md` → `0`
- [ ] Verify foundation pointer: `grep "foundation.md" CLAUDE.md` → match found

### 6.4 Update memory/project_constitution_format.md

Replace the entire file content with:

```markdown
---
name: project-constitution-format
description: memory/foundation.md is the Tier 0 project identity file — no frontmatter required; hook whitelist exempts it from validation
metadata:
  type: project
---

`memory/foundation.md` is the project foundation file introduced in feature 014 (tiered-memory-architecture). It holds Mission, Principles, Operational Context pointer, and Amendment Process — no YAML frontmatter.

**Why:** The PostToolUse:Write hook validates all files written to `memory/` as memory entries and required YAML frontmatter. `foundation.md` is not a memory entry; it is the Tier 0 project identity file. Feature 014 added a hook whitelist that exempts `foundation.md`, `MEMORY.md`, and `steering/*.md` from frontmatter validation — the hook is now silent for these files.

**How to apply:** No action needed. The whitelist handles it automatically. If the hook fires on `foundation.md` in a project that has not yet applied feature 014's hook update, the old guidance applies: ignore the warning.
```

- [ ] Verify: `grep "foundation.md" memory/project_constitution_format.md` → match found
- [ ] Verify: `grep "ignore the warning" memory/project_constitution_format.md` → match found (the backward-compat note is preserved at the bottom)
- [ ] Commit: `feat: self-migrate repo — foundation.md, contributing.md, boot-layer CLAUDE.md`

---

## Phase 7: Integration Verification [DONE]

**Implements:** All FRs | **Satisfies:** All ACs

### 7.1 Run full test suite

- [ ] Run: `bash tests/hooks/run_all.sh`
- [ ] Confirm: 9 files pass, 0 fail (or more if new test files were added)

### 7.2 AC coverage verification

| AC | Verification command | Expected |
|----|---------------------|----------|
| AC-1.1 | `grep "foundation.md" skills/sdd-init/reference.md \| grep "Step 3"` | match |
| AC-1.2 | `grep "already initialized" skills/sdd-init/reference.md` | match |
| AC-1.3 | `grep "old constitution detected\|nine-article" skills/sdd-init/reference.md` | match |
| AC-1.4 | `grep "Conflicting state" skills/sdd-init/reference.md` | match |
| AC-1.5 | `grep "foundation.md" scripts/hooks/session-start.sh` | match |
| AC-2.1 | `ls skills/sdd-init/templates/claude-md.md` | file exists |
| AC-2.2 | `head -1 skills/sdd-init/templates/claude-md.md` | `<!-- sdd-init: generated -->` |
| AC-2.3 | `grep "sentinel" skills/sdd-init/reference.md` | match |
| AC-2.4 | `grep "Project Foundation" skills/sdd-init/reference.md` | match (backward-compat path) |
| AC-2.5 | `grep -c "sdd-" skills/sdd-init/templates/claude-md.md` | `1` (only the sdd-workflow invocation) |
| AC-3.1 | `ls memory/foundation.md && ! ls memory/constitution.md 2>/dev/null` | foundation exists, constitution absent |
| AC-3.2 | `grep "foundation.md" scripts/hooks/session-start.sh` | match |
| AC-3.3 | `grep -c "sdd-brainstorm ──" CLAUDE.md` | `0` |
| AC-3.4 | `grep "foundation.md.*exit 0" scripts/hooks/post-write-memory-validate.sh` | match |
| AC-3.5 | `grep "Skills" docs/contributing.md` | match |
| AC-3.6 | `grep -c "constitution" skills/sdd-init/SKILL.md` | `0` |
| AC-3.7 | `grep "foundation.md" memory/project_constitution_format.md` | match |
| AC-4.1 | Behavioral — auto-memory system instructions enforce dedup; observe Claude updating vs. creating during session | — |
| AC-4.2 | Behavioral — same as AC-4.1 | — |
| AC-4.3 | Behavioral — auto-memory system enforces 200-line pruning in session prompt | — |

### 7.3 Commit

- [ ] Commit: `feat: tiered memory architecture — foundation.md, boot-layer CLAUDE.md, hook whitelist`

---

## Quickstart Validation

### Scenario A: Session start loads foundation.md (not constitution.md)

```bash
TMP=$(mktemp -d)
mkdir -p "$TMP/docs/specs" "$TMP/memory"
echo "# SDD Superpowers Foundation" > "$TMP/memory/foundation.md"
echo "- [test](test.md)" > "$TMP/memory/MEMORY.md"
INPUT=$(jq -n --arg cwd "$TMP" '{"hook_event_name":"SessionStart","session_id":"t","cwd":$cwd}')
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$(pwd)" CWD="$TMP" bash scripts/hooks/session-start.sh <<< "$INPUT")
echo "$OUTPUT" | grep -q "Foundation" && echo "PASS: foundation.md loaded" || echo "FAIL"
rm -rf "$TMP"
```

Expected: `PASS: foundation.md loaded`

### Scenario B: Hook is silent for whitelisted files

```bash
TMP=$(mktemp -d)
mkdir -p "$TMP/docs/specs" "$TMP/memory/steering"
echo "# Foundation" > "$TMP/memory/foundation.md"
INPUT=$(jq -n --arg cwd "$TMP" --arg path "$TMP/memory/foundation.md" \
  '{"hook_event_name":"PostToolUse","cwd":$cwd,"tool_name":"Write","tool_input":{"file_path":$path}}')
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$(pwd)" bash scripts/hooks/post-write-memory-validate.sh <<< "$INPUT")
[ -z "$OUTPUT" ] && echo "PASS: hook silent for foundation.md" || echo "FAIL: got output"
rm -rf "$TMP"
```

Expected: `PASS: hook silent for foundation.md`

### Scenario C: CLAUDE.md sentinel present, boot layer only

```bash
head -1 CLAUDE.md    # → <!-- sdd-init: generated -->
grep -c "sdd-brainstorm ──" CLAUDE.md   # → 0
grep "foundation.md" CLAUDE.md           # → match
```

### Scenario D: Contributing.md contains moved content

```bash
grep "What Is SDD" docs/contributing.md     # → match
grep "| \`sdd-workflow\`" docs/contributing.md  # → match
```
