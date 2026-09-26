# Feature 022: Session Wrap and Lessons

**Status:** Approved
**Created:** 2026-07-04
**Branch:** `022-session-wrap-and-lessons`

---

## Problem Statement

Memory in SDD projects is only updated when Claude happens to remember to do so mid-conversation. The current `stop.sh` hook fires a two-line generic reminder ("save learnings, run verification") when writes occurred — but the prompt is vague enough to ignore and does not distinguish memory types, so candidates go unwritten. Between sessions, decisions made, approaches validated, and project state changes are lost, forcing the next session to rediscover them from code and git history.

A second class of knowledge is entirely absent from the system: narrative learnings. When an implementation hits an unexpected constraint, when a parallel dispatch strategy fails, or when a team decides to invert an architectural assumption — the story behind that decision disappears after the session ends. Future specs and plans have no access to it. The same mistakes recur; the same non-obvious decisions get re-litigated.

## Goals

- Introduce a `session-wrap` skill that scans the conversation at session end, surfaces memory candidates grouped by type, and writes approved entries to `.claude/memory/`
- Introduce a `docs/lessons/` convention — a team-visible directory of narrative learnings that future specs and plans can reference
- Extend `session-wrap` to propose lesson candidates (decisions, surprises, failures, insights) distinct from factual memory
- Enrich `stop.sh` to enumerate the four memory types explicitly, replacing the current vague nudge
- Update the `sdd-init` CLAUDE.md template to include session-end guidance pointing to `session-wrap`

## Non-Goals

- Automated memory or lesson writing without user review and approval
- Memory health auditing — detecting or pruning stale entries (separate future feature)
- Lesson-to-steering-file promotion — converting repeated lessons into steering rules (separate future feature)
- Spawning subagents to analyze the conversation — `session-wrap` reads from Claude's own live context
- Cross-project or global lessons — `docs/lessons/` is scoped to the current project
- Replacing the existing memory types or their file format

## Users and Context

**Primary users:** Claude (the AI model) — reads the `session-wrap` skill prose and drives the end-of-session review  
**Secondary users:** SDD practitioners — receive memory candidates for approval, see their session's learnings captured before context is lost  
**Usage context:** The final minutes of any SDD working session — invoked explicitly by the user or prompted by the `stop.sh` hook  
**User mental model:** Ending a session should take two minutes to decide what's worth remembering. The skill does the scanning; the user just approves or skips.

---

## User Stories

### Story 1: session-wrap proposes memory candidates by type

**As a** developer ending a working session  
**I want** a skill that scans the conversation and surfaces what's worth saving to `.claude/memory/`  
**So that** I don't have to mentally audit the full conversation myself

**Acceptance criteria:**

- [x] **AC-1.1** Given `session-wrap` is invoked When the skill scans the conversation Then it produces a list of memory candidates grouped by type: `feedback`, `project`, `user`, `reference` — with an empty group omitted
- [x] **AC-1.2** Given a candidate is presented When the user reviews it Then each candidate shows: type, proposed filename slug, proposed body (including **Why:** and **How to apply:** where applicable), and a one-sentence rationale for why it is non-obvious (not derivable from code or git history)
- [x] **AC-1.3** Given the user approves a candidate When the skill writes it Then the memory file is created at `.claude/memory/<slug>.md` with correct frontmatter and `MEMORY.md` is updated with a pointer
- [x] **AC-1.4** Given the user skips a candidate When the skill moves on Then no file is written and the candidate is not re-proposed
- [x] **AC-1.5** Given the user edits a candidate's body before approving When the skill writes it Then the edited content is written — not the original proposal
- [x] **AC-1.6** Given no memory candidates are found in the session When `session-wrap` completes the memory phase Then it reports "No memory candidates found" and moves to the lesson phase

### Story 2: session-wrap proposes lesson candidates distinct from memory

**As a** developer ending a session where something non-trivial was learned  
**I want** the skill to distinguish narrative learnings from factual memory items  
**So that** the richer story behind a decision is preserved in a form the team can read later

**Acceptance criteria:**

- [x] **AC-2.1** Given `session-wrap` is invoked When the skill scans the conversation for lessons Then it identifies: decisions that required non-obvious reasoning, approaches that failed before the working solution was found, surprises or constraints discovered during implementation, and insights that would change how future specs or plans are written
- [x] **AC-2.2** Given a lesson candidate is presented When the user reviews it Then it includes: date, optional spec link, tags, context paragraph, what happened, what to do next time, and signals to watch for
- [x] **AC-2.3** Given the user approves a lesson When the skill writes it Then the file is created at `docs/lessons/YYYY-MM-DD-<slug>.md` using the lesson template defined in the spec
- [x] **AC-2.4** Given no lesson candidates are found When `session-wrap` completes the lesson phase Then it reports "No lesson candidates found" and concludes
- [x] **AC-2.5** Given both memory and lesson phases are complete When `session-wrap` concludes Then it summarizes: N memories written, M lessons written, and reminds the user to commit any new files to version control

