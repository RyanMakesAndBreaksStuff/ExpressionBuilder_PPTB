#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
CWD="${CWD:-$PWD}"
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/detect-active-spec.sh"

detect_sdd_project "$CWD" || exit 0

STATE_FILE="${TMPDIR:-/tmp}/sdd-state-${SESSION_ID}.json"
HAD_WRITES=false

if [ -f "$STATE_FILE" ]; then
  HAD_WRITES=$(jq -r '.had_writes // false' "$STATE_FILE" 2>/dev/null || echo "false")
  rm -f "$STATE_FILE" 2>/dev/null || true
fi

[[ "$HAD_WRITES" = "true" ]] || exit 0

jq -n '{
  systemMessage: "Session end — invoke session-wrap to capture memory and lessons:\n  - feedback: approach corrections or validations received this session?\n  - project: status, goal, or deadline changes?\n  - user: new preferences or expertise observed?\n  - reference: external resources encountered?\n\nVerification: run verification-before-completion before claiming any work is done."
}'
