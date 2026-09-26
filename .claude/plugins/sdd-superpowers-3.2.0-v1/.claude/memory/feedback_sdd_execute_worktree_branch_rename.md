---
name: sdd-execute-worktree-branch-rename
description: sdd-execute's branch gate only rejects main/master, not branch_pattern mismatches — rename the branch when starting from an auto-created worktree
metadata:
  type: feedback
---

When `sdd-superpowers:sdd-execute` starts inside a worktree created via a harness `EnterWorktree`-style tool, the auto-generated branch name (e.g. `worktree-<slug>`) does not match this repo's `docs/git-convention.md` `branch_pattern` (`^[0-9]+-[a-z0-9-]+$`), even though it passes `sdd-execute`'s Step 1 gate, which only refuses `main`/`master` — it does not validate the pattern.

**Why:** `EnterWorktree` names branches for isolation purposes, not for SDD convention compliance. `sdd-specify`'s own docs even say branch creation "happens at the start of sdd-execute," implying sdd-execute is expected to produce a convention-named branch, but nothing enforces this automatically.

**How to apply:** Before dispatching the first implementer subagent, check `git branch --show-current` against the convention pattern. If it doesn't match (e.g. it's an `EnterWorktree`-generated name), run `git checkout -b <NNN-feature-slug>` from the current HEAD — this is a normal branch creation, not a new worktree, and preserves any commits already made (e.g. the brainstorm/spec/plan doc-first commit) without needing to redo them. Do this once, before Step 2 (deriving work units), so every implementer subagent commits onto the correctly-named branch from the start.