### Story 3: Lesson file is structured for future reference

**As a** developer reading a lesson months later  
**I want** a consistent format that tells me when it happened, what triggered it, and what to do differently  
**So that** I can quickly decide whether the lesson applies to my current work

**Acceptance criteria:**

- [x] **AC-3.1** Given a lesson file is written When the file is opened Then it has YAML frontmatter with `date` (ISO 8601), optional `spec` (spec number string), and `tags` (array of strings)
- [x] **AC-3.2** Given a lesson file is written When the file body is read Then it contains exactly these sections in order: `# Lesson: <title>`, `## Context`, `## What happened`, `## What to do next time`, `## Signals to watch for`
- [x] **AC-3.3** Given a lesson is linked from a spec or plan When the link target is opened Then it resolves to a valid file at `docs/lessons/YYYY-MM-DD-<slug>.md`

### Story 4: stop.sh enriches session-end prompt with typed memory checklist

**As a** developer whose session is ending after writes occurred  
**I want** the stop hook's reminder to name the four memory types explicitly  
**So that** Claude has a structured checklist rather than a vague nudge

**Acceptance criteria:**

- [x] **AC-4.1** Given `stop.sh` fires after a session with writes When the system message is emitted Then it lists all four memory types with a one-line description of what to scan for in each: `feedback` (approach corrections or validations), `project` (status, goal, or deadline changes), `user` (new preferences or expertise observed), `reference` (external resources encountered)
- [x] **AC-4.2** Given `stop.sh` fires When the system message is emitted Then it names `session-wrap` as the skill to invoke, not just a generic memory instruction
- [x] **AC-4.3** Given `stop.sh` fires after a session with NO writes When the hook runs Then behavior is unchanged from current — the hook exits silently

### Story 5: CLAUDE.md template includes session-end guidance

**As a** developer using an SDD-initialized project  
**I want** the CLAUDE.md to include a reminder about session-end memory capture  
**So that** the behavior is discoverable without reading the stop hook source

**Acceptance criteria:**

- [x] **AC-5.1** Given `sdd-init` generates a new CLAUDE.md When the file is written Then the `## Memory` section includes a session-end paragraph naming `session-wrap` and stating what it does
- [x] **AC-5.2** Given the CLAUDE.md template is updated When a developer reads the `## Memory` section Then it describes both what memory *is* (where it lives) and what to do with it *at session end* (invoke session-wrap)
- [x] **AC-5.3** Given the existing SDD Superpowers project CLAUDE.md When reviewed Then it is also updated to match the new template — the project eats its own cooking

---

## Functional Requirements

- **FR-1** `session-wrap` is a new skill file at `skills/session-wrap/SKILL.md`
- **FR-2** `session-wrap` operates entirely from Claude's own live conversation context — no subagents are spawned
- **FR-3** `session-wrap` presents candidates interactively one group at a time: all memory candidates first (grouped by type), then lesson candidates
- **FR-4** `session-wrap` writes only entries the user explicitly approves — skipped entries produce no files and no partial writes
- **FR-5** The lesson template is defined in `skills/session-wrap/templates/lesson.md` and is referenced by the skill prose
- **FR-6** `docs/lessons/` does not require a `.gitkeep` — it is created by the first `git add` of an approved lesson file
- **FR-7** `stop.sh` emits the enriched system message (memory type checklist + skill name) — the change is additive, not a rewrite of existing stop logic
- **FR-8** The `sdd-init` CLAUDE.md template at `skills/sdd-init/templates/claude-md.md` is updated; the project's own `.claude/CLAUDE.md` is updated separately

## Non-Functional Requirements

- **NFR-1** `session-wrap` must complete in under 5 minutes including user review interactions for a typical session (fewer than 5 candidates per phase)
- **NFR-2** `stop.sh` change must not exceed the 5-second hook execution limit — the enriched message is a static string, no additional file reads
- **NFR-3** Lesson files must be human-readable without any tooling — plain Markdown with YAML frontmatter

## Error Scenarios

- **`session-wrap` invoked mid-session (not at end):** The skill still runs — there is no technical detection of "end of session." The user gets candidates based on context so far. This is acceptable; users can invoke it at any point.
- **`docs/lessons/` directory does not exist when a lesson is approved:** The skill creates the directory before writing the file.
- **User approves a memory candidate with the same slug as an existing file:** The skill warns "A memory file with this name already exists — overwrite or choose a new slug?" and waits for user input before writing.
- **`stop.sh` fires but `session-wrap` skill is not installed in the project:** The enriched stop message still renders correctly — it names a skill. If the skill is unavailable, the user sees an unusable suggestion. This is acceptable; `stop.sh` cannot verify skill installation.

## Open Questions

- None — brainstorm is complete and scope is agreed.

## Out of Scope

- Memory health auditing (detecting stale entries)
- Lesson-to-steering-file promotion workflow
- A `docs/lessons/` index file (LESSONS.md) — the directory listing is sufficient for now
- Lesson search or tagging UI beyond plain file naming
