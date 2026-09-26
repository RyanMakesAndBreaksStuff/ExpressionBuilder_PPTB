#!/usr/bin/env bash
set -uo pipefail  # intentionally omits -e: tests call commands that return non-zero
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
cat > "$TMP/docs/specs/011-plugin-hooks/spec.md" <<'SPEC'
# Feature 011: Plugin Hooks
**Status:** Approved
## Problem Statement
Test spec content line 3
SPEC
INPUT=$(jq -n --arg cwd "$TMP" \
  '{"hook_event_name":"SessionStart","session_id":"t1","cwd":$cwd}')

# AC-2.1: foundation.md and MEMORY.md injected from .claude/memory/
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" CWD="$TMP" bash "$SCRIPT" <<< "$INPUT")
assert_contains "$OUTPUT" "Foundation content" "AC-2.1: foundation.md injected from .claude/memory/"
assert_contains "$OUTPUT" "Memory" "AC-2.1: MEMORY.md injected from .claude/memory/"

# active spec summary injected
OUTPUT=$(cd "$TMP" && git() { echo "011-plugin-hooks"; }; export -f git; \
         CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" CWD="$TMP" bash "$SCRIPT" <<< "$INPUT")
assert_contains "$OUTPUT" "Feature 011" "spec.md first 50 lines injected"

# AC-2.2: silent outside SDD project
TMP_NOSDD=$(mktemp -d)
INPUT_NOSDD=$(jq -n --arg cwd "$TMP_NOSDD" \
  '{"hook_event_name":"SessionStart","session_id":"t1","cwd":$cwd}')
OUTPUT_NOSDD=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT_NOSDD")
assert_empty "$OUTPUT_NOSDD" "AC-2.2: no output outside SDD project"

rm -rf "$TMP" "$TMP_NOSDD"
summarize
