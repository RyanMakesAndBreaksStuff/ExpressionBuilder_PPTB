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
- Warning message: "An existing nine-article constitution was found at `memory/constitution.md`. Migration to the new mission-charter format is not yet supported. To start fresh: rename or delete the existing file, then re-invoke `sdd-init`. No files will be written."
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
