# Implementation Plan: Feature 012 — Task and Plan Completion Marking

**Spec:** `docs/specs/012-task-plan-completion-marking/spec.md`
**Branch:** `012-task-plan-completion-marking`
**Status:** Draft

---

## Goal

Fix two infrastructure gaps in the SDD hook system:

1. **FR-1:** `sdd-execute` must mark each task `[x]` in `tasks.md` immediately after its subagent returns `DONE` or `DONE_WITH_CONCERNS`.
2. **FR-2:** A new `post-write-tasks-check.sh` PostToolUse hook must detect when all tasks are complete and inject an advisory to mark `plan.md` phase headings `[DONE]` and invoke `sdd-review`.
3. **FR-3:** `stop.sh` must output `{ "systemMessage": "..." }` instead of the invalid `{ "hookSpecificOutput": { ... } }` structure — the Stop event has no `hookSpecificOutput` in the Claude Code schema.

---

## Architecture

Three independent change groups, each touching distinct files with no shared state:

```
FR-3: stop.sh fix               FR-1: sdd-execute skill
       │                                │
       └──── scripts/hooks/stop.sh      └──── skills/sdd-execute/SKILL.md
             tests/hooks/test_stop.sh         skills/sdd-execute/reference.md
                                        
FR-2: new hook
       │
       └──── scripts/hooks/post-write-tasks-check.sh (new)
             tests/hooks/test_post_write_tasks_check.sh (new)
             hooks/hooks.json
```

All three phases can run in parallel — no shared files, no sequential dependency.

---

## Tech Stack

- **Runtime:** bash (existing — all other hooks use it)
- **JSON parsing:** `jq` (existing — all hooks use `jq`)
- **Hook detection library:** `scripts/hooks/lib/detect-active-spec.sh` (existing — reused by all hooks)
- **Test framework:** `tests/hooks/helpers.sh` (existing — `assert_empty`, `assert_contains`, `assert_json_field`, `assert_eq`, `summarize`)
- **Hook registration:** `hooks/hooks.json` (existing format)

---

## File Map

| File | Change | FR |
|------|--------|----|
| `scripts/hooks/stop.sh` | Replace `hookSpecificOutput` wrapper with top-level `systemMessage` | FR-3 |
| `tests/hooks/test_stop.sh` | Add AC-4.3 assertion: output has `systemMessage`, not `hookSpecificOutput` | FR-3 |
| `scripts/hooks/post-write-tasks-check.sh` | New PostToolUse hook | FR-2 |
| `tests/hooks/test_post_write_tasks_check.sh` | New test file for all FR-2 ACs | FR-2 |
| `hooks/hooks.json` | Register new hook under PostToolUse Write and Edit matchers | FR-2 |
| `skills/sdd-execute/SKILL.md` | Add task-marking step to Quick Reference status table | FR-1 |
| `skills/sdd-execute/reference.md` | Add explicit step 3b-1: mark task `[x]` after DONE before review | FR-1 |

---

## Phase 1: Fix stop.sh JSON Schema (FR-3)

**Files:** `scripts/hooks/stop.sh`, `tests/hooks/test_stop.sh`

### Step 1.1 — Add failing test for AC-4.3

In `tests/hooks/test_stop.sh`, add assertions after the existing AC-6.2 block:

```bash
# AC-4.3: output uses systemMessage not hookSpecificOutput
INPUT=$(make_stop_input "$TMP" "$SESSION_ID")
# Re-set state for fresh run
make_state_input "$TMP" "$SESSION_ID" "Write" | CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$STATE_SETTER" > /dev/null
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$STOP_SCRIPT" <<< "$INPUT")
HAS_SYS=$(echo "$OUTPUT" | jq 'has("systemMessage")' 2>/dev/null || echo "false")
assert_eq "$HAS_SYS" "true" "AC-4.3: output JSON has top-level systemMessage key"
HAS_HOOK=$(echo "$OUTPUT" | jq 'has("hookSpecificOutput")' 2>/dev/null || echo "false")
assert_eq "$HAS_HOOK" "false" "AC-4.3: output JSON has no hookSpecificOutput key"
```

Run tests — confirm AC-4.3 fails (RED).

