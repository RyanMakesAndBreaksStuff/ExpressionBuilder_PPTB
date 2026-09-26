# Implementation Plan: Session Wrap and Lessons

> **For agentic workers:** Use sdd-tasks to generate an executable task list from this plan.

**Spec:** docs/specs/022-session-wrap-and-lessons/spec.md
**Created:** 2026-07-04

---

## Goal

Deliver a `session-wrap` skill that proposes memory and lesson candidates at session end, a `docs/lessons/` convention with a lesson template, an enriched `stop.sh` checklist, and updated CLAUDE.md template — so session learnings are systematically captured rather than lost.

## Architecture

Five deliverables, all independent of each other (no shared runtime dependencies):

1. **`skills/session-wrap/SKILL.md`** — skill prose Claude reads to drive the session-end review
2. **`skills/session-wrap/templates/lesson.md`** — canonical lesson file template referenced by the skill
3. **`scripts/hooks/stop.sh`** — enriched `systemMessage` string (additive change only)
4. **`skills/sdd-init/templates/claude-md.md`** — `## Memory` section gains session-end paragraph
5. **`.claude/CLAUDE.md`** — same update as (4) for the project's own file

The skill operates entirely from Claude's live context (no subagents, no file reads at invocation time). The stop hook change is a static string replacement — no new logic, no new file reads.

## Tech Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| Skill prose | Markdown | FR-1 — skills are Markdown files per the plugin framework |
| Hook script | Bash + jq | FR-7 — hooks are Bash scripts; `jq` already used in stop.sh |
| Templates | Markdown | FR-5, NFR-3 — plain Markdown, human-readable without tooling |

## File Structure

- `skills/session-wrap/SKILL.md` — session-wrap skill (FR-1, FR-2, FR-3, FR-4)
- `skills/session-wrap/templates/lesson.md` — lesson file template (FR-5, AC-3.1, AC-3.2)
- `scripts/hooks/stop.sh` — modified systemMessage (FR-7, AC-4.1, AC-4.2)
- `skills/sdd-init/templates/claude-md.md` — modified ## Memory section (FR-8, AC-5.1, AC-5.2)
- `.claude/CLAUDE.md` — modified ## Memory section (FR-8, AC-5.3)
- `tests/hooks/test_stop.sh` — extended with AC-4.1 and AC-4.2 tests

## Complexity Tracking

(Empty — all gates passed)

- Simplicity Gate: 2 major components (skill + stop.sh patch), 3 template/prose edits — well under threshold ✓
- Anti-Abstraction Gate: no wrappers introduced ✓
- Integration-First Gate: no API contracts; stop.sh behavioral contract expressed as tests ✓

---

## Phase 0: Tests First

**Principle:** Write failing tests for the stop.sh behavioral change before touching the hook.

### 0.1 Extend test_stop.sh with AC-4.1 and AC-4.2 tests

- [ ] Add the following test block to `tests/hooks/test_stop.sh` before the final `summarize` call:

```bash
# AC-4.1: stop message lists all four memory types
SESSION_ID_41="${SESSION_ID}-ac41"
STATE_FILE_41="${TMPDIR:-/tmp}/sdd-state-${SESSION_ID_41}.json"
INPUT_W41=$(make_state_input "$TMP" "$SESSION_ID_41" "Write")
CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$STATE_SETTER" <<< "$INPUT_W41" > /dev/null
INPUT41=$(make_stop_input "$TMP" "$SESSION_ID_41")
OUTPUT41=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$STOP_SCRIPT" <<< "$INPUT41")
MSG41=$(echo "$OUTPUT41" | jq -r '.systemMessage // empty')
assert_contains "$MSG41" "feedback" \
  "AC-4.1: stop message mentions feedback type"
assert_contains "$MSG41" "project" \
  "AC-4.1: stop message mentions project type"
assert_contains "$MSG41" "user" \
  "AC-4.1: stop message mentions user type"
assert_contains "$MSG41" "reference" \
  "AC-4.1: stop message mentions reference type"

# AC-4.2: stop message names session-wrap skill
assert_contains "$MSG41" "session-wrap" \
  "AC-4.2: stop message names session-wrap skill"
```

