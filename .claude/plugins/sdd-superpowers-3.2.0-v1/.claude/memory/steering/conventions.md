---
scope: conventions
loaded-by: sdd-specify, sdd-plan, sdd-execute, sdd-review
---

# Conventions

## File Naming
- Bash scripts: `kebab-case.sh`
- Markdown files: `kebab-case.md` (non-root); ALL-CAPS for root meta files (`README.md`, `CHANGELOG.md`)
- Skill entry points: always named `SKILL.md`
- Test files: `test_<hook_basename>.sh` (underscores, matching the hook name)

## Directory Structure
```
skills/<skill-name>/SKILL.md        # skill entry point + optional reference.md
scripts/hooks/<hook-name>.sh        # Claude Code hook scripts
scripts/hooks/lib/                  # shared library functions
tests/hooks/test_<hook>.sh          # one test file per hook
tests/hooks/fixtures/               # JSON payloads for hook testing
.claude/memory/foundation.md        # mission + principles
.claude/memory/steering/            # auto-loaded operational context
.claude/rules/                      # per-topic rule files
docs/specs/<NNN>-<feature>/         # spec.md, plan.md per feature
```

## Code Style
- Bash: `set -euo pipefail`, `[[ ]]` conditionals, `local` variables, no `eval`. See `.claude/rules/bash-scripting.md`.
- Markdown: one H1, no skipped heading levels, numbered lists for procedures. See `.claude/rules/markdown-conventions.md`.
- Skills: `description` starts with `"Use when..."`, under 500 words. See `.claude/rules/skill-writing.md`.

## Architectural Patterns
Skill-based architecture (each skill is independent, loaded on demand); event-driven hook enforcement (PreToolUse/PostToolUse/Stop); three-tier memory (foundation → steering → MEMORY.md index)
