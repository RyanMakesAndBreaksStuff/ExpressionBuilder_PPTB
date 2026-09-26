#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
CWD="${CWD:-$PWD}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/detect-active-spec.sh"

detect_sdd_project "$CWD" || exit 0

ACTIVE_SPEC_DIR=$(detect_active_spec "$CWD")
[[ -n "$ACTIVE_SPEC_DIR" ]] || exit 0
[[ -f "${ACTIVE_SPEC_DIR}/spec.md" ]] || exit 0

SPEC_TITLE=$(grep '^# ' "${ACTIVE_SPEC_DIR}/spec.md" | head -1 | sed 's/^# //')

OBJECTIVE=$(awk '/^## (Objective|Problem Statement)/{p=1; count=0; next}
                 p && /^## /{exit}
                 p && count < 10 {print; count++}' \
                 "${ACTIVE_SPEC_DIR}/spec.md")

CONTEXT="=== Active SDD Spec ===
Title: ${SPEC_TITLE}
Path: ${ACTIVE_SPEC_DIR}/spec.md

${OBJECTIVE}"

jq -n --arg ctx "$CONTEXT" '{
  hookSpecificOutput: {
    hookEventName: "SubagentStart",
    additionalContext: $ctx
  }
}'
