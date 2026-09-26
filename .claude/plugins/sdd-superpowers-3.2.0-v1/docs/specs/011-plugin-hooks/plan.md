# Implementation Plan: Plugin Hooks for SDD Superpowers

> **For agentic workers:** Use sdd-tasks to generate an executable task list from this plan.

**Spec:** docs/specs/011-plugin-hooks/spec.md
**Research:** docs/specs/011-plugin-hooks/research.md
**Created:** 2026-05-30

---

## Goal

Ship `hooks/hooks.json` and seven shell scripts that automate SDD context injection, gate enforcement, memory validation, subagent alignment, and session-end reminders as Claude Code plugin hooks.

## Architecture

Seven `type: "command"` shell scripts, one shared library, and one `hooks/hooks.json` registration file compose the hook system. All scripts source a shared library (`scripts/hooks/lib/detect-active-spec.sh`) that handles SDD project detection (FR-1) and active spec resolution (FR-2); every other script exits 0 silently when outside an SDD project. Scripts receive Claude Code hook event JSON on stdin, output a `hookSpecificOutput` JSON object on stdout, and use only `git`, `jq`, and POSIX shell built-ins. Session write-state is tracked in a per-session temp file keyed by `session_id` to avoid cross-session interference; the file is created by the state-setter hook and deleted by the Stop hook.

Open question resolved: `additionalContext` cap is **8,000 characters** — roughly 2,000 tokens, accommodating a typical constitution + MEMORY.md + spec summary + tasks payload without meaningfully compressing working context.

## Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Hook type | `type: "command"` (shell scripts) | FR-10: deterministic, no external deps, no token cost; research Q1 recommendation |
| Shell | POSIX sh (`/usr/bin/env bash`) | FR-2: only `git`, `ls`, `jq`, POSIX built-ins required |
| JSON processing | `jq` | Already present in any Claude Code environment; only dep beyond shell |
| State persistence | Temp file at `$TMPDIR/sdd-state-$SESSION_ID.json` | Per-session isolation; auto-cleaned by OS; no cross-session interference |
| Testing | Bash test scripts with inline assertion helpers | No external framework needed; zero install friction |

## File Structure

```
hooks/
  hooks.json                              # FR-10: hook registration (all events + matchers)
scripts/
  hooks/
    lib/
      detect-active-spec.sh               # FR-1 + FR-2: shared — SDD detection, active spec
    session-start.sh                      # FR-3: SessionStart context injection
    pre-write-plan-gate.sh                # FR-4: PreToolUse Write — plan.md gate
    pre-write-tasks-gate.sh               # FR-5: PreToolUse Write — tasks.md gate
    post-write-memory-validate.sh         # FR-6: PostToolUse Write — memory validation
    subagent-start.sh                     # FR-7: SubagentStart context injection
    pre-write-edit-state.sh               # FR-8: PreToolUse Write|Edit — state setter
    stop.sh                               # FR-9: Stop — conditional reminder
tests/
  hooks/
    helpers.sh                            # Shared assertion functions
    fixtures/
      session_start_input.json            # Mock SessionStart hook event
      pre_write_plan_input.json           # Mock PreToolUse Write to plan.md
      pre_write_tasks_input.json          # Mock PreToolUse Write to tasks.md
      post_write_memory_input.json        # Mock PostToolUse Write to memory/*.md
      subagent_start_input.json           # Mock SubagentStart hook event
      pre_write_edit_input.json           # Mock PreToolUse Edit (state setter)
      stop_input.json                     # Mock Stop hook event
    test_lib.sh                           # Tests for detect-active-spec.sh
    test_session_start.sh                 # Tests for session-start.sh (AC-1.x)
    test_pre_write_plan_gate.sh           # Tests for pre-write-plan-gate.sh (AC-2.x)
    test_pre_write_tasks_gate.sh          # Tests for pre-write-tasks-gate.sh (AC-3.x)
    test_post_write_memory_validate.sh    # Tests for post-write-memory-validate.sh (AC-4.x)
    test_subagent_start.sh                # Tests for subagent-start.sh (AC-5.x)
    test_stop.sh                          # Tests for stop.sh (AC-6.x)
    test_hooks_json.sh                    # Tests for hooks/hooks.json structure
    run_all.sh                            # Run all test files; aggregate results
```

## Complexity Tracking

- **Simplicity Gate:** Feature requires 8 scripts (7 hooks + 1 lib) and 8 test files. Exceeds the ≤3 components guideline. Justified: each script maps to exactly one FR with one responsibility; complexity is mandated by spec scope, not over-engineering.
- **Anti-Abstraction Gate:** ✓ No wrappers — hook scripts call Claude Code's hook protocol directly.
- **Integration-First Gate:** ✓ Hook input/output contracts defined in Phase 0 before any implementation.

---

## Phase 0: Test Infrastructure and Hook Contracts

**Implements:** FR-10 (contracts) | **Satisfies:** precondition for all AC-N.M

### 0.1 Create test helpers

- [ ] Write `tests/hooks/helpers.sh`:

