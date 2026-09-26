#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
CWD="${CWD:-$PWD}"
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/detect-active-spec.sh"

detect_sdd_project "$CWD" || exit 0

# Resolve bare relative paths against CWD so file existence checks work correctly
case "$FILE_PATH" in
  /*) ;;
  *) FILE_PATH="${CWD}/${FILE_PATH}" ;;
esac

case "$FILE_PATH" in
  .claude/memory/*.md|*/.claude/memory/*.md) ;;
  *) exit 0 ;;
esac

case "$FILE_PATH" in
  .claude/memory/foundation.md|*/.claude/memory/foundation.md|\
  .claude/memory/MEMORY.md|*/.claude/memory/MEMORY.md|\
  .claude/memory/steering/*.md|*/.claude/memory/steering/*.md) exit 0 ;;
esac

[[ -f "$FILE_PATH" ]] || exit 0

ISSUES=""
add_issue() { ISSUES="${ISSUES}\n- $1"; }

if ! grep -q '^---' "$FILE_PATH"; then
  add_issue "Missing YAML frontmatter. Add --- delimiters and required fields: name, description, metadata.type"
else
  FRONTMATTER=$(awk 'BEGIN{p=0} /^---/{p++; if(p==2)exit; next} p==1{print}' "$FILE_PATH")
  FNAME=$(basename "$FILE_PATH")
  echo "$FRONTMATTER" | grep -q '^name:' || \
    add_issue ".claude/memory/${FNAME} is missing the 'name' field in frontmatter"
  echo "$FRONTMATTER" | grep -q '^description:' || \
    add_issue ".claude/memory/${FNAME} is missing the 'description' field in frontmatter"
  echo "$FRONTMATTER" | grep -q 'type:' || \
    add_issue ".claude/memory/${FNAME} is missing the 'metadata.type' field in frontmatter (under metadata:)"

  NAME_SLUG=$(echo "$FRONTMATTER" | grep '^name:' | \
    sed "s/^name:[[:space:]]*//" | tr -d '"'"'")

  if [ -n "$NAME_SLUG" ]; then
    if [[ ! -f "${CWD}/.claude/memory/MEMORY.md" ]]; then
      add_issue ".claude/memory/MEMORY.md does not exist. Create it and add: '- [Title]($(basename "$FILE_PATH")) — description'"
    elif ! grep -q "$NAME_SLUG" "${CWD}/.claude/memory/MEMORY.md"; then
      add_issue "Name slug '${NAME_SLUG}' not found in .claude/memory/MEMORY.md. Add: '- [Title]($(basename "$FILE_PATH")) — one-line description'"
    fi
  fi
fi

[[ -n "$ISSUES" ]] || exit 0

jq -n --arg issues "$(printf '%b' "$ISSUES")" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: ("Memory file validation issues:\n" + $issues +
      "\n\nFix these before the session ends.")
  }
}'