- [ ] Run: `bash tests/hooks/test_stop.sh` — expect: 5 new FAILs (types not yet in message)
- [ ] Commit: `test: add AC-4.1 AC-4.2 tests for enriched stop message`

---

## Phase 1: Lesson Template

**Implements:** FR-5 | **Satisfies:** AC-2.2, AC-3.1, AC-3.2, AC-3.3

### 1.1 Create lesson template file

- [ ] Create directory: `skills/session-wrap/templates/`
- [ ] Write `skills/session-wrap/templates/lesson.md`:

```markdown
---
date: YYYY-MM-DD
spec: "NNN"
tags: []
---

# Lesson: <title>

## Context

<What was being worked on when this was learned — project, feature, phase.>

## What happened

<Narrative: what was tried, what failed or surprised, what constraint was discovered.>

## What to do next time

<Concrete rule — actionable, not vague. "When X, do Y instead of Z.">

## Signals to watch for

<What situation, pattern, or symptom should trigger recalling this lesson.>
```

- [ ] Verify: file has YAML frontmatter with `date`, `spec`, `tags` (AC-3.1)
- [ ] Verify: body has exactly the five sections in spec order (AC-3.2)
- [ ] Commit: `feat: add lesson template for session-wrap`

---

## Phase 2: session-wrap Skill

**Implements:** FR-1, FR-2, FR-3, FR-4 | **Satisfies:** AC-1.1–1.6, AC-2.1–2.5

### 2.1 Write SKILL.md

Skills are tested by reading and verifying against skill-writing rules — no automated test runner. Run the self-check after writing.

- [ ] Write `skills/session-wrap/SKILL.md`:

```markdown
---
name: session-wrap
description: Use when ending a working session to surface memory candidates and lesson candidates, write approved entries, and close out cleanly.
---

# Session Wrap

Closes out a working session by surfacing what is worth remembering. Scans the conversation, proposes memory and lesson candidates for user approval, and writes confirmed entries. No subagents — operates entirely from live context.

## Memory Phase

Scan the full conversation for items that are **non-obvious** — things a fresh session would not rediscover from reading code or `git log`. Categorize by type:

| Type | Scan for |
|------|---------|
| `feedback` | Approach corrections or validated choices the user confirmed |
| `project` | Status changes, goal shifts, deadline updates |
| `user` | New preferences, expertise, or working style observations |
| `reference` | External resources, dashboards, ticket systems encountered |

Present each candidate as a structured block showing type, proposed slug, full body draft, and a one-sentence rationale for why it is non-obvious. Example:

```
Type: feedback
Slug: feedback_prefer_real_db_tests
Body:
  Use real databases in tests, not mocks.
  **Why:** Mock/prod divergence masked a broken migration.
  **How to apply:** When writing test setup that touches storage, use a real DB fixture.
Non-obvious: not in code or commit history — stated only in conversation.
> Approve / Edit / Skip
```

If the user edits the body, write the edited version. Omit empty groups.

If no candidates found, report "No memory candidates found" and proceed to the lesson phase.

For each approved candidate:
1. Write `.claude/memory/<slug>.md` with frontmatter (`name`, `description`, `metadata.type`)
2. Append a pointer line to `.claude/memory/MEMORY.md`

If a file with the proposed slug already exists, warn: "`.claude/memory/<slug>.md` already exists — overwrite or choose a new slug?" and wait for input before writing.

## Lesson Phase

Scan for narrative learnings — items that tell a story about *why* something was done, not just what is true now:

- Decisions that required non-obvious reasoning
- Approaches that failed before the working solution was found
- Surprises or constraints discovered during implementation
- Insights that would change how future specs or plans are written

Present each candidate pre-filled from the [lesson template](templates/lesson.md). The user reviews, edits if needed, then approves or skips.

For each approved lesson:
1. If `docs/lessons/` does not exist, create it
2. Write `docs/lessons/YYYY-MM-DD-<slug>.md`

If no candidates found, report "No lesson candidates found."

## Closing Summary

After both phases complete, print:

> N memories written, M lessons written.
> Commit new files: `git add .claude/memory/ docs/lessons/ && git commit -m "chore: session wrap"`
```

