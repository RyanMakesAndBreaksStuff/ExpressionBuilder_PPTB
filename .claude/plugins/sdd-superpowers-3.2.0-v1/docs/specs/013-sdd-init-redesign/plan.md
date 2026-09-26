# Implementation Plan: SDD Init Redesign — Mission Constitution + Steering Files

> **For agentic workers:** Use sdd-tasks to generate an executable task list from this plan.

**Spec:** docs/specs/013-sdd-init-redesign/spec.md
**Research:** N/A
**Created:** 2026-06-23

---

## Goal

Rewrite `sdd-init` to produce a focused mission constitution from 4 questions and auto-generate scoped steering files from project context, then add silent steering file loading to 6 consuming skills.

## Architecture

The redesign has two layers: `sdd-init` (writer) and consuming skills (readers), connected by a steering file frontmatter contract. `sdd-init` generates `memory/constitution.md` from a 4-question ceremony and scaffolds `memory/steering/*.md` from detected project context. Consuming skills scan `memory/steering/` at invocation time, filtering by their own name in each file's `loaded-by` frontmatter, and silently incorporate matched files as context. No new scripts or abstractions are introduced — all changes are edits to existing markdown skill files.

## Tech Stack

| Layer | Technology | Justification |
|---|---|---|
| Skill content | Markdown with YAML frontmatter | Matches existing skill file format (FR-3: frontmatter contract) |
| Question UI | AskUserQuestion structured input | FR-1: questions presented as structured UI inputs |
| Project detection | Subagent reading manifest files | FR-2: auto-fill steering files from detected context (existing pattern from sdd-init Step 1.5) |

## File Structure

- `skills/sdd-init/reference.md` — complete rewrite of ceremony (Steps 2–3), scaffold (Step 5 adds steering phase), existence check (Step 1.5), CLAUDE.md block (Step 5.3)
- `skills/sdd-init/SKILL.md` — update Quick Reference table and Process Summary
- `skills/sdd-specify/reference.md` — prepend Step 0: Load Steering Context
- `skills/sdd-plan/reference.md` — prepend Step 0: Load Steering Context
- `skills/sdd-execute/reference.md` — prepend Step 0: Load Steering Context
- `skills/sdd-research/reference.md` — prepend Step 0: Load Steering Context
- `skills/sdd-review/reference.md` — prepend Step 0: Load Steering Context
- `skills/using-git/reference.md` — prepend Step 0: Load Steering Context
- `docs/specs/013-sdd-init-redesign/quickstart.md` — 4 smoke test scenarios (written first)

## Complexity Tracking

All three Pre-Implementation Gates pass. No gate violations.

---

## Phase 0: Contract Definition + Test Artifacts

**Implements:** FR-3 (schema) | **Satisfies:** AC-2.3, AC-3.1
**Files:** `docs/specs/013-sdd-init-redesign/quickstart.md`

Define the steering file frontmatter schema (the contract between init and consuming skills) and write smoke test scenarios before any implementation. These scenarios are the failing tests — current `sdd-init` does not produce them.

### 0.1 Define Steering File Frontmatter Schema

The canonical frontmatter that every steering file must contain:

```yaml
---
scope: <tech-stack | test-strategy | conventions | team-practices | custom>
loaded-by: <comma-separated list of skill names that load this file>
---
```

Rules:
- `scope` must be one of the five values above
- `loaded-by` values must match skill names exactly: `sdd-specify`, `sdd-plan`, `sdd-execute`, `sdd-research`, `sdd-review`, `using-git`
- Custom steering files may list any subset of skills in `loaded-by`
- Files without valid `loaded-by` frontmatter are silently skipped by all skills

Default `loaded-by` values for the four init-generated files:

| File | loaded-by |
|---|---|
| `tech-stack.md` | `sdd-specify, sdd-plan, sdd-execute, sdd-research, sdd-review` |
| `test-strategy.md` | `sdd-plan, sdd-execute, sdd-review` |
| `conventions.md` | `sdd-specify, sdd-plan, sdd-execute, sdd-review` |
| `team-practices.md` | `sdd-plan, sdd-review, using-git` |

### 0.2 Write quickstart.md (Smoke Test Scenarios)

Write `docs/specs/013-sdd-init-redesign/quickstart.md` with 4 scenarios. These are the acceptance tests — verify each FAILS with the current skill before implementing.

