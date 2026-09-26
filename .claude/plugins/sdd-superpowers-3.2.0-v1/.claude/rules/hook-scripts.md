# Hook Script Rules

✓ Read event input with `INPUT=$(cat)` at the top, then parse with `jq`. Never rely on env vars for event payload fields.
✓ First substantive action: `detect_sdd_project "$CWD" || exit 0`. Hooks must be no-ops outside SDD projects.
✓ Use the canonical jq deny template: `jq -n --arg reason "$1" '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $reason}}'`
✓ All hooks must complete in under 5 seconds. File checks and grep are fine; network calls and long loops are not.
✓ Shared logic belongs in `scripts/hooks/lib/`. Never copy-paste detection logic across hook files.
✓ Every hook in `scripts/hooks/` must have a corresponding test in `tests/hooks/test_<hook_basename>.sh`.
✗ A denying hook must only emit the JSON deny response and `exit 0` — no file writes, no disk logging as side effects.