```bash
#!/usr/bin/env bash
# Shared assertion helpers for hook tests. Source this file.

PASS=0
FAIL=0

assert_exit_zero() {
  local code="$1" label="$2"
  if [ "$code" -eq 0 ]; then
    PASS=$((PASS + 1)); echo "  PASS: $label"
  else
    FAIL=$((FAIL + 1)); echo "  FAIL: $label — expected exit 0, got $code"
  fi
}

assert_exit_nonzero() {
  local code="$1" label="$2"
  if [ "$code" -ne 0 ]; then
    PASS=$((PASS + 1)); echo "  PASS: $label"
  else
    FAIL=$((FAIL + 1)); echo "  FAIL: $label — expected non-zero exit, got 0"
  fi
}

assert_empty() {
  local val="$1" label="$2"
  if [ -z "$val" ]; then
    PASS=$((PASS + 1)); echo "  PASS: $label"
  else
    FAIL=$((FAIL + 1)); echo "  FAIL: $label — expected empty, got: $val"
  fi
}

assert_contains() {
  local haystack="$1" needle="$2" label="$3"
  if echo "$haystack" | grep -q "$needle"; then
    PASS=$((PASS + 1)); echo "  PASS: $label"
  else
    FAIL=$((FAIL + 1)); echo "  FAIL: $label — '$needle' not found in: $haystack"
  fi
}

assert_json_field() {
  local json="$1" field="$2" expected="$3" label="$4"
  local actual
  actual=$(echo "$json" | jq -r "$field" 2>/dev/null)
  if [ "$actual" = "$expected" ]; then
    PASS=$((PASS + 1)); echo "  PASS: $label"
  else
    FAIL=$((FAIL + 1)); echo "  FAIL: $label — expected '$expected', got '$actual'"
  fi
}

summarize() {
  echo ""
  echo "Results: $PASS passed, $FAIL failed"
  [ "$FAIL" -eq 0 ]
}
```

- [ ] Write `tests/hooks/run_all.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TOTAL_PASS=0; TOTAL_FAIL=0

for test_file in "$SCRIPT_DIR"/test_*.sh; do
  echo "=== $(basename "$test_file") ==="
  bash "$test_file"
  EXIT=$?
  [ $EXIT -eq 0 ] && TOTAL_PASS=$((TOTAL_PASS + 1)) || TOTAL_FAIL=$((TOTAL_FAIL + 1))
  echo ""
done

echo "=== TOTAL: $TOTAL_PASS files passed, $TOTAL_FAIL files failed ==="
[ "$TOTAL_FAIL" -eq 0 ]
```

- [ ] Run: `bash tests/hooks/run_all.sh` — expect: no test files found yet, exit 0

### 0.2 Write hook contract fixtures

- [ ] Create `tests/hooks/fixtures/session_start_input.json`:

```json
{
  "hook_event_name": "SessionStart",
  "session_id": "test-session-001",
  "cwd": "__CWD_PLACEHOLDER__"
}
```

- [ ] Create `tests/hooks/fixtures/pre_write_plan_input.json`:

```json
{
  "hook_event_name": "PreToolUse",
  "session_id": "test-session-001",
  "cwd": "__CWD_PLACEHOLDER__",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "__CWD_PLACEHOLDER__/docs/specs/001-test/plan.md",
    "content": "# Plan"
  }
}
```

- [ ] Create `tests/hooks/fixtures/pre_write_tasks_input.json`:

```json
{
  "hook_event_name": "PreToolUse",
  "session_id": "test-session-001",
  "cwd": "__CWD_PLACEHOLDER__",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "__CWD_PLACEHOLDER__/docs/specs/001-test/tasks.md",
    "content": "# Tasks"
  }
}
```

- [ ] Create `tests/hooks/fixtures/post_write_memory_input.json`:

```json
{
  "hook_event_name": "PostToolUse",
  "session_id": "test-session-001",
  "cwd": "__CWD_PLACEHOLDER__",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "__CWD_PLACEHOLDER__/memory/test_memory.md",
    "content": ""
  }
}
```

- [ ] Create `tests/hooks/fixtures/subagent_start_input.json`:

```json
{
  "hook_event_name": "SubagentStart",
  "session_id": "test-session-001",
  "cwd": "__CWD_PLACEHOLDER__"
}
```

- [ ] Create `tests/hooks/fixtures/pre_write_edit_input.json`:

```json
{
  "hook_event_name": "PreToolUse",
  "session_id": "test-session-001",
  "cwd": "__CWD_PLACEHOLDER__",
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "__CWD_PLACEHOLDER__/src/example.sh"
  }
}
```

- [ ] Create `tests/hooks/fixtures/stop_input.json`:

```json
{
  "hook_event_name": "Stop",
  "session_id": "test-session-001",
  "cwd": "__CWD_PLACEHOLDER__"
}
```

- [ ] Commit: `test: add hook test infrastructure and contract fixtures`

---

## Phase 1: Shared Library — SDD Detection and Active Spec

**Implements:** FR-1, FR-2 | **Satisfies:** AC-1.4, precondition for all other ACs

### 1.1 Write failing tests for the shared library

- [ ] Write `tests/hooks/test_lib.sh`:

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

LIB="$(cd "$SCRIPT_DIR/../.." && pwd)/scripts/hooks/lib/detect-active-spec.sh"

echo "--- test_lib.sh: detect-active-spec.sh ---"

# Setup: temp SDD project
TMP=$(mktemp -d)
mkdir -p "$TMP/docs/specs/001-test-feature"
mkdir -p "$TMP/docs/specs/002-another-feature"
touch "$TMP/docs/specs/001-test-feature/spec.md"
touch "$TMP/docs/specs/002-another-feature/spec.md"

# Test: detect_sdd_project returns true when docs/specs exists
source "$LIB"
detect_sdd_project "$TMP"
assert_exit_zero $? "detect_sdd_project: returns 0 when docs/specs exists"

# Test: detect_sdd_project returns false when docs/specs missing
TMP_NOSDD=$(mktemp -d)
detect_sdd_project "$TMP_NOSDD"
assert_exit_nonzero $? "detect_sdd_project: returns non-zero when docs/specs missing"

# Test: detect_active_spec with matching branch
RESULT=$(CWD="$TMP" git() { echo "001-test-feature"; }; export -f git; detect_active_spec "$TMP")
assert_contains "$RESULT" "001-test-feature" "detect_active_spec: matches branch name to spec dir"

# Test: detect_active_spec falls back to most recently modified when no branch match
touch "$TMP/docs/specs/002-another-feature/spec.md"
RESULT=$(detect_active_spec "$TMP")
# Result should be one of the spec dirs (fallback — most recent)
assert_contains "$RESULT" "docs/specs" "detect_active_spec: fallback returns a spec dir"

