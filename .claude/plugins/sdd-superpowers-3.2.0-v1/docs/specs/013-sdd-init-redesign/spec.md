# Feature 013: SDD Init Redesign — Mission Constitution + Steering Files

**Status:** Approved
**Created:** 2026-06-23
**Branch:** `013-sdd-init-redesign`

---

## Problem Statement

The current `sdd-init` produces a nine-article constitution that conflates SDD methodology rules (already enforced by the skills) with project-specific principles (which are always left as `[NEEDS CLARIFICATION]` stubs). The result is a 12+ exchange ceremony that generates a static document where 6 of 9 articles are generic and the 3 articles that matter are always blank. Once written, the constitution plays no active role in session behavior — there is no mechanism for operational context (tech stack, conventions, test strategy) to be automatically surfaced during relevant workflow steps.

## Goals

- Replace the nine-article ceremony with a 4-question mission charter that produces a focused, project-specific constitution in ~6 exchanges
- Auto-generate scoped steering files from detected project context so operational guidance is available without manual Q&A
- Enable skills to load relevant steering files at invocation time, keeping context lean and session-specific
- Ensure the constitution is always loaded every session while steering files are only surfaced when a skill determines they are relevant

## Non-Goals

- Migrating existing projects with nine-article constitutions (blocked with a warning at init time; migration is a future feature)
- Auto-enforcing constitution principles in code generation (stays with `sdd-plan` gates)
- Visual companion for the constitution ceremony
- Versioning steering files (they are edited directly and are not subject to spec versioning)
- Modifying the git convention setup (4-question flow in `sdd-init/reference.md` Step 5.4 is unchanged)

## Users and Context

**Primary users:** Developers starting a new project with the sdd-superpowers plugin in Claude Code
**Usage context:** First invocation of any SDD skill in a directory with no `CLAUDE.md` and no `docs/specs/` directory; also any developer editing steering files to keep operational context current
**User mental model:** Users expect init to be like `git init` or `npm init` — fast, project-aware, and opinionated. They expect the constitution to capture what their team actually believes, not a list of generic SDD rules. They expect the AI to surface relevant context automatically rather than requiring them to paste it into every prompt.

## User Stories

### Story 1: Mission Charter Creation

**As a** developer starting a new SDD project
**I want** to answer 4 focused questions about my project's mission and principles
**So that** the constitution captures what my team actually believes, not generic methodology rules

**Acceptance criteria:**

- [ ] **AC-1.1** Given `sdd-init` is invoked in a new project When the mission phase begins Then Claude presents Q1 (mission), Q2 (non-negotiables), Q3 (what failure looks like), and Q4 (amendment process) as structured UI question inputs, one per turn in that order, waiting for a response before proceeding
- [ ] **AC-1.6** Given `sdd-init` is invoked with a `--fast` flag When the mission phase begins Then Q3 ("what failure looks like") is skipped and the ceremony proceeds with Q1, Q2, and Q4 only
- [ ] **AC-1.7** Given `--fast` mode is active and Q3 is skipped When the draft constitution is synthesized Then Principles are derived from Q2 answers only, with no failure-inversion step applied
- [ ] **AC-1.2** Given the user has answered all 4 questions When the answers are collected Then Claude drafts a constitution document synthesizing the answers into Mission and Principles sections and presents it to the user for approval before writing any file
- [ ] **AC-1.3** Given the user approves the draft constitution When approval is given Then `memory/constitution.md` is written with the approved content and the `## Operational Context` pointer to `memory/steering/`
- [ ] **AC-1.4** Given the user requests changes to the draft When changes are requested Then Claude revises the draft and re-presents it without re-asking the 4 questions
- [ ] **AC-1.5** Given `memory/constitution.md` already exists in the nine-article format (contains `## Article I`) When `sdd-init` is invoked Then it warns the user and exits without writing any files

### Story 2: Steering File Scaffold

**As a** developer who has approved the constitution
**I want** pre-filled steering files generated from my project's detected context
**So that** I can edit them to match reality rather than answering another round of questions

**Acceptance criteria:**

- [ ] **AC-2.1** Given the constitution has been approved and written When Phase 2 begins Then Claude dispatches a subagent to detect project context (README, package manifests, directory structure, CI config) before generating steering files
- [ ] **AC-2.2** Given the project context has been detected When steering files are generated Then all four files are created: `memory/steering/tech-stack.md`, `memory/steering/test-strategy.md`, `memory/steering/conventions.md`, `memory/steering/team-practices.md`
- [ ] **AC-2.3** Given a steering file is generated When the content is written Then each file contains a YAML frontmatter block with `scope` and `loaded-by` fields, followed by pre-filled content derived from the detected project context
- [ ] **AC-2.4** Given project context detection returns no useful signal (empty project) When steering files are generated Then each file is created with generic placeholder content clearly marked as needing review
- [ ] **AC-2.5** Given steering files have been written When Phase 2 completes Then Claude presents a one-line summary per file ("Here's what I pre-filled — edit these to match reality") without re-asking questions
- [ ] **AC-2.6** Given the user aborts after constitution is written but before Phase 2 completes When abort occurs Then any steering files already written are kept, a warning is shown ("Steering files partially created — edit `memory/steering/` to complete them"), and no rollback is attempted

