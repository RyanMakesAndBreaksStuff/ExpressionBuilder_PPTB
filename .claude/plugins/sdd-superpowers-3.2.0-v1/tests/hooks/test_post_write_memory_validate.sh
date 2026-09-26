#!/usr/bin/env bash
set -uo pipefail  # intentionally omits -e: tests call commands that return non-zero
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCRIPT="$PLUGIN_ROOT/scripts/hooks/post-write-memory-validate.sh"

echo "--- test_post_write_memory_validate.sh ---"

TMP=$(mktemp -d)
mkdir -p "$TMP/docs/specs" "$TMP/.claude/memory"

make_input() {
  jq -n --arg cwd "$1" --arg path "$2" \
    '{"hook_event_name":"PostToolUse","session_id":"t1","cwd":$cwd,
      "tool_name":"Write","tool_input":{"file_path":$path}}'
}

# AC-3.1: validate when frontmatter missing
echo "# No frontmatter" > "$TMP/.claude/memory/bad.md"
INPUT=$(make_input "$TMP" "$TMP/.claude/memory/bad.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_contains "$OUTPUT" "frontmatter" "AC-3.1: mentions missing frontmatter"

# AC-3.1: validate when required fields missing
cat > "$TMP/.claude/memory/partial.md" <<'PARTIAL'
---
name: partial-test
---
# Body
PARTIAL
INPUT=$(make_input "$TMP" "$TMP/.claude/memory/partial.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_contains "$OUTPUT" "description" "AC-3.1: mentions missing description"
assert_contains "$OUTPUT" "type" "AC-3.1: mentions missing metadata.type"

# AC-3.1: validate when slug not in MEMORY.md
cat > "$TMP/.claude/memory/valid.md" <<'VALID'
---
name: valid-memory
description: A test memory
metadata:
  type: feedback
---
# Valid memory
VALID
echo "# Memory Index" > "$TMP/.claude/memory/MEMORY.md"
INPUT=$(make_input "$TMP" "$TMP/.claude/memory/valid.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_contains "$OUTPUT" "MEMORY.md" "AC-3.1: mentions MEMORY.md entry needed"

# AC-3.1: silent when valid and indexed
echo "- [valid-memory](valid.md) — test" >> "$TMP/.claude/memory/MEMORY.md"
INPUT=$(make_input "$TMP" "$TMP/.claude/memory/valid.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-3.1: silent when valid and indexed"

# AC-3.2: silent for writes outside .claude/memory/
INPUT=$(make_input "$TMP" "$TMP/docs/specs/001-test/spec.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-3.2: silent for non-.claude/memory/ writes"

# AC-3.3 whitelist: foundation.md silenced
echo "# Foundation" > "$TMP/.claude/memory/foundation.md"
INPUT=$(make_input "$TMP" "$TMP/.claude/memory/foundation.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-3.3: silent for foundation.md"

# AC-3.3 whitelist: MEMORY.md silenced
echo "# Memory" > "$TMP/.claude/memory/MEMORY.md"
INPUT=$(make_input "$TMP" "$TMP/.claude/memory/MEMORY.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-3.3: silent for MEMORY.md"

# AC-3.3 whitelist: steering file silenced
mkdir -p "$TMP/.claude/memory/steering"
echo "# Tech Stack" > "$TMP/.claude/memory/steering/tech-stack.md"
INPUT=$(make_input "$TMP" "$TMP/.claude/memory/steering/tech-stack.md")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-3.3: silent for steering file"

# AC-3.1 relative path: validate when file_path is bare relative (no leading /)
# Claude Code may pass .claude/memory/foo.md without an absolute prefix
echo "# No frontmatter" > "$TMP/.claude/memory/relative_bad.md"
INPUT=$(make_input "$TMP" ".claude/memory/relative_bad.md")
OUTPUT=$(CWD="$TMP" CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_contains "$OUTPUT" "frontmatter" "AC-3.1 relative path: validates bare .claude/memory/ path"

# AC-3.3 whitelist relative path: foundation.md silenced with bare relative path
INPUT=$(make_input "$TMP" ".claude/memory/foundation.md")
OUTPUT=$(CWD="$TMP" CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-3.3 relative path: silent for foundation.md with bare relative path"

# AC-3.3 whitelist relative path: steering file silenced with bare relative path
INPUT=$(make_input "$TMP" ".claude/memory/steering/tech-stack.md")
OUTPUT=$(CWD="$TMP" CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-3.3 relative path: silent for steering file with bare relative path"

rm -rf "$TMP"
summarize
