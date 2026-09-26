#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TOTAL_PASS=0; TOTAL_FAIL=0

shopt -s nullglob
for test_file in "$SCRIPT_DIR"/test_*.sh; do
  echo "=== $(basename "$test_file") ==="
  EXIT=0
  bash "$test_file" || EXIT=$?
  [[ $EXIT -eq 0 ]] && TOTAL_PASS=$((TOTAL_PASS + 1)) || TOTAL_FAIL=$((TOTAL_FAIL + 1))
  echo ""
done

echo "=== TOTAL: $TOTAL_PASS files passed, $TOTAL_FAIL files failed ==="
[[ "$TOTAL_FAIL" -eq 0 ]]