### Story 3: Skill-Invoked Steering File Loading

**As a** SDD practitioner running a workflow skill
**I want** the skill to automatically read relevant steering files before proceeding
**So that** project context is surfaced without me having to paste it into every prompt

**Acceptance criteria:**

- [ ] **AC-3.1** Given `memory/steering/` exists and a skill is invoked When the skill begins execution Then it scans `memory/steering/` for `.md` files whose `loaded-by` frontmatter includes the skill's own name
- [ ] **AC-3.2** Given a steering file matches the skill's name in `loaded-by` When the skill reads the file Then the file content is incorporated as context before the skill's first user-facing output
- [ ] **AC-3.3** Given no steering files match the invoking skill When the scan completes Then the skill proceeds without any change to its output or behavior
- [ ] **AC-3.4** Given a user creates a custom steering file in `memory/steering/` with a valid `loaded-by` frontmatter When a listed skill is next invoked Then the custom file is loaded — no init re-run or registration step required
- [ ] **AC-3.5** Given a skill loads steering files When those files are incorporated Then no announcement is made to the user — loading is silent

### Story 4: CLAUDE.md Foundation Block

**As a** developer returning to an SDD project in a new session
**I want** the AI to always load the constitution and know where to find steering files
**So that** every session starts with the project's mission in context

**Acceptance criteria:**

- [ ] **AC-4.1** Given `sdd-init` creates or updates `CLAUDE.md` When the file is written Then it contains a `## Project Foundation` section instructing the AI to load `memory/constitution.md` every session and pointing to `memory/steering/` for skill-loaded operational context
- [ ] **AC-4.2** Given `CLAUDE.md` already exists and contains `## Project Foundation` When `sdd-init` runs Then the block is not duplicated — init skips this step
- [ ] **AC-4.3** Given `CLAUDE.md` exists with `## SDD Workflow` but no `## Project Foundation` When `sdd-init` runs Then init shows the user exactly what will be appended and gets explicit approval before writing

---

## Functional Requirements

### FR-1: Mission Charter Ceremony

The 4-question constitution ceremony replaces the nine-article interactive review.

**Must:**
- Present each question using a structured UI question input (not plain prose) so the user sees a clearly labelled prompt with an open-text response field
- Ask questions in order: Q1 (mission), Q2 (non-negotiables), Q3 (what failure looks like), Q4 (amendment process) — one per turn, waiting for a response before the next
- Support a `--fast` invocation flag that skips Q3; when `--fast` is active, proceed with Q1, Q2, Q4 only
- Synthesize user answers into Mission and Principles sections (3–5 principles max) before presenting the draft
- State each principle positively as an invariant (e.g., "We never ship without a test" → "Every change ships with a failing test that passes")
- When `--fast` is not active, apply Q3 answers as the failure-inversion step: derive additional principles by inverting the stated failure modes
- Present the draft constitution to the user and require explicit approval before writing `memory/constitution.md`
- Include in every written constitution: Mission section, Principles section (3–5 items), Operational Context pointer, Amendment Process section

**Must not:**
- Include SDD methodology rules (Library-First, TDD, CLI Mandate, Simplicity Gate, Anti-Abstraction, Integration-First) in the written constitution
- Write any file until the user explicitly approves the draft
- Ask Q3 when invoked with `--fast`

### FR-2: Steering File Generation

Auto-generate four steering files from detected project context after constitution approval.

**Must:**
- Dispatch a subagent to detect: primary language, framework(s), test framework, CI configuration, directory structure conventions, and git convention file (if present)
- Generate all four files: `tech-stack.md`, `test-strategy.md`, `conventions.md`, `team-practices.md` in `memory/steering/`
- Pre-fill each file with content derived from the detected context; fall back to clearly-marked generic placeholders when context is unavailable
- Write YAML frontmatter in each file with `scope` (one of: `tech-stack`, `test-strategy`, `conventions`, `team-practices`) and `loaded-by` (comma-separated skill names per the skill-loading protocol)

**Must not:**
- Ask the user questions during Phase 2 — generation is fully automatic
- Block or fail if project context detection returns no useful signal

