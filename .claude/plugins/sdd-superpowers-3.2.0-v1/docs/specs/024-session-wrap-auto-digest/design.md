# Design: Session Wrap Auto-Digest (024)

## Problem

`session-wrap` is valuable but invisible. Users close sessions without running it because:
- It requires explicit invocation
- The CLAUDE.md reminder is passive prose
- The full flow (scan → candidate-by-candidate approval) feels heavyweight for a session with just 2–3 learnings

The result: institutional memory is lost by default, preserved only when a user remembers to invoke the skill manually.

## Goal

Make session-wrap **zero-effort to accept at natural session endpoints** — Claude scans automatically, presents a pre-digested summary covering both memory and lesson phases, and the user just says yes or no.

## Chosen Approach: Two-Phase Session-Wrap (B2)

Split session-wrap into **quick mode** and **deep mode**:

- **Quick mode**: Auto-scan triggered by endpoint skills. Claude produces a 3–5 bullet digest grouped by type (memory candidates + lesson candidates). User chooses: save all, select some, or skip. Takes under 60 seconds.
- **Deep mode**: The current full session-wrap flow — candidate-by-candidate approval with full frontmatter templates. Triggered when user wants to review/edit individual items.

Endpoint skills invoke quick mode. The user can always escalate to deep mode or invoke `session-wrap` manually for deep mode directly.

## Trigger Points

| Where | Why |
|-------|-----|
| `finishing-a-development-branch` — after Step 5 (cleanup) | Last step of the dev workflow; session is naturally closing |
| `sdd-workflow` routing table — new "Ending a session" row | Catches conversational endings ("I'm done", "thanks", "wrap up") |

`sdd-review` Mode B is intentionally excluded — it feeds into `finishing-a-development-branch`, which already has the trigger. Adding it to both would double-fire.

## Quick Mode Flow

```
## Session Wrap (Quick Mode)

Here's what stood out this session:

**Memory candidates:**
- [feedback] Preferred bundled PRs for refactors (validated when I chose that approach)
- [project] session-wrap was missing from sdd-workflow routing table

**Lesson candidates:**
- Auto-digest requires scanning both phases, not just memory

Save these? Options:
1. Save all — write everything to .claude/memory/ and docs/lessons/
2. Select — I'll tell you which ones to keep
3. Skip — don't save anything this session
4. Deep mode — review and edit each candidate individually
```

On "Save all": Claude writes memory files and lesson files without further prompting, then reports "N memories written, M lessons written." and suggests a commit.

On "Select": User names which bullets to keep; Claude writes only those.

On "Skip": Close with no files written.

On "Deep mode": Hand off to the existing full session-wrap flow.

## Changes Required

### 1. `session-wrap/SKILL.md`

Add a **Quick Mode** section at the top (before the existing Memory Phase). Restructure the skill body:

```
## Quick Mode (auto-digest)
[digest format, save-all/select/skip/deep-mode options]

## Deep Mode (full review)
[existing Memory Phase + Lesson Phase content]
```

The existing content becomes Deep Mode. Quick Mode is new content.

### 2. `finishing-a-development-branch/SKILL.md`

Add **Step 6** after the existing Step 5 (Cleanup):

```
| 6 | Invoke session-wrap quick mode |
```

And a closing instruction: after cleanup, run session-wrap quick mode — present the digest, ask the user once.

### 3. `sdd-workflow/SKILL.md` — Quick Reference table

Add one row:

```
| Ending a session | `sdd-superpowers:session-wrap` |
```

## What Is Not Changing

- The full session-wrap flow (deep mode) remains identical — no existing behavior removed
- `sdd-review` Mode B is unchanged — it does not invoke session-wrap directly
- The CLAUDE.md prose reminder stays as a fallback for sessions not ending through the skills
- Lesson template format (`docs/lessons/YYYY-MM-DD-<slug>.md`) is unchanged

## Open Questions (resolved)

| Question | Decision |
|----------|----------|
| Cover only dev endpoints or also conversational endings? | Both — endpoint skills + routing table row |
| Hard gate or soft suggestion? | Soft — one ask, user can skip in one word |
| Auto-digest covers memory only or both phases? | Both — memory candidates and lesson candidates in the digest |
| Escalation path from quick mode? | Option 4 "Deep mode" hands off to full session-wrap |

## Design Status

Approved — ready to specify.
