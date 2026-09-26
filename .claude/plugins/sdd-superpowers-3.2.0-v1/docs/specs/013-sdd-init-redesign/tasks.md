# Tasks: SDD Init Redesign — Mission Constitution + Steering Files

**Plan:** docs/specs/013-sdd-init-redesign/plan.md
**Generated:** 2026-06-23

> **For agentic workers:** Execute tasks in order. `[P]` tasks within the same parallel group can run concurrently. Never start an implementation task without the prior test task completed and confirmed red.

---

## Sequential: Phase 0 — Contract Definition + Test Artifacts

*Write smoke test scenarios before any implementation. Verify each FAILS with current skill.*

- [ ] **T001** Write `docs/specs/013-sdd-init-redesign/quickstart.md` with the full content from plan.md Phase 0.2 — 4 smoke test scenarios (Scenario 1: full init, Scenario 2: fast mode, Scenario 3: old constitution detected, Scenario 4: skill loads steering files)

- [ ] **T002** Verify Scenario 1 FAILS — current `sdd-init` asks Article I, not Q1:
  ```bash
  grep -n "Article I" skills/sdd-init/reference.md
  ```
  Expected: line found (current skill still has nine-article flow) — **RED**

- [ ] **T003** Verify Scenario 2 FAILS — current `sdd-init` has no `--fast` flag:
  ```bash
  grep -n "\-\-fast" skills/sdd-init/reference.md
  ```
  Expected: no match — **RED**

- [ ] **T004** Verify Scenario 3 FAILS — current `sdd-init` has no old-constitution detection:
  ```bash
  grep -n "Article I" skills/sdd-init/reference.md | grep -i "detect\|exist\|check\|warn"
  ```
  Expected: no match — **RED**

- [ ] **T005** Verify Scenario 4 FAILS — current `sdd-specify` does not load steering files:
  ```bash
  grep -n "steering" skills/sdd-specify/reference.md
  ```
  Expected: no match — **RED**

- [ ] **T006** Commit test artifacts:
  ```bash
  git add docs/specs/013-sdd-init-redesign/quickstart.md
  git commit -m "test: add quickstart smoke scenarios for 013-sdd-init-redesign"
  ```
  Expected: commit succeeds on branch `013-sdd-init-redesign`

---

## Sequential: Phase 1 — Rewrite sdd-init

*Complete Phase 0 before starting. All tasks in this phase modify `skills/sdd-init/reference.md` sequentially.*

- [ ] **T007** Add constitution existence check to `skills/sdd-init/reference.md` Step 1.5. After the exploration subagent dispatch block (the paragraph ending with "If the project is empty or exploration returns no useful signal: use the generic defaults as written below."), insert the following block before the `---` that opens Step 2:

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

- [ ] **T008** Verify existence check inserted correctly:
  ```bash
  grep -n "Constitution Existence Check" skills/sdd-init/reference.md
  ```
  Expected: line number found — **GREEN for T007**

- [ ] **T009** Verify Scenario 3 GREEN — old constitution detection works:
  ```bash
  grep -n "nine-article constitution was found" skills/sdd-init/reference.md
  ```
  Expected: line found — confirms warning text is present — **GREEN**

- [ ] **T010** Remove the entire Nine Articles Interactive Review section from `skills/sdd-init/reference.md`. Delete from `## Step 2: Nine Articles Interactive Review` through `## Step 3: Confirm Amendment Process` and `## Step 4: Final Approval Gate` (these three sections are fully replaced). Replace with the new Step 2 block:

  ```markdown
  ## Step 2: Mission Charter Ceremony

  **If invoked with `--fast` flag:** skip Q3. Ask Q1, Q2, Q4 only.

  Present each question using the AskUserQuestion structured UI tool — not plain prose. One question per turn. Wait for a response before presenting the next.

  ### Q1 — Project Mission

  Present as structured question:
  - Header: "Project Mission"
  - Question: "In one or two sentences: what does this project exist to do, and who does it serve?"

  ### Q2 — Non-negotiables

  Present as structured question:
  - Header: "Non-negotiables"
  - Question: "What are 1–3 things your team will never compromise on? (e.g. 'we never ship without a test', 'CLI-first always', 'no external dependencies without a spike')"

  ### Q3 — What Failure Looks Like (skip if --fast)

  Present as structured question:
  - Header: "Failure Modes"
  - Question: "What does a bad outcome look like for this project? (e.g. 'feature works locally but breaks in prod', 'specs drift from code', 'every PR needs a rewrite')"

  ### Q4 — Amendment Process

  Present as structured question:
  - Header: "Amendment Process"
  - Question: "How should these principles change over time?"
  - Options:
    - "Document rationale → explicit team approval → backwards-compatibility check (Recommended)"
    - "Custom (I'll describe it)"

  If the user selects "Custom": ask a follow-up open-text question for their amendment process.

  ### Draft Constitution

  After collecting all answers:

  1. Synthesize into a draft:
     - **Mission:** from Q1
     - **Principles:** from Q2 stated as positive invariants. If NOT `--fast`, also invert Q3 failure modes into positive invariants and merge. Total: 3–5 principles.
     - **Operational Context:** fixed pointer block (see Step 5.1 template)
     - **Amendment Process:** from Q4

  2. Present the full draft to the user.

  3. Ask: "Does this capture your project's principles accurately? Say yes to write it, or describe what to change."

  4. If changes requested: revise and re-present without re-asking questions. Repeat until approved.

  5. On approval: proceed to Step 3.

  **Must not** include SDD methodology rules (Library-First, TDD, CLI Mandate, Simplicity Gate, Anti-Abstraction, Integration-First) in the constitution.
  ```