# Test: detect_active_spec returns empty when no spec dirs exist
TMP_EMPTY=$(mktemp -d)
mkdir -p "$TMP_EMPTY/docs/specs"
RESULT=$(detect_active_spec "$TMP_EMPTY")
assert_empty "$RESULT" "detect_active_spec: returns empty when no spec dirs"

# Cleanup
rm -rf "$TMP" "$TMP_NOSDD" "$TMP_EMPTY"

summarize
```

- [ ] Run: `bash tests/hooks/test_lib.sh` — expect: FAIL (lib script does not exist)

### 1.2 Implement `scripts/hooks/lib/detect-active-spec.sh`

- [ ] Create `scripts/hooks/lib/detect-active-spec.sh`:

```bash
#!/usr/bin/env bash
# Shared library: source this file — do not execute directly
# Provides: detect_sdd_project <cwd>, detect_active_spec <cwd>

detect_sdd_project() {
  local cwd="${1:-${CWD:-$PWD}}"
  [ -d "${cwd}/docs/specs" ]
}

detect_active_spec() {
  local cwd="${1:-${CWD:-$PWD}}"
  local specs_dir="${cwd}/docs/specs"

  [ -d "$specs_dir" ] || return 0

  # Primary: match git branch NNN prefix against spec directory names
  local branch
  branch=$(git -C "$cwd" rev-parse --abbrev-ref HEAD 2>/dev/null || true)

  if [ -n "$branch" ]; then
    local spec_num
    spec_num=$(echo "$branch" | grep -oE '^[0-9]+' | head -1)
    if [ -n "$spec_num" ]; then
      local matched
      matched=$(find "$specs_dir" -maxdepth 1 -type d -name "${spec_num}-*" 2>/dev/null | head -1)
      if [ -n "$matched" ]; then
        echo "$matched"
        return 0
      fi
    fi
  fi

  # Fallback: most recently modified spec directory
  local recent
  recent=$(ls -dt "${specs_dir}"/[0-9]*/ 2>/dev/null | head -1)
  echo "${recent%/}"
}
```

- [ ] Run: `bash tests/hooks/test_lib.sh` — expect: PASS
- [ ] Commit: `feat(011-plugin-hooks): add shared hook library — SDD detection and active spec`

---

## Phase 2: Session Context Injection

**Implements:** FR-1, FR-2, FR-3 | **Satisfies:** AC-1.1, AC-1.2, AC-1.3, AC-1.4

### 2.1 Write failing tests

- [ ] Write `tests/hooks/test_session_start.sh`:

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCRIPT="$PLUGIN_ROOT/scripts/hooks/session-start.sh"

echo "--- test_session_start.sh ---"

# Setup: SDD project with memory and spec
TMP=$(mktemp -d)
mkdir -p "$TMP/docs/specs/011-plugin-hooks"
mkdir -p "$TMP/memory"
echo "# Constitution content" > "$TMP/memory/constitution.md"
echo "- [Memory](test.md)" > "$TMP/memory/MEMORY.md"
cat > "$TMP/docs/specs/011-plugin-hooks/spec.md" <<'EOF'
# Feature 011: Plugin Hooks
**Status:** Approved
## Problem Statement
Test spec content line 3
EOF
printf '- [x] done task\n- [ ] open task 1\n- [ ] open task 2\n' > "$TMP/docs/specs/011-plugin-hooks/tasks.md"

# Fake git to return matching branch
git_fake() { echo "011-plugin-hooks"; }

# AC-1.1: constitution.md and MEMORY.md injected
INPUT=$(jq -n --arg cwd "$TMP" '{"hook_event_name":"SessionStart","session_id":"t1","cwd":$cwd}')
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" CWD="$TMP" bash "$SCRIPT" <<< "$INPUT")
assert_contains "$OUTPUT" "Constitution content" "AC-1.1: constitution.md content injected"
assert_contains "$OUTPUT" "Memory" "AC-1.1: MEMORY.md content injected"

# AC-1.2: active spec summary injected (when branch matches — using git override)
OUTPUT=$(cd "$TMP" && git() { echo "011-plugin-hooks"; }; export -f git; \
         CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" CWD="$TMP" bash "$SCRIPT" <<< "$INPUT")
assert_contains "$OUTPUT" "Feature 011" "AC-1.2: spec.md first 50 lines injected"

# AC-1.3: only unchecked tasks injected
assert_contains "$OUTPUT" "open task 1" "AC-1.3: unchecked task included"
assert_contains "$OUTPUT" "open task 2" "AC-1.3: unchecked task 2 included"
# Checked tasks must NOT appear
if echo "$OUTPUT" | grep -q "done task"; then
  FAIL=$((FAIL + 1)); echo "  FAIL: AC-1.3: checked task must not be included"
else
  PASS=$((PASS + 1)); echo "  PASS: AC-1.3: checked task excluded"
fi

# AC-1.4: silent outside SDD project
TMP_NOSDD=$(mktemp -d)
INPUT_NOSDD=$(jq -n --arg cwd "$TMP_NOSDD" '{"hook_event_name":"SessionStart","session_id":"t1","cwd":$cwd}')
OUTPUT_NOSDD=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" CWD="$TMP_NOSDD" bash "$SCRIPT" <<< "$INPUT_NOSDD")
assert_empty "$OUTPUT_NOSDD" "AC-1.4: no output outside SDD project"

# Cleanup
rm -rf "$TMP" "$TMP_NOSDD"
summarize
```

- [ ] Run: `bash tests/hooks/test_session_start.sh` — expect: FAIL (script does not exist)

### 2.2 Implement `scripts/hooks/session-start.sh`

