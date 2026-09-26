#!/usr/bin/env bash
set -uo pipefail  # intentionally omits -e: tests call commands that return non-zero
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCRIPT="$PLUGIN_ROOT/scripts/hooks/pre-write-edit-state.sh"

echo "--- test_pre_write_edit_state.sh ---"

TMP=$(mktemp -d)
mkdir -p "$TMP/docs/specs"
SESSION_ID="test-edit-state-$$"
STATE_FILE="${TMPDIR:-/tmp}/sdd-state-${SESSION_ID}.json"

make_input() {
  local tool="${3:-Write}"
  jq -n --arg cwd "$1" --arg sid "$2" --arg tool "$tool" \
    '{"hook_event_name":"PreToolUse","session_id":$sid,"cwd":$cwd,
      "tool_name":$tool,"tool_input":{"file_path":"/tmp/x.md"}}'
}

# AC: silent outside SDD project (no docs/specs/)
TMP_NOSDD=$(mktemp -d)
INPUT=$(make_input "$TMP_NOSDD" "$SESSION_ID")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "pre-write-edit-state: silent outside SDD project"
rm -rf "$TMP_NOSDD"

# AC: no output on valid SDD project (hook only writes state, emits nothing)
rm -f "$STATE_FILE"
INPUT=$(make_input "$TMP" "$SESSION_ID" "Write")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "pre-write-edit-state: no stdout on SDD project Write"

# AC: state file written with had_writes=true after Write
assert_json_field "$(cat "$STATE_FILE" 2>/dev/null || echo '{}')" '.had_writes' "true" \
  "pre-write-edit-state: had_writes=true after Write"

# AC: state file written with had_writes=true after Edit too
SESSION_ID_EDIT="${SESSION_ID}-edit"
STATE_FILE_EDIT="${TMPDIR:-/tmp}/sdd-state-${SESSION_ID_EDIT}.json"
rm -f "$STATE_FILE_EDIT"
INPUT=$(make_input "$TMP" "$SESSION_ID_EDIT" "Edit")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "pre-write-edit-state: no stdout on SDD project Edit"
assert_json_field "$(cat "$STATE_FILE_EDIT" 2>/dev/null || echo '{}')" '.had_writes' "true" \
  "pre-write-edit-state: had_writes=true after Edit"

rm -f "$STATE_FILE" "$STATE_FILE_EDIT"
rm -rf "$TMP"
summarize
