---
scope: team-practices
loaded-by: sdd-plan, sdd-review, using-git
---

# Team Practices

## Branching
Feature branches follow `NNN-slug` pattern (e.g., `019-rules-gen-init`). See `docs/git-convention.md` for the full convention once created.

## Code Review
PRs are reviewed via the `sdd-superpowers:requesting-code-review` skill, which dispatches a `sdd-superpowers:code-reviewer` subagent. No external approvers required — review is AI-assisted. Merge only after all hook tests pass (`bash tests/hooks/run_all.sh`).

## Release Process
See [[feedback_release_process]] for the full step-by-step checklist. Summary: branch → version bump in `.claude-plugin/plugin.json` → CHANGELOG → commit → push → PR (before merging) → merge → tag.
