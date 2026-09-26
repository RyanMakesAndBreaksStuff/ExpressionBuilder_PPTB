# Tasks: Plugin Hooks for SDD Superpowers

**Plan:** docs/specs/011-plugin-hooks/plan.md
**Generated:** 2026-05-30

> **For agentic workers:** Execute tasks in order. `[P]` tasks within the same parallel group can run concurrently. Never start an implementation task without the prior test task completed and confirmed red.

---

## Parallel Group 0: Infrastructure Setup

Tasks T001–T005 are independent and can run concurrently.

- [ ] **T001** `[P]` Create all required directories:
  ```bash
  mkdir -p hooks \
    scripts/hooks/lib \
    tests/hooks/fixtures
  ```
  Expected: directories created, exit 0.

- [ ] **T002** `[P]` Write `tests/hooks/helpers.sh`:
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
      FAIL=$((FAIL + 1)); echo "  FAIL: $label — '$needle' not found in output"
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

- [ ] **T003** `[P]` Write `tests/hooks/run_all.sh`:
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

- [ ] **T004** `[P]` Write all 7 fixture files:

  `tests/hooks/fixtures/session_start_input.json`:
  ```json
  {
    "hook_event_name": "SessionStart",
    "session_id": "test-session-001",
    "cwd": "__CWD_PLACEHOLDER__"
  }
  ```

  `tests/hooks/fixtures/pre_write_plan_input.json`:
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

  `tests/hooks/fixtures/pre_write_tasks_input.json`:
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

  `tests/hooks/fixtures/post_write_memory_input.json`:
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

  `tests/hooks/fixtures/subagent_start_input.json`:
  ```json
  {
    "hook_event_name": "SubagentStart",
    "session_id": "test-session-001",
    "cwd": "__CWD_PLACEHOLDER__"
  }
  ```

  `tests/hooks/fixtures/pre_write_edit_input.json`:
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

  `tests/hooks/fixtures/stop_input.json`:
  ```json
  {
    "hook_event_name": "Stop",
    "session_id": "test-session-001",
    "cwd": "__CWD_PLACEHOLDER__"
  }
  ```

- [ ] **T005** `[P]` Verify test runner works with no test files yet:
  ```bash
  bash tests/hooks/run_all.sh
  ```
  Expected: `=== TOTAL: 0 files passed, 0 files failed ===`, exit 0.

- [ ] **T006** Commit infrastructure:
  ```bash
  git add tests/hooks/helpers.sh tests/hooks/run_all.sh tests/hooks/fixtures/
  git commit -m "test(011-plugin-hooks): add hook test infrastructure and fixtures"
  ```

---

## Sequential: Phase 1 — Shared Library

*Prerequisite: T001–T006 complete. All other phases depend on this phase completing.*

- [ ] **T007** Write `tests/hooks/test_lib.sh`:
  ```bash
  #!/usr/bin/env bash
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  source "$SCRIPT_DIR/helpers.sh"

  LIB="$(cd "$SCRIPT_DIR/../.." && pwd)/scripts/hooks/lib/detect-active-spec.sh"

  echo "--- test_lib.sh: detect-active-spec.sh ---"

  TMP=$(mktemp -d)
  mkdir -p "$TMP/docs/specs/001-test-feature"
  mkdir -p "$TMP/docs/specs/002-another-feature"
  touch "$TMP/docs/specs/001-test-feature/spec.md"
  touch "$TMP/docs/specs/002-another-feature/spec.md"

  source "$LIB"

  # T1: SDD project detected when docs/specs exists
  detect_sdd_project "$TMP"
  assert_exit_zero $? "detect_sdd_project: returns 0 when docs/specs exists"

  # T2: Not SDD project when docs/specs missing
  TMP_NOSDD=$(mktemp -d)
  detect_sdd_project "$TMP_NOSDD"
  assert_exit_nonzero $? "detect_sdd_project: returns non-zero when docs/specs missing"

  # T3: Active spec matched by branch name NNN prefix
  RESULT=$(cd "$TMP" && git() { echo "001-test-feature"; }; export -f git; \
           CWD="$TMP" detect_active_spec "$TMP")
  assert_contains "$RESULT" "001-test-feature" "detect_active_spec: matches branch NNN prefix to spec dir"

  # T4: Fallback to most recently modified spec dir
  touch "$TMP/docs/specs/002-another-feature/spec.md"
  RESULT=$(CWD="$TMP" detect_active_spec "$TMP")
  assert_contains "$RESULT" "docs/specs" "detect_active_spec: fallback returns a spec dir"

  # T5: Empty when no spec dirs exist
  TMP_EMPTY=$(mktemp -d)
  mkdir -p "$TMP_EMPTY/docs/specs"
  RESULT=$(CWD="$TMP_EMPTY" detect_active_spec "$TMP_EMPTY")
  assert_empty "$RESULT" "detect_active_spec: returns empty when no spec dirs"

  rm -rf "$TMP" "$TMP_NOSDD" "$TMP_EMPTY"
  summarize
  ```

