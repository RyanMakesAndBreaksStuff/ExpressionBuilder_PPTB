---
date: 2026-07-12
spec: "025"
tags: [spec-review, external-reference-skill, ambiguity]
---

# Lesson: Adapting an external reference skill's example commands into a spec can silently carry over an undefined placeholder

## Context

Feature 025 (worktree isolation operation in `using-git`) was specified by adapting content from the `using-git-worktrees` skill in the `obra/superpowers` plugin. That source skill's manual-fallback step includes a literal example command: `git worktree add "$path" -b "$BRANCH_NAME"`. The initial spec draft (v1.0.0) copied this pattern into FR-3 as `git worktree add <path> -b <branch-name>`, faithfully preserving the source's structure.

## What happened

The spec was approved by the user and passed self-review (Step 5 of `sdd-superpowers:sdd-specify`) without anyone noticing that `<branch-name>` was never actually defined anywhere in the spec — there was no rule for what happens when the caller doesn't supply one, which is the common case for a direct menu invocation. The source superpowers skill has the same gap (it relies on broader session context that doesn't exist as a formal spec requirement). It wasn't until `sdd-superpowers:sdd-review` Mode A (pre-plan spec review) did a feasibility pass — "would a skilled developer be able to implement this without asking questions?" — that the gap surfaced: FR-3's literal command referenced a value with no defined source.

## What to do next time

When a spec requirement is adapted from an external reference document's example commands (not written from scratch), explicitly check every literal placeholder/variable in those commands (`<branch-name>`, `$X`, `{param}`, etc.) has a corresponding "how is this determined" rule written into a Functional Requirement — don't assume the source material's implicit context transfers into the new spec. This check is worth doing during spec self-review (Step 5), not just relying on the later Mode A review to catch it, since Mode A is a separate invocation that may not always run before planning.

## Signals to watch for

- A Functional Requirement contains a literal command or template string with an angle-bracket or `$VAR`-style placeholder
- The requirement's "Must" bullets describe an action but never say where the placeholder's value comes from
- The originating content was copied or closely adapted from an external document (another plugin, a README, prior art) rather than written from a blank page
