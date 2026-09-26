# Tasks: Constitutional Foundation Init

**Plan:** docs/specs/001-constitutional-init/plan.md
**Generated:** 2026-04-17

> **For agentic workers:** Execute tasks in order. `[P]` tasks within the same parallel group can run concurrently. Never start an implementation task without the prior contract/baseline task completed and confirmed.

---

## Sequential: Phase 0 — Baselines

*Confirm current state before any changes. Must complete before Phase 1.*

- [x] **T001** Read `skills/sdd-workflow/SKILL.md` and confirm none of the following appear: "new project", "CLAUDE.md detection", "init flow", "uninitialised". Record: "BASELINE CONFIRMED — no init detection present."

- [ ] **T002** Confirm `skills/sdd-init/SKILL.md` does not exist:
  ```bash
  ls skills/sdd-init/SKILL.md 2>/dev/null && echo "EXISTS — STOP" || echo "BASELINE CONFIRMED — sdd-init absent"
  ```
  Expected output: `BASELINE CONFIRMED — sdd-init absent`

- [ ] **T003** Commit baselines:
  ```bash
  git add docs/specs/001-constitutional-init/
  git commit -m "test: record baselines for 001-constitutional-init"
  ```

---

## Parallel Group 1: Write Behavioural Contracts

*T001–T003 must be complete. Both contracts can be written concurrently — they produce no files.*

- [ ] **T004** `[P]` Write and record the sdd-workflow detection contract. Confirm each item currently FAILS against `skills/sdd-workflow/SKILL.md`:
  ```
  VERIFICATION CHECKLIST — sdd-workflow new project detection
  [ ] sdd-workflow checks for CLAUDE.md existence before routing
  [ ] sdd-workflow checks for docs/specs/ existence before routing
  [ ] If NEITHER exists: sdd-workflow delegates to sdd-init before any routing
  [ ] If EITHER exists: sdd-workflow skips init and routes normally
  [ ] After sdd-init completes: sdd-workflow resumes routing for original request
  ```
  Confirm: all 5 items absent from current file → contract is RED ✓

- [ ] **T005** `[P]` Write and record the sdd-init Nine Articles contract. Confirm each item currently FAILS (file does not exist):
  ```
  VERIFICATION CHECKLIST — sdd-init Nine Articles review
  [ ] sdd-init announces itself before doing anything
  [ ] sdd-init presents Articles I–IX one at a time
  [ ] Articles I, II, III, VII, VIII, IX have pre-filled default content
  [ ] Articles IV, V, VI have [NEEDS CLARIFICATION] stubs with guidance
  [ ] Each Article offers: accept default / provide custom / mark not applicable
  [ ] sdd-init requests explicit approval before writing any files
  [ ] sdd-init writes NO files until approval is given
  ```
  Confirm: skills/sdd-init/SKILL.md absent → all 7 items RED ✓

- [ ] **T006** Commit contracts:
  ```bash
  git add docs/specs/001-constitutional-init/tasks.md
  git commit -m "test: add behavioural contracts for sdd-workflow and sdd-init"
  ```

---

## Parallel Group 2: Implement

*T004–T006 must be complete. T007 and T008 touch different files — safe to parallelize.*

- [ ] **T007** `[P]` Add New Project Detection block to `skills/sdd-workflow/SKILL.md`.

  Insert the following block immediately after the `<EXTREMELY-IMPORTANT>` block and before `## Instruction Priority`:

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