- [ ] **T008** Verify T007 fails (lib does not exist):
  ```bash
  bash tests/hooks/test_lib.sh
  ```
  Expected: error or FAIL output — `scripts/hooks/lib/detect-active-spec.sh: No such file`.

- [ ] **T009** Implement `scripts/hooks/lib/detect-active-spec.sh`:
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

- [ ] **T010** Verify T007 now passes:
  ```bash
  bash tests/hooks/test_lib.sh
  ```
  Expected: `Results: 5 passed, 0 failed`.

- [ ] **T011** Commit shared library:
  ```bash
  git add scripts/hooks/lib/detect-active-spec.sh tests/hooks/test_lib.sh
  git commit -m "feat(011-plugin-hooks): add shared hook library — SDD detection and active spec"
  ```

---

## Parallel Group A: Write Failing Tests (Phases 2–7)

*Prerequisite: T011 complete. All tasks in this group are independent — run concurrently.*

- [ ] **T012** `[P]` Write `tests/hooks/test_session_start.sh`:
  ```bash
  #!/usr/bin/env bash
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  source "$SCRIPT_DIR/helpers.sh"
  PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
  SCRIPT="$PLUGIN_ROOT/scripts/hooks/session-start.sh"

  echo "--- test_session_start.sh ---"

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
  printf '- [x] done task\n- [ ] open task 1\n- [ ] open task 2\n' \
    > "$TMP/docs/specs/011-plugin-hooks/tasks.md"

  INPUT=$(jq -n --arg cwd "$TMP" \
    '{"hook_event_name":"SessionStart","session_id":"t1","cwd":$cwd}')

  # AC-1.1: constitution and MEMORY.md injected
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" CWD="$TMP" bash "$SCRIPT" <<< "$INPUT")
  assert_contains "$OUTPUT" "Constitution content" "AC-1.1: constitution.md injected"
  assert_contains "$OUTPUT" "Memory" "AC-1.1: MEMORY.md injected"

  # AC-1.2: active spec summary injected (mock git to match branch)
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

  # AC-1.4: silent outside SDD project
  TMP_NOSDD=$(mktemp -d)
  INPUT_NOSDD=$(jq -n --arg cwd "$TMP_NOSDD" \
    '{"hook_event_name":"SessionStart","session_id":"t1","cwd":$cwd}')
  OUTPUT_NOSDD=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT_NOSDD")
  assert_empty "$OUTPUT_NOSDD" "AC-1.4: no output outside SDD project"

  rm -rf "$TMP" "$TMP_NOSDD"
  summarize
  ```