```markdown
# Quickstart: SDD Init Redesign Smoke Tests

## Scenario 1: Full Init (Standard Mode)

**Setup:** Empty project directory with no `memory/`, `CLAUDE.md`, or `docs/specs/`

**Steps:**
1. Invoke `sdd-init` (no flags)

**Expected — Phase 1:**
- Q1 presented as structured AskUserQuestion input with header "Project Mission"
- After Q1 answer → Q2 presented as structured input (not Q3 yet)
- After Q2 answer → Q3 presented as structured input "What does a bad outcome look like?"
- After Q3 answer → Q4 presented as structured input with default amendment process option
- After Q4 answer → draft constitution shown (Mission + Principles sections) for approval
- After approval → `memory/constitution.md` written with: `## Mission`, `## Principles` (principles derived from Q2 + Q3 answers), `## Operational Context` pointer to `memory/steering/`, `## Amendment Process`
- Constitution does NOT contain "Article I", "Article II", or any SDD methodology rules

**Expected — Phase 2:**
- `memory/steering/tech-stack.md` created with `scope: tech-stack` and `loaded-by: sdd-specify, sdd-plan, sdd-execute, sdd-research, sdd-review`
- `memory/steering/test-strategy.md` created with `scope: test-strategy` and `loaded-by: sdd-plan, sdd-execute, sdd-review`
- `memory/steering/conventions.md` created with `scope: conventions` and `loaded-by: sdd-specify, sdd-plan, sdd-execute, sdd-review`
- `memory/steering/team-practices.md` created with `scope: team-practices` and `loaded-by: sdd-plan, sdd-review, using-git`
- Summary shown: "Here's what I pre-filled — edit these to match reality"

**Expected — Post-scaffold:**
- `CLAUDE.md` contains `## Project Foundation` section with constitution pointer and steering directory pointer
- `docs/git-convention.md` created via 4-question Q&A (unchanged from current)

---

## Scenario 2: Fast Mode (--fast flag)

**Setup:** Empty project directory

**Steps:**
1. Invoke `sdd-init --fast`

**Expected:**
- Q1 asked (Mission)
- Q2 asked (Non-negotiables)
- Q3 NOT asked — skipped entirely
- Q4 asked (Amendment process)
- Draft constitution derived from Q2 only (no failure-inversion from Q3)
- Total question turns: 3 (not 4)

---

## Scenario 3: Old Constitution Detected

**Setup:** `memory/constitution.md` exists containing `## Article I`

**Steps:**
1. Invoke `sdd-init`

**Expected:**
- Warning message: "An existing nine-article constitution was found. Migration is not yet supported..."
- No files written or overwritten
- Init exits without proceeding to any further step

---

## Scenario 4: Steering File Loaded by Consuming Skill

**Setup:**
- `memory/steering/tech-stack.md` exists with frontmatter `loaded-by: sdd-specify`
- Content: `# Tech Stack\n## Languages\nTypeScript`

**Steps:**
1. Invoke `sdd-specify`

**Expected:**
- `tech-stack.md` content is incorporated into skill's context before first user-facing output
- No announcement about loading — silent
- Skill proceeds normally; TypeScript context is available for the specification session
```

- [ ] Verify Scenario 1 FAILS with current `sdd-init` (current skill asks Article I not Q1) — **RED**
- [ ] Verify Scenario 2 FAILS (current skill has no --fast flag) — **RED**
- [ ] Verify Scenario 3 FAILS (current skill has no old-constitution detection) — **RED**
- [ ] Verify Scenario 4 FAILS (current sdd-specify does not read steering files) — **RED**
- [ ] Commit: `test: add quickstart smoke scenarios for 013-sdd-init-redesign`

---

## Phase 1: Rewrite sdd-init

**Implements:** FR-1, FR-2, FR-4, FR-5 | **Satisfies:** AC-1.1, AC-1.2, AC-1.3, AC-1.4, AC-1.5, AC-1.6, AC-1.7, AC-2.1, AC-2.2, AC-2.3, AC-2.4, AC-2.5, AC-2.6, AC-4.1, AC-4.2, AC-4.3
**Files:** `skills/sdd-init/reference.md`, `skills/sdd-init/SKILL.md`

### 1.1 Update Step 1.5: Add Old Constitution Detection (FR-4)

In `skills/sdd-init/reference.md`, update Step 1.5 to add an existence check after the project context exploration. The existing project context exploration subagent is retained unchanged. Add this block immediately after the subagent dispatch and before Step 2:

```markdown
### Constitution Existence Check

After the exploration subagent returns, check `memory/constitution.md`:

