# Implementation Plan: Constitutional Foundation Init

> **For agentic workers:** Use sdd-tasks to generate an executable task list from this plan.

**Spec:** docs/specs/001-constitutional-init/spec.md
**Created:** 2026-04-17

---

## Goal

Extend `sdd-workflow` to detect new (uninitialised) projects and trigger an interactive `sdd-init` flow that creates `memory/constitution.md`, `docs/specs/`, and `CLAUDE.md` before any feature work begins.

## Architecture

Two skill files are the entire implementation surface. `sdd-workflow/SKILL.md` gains a "New Project Detection" block at its very top — before any routing logic — that checks for `CLAUDE.md` and `docs/specs/` and delegates to `sdd-init` if neither exists (FR-1). `sdd-init/SKILL.md` is a new skill that owns the full init ceremony: codebase exploration to build a Project Profile (FR-6), Nine Articles interactive review with personalised defaults (FR-2, FR-3), scaffold file creation (FR-4), and an explicit handoff back to the caller's original intent (FR-5). The constitution template is embedded inline in `sdd-init/SKILL.md` so it is always co-located with the logic that writes it.

## Tech Stack

| Layer | Artifact | Justification |
|-------|----------|---------------|
| Skill logic | Markdown SKILL.md files | All sdd-superpowers skills are markdown instructions; no code runtime |
| Detection | Filesystem existence check prose in SKILL.md | FR-1 requires checking CLAUDE.md + docs/specs/ |
| State | Conversational turns | FR-2 requires one Article per turn; no persistent state beyond the conversation |

## File Structure

- `skills/sdd-workflow/SKILL.md` — add New Project Detection block before routing (FR-1, FR-5)
- `skills/sdd-init/SKILL.md` — new skill: project context exploration, Nine Articles review, scaffold creation, resume routing (FR-2, FR-3, FR-4, FR-5, FR-6)
- `docs/specs/001-constitutional-init/quickstart.md` — smoke-test scenarios

## Complexity Tracking

(Empty — all gates passed)

---

## Phase 0: Verification Baselines

**Principle:** Confirm current behaviour before changing anything. These are structural/behavioural checks, not executable tests — skill files are LLM instructions, so verification is checklist-based.

### 0.1 Baseline Check — sdd-workflow has no init detection

- [ ] Read `skills/sdd-workflow/SKILL.md`
- [ ] Confirm: no mention of "new project", "CLAUDE.md detection", "init flow", or "uninitialised"
- [ ] Record: "BASELINE CONFIRMED — no init detection present"
- [ ] Commit: `test: record baseline — sdd-workflow has no init detection`

### 0.2 Baseline Check — sdd-init does not exist

- [ ] Confirm `skills/sdd-init/SKILL.md` does not exist
- [ ] Record: "BASELINE CONFIRMED — sdd-init skill absent"

---

## Phase 1: New Project Detection in sdd-workflow

**Implements:** FR-1, FR-5
**Files:** `skills/sdd-workflow/SKILL.md`

### 1.1 Write the behavioural contract (failing check)

- [ ] Write verification checklist (this IS the "failing test" — conditions not yet met):
  ```
  VERIFICATION CHECKLIST — sdd-workflow new project detection
  [ ] sdd-workflow checks for CLAUDE.md existence before routing
  [ ] sdd-workflow checks for docs/specs/ existence before routing
  [ ] If NEITHER exists: sdd-workflow delegates to sdd-init before any routing
  [ ] If EITHER exists: sdd-workflow skips init and routes normally
  [ ] After sdd-init completes: sdd-workflow resumes routing for original request
  ```
- [ ] Confirm checklist items FAIL against current `skills/sdd-workflow/SKILL.md` (none present)
- [ ] Commit: `test: add behavioural contract for sdd-workflow init detection`

### 1.2 Implement: add New Project Detection block to sdd-workflow

- [ ] Open `skills/sdd-workflow/SKILL.md`
- [ ] Insert the following block immediately after the frontmatter and title, before `## Instruction Priority`:

  ```markdown
  ## New Project Detection (runs before all routing)

  Before evaluating any routing or skill invocation, check whether this project is initialised:

  1. Check if `CLAUDE.md` exists in the current working directory
  2. Check if `docs/specs/` directory exists

  **If NEITHER exists** → this is an uninitialised project:
  - Announce: "I'm using sdd-init to set up the Constitutional Foundation for this new SDD project."
  - Invoke `sdd-init` before taking any other action
  - After `sdd-init` completes, return here and re-evaluate the user's original request using the routing rules below

  **If EITHER exists** → project is already initialised:
  - Skip this block entirely
  - Proceed to routing below
  ```

