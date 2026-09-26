# Implementation Plan: Memory Relocation to `.claude/`

> **For agentic workers:** Use sdd-tasks to generate an executable task list from this plan.

**Spec:** docs/specs/017-memory-relocation-claude-dir/spec.md
**Created:** 2026-07-03

---

## Goal

Migrate all Claude runtime files — `memory/` and root `CLAUDE.md` — into `.claude/`, updating the two hook scripts, eight skill files, and the `sdd-init` skill so every reference to the old path is replaced with `.claude/memory/`.

## Architecture

The migration is a path rename across four layers: the filesystem (move files), the hook scripts (bash path variables), the skill prose (markdown text Claude reads literally), and the sdd-init code generator (templates that produce new-project scaffolding). No new logic is introduced — every change is a string replacement from `memory/` to `.claude/memory/` or from `CLAUDE.md` to `.claude/CLAUDE.md`. Tests are updated first so they fail against the old hooks, then the hooks are updated to make them pass.

## Tech Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| File migration | bash `mv` | FR-1: move files between directories |
| Hook path updates | bash string replacement | FR-3: hooks use `${CWD}/memory/` variables |
| Skill prose updates | Edit tool (find-and-replace) | FR-4: markdown text referenced by Claude |
| Test updates | bash test fixtures | Test strategy: real filesystem fixtures, no mocks |

## File Structure

**Moved (new location):**
- `.claude/CLAUDE.md` — project instructions (was `CLAUDE.md` at root)
- `.claude/memory/foundation.md` — project identity, loaded every session
- `.claude/memory/MEMORY.md` — memory index
- `.claude/memory/feedback_follow_sdd_workflow.md` — feedback memory
- `.claude/memory/feedback_release_process.md` — feedback memory
- `.claude/memory/project_constitution_format.md` — project memory
- `.claude/memory/steering/conventions.md` — steering context
- `.claude/memory/steering/tech-stack.md` — steering context
- `.claude/memory/steering/test-strategy.md` — steering context
- `.claude/memory/steering/team-practices.md` — steering context

**Modified (hook scripts — FR-3):**
- `scripts/hooks/session-start.sh` — 4 path occurrences updated
- `scripts/hooks/post-write-memory-validate.sh` — 8 path occurrences updated
- `scripts/hooks/stop.sh` — 1 user-facing message updated

**Modified (tests — Phase 0):**
- `tests/hooks/test_session_start.sh` — fixture directories and file writes updated
- `tests/hooks/test_post_write_memory_validate.sh` — all fixture paths updated
- `tests/hooks/fixtures/post_write_memory_input.json` — placeholder path updated

**Modified (skill prose — FR-4):**
- `skills/sdd-specify/reference.md`
- `skills/sdd-plan/reference.md`
- `skills/sdd-review/reference.md`
- `skills/sdd-research/reference.md`
- `skills/sdd-execute/reference.md`
- `skills/sdd-init/SKILL.md`
- `skills/sdd-init/reference.md`
- `skills/sdd-init/templates/claude-md.md`

**Modified (memory file content — post-migration content update):**
- `.claude/memory/foundation.md` — update `memory/steering/` prose reference
- `.claude/memory/MEMORY.md` — update index entry that mentions `memory/foundation.md`
- `.claude/memory/project_constitution_format.md` — update all `memory/` prose references
- `.claude/memory/steering/conventions.md` — update directory structure table

## Complexity Tracking

All Pre-Implementation Gates passed. This feature adds no new components, no new abstractions, and no new dependencies. It is a pure path rename across filesystem, scripts, and text.

---

## Phase 0: Write Failing Tests

**Implements:** Test coverage for FR-3 | **Satisfies:** AC-2.1, AC-2.2, AC-3.1, AC-3.2, AC-3.3

Update test fixtures to use `.claude/memory/` paths. These tests will FAIL until Phase 2 updates the hook scripts.

### 0.1 Update test_session_start.sh

