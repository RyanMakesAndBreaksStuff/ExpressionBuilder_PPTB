---
name: feedback-superpowers-consolidation-pattern
description: When reintroducing a capability from obra/superpowers, fold it into the existing consolidated SDD skill rather than restoring a standalone skill file, and keep advanced/opt-in capabilities explicitly non-auto-triggered
metadata:
  type: feedback
---

This project previously removed a dedicated `using-git-worktrees` skill (spec 003) and folded a thin version of its guidance into `using-git` as an "Advanced" section, to keep one source of truth for all git operations. When later asked to bring back the fuller `using-git-worktrees` logic from the `obra/superpowers` plugin, the user explicitly chose to expand it inside `using-git` (as a new Operation E) rather than restore a separate skill file — confirming spec 003's consolidation decision still holds.

**Why:** The user was offered both options directly and chose consolidation, with the explicit reasoning (matching spec 003's original rationale) that one skill per concern is easier to maintain than duplicated/parallel skill files. Similarly, the user chose to keep the new capability opt-in/advanced-only rather than auto-triggering it from `sdd-execute`/`sdd-workflow`, again preserving an existing architectural decision (spec 003's non-goal) rather than changing standard workflow behavior.

**How to apply:** When a user asks to "bring back" or "adopt" a capability from an external plugin (like `obra/superpowers`) that overlaps with an existing consolidated SDD skill, default to proposing consolidation into the existing skill and default to keeping any newly-restored capability opt-in unless the user says otherwise — but always ask explicitly (via `AskUserQuestion`) rather than assuming, since this is a real architectural fork in the road each time it comes up.
