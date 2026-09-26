#!/usr/bin/env bash
set -uo pipefail  # intentionally omits -e: tests call commands that return non-zero
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

LIB="$(cd "$SCRIPT_DIR/../.." && pwd)/scripts/hooks/lib/detect-active-spec.sh"

echo "--- test_lib.sh: detect-active-spec.sh ---"

TMP=$(mktemp -d)
mkdir -p "$TMP/docs/specs/001-test-feature"
mkdir -p "$TMP/docs/specs/002-another-feature"
touch "$TMP/docs/specs/001-test-feature/spec.md"
touch "$TMP/docs/specs/002-another-feature/spec.md"

source "$LIB"

# T1: SDD project detected when docs/specs exists
detect_sdd_project "$TMP"
assert_exit_zero $? "detect_sdd_project: returns 0 when docs/specs exists"

# T2: Not SDD project when docs/specs missing
TMP_NOSDD=$(mktemp -d)
detect_sdd_project "$TMP_NOSDD"
assert_exit_nonzero $? "detect_sdd_project: returns non-zero when docs/specs missing"

# T3: Active spec matched by branch name NNN prefix
RESULT=$(cd "$TMP" && git() { echo "001-test-feature"; }; export -f git; \
         CWD="$TMP" detect_active_spec "$TMP")
assert_contains "$RESULT" "001-test-feature" "detect_active_spec: matches branch NNN prefix to spec dir"

# T4: Fallback to most recently modified spec dir
touch -t 202001010000 "$TMP/docs/specs/001-test-feature/spec.md"
touch -t 202501010000 "$TMP/docs/specs/002-another-feature/spec.md"
RESULT=$(CWD="$TMP" detect_active_spec "$TMP")
assert_contains "$RESULT" "002-another-feature" "detect_active_spec: fallback returns most recently modified spec dir"

# T5: Empty when no spec dirs exist
TMP_EMPTY=$(mktemp -d)
mkdir -p "$TMP_EMPTY/docs/specs"
RESULT=$(CWD="$TMP_EMPTY" detect_active_spec "$TMP_EMPTY")
assert_empty "$RESULT" "detect_active_spec: returns empty when no spec dirs"

# T6: detect_active_spec returns empty when docs/specs dir does not exist
RESULT=$(CWD="$TMP_NOSDD" detect_active_spec "$TMP_NOSDD")
assert_empty "$RESULT" "detect_active_spec: returns empty when docs/specs dir missing"

rm -rf "$TMP" "$TMP_NOSDD" "$TMP_EMPTY"
summarize
