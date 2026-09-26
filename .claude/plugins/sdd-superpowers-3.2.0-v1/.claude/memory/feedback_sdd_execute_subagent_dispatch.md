---
name: feedback-sdd-execute-subagent-dispatch
description: sdd-execute must dispatch subagents for every work unit — never implement directly, even for prose/Markdown edits
metadata:
  type: feedback
---

Always dispatch a fresh implementer subagent per work unit when running sdd-execute. Do not implement tasks directly in the controller session, even when the work is "just a prose edit" or a simple Markdown change.

**Why:** sdd-execute reference.md (Step 3a) is explicit: every work unit gets a subagent with the full scene prompt, including TDD adapted for prose (RED = grep confirms old text exists, GREEN = grep confirms new text present). Implementing directly in the controller bypasses spec-compliance review, code-quality review, and the commit discipline that sdd-execute enforces per task. It also skips the required `sdd-superpowers:subagent-driven-development` invocation.

**How to apply:** As soon as work units are derived and recorded in TodoWrite, invoke `sdd-superpowers:subagent-driven-development`, then dispatch one subagent per unit with the full context: plan section text, spec path, branch name, and the TDD scene prompt. Never rationalize that a task is "too small" to warrant a subagent.