- **If `memory/constitution.md` does not exist:** proceed to Step 2 normally.
- **If `memory/constitution.md` exists and contains `## Article I`:**
  Announce: "An existing nine-article constitution was found at `memory/constitution.md`. Migration to the new mission-charter format is not yet supported. To start fresh: rename or delete the existing file, then re-invoke `sdd-init`. No files will be written."
  **STOP — do not proceed to Step 2 or any scaffold step.**
- **If `memory/constitution.md` exists and does NOT contain `## Article I`:**
  Announce: "A constitution already exists at `memory/constitution.md`. Skipping Phase 1 — proceeding to steering file scaffold."
  Jump to Step 5.2 (steering file generation).
```

- [ ] Apply the existence check block to `skills/sdd-init/reference.md` after the exploration subagent section
- [ ] Run Scenario 3 from quickstart.md — expect warning shown, no files written — **GREEN**
- [ ] Commit: `feat: add old-constitution detection to sdd-init (FR-4)`

### 1.2 Replace Step 2: Mission Charter Ceremony (FR-1)

Remove the entire Nine Articles Interactive Review section (Article I through Article IX, the amendment process confirmation, and the final approval gate). Replace with:

```markdown
## Step 2: Mission Charter Ceremony

**If invoked with `--fast` flag:** skip Q3. Ask Q1, Q2, Q4 only.

Present each question using the AskUserQuestion structured UI tool — not plain prose. One question per turn. Wait for a response before presenting the next.

### Q1 — Project Mission

```
Question: "In one or two sentences: what does this project exist to do, and who does it serve?"
Header: "Project Mission"
```

### Q2 — Non-negotiables

```
Question: "What are 1–3 things your team will never compromise on? (e.g. 'we never ship without a test', 'CLI-first always', 'no external dependencies without a spike')"
Header: "Non-negotiables"
```

### Q3 — What Failure Looks Like (skip if --fast)

```
Question: "What does a bad outcome look like for this project? (e.g. 'feature works locally but breaks in prod', 'specs drift from code', 'every PR needs a rewrite')"
Header: "Failure Modes"
```

### Q4 — Amendment Process

```
Question: "How should these principles change over time?"
Header: "Amendment Process"
Options:
  - "Document rationale → explicit team approval → backwards-compatibility check (Recommended)"
  - "Custom (I'll describe it)"
```

If the user selects "Custom": ask a follow-up open-text question for the custom amendment process.

### Draft Constitution

After collecting all answers:

1. Synthesize answers into a draft `memory/constitution.md`:
   - **Mission:** synthesized from Q1
   - **Principles:** derived from Q2 (stated positively as invariants). If NOT `--fast`: also apply failure-inversion from Q3 — convert each failure mode into its positive invariant and add to Principles. Total Principles: 3–5 items.
   - **Operational Context:** fixed pointer block (see Step 5.1 template)
   - **Amendment Process:** from Q4

2. Present the draft in full to the user.

3. Ask: "Does this capture your project's principles accurately? Say yes to write it, or describe what to change."

4. If changes requested: revise and re-present without re-asking questions. Repeat until approved.

5. On approval: proceed to Step 3.

**Must not** include any SDD methodology rules (Library-First, TDD, CLI Mandate, Simplicity Gate, Anti-Abstraction, Integration-First) in the constitution.
```

- [ ] Apply the replacement to `skills/sdd-init/reference.md` (remove old Steps 2–4, insert new Step 2)
- [ ] Run Scenario 1 from quickstart.md — verify Q1 appears as structured input — **GREEN**
- [ ] Run Scenario 2 — verify Q3 is skipped in --fast mode — **GREEN**
- [ ] Commit: `feat: replace nine-article ceremony with 4-question mission charter (FR-1)`

### 1.3 Add Step 3: Write Constitution

Renumber the former Step 4 (Final Approval Gate) as the tail of new Step 2 (handled above). Add a new Step 3 that is purely the write action:

```markdown
## Step 3: Write memory/constitution.md

Announce: "Writing `memory/constitution.md`."

Create `memory/` directory if it does not exist.

Write `memory/constitution.md` using the approved draft. The file must contain exactly these sections in this order:

---
# [Project Name] Constitution

> Loaded every session. To amend, follow the Amendment Process below.

## Mission
[Synthesized from Q1]

## Principles
1. [Derived from Q2 + Q3 — stated as a positive invariant]
2. [...]
3. [...]

