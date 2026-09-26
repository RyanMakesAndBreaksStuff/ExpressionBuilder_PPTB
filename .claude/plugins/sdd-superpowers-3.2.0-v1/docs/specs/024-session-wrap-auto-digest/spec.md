# Feature 024: Session Wrap Auto-Digest

**Status:** Approved
**Created:** 2026-07-04
**Branch:** `024-session-wrap-auto-digest`

---

## Problem Statement

`session-wrap` exists to capture institutional memory before context is lost, but it is invisible in the normal workflow. Users close sessions without running it because: it requires explicit invocation, the CLAUDE.md reminder is passive prose buried in project instructions, and the full candidate-by-candidate flow feels disproportionately heavy when a session produced only a few learnings.

The result: institutional memory is lost by default, preserved only when a user remembers to invoke the skill.

## Goals

- Surface session-wrap automatically at natural development session endpoints
- Present a pre-digested summary covering both memory and lesson candidates — zero scanning effort for the user
- Let the user respond in one word ("save all", "skip") without further prompting for the common case
- Preserve the existing full session-wrap flow intact as an escalation path

## Non-Goals

- Removing or changing the existing deep-mode session-wrap flow
- Auto-writing any memory or lesson file without explicit user approval
- Adding session-wrap triggers to `sdd-review` Mode B directly (it feeds into `finishing-a-development-branch`, which already has the trigger)
- Tracking whether session-wrap has already run in the current session
- Covering non-SDD projects or sessions without a CLAUDE.md

## Users and Context

**Primary user:** Claude (the AI model) — reads skill prose at routing time to know when and how to invoke session-wrap.

**Secondary user:** SDD practitioners — receive the auto-digest at session end and decide what to save.

**Usage context:** Any SDD session that ends through `finishing-a-development-branch`, or any session where the user signals conversational closure ("I'm done", "thanks", "wrap up").

---

## User Stories

### Story 1: Session wrap is prompted automatically at development branch completion

**As a** developer finishing a development branch
**I want** session-wrap to prompt me automatically after all integration steps complete
**So that** I don't need to remember to invoke it manually at the end of a session

**Acceptance criteria:**
- `finishing-a-development-branch` invokes session-wrap quick mode after the chosen integration option (merge / PR / keep / discard) is executed and any cleanup is done
- The prompt appears for all four integration options — it is not skipped for Option 3 (keep) or Option 4 (discard)
- The user is asked once; if they respond "skip", no further session-wrap interaction occurs

### Story 2: Quick mode presents an auto-digested summary of both memory and lesson candidates

**As a** developer at session end
**I want** Claude to automatically scan and summarize what was learned without me having to ask
**So that** I can approve with minimal effort rather than running a full manual scan

**Acceptance criteria:**
- Quick mode scans the conversation and produces a bullet-list digest of 3–5 candidates
- The digest includes both memory candidates (feedback, project, user, reference) and lesson candidates
- Each bullet is labeled with its candidate type (e.g., `[feedback]`, `[lesson]`)
- The digest is presented before any save/skip prompt is shown
- If no candidates are found, quick mode reports "Nothing worth saving found this session" and closes without prompting

### Story 3: User can respond to the digest in four ways without friction

**As a** developer reviewing the auto-digest
**I want** four clear response options that cover every case
**So that** I can make a decision in one step

**Acceptance criteria:**
- "Save all" writes all digest candidates to `.claude/memory/` (memory candidates) and `docs/lessons/` (lesson candidates) without further per-candidate prompting, then reports "N memories written, M lessons written"
- "Select" allows the user to name specific bullets to keep; only named bullets are written
- "Skip" closes session-wrap with no files written
- "Deep mode" transitions to the existing full session-wrap flow (Memory Phase → Lesson Phase) starting from scratch

### Story 4: Ending a session appears in the sdd-workflow routing table

**As a** developer who signals session end conversationally ("I'm done", "wrap up")
**I want** `sdd-workflow` to route me to `session-wrap`
**So that** quick mode is reachable without knowing the skill name

**Acceptance criteria:**
- The `sdd-workflow` quick reference table contains a row: "Ending a session" → `sdd-superpowers:session-wrap`
- The row follows the same format as all other rows in the table
- Invoking `session-wrap` from this route enters quick mode by default

### Story 5: Deep mode is preserved exactly as before

**As a** developer who wants fine-grained control over what is saved
**I want** the existing full session-wrap flow to remain unchanged
**So that** I can still review and edit each candidate individually when the session had complex or nuanced learnings

**Acceptance criteria:**
- Invoking `sdd-superpowers:session-wrap` directly (not through quick mode) enters deep mode (current Memory Phase → Lesson Phase flow)
- Deep mode candidate format, approval prompts, and file-write behavior are unchanged
- Selecting "Deep mode" from the quick mode options transitions without losing any candidates that would have appeared in quick mode

---

## Functional Requirements

1. `session-wrap/SKILL.md` must define two named modes: **Quick Mode** and **Deep Mode**
2. Quick Mode must be described before Deep Mode in the skill body
3. Quick Mode must specify: scan scope (full conversation), output format (typed bullets with labels), and the four response options verbatim
4. Quick Mode "Save all" must write files without further per-candidate prompting
5. Quick Mode "Deep mode" option must hand off to the existing Deep Mode flow
6. `finishing-a-development-branch/SKILL.md` must include a step (after cleanup) that invokes session-wrap quick mode
7. The step must appear in the Quick Reference table as Step 6
8. `sdd-workflow/SKILL.md` quick reference table must include the "Ending a session" row

## Non-Functional Requirements

- Quick mode must be completable in under 60 seconds for a session with 5 or fewer candidates
- The skill changes must not increase any individual skill file beyond its word-count ceiling (session-wrap: under 500 words total; finishing-a-development-branch: under 500 words total)

## Error Scenarios

- **No candidates found in quick mode:** Report "Nothing worth saving found this session." Close without prompting for save/skip.
- **Candidate count exceeds 5:** Present the top 5 by significance; note that additional candidates are available in deep mode.
- **User selects "Select" but names no bullets:** Treat as "Skip" — write nothing.
- **`docs/lessons/` does not exist when saving a lesson candidate:** Create the directory, then write the file.
- **Memory slug collision (file already exists):** Warn before overwriting: "A memory file with this slug already exists — overwrite or choose a new slug?"

## Open Questions

None — all resolved in design.

## Out of Scope

- Auto-writing files without user approval (any mode)
- Tracking session-wrap invocation state across messages
- Adding session-wrap triggers to skills other than `finishing-a-development-branch`
- Changing the lesson file template or memory frontmatter format
