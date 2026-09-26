# Tasks: Feature 012 — Task and Plan Completion Marking

**Spec:** `docs/specs/012-task-plan-completion-marking/spec.md`
**Plan:** `docs/specs/012-task-plan-completion-marking/plan.md`
**Branch:** `012-task-plan-completion-marking`

---

## Parallel Group A — can run in parallel (all touch different files)

> Phase 1 (stop.sh fix), Phase 2 (new hook), and Phase 3 (sdd-execute update) are fully independent.

---

### Phase 1: Fix stop.sh JSON Schema (FR-3)

- [ ] **T001** Add failing AC-4.3 assertions to `tests/hooks/test_stop.sh`

  In `tests/hooks/test_stop.sh`, after the existing `AC-6.3` block (state file removed), add:

  ```bash
  # AC-4.3: output uses top-level systemMessage, not hookSpecificOutput
  SESSION_ID_43="${SESSION_ID}-ac43"
  STATE_FILE_43="${TMPDIR:-/tmp}/sdd-state-${SESSION_ID_43}.json"
  INPUT_W43=$(make_state_input "$TMP" "$SESSION_ID_43" "Write")
  CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$STATE_SETTER" <<< "$INPUT_W43" > /dev/null
  INPUT43=$(make_stop_input "$TMP" "$SESSION_ID_43")
  OUTPUT43=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$STOP_SCRIPT" <<< "$INPUT43")
  HAS_SYS=$(echo "$OUTPUT43" | jq 'has("systemMessage")' 2>/dev/null || echo "false")
  assert_eq "$HAS_SYS" "true" "AC-4.3: output JSON has top-level systemMessage key"
  HAS_HOOK=$(echo "$OUTPUT43" | jq 'has("hookSpecificOutput")' 2>/dev/null || echo "false")
  assert_eq "$HAS_HOOK" "false" "AC-4.3: output JSON has no hookSpecificOutput key"
  ```

- [ ] **T002** Run test_stop.sh — confirm AC-4.3 FAILS (RED)

  ```bash
  bash tests/hooks/test_stop.sh
  ```

  Expected: existing AC-6.x tests pass; AC-4.3 assertions FAIL with `expected 'true', got 'false'` for `systemMessage`.

- [ ] **T003** Fix `scripts/hooks/stop.sh` — replace `hookSpecificOutput` with `systemMessage`

  In `scripts/hooks/stop.sh`, replace the final `jq -n '{...}'` block:

  **Remove:**
  ```bash
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "Stop",
      additionalContext: "Session end checklist (writes occurred this session):\n1. Memory: Save any new learnings, decisions, or feedback to memory/ files now.\n2. Verification: Run verification-before-completion before claiming any work is done."
    }
  }'
  ```

  **Replace with:**
  ```bash
  jq -n '{
    systemMessage: "Session end checklist (writes occurred this session):\n1. Memory: Save any new learnings, decisions, or feedback to memory/ files now.\n2. Verification: Run verification-before-completion before claiming any work is done."
  }'
  ```

- [ ] **T004** Run test_stop.sh — confirm all assertions pass (GREEN)

  ```bash
  bash tests/hooks/test_stop.sh
  ```

  Expected: all assertions pass including `AC-4.3: output JSON has top-level systemMessage key` and `AC-4.3: output JSON has no hookSpecificOutput key`.

- [ ] **T005** Commit Phase 1

  ```bash
  git add scripts/hooks/stop.sh tests/hooks/test_stop.sh
  git commit -m "fix(hooks): use systemMessage for Stop event JSON output

  The Stop hook was emitting hookSpecificOutput which is not valid in
  the Claude Code schema for Stop events. Replace with top-level
  systemMessage field so the session-end reminder is actually delivered.

  Closes AC-4.1, AC-4.2, AC-4.3 from spec-012."
  ```

---

### Phase 2: Create post-write-tasks-check.sh Hook (FR-2)