- [ ] Run verification checklist from 1.1 — all items must PASS
- [ ] Commit: `feat: add new project detection to sdd-workflow`

---

## Phase 2: sdd-init Skill — Project Exploration + Nine Articles Review

**Implements:** FR-2, FR-3, FR-6
**Files:** `skills/sdd-init/SKILL.md`

### 2.1 Write behavioural contract (failing check)

- [ ] Write verification checklist:
  ```
  VERIFICATION CHECKLIST — sdd-init Nine Articles review + exploration
  [ ] sdd-init announces itself before doing anything
  [ ] sdd-init dispatches exploration subagent before Article review (Step 1.5)
  [ ] exploration produces Project Profile (language, framework, type, tests, patterns)
  [ ] defaults are personalised from Project Profile per personalisation table
  [ ] IV–VI stubs remain [NEEDS CLARIFICATION] regardless of project context
  [ ] sdd-init presents Articles I–IX one at a time (one per conversational turn)
  [ ] each Article includes a one-sentence governance statement
  [ ] Articles I, II, III, VII, VIII, IX have pre-filled default content
  [ ] Articles IV, V, VI have [NEEDS CLARIFICATION] stubs with guidance
  [ ] Each Article offers: accept default / provide custom / mark not applicable
  [ ] sdd-init requests explicit approval before writing any files
  [ ] sdd-init writes NO files until approval is given
  ```
- [ ] Confirm checklist FAILS (sdd-init does not exist)
- [ ] Commit: `test: add behavioural contract for sdd-init Nine Articles review`

### 2.2 Implement: create sdd-init/SKILL.md with Nine Articles logic

