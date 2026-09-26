# Research: Tiered Memory Architecture (Feature 014)

**Feature:** 014 — Tiered Memory Architecture
**Created:** 2026-06-24
**Spec:** `docs/specs/014-tiered-memory-architecture/spec.md`

---

## Summary of Findings

- The `constitution.md` → `foundation.md` rename requires exactly **one line change** in `scripts/hooks/session-start.sh`; `hooks/hooks.json` does not reference the filename and needs no change.
- The PostToolUse:Write hook (`post-write-memory-validate.sh`) has **no whitelist today** — it fires on every `memory/*.md` write. Adding a three-pattern `case` block is the minimal surgical fix.
- `sdd-init/reference.md` has **seven touch points** for the rename and boot-layer CLAUDE.md changes; none require logic rewrites — all are text + path substitutions.
- A `skills/sdd-init/templates/` directory **does not exist yet** — it must be created alongside the new `claude-md.md` template file.
- The test suite has **three tests that need updating**: session-start (fixture + assertion), post-write-memory-validate (three new whitelist cases), and subagent-start (must-not assertion string).

---

## Q1: SessionStart Hook — Mechanism and Change Surface

**Context:** AC-1.5 and AC-3.2 require the SessionStart hook to reference `foundation.md`. The spec says "no new hook type is introduced."

**Findings:**

The SessionStart hook is a shell script registered in `hooks/hooks.json`:

```json
"SessionStart": [{ "hooks": [{ "type": "command",
  "command": "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/session-start.sh" }] }]
```

The script (`scripts/hooks/session-start.sh`) loads files via `if [ -f ... ]` checks and appends them to a context string returned as JSON. The constitution reference is one `if`-block:

```bash
if [ -f "${CWD}/memory/constitution.md" ]; then
  append_section "memory/constitution.md" "$(cat "${CWD}/memory/constitution.md")"
fi
```

**Change surface:** One line in `session-start.sh`. The label string passed to `append_section` should also update (`"memory/constitution.md"` → `"memory/foundation.md"`) so the injected context header is accurate.

`hooks/hooks.json` has no path reference to the file — no change needed there.

**Impact on tests:** `tests/hooks/test_session_start.sh` creates a `memory/constitution.md` fixture and asserts `"Constitution content"`. Both the fixture path and the assertion string must update to `foundation.md` / `"Foundation content"`.

**Recommendation:** Single-file change — `scripts/hooks/session-start.sh`. Update fixture + assertion in the test.

---

## Q2: PostToolUse:Write Hook — Whitelist Implementation

**Context:** FR-6 and AC-3.4 require `foundation.md`, `MEMORY.md`, and `steering/*.md` to be exempt from frontmatter validation.

**Findings:**

The hook (`scripts/hooks/post-write-memory-validate.sh`) currently has a single path filter that passes only `*/memory/*.md` files and exits for everything else. After that filter, it goes directly into frontmatter validation — no exemption list exists.

Current filter:
```bash
case "$FILE_PATH" in
  */memory/*.md) ;;
  *) exit 0 ;;
esac
```

**Change surface:** Insert a second `case` block immediately after the current filter, before the `ISSUES=""` line:

```bash
case "$FILE_PATH" in
  */memory/foundation.md|*/memory/MEMORY.md|*/memory/steering/*.md) exit 0 ;;
esac
```

The `steering/*.md` glob in a `case` statement uses shell glob matching, which works correctly in bash — the `*` in `*/memory/steering/*.md` matches any filename in that directory.

**Impact on tests:** `tests/hooks/test_post_write_memory_validate.sh` needs three new test cases:
1. Write to `memory/foundation.md` → assert empty output (silent)
2. Write to `memory/MEMORY.md` → assert empty output (silent)
3. Write to `memory/steering/tech-stack.md` → assert empty output (silent)

The existing four test cases (AC-4.1, AC-4.2, AC-4.3, FR-6 must-not) are unaffected.

**Recommendation:** Two-line insertion in `post-write-memory-validate.sh` + three new test cases.

---

## Q3: sdd-init/reference.md — Touch Points

**Context:** sdd-init must generate `foundation.md` instead of `constitution.md`, use the new sentinel-based CLAUDE.md detection, and reference the template file.

**Findings — Seven Touch Points:**

| Location | Current text / behavior | Required change |
|----------|------------------------|-----------------|
| HARD-GATE | "until the constitution is approved" | → "until the foundation file is approved" |
| Step 1.5 heading | "Constitution Existence Check" | → "Foundation Existence Check" |
| Step 1.5 logic | Checks `constitution.md`; two states (exists with `## Article I`, exists without) | Expand to 4 states: (1) `foundation.md` exists → warn+exit; (2) `constitution.md` with `## Article I` → warn+exit; (3) `constitution.md` without `## Article I` → warn about migration, exit; (4) neither → proceed |
| Step 3 title + path | "Write memory/constitution.md" | → "Write memory/foundation.md" |
| Step 3 file schema | `# [Project Name] Constitution` | → `# [Project Name] Foundation` |
| Step 5.1 | Confirms "memory/constitution.md" | → "memory/foundation.md" |
| Step 5.4 detection order | Uses `## Project Foundation` / `## SDD Workflow` markers | Replace with: (1) CLAUDE.md absent → write from `skills/sdd-init/templates/claude-md.md`; (2) sentinel present → skip; (3) sentinel absent → append `## Project Foundation` block (backward compat for existing projects); also update block content: `constitution.md` → `foundation.md` |
| Step 5.6 git add | `git add memory/constitution.md ...` | → `git add memory/foundation.md ...` |
| Step 6 handoff | References `memory/constitution.md` | → `memory/foundation.md` |