- [ ] Create `scripts/hooks/session-start.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
CWD="${CWD:-$PWD}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/hooks/lib/detect-active-spec.sh
source "${SCRIPT_DIR}/lib/detect-active-spec.sh"

# FR-1: Silent outside SDD project
detect_sdd_project "$CWD" || exit 0

MAX_CHARS=8000
CONTEXT=""

append_section() {
  local label="$1" content="$2"
  [ -n "$content" ] || return 0
  CONTEXT="${CONTEXT}
=== ${label} ===
${content}"
}

# FR-3: Load constitution (always)
if [ -f "${CWD}/memory/constitution.md" ]; then
  append_section "memory/constitution.md" "$(cat "${CWD}/memory/constitution.md")"
fi

# FR-3: Load memory index (always)
if [ -f "${CWD}/memory/MEMORY.md" ]; then
  append_section "memory/MEMORY.md" "$(cat "${CWD}/memory/MEMORY.md")"
fi

# FR-2 + FR-3: Active spec summary
ACTIVE_SPEC_DIR=$(detect_active_spec "$CWD")
if [ -n "$ACTIVE_SPEC_DIR" ] && [ -f "${ACTIVE_SPEC_DIR}/spec.md" ]; then
  append_section "Active spec: ${ACTIVE_SPEC_DIR}/spec.md (first 50 lines)" \
    "$(head -50 "${ACTIVE_SPEC_DIR}/spec.md")"
fi

# FR-3: Open tasks only
if [ -n "$ACTIVE_SPEC_DIR" ] && [ -f "${ACTIVE_SPEC_DIR}/tasks.md" ]; then
  OPEN=$(grep '^- \[ \]' "${ACTIVE_SPEC_DIR}/tasks.md" 2>/dev/null || true)
  [ -n "$OPEN" ] && append_section "Open tasks" "$OPEN"
fi

# Exit silently if nothing to inject
[ -n "$CONTEXT" ] || exit 0

# Truncate to MAX_CHARS (FR-3 / open question resolution)
CONTEXT=$(printf '%s' "$CONTEXT" | head -c "$MAX_CHARS")

jq -n --arg ctx "$CONTEXT" '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: $ctx
  }
}'
```

- [ ] Run: `bash tests/hooks/test_session_start.sh` — expect: PASS
- [ ] Commit: `feat(011-plugin-hooks): add session-start hook — context injection`

---

## Phase 3: Plan Gate Enforcement

**Implements:** FR-1, FR-4 | **Satisfies:** AC-2.1, AC-2.2, AC-2.3

### 3.1 Write failing tests

- [ ] Write `tests/hooks/test_pre_write_plan_gate.sh`:

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCRIPT="$PLUGIN_ROOT/scripts/hooks/pre-write-plan-gate.sh"

echo "--- test_pre_write_plan_gate.sh ---"

TMP=$(mktemp -d)
mkdir -p "$TMP/docs/specs/001-test"

make_input() {
  local cwd="$1" path="$2"
  jq -n --arg cwd "$cwd" --arg path "$path" \
    '{"hook_event_name":"PreToolUse","session_id":"t1","cwd":$cwd,"tool_name":"Write","tool_input":{"file_path":$path}}'
}

