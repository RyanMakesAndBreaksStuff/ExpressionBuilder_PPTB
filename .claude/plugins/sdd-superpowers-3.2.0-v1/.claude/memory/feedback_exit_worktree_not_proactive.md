---
name: feedback-exit-worktree-not-proactive
description: Don't call ExitWorktree proactively even when a skill's standard flow (e.g. finishing-a-development-branch) calls for worktree cleanup
metadata:
  type: feedback
---

`finishing-a-development-branch`'s Step 5 generically says to clean up the worktree for Options 1, 2, and 4 (merge, PR, discard) if one was used. But when the worktree was created by the harness's own `EnterWorktree` tool (not manually via `git worktree add`), the corresponding `ExitWorktree` tool carries its own explicit instruction: "Do NOT call this proactively — only when the user asks." That tool-level constraint overrides the generic skill step.

**Why:** `ExitWorktree` restores the session's working directory and can delete the branch/worktree (`action: "remove"`). Doing this automatically right after opening a PR removes the user's ability to keep working in that workspace, inspect it, or decide when they're actually done — even though the pushed branch on origin is safe either way. The tool's own safety guidance is more specific than the general-purpose skill step and should win.

**How to apply:** When `finishing-a-development-branch` (or any skill) calls for worktree cleanup and the current worktree was created via `EnterWorktree`, skip the cleanup step and instead report that the worktree is preserved and can be exited on request. Only call `ExitWorktree` when the user explicitly asks to exit, leave, or clean up the worktree.
