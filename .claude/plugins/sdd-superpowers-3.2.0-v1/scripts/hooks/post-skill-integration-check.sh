#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
CWD="${CWD:-$PWD}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/detect-active-spec.sh"

detect_sdd_project "$CWD" || exit 0

SKILL_NAME=$(echo "$INPUT" | jq -r '.tool_input.skill_name // empty')
[[ -n "$SKILL_NAME" ]] || exit 0

MANIFEST="${CWD}/.claude/integrations.md"
[[ -f "$MANIFEST" ]] || exit 0

MATCHES=$(awk -F'|' -v skill="$SKILL_NAME" '
  /^\|/ {
    col1=$2; gsub(/^[ \t]+|[ \t]+$/, "", col1)
    if (col1 == "" || col1 == "Trigger Skill" || col1 ~ /^-+$/) next
    if (NF < 5) next
    col2=$3; gsub(/^[ \t]+|[ \t]+$/, "", col2)
    col3=$4; gsub(/^[ \t]+|[ \t]+$/, "", col3)
    if (col1 == skill) print col2 "\t" col3
  }
' "$MANIFEST")

[[ -n "$MATCHES" ]] || exit 0

CONTEXT="Custom integration(s) registered for '${SKILL_NAME}' in .claude/integrations.md — announce and confirm with the user before invoking each one, individually:
"
while IFS=$'\t' read -r custom_skill purpose; do
  CONTEXT="${CONTEXT}
- Skill: ${custom_skill} — Purpose: ${purpose}"
done <<< "$MATCHES"

jq -n --arg ctx "$CONTEXT" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: $ctx
  }
}'