- [ ] Self-check against skill-writing rules:
  - Frontmatter has exactly `name` and `description`, both single-line ✓
  - `description` starts with "Use when..." ✓
  - Exactly one `# Heading` ✓
  - `##` for sections, no skipped levels ✓
  - Word count under 500 ✓
  - No `@path/to/file.md` references ✓
- [ ] Commit: `feat: add session-wrap skill`

---

## Phase 3: stop.sh Enrichment

**Implements:** FR-7 | **Satisfies:** AC-4.1, AC-4.2, AC-4.3

### 3.1 Replace the systemMessage string in stop.sh

- [ ] In `scripts/hooks/stop.sh`, replace the `jq -n '{systemMessage: ...}'` block with:

```bash
jq -n '{
  systemMessage: "Session end — invoke session-wrap to surface memory candidates:\n  - feedback: approach corrections or validations received this session?\n  - project: status, goal, or deadline changes?\n  - user: new preferences or expertise observed?\n  - reference: external resources encountered?\n\nVerification: run verification-before-completion before claiming any work is done."
}'
```

- [ ] Run: `bash tests/hooks/test_stop.sh` — expect: all tests PASS including the 5 new AC-4.1/4.2 tests
- [ ] Verify existing tests still pass (AC-4.3 no writes → silent, AC-6.2 memory mention, AC-4.3 systemMessage key shape)
- [ ] Commit: `feat: enrich stop hook with typed memory checklist and session-wrap`

---

## Phase 4: CLAUDE.md Updates

**Implements:** FR-8 | **Satisfies:** AC-5.1, AC-5.2, AC-5.3

### 4.1 Update the sdd-init CLAUDE.md template

- [ ] In `skills/sdd-init/templates/claude-md.md`, replace the `## Memory` section with:

```markdown
## Memory

Memory lives in `.claude/memory/` — see `.claude/memory/MEMORY.md` for the index.
Project identity is in `.claude/memory/foundation.md`.
Steering files in `.claude/memory/steering/` are loaded by skills when relevant.

**At session end:** Before closing a conversation, invoke `sdd-superpowers:session-wrap`.
It scans the session for memory candidates (feedback, project, user, reference) and
lesson candidates (decisions, surprises, failed approaches), then writes approved entries
to `.claude/memory/` and `docs/lessons/`. Takes under 5 minutes; saves what a fresh
session cannot rediscover from code or git history alone.
```

- [ ] Commit: `feat: add session-end guidance to CLAUDE.md template`

### 4.2 Update the project's own CLAUDE.md

- [ ] In `.claude/CLAUDE.md`, replace the `## Memory` section with the same content as 4.1
- [ ] Commit: `chore: apply session-wrap guidance to project CLAUDE.md`

---

## Phase 5: Integration Verification

**Implements:** All FRs | **Satisfies:** All ACs

- [ ] Run full hook test suite: `bash tests/hooks/test_stop.sh` — expect: all PASS
- [ ] Verify `skills/session-wrap/SKILL.md` exists and opens without YAML parse errors
- [ ] Verify `skills/session-wrap/templates/lesson.md` exists and matches AC-3.1/3.2 format
- [ ] Verify `.claude/CLAUDE.md` `## Memory` section contains "session-wrap" and the session-end paragraph
- [ ] Verify `skills/sdd-init/templates/claude-md.md` `## Memory` section contains "session-wrap"
- [ ] Manually trace AC-1.1: simulate a session-wrap invocation mentally — confirm the skill prose covers grouping by type, presenting each candidate, writing approved ones
- [ ] Commit: `feat: complete session-wrap and lessons feature (022)`

---

## Quickstart Validation

To confirm the feature works after installation:

1. Start a Claude Code session in any SDD project, make at least one file edit
2. End the session — observe the `stop.sh` hook fires and the enriched message lists all four memory types and names `session-wrap`
3. In a new session, invoke `sdd-superpowers:session-wrap`
4. Confirm memory candidates appear grouped by type with approve/edit/skip prompts
5. Approve one memory candidate — confirm `.claude/memory/<slug>.md` is created and `MEMORY.md` is updated
6. Approve one lesson candidate — confirm `docs/lessons/YYYY-MM-DD-<slug>.md` is created using the template structure
7. Confirm closing summary reports the correct counts and commit suggestion
