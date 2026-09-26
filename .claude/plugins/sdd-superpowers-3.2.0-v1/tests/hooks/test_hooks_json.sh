#!/usr/bin/env bash
set -uo pipefail  # intentionally omits -e: tests call commands that return non-zero
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
  HAS=$(jq --arg e "$event" '.hooks | has($e)' "$HOOKS_JSON")
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
assert_eq "$TYPES" "command" "FR-10: all hooks use type: command"

summarize
