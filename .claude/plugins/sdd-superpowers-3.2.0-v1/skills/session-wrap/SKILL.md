---
name: session-wrap
description: Use when ending a session to capture memory candidates and narrative lessons before context is lost
---

# Session Wrap

**Announce at start:** "Starting session-wrap to capture session memory and lessons."

## Overview

<examples>
<example>
<context>The user says "let's wrap up" at the end of a session with several approach corrections and a couple of external references mentioned along the way.</context>
<correct>Invoke session-wrap, scan for feedback/project/user/reference memory candidates and lesson candidates, present a labeled digest, and write only the candidates the user approves.</correct>
<incorrect>Silently write observations to memory without presenting them for approval, or let the session close without checking whether anything is worth capturing.</incorrect>
</example>
</examples>

Scan the conversation for knowledge worth preserving. Present candidates for approval. Write only what the user approves — skipped candidates produce no files.

## Quick Mode (auto-digest)

**When invoked by an endpoint skill (e.g., `finishing-a-development-branch`) or routed via `sdd-workflow`.** Scan the conversation and produce a digest of up to 5 candidates labeled by type:

```
**Memory candidates:**
- [feedback] <summary>

**Lesson candidates:**
- [lesson] <summary>

Save these?
1. **Save all** — write all to standard locations; report "N memories written, M lessons written"; suggest commit
2. **Select** — name bullets to keep; write only those
3. **Skip** — save nothing
4. **Deep Mode** — hand off to Deep Mode below
```

**Select with no bullets named:** Treat as Skip — write nothing.
**No candidates:** Report "Nothing worth saving found this session." Close without prompting.
**Over 5:** Present top 5 by significance; note more are available in deep mode.
**On write:** Memory → `.claude/memory/<slug>.md` + `MEMORY.md`. Lessons → `docs/lessons/YYYY-MM-DD-<slug>.md` (create if needed). On memory slug collision, warn before overwriting. Suggest `chore(memory): capture session learnings`.

## Deep Mode (full review)

**When invoked directly by the user, or when the user selects "Deep Mode" from Quick Mode.** Scan and review each candidate individually, starting from scratch.

### Memory Phase

Scan for facts that are non-obvious from code or git history. Group by type, omit empty groups:

| Type | What to scan for |
|------|-----------------|
| `feedback` | Approach corrections or validations the user gave |
| `project` | Status, goal, or deadline changes that occurred |
| `user` | New preferences or expertise observed |
| `reference` | External resources, tools, or docs encountered |

For each candidate, present: type, slug, rationale, and body (Why + How to apply). Ask: Approve, Edit, or Skip? On approval, write `.claude/memory/<slug>.md` and add to `MEMORY.md`. Warn before overwriting an existing slug.

**If no candidates found:** Report "No memory candidates found" and proceed to the lesson phase.

### Lesson Phase

Scan for narrative learnings worth referencing in future specs or plans:

- Decisions that required non-obvious reasoning
- Approaches that failed before the working solution was found
- Surprises or constraints discovered during implementation
- Insights that would change how future specs or plans are written

Present each candidate using the lesson template (see `templates/lesson.md`).

**On approval:** If `docs/lessons/` does not exist, create it. Write to `docs/lessons/YYYY-MM-DD-<slug>.md`.

**If no candidates found:** Report "No lesson candidates found."

### Closing Summary

Report "N memories written, M lessons written." If files were written, suggest: `chore(memory): capture session learnings`.

## Constraints

- Does NOT spawn subagents — runs entirely in-session
- Does NOT write any file the user has not explicitly approved
- Does NOT re-propose skipped candidates
- Quick Mode does NOT auto-write files — the user must explicitly choose "Save all" or "Select"

## Error Handling

- **Memory slug collision**: Warn before overwriting; ask whether to overwrite, rename, or skip.
- **No candidates found in either phase**: Report "Nothing worth saving found this session" and close without prompting.
- **User requests gate bypass**: The gate is "no memory or lesson write without explicit user approval." Explain that skipping approval risks writing candidates the user never reviewed. Offer Quick Mode's "Save all" as a faster path that still keeps them in control.
