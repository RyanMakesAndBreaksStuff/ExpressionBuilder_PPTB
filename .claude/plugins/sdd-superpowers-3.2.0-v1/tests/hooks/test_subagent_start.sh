#!/usr/bin/env bash
set -uo pipefail  # intentionally omits -e: tests call commands that return non-zero
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
if echo "$OUTPUT" | grep -qi "foundation\|constitution"; then
  FAIL=$((FAIL + 1)); echo "  FAIL: FR-7 must-not: memory context injected in subagent"
else
  PASS=$((PASS + 1)); echo "  PASS: FR-7 must-not: no memory context in subagent"
fi

rm -rf "$TMP" "$TMP_EMPTY"
summarize