- [ ] **T006** Create `tests/hooks/test_post_write_tasks_check.sh` with all AC-2.x tests

  Create the file `tests/hooks/test_post_write_tasks_check.sh` with this exact content:

  ```bash
  #!/usr/bin/env bash
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  source "$SCRIPT_DIR/helpers.sh"
  PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
  SCRIPT="$PLUGIN_ROOT/scripts/hooks/post-write-tasks-check.sh"

  echo "--- test_post_write_tasks_check.sh ---"

  TMP=$(mktemp -d)
  mkdir -p "$TMP/docs/specs/012-test"

  make_input() {
    jq -n --arg cwd "$1" --arg path "$2" --arg tool "$3" \
      '{"hook_event_name":"PostToolUse","session_id":"t1","cwd":$cwd,
        "tool_name":$tool,"tool_input":{"file_path":$path}}'
  }

  TASKS="$TMP/docs/specs/012-test/tasks.md"

  # AC-2.4: non-tasks.md file → silent
  echo "- [ ] task" > "$TMP/something.md"
  INPUT=$(make_input "$TMP" "$TMP/something.md" "Write")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "AC-2.4: non-tasks.md file → silent"

  # AC-2.5: non-SDD project (no docs/specs/) → silent
  TMP2=$(mktemp -d)
  echo "- [ ] task" > "$TMP2/tasks.md"
  INPUT=$(make_input "$TMP2" "$TMP2/tasks.md" "Write")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "AC-2.5: non-SDD project → silent"
  rm -rf "$TMP2"

  # AC-2.2: at least one [ ] remains → silent
  cat > "$TASKS" <<'EOF'
  - [x] task 1
  - [ ] task 2
  - [x] task 3
  EOF
  INPUT=$(make_input "$TMP" "$TASKS" "Write")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "AC-2.2: partial completion → silent"

  # AC-2.3: no checkbox lines → silent
  echo "# Just a heading" > "$TASKS"
  INPUT=$(make_input "$TMP" "$TASKS" "Write")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "AC-2.3: no checkbox lines → silent"

  # AC-2.1: all tasks [x] → inject additionalContext (Write)
  cat > "$TASKS" <<'EOF'
  - [x] task 1
  - [x] task 2
  - [x] task 3
  EOF
  INPUT=$(make_input "$TMP" "$TASKS" "Write")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_contains "$OUTPUT" "additionalContext" "AC-2.1: all-done injects additionalContext"
  assert_contains "$OUTPUT" "plan.md" "AC-2.1: reminder mentions plan.md"
  assert_contains "$OUTPUT" "sdd-review" "AC-2.1: reminder mentions sdd-review"

  # AC-2.1: fires on Edit tool too
  INPUT=$(make_input "$TMP" "$TASKS" "Edit")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_contains "$OUTPUT" "additionalContext" "AC-2.1: fires on Edit tool too"

  rm -rf "$TMP"
  summarize
  ```

- [ ] **T007** Run test_post_write_tasks_check.sh — confirm all assertions FAIL (RED)

  ```bash
  bash tests/hooks/test_post_write_tasks_check.sh
  ```

  Expected: script not found error or all assertions fail — the hook script does not exist yet.

