---
scope: tech-stack
loaded-by: sdd-brainstorm, sdd-specify, sdd-plan, sdd-execute, sdd-review
---

# Tech Stack

## Languages
Markdown (skill files, specs, plans), Bash (hook scripts, test scripts), YAML (frontmatter, config)

## Frameworks
Claude Code plugin framework (superpowers); skills are Markdown files loaded by Claude at runtime; hooks are Bash scripts registered in hooks/hooks.json

## Infrastructure
Claude Code CLI / Desktop app; plugin installed via `claude plugin install`; no server, no build step, no deploy pipeline

## Package Manager
None — plugin distributed as a directory; Bash scripts have no external dependencies beyond standard Unix tools (`jq`, `shellcheck`)