```bash
bash tests/hooks/test_stop.sh
```

### Step 1.2 — Fix stop.sh

Replace the `jq -n '{...}'` block at the end of `scripts/hooks/stop.sh`:

**Before:**
```bash
jq -n '{
  hookSpecificOutput: {
    hookEventName: "Stop",
    additionalContext: "Session end checklist (writes occurred this session):\n1. Memory: Save any new learnings, decisions, or feedback to memory/ files now.\n2. Verification: Run verification-before-completion before claiming any work is done."
  }
}'
```

**After:**
```bash
jq -n '{
  systemMessage: "Session end checklist (writes occurred this session):\n1. Memory: Save any new learnings, decisions, or feedback to memory/ files now.\n2. Verification: Run verification-before-completion before claiming any work is done."
}'
```

### Step 1.3 — Verify all stop tests pass (GREEN)

```bash
bash tests/hooks/test_stop.sh
```

Expected output: all assertions pass including AC-4.3.

---

## Phase 2: Create post-write-tasks-check.sh Hook (FR-2)

**Files:** `scripts/hooks/post-write-tasks-check.sh` (new), `tests/hooks/test_post_write_tasks_check.sh` (new), `hooks/hooks.json`

### Step 2.1 — Write failing tests (RED)

Create `tests/hooks/test_post_write_tasks_check.sh`:

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCRIPT="$PLUGIN_ROOT/scripts/hooks/post-write-tasks-check.sh"

echo "--- test_post_write_tasks_check.sh ---"

TMP=$(mktemp -d)
mkdir -p "$TMP/docs/specs"

make_input() {
  jq -n --arg cwd "$1" --arg path "$2" --arg tool "$3" \
    '{"hook_event_name":"PostToolUse","session_id":"t1","cwd":$cwd,
      "tool_name":$tool,"tool_input":{"file_path":$path}}'
}

TASKS="$TMP/docs/specs/012-test/tasks.md"
mkdir -p "$(dirname "$TASKS")"

# AC-2.4: Non-tasks.md file → silent
echo "- [ ] task" > "$TMP/something.md"
INPUT=$(make_input "$TMP" "$TMP/something.md" "Write")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-2.4: non-tasks.md file → silent"

# AC-2.5: Non-SDD project → silent
TMP2=$(mktemp -d)
echo "- [ ] task" > "$TMP2/tasks.md"
INPUT=$(make_input "$TMP2" "$TMP2/tasks.md" "Write")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-2.5: non-SDD project (no docs/specs/) → silent"
rm -rf "$TMP2"

# AC-2.2: tasks.md has at least one [ ] remaining → silent
cat > "$TASKS" <<'EOF'
- [x] task 1
- [ ] task 2
- [x] task 3
EOF
INPUT=$(make_input "$TMP" "$TASKS" "Write")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-2.2: partial completion → silent"

# AC-2.3: tasks.md has no checkbox lines → silent
echo "# Just a heading" > "$TASKS"
INPUT=$(make_input "$TMP" "$TASKS" "Write")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-2.3: no checkbox lines → silent"

# AC-2.1: all tasks [x] → inject additionalContext
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

# AC-2.1 also fires on Edit (not just Write)
INPUT=$(make_input "$TMP" "$TASKS" "Edit")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_contains "$OUTPUT" "additionalContext" "AC-2.1: fires on Edit tool too"

