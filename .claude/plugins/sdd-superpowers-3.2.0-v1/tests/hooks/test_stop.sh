#!/usr/bin/env bash
set -uo pipefail  # intentionally omits -e: tests call commands that return non-zero
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

# FR-8: State setter fires on Edit too
SESSION_ID2="${SESSION_ID}-edit"
STATE_FILE2="${TMPDIR:-/tmp}/sdd-state-${SESSION_ID2}.json"
INPUT_E=$(make_state_input "$TMP" "$SESSION_ID2" "Edit")
CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$STATE_SETTER" <<< "$INPUT_E" > /dev/null
HAD2=$(jq -r '.had_writes' "$STATE_FILE2" 2>/dev/null || echo "false")
assert_json_field "{\"had_writes\":$HAD2}" '.had_writes' "true" \
  "FR-8: had_writes true after Edit"
rm -f "$STATE_FILE2"

# AC-4.1: stop message lists all four memory types
SESSION_ID_41="${SESSION_ID}-ac41"
STATE_FILE_41="${TMPDIR:-/tmp}/sdd-state-${SESSION_ID_41}.json"
INPUT_W41=$(make_state_input "$TMP" "$SESSION_ID_41" "Write")
CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$STATE_SETTER" <<< "$INPUT_W41" > /dev/null
INPUT41=$(make_stop_input "$TMP" "$SESSION_ID_41")
OUTPUT41=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$STOP_SCRIPT" <<< "$INPUT41")
MSG41=$(echo "$OUTPUT41" | jq -r '.systemMessage // empty')
assert_contains "$MSG41" "feedback" \
  "AC-4.1: stop message mentions feedback type"
assert_contains "$MSG41" "project" \
  "AC-4.1: stop message mentions project type"
assert_contains "$MSG41" "user" \
  "AC-4.1: stop message mentions user type"
assert_contains "$MSG41" "reference" \
  "AC-4.1: stop message mentions reference type"

# AC-4.2: stop message names session-wrap skill
assert_contains "$MSG41" "session-wrap" \
  "AC-4.2: stop message names session-wrap skill"

rm -rf "$TMP"

summarize