## Operational Context
Steering files in `memory/steering/` carry project-specific operational context
(tech stack, test strategy, conventions, team practices). Each file's `loaded-by`
frontmatter lists which skills silently incorporate it during that skill's session.
Edit steering files freely — they are not subject to the amendment process.

## Amendment Process
[From Q4]
---
```

- [ ] Apply Step 3 write block to `skills/sdd-init/reference.md`
- [ ] Commit: `feat: add constitution write step to sdd-init`

### 1.4 Add Step 5.2: Steering File Scaffold (FR-2)

In `skills/sdd-init/reference.md`, add Step 5.2 immediately after Step 5.1 (constitution write). Step 5.2 becomes the steering scaffold. Renumber subsequent steps (former 5.2 `.gitkeep` → 5.3, etc.):

```markdown
### Step 5.2 Generate Steering Files

Announce: "Generating steering files from your project context. Edit these to match reality."

Use the Project Profile from Step 1.5 to pre-fill each file. If the profile has no signal for a field, write `[Edit to match reality]` as the placeholder. Create `memory/steering/` if it does not exist.

Write all four files:

**`memory/steering/tech-stack.md`**
```markdown
---
scope: tech-stack
loaded-by: sdd-specify, sdd-plan, sdd-execute, sdd-research, sdd-review
---

# Tech Stack

## Languages
[Detected: {{language}} — edit to match reality]

## Frameworks
[Detected: {{framework}} — edit to match reality]

## Infrastructure
[Detected: {{infra}} — edit to match reality]

## Package Manager
[Detected: {{pkg_manager}} — edit to match reality]
```

**`memory/steering/test-strategy.md`**
```markdown
---
scope: test-strategy
loaded-by: sdd-plan, sdd-execute, sdd-review
---

# Test Strategy

## Test Framework
[Detected: {{test_framework}} — edit to match reality]

## Test Levels
- Unit tests: [describe scope]
- Integration tests: [describe scope]
- E2E tests: [describe scope or N/A]

## Coverage Expectations
[e.g., ≥80% line coverage on business logic; 100% on critical paths]

## Mocking Policy
[e.g., Real databases in integration tests; mock only external HTTP calls]
```

**`memory/steering/conventions.md`**
```markdown
---
scope: conventions
loaded-by: sdd-specify, sdd-plan, sdd-execute, sdd-review
---

# Conventions

## File Naming
[Detected: {{file_naming}} — edit to match reality]

## Directory Structure
[Detected: {{dir_structure}} — edit to match reality]

## Code Style
[Detected: {{code_style}} — edit to match reality]

## Architectural Patterns
[e.g., repository pattern for data access, composition over inheritance — edit to match reality]
```

**`memory/steering/team-practices.md`**
```markdown
---
scope: team-practices
loaded-by: sdd-plan, sdd-review, using-git
---

# Team Practices

## Branching
[From docs/git-convention.md if detected — edit to match reality]

## Code Review
[e.g., 1 approver required, 24h turnaround target — edit to match reality]

## Release Process
[e.g., tag on main, semantic versioning — edit to match reality]
```

After writing all four files, show a one-line summary per file:
> "Steering files created in `memory/steering/`:
> - `tech-stack.md` — pre-filled with detected stack
> - `test-strategy.md` — pre-filled with detected test framework
> - `conventions.md` — pre-filled with detected structure
> - `team-practices.md` — pre-filled from git convention
>
> Edit these files to match reality — they are loaded automatically by skills when relevant."

**Abort handling:** If interrupted mid-generation, files already written are kept. No rollback. Warn: "Steering files partially created — edit `memory/steering/` to complete them."
```

- [ ] Apply Step 5.2 to `skills/sdd-init/reference.md`, renumber subsequent sub-steps
- [ ] Run Scenario 1 — verify 4 steering files created with correct frontmatter — **GREEN**
- [ ] Commit: `feat: add steering file scaffold phase to sdd-init (FR-2)`

### 1.5 Update Step 5.3: CLAUDE.md Foundation Block (FR-5)

In `skills/sdd-init/reference.md`, update the CLAUDE.md creation step to use the `## Project Foundation` marker and the new content. The detection logic changes to check for `## Project Foundation` first (new format), then `## SDD Workflow` (old format):

```markdown
### Step 5.3 Create or Update CLAUDE.md

**Detection order:**
1. If `CLAUDE.md` does not exist → create it (see template below)
2. If `CLAUDE.md` exists and contains `## Project Foundation` → skip (already initialised)
3. If `CLAUDE.md` exists and contains `## SDD Workflow` but not `## Project Foundation` → append the `## Project Foundation` block; show the user exactly what will be appended and get approval before writing
4. If `CLAUDE.md` exists with neither marker → append the `## Project Foundation` block after showing diff and getting approval