rm -rf "$TMP"
summarize
```

Run — confirm all assertions fail (RED):
```bash
bash tests/hooks/test_post_write_tasks_check.sh
```

### Step 2.2 — Create post-write-tasks-check.sh (GREEN)

Create `scripts/hooks/post-write-tasks-check.sh`:

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

# Unchecked tasks remain — stay silent
grep -q '\[ \]' "$FILE_PATH" 2>/dev/null && exit 0

# No checkbox lines at all — stay silent
grep -qE '\[[ x]\]' "$FILE_PATH" 2>/dev/null || exit 0

# All tasks complete — inject advisory
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

Run tests — confirm all pass (GREEN):
```bash
bash tests/hooks/test_post_write_tasks_check.sh
```

### Step 2.3 — Register hook in hooks.json

In `hooks/hooks.json`, the new hook must fire on both Write and Edit PostToolUse events.

Add `post-write-tasks-check.sh` to the existing `PostToolUse → Write` hooks array, and add a new `PostToolUse → Edit` matcher:

**Before (PostToolUse section):**
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

### Step 2.4 — Run full test suite

```bash
bash tests/hooks/run_all.sh
```

All tests must pass with no regressions.

---

## Phase 3: Update sdd-execute Completion Marking (FR-1)

**Files:** `skills/sdd-execute/SKILL.md`, `skills/sdd-execute/reference.md`

### Step 3.1 — Update SKILL.md Quick Reference status table

In `skills/sdd-execute/SKILL.md`, the implementer status table currently reads:

```markdown
| Status | Action |
|--------|--------|
| DONE | Proceed to spec-compliance review |
| DONE_WITH_CONCERNS | Correctness concern → fix first; observational → proceed |
| NEEDS_CONTEXT | Provide context, re-dispatch |
| BLOCKED | Assess: context / model upgrade / split task / escalate |
```

Update the `DONE` and `DONE_WITH_CONCERNS` rows to include the task-marking step:

```markdown
| Status | Action |
|--------|--------|
| DONE | Mark task `[x]` in `tasks.md`, then proceed to spec-compliance review |
| DONE_WITH_CONCERNS | Mark task `[x]` in `tasks.md`; if correctness concern fix first; if observational proceed |
| NEEDS_CONTEXT | Provide context, re-dispatch |
| BLOCKED | Assess: context / model upgrade / split task / escalate |
```

### Step 3.2 — Update reference.md Step 3b with explicit marking step

In `skills/sdd-execute/reference.md`, Step 3b currently reads:

```markdown
**3b. Handle implementer status**

| Status | Action |
|--------|--------|
| DONE | Proceed to spec-compliance review |
| DONE_WITH_CONCERNS | Read concerns; if about correctness, address before review; if observational, proceed |
| NEEDS_CONTEXT | Provide missing context, re-dispatch same task |
| BLOCKED | Assess: context problem → provide context; wrong model → upgrade; task too large → split; plan wrong → escalate to human |
```

Replace with:

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

---

## Self-Review

**Spec coverage check:**

| FR | Plan coverage |
|----|---------------|
| FR-1: per-task completion marking in sdd-execute | Phase 3 — SKILL.md + reference.md |
| FR-2: post-write-tasks-check.sh hook | Phase 2 — new script + test + hook registration |
| FR-3: stop.sh systemMessage fix | Phase 1 — stop.sh edit + test update |
| AC-1.1: mark [x] after DONE before review | Phase 3, Step 3.2 explicit ordering |
| AC-1.2: mark [x] after DONE_WITH_CONCERNS | Phase 3, Step 3.2 table row |
| AC-1.3: leave [ ] for BLOCKED/NEEDS_CONTEXT | Phase 3, Step 3.2 constraints |
| AC-2.1: all-done → inject additionalContext | Phase 2, Step 2.2 happy path |
| AC-2.2: partial → silent | Phase 2, test + implementation |
| AC-2.3: no checkboxes → silent | Phase 2, test + implementation |
| AC-2.4: non-tasks.md → silent | Phase 2, case statement |
| AC-2.5: non-SDD project → silent | Phase 2, detect_sdd_project guard |
| AC-4.1: Stop with writes → systemMessage JSON | Phase 1 |
| AC-4.2: Stop with no writes → silent | Phase 1 (existing test, preserved) |
| AC-4.3: no hookSpecificOutput in Stop output | Phase 1, Step 1.1 new assertions |

**Placeholder scan:** None present.

**Type consistency:** All bash functions and variable names follow existing hook conventions (`FILE_PATH`, `CWD`, `INPUT`, `SCRIPT_DIR`).

**Parallelism:** All three phases are independent — Phase 1 + Phase 2 + Phase 3 can be dispatched concurrently.

---

## Execution Order

Phases 1, 2, and 3 are fully independent and can be dispatched in parallel:

```
Phase 1 (stop.sh fix)           ─┐
Phase 2 (new hook + test)        ├─ all parallel
Phase 3 (sdd-execute update)    ─┘
         │
         ▼
Full test suite: bash tests/hooks/run_all.sh
```