- [ ] Edit `tests/hooks/test_session_start.sh` — change fixture setup from `memory/` to `.claude/memory/`:

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCRIPT="$PLUGIN_ROOT/scripts/hooks/session-start.sh"

echo "--- test_session_start.sh ---"

TMP=$(mktemp -d)
mkdir -p "$TMP/docs/specs/011-plugin-hooks"
mkdir -p "$TMP/.claude/memory"
echo "# Foundation content" > "$TMP/.claude/memory/foundation.md"
echo "- [Memory](test.md)" > "$TMP/.claude/memory/MEMORY.md"
cat > "$TMP/docs/specs/011-plugin-hooks/spec.md" <<'EOF'
# Feature 011: Plugin Hooks
**Status:** Approved
## Problem Statement
Test spec content line 3
EOF
cat > "$TMP/docs/specs/011-plugin-hooks/tasks.md" <<'EOF'
- [x] done task
- [ ] open task 1
- [ ] open task 2
EOF

INPUT=$(jq -n --arg cwd "$TMP" \
  '{"hook_event_name":"SessionStart","session_id":"t1","cwd":$cwd}')

# AC-2.1: foundation.md and MEMORY.md injected from .claude/memory/
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" CWD="$TMP" bash "$SCRIPT" <<< "$INPUT")
assert_contains "$OUTPUT" "Foundation content" "AC-2.1: foundation.md injected from .claude/memory/"
assert_contains "$OUTPUT" "Memory" "AC-2.1: MEMORY.md injected from .claude/memory/"

