# YAML / JSON Config Rules

✓ All hook command paths in `hooks.json` must use `${CLAUDE_PLUGIN_ROOT}` — never hardcoded absolute paths.
✓ Every hook entry must declare an explicit `timeout` (seconds). Use 5s for gate hooks, 10s for context hooks.
✓ `plugin.json` version must be valid semver. Bump MINOR for new skills, MAJOR for breaking hook/skill API changes.
✓ YAML frontmatter values must be single-line strings — no block scalars (`|`, `>`).
✗ `hooks.json` and `plugin.json` must be valid strict JSON — no trailing commas, no comments. Validate with `jq .` before committing.
