# Bash Scripting Rules

✓ Start every script with `#!/usr/bin/env bash` followed by `set -euo pipefail`. Never omit `-u` or `-o pipefail`.
✓ Always quote variables as `"${var}"`. The only exception is intentional word-splitting, which must be commented.
✓ Use `$(command)` for command substitution — never backticks.
✓ Use `[[ ]]` for all conditionals in Bash scripts.
✓ Declare all function-scoped variables with `local`.
✓ Functions and local variables: `lowercase_with_underscores`. Constants/exports: `UPPER_CASE`. Script filenames: `kebab-case.sh`.
✓ Use `mktemp` for temp files; always clean up with `trap 'rm -rf "$TMP"' EXIT`.
✓ When a script exceeds ~100 lines or needs shared logic, extract into a sourced library under `scripts/hooks/lib/`.
✗ Never parse `ls` output — use globs or `find` directly.
✗ Never use `eval` — use arrays for multi-value data instead.