- [ ] Create `skills/sdd-init/SKILL.md` with the following content:

  ```markdown
  ---
  name: sdd-init
  description: Use when sdd-workflow detects a new uninitialised project — creates Constitutional Foundation (memory/constitution.md), docs/specs/ scaffold, and CLAUDE.md before any feature work begins
  ---

  # SDD Init: Constitutional Foundation

  Sets up the architectural constitution and project scaffold for a new SDD project.

  **Announce at start:** "I'm using sdd-init to set up the Constitutional Foundation for this new SDD project."

  <HARD-GATE>
  Do NOT create any feature specs, plans, or code until the constitution is approved and the scaffold is written. This skill produces ONLY the project foundation.
  </HARD-GATE>

  ## Overview

  The Constitutional Foundation is a set of immutable architectural principles (Nine Articles) stored in `memory/constitution.md`. Every implementation plan in this project must pass gates derived from these articles. No feature work begins before the constitution exists.

  ## Step 1: Announce and Orient

  Tell the user:
  > "Before we begin feature work, I'll walk you through the Nine Articles of your project constitution — a set of architectural principles that will govern every implementation plan. We'll go through them one at a time. For each article, you can: accept the default, provide custom text, or mark it as not applicable. Nothing is written until you approve the final result."

  ## Step 2: Nine Articles Interactive Review

  Present each Article in order. For each one:
  1. Show the Article number and name
  2. Show the default text (or stub for IV–VI)
  3. Ask: "Accept this default, provide custom text, or mark as not applicable?"
  4. Record the response — do NOT write files yet

  ---

  ### Article I: Library-First Principle

  **Default:**
  > Every feature in this project MUST begin its existence as a standalone library. No feature shall be implemented directly within application code without first being abstracted into a reusable library component with clear boundaries and minimal dependencies.

  ---

  ### Article II: CLI Interface Mandate

  **Default:**
  > All libraries MUST expose their functionality through a command-line interface. CLI interfaces must: accept text as input (via stdin, arguments, or files), produce text as output (via stdout), and support JSON format for structured data exchange. This enforces observability and testability.

  ---

  ### Article III: Test-First Imperative

  **Default:**
  > This is NON-NEGOTIABLE: All implementation MUST follow strict Test-Driven Development. No implementation code shall be written before: (1) tests are written, (2) tests are validated and approved, (3) tests are confirmed to FAIL (Red phase). Every implementation step in every plan must be preceded by a failing test step.

  ---

  ### Article IV: [NEEDS CLARIFICATION]

  **Default stub:**
  > [NEEDS CLARIFICATION: Define your fourth architectural principle here. Consider: how should research and technical context be gathered before implementation? (e.g. "All features with external dependencies require a research.md before planning begins")]

  ---

  ### Article V: [NEEDS CLARIFICATION]

  **Default stub:**
  > [NEEDS CLARIFICATION: Define your fifth architectural principle here. Consider: how should production feedback and operational learnings feed back into specifications? (e.g. "Production incidents must update the relevant spec before a fix is planned")]

  ---

  ### Article VI: [NEEDS CLARIFICATION]

  **Default stub:**
  > [NEEDS CLARIFICATION: Define your sixth architectural principle here. Consider: how should exploration and branching be handled? (e.g. "Multiple implementation approaches may be generated from the same spec for comparison before committing")]

  ---

  ### Article VII: Simplicity Gate

  **Default:**
  > Maximum 3 major components for any initial implementation. No future-proofing — build only what the current spec requires. Any additional complexity requires documented justification in the plan's Complexity Tracking section. Adding a new dependency requires explicit rationale tied to a spec requirement.

  ---

  ### Article VIII: Anti-Abstraction Gate

  **Default:**
  > Use framework features directly rather than wrapping them. Maintain a single, canonical model representation — no parallel DTO/entity/view-model chains. Every abstraction layer must be justified by a concrete spec requirement, not anticipated future need.

  ---

  ### Article IX: Integration-First Testing

  **Default:**
  > Tests MUST use realistic environments: prefer real databases over mocks, use actual service instances over stubs. Contract tests are mandatory before any implementation code. Integration tests take precedence over isolated unit tests. Mock only what cannot be made real within the test environment.

  ---

  ## Step 3: Confirm Amendment Process

  After all Nine Articles are reviewed, present Article 4.2:

  > **Section 4.2 — Amendment Process**
  > Modifications to this constitution require:
  > - Explicit documentation of the rationale for change
  > - Review and approval by project maintainers
  > - Backwards compatibility assessment

  Ask: "Does this amendment process work for your project, or would you like to adjust it?"

  ## Step 4: Final Approval Gate

  Present a summary of all Nine Articles as the user approved them, then ask:

  > "Here is your constitution as approved. Shall I write it to `memory/constitution.md` and create the project scaffold?"

  **Do NOT proceed to Step 5 until the user says yes.**

  If the user says no or requests changes: return to Step 2 for the relevant articles.

  ## Step 5: Scaffold Creation

  Create files in this order. Announce each file before creating it.

  ### 5.1 Create memory/constitution.md

  Announce: "Creating `memory/constitution.md` with your approved Nine Articles."

  Write `memory/constitution.md` using this template, substituting approved article text:

  ````markdown
  # Project Constitution

  > These principles are immutable. Every implementation plan must pass gates derived from them.
  > To amend, follow Section 4.2.

  ---

  ## Article I: Library-First Principle

  <approved text>

  ---

  ## Article II: CLI Interface Mandate

  <approved text>

  ---

  ## Article III: Test-First Imperative

  <approved text>

  ---

  ## Article IV

  <approved text or [NEEDS CLARIFICATION] stub>

  ---

  ## Article V

  <approved text or [NEEDS CLARIFICATION] stub>

  ---

  ## Article VI

  <approved text or [NEEDS CLARIFICATION] stub>

  ---

  ## Article VII: Simplicity Gate

  <approved text>

  ---

  ## Article VIII: Anti-Abstraction Gate

  <approved text>

  ---

  ## Article IX: Integration-First Testing

  <approved text>

  ---

  ## Section 4.2: Amendment Process

  <approved amendment process text>
  ````

  ### 5.2 Create docs/specs/.gitkeep

  Announce: "Creating `docs/specs/` directory for feature specifications."

  Create `docs/specs/.gitkeep` (empty file so the directory is tracked by git).

  ### 5.3 Create or update CLAUDE.md

  **If CLAUDE.md does not exist:**
  Announce: "Creating `CLAUDE.md` with SDD workflow instructions."

  Write `CLAUDE.md` with:
  - Project name (ask user if not inferable from directory name)
  - Reference to `memory/constitution.md` as the architectural authority
  - The SDD skill map (condensed from sdd-workflow)
  - Note that constitution amendments require explicit approval

  **If CLAUDE.md already exists:**
  Announce: "I'd like to append SDD workflow instructions to your existing `CLAUDE.md`. Here's what I'll add: [show diff]"
  Get approval before appending.

  ## Step 6: Handoff

  After scaffold creation, report:

  > "Constitutional Foundation complete. Created:
  > - `memory/constitution.md` — Nine Articles governing all implementation plans
  > - `docs/specs/` — ready for feature specifications
  > - `CLAUDE.md` — SDD workflow instructions
  >
  > Returning to your original request now."

  Then return control to `sdd-workflow` to route the user's original request.

  ## Abort Handling

  If the user exits the flow before Step 5:
  - Write NO files
  - Say: "Init aborted. No files were created. Run `sdd-workflow` again to restart the constitutional setup."
  ```