- [ ] **T008** Create `scripts/hooks/post-write-tasks-check.sh`

  Create `scripts/hooks/post-write-tasks-check.sh` with this exact content:

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
    */tasks.md) ;;
    *) exit 0 ;;
  esac

  [ -f "$FILE_PATH" ] || exit 0

  grep -q '\[ \]' "$FILE_PATH" 2>/dev/null && exit 0

  grep -qE '\[[ x]\]' "$FILE_PATH" 2>/dev/null || exit 0

  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: "All tasks in tasks.md are complete.\n\nNext steps:\n1. Add [DONE] inline to each completed phase heading in plan.md\n   Example: \"## Phase 1: Foundation\" → \"## Phase 1: Foundation [DONE]\"\n2. Invoke sdd-review Mode B to validate spec-implementation alignment."
    }
  }'
  ```

  Make it executable:

  ```bash
  chmod +x scripts/hooks/post-write-tasks-check.sh
  ```

- [ ] **T009** Run test_post_write_tasks_check.sh — confirm all assertions pass (GREEN)

  ```bash
  bash tests/hooks/test_post_write_tasks_check.sh
  ```

  Expected: 6/6 assertions pass.

- [ ] **T010** Register new hook in `hooks/hooks.json`

  Edit `hooks/hooks.json`. Replace the `PostToolUse` section:

  **Before:**
  ```json
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
  ]
  ```

  **After:**
  ```json
  "PostToolUse": [
    {
      "matcher": "Write",
      "hooks": [
        {
          "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/post-write-memory-validate.sh",
          "timeout": 5
        },
        {
          "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/post-write-tasks-check.sh",
          "timeout": 5
        }
      ]
    },
    {
      "matcher": "Edit",
      "hooks": [
        {
          "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/post-write-tasks-check.sh",
          "timeout": 5
        }
      ]
    }
  ]
  ```

- [ ] **T011** Run full test suite — confirm no regressions

  ```bash
  bash tests/hooks/run_all.sh
  ```

  Expected: all test files pass, `TOTAL: N files passed, 0 files failed`.

- [ ] **T012** Commit Phase 2

  ```bash
  git add scripts/hooks/post-write-tasks-check.sh tests/hooks/test_post_write_tasks_check.sh hooks/hooks.json
  git commit -m "feat(hooks): add post-write-tasks-check hook for all-tasks-done detection

  New PostToolUse hook fires after Write/Edit to tasks.md. When all
  task checkboxes are [x], injects an advisory context to mark plan.md
  phase headings [DONE] and invoke sdd-review Mode B. Silent in all
  other cases (partial completion, no checkboxes, non-SDD project,
  non-tasks.md file).

  Closes AC-2.1 through AC-2.5 from spec-012."
  ```

---

### Phase 3: Update sdd-execute Completion Marking (FR-1)

- [ ] **T013** Update status table in `skills/sdd-execute/SKILL.md`

  In `skills/sdd-execute/SKILL.md`, find the implementer status handling table:

  ```markdown
  | DONE | Proceed to spec-compliance review |
  | DONE_WITH_CONCERNS | Correctness concern → fix first; observational → proceed |
  ```

  Replace those two rows with:

  ```markdown
  | DONE | Mark task `[x]` in `tasks.md`, then proceed to spec-compliance review |
  | DONE_WITH_CONCERNS | Mark task `[x]` in `tasks.md`; if correctness concern fix first; if observational proceed |
  ```

- [ ] **T014** Verify SKILL.md change is correct

  Read `skills/sdd-execute/SKILL.md` and confirm:
  - The `DONE` row now says "Mark task `[x]` in `tasks.md`, then proceed to spec-compliance review"
  - The `DONE_WITH_CONCERNS` row mentions marking `[x]` before addressing concerns
  - `NEEDS_CONTEXT` and `BLOCKED` rows are unchanged (no `[x]` marking for those)

- [ ] **T015** Update `skills/sdd-execute/reference.md` Step 3b with explicit step 3b-1

  In `skills/sdd-execute/reference.md`, find the Step 3b status table block (the table with DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED rows plus "Never ignore BLOCKED").

  Replace the entire Step 3b block with:

  ```markdown
  **3b. Handle implementer status**

  | Status | Action |
  |--------|--------|
  | DONE | **Mark `[x]` in tasks.md (step 3b-1), then** proceed to spec-compliance review |
  | DONE_WITH_CONCERNS | **Mark `[x]` in tasks.md (step 3b-1);** if correctness concern, address before review; if observational, proceed |
  | NEEDS_CONTEXT | Provide missing context, re-dispatch same task |
  | BLOCKED | Assess: context problem → provide context; wrong model → upgrade; task too large → split; plan wrong → escalate to human |

  Never ignore BLOCKED. Never force retry without changing something.

  **3b-1. Mark task complete in tasks.md**

  Immediately after a subagent returns `DONE` or `DONE_WITH_CONCERNS` — before spec-compliance review — edit `tasks.md`:

  Find the line for the task that just completed. Edit its checkbox from `[ ]` to `[x]`.

  ```
  - [ ] Task N: Description   →   - [x] Task N: Description
  ```

  Constraints:
  - Edit only the one task line that just completed
  - Do not modify any other task lines
  - Do not mark a task `[x]` speculatively before the subagent result is known
  - If the subagent returns `NEEDS_CONTEXT` or `BLOCKED`, leave the line as `[ ]`
  ```

- [ ] **T016** Verify reference.md change is correct

  Read `skills/sdd-execute/reference.md` and confirm:
  - Step 3b table rows for DONE and DONE_WITH_CONCERNS reference step 3b-1
  - Step 3b-1 block exists immediately after the table
  - Step 3b-1 lists all four constraints (only completed task, no others, no speculation, BLOCKED/NEEDS_CONTEXT leave `[ ]`)
  - All other steps (3a, 3c, 3d, 3e, 3f) are unchanged

- [ ] **T017** Commit Phase 3

  ```bash
  git add skills/sdd-execute/SKILL.md skills/sdd-execute/reference.md
  git commit -m "feat(sdd-execute): mark task [x] in tasks.md after subagent returns DONE

  Add explicit step 3b-1 to the sdd-execute per-task loop: immediately
  after a subagent returns DONE or DONE_WITH_CONCERNS, edit tasks.md to
  flip that task's [ ] to [x] before spec-compliance review begins.
  Tasks remain [ ] when the subagent returns BLOCKED or NEEDS_CONTEXT.

  Closes AC-1.1, AC-1.2, AC-1.3 from spec-012."
  ```

---

## Final Verification

- [ ] **T018** Run full test suite and confirm all tests pass

  ```bash
  bash tests/hooks/run_all.sh
  ```

  Expected: `TOTAL: N files passed, 0 files failed` with no regressions across all hook tests.
