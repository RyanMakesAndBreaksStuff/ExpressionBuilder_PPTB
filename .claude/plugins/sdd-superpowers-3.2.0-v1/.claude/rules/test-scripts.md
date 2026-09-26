# Hook Test Script Rules

✓ Every test file must `source "$SCRIPT_DIR/helpers.sh"` as its first non-shebang line.
✓ Each assertion must carry a string label naming the invariant being tested (e.g., `"detect_sdd_project: returns 0 when docs/specs exists"`).
✓ All JSON fixture payloads live in `tests/hooks/fixtures/`. Never inline multi-line JSON heredocs in test files.
✓ Every test that creates a temp directory via `mktemp -d` must remove it at the end or via `trap`.
✓ For gate hooks, every test suite must include at least one negative-path test (assert deny when gate condition is unmet).
✓ Each test file must call `summarize` as its final statement.
✗ `helpers.sh` and `test_lib.sh` must contain only assertion and setup utilities — never production hook logic.