- [ ] **T013** `[P]` Write `tests/hooks/test_pre_write_plan_gate.sh`:
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
    jq -n --arg cwd "$1" --arg path "$2" \
      '{"hook_event_name":"PreToolUse","session_id":"t1","cwd":$cwd,
        "tool_name":"Write","tool_input":{"file_path":$path}}'
  }

  # AC-2.1: deny when spec.md missing
  INPUT=$(make_input "$TMP" "$TMP/docs/specs/001-test/plan.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_json_field "$OUTPUT" '.hookSpecificOutput.permissionDecision' "deny" \
    "AC-2.1: deny when spec.md missing"
  assert_contains "$OUTPUT" "sdd-specify" "AC-2.1: denial names sdd-specify"

  # AC-2.2: deny when spec.md not approved
  echo "**Status:** Draft" > "$TMP/docs/specs/001-test/spec.md"
  INPUT=$(make_input "$TMP" "$TMP/docs/specs/001-test/plan.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_json_field "$OUTPUT" '.hookSpecificOutput.permissionDecision' "deny" \
    "AC-2.2: deny when spec not approved"
  assert_contains "$OUTPUT" "Status: Approved" "AC-2.2: denial mentions Status: Approved"

  # AC-2.3: allow when spec.md approved
  echo "**Status:** Approved" > "$TMP/docs/specs/001-test/spec.md"
  INPUT=$(make_input "$TMP" "$TMP/docs/specs/001-test/plan.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "AC-2.3: no output when gate satisfied"

  # Must-not: silent for plan.md outside docs/specs/
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

- [ ] **T014** `[P]` Write `tests/hooks/test_pre_write_tasks_gate.sh`:
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
    jq -n --arg cwd "$1" --arg path "$2" \
      '{"hook_event_name":"PreToolUse","session_id":"t1","cwd":$cwd,
        "tool_name":"Write","tool_input":{"file_path":$path}}'
  }

  # AC-3.1: deny when plan.md missing
  INPUT=$(make_input "$TMP" "$TMP/docs/specs/001-test/tasks.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_json_field "$OUTPUT" '.hookSpecificOutput.permissionDecision' "deny" \
    "AC-3.1: deny when plan.md missing"
  assert_contains "$OUTPUT" "sdd-plan" "AC-3.1: denial names sdd-plan"

  # AC-3.2: allow when plan.md exists
  touch "$TMP/docs/specs/001-test/plan.md"
  INPUT=$(make_input "$TMP" "$TMP/docs/specs/001-test/tasks.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "AC-3.2: no output when plan.md exists"

  # AC-3.3: silent for non-tasks.md writes
  INPUT=$(make_input "$TMP" "$TMP/docs/specs/001-test/notes.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "AC-3.3: silent for non-tasks.md paths"

  # Must-not: silent for tasks.md outside docs/specs/
  INPUT=$(make_input "$TMP" "/tmp/other/tasks.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "FR-5 must-not: silent for tasks.md outside docs/specs/"

  rm -rf "$TMP"
  summarize
  ```

- [ ] **T015** `[P]` Write `tests/hooks/test_post_write_memory_validate.sh`:
  ```bash
  #!/usr/bin/env bash
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  source "$SCRIPT_DIR/helpers.sh"
  PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
  SCRIPT="$PLUGIN_ROOT/scripts/hooks/post-write-memory-validate.sh"

  echo "--- test_post_write_memory_validate.sh ---"

  TMP=$(mktemp -d)
  mkdir -p "$TMP/docs/specs" "$TMP/memory"

  make_input() {
    jq -n --arg cwd "$1" --arg path "$2" \
      '{"hook_event_name":"PostToolUse","session_id":"t1","cwd":$cwd,
        "tool_name":"Write","tool_input":{"file_path":$path}}'
  }

  # AC-4.1: inject when frontmatter missing
  echo "# No frontmatter" > "$TMP/memory/bad.md"
  INPUT=$(make_input "$TMP" "$TMP/memory/bad.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_contains "$OUTPUT" "frontmatter" "AC-4.1: mentions missing frontmatter"

  # AC-4.1: inject when required fields missing
  printf '---\nname: partial-test\n---\n# Body\n' > "$TMP/memory/partial.md"
  INPUT=$(make_input "$TMP" "$TMP/memory/partial.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_contains "$OUTPUT" "description" "AC-4.1: mentions missing description"
  assert_contains "$OUTPUT" "type" "AC-4.1: mentions missing metadata.type"

  # AC-4.2: inject when slug not in MEMORY.md
  cat > "$TMP/memory/valid.md" <<'EOF'
  ---
  name: valid-memory
  description: A test memory
  metadata:
    type: feedback
  ---
  # Valid memory
  EOF
  echo "# Memory Index" > "$TMP/memory/MEMORY.md"
  INPUT=$(make_input "$TMP" "$TMP/memory/valid.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_contains "$OUTPUT" "MEMORY.md" "AC-4.2: mentions MEMORY.md entry needed"

  # AC-4.3: silent when valid and indexed
  echo "- [Valid Memory](valid.md) — test" >> "$TMP/memory/MEMORY.md"
  INPUT=$(make_input "$TMP" "$TMP/memory/valid.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "AC-4.3: silent when valid and indexed"

  # Must-not: silent for writes outside memory/
  INPUT=$(make_input "$TMP" "$TMP/docs/specs/001-test/spec.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "FR-6 must-not: silent for non-memory writes"

  rm -rf "$TMP"
  summarize
  ```

- [ ] **T016** `[P]` Write `tests/hooks/test_subagent_start.sh`:
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
  EOF

  INPUT=$(jq -n --arg cwd "$TMP" \
    '{"hook_event_name":"SubagentStart","session_id":"t1","cwd":$cwd}')

  # AC-5.1: spec title, path, and objective injected
  OUTPUT=$(cd "$TMP" && git() { echo "011-plugin-hooks"; }; export -f git; \
           CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" CWD="$TMP" bash "$SCRIPT" <<< "$INPUT")
  assert_contains "$OUTPUT" "Feature 011" "AC-5.1: spec title injected"
  assert_contains "$OUTPUT" "011-plugin-hooks/spec.md" "AC-5.1: spec path injected"
  assert_contains "$OUTPUT" "Hooks provide automatic" "AC-5.1: objective content injected"

  # AC-5.2: silent when no active spec
  TMP_EMPTY=$(mktemp -d)
  mkdir -p "$TMP_EMPTY/docs/specs"
  INPUT_EMPTY=$(jq -n --arg cwd "$TMP_EMPTY" \
    '{"hook_event_name":"SubagentStart","session_id":"t1","cwd":$cwd}')
  OUTPUT_EMPTY=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" CWD="$TMP_EMPTY" \
    bash "$SCRIPT" <<< "$INPUT_EMPTY")
  assert_empty "$OUTPUT_EMPTY" "AC-5.2: silent when no active spec"

  # Must-not: no full memory context
  if echo "$OUTPUT" | grep -qi "constitution"; then
    FAIL=$((FAIL + 1)); echo "  FAIL: FR-7 must-not: memory context injected in subagent"
  else
    PASS=$((PASS + 1)); echo "  PASS: FR-7 must-not: no memory context in subagent"
  fi

  rm -rf "$TMP" "$TMP_EMPTY"
  summarize
  ```

- [ ] **T017** `[P]` Write `tests/hooks/test_stop.sh`:
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
    jq -n --arg cwd "$1" --arg sid "$2" --arg tool "$3" \
      '{"hook_event_name":"PreToolUse","session_id":$sid,"cwd":$cwd,
        "tool_name":$tool,"tool_input":{"file_path":"/tmp/x.sh"}}'
  }

  make_stop_input() {
    jq -n --arg cwd "$1" --arg sid "$2" \
      '{"hook_event_name":"Stop","session_id":$sid,"cwd":$cwd}'
  }

  # AC-6.1: Stop silent when no writes
  rm -f "$STATE_FILE"
  INPUT=$(make_stop_input "$TMP" "$SESSION_ID")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$STOP_SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "AC-6.1: silent Stop when no writes occurred"

  # FR-8: State setter creates flag on Write
  INPUT_W=$(make_state_input "$TMP" "$SESSION_ID" "Write")
  CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$STATE_SETTER" <<< "$INPUT_W" > /dev/null
  HAD=$(jq -r '.had_writes' "$STATE_FILE" 2>/dev/null || echo "false")
  assert_json_field "{\"had_writes\":$HAD}" '.had_writes' "true" \
    "FR-8: had_writes true after Write"

  # AC-6.2: Stop injects reminders when had_writes true
  INPUT=$(make_stop_input "$TMP" "$SESSION_ID")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$STOP_SCRIPT" <<< "$INPUT")
  assert_contains "$OUTPUT" "memory" "AC-6.2: memory save reminder injected"
  assert_contains "$OUTPUT" "verification-before-completion" \
    "AC-6.2: verification reminder injected"

  # AC-6.3: State file removed after Stop reads it
  if [ -f "$STATE_FILE" ]; then
    FAIL=$((FAIL + 1)); echo "  FAIL: AC-6.3: state file not removed after Stop"
  else
    PASS=$((PASS + 1)); echo "  PASS: AC-6.3: state file removed after Stop"
  fi

  # FR-8: State setter fires on Edit too
  SESSION_ID2="${SESSION_ID}-edit"
  STATE_FILE2="${TMPDIR:-/tmp}/sdd-state-${SESSION_ID2}.json"
  INPUT_E=$(make_state_input "$TMP" "$SESSION_ID2" "Edit")
  CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$STATE_SETTER" <<< "$INPUT_E" > /dev/null
  HAD2=$(jq -r '.had_writes' "$STATE_FILE2" 2>/dev/null || echo "false")
  assert_json_field "{\"had_writes\":$HAD2}" '.had_writes' "true" \
    "FR-8: had_writes true after Edit"
  rm -f "$STATE_FILE2"

  rm -rf "$TMP"
  summarize
  ```

---

## Parallel Group B: Verify All Tests Fail

*Prerequisite: T012–T017 complete. All tasks are independent.*

- [ ] **T018** `[P]` Verify T012 fails (session-start.sh not yet implemented):
  ```bash
  bash tests/hooks/test_session_start.sh
  ```
  Expected: error or FAIL — `session-start.sh: No such file`.

- [ ] **T019** `[P]` Verify T013 fails (pre-write-plan-gate.sh not yet implemented):
  ```bash
  bash tests/hooks/test_pre_write_plan_gate.sh
  ```
  Expected: error or FAIL — `pre-write-plan-gate.sh: No such file`.

- [ ] **T020** `[P]` Verify T014 fails (pre-write-tasks-gate.sh not yet implemented):
  ```bash
  bash tests/hooks/test_pre_write_tasks_gate.sh
  ```
  Expected: error or FAIL — `pre-write-tasks-gate.sh: No such file`.

- [ ] **T021** `[P]` Verify T015 fails (post-write-memory-validate.sh not yet implemented):
  ```bash
  bash tests/hooks/test_post_write_memory_validate.sh
  ```
  Expected: error or FAIL — `post-write-memory-validate.sh: No such file`.

- [ ] **T022** `[P]` Verify T016 fails (subagent-start.sh not yet implemented):
  ```bash
  bash tests/hooks/test_subagent_start.sh
  ```
  Expected: error or FAIL — `subagent-start.sh: No such file`.

- [ ] **T023** `[P]` Verify T017 fails (stop.sh and pre-write-edit-state.sh not yet implemented):
  ```bash
  bash tests/hooks/test_stop.sh
  ```
  Expected: error or FAIL — `pre-write-edit-state.sh: No such file`.

---

## Parallel Group C: Implement All Hook Scripts

*Prerequisite: T018–T023 complete. All tasks are independent — touch different files.*

- [ ] **T024** `[P]` Implement `scripts/hooks/session-start.sh`:
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail

  INPUT=$(cat)
  CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
  CWD="${CWD:-$PWD}"

  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  source "${SCRIPT_DIR}/lib/detect-active-spec.sh"

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

  if [ -f "${CWD}/memory/constitution.md" ]; then
    append_section "memory/constitution.md" "$(cat "${CWD}/memory/constitution.md")"
  fi

  if [ -f "${CWD}/memory/MEMORY.md" ]; then
    append_section "memory/MEMORY.md" "$(cat "${CWD}/memory/MEMORY.md")"
  fi

  ACTIVE_SPEC_DIR=$(detect_active_spec "$CWD")
  if [ -n "$ACTIVE_SPEC_DIR" ] && [ -f "${ACTIVE_SPEC_DIR}/spec.md" ]; then
    append_section "Active spec: ${ACTIVE_SPEC_DIR}/spec.md (first 50 lines)" \
      "$(head -50 "${ACTIVE_SPEC_DIR}/spec.md")"
  fi

  if [ -n "$ACTIVE_SPEC_DIR" ] && [ -f "${ACTIVE_SPEC_DIR}/tasks.md" ]; then
    OPEN=$(grep '^- \[ \]' "${ACTIVE_SPEC_DIR}/tasks.md" 2>/dev/null || true)
    [ -n "$OPEN" ] && append_section "Open tasks" "$OPEN"
  fi

  [ -n "$CONTEXT" ] || exit 0

  CONTEXT=$(printf '%s' "$CONTEXT" | head -c "$MAX_CHARS")

  jq -n --arg ctx "$CONTEXT" '{
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: $ctx
    }
  }'
  ```

- [ ] **T025** `[P]` Implement `scripts/hooks/pre-write-plan-gate.sh`:
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

  if [ ! -f "${SPEC_DIR}/spec.md" ]; then
    deny "SDD Gate: spec.md not found in ${SPEC_DIR}. Run sdd-specify first."
  fi

  if ! grep -qE '^\*\*Status:\*\* Approved' "${SPEC_DIR}/spec.md" 2>/dev/null; then
    deny "SDD Gate: spec.md exists but is not approved. Set Status: Approved in spec.md before planning."
  fi

  exit 0
  ```

- [ ] **T026** `[P]` Implement `scripts/hooks/pre-write-tasks-gate.sh`:
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

- [ ] **T027** `[P]` Implement `scripts/hooks/post-write-memory-validate.sh`:
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

  case "$FILE_PATH" in
    */memory/*.md) ;;
    *) exit 0 ;;
  esac

  [ -f "$FILE_PATH" ] || exit 0

  ISSUES=""
  add_issue() { ISSUES="${ISSUES}\n- $1"; }

  if ! grep -q '^---' "$FILE_PATH"; then
    add_issue "Missing YAML frontmatter. Add --- delimiters and required fields: name, description, metadata.type"
  else
    FRONTMATTER=$(awk 'BEGIN{p=0} /^---/{p++; if(p==2)exit; next} p==1{print}' "$FILE_PATH")
    echo "$FRONTMATTER" | grep -q '^name:' || add_issue "Missing 'name' field in frontmatter"
    echo "$FRONTMATTER" | grep -q '^description:' || add_issue "Missing 'description' field in frontmatter"
    echo "$FRONTMATTER" | grep -q 'type:' || \
      add_issue "Missing 'metadata.type' field in frontmatter (under metadata:)"

    NAME_SLUG=$(echo "$FRONTMATTER" | grep '^name:' | \
      sed "s/^name:[[:space:]]*//" | tr -d '"'"'")

    if [ -n "$NAME_SLUG" ]; then
      if [ ! -f "${CWD}/memory/MEMORY.md" ]; then
        add_issue "memory/MEMORY.md does not exist. Create it and add: \
  '- [Title]($(basename "$FILE_PATH")) — description'"
      elif ! grep -q "$NAME_SLUG" "${CWD}/memory/MEMORY.md"; then
        add_issue "Name slug '${NAME_SLUG}' not found in memory/MEMORY.md. \
  Add: '- [Title]($(basename "$FILE_PATH")) — one-line description'"
      fi
    fi
  fi

  [ -n "$ISSUES" ] || exit 0

  jq -n --arg issues "$(printf '%b' "$ISSUES")" '{
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: ("Memory file validation issues:\n" + $issues +
        "\n\nFix these before the session ends.")
    }
  }'
  ```

- [ ] **T028** `[P]` Implement `scripts/hooks/subagent-start.sh`:
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

  OBJECTIVE=$(awk '/^## (Objective|Problem Statement)/{p=1; count=0; next}
                   p && /^## /{exit}
                   p && count < 10 {print; count++}' \
                   "${ACTIVE_SPEC_DIR}/spec.md")

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

- [ ] **T029** `[P]` Implement `scripts/hooks/pre-write-edit-state.sh`:
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail

  INPUT=$(cat)
  CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
  CWD="${CWD:-$PWD}"
  SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  source "${SCRIPT_DIR}/lib/detect-active-spec.sh"

  detect_sdd_project "$CWD" || exit 0

  STATE_FILE="${TMPDIR:-/tmp}/sdd-state-${SESSION_ID}.json"
  printf '{"had_writes":true}' > "$STATE_FILE" 2>/dev/null || true

  exit 0
  ```

- [ ] **T030** `[P]` Implement `scripts/hooks/stop.sh`:
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail

  INPUT=$(cat)
  CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
  CWD="${CWD:-$PWD}"
  SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  source "${SCRIPT_DIR}/lib/detect-active-spec.sh"

  detect_sdd_project "$CWD" || exit 0

  STATE_FILE="${TMPDIR:-/tmp}/sdd-state-${SESSION_ID}.json"
  HAD_WRITES=false

  if [ -f "$STATE_FILE" ]; then
    HAD_WRITES=$(jq -r '.had_writes // false' "$STATE_FILE" 2>/dev/null || echo "false")
    rm -f "$STATE_FILE" 2>/dev/null || true
  fi

  [ "$HAD_WRITES" = "true" ] || exit 0

  jq -n '{
    hookSpecificOutput: {
      hookEventName: "Stop",
      additionalContext: "Session end checklist (writes occurred this session):\n1. Memory: Save any new learnings, decisions, or feedback to memory/ files now.\n2. Verification: Run verification-before-completion before claiming any work is done."
    }
  }'
  ```

---

## Parallel Group D: Verify All Tests Pass

*Prerequisite: T024–T030 complete. All tasks are independent.*

- [ ] **T031** `[P]` Verify AC-1.x pass — run session-start tests:
  ```bash
  bash tests/hooks/test_session_start.sh
  ```
  Expected: `Results: 5 passed, 0 failed`.
  Satisfies: AC-1.1 (constitution + MEMORY.md injected), AC-1.2 (spec summary), AC-1.3 (open tasks only), AC-1.4 (silent outside SDD).

- [ ] **T032** `[P]` Verify AC-2.x pass — run plan gate tests:
  ```bash
  bash tests/hooks/test_pre_write_plan_gate.sh
  ```
  Expected: `Results: 5 passed, 0 failed`.
  Satisfies: AC-2.1 (deny when no spec), AC-2.2 (deny when not approved), AC-2.3 (allow when approved).

- [ ] **T033** `[P]` Verify AC-3.x pass — run tasks gate tests:
  ```bash
  bash tests/hooks/test_pre_write_tasks_gate.sh
  ```
  Expected: `Results: 4 passed, 0 failed`.
  Satisfies: AC-3.1 (deny when no plan), AC-3.2 (allow when plan exists), AC-3.3 (silent for non-tasks.md).

- [ ] **T034** `[P]` Verify AC-4.x pass — run memory validation tests:
  ```bash
  bash tests/hooks/test_post_write_memory_validate.sh
  ```
  Expected: `Results: 5 passed, 0 failed`.
  Satisfies: AC-4.1 (frontmatter issues reported), AC-4.2 (MEMORY.md entry missing), AC-4.3 (silent when valid).

- [ ] **T035** `[P]` Verify AC-5.x pass — run subagent-start tests:
  ```bash
  bash tests/hooks/test_subagent_start.sh
  ```
  Expected: `Results: 3 passed, 0 failed`.
  Satisfies: AC-5.1 (spec title + path + objective injected), AC-5.2 (silent when no active spec).

- [ ] **T036** `[P]` Verify AC-6.x pass — run stop hook tests:
  ```bash
  bash tests/hooks/test_stop.sh
  ```
  Expected: `Results: 5 passed, 0 failed`.
  Satisfies: AC-6.1 (silent when no writes), AC-6.2 (reminders when writes occurred), AC-6.3 (state file reset).

- [ ] **T037** Commit all hook implementations:
  ```bash
  git add scripts/hooks/ tests/hooks/test_session_start.sh \
    tests/hooks/test_pre_write_plan_gate.sh \
    tests/hooks/test_pre_write_tasks_gate.sh \
    tests/hooks/test_post_write_memory_validate.sh \
    tests/hooks/test_subagent_start.sh \
    tests/hooks/test_stop.sh
  git commit -m "feat(011-plugin-hooks): implement all hook scripts (phases 2–7)"
  ```

---

## Sequential: Phase 8 — Hook Registration

*Prerequisite: T037 complete.*

- [ ] **T038** Write `tests/hooks/test_hooks_json.sh`:
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

  # Required events registered
  for event in SessionStart PreToolUse PostToolUse SubagentStart Stop; do
    HAS=$(jq --arg e "$event" 'has($e)' "$HOOKS_JSON")
    assert_json_field "{\"v\":$HAS}" '.v' "true" "Event $event registered"
  done

  # All scripts referenced exist
  while IFS= read -r script_path; do
    [ -n "$script_path" ] || continue
    FULL="${PLUGIN_ROOT}${script_path}"
    [ -f "$FULL" ]
    assert_exit_zero $? "Script exists: $script_path"
  done < <(jq -r '.. | objects | .command? // empty' "$HOOKS_JSON" \
             | sed "s|\${CLAUDE_PLUGIN_ROOT}||")

  # All hooks use type: command
  TYPES=$(jq -r '.. | objects | .type? // empty' "$HOOKS_JSON" | sort -u)
  assert_eq() {
    if [ "$1" = "$2" ]; then PASS=$((PASS+1)); echo "  PASS: $3"
    else FAIL=$((FAIL+1)); echo "  FAIL: $3 — expected '$2', got '$1'"; fi
  }
  assert_eq "$TYPES" "command" "FR-10: all hooks use type: command"

  summarize
  ```

- [ ] **T039** Verify T038 fails (hooks.json does not exist):
  ```bash
  bash tests/hooks/test_hooks_json.sh
  ```
  Expected: error — `hooks/hooks.json: No such file`.

- [ ] **T040** Implement `hooks/hooks.json`:
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

- [ ] **T041** Verify T038 now passes:
  ```bash
  bash tests/hooks/test_hooks_json.sh
  ```
  Expected: `Results: 8 passed, 0 failed`.

- [ ] **T042** Commit hooks registration:
  ```bash
  git add hooks/hooks.json tests/hooks/test_hooks_json.sh
  git commit -m "feat(011-plugin-hooks): add hooks/hooks.json — plugin hook registration"
  ```

---

## Sequential: Phase 9 — Integration Verification

*Prerequisite: T042 complete.*

- [ ] **T043** Make all scripts executable:
  ```bash
  chmod +x scripts/hooks/*.sh scripts/hooks/lib/*.sh \
    tests/hooks/*.sh tests/hooks/run_all.sh
  ```
  Expected: exit 0, no errors.

- [ ] **T044** Run full test suite — verify all 8 test files pass:
  ```bash
  bash tests/hooks/run_all.sh
  ```
  Expected output:
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

- [ ] **T045** Quickstart smoke test — plan gate manual verification:
  ```bash
  # Create temp SDD project without spec.md
  mkdir -p /tmp/sdd-smoke/docs/specs/001-test

  # Test plan gate denies write when spec.md missing
  echo '{"hook_event_name":"PreToolUse","session_id":"smoke","cwd":"/tmp/sdd-smoke",
        "tool_name":"Write","tool_input":{"file_path":"/tmp/sdd-smoke/docs/specs/001-test/plan.md"}}' \
    | CWD=/tmp/sdd-smoke bash scripts/hooks/pre-write-plan-gate.sh

  # Expected: JSON with permissionDecision: "deny" and "sdd-specify" in reason
  rm -rf /tmp/sdd-smoke
  ```
  Expected: `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"SDD Gate: spec.md not found..."}}`

- [ ] **T046** Quickstart smoke test — session start context injection:
  ```bash
  mkdir -p /tmp/sdd-smoke2/docs/specs /tmp/sdd-smoke2/memory
  echo "# Test Constitution" > /tmp/sdd-smoke2/memory/constitution.md

  echo '{"hook_event_name":"SessionStart","session_id":"smoke","cwd":"/tmp/sdd-smoke2"}' \
    | CWD=/tmp/sdd-smoke2 bash scripts/hooks/session-start.sh

  rm -rf /tmp/sdd-smoke2
  ```
  Expected: JSON with `additionalContext` containing `"Test Constitution"`.

- [ ] **T047** Final commit:
  ```bash
  git add -A
  git commit -m "feat(011-plugin-hooks): complete plugin hooks implementation"
  ```

---

## Task Summary

| Range | Phase | Can Parallelize? | Spec ACs Covered |
|-------|-------|-----------------|-----------------|
| T001–T005 | Group 0: Infrastructure setup | Yes (within group) | — |
| T006 | Group 0: Commit | No | — |
| T007–T011 | Phase 1: Shared library | No (sequential) | AC-1.4 (precondition) |
| T012–T017 | Group A: Write failing tests | Yes (within group) | — |
| T018–T023 | Group B: Verify tests fail | Yes (within group) | — |
| T024–T030 | Group C: Implement scripts | Yes (within group) | — |
| T031–T036 | Group D: Verify tests pass | Yes (within group) | AC-1.1–1.4, AC-2.1–2.3, AC-3.1–3.3, AC-4.1–4.3, AC-5.1–5.2, AC-6.1–6.3 |
| T037 | Group C/D: Commit | No | — |
| T038–T042 | Phase 8: Hook registration | No (sequential) | FR-10 |
| T043–T047 | Phase 9: Integration | No (sequential) | All ACs (full suite) |

**Total tasks:** 47
**Parallelizable tasks:** 28 (Groups 0, A, B, C, D — run 4–7 tasks concurrently)
**Estimated parallel speedup:** ~3x (sequential critical path: T006→T011→T018→T024→T037→T042→T047)