# AC-1.2: active spec summary injected
OUTPUT=$(cd "$TMP" && git() { echo "011-plugin-hooks"; }; export -f git; \
         CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" CWD="$TMP" bash "$SCRIPT" <<< "$INPUT")
assert_contains "$OUTPUT" "Feature 011" "AC-1.2: spec.md first 50 lines injected"

# AC-1.3: unchecked tasks injected, checked excluded
assert_contains "$OUTPUT" "open task 1" "AC-1.3: unchecked task 1 included"
assert_contains "$OUTPUT" "open task 2" "AC-1.3: unchecked task 2 included"
if echo "$OUTPUT" | grep -q "done task"; then
  FAIL=$((FAIL + 1)); echo "  FAIL: AC-1.3: checked task must not appear"
else
  PASS=$((PASS + 1)); echo "  PASS: AC-1.3: checked task excluded"
fi

# AC-2.2: silent outside SDD project
TMP_NOSDD=$(mktemp -d)
INPUT_NOSDD=$(jq -n --arg cwd "$TMP_NOSDD" \
  '{"hook_event_name":"SessionStart","session_id":"t1","cwd":$cwd}')
OUTPUT_NOSDD=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT_NOSDD")
assert_empty "$OUTPUT_NOSDD" "AC-2.2: no output outside SDD project"

rm -rf "$TMP" "$TMP_NOSDD"
summarize
```

- [ ] Run: `bash tests/hooks/test_session_start.sh` — expect: FAIL on "foundation.md injected" (hook still reads old `memory/` path)

### 0.2 Update test_post_write_memory_validate.sh

- [ ] Edit `tests/hooks/test_post_write_memory_validate.sh` — change all fixture paths from `$TMP/memory/` to `$TMP/.claude/memory/`:

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCRIPT="$PLUGIN_ROOT/scripts/hooks/post-write-memory-validate.sh"

echo "--- test_post_write_memory_validate.sh ---"

TMP=$(mktemp -d)
mkdir -p "$TMP/docs/specs" "$TMP/.claude/memory"

make_input() {
  jq -n --arg cwd "$1" --arg path "$2" \
    '{"hook_event_name":"PostToolUse","session_id":"t1","cwd":$cwd,
      "tool_name":"Write","tool_input":{"file_path":$path}}'
}

# AC-3.1: validate when frontmatter missing
echo "# No frontmatter" > "$TMP/.claude/memory/bad.md"
INPUT=$(make_input "$TMP" "$TMP/.claude/memory/bad.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_contains "$OUTPUT" "frontmatter" "AC-3.1: mentions missing frontmatter"

# AC-3.1: validate when required fields missing
cat > "$TMP/.claude/memory/partial.md" <<'EOF'
---
name: partial-test
---
# Body
EOF
INPUT=$(make_input "$TMP" "$TMP/.claude/memory/partial.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_contains "$OUTPUT" "description" "AC-3.1: mentions missing description"
assert_contains "$OUTPUT" "type" "AC-3.1: mentions missing metadata.type"

# AC-3.1: validate when slug not in MEMORY.md
cat > "$TMP/.claude/memory/valid.md" <<'EOF'
---
name: valid-memory
description: A test memory
metadata:
  type: feedback
---
# Valid memory
EOF
echo "# Memory Index" > "$TMP/.claude/memory/MEMORY.md"
INPUT=$(make_input "$TMP" "$TMP/.claude/memory/valid.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_contains "$OUTPUT" "MEMORY.md" "AC-3.1: mentions MEMORY.md entry needed"

# AC-3.1 silent when valid and indexed
echo "- [valid-memory](valid.md) — test" >> "$TMP/.claude/memory/MEMORY.md"
INPUT=$(make_input "$TMP" "$TMP/.claude/memory/valid.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-3.1: silent when valid and indexed"

# AC-3.2: silent for writes outside .claude/memory/
INPUT=$(make_input "$TMP" "$TMP/docs/specs/001-test/spec.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-3.2: silent for non-.claude/memory/ writes"

# AC-3.3 whitelist: foundation.md silenced
echo "# Foundation" > "$TMP/.claude/memory/foundation.md"
INPUT=$(make_input "$TMP" "$TMP/.claude/memory/foundation.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-3.3: silent for foundation.md"

# AC-3.3 whitelist: MEMORY.md silenced
echo "# Memory" > "$TMP/.claude/memory/MEMORY.md"
INPUT=$(make_input "$TMP" "$TMP/.claude/memory/MEMORY.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-3.3: silent for MEMORY.md"

# AC-3.3 whitelist: steering file silenced
mkdir -p "$TMP/.claude/memory/steering"
echo "# Tech Stack" > "$TMP/.claude/memory/steering/tech-stack.md"
INPUT=$(make_input "$TMP" "$TMP/.claude/memory/steering/tech-stack.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-3.3: silent for steering file"

rm -rf "$TMP"
summarize
```

- [ ] Run: `bash tests/hooks/test_post_write_memory_validate.sh` — expect: FAIL on AC-3.1 (hook still matches old `*/memory/*.md` pattern)

### 0.3 Update fixture JSON

- [ ] Edit `tests/hooks/fixtures/post_write_memory_input.json`:

```json
{
  "hook_event_name": "PostToolUse",
  "session_id": "test-session-001",
  "cwd": "__CWD_PLACEHOLDER__",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "__CWD_PLACEHOLDER__/.claude/memory/test_memory.md",
    "content": ""
  }
}
```

- [ ] Commit: `test(017-memory-relocation-claude-dir): update hook tests to expect .claude/memory/ paths`

---

## Phase 1: Migrate Files (FR-1, FR-2)

**Implements:** FR-1, FR-2 | **Satisfies:** AC-1.1, AC-1.2, AC-1.3, AC-1.4

Move all memory files into `.claude/memory/` and replace root `CLAUDE.md` with `.claude/CLAUDE.md`.

### 1.1 Move memory files

- [ ] Run:
```bash
mkdir -p .claude/memory/steering
mv memory/foundation.md .claude/memory/foundation.md
mv memory/MEMORY.md .claude/memory/MEMORY.md
mv memory/feedback_follow_sdd_workflow.md .claude/memory/feedback_follow_sdd_workflow.md
mv memory/feedback_release_process.md .claude/memory/feedback_release_process.md
mv memory/project_constitution_format.md .claude/memory/project_constitution_format.md
mv memory/steering/conventions.md .claude/memory/steering/conventions.md
mv memory/steering/tech-stack.md .claude/memory/steering/tech-stack.md
mv memory/steering/test-strategy.md .claude/memory/steering/test-strategy.md
mv memory/steering/team-practices.md .claude/memory/steering/team-practices.md
rmdir memory/steering memory/
```
- [ ] Verify: `ls .claude/memory/` lists all moved files; `ls memory/` returns no such directory

### 1.2 Migrate CLAUDE.md

- [ ] Create `.claude/CLAUDE.md` with content identical to old root `CLAUDE.md` except the Memory section paths:

```markdown
<!-- sdd-init: generated -->
# SDD Superpowers

Before starting work, invoke `sdd-superpowers:sdd-workflow`.

## Memory

Memory lives in `.claude/memory/` — see `.claude/memory/MEMORY.md` for the index.
Project identity is in `.claude/memory/foundation.md`.
Steering files in `.claude/memory/steering/` are loaded by skills when relevant.

## Hard Gates

- NO PLAN without an approved spec
- NO TASKS without a plan
- NO CODE without a prior failing test
- NO COMPLETION CLAIM without fresh verification evidence
```

- [ ] Delete root `CLAUDE.md`: `rm CLAUDE.md`
- [ ] Verify: `ls CLAUDE.md` returns no such file; `cat .claude/CLAUDE.md` shows correct content

### 1.3 Update content in moved memory files

- [ ] Edit `.claude/memory/foundation.md` — update the Operational Context paragraph:

Change: `Steering files in \`memory/steering/\` carry project-specific operational context`
To: `Steering files in \`.claude/memory/steering/\` carry project-specific operational context`

- [ ] Edit `.claude/memory/MEMORY.md` — update the index entry that references `memory/foundation.md`:

Change: `memory/foundation.md is the Tier 0 project identity file`
To: `.claude/memory/foundation.md is the Tier 0 project identity file`

- [ ] Edit `.claude/memory/project_constitution_format.md` — update all `memory/` prose references to `.claude/memory/`:
  - Description field: `memory/foundation.md` → `.claude/memory/foundation.md`
  - Body references to `memory/foundation.md` → `.claude/memory/foundation.md`
  - References to "written to `memory/`" → "written to `.claude/memory/`"
  - References to `memory/MEMORY.md` → `.claude/memory/MEMORY.md`
  - References to `memory/foundation.md`, `memory/steering/*.md` exemptions → `.claude/memory/` equivalents

- [ ] Edit `.claude/memory/steering/conventions.md` — update the Directory Structure section:

```
## Directory Structure
```
skills/              # One subdirectory per skill; SKILL.md + reference.md required
scripts/hooks/       # Hook shell scripts + lib/ for shared utilities
tests/hooks/         # One test file per hook; helpers.sh shared
.claude/memory/      # Tier 2 memory entries + MEMORY.md index
.claude/memory/steering/  # Tier 1 operational context files
docs/specs/          # Feature specs organized by NNN-slug
```
```

- [ ] Commit: `feat(017-memory-relocation-claude-dir): move memory/ to .claude/memory/ and migrate CLAUDE.md`

---

## Phase 2: Update Hook Scripts (FR-3)

**Implements:** FR-3 | **Satisfies:** AC-2.1, AC-2.2, AC-3.1, AC-3.2, AC-3.3

Update the three hook scripts to read from and match `.claude/memory/` paths. After this phase, all tests written in Phase 0 turn GREEN.

### 2.1 Update session-start.sh

- [ ] Edit `scripts/hooks/session-start.sh` — replace the two memory file blocks:

```bash
if [ -f "${CWD}/.claude/memory/foundation.md" ]; then
  append_section ".claude/memory/foundation.md" "$(cat "${CWD}/.claude/memory/foundation.md")"
fi

if [ -f "${CWD}/.claude/memory/MEMORY.md" ]; then
  append_section ".claude/memory/MEMORY.md" "$(cat "${CWD}/.claude/memory/MEMORY.md")"
fi
```

- [ ] Run: `bash tests/hooks/test_session_start.sh` — expect: all assertions PASS

### 2.2 Update post-write-memory-validate.sh

- [ ] Edit `scripts/hooks/post-write-memory-validate.sh` — update path pattern gate:

```bash
case "$FILE_PATH" in
  */.claude/memory/*.md) ;;
  *) exit 0 ;;
esac

case "$FILE_PATH" in
  */.claude/memory/foundation.md|*/.claude/memory/MEMORY.md|*/.claude/memory/steering/*.md) exit 0 ;;
esac
```

- [ ] In the same file, update the FNAME-based error messages:

```bash
  echo "$FRONTMATTER" | grep -q '^name:' || \
    add_issue ".claude/memory/${FNAME} is missing the 'name' field in frontmatter"
  echo "$FRONTMATTER" | grep -q '^description:' || \
    add_issue ".claude/memory/${FNAME} is missing the 'description' field in frontmatter"
  echo "$FRONTMATTER" | grep -q 'type:' || \
    add_issue ".claude/memory/${FNAME} is missing the 'metadata.type' field in frontmatter (under metadata:)"
```

- [ ] In the same file, update MEMORY.md path checks:

```bash
    if [ ! -f "${CWD}/.claude/memory/MEMORY.md" ]; then
      add_issue ".claude/memory/MEMORY.md does not exist. Create it and add: '- [Title]($(basename "$FILE_PATH")) — description'"
    elif ! grep -q "$NAME_SLUG" "${CWD}/.claude/memory/MEMORY.md"; then
      add_issue "Name slug '${NAME_SLUG}' not found in .claude/memory/MEMORY.md. Add: '- [Title]($(basename "$FILE_PATH")) — one-line description'"
    fi
```

- [ ] Run: `bash tests/hooks/test_post_write_memory_validate.sh` — expect: all assertions PASS

### 2.3 Update stop.sh user message

- [ ] Edit `scripts/hooks/stop.sh` — update the memory reference in the session-end checklist message:

Change: `"...feedback to memory/ files now..."`
To: `"...feedback to .claude/memory/ files now..."`

- [ ] Run full test suite: `bash tests/hooks/run_all.sh` — expect: all suites PASS
- [ ] Commit: `feat(017-memory-relocation-claude-dir): update hook scripts to use .claude/memory/ paths`

---

## Phase 3: Update Skill Prose (FR-4)

**Implements:** FR-4 | **Satisfies:** AC-4.1, AC-4.2, AC-4.3

Replace every `memory/` occurrence across 8 skill files. Each file uses the Edit tool with `replace_all: true` for the path-string changes. After this phase, `grep -r "memory/" skills/` returns zero results.

### 3.1 Update sdd-specify/reference.md

- [ ] Edit `skills/sdd-specify/reference.md`:
  - Replace `memory/steering/` → `.claude/memory/steering/` (2 occurrences — Step 0 steering scan instruction)
- [ ] Verify: `grep "memory/" skills/sdd-specify/reference.md` returns empty

### 3.2 Update sdd-plan/reference.md

- [ ] Edit `skills/sdd-plan/reference.md`:
  - Replace `memory/steering/` → `.claude/memory/steering/` (2 occurrences — Step 0 steering scan instruction)
- [ ] Verify: `grep "memory/" skills/sdd-plan/reference.md` returns empty

### 3.3 Update sdd-review/reference.md

- [ ] Edit `skills/sdd-review/reference.md`:
  - Replace `memory/steering/` → `.claude/memory/steering/` (2 occurrences)
- [ ] Verify: `grep "memory/" skills/sdd-review/reference.md` returns empty

### 3.4 Update sdd-research/reference.md

- [ ] Edit `skills/sdd-research/reference.md`:
  - Replace `memory/steering/` → `.claude/memory/steering/` (2 occurrences)
- [ ] Verify: `grep "memory/" skills/sdd-research/reference.md` returns empty

### 3.5 Update sdd-execute/reference.md

- [ ] Edit `skills/sdd-execute/reference.md`:
  - Replace all `memory/` occurrences → `.claude/memory/`
- [ ] Verify: `grep "memory/" skills/sdd-execute/reference.md` returns empty

### 3.6 Commit skill prose phase A

- [ ] Commit: `docs(017-memory-relocation-claude-dir): update skill prose paths in sdd-specify, sdd-plan, sdd-review, sdd-research, sdd-execute`

### 3.7 Update sdd-init/SKILL.md

- [ ] Edit `skills/sdd-init/SKILL.md`:
  - Replace all `memory/` occurrences → `.claude/memory/` in the artifact table and step descriptions
- [ ] Verify: `grep "memory/" skills/sdd-init/SKILL.md` returns empty

### 3.8 Update sdd-init/templates/claude-md.md

- [ ] Edit `skills/sdd-init/templates/claude-md.md`:
  - Replace all `memory/` occurrences → `.claude/memory/` (3 occurrences in the Memory section)
- [ ] Verify: `grep "memory/" skills/sdd-init/templates/claude-md.md` returns empty

### 3.9 Verify zero residual skill references

- [ ] Run: `grep -r "memory/" skills/` — expect: zero output
- [ ] Commit: `docs(017-memory-relocation-claude-dir): update sdd-init SKILL.md and claude-md template`

---

## Phase 4: Update sdd-init Reference (FR-5)

**Implements:** FR-5 | **Satisfies:** AC-5.1, AC-5.2, AC-5.3, AC-5.4

Update `sdd-init/reference.md` — the most reference-heavy file with ~30 occurrences — and add the legacy-detection error scenario.

### 4.1 Path replacement in sdd-init/reference.md

- [ ] Edit `skills/sdd-init/reference.md` with `replace_all: true`:
  - Replace `memory/foundation.md` → `.claude/memory/foundation.md`
  - Replace `memory/constitution.md` → `.claude/memory/constitution.md`
  - Replace `memory/steering/` → `.claude/memory/steering/`
  - Replace `memory/MEMORY.md` → `.claude/memory/MEMORY.md`
  - Replace remaining `memory/` → `.claude/memory/`

### 4.2 Update Step 3 write target

- [ ] Verify `skills/sdd-init/reference.md` Step 3 reads:

```
## Step 3: Write .claude/memory/foundation.md

Announce: "Writing `.claude/memory/foundation.md`."

Create `.claude/memory/` directory if it does not exist.

Write `.claude/memory/foundation.md` using the approved draft.
```

### 4.3 Update Step 5 steering file write targets

- [ ] Verify `skills/sdd-init/reference.md` Step 5.1 reads:

```
### Step 5.1 Confirm .claude/memory/foundation.md

Confirm that `.claude/memory/foundation.md` was written in Step 3.
```

- [ ] Verify Step 5.2 steering file section reads:

```
Create `.claude/memory/steering/` if it does not exist.
```

And each steering file path reads `.claude/memory/steering/tech-stack.md`, `.claude/memory/steering/test-strategy.md`, `.claude/memory/steering/conventions.md`, `.claude/memory/steering/team-practices.md`.

### 4.4 Add legacy-detection error scenario

- [ ] Add to the detection logic section in `skills/sdd-init/reference.md` (alongside the existing foundation.md checks):

```
- **If `memory/foundation.md` exists at project root (legacy layout):**
  Announce: "A `memory/foundation.md` was found at the old location. Migrate it to `.claude/memory/foundation.md` before re-invoking sdd-init: `mkdir -p .claude/memory && mv memory/ .claude/memory/`. No files will be written."
  Exit — do not write any files.
```

### 4.5 Update CLAUDE.md output path in sdd-init reference

- [ ] In `skills/sdd-init/reference.md`, find the step that writes `CLAUDE.md` and update the output path to `.claude/CLAUDE.md`. Verify the completion summary reads:

```
> - `.claude/memory/foundation.md` — [Created/Updated] Foundation file: mission and principles loaded every session
```

### 4.6 Verify and commit

- [ ] Run: `grep -r "memory/" skills/sdd-init/` — expect: zero output
- [ ] Run full test suite: `bash tests/hooks/run_all.sh` — expect: all suites PASS
- [ ] Commit: `feat(017-memory-relocation-claude-dir): update sdd-init to generate .claude/ layout`

---

## Phase 5: Integration Verification

**Implements:** All FRs | **Satisfies:** All ACs

### 5.1 File structure verification

- [ ] Run:
```bash
ls .claude/memory/
# expect: foundation.md  MEMORY.md  feedback_follow_sdd_workflow.md  feedback_release_process.md  project_constitution_format.md  steering/
ls .claude/memory/steering/
# expect: conventions.md  tech-stack.md  test-strategy.md  team-practices.md
ls memory/ 2>&1
# expect: ls: memory/: No such file or directory
ls CLAUDE.md 2>&1
# expect: ls: CLAUDE.md: No such file or directory
cat .claude/CLAUDE.md | grep "memory"
# expect: lines showing .claude/memory/ (no bare memory/ references)
```

### 5.2 Hook path verification

- [ ] Run: `bash tests/hooks/run_all.sh` — expect: all suites PASS
- [ ] Run: `grep -r "memory/" scripts/hooks/` — expect: zero output

### 5.3 Skill prose verification

- [ ] Run: `grep -r "memory/" skills/` — expect: zero output

### 5.4 Session-start smoke test

- [ ] Create a temp SDD project fixture with `.claude/memory/foundation.md` and verify the session-start hook emits its content:
```bash
TMP=$(mktemp -d)
mkdir -p "$TMP/docs/specs" "$TMP/.claude/memory"
echo "# Test Foundation" > "$TMP/.claude/memory/foundation.md"
echo "- entry" > "$TMP/.claude/memory/MEMORY.md"
INPUT=$(jq -n --arg cwd "$TMP" '{"hook_event_name":"SessionStart","session_id":"t","cwd":$cwd}')
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$(pwd)" bash scripts/hooks/session-start.sh <<< "$INPUT")
echo "$OUTPUT" | grep -q "Test Foundation" && echo "PASS: foundation injected" || echo "FAIL"
rm -rf "$TMP"
```
- [ ] Expect: `PASS: foundation injected`

### 5.5 Final commit

- [ ] Commit: `feat(017-memory-relocation-claude-dir): complete memory relocation to .claude/`

---

## Quickstart Validation

After migration, run this sequence to confirm everything works:

```bash
# 1. Verify no old paths remain
grep -r "memory/" skills/ && echo "FAIL: skill refs remain" || echo "PASS: skills clean"
grep -r "memory/" scripts/hooks/ && echo "FAIL: hook refs remain" || echo "PASS: hooks clean"
ls memory/ 2>&1 | grep -q "No such" && echo "PASS: memory/ gone" || echo "FAIL: memory/ still exists"
ls CLAUDE.md 2>&1 | grep -q "No such" && echo "PASS: root CLAUDE.md gone" || echo "FAIL: root CLAUDE.md still exists"

# 2. Verify new locations
ls .claude/memory/foundation.md && echo "PASS: foundation at .claude/memory/" || echo "FAIL"
ls .claude/memory/steering/ && echo "PASS: steering dir exists" || echo "FAIL"
ls .claude/CLAUDE.md && echo "PASS: .claude/CLAUDE.md exists" || echo "FAIL"

# 3. Run all hook tests
bash tests/hooks/run_all.sh
```

All checks output PASS and all hook tests pass = migration complete.