**`## Project Foundation` block to write or append:**

```markdown
## Project Foundation

Before any feature work, read:
- `memory/constitution.md` — Mission and principles. Loaded every session.
- `memory/steering/` — Operational context. Loaded by skills when relevant.
  Each file's `loaded-by` frontmatter shows which skills incorporate it silently.
```

**If creating a new CLAUDE.md**, write the full template from `sdd-init/reference.md` existing Step 5.3, replacing its `## SDD Workflow` section with `## Project Foundation` at the top.
```

- [ ] Apply the CLAUDE.md update to `skills/sdd-init/reference.md`
- [ ] Run Scenario 1 — verify CLAUDE.md contains `## Project Foundation` — **GREEN**
- [ ] Run Scenario 1 again on a project with existing `## SDD Workflow` CLAUDE.md — verify append shown for approval — **GREEN**
- [ ] Commit: `feat: update CLAUDE.md scaffold to use Project Foundation block (FR-5)`

### 1.6 Update sdd-init SKILL.md

Update the Quick Reference table and Process Summary to reflect the new flow:

```markdown
## Quick Reference

Files created by sdd-init:

| File | Purpose |
|------|---------|
| `memory/constitution.md` | Mission Charter — mission statement + 3–5 project-specific principles |
| `memory/steering/tech-stack.md` | Tech stack context — loaded by sdd-specify, sdd-plan, sdd-execute, sdd-research, sdd-review |
| `memory/steering/test-strategy.md` | Test philosophy — loaded by sdd-plan, sdd-execute, sdd-review |
| `memory/steering/conventions.md` | Code conventions — loaded by sdd-specify, sdd-plan, sdd-execute, sdd-review |
| `memory/steering/team-practices.md` | Team practices — loaded by sdd-plan, sdd-review, using-git |
| `docs/specs/.gitkeep` | Spec directory scaffold |
| `CLAUDE.md` | SDD workflow instructions with Project Foundation pointer |
| `docs/git-convention.md` | Branch naming + commit format rules |

Flags: `--fast` skips Q3 (failure modes) — use for returning users or time-constrained sessions.

## Process Summary

1. Detect project context (subagent, silent) + check for existing constitution
2. Mission Charter: 4 questions via structured UI (Q1 mission, Q2 non-negotiables, Q3 failure modes, Q4 amendment) — Q3 skipped if `--fast`
3. Draft constitution from answers → user approval gate → write `memory/constitution.md`
4. Auto-generate 4 steering files from detected context → write `memory/steering/*.md`
5. Create scaffold files (CLAUDE.md, docs/specs/.gitkeep, docs/git-convention.md) in one uninterrupted sequence
6. Initial commit → hand off to `sdd-superpowers:sdd-workflow`
```

- [ ] Apply Quick Reference and Process Summary updates to `skills/sdd-init/SKILL.md`
- [ ] Commit: `docs: update sdd-init SKILL.md for mission-charter redesign`

---

## Phase 2: Steering File Loading Protocol

**Implements:** FR-3 | **Satisfies:** AC-3.1, AC-3.2, AC-3.3, AC-3.4, AC-3.5
**Files:** `skills/sdd-specify/reference.md`, `skills/sdd-plan/reference.md`, `skills/sdd-execute/reference.md`, `skills/sdd-research/reference.md`, `skills/sdd-review/reference.md`, `skills/using-git/reference.md`

Each skill gets the same Step 0 block prepended to its `reference.md`, with its own skill name substituted in the description. The block is identical in structure — only the skill name in the prose differs.

### Canonical Step 0 Template

```markdown
## Step 0: Load Steering Context

Scan `memory/steering/` for `.md` files whose `loaded-by` frontmatter includes `<skill-name>`. Read each matched file and incorporate its content as context before producing any user-facing output. Loading is silent — no announcement to the user.

If `memory/steering/` does not exist, or no files contain `<skill-name>` in `loaded-by`, proceed without change.

Rescan on every invocation — custom files added after init are discovered automatically.
```

### 2.1 Add to sdd-specify/reference.md

Prepend Step 0 (substituting `sdd-specify` for `<skill-name>`) before the existing `## Step 1` in `skills/sdd-specify/reference.md`.

- [ ] Prepend Step 0 to `skills/sdd-specify/reference.md`
- [ ] Run Scenario 4 from quickstart.md against sdd-specify — verify steering content in context — **GREEN**
- [ ] Commit: `feat: add steering file loading to sdd-specify (FR-3)`

### 2.2 Add to sdd-plan/reference.md

Prepend Step 0 (substituting `sdd-plan`) before `## Step 1: Read All Inputs` in `skills/sdd-plan/reference.md`.

- [ ] Prepend Step 0 to `skills/sdd-plan/reference.md`
- [ ] Commit: `feat: add steering file loading to sdd-plan (FR-3)`

### 2.3 Add to sdd-execute/reference.md

Prepend Step 0 (substituting `sdd-execute`) before `## Step 1: Verify Starting Baseline` in `skills/sdd-execute/reference.md`.

- [ ] Prepend Step 0 to `skills/sdd-execute/reference.md`
- [ ] Commit: `feat: add steering file loading to sdd-execute (FR-3)`

### 2.4 Add to sdd-research/reference.md

Prepend Step 0 (substituting `sdd-research`) before `## Step 1: Load the Spec` in `skills/sdd-research/reference.md`.

- [ ] Prepend Step 0 to `skills/sdd-research/reference.md`
- [ ] Commit: `feat: add steering file loading to sdd-research (FR-3)`

### 2.5 Add to sdd-review/reference.md

Prepend Step 0 (substituting `sdd-review`) before `## Mode A: Spec Review` in `skills/sdd-review/reference.md`.

- [ ] Prepend Step 0 to `skills/sdd-review/reference.md`
- [ ] Commit: `feat: add steering file loading to sdd-review (FR-3)`

### 2.6 Add to using-git/reference.md

Prepend Step 0 (substituting `using-git`) before `## Convention Loading` in `skills/using-git/reference.md`.

- [ ] Prepend Step 0 to `skills/using-git/reference.md`
- [ ] Commit: `feat: add steering file loading to using-git (FR-3)`

---

## Phase 3: Integration Verification

**Implements:** All FRs | **Satisfies:** All ACs

### 3.1 Run All Quickstart Scenarios

- [ ] Run Scenario 1 (full init, standard mode) — verify constitution, 4 steering files, CLAUDE.md all created correctly
- [ ] Run Scenario 2 (--fast mode) — verify Q3 skipped, only 3 question turns
- [ ] Run Scenario 3 (old constitution detected) — verify warning shown, no files written
- [ ] Run Scenario 4 (skill loads steering files) — verify sdd-specify incorporates tech-stack.md silently

### 3.2 AC Spot-Check

- [ ] AC-1.5: place nine-article `constitution.md` (with `## Article I`) in `memory/` → invoke `sdd-init` → confirm no files written
- [ ] AC-2.6: create `memory/constitution.md` via Phase 1, then simulate abort mid-Phase 2 → confirm partial steering files kept with warning
- [ ] AC-3.3: invoke `sdd-specify` with no `memory/steering/` directory → confirm no error, normal skill behavior
- [ ] AC-3.4: add custom `memory/steering/notes.md` with `loaded-by: sdd-specify` → invoke sdd-specify → confirm custom file loaded without re-running init
- [ ] AC-4.2: run sdd-init twice on same project → confirm `## Project Foundation` not duplicated in CLAUDE.md

### 3.3 Final Commit

- [ ] Commit: `feat: complete 013-sdd-init-redesign — mission constitution and steering files`

---

## Quickstart Validation

```
# Full init verification
1. Create empty directory
2. Invoke sdd-init
3. Answer Q1: "This project provides SDD workflow skills for Claude Code users."
4. Answer Q2: "Skills are always tested before marked complete; specs are approved before planning."
5. Answer Q3: "Skills get merged without smoke tests; plans drift from specs."
6. Answer Q4: Accept default
7. Approve draft constitution
8. Inspect memory/constitution.md — must have Mission, Principles, Operational Context, Amendment Process; must NOT have "Article I"
9. Inspect memory/steering/ — must contain tech-stack.md, test-strategy.md, conventions.md, team-practices.md each with valid frontmatter
10. Inspect CLAUDE.md — must contain "## Project Foundation"

# Fast mode verification
1. Create empty directory
2. Invoke sdd-init --fast
3. Confirm only 3 questions appear (no "bad outcome" question)

# Steering load verification
1. In a project with memory/steering/tech-stack.md (loaded-by: sdd-specify)
2. Invoke sdd-specify on a new feature
3. Confirm spec produces language/framework references matching tech-stack.md content
```