- [ ] **T011** Verify new Step 2 inserted and old nine-article sections removed:
  ```bash
  grep -n "Mission Charter Ceremony\|Article I: Library\|Article II: CLI\|Nine Articles Interactive" skills/sdd-init/reference.md
  ```
  Expected: "Mission Charter Ceremony" found; "Article I: Library", "Article II: CLI", "Nine Articles Interactive" NOT found — **GREEN**

- [ ] **T012** Verify Scenario 2 GREEN — `--fast` flag documented:
  ```bash
  grep -n "\-\-fast" skills/sdd-init/reference.md
  ```
  Expected: multiple lines found (flag mentioned in Step 2 header and Q3 skip instruction) — **GREEN**

- [ ] **T013** Add Step 3 (write constitution file) to `skills/sdd-init/reference.md` immediately after Step 2. Insert between Step 2 and the existing Step 5 (now to be renumbered). The new Step 3:

  ```markdown
  ## Step 3: Write memory/constitution.md

  Announce: "Writing `memory/constitution.md`."

  Create `memory/` directory if it does not exist.

  Write `memory/constitution.md` using the approved draft:

  ```markdown
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
  ```
  ```

- [ ] **T014** Verify Step 3 inserted:
  ```bash
  grep -n "Step 3: Write memory/constitution" skills/sdd-init/reference.md
  ```
  Expected: line found — **GREEN**

- [ ] **T015** Add Step 5.2 (steering file scaffold) to `skills/sdd-init/reference.md` as a new sub-step between `### Step 5.1 Create memory/constitution.md` and the existing `.gitkeep` step (renumber former 5.2 → 5.3, 5.3 → 5.4, 5.4 → 5.5, 5.5 → 5.6). Insert the full Step 5.2 block from plan.md Phase 1.4, which includes:
  - The announce line
  - The Project Profile usage instruction
  - All four steering file templates with correct frontmatter:
    - `tech-stack.md` with `loaded-by: sdd-specify, sdd-plan, sdd-execute, sdd-research, sdd-review`
    - `test-strategy.md` with `loaded-by: sdd-plan, sdd-execute, sdd-review`
    - `conventions.md` with `loaded-by: sdd-specify, sdd-plan, sdd-execute, sdd-review`
    - `team-practices.md` with `loaded-by: sdd-plan, sdd-review, using-git`
  - The post-generation summary message
  - The abort handling note

- [ ] **T016** Verify all four steering file templates present in reference.md:
  ```bash
  grep -n "tech-stack.md\|test-strategy.md\|conventions.md\|team-practices.md" skills/sdd-init/reference.md
  ```
  Expected: at least 4 lines found (one per steering file) — **GREEN**

- [ ] **T017** Verify correct `loaded-by` values in reference.md templates:
  ```bash
  grep -A2 "scope: tech-stack" skills/sdd-init/reference.md | grep "loaded-by"
  ```
  Expected: `loaded-by: sdd-specify, sdd-plan, sdd-execute, sdd-research, sdd-review` — **GREEN**

- [ ] **T018** Update `### Step 5.3 Create or update CLAUDE.md` (renumbered from 5.3) in `skills/sdd-init/reference.md`. Replace the entire CLAUDE.md detection block with the new detection logic and `## Project Foundation` block content from plan.md Phase 1.5:

  Replace the **If `CLAUDE.md` does not exist** / **If `CLAUDE.md` already exists** detection logic with:

  ```markdown
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
  ```

