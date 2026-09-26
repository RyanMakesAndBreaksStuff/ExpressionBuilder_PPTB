#!/usr/bin/env bash
set -uo pipefail  # intentionally omits -e: tests call commands that return non-zero
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