**New template file needed:**
- Path: `skills/sdd-init/templates/claude-md.md`
- Directory `skills/sdd-init/templates/` does not exist — must be created.
- The Step 5.4 instruction must reference this template path explicitly.

**Recommendation:** All seven touch points are text/path substitutions — no logic rewrites. The one structural change is Step 1.5 (add two new exit states for `foundation.md` and the migration case).

---

## Q4: This Repo's CLAUDE.md — Content Partition

**Context:** AC-3.3 and AC-3.5 require CLAUDE.md to be trimmed to the boot layer and the removed content to appear in `docs/contributing.md`.

**Findings — Current CLAUDE.md sections:**

| Section | Destination |
|---------|------------|
| Title + intro paragraph ("A set of Claude skills...") | `docs/contributing.md` |
| "Project Context" table | Keep in CLAUDE.md — update `constitution.md` ref → `foundation.md` |
| "What Is SDD?" | `docs/contributing.md` |
| "Skills" table | `docs/contributing.md` |
| "Workflow" diagram | `docs/contributing.md` |
| "The Four Hard Gates" | Keep in CLAUDE.md (boot layer) |
| "Bundled Skills" table | `docs/contributing.md` |
| "Directory Structure" | `docs/contributing.md` |
| "Quick Start" | `docs/contributing.md` |
| "Project Foundation" block | Keep in CLAUDE.md — update `constitution.md` ref → `foundation.md`; rename section → "Memory" |

**New CLAUDE.md structure (post-migration):**

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

**Recommendation:** Keep the Project Context table (it is operational, not contributor docs) and hard gates. Move everything else to `docs/contributing.md`. Add contributor pointer at the end.

---

## Q5: Test Suite — Full Change Surface

**Context:** Tests must reflect the rename and whitelist changes without breaking existing coverage.

**Findings:**

| Test file | Required change |
|-----------|----------------|
| `tests/hooks/test_session_start.sh` | Fixture: `memory/constitution.md` → `memory/foundation.md`; assertion: `"Constitution content"` → `"Foundation content"` |
| `tests/hooks/test_post_write_memory_validate.sh` | Add 3 new whitelist cases: foundation.md silent, MEMORY.md silent, steering/tech-stack.md silent |
| `tests/hooks/test_subagent_start.sh` | Must-not assertion: `grep -qi "constitution"` → `grep -qi "foundation"` (the check verifies memory content is NOT injected into subagents; "constitution" string won't appear after rename) |

All other test files (`test_hooks_json.sh`, `test_lib.sh`, `test_pre_write_plan_gate.sh`, `test_pre_write_tasks_gate.sh`, `test_stop.sh`) have no constitution/foundation references — no changes needed.

---

## Q6: memory/project_constitution_format.md — Stale Memory Entry

**Context:** This Tier 2 memory file describes the current constitution format and a known hook false-positive. After this feature, the false-positive is fixed by the whitelist (FR-6) and the filename changes.

**Findings:**

The file currently says:
> `memory/constitution.md` now uses the Mission Charter format... The PostToolUse:Write hook validates all files written to `memory/` as memory entries and requires YAML frontmatter. The constitution is not a memory entry; it is a project foundation file.

After this feature:
- The filename is `foundation.md` (not `constitution.md`)
- The hook false-positive is fixed by the whitelist — the "How to apply: ignore the warning" instruction becomes obsolete

**Recommendation:** Update this memory file after migration: change filename reference, update description to note the whitelist now handles it, remove the "ignore the warning" guidance.

---

## Resolved Clarifications

No `[NEEDS CLARIFICATION]` items remained in the spec at research time — all were resolved during brainstorm/specify.

---

## Remaining Open Questions

None — all implementation paths are clear from the code investigation.

---

## Constraints Discovered

1. **Backward compatibility for existing CLAUDE.md files:** sdd-init Step 5.4 currently uses `## Project Foundation` as its "already initialized" marker. The new sentinel (`<!-- sdd-init: generated -->`) must be the primary check, but the `## Project Foundation` marker must remain a valid skip signal for projects initialized before this feature — otherwise re-running `sdd-init` on existing projects would overwrite their CLAUDE.md.

2. **Shell glob in `case` statement:** The pattern `*/memory/steering/*.md` works in bash `case` statements but relies on the file path containing a literal `/` — verified safe given `FILE_PATH` is always an absolute path from the Claude Code `Write` tool input.

3. **Session-start hook label string:** The `append_section` label `"memory/constitution.md"` appears in the context header injected at session start (visible in the `=== memory/constitution.md ===` tag in session context). This label must also change to `"memory/foundation.md"` for the Active spec path displayed in system-reminder to remain accurate.

4. **Steering file glob in whitelist must use `*/memory/steering/` prefix:** A pattern of `*/steering/*.md` would be too broad if any project has a `steering/` directory elsewhere. The full prefix `*/memory/steering/*.md` is required.