- [ ] **T019** Verify new CLAUDE.md detection logic in reference.md:
  ```bash
  grep -n "Project Foundation\|Detection order" skills/sdd-init/reference.md
  ```
  Expected: both strings found — **GREEN**

- [ ] **T020** Update `skills/sdd-init/SKILL.md` Quick Reference table and Process Summary. Replace the existing `## Quick Reference` table (currently 4 rows) with the new 8-row table covering `memory/constitution.md`, four steering files, `docs/specs/.gitkeep`, `CLAUDE.md`, `docs/git-convention.md`, plus `Flags:` line for `--fast`. Replace `## Process Summary` numbered list with the new 6-step list from plan.md Phase 1.6.

- [ ] **T021** Verify SKILL.md updated:
  ```bash
  grep -n "steering\|--fast\|Mission Charter" skills/sdd-init/SKILL.md
  ```
  Expected: all three strings found — **GREEN**

- [ ] **T022** Commit Phase 1:
  ```bash
  git add skills/sdd-init/reference.md skills/sdd-init/SKILL.md
  git commit -m "feat: rewrite sdd-init with mission charter ceremony and steering scaffold (FR-1, FR-2, FR-4, FR-5)"
  ```
  Expected: commit succeeds

---

## Parallel Group A: Steering File Loading — Phase 2

*Complete Phase 1 (through T022) before starting this group. All tasks in this group touch different files and can run concurrently.*

- [ ] **T023** `[P]` Prepend Step 0 to `skills/sdd-specify/reference.md` before the existing `## Step 1`:

  ```markdown
  ## Step 0: Load Steering Context

  Scan `memory/steering/` for `.md` files whose `loaded-by` frontmatter includes `sdd-specify`. Read each matched file and incorporate its content as context before producing any user-facing output. Loading is silent — no announcement to the user.

  If `memory/steering/` does not exist, or no files contain `sdd-specify` in `loaded-by`, proceed without change.

  Rescan on every invocation — custom files added after init are discovered automatically.

  ```

  Verify:
  ```bash
  grep -n "Step 0: Load Steering Context" skills/sdd-specify/reference.md
  ```
  Expected: line 1 or 2 (first section in file) — **GREEN**

- [ ] **T024** `[P]` Prepend Step 0 to `skills/sdd-plan/reference.md` before `## Step 1: Read All Inputs` (substitute `sdd-plan` for the skill name in the Step 0 template).

  Verify:
  ```bash
  grep -n "Step 0: Load Steering Context" skills/sdd-plan/reference.md
  ```
  Expected: line found before `Step 1: Read All Inputs` — **GREEN**

- [ ] **T025** `[P]` Prepend Step 0 to `skills/sdd-execute/reference.md` before `## Step 1: Verify Starting Baseline` (substitute `sdd-execute`).

  Verify:
  ```bash
  grep -n "Step 0: Load Steering Context" skills/sdd-execute/reference.md
  ```
  Expected: line found — **GREEN**

- [ ] **T026** `[P]` Prepend Step 0 to `skills/sdd-research/reference.md` before `## Step 1: Load the Spec` (substitute `sdd-research`).

  Verify:
  ```bash
  grep -n "Step 0: Load Steering Context" skills/sdd-research/reference.md
  ```
  Expected: line found — **GREEN**

- [ ] **T027** `[P]` Prepend Step 0 to `skills/sdd-review/reference.md` before `## Mode A: Spec Review` (substitute `sdd-review`).

  Verify:
  ```bash
  grep -n "Step 0: Load Steering Context" skills/sdd-review/reference.md
  ```
  Expected: line found — **GREEN**

- [ ] **T028** `[P]` Prepend Step 0 to `skills/using-git/reference.md` before `## Convention Loading` (substitute `using-git`).

  Verify:
  ```bash
  grep -n "Step 0: Load Steering Context" skills/using-git/reference.md
  ```
  Expected: line found — **GREEN**

- [ ] **T029** Verify Scenario 4 GREEN — `sdd-specify` now references steering context:
  ```bash
  grep -n "sdd-specify" skills/sdd-specify/reference.md | head -3
  ```
  Expected: `sdd-specify` appears in the `loaded-by` description of Step 0 — **GREEN**

- [ ] **T030** Commit Phase 2:
  ```bash
  git add skills/sdd-specify/reference.md skills/sdd-plan/reference.md skills/sdd-execute/reference.md skills/sdd-research/reference.md skills/sdd-review/reference.md skills/using-git/reference.md
  git commit -m "feat: add steering file loading to all consuming skills (FR-3)"
  ```
  Expected: commit succeeds

---

## Sequential: Phase 3 — Integration Verification

*Complete all prior phases before starting.*

