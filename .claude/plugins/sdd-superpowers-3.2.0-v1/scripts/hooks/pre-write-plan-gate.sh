#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
CWD="${CWD:-$PWD}"
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/detect-active-spec.sh"

detect_sdd_project "$CWD" || exit 0

case "$FILE_PATH" in
  */docs/specs/*/plan.md) ;;
  *) exit 0 ;;
esac

SPEC_DIR=$(dirname "$FILE_PATH")

deny() {
  jq -n --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

if [[ ! -f "${SPEC_DIR}/spec.md" ]]; then
  deny "SDD Gate: spec.md not found in ${SPEC_DIR}. Run sdd-specify first."
fi

# SDD spec templates use Markdown bold: **Status:** Approved
if ! grep -qE '^\*\*Status:\*\* Approved' "${SPEC_DIR}/spec.md" 2>/dev/null; then
  deny "SDD Gate: spec.md exists but is not approved. Set Status: Approved in spec.md before planning."
fi

exit 0