# AC-2.1: deny when spec.md missing
INPUT=$(make_input "$TMP" "$TMP/docs/specs/001-test/plan.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_json_field "$OUTPUT" '.hookSpecificOutput.permissionDecision' "deny" "AC-2.1: deny when spec.md missing"
assert_contains "$OUTPUT" "sdd-specify" "AC-2.1: denial message names sdd-specify"

# AC-2.2: deny when spec.md exists but not approved
echo "**Status:** Draft" > "$TMP/docs/specs/001-test/spec.md"
INPUT=$(make_input "$TMP" "$TMP/docs/specs/001-test/plan.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_json_field "$OUTPUT" '.hookSpecificOutput.permissionDecision' "deny" "AC-2.2: deny when spec not approved"
assert_contains "$OUTPUT" "Status: Approved" "AC-2.2: denial message mentions Status: Approved"

# AC-2.3: allow when spec.md approved
echo "**Status:** Approved" > "$TMP/docs/specs/001-test/spec.md"
INPUT=$(make_input "$TMP" "$TMP/docs/specs/001-test/plan.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-2.3: no output when gate satisfied"

# FR-4 must-not: do not block plan.md outside docs/specs/
INPUT=$(make_input "$TMP" "/tmp/other/plan.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "FR-4 must-not: silent for plan.md outside docs/specs/"

# FR-1: silent outside SDD project
TMP_NOSDD=$(mktemp -d)
INPUT=$(make_input "$TMP_NOSDD" "$TMP_NOSDD/docs/specs/001-test/plan.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "FR-1: silent outside SDD project"

rm -rf "$TMP" "$TMP_NOSDD"
summarize
```

- [ ] Run: `bash tests/hooks/test_pre_write_plan_gate.sh` — expect: FAIL

### 3.2 Implement `scripts/hooks/pre-write-plan-gate.sh`

- [ ] Create `scripts/hooks/pre-write-plan-gate.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
CWD="${CWD:-$PWD}"
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/detect-active-spec.sh"

# FR-1: Silent outside SDD project
detect_sdd_project "$CWD" || exit 0

# FR-4: Only intercept plan.md inside docs/specs/
case "$FILE_PATH" in
  */docs/specs/*/plan.md) ;;
  *) exit 0 ;;
esac

SPEC_DIR=$(dirname "$FILE_PATH")

deny() {
  jq -n --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

# Check spec.md exists
if [ ! -f "${SPEC_DIR}/spec.md" ]; then
  deny "SDD Gate: spec.md not found in ${SPEC_DIR}. Run sdd-specify first."
fi

# Check Status: Approved
if ! grep -qE '^\*\*Status:\*\* Approved' "${SPEC_DIR}/spec.md" 2>/dev/null; then
  deny "SDD Gate: spec.md exists but is not approved. Set Status: Approved in spec.md before planning."
fi

exit 0
```

- [ ] Run: `bash tests/hooks/test_pre_write_plan_gate.sh` — expect: PASS
- [ ] Commit: `feat(011-plugin-hooks): add pre-write-plan-gate hook — Hard Gate 1`

---

## Phase 4: Tasks Gate Enforcement

**Implements:** FR-1, FR-5 | **Satisfies:** AC-3.1, AC-3.2, AC-3.3

### 4.1 Write failing tests

- [ ] Write `tests/hooks/test_pre_write_tasks_gate.sh`:

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCRIPT="$PLUGIN_ROOT/scripts/hooks/pre-write-tasks-gate.sh"

echo "--- test_pre_write_tasks_gate.sh ---"

TMP=$(mktemp -d)
mkdir -p "$TMP/docs/specs/001-test"

make_input() {
  local cwd="$1" path="$2"
  jq -n --arg cwd "$cwd" --arg path "$path" \
    '{"hook_event_name":"PreToolUse","session_id":"t1","cwd":$cwd,"tool_name":"Write","tool_input":{"file_path":$path}}'
}

# AC-3.1: deny when plan.md missing
INPUT=$(make_input "$TMP" "$TMP/docs/specs/001-test/tasks.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_json_field "$OUTPUT" '.hookSpecificOutput.permissionDecision' "deny" "AC-3.1: deny when plan.md missing"
assert_contains "$OUTPUT" "sdd-plan" "AC-3.1: denial message names sdd-plan"

# AC-3.2: allow when plan.md exists
touch "$TMP/docs/specs/001-test/plan.md"
INPUT=$(make_input "$TMP" "$TMP/docs/specs/001-test/tasks.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-3.2: no output when plan.md exists"

# AC-3.3: silent for non-tasks.md writes
INPUT=$(make_input "$TMP" "$TMP/docs/specs/001-test/notes.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-3.3: silent for non-tasks.md paths"

# FR-5 must-not: silent for tasks.md outside docs/specs/
INPUT=$(make_input "$TMP" "/tmp/other/tasks.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "FR-5 must-not: silent for tasks.md outside docs/specs/"

rm -rf "$TMP"
summarize
```

- [ ] Run: `bash tests/hooks/test_pre_write_tasks_gate.sh` — expect: FAIL

### 4.2 Implement `scripts/hooks/pre-write-tasks-gate.sh`

- [ ] Create `scripts/hooks/pre-write-tasks-gate.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
CWD="${CWD:-$PWD}"
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/detect-active-spec.sh"

# FR-1: Silent outside SDD project
detect_sdd_project "$CWD" || exit 0

# FR-5: Only intercept tasks.md inside docs/specs/
case "$FILE_PATH" in
  */docs/specs/*/tasks.md) ;;
  *) exit 0 ;;
esac

SPEC_DIR=$(dirname "$FILE_PATH")

if [ ! -f "${SPEC_DIR}/plan.md" ]; then
  jq -n --arg reason "SDD Gate: plan.md not found in ${SPEC_DIR}. Run sdd-plan first." '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
fi
```

- [ ] Run: `bash tests/hooks/test_pre_write_tasks_gate.sh` — expect: PASS
- [ ] Commit: `feat(011-plugin-hooks): add pre-write-tasks-gate hook — Hard Gate 2`

---

## Phase 5: Memory Write Validation

**Implements:** FR-1, FR-6 | **Satisfies:** AC-4.1, AC-4.2, AC-4.3

### 5.1 Write failing tests

- [ ] Write `tests/hooks/test_post_write_memory_validate.sh`:

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCRIPT="$PLUGIN_ROOT/scripts/hooks/post-write-memory-validate.sh"

echo "--- test_post_write_memory_validate.sh ---"

TMP=$(mktemp -d)
mkdir -p "$TMP/docs/specs"
mkdir -p "$TMP/memory"

make_input() {
  local cwd="$1" path="$2"
  jq -n --arg cwd "$cwd" --arg path "$path" \
    '{"hook_event_name":"PostToolUse","session_id":"t1","cwd":$cwd,"tool_name":"Write","tool_input":{"file_path":$path}}'
}

# AC-4.1: inject context when frontmatter missing
echo "# No frontmatter here" > "$TMP/memory/bad.md"
INPUT=$(make_input "$TMP" "$TMP/memory/bad.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_contains "$OUTPUT" "frontmatter" "AC-4.1: mentions missing frontmatter"

# AC-4.1: inject context when fields missing
cat > "$TMP/memory/partial.md" <<'EOF'
---
name: partial-test
---
# Missing description and type
EOF
INPUT=$(make_input "$TMP" "$TMP/memory/partial.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_contains "$OUTPUT" "description" "AC-4.1: mentions missing description field"
assert_contains "$OUTPUT" "type" "AC-4.1: mentions missing metadata.type field"

# AC-4.2: inject context when slug not in MEMORY.md
cat > "$TMP/memory/valid.md" <<'EOF'
---
name: valid-memory
description: A test memory
metadata:
  type: feedback
---
# Valid memory content
EOF
echo "# Memory Index" > "$TMP/memory/MEMORY.md"
INPUT=$(make_input "$TMP" "$TMP/memory/valid.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_contains "$OUTPUT" "MEMORY.md" "AC-4.2: mentions missing MEMORY.md entry"

# AC-4.3: silent when valid frontmatter and slug in MEMORY.md
echo "- [Valid Memory](valid.md) — test" >> "$TMP/memory/MEMORY.md"
INPUT=$(make_input "$TMP" "$TMP/memory/valid.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-4.3: silent when valid and indexed"

# FR-6 must-not: silent for files outside memory/
INPUT=$(make_input "$TMP" "$TMP/docs/specs/001-test/spec.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "FR-6 must-not: silent for non-memory writes"

rm -rf "$TMP"
summarize
```

- [ ] Run: `bash tests/hooks/test_post_write_memory_validate.sh` — expect: FAIL

### 5.2 Implement `scripts/hooks/post-write-memory-validate.sh`

- [ ] Create `scripts/hooks/post-write-memory-validate.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
CWD="${CWD:-$PWD}"
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/detect-active-spec.sh"

detect_sdd_project "$CWD" || exit 0

# FR-6: Only validate memory/*.md
case "$FILE_PATH" in
  */memory/*.md) ;;
  *) exit 0 ;;
esac

[ -f "$FILE_PATH" ] || exit 0

ISSUES=""
add_issue() { ISSUES="${ISSUES}\n- $1"; }

# Check frontmatter delimiters
if ! grep -q '^---' "$FILE_PATH"; then
  add_issue "Missing YAML frontmatter. Add --- delimiters and required fields: name, description, metadata.type"
else
  FRONTMATTER=$(awk 'BEGIN{p=0} /^---/{p++; if(p==2)exit; next} p==1{print}' "$FILE_PATH")

  echo "$FRONTMATTER" | grep -q '^name:' || add_issue "Missing 'name' field in frontmatter"
  echo "$FRONTMATTER" | grep -q '^description:' || add_issue "Missing 'description' field in frontmatter"
  echo "$FRONTMATTER" | grep -q 'type:' || add_issue "Missing 'metadata.type' field in frontmatter (under metadata:)"

  NAME_SLUG=$(echo "$FRONTMATTER" | grep '^name:' | sed 's/^name:[[:space:]]*//' | tr -d '"'"'" )

  if [ -n "$NAME_SLUG" ]; then
    if [ ! -f "${CWD}/memory/MEMORY.md" ]; then
      add_issue "memory/MEMORY.md does not exist. Create it and add: '- [Title]($(basename "$FILE_PATH")) — description'"
    elif ! grep -q "$NAME_SLUG" "${CWD}/memory/MEMORY.md"; then
      add_issue "Name slug '${NAME_SLUG}' not found in memory/MEMORY.md. Add: '- [Title]($(basename "$FILE_PATH")) — one-line description'"
    fi
  fi
fi

[ -n "$ISSUES" ] || exit 0

jq -n --arg issues "$(printf '%b' "$ISSUES")" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: ("Memory file validation issues:\n" + $issues + "\n\nFix these before the session ends.")
  }
}'
```

- [ ] Run: `bash tests/hooks/test_post_write_memory_validate.sh` — expect: PASS
- [ ] Commit: `feat(011-plugin-hooks): add post-write-memory-validate hook — memory integrity`

---

## Phase 6: Subagent Context Injection

**Implements:** FR-1, FR-2, FR-7 | **Satisfies:** AC-5.1, AC-5.2

### 6.1 Write failing tests

- [ ] Write `tests/hooks/test_subagent_start.sh`:

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCRIPT="$PLUGIN_ROOT/scripts/hooks/subagent-start.sh"

echo "--- test_subagent_start.sh ---"

TMP=$(mktemp -d)
mkdir -p "$TMP/docs/specs/011-plugin-hooks"
cat > "$TMP/docs/specs/011-plugin-hooks/spec.md" <<'EOF'
# Feature 011: Plugin Hooks

**Status:** Approved

## Problem Statement

Hooks provide automatic SDD enforcement.
This is the objective content.
More context here.
EOF

make_input() {
  local cwd="$1"
  jq -n --arg cwd "$cwd" '{"hook_event_name":"SubagentStart","session_id":"t1","cwd":$cwd}'
}

# AC-5.1: inject spec title, objective, and path when active spec detected
INPUT=$(make_input "$TMP")
OUTPUT=$(cd "$TMP" && git() { echo "011-plugin-hooks"; }; export -f git; \
         CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" CWD="$TMP" bash "$SCRIPT" <<< "$INPUT")
assert_contains "$OUTPUT" "Feature 011" "AC-5.1: spec title injected"
assert_contains "$OUTPUT" "011-plugin-hooks/spec.md" "AC-5.1: spec path injected"
assert_contains "$OUTPUT" "Hooks provide automatic" "AC-5.1: objective content injected"

# AC-5.2: silent when no active spec detected
TMP_EMPTY=$(mktemp -d)
mkdir -p "$TMP_EMPTY/docs/specs"
INPUT_EMPTY=$(make_input "$TMP_EMPTY")
OUTPUT_EMPTY=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" CWD="$TMP_EMPTY" bash "$SCRIPT" <<< "$INPUT_EMPTY")
assert_empty "$OUTPUT_EMPTY" "AC-5.2: silent when no active spec"

# FR-7 must-not: no full memory context
if echo "$OUTPUT" | grep -q "constitution"; then
  FAIL=$((FAIL + 1)); echo "  FAIL: FR-7 must-not: memory context must not be injected in subagent"
else
  PASS=$((PASS + 1)); echo "  PASS: FR-7 must-not: no memory context in subagent output"
fi

rm -rf "$TMP" "$TMP_EMPTY"
summarize
```

- [ ] Run: `bash tests/hooks/test_subagent_start.sh` — expect: FAIL

### 6.2 Implement `scripts/hooks/subagent-start.sh`

- [ ] Create `scripts/hooks/subagent-start.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
CWD="${CWD:-$PWD}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/detect-active-spec.sh"

detect_sdd_project "$CWD" || exit 0

ACTIVE_SPEC_DIR=$(detect_active_spec "$CWD")
[ -n "$ACTIVE_SPEC_DIR" ] || exit 0
[ -f "${ACTIVE_SPEC_DIR}/spec.md" ] || exit 0

SPEC_TITLE=$(grep '^# ' "${ACTIVE_SPEC_DIR}/spec.md" | head -1 | sed 's/^# //')

# Extract first ## Objective or ## Problem Statement section, up to 10 lines
OBJECTIVE=$(awk '/^## (Objective|Problem Statement)/{p=1; count=0; next}
                 p && /^## /{exit}
                 p && count < 10 {print; count++}' "${ACTIVE_SPEC_DIR}/spec.md")

CONTEXT="=== Active SDD Spec ===
Title: ${SPEC_TITLE}
Path: ${ACTIVE_SPEC_DIR}/spec.md

${OBJECTIVE}"

jq -n --arg ctx "$CONTEXT" '{
  hookSpecificOutput: {
    hookEventName: "SubagentStart",
    additionalContext: $ctx
  }
}'
```

- [ ] Run: `bash tests/hooks/test_subagent_start.sh` — expect: PASS
- [ ] Commit: `feat(011-plugin-hooks): add subagent-start hook — subagent context injection`

---

## Phase 7: Write State Tracking and Stop Hook

**Implements:** FR-1, FR-8, FR-9 | **Satisfies:** AC-6.1, AC-6.2, AC-6.3

### 7.1 Write failing tests

- [ ] Write `tests/hooks/test_stop.sh`:

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
STATE_SETTER="$PLUGIN_ROOT/scripts/hooks/pre-write-edit-state.sh"
STOP_SCRIPT="$PLUGIN_ROOT/scripts/hooks/stop.sh"

echo "--- test_stop.sh ---"

TMP=$(mktemp -d)
mkdir -p "$TMP/docs/specs"
SESSION_ID="test-stop-session-$$"
STATE_FILE="${TMPDIR:-/tmp}/sdd-state-${SESSION_ID}.json"

make_state_input() {
  local cwd="$1" sid="$2" tool="$3"
  jq -n --arg cwd "$cwd" --arg sid "$sid" --arg tool "$tool" \
    '{"hook_event_name":"PreToolUse","session_id":$sid,"cwd":$cwd,"tool_name":$tool,"tool_input":{"file_path":"/tmp/x.sh"}}'
}

make_stop_input() {
  local cwd="$1" sid="$2"
  jq -n --arg cwd "$cwd" --arg sid "$sid" \
    '{"hook_event_name":"Stop","session_id":$sid,"cwd":$cwd}'
}

# AC-6.1: Stop exits silently when no writes occurred
rm -f "$STATE_FILE"
INPUT=$(make_stop_input "$TMP" "$SESSION_ID")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$STOP_SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-6.1: silent Stop when no writes"

# FR-8: State setter creates state file on Write
INPUT_W=$(make_state_input "$TMP" "$SESSION_ID" "Write")
CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$STATE_SETTER" <<< "$INPUT_W" > /dev/null
HAD_WRITES=$(jq -r '.had_writes' "$STATE_FILE" 2>/dev/null || echo "false")
assert_json_field '{"had_writes":true}' '.had_writes' "true" "FR-8: had_writes set to true after Write"

# AC-6.2: Stop injects reminder when had_writes true
INPUT=$(make_stop_input "$TMP" "$SESSION_ID")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$STOP_SCRIPT" <<< "$INPUT")
assert_contains "$OUTPUT" "memory" "AC-6.2: memory save reminder injected"
assert_contains "$OUTPUT" "verification-before-completion" "AC-6.2: verification reminder injected"

# AC-6.3: State file removed after Stop reads it
assert_exit_nonzero "$([ -f "$STATE_FILE" ]; echo $?)" "AC-6.3: state file removed after Stop"

# FR-8: State setter also fires on Edit
INPUT_E=$(make_state_input "$TMP" "${SESSION_ID}-edit" "Edit")
CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$STATE_SETTER" <<< "$INPUT_E" > /dev/null
STATE_FILE_EDIT="${TMPDIR:-/tmp}/sdd-state-${SESSION_ID}-edit.json"
HAD_WRITES_EDIT=$(jq -r '.had_writes' "$STATE_FILE_EDIT" 2>/dev/null || echo "false")
assert_json_field "{\"had_writes\":$HAD_WRITES_EDIT}" '.had_writes' "true" "FR-8: had_writes set to true after Edit"
rm -f "$STATE_FILE_EDIT"

rm -rf "$TMP"
summarize
```

- [ ] Run: `bash tests/hooks/test_stop.sh` — expect: FAIL

### 7.2 Implement `scripts/hooks/pre-write-edit-state.sh`

- [ ] Create `scripts/hooks/pre-write-edit-state.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
CWD="${CWD:-$PWD}"
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/detect-active-spec.sh"

# FR-1: Silent outside SDD project
detect_sdd_project "$CWD" || exit 0

# FR-8: Write state flag — fire and forget
STATE_FILE="${TMPDIR:-/tmp}/sdd-state-${SESSION_ID}.json"
printf '{"had_writes":true}' > "$STATE_FILE" 2>/dev/null || true

exit 0
```

### 7.3 Implement `scripts/hooks/stop.sh`

- [ ] Create `scripts/hooks/stop.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
CWD="${CWD:-$PWD}"
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/detect-active-spec.sh"

# FR-1: Silent outside SDD project
detect_sdd_project "$CWD" || exit 0

# FR-9: Read write state
STATE_FILE="${TMPDIR:-/tmp}/sdd-state-${SESSION_ID}.json"
HAD_WRITES=false

if [ -f "$STATE_FILE" ]; then
  HAD_WRITES=$(jq -r '.had_writes // false' "$STATE_FILE" 2>/dev/null || echo "false")
  rm -f "$STATE_FILE" 2>/dev/null || true
fi

# AC-6.1: Exit silently when no writes
[ "$HAD_WRITES" = "true" ] || exit 0

# AC-6.2: Inject both reminders
jq -n '{
  hookSpecificOutput: {
    hookEventName: "Stop",
    additionalContext: "Session end checklist (writes occurred this session):\n1. Memory: Save any new learnings, decisions, or feedback to memory/ files now.\n2. Verification: Run verification-before-completion before claiming any work is done."
  }
}'
```

- [ ] Run: `bash tests/hooks/test_stop.sh` — expect: PASS
- [ ] Commit: `feat(011-plugin-hooks): add state-setter and stop hooks — session write tracking`

---

## Phase 8: Hook Registration

**Implements:** FR-10 | **Satisfies:** precondition for all ACs in production

### 8.1 Write failing tests

- [ ] Write `tests/hooks/test_hooks_json.sh`:

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOKS_JSON="$PLUGIN_ROOT/hooks/hooks.json"

echo "--- test_hooks_json.sh ---"

# Valid JSON
jq . "$HOOKS_JSON" > /dev/null 2>&1
assert_exit_zero $? "hooks.json is valid JSON"

# All required events registered
assert_contains "$(jq -r 'keys[]' "$HOOKS_JSON")" "SessionStart" "SessionStart event registered"
assert_contains "$(jq -r 'keys[]' "$HOOKS_JSON")" "PreToolUse" "PreToolUse event registered"
assert_contains "$(jq -r 'keys[]' "$HOOKS_JSON")" "PostToolUse" "PostToolUse event registered"
assert_contains "$(jq -r 'keys[]' "$HOOKS_JSON")" "SubagentStart" "SubagentStart event registered"
assert_contains "$(jq -r 'keys[]' "$HOOKS_JSON")" "Stop" "Stop event registered"

# All scripts exist
SCRIPTS=$(jq -r '.. | objects | .command? // empty' "$HOOKS_JSON" | sed 's|\${CLAUDE_PLUGIN_ROOT}||')
while IFS= read -r script_path; do
  [ -n "$script_path" ] || continue
  assert_exit_zero "$([ -f "${PLUGIN_ROOT}${script_path}" ]; echo $?)" "Script exists: $script_path"
done <<< "$SCRIPTS"

# All hooks use type: command
ALL_TYPES=$(jq -r '.. | objects | .type? // empty' "$HOOKS_JSON" | sort -u)
assert_eq "$ALL_TYPES" "command" "FR-10: all hooks use type: command"

summarize
```

- [ ] Run: `bash tests/hooks/test_hooks_json.sh` — expect: FAIL

### 8.2 Implement `hooks/hooks.json`

- [ ] Create `hooks/hooks.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/session-start.sh",
            "timeout": 10
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/pre-write-plan-gate.sh",
            "timeout": 5
          },
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/pre-write-tasks-gate.sh",
            "timeout": 5
          },
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/pre-write-edit-state.sh",
            "timeout": 5
          }
        ]
      },
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/pre-write-edit-state.sh",
            "timeout": 5
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/post-write-memory-validate.sh",
            "timeout": 5
          }
        ]
      }
    ],
    "SubagentStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/subagent-start.sh",
            "timeout": 5
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/stop.sh",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

- [ ] Run: `bash tests/hooks/test_hooks_json.sh` — expect: PASS
- [ ] Commit: `feat(011-plugin-hooks): add hooks/hooks.json registration`

---

## Phase 9: Integration Verification

**Implements:** All FRs | **Satisfies:** All ACs

### 9.1 Run full test suite

- [ ] Run: `bash tests/hooks/run_all.sh`
- [ ] Expected output:
  ```
  === test_lib.sh ===
  Results: 5 passed, 0 failed

  === test_session_start.sh ===
  Results: 5 passed, 0 failed

  === test_pre_write_plan_gate.sh ===
  Results: 5 passed, 0 failed

  === test_pre_write_tasks_gate.sh ===
  Results: 4 passed, 0 failed

  === test_post_write_memory_validate.sh ===
  Results: 5 passed, 0 failed

  === test_subagent_start.sh ===
  Results: 3 passed, 0 failed

  === test_stop.sh ===
  Results: 5 passed, 0 failed

  === test_hooks_json.sh ===
  Results: 8 passed, 0 failed

  === TOTAL: 8 files passed, 0 files failed ===
  ```

### 9.2 Verify all scripts are executable

- [ ] Run: `chmod +x scripts/hooks/*.sh scripts/hooks/lib/*.sh tests/hooks/*.sh tests/hooks/run_all.sh`
- [ ] Run: `bash tests/hooks/run_all.sh` — expect: still PASS

### 9.3 Validate spec coverage

- [ ] Confirm all FRs are implemented:
  - FR-1 (SDD detection): shared lib + all scripts ✓
  - FR-2 (active spec detection): shared lib ✓
  - FR-3 (session context injection): session-start.sh ✓
  - FR-4 (plan gate): pre-write-plan-gate.sh ✓
  - FR-5 (tasks gate): pre-write-tasks-gate.sh ✓
  - FR-6 (memory validation): post-write-memory-validate.sh ✓
  - FR-7 (subagent context): subagent-start.sh ✓
  - FR-8 (write state tracking): pre-write-edit-state.sh ✓
  - FR-9 (stop reminder): stop.sh ✓
  - FR-10 (hook distribution): hooks/hooks.json ✓

- [ ] Commit: `feat(011-plugin-hooks): complete plugin hooks implementation`

---

## Quickstart Validation

End-to-end smoke test to confirm the hooks work in a real Claude Code session:

```bash
# 1. Verify hooks.json is valid and all scripts are present
bash tests/hooks/run_all.sh

# 2. Verify plugin hook file is in place
ls -la hooks/hooks.json

# 3. Test plan gate manually: create a spec dir without spec.md and attempt to write plan.md
mkdir -p /tmp/sdd-test-project/docs/specs/001-test
echo '{"hook_event_name":"PreToolUse","session_id":"smoke","cwd":"/tmp/sdd-test-project","tool_name":"Write","tool_input":{"file_path":"/tmp/sdd-test-project/docs/specs/001-test/plan.md"}}' \
  | CWD=/tmp/sdd-test-project bash scripts/hooks/pre-write-plan-gate.sh
# Expected: JSON with permissionDecision: "deny" and message mentioning sdd-specify

# 4. Test session start context injection
mkdir -p /tmp/sdd-test-project/memory
echo "# Test Constitution" > /tmp/sdd-test-project/memory/constitution.md
echo '{"hook_event_name":"SessionStart","session_id":"smoke","cwd":"/tmp/sdd-test-project"}' \
  | CWD=/tmp/sdd-test-project bash scripts/hooks/session-start.sh
# Expected: JSON with additionalContext containing "Test Constitution"

# 5. Clean up
rm -rf /tmp/sdd-test-project
```