- [ ] **T031** Verify AC-1.1, AC-1.6 — Scenario 1 ceremony flow: read `skills/sdd-init/reference.md` Step 2 and confirm it contains AskUserQuestion structured input for Q1 before Q2, and Q3 before Q4 in the standard (non-fast) path:
  ```bash
  grep -n "Project Mission\|Non-negotiables\|Failure Modes\|Amendment Process" skills/sdd-init/reference.md
  ```
  Expected: all four headers found in that order — **AC-1.1 GREEN**

- [ ] **T032** Verify AC-1.6, AC-1.7 — fast mode: confirm `--fast` flag skips Q3 and note about failure-inversion step being omitted:
  ```bash
  grep -n "fast\|skip.*Q3\|Q3.*skip" skills/sdd-init/reference.md
  ```
  Expected: lines found confirming Q3 skipped when `--fast` active — **AC-1.6, AC-1.7 GREEN**

- [ ] **T033** Verify AC-1.5 — old constitution detection: confirm warning text and STOP instruction are present:
  ```bash
  grep -n "nine-article constitution was found\|STOP" skills/sdd-init/reference.md
  ```
  Expected: both strings found — **AC-1.5 GREEN**

- [ ] **T034** Verify AC-2.2, AC-2.3 — all four steering files with correct frontmatter schema documented in reference.md:
  ```bash
  grep -n "scope: tech-stack\|scope: test-strategy\|scope: conventions\|scope: team-practices" skills/sdd-init/reference.md
  ```
  Expected: all four `scope:` values found — **AC-2.2, AC-2.3 GREEN**

- [ ] **T035** Verify AC-2.6 — abort handling for Phase 2 documented:
  ```bash
  grep -n "partially created\|No rollback" skills/sdd-init/reference.md
  ```
  Expected: abort handling text found — **AC-2.6 GREEN**

- [ ] **T036** Verify AC-3.1, AC-3.2, AC-3.5 — all six skills have Step 0 with silent loading instruction:
  ```bash
  grep -rn "Step 0: Load Steering Context" skills/
  ```
  Expected: 6 lines found (one per skill: sdd-specify, sdd-plan, sdd-execute, sdd-research, sdd-review, using-git) — **AC-3.1, AC-3.2, AC-3.5 GREEN**

- [ ] **T037** Verify AC-3.3 — skills handle missing `memory/steering/` gracefully (silent, no error):
  ```bash
  grep -n "does not exist.*proceed\|no files.*proceed without" skills/sdd-specify/reference.md
  ```
  Expected: fallback instruction found in Step 0 — **AC-3.3 GREEN**

- [ ] **T038** Verify AC-3.4 — custom steering file discovery documented (rescan on every invocation):
  ```bash
  grep -n "Rescan on every invocation\|added after init" skills/sdd-plan/reference.md
  ```
  Expected: line found — **AC-3.4 GREEN**

- [ ] **T039** Verify AC-4.1, AC-4.2, AC-4.3 — CLAUDE.md detection logic covers all three cases (`## Project Foundation` exists → skip; `## SDD Workflow` exists → append with approval; neither → append with approval):
  ```bash
  grep -n "Project Foundation\|SDD Workflow\|Detection order" skills/sdd-init/reference.md
  ```
  Expected: all three strings found in the CLAUDE.md step — **AC-4.1, AC-4.2, AC-4.3 GREEN**

- [ ] **T040** Verify AC-1.3, AC-2.5 — constitution write step and steering summary message present:
  ```bash
  grep -n "Step 3: Write memory/constitution\|edit these to match reality" skills/sdd-init/reference.md
  ```
  Expected: both strings found — **AC-1.3, AC-2.5 GREEN**

- [ ] **T041** Final commit:
  ```bash
  git add docs/specs/013-sdd-init-redesign/
  git commit -m "feat: complete 013-sdd-init-redesign — mission constitution and steering files"
  ```
  Expected: commit succeeds

---

## Task Summary

| Range | Phase | Can Parallelize? | Spec ACs Covered |
|---|---|---|---|
| T001–T006 | Phase 0: Test Artifacts | No (sequential) | — |
| T007–T022 | Phase 1: sdd-init Rewrite | No (same file) | AC-1.1–1.7, AC-2.1–2.6, AC-4.1–4.3 |
| T023–T030 | Phase 2: Skill Loading | Yes (T023–T028 parallel) | AC-3.1–3.5 |
| T031–T041 | Phase 3: Verification | No (sequential) | All ACs |

**Total tasks:** 41
**Parallelizable:** 6 tasks (T023–T028 in Parallel Group A)
**Estimated parallel speedup:** ~1.2x on Phase 2