- [ ] Run verification checklist from 2.1 — all items must PASS
- [ ] Commit: `feat: add sdd-init skill with Nine Articles review`

---

## Phase 3: sdd-init Skill — Scaffold Creation and Resume

**Implements:** FR-4, FR-5, Error Scenarios
**Files:** `skills/sdd-init/SKILL.md` (already created in Phase 2 — verify coverage)

### 3.1 Write behavioural contract (failing check)

- [ ] Write verification checklist:
  ```
  VERIFICATION CHECKLIST — sdd-init scaffold and resume
  [ ] sdd-init announces each file before creating it
  [ ] sdd-init creates memory/constitution.md with all Nine Articles
  [ ] sdd-init creates docs/specs/.gitkeep
  [ ] sdd-init creates or appends-to CLAUDE.md
  [ ] If CLAUDE.md exists: sdd-init shows diff and requests approval before modifying
  [ ] After scaffold: sdd-init returns control to sdd-workflow for original request
  [ ] If user aborts: NO files are written
  [ ] If memory/constitution.md exists but docs/specs/ does not: only docs/specs/ is created
  ```
- [ ] Confirm checklist items against Phase 2 implementation — identify any gaps
- [ ] If gaps found: add missing prose to `skills/sdd-init/SKILL.md`
- [ ] Commit: `test: verify scaffold and resume coverage in sdd-init`

### 3.2 Verify error scenario coverage

- [ ] Check spec Error Scenarios table against `skills/sdd-init/SKILL.md`:
  - [ ] "User aborts mid-way" → covered by Abort Handling section ✓
  - [ ] "memory/constitution.md exists but docs/specs/ does not" → verify Step 5 handles this
  - [ ] "CLAUDE.md exists but no SDD content" → verify Step 5.3 handles append flow
- [ ] If any scenario not covered: add handling prose to relevant Step in SKILL.md
- [ ] Commit: `feat: ensure error scenario coverage in sdd-init`

---

## Phase 4: Integration Verification

**Implements:** All FRs — end-to-end walkthrough

### 4.1 Full behavioural walkthrough

- [ ] Simulate: user invokes `sdd-workflow` in a directory with no `CLAUDE.md` and no `docs/specs/`
  - [ ] Verify: New Project Detection block triggers → sdd-init invoked ✓
  - [ ] Verify: sdd-init presents Articles I–IX one at a time ✓
  - [ ] Verify: Articles I, II, III, VII, VIII, IX have pre-filled defaults ✓
  - [ ] Verify: Articles IV, V, VI have `[NEEDS CLARIFICATION]` stubs ✓
  - [ ] Verify: user can accept / customise / mark N/A for each ✓
  - [ ] Verify: no files written until explicit approval ✓
  - [ ] Verify: after approval, all three scaffold files created with announcements ✓
  - [ ] Verify: sdd-init hands back to sdd-workflow which routes original request ✓

- [ ] Simulate: user invokes `sdd-workflow` in a project with existing `CLAUDE.md`
  - [ ] Verify: init flow is SKIPPED, routing proceeds normally ✓

- [ ] Simulate: user aborts during Article review
  - [ ] Verify: no files written, abort message displayed ✓

- [ ] Commit: `feat: complete 001-constitutional-init implementation`

---

## Quickstart Validation

After implementation, verify with these smoke tests:

```
Scenario A — Fresh project init:
1. Create empty directory, cd into it
2. Invoke sdd-workflow with any feature request
3. Expected: init flow activates, presents Article I with default text
4. Accept all defaults → approve
5. Expected: memory/constitution.md, docs/specs/.gitkeep, CLAUDE.md created
6. Expected: sdd-workflow then routes original feature request

Scenario B — Existing project, no re-init:
1. Navigate to a project with CLAUDE.md present
2. Invoke sdd-workflow
3. Expected: init flow does NOT activate, routing proceeds directly

Scenario C — Abort flow:
1. Fresh directory, invoke sdd-workflow
2. During Article review, say "abort" or "cancel"
3. Expected: no files created, abort message shown
```