### FR-3: Skill-Loading Protocol

Each skill reads `memory/steering/` at invocation time and incorporates matched files as context.

**Must:**
- At skill invocation, scan `memory/steering/` for `.md` files with a `loaded-by` frontmatter field containing the skill's name
- Read and incorporate all matched files as context before producing any user-facing output
- Re-scan on every invocation (not cached) so custom files added after init are discovered automatically
- Support user-defined steering files: any `.md` in `memory/steering/` with a valid `loaded-by` frontmatter field is treated identically to init-generated files

**Skills and their default loaded files:**

| Skill | Loads |
|---|---|
| `sdd-specify` | `tech-stack.md`, `conventions.md` |
| `sdd-plan` | `tech-stack.md`, `test-strategy.md`, `conventions.md`, `team-practices.md` |
| `sdd-execute` | `tech-stack.md`, `test-strategy.md`, `conventions.md` |
| `sdd-research` | `tech-stack.md` |
| `sdd-review` | `tech-stack.md`, `test-strategy.md`, `conventions.md`, `team-practices.md` |
| `using-git` | `team-practices.md` |

**Must not:**
- Announce to the user that steering files are being loaded
- Fail or halt if `memory/steering/` does not exist — proceed silently

### FR-4: Constitution Existence Check

Before beginning the ceremony, detect whether a constitution already exists.

**Must:**
- Check for `memory/constitution.md` before starting the 4-question flow
- Detect the nine-article format by scanning for `## Article I` in the file content
- If the old format is detected: warn the user ("An existing nine-article constitution was found. Migration is not yet supported. Run the migration tool when available, or manually rename the file to start fresh.") and exit without writing any files
- If `memory/constitution.md` exists but does not contain `## Article I`: treat the project as already initialised and skip Phase 1

**Must not:**
- Overwrite an existing `memory/constitution.md` of any format without explicit user approval

### FR-5: CLAUDE.md Foundation Block

Add the Project Foundation section to `CLAUDE.md` as part of scaffold creation.

**Must:**
- Write or append a `## Project Foundation` block to `CLAUDE.md` containing: instruction to load `memory/constitution.md` every session, pointer to `memory/steering/` with note that each file's `loaded-by` frontmatter lists which skills inject it
- Detect existing `## Project Foundation` marker before writing — skip if already present
- Detect existing `## SDD Workflow` marker (old init format) and append the new block after showing the user the exact text to be added and receiving explicit approval

**Must not:**
- Silently overwrite or duplicate any existing CLAUDE.md content

---

## Non-Functional Requirements

### Usability

- The full init flow (Phase 1 + Phase 2 + CLAUDE.md + git convention) must complete within 10 conversational exchanges
- Each steering file must be readable and editable by a developer without reading any documentation
- The draft constitution presented before approval must fit in a single conversational turn (no wall of text)

### Reliability

- If Phase 1 is aborted before `memory/constitution.md` is written, no files are written
- If Phase 2 is aborted mid-generation, files already written are kept with a clear warning
- If `memory/` or `memory/steering/` directories do not exist, they are created before writing files

### Compatibility

- The skill-loading protocol must be additive — skills that do not yet implement it continue to function without loading steering files; no existing skill behavior breaks if `memory/steering/` is absent

---

## Error Scenarios

| Scenario | Expected Behavior |
|---|---|
| `memory/constitution.md` exists in nine-article format | Warn user, exit without writing any files, suggest manual rename to start fresh |
| `memory/constitution.md` exists in new format | Skip Phase 1 entirely; proceed to Phase 2 if `memory/steering/` is also absent |
| User aborts during 4-question ceremony (before approval) | No files written; inform user: "Init aborted. No files were created. Invoke `sdd-init` again to restart." |
| User aborts during steering file generation (Phase 2) | Files already written are kept; show warning listing which files were created and which were not |
| Project context detection subagent returns no signal | Generate all 4 steering files with clearly-marked generic placeholder content |
| `memory/steering/` does not exist when a skill is invoked | Skill proceeds silently without loading any steering context |
| Steering file has malformed frontmatter (missing `loaded-by`) | Skill skips that file silently; no error |
| Custom steering file names a skill that does not exist in `loaded-by` | File is ignored; no error |

---

## Open Questions

None — all questions resolved during brainstorm and spec approval.

---

## Out of Scope (Future Considerations)

- Migration tooling for existing nine-article constitutions
- Visual companion or browser-based UI for constitution ceremony
- Steering file versioning or change tracking
- Constitution compliance linting during `sdd-plan` gate checks
- Multi-project monorepo support where each sub-project has its own constitution and steering files
- Auto-generating steering files for existing projects that have no `memory/steering/` directory
