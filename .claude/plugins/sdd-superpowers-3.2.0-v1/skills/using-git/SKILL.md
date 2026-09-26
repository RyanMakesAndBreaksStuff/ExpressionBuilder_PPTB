---
name: using-git
description: Use when any git operation is needed in an SDD project — branch creation, commits, merge commit validation, showing the convention, or setting up an isolated git worktree for parallel work
---

# Using Git in SDD Projects

**Announce at start:** "I'm using the using-git skill to perform a git operation."

## Overview

<examples>
<example>
<context>About to make the first commit on a new feature. User says "just commit everything."</context>
<correct>Invoke using-git. Read docs/git-convention.md for the commit message format, stage specific named files (not git add -A blindly), and craft a Conventional Commits message.</correct>
<incorrect>Run git add . && git commit -m "updates" — this violates the commit convention and may accidentally stage sensitive or unrelated files.</incorrect>
</example>
</examples>

All SDD git operations run through this skill. It enforces the convention in `docs/git-convention.md` for every branch name and commit message. Two usage modes: direct invocation (user picks from a menu) or delegation (another skill passes a named operation and inputs).

## When to Use

- Creating a feature branch for a new spec
- Making a doc-first commit after tasks.md is written
- Making a per-task commit during `sdd-superpowers:sdd-execute`
- Generating a merge commit message for `sdd-superpowers:finishing-a-development-branch`
- Showing or verifying the git convention
- Setting up an isolated workspace (worktree) before parallel feature work — by explicit request only, never automatic
- NOT for general shell git commands outside an SDD project context

## Quick Reference

| Operation | Invoked by | Menu option |
|-----------|-----------|-------------|
| A — Branch Creation | `sdd-superpowers:sdd-execute`, user | 1 |
| B — Doc-First Commit | `sdd-superpowers:sdd-execute` (after A), user | 2 (ad-hoc) |
| C — Per-Task Commit | `sdd-superpowers:sdd-execute` (delegation only) | not in menu |
| D — Merge Commit Message | `sdd-superpowers:finishing-a-development-branch`, user | 3 |
| Show convention | user | 4 |
| E — Isolated Workspace Setup (Worktree) | user, or explicit named delegation only | 5 |

Convention file: `docs/git-convention.md` (YAML frontmatter with `branch_pattern`, `commit_format`, `allowed_types`). Missing file on new project → halt, run `sdd-superpowers:sdd-init`. Missing on existing project → offer 4-question creation dialogue.

**REQUIRED READING before proceeding:** [reference.md](reference.md) — convention loading detail, full operation procedures (A–E), error reference table, and worktrees guide.

## Constraints

- Does NOT create a commit without reading docs/git-convention.md first (or using Conventional Commits format if no convention file exists)
- Does NOT use `git add -A` or `git add .` without reviewing what will be staged
- Does NOT force-push to main/master
- Does NOT invoke Operation E (worktree isolation) automatically — only via explicit menu selection or an explicit, named delegation request

## Error Handling

- **No docs/git-convention.md found**: Default to Conventional Commits format (`type: description`) and note the missing convention file.
- **Uncommitted changes exist on the wrong branch**: Halt. Help the user stash or move changes to the correct branch before committing.
- **User requests gate bypass** (e.g. `--no-verify`): The gate is "no commit without following the convention and hook chain." Explain what the hook does and why it exists. Offer the correct path — fix the underlying issue the hook is catching rather than bypassing it.
