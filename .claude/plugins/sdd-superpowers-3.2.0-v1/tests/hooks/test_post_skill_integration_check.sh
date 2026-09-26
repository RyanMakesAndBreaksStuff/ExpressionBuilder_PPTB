#!/usr/bin/env bash
set -uo pipefail  # intentionally omits -e: tests call commands that return non-zero
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCRIPT="$PLUGIN_ROOT/scripts/hooks/post-skill-integration-check.sh"

echo "--- test_post_skill_integration_check.sh ---"

TMP=$(mktemp -d)
mkdir -p "$TMP/docs/specs" "$TMP/.claude"

make_input() {
  jq -n --arg cwd "$1" --arg skill "$2" \
    '{"hook_event_name":"PostToolUse","session_id":"t1","cwd":$cwd,
      "tool_name":"Skill","tool_input":{"skill_name":$skill}}'
}

# AC-2.5: silent when no manifest file exists
INPUT=$(make_input "$TMP" "sdd-specify")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-2.5: silent when .claude/integrations.md missing"

# AC-2.5 / AC-5.2: silent when manifest has zero data rows (scaffolded empty manifest)
cat > "$TMP/.claude/integrations.md" <<'EOF'
# Custom Integrations

| Trigger Skill | Custom Skill | Purpose |
|---|---|---|
EOF
INPUT=$(make_input "$TMP" "sdd-specify")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-2.5: silent when manifest has zero data rows"

# AC-2.1: one matching row surfaces the custom skill and purpose
cat > "$TMP/.claude/integrations.md" <<'EOF'
# Custom Integrations

| Trigger Skill | Custom Skill | Purpose |
|---|---|---|
| sdd-specify | jira-ticket | Create a Jira ticket for the new feature spec |
EOF
INPUT=$(make_input "$TMP" "sdd-specify")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_contains "$OUTPUT" "jira-ticket" "AC-2.1: matched custom skill name in context"
assert_contains "$OUTPUT" "Create a Jira ticket for the new feature spec" "AC-2.1: matched purpose in context"
assert_json_field "$OUTPUT" ".hookSpecificOutput.hookEventName" "PostToolUse" "AC-2.1: correct hookEventName"

# AC-2.5: silent when Trigger Skill doesn't match the completed skill
INPUT=$(make_input "$TMP" "sdd-plan")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "AC-2.5: silent when no Trigger Skill row matches"

# AC-3.1: multiple rows sharing the same Trigger Skill are all surfaced
cat > "$TMP/.claude/integrations.md" <<'EOF'
# Custom Integrations

| Trigger Skill | Custom Skill | Purpose |
|---|---|---|
| sdd-review | confluence-update | Update the Confluence page with review outcomes |
| sdd-review | notify-team | Post a summary to the team channel |
EOF
INPUT=$(make_input "$TMP" "sdd-review")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_contains "$OUTPUT" "confluence-update" "AC-3.1: first matching skill surfaced"
assert_contains "$OUTPUT" "notify-team" "AC-3.1: second matching skill surfaced"

# Reliability: malformed row (missing a column) is skipped without crashing; well-formed row still matches
cat > "$TMP/.claude/integrations.md" <<'EOF'
# Custom Integrations

| Trigger Skill | Custom Skill | Purpose |
|---|---|---|
| sdd-execute | broken-row |
| sdd-execute | deploy-notify | Notify ops channel after implementation |
EOF
INPUT=$(make_input "$TMP" "sdd-execute")
EXIT_CODE=0
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT") || EXIT_CODE=$?
assert_exit_zero "$EXIT_CODE" "Reliability: malformed row does not crash the hook"
assert_contains "$OUTPUT" "deploy-notify" "Reliability: well-formed row still matches despite malformed sibling"

# Documented limitation: a literal "|" in Purpose (unescaped GFM pipe) truncates
# the value at that pipe instead of crashing — this is a known, documented boundary
# (see sdd-integrations/SKILL.md Constraints), not a regression risk to silently worsen.
cat > "$TMP/.claude/integrations.md" <<'EOF'
# Custom Integrations

| Trigger Skill | Custom Skill | Purpose |
|---|---|---|
| sdd-review | pipe-purpose | Notify #eng | urgent flag set |
EOF
INPUT=$(make_input "$TMP" "sdd-review")
EXIT_CODE=0
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT") || EXIT_CODE=$?
assert_exit_zero "$EXIT_CODE" "Documented limitation: literal pipe in Purpose does not crash the hook"
assert_contains "$OUTPUT" "pipe-purpose" "Documented limitation: custom skill name still matched despite pipe in Purpose"

# Negative path: silent outside an SDD project (no docs/specs/)
TMP_NON_SDD=$(mktemp -d)
mkdir -p "$TMP_NON_SDD/.claude"
cat > "$TMP_NON_SDD/.claude/integrations.md" <<'EOF'
# Custom Integrations

| Trigger Skill | Custom Skill | Purpose |
|---|---|---|
| sdd-specify | jira-ticket | Create a Jira ticket |
EOF
INPUT=$(make_input "$TMP_NON_SDD" "sdd-specify")
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
assert_empty "$OUTPUT" "Negative path: silent outside an SDD project (no docs/specs/)"

rm -rf "$TMP" "$TMP_NON_SDD"
summarize