- [ ] **T008** `[P]` Create `skills/sdd-init/` directory and write `skills/sdd-init/SKILL.md` with the full content below:

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

  After all Nine Articles are reviewed, present Section 4.2:

  > **Section 4.2 — Amendment Process**
  > Modifications to this constitution require:
  > - Explicit documentation of the rationale for change
  > - Review and approval by project maintainers
  > - Backwards compatibility assessment

  Ask: "Does this amendment process work for your project, or would you like to adjust it?"

  ## Step 4: Final Approval Gate

  Present a summary of all Nine Articles as the user approved them, then ask:

  > "Here is your constitution as approved. Shall I write it to `memory/constitution.md` and create the project scaffold?"

  **Do NOT proceed to Step 5 until the user explicitly says yes.**

  If the user says no or requests changes: return to Step 2 for the relevant articles.

  ## Step 5: Scaffold Creation

  Create files in this order. Announce each file before creating it.

  ### 5.1 Create memory/constitution.md

  Announce: "Creating `memory/constitution.md` with your approved Nine Articles."

  Create `memory/` directory if it does not exist.

  Write `memory/constitution.md`:

  ```markdown
  # Project Constitution

  > These principles are immutable. Every implementation plan must pass gates derived from them.
  > To amend, follow Section 4.2.

  ---

  ## Article I: Library-First Principle

  {{approved text}}

  ---

  ## Article II: CLI Interface Mandate

  {{approved text}}

  ---

  ## Article III: Test-First Imperative

  {{approved text}}

  ---

  ## Article IV

  {{approved text or [NEEDS CLARIFICATION] stub}}

  ---

  ## Article V

  {{approved text or [NEEDS CLARIFICATION] stub}}

  ---

  ## Article VI

  {{approved text or [NEEDS CLARIFICATION] stub}}

  ---

  ## Article VII: Simplicity Gate

  {{approved text}}

  ---

  ## Article VIII: Anti-Abstraction Gate

  {{approved text}}

  ---

  ## Article IX: Integration-First Testing

  {{approved text}}

  ---

  ## Section 4.2: Amendment Process

  {{approved amendment process text}}
  ```

  ### 5.2 Create docs/specs/.gitkeep

  Announce: "Creating `docs/specs/` directory for feature specifications."

  Create `docs/specs/.gitkeep` (empty file so the directory is tracked by git).

  ### 5.3 Create or update CLAUDE.md

  **If `CLAUDE.md` does not exist:**
  Announce: "Creating `CLAUDE.md` with SDD workflow instructions."

  Write `CLAUDE.md` with:
  - Project name (infer from directory name; ask user if ambiguous)
  - Reference to `memory/constitution.md` as the architectural authority
  - The SDD skill map (condensed):

  ```markdown
  # <Project Name>

  ## Architecture

  Governed by [Project Constitution](memory/constitution.md). All implementation plans must pass gates derived from the Nine Articles. Constitution amendments require explicit approval per Section 4.2.

  ## SDD Workflow

  | Situation | Skill |
  |-----------|-------|
  | Fuzzy idea | `sdd-brainstorm` |
  | Clear idea | `sdd-specify` |
  | Tech investigation needed | `sdd-research` |
  | Spec approved | `sdd-plan` |
  | Plan approved | `sdd-tasks` |
  | Tasks ready | `sdd-execute` |
  | Verify spec alignment | `sdd-review` |

  **Hard Gates:**
  - NO PLAN without an approved spec
  - NO TASKS without a plan
  - NO CODE without a prior failing test
  - NO COMPLETION CLAIM without fresh verification evidence
  ```

  **If `CLAUDE.md` already exists:**
  Announce: "I'd like to append SDD workflow instructions to your existing `CLAUDE.md`. Here is what I will add:" — show the exact text to be appended.
  Get explicit approval before appending.

  ## Step 6: Handoff

  After all scaffold files are created, report:

  > "Constitutional Foundation complete. Created:
  > - `memory/constitution.md` — Nine Articles governing all implementation plans
  > - `docs/specs/` — ready for feature specifications
  > - `CLAUDE.md` — SDD workflow instructions
  >
  > Returning to your original request now."

  Then return control to `sdd-workflow` to route the user's original request.

  ## Abort Handling

  If the user exits the flow at any point before Step 5 begins:
  - Write NO files
  - Say: "Init aborted. No files were created. Run `sdd-workflow` again to restart the constitutional setup."

  ## Error Scenarios

  | Scenario | Handling |
  |----------|----------|
  | User aborts during Article review | No files written; show abort message |
  | `memory/constitution.md` exists but `docs/specs/` does not | Skip Step 5.1; create `docs/specs/.gitkeep` only; warn: "constitution already exists, creating docs/specs/ only" |
  | `CLAUDE.md` exists but has no SDD content | Append SDD section after showing diff and getting approval |
  ```

---

## Sequential: Verify Parallel Group 2

*T007 and T008 must both be complete before verification.*

- [ ] **T009** Run T004 contract against updated `skills/sdd-workflow/SKILL.md` — all 5 items must PASS:
  - [ ] "checks for CLAUDE.md existence before routing" → present ✓
  - [ ] "checks for docs/specs/ existence before routing" → present ✓
  - [ ] "delegates to sdd-init if NEITHER exists" → present ✓
  - [ ] "skips init if EITHER exists" → present ✓
  - [ ] "resumes routing after sdd-init completes" → present ✓

- [ ] **T010** Commit sdd-workflow change:
  ```bash
  git add skills/sdd-workflow/SKILL.md
  git commit -m "feat: add new project detection to sdd-workflow (FR-1, FR-5)"
  ```

- [ ] **T011** Run T005 contract against new `skills/sdd-init/SKILL.md` — all 7 items must PASS:
  - [ ] announces itself → present ("Announce at start:" line) ✓
  - [ ] presents Articles I–IX one at a time → present (Step 2) ✓
  - [ ] Articles I, II, III, VII, VIII, IX have pre-filled defaults → present ✓
  - [ ] Articles IV, V, VI have `[NEEDS CLARIFICATION]` stubs → present ✓
  - [ ] each Article offers accept/custom/N/A → present (Step 2 instructions) ✓
  - [ ] requests approval before writing files → present (Step 4) ✓
  - [ ] writes NO files until approval → present (Step 4 HARD-GATE) ✓

- [ ] **T012** Commit sdd-init skill:
  ```bash
  git add skills/sdd-init/SKILL.md
  git commit -m "feat: add sdd-init skill with Nine Articles review and scaffold (FR-2, FR-3, FR-4, FR-5)"
  ```

---

## Sequential: Phase 3 — Scaffold and Error Scenario Verification

*T011–T012 must be complete.*

- [ ] **T013** Write and run scaffold + resume contract against `skills/sdd-init/SKILL.md`:
  ```
  VERIFICATION CHECKLIST — sdd-init scaffold and resume
  [ ] announces each file before creating it (Step 5 "Announce:" lines)
  [ ] creates memory/constitution.md with all Nine Articles (Step 5.1)
  [ ] creates memory/ directory if missing (Step 5.1)
  [ ] creates docs/specs/.gitkeep (Step 5.2)
  [ ] creates or appends-to CLAUDE.md (Step 5.3)
  [ ] if CLAUDE.md exists: shows diff and requires approval before modifying (Step 5.3)
  [ ] after scaffold: returns control to sdd-workflow (Step 6)
  [ ] if user aborts before Step 5: NO files written (Abort Handling)
  [ ] if memory/constitution.md exists but docs/specs/ absent: only docs/specs/ created (Error Scenarios table)
  ```
  For each item NOT present: note the gap.

- [ ] **T014** For each gap found in T013: add the missing prose to the appropriate Step in `skills/sdd-init/SKILL.md`. If no gaps: record "all scaffold items covered, no changes needed."

- [ ] **T015** Verify error scenario coverage — check `skills/sdd-init/SKILL.md` Error Scenarios table contains all three rows from spec:
  - [ ] "User aborts mid-way" row present ✓
  - [ ] "memory/constitution.md exists but docs/specs/ absent" row present ✓
  - [ ] "CLAUDE.md exists but no SDD content" row present ✓

- [ ] **T016** Commit scaffold verification (commit even if no changes — records the verification):
  ```bash
  git add skills/sdd-init/SKILL.md
  git commit -m "feat: verify scaffold and error scenario coverage in sdd-init (FR-4, FR-5)"
  ```

---

## Sequential: Phase 4 — Integration Walkthrough

*All prior phases complete.*

- [ ] **T017** Walkthrough Scenario A — fresh project:
  Mentally simulate: user invokes `sdd-workflow` with no `CLAUDE.md` and no `docs/specs/` present.
  - [ ] New Project Detection triggers → sdd-init invoked ✓
  - [ ] sdd-init dispatches exploration subagent → Project Profile produced ✓
  - [ ] sdd-init presents Article I with personalised default text ✓
  - [ ] Articles I–III, VII–IX show full default text ✓
  - [ ] Articles IV–VI show `[NEEDS CLARIFICATION]` stubs ✓
  - [ ] User accepts all → sdd-init requests approval ✓
  - [ ] User approves → three scaffold files created with announcements ✓
  - [ ] sdd-init hands back → sdd-workflow routes original request ✓

- [ ] **T018** Walkthrough Scenario B — existing project:
  Simulate: user invokes `sdd-workflow` in a project with `CLAUDE.md` present.
  - [ ] New Project Detection reads CLAUDE.md present → skips init ✓
  - [ ] sdd-workflow proceeds directly to routing ✓

- [ ] **T019** Walkthrough Scenario C — abort:
  Simulate: user says "abort" during Article III review.
  - [ ] Abort Handling section fires → no files written ✓
  - [ ] Abort message shown ✓

- [ ] **T020** Final commit:
  ```bash
  git add docs/specs/001-constitutional-init/
  git commit -m "feat: complete 001-constitutional-init — constitutional foundation init"
  ```

---

## Task Summary

| Range | Phase | Can Parallelize? | Status |
|-------|-------|-----------------|--------|
| T001–T003 | Baselines | No (sequential) | ✅ Done |
| T004–T005 | Write contracts | Yes (within group) | ✅ Done |
| T006 | Commit contracts | No | ✅ Done |
| T007–T008 | Implement sdd-workflow + sdd-init (FR-1–FR-6) | Yes (different files) | ✅ Done |
| T009–T012 | Verify + commit both | No (sequential) | ✅ Done |
| T013–T016 | Scaffold + FR-6 verification | No (sequential) | ✅ Done |
| T017–T020 | Integration walkthrough | No (sequential) | ✅ Done |

**Total tasks:** 20 — **All complete**
**Parallelizable:** 4 tasks across 2 parallel groups (T004–T005, T007–T008)
**As-built note:** FR-6 (project context exploration via subagent) was added during implementation via code review feedback; T008 and T013–T016 incorporate this change.
