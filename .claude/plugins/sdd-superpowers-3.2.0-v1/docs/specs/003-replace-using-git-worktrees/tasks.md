# Tasks: Replace using-git-worktrees with using-git

**Plan:** docs/specs/003-replace-using-git-worktrees/plan.md
**Generated:** 2026-04-17

> **For agentic workers:** Execute tasks in order. `[P]` tasks within the same parallel group can run concurrently. In this Markdown-only project, "write failing test" = write scenario checklist in quickstart.md; "verify fails" = confirm the current skill file does NOT yet satisfy the scenario; "implement" = write/edit the skill file; "verify passes" = read the updated file and confirm every checklist item is met.

---

## Sequential: Phase 0 — Acceptance Scenarios (Test-First)

*Write all scenarios before editing any skill file. This is the test suite.*

- [ ] **T001** Write `docs/specs/003-replace-using-git-worktrees/quickstart.md` with scenarios S1–S11.

  File content:

  ```markdown
  # Quickstart: Replace using-git-worktrees with using-git

  **Spec:** docs/specs/003-replace-using-git-worktrees/spec.md

  Verify each scenario by reading the corresponding skill file after implementation.

  ---

  ## Scenario S1: using-git loads docs/git-convention.md
  Given: a project with a valid docs/git-convention.md
  When: using-git is invoked for any operation
  Then:
  - [ ] Skill reads docs/git-convention.md at the start of the operation
  - [ ] Skill parses branch_pattern, ticket_prefix, commit_format, allowed_types from YAML frontmatter
  - [ ] On new project (no CLAUDE.md): skill halts with "Run sdd-init first"
  - [ ] On existing project, file missing: skill offers 4-question creation dialogue before continuing
  - [ ] If user declines creation dialogue: skill halts without performing any git operation

  ---

  ## Scenario S2: using-git creates a branch with convention-validated name
  Given: docs/git-convention.md exists
  When: using-git is invoked for branch creation (by sdd-tasks or directly)
  Then:
  - [ ] Skill prompts for optional ticket ID
  - [ ] Skill generates Suggestion A (NNN-slug from spec folder)
  - [ ] Skill generates Suggestion B (ticket-ID-based) only if ticket ID was provided
  - [ ] Suggestion C is always "type a custom name"
  - [ ] Chosen name is validated against branch_pattern regex before creation
  - [ ] Violation triggers warning + "Proceed anyway? (yes/no)" — requires explicit yes
  - [ ] Branch already exists: offers switch / choose different / abort
  - [ ] On main/master: skill refuses branch creation
  - [ ] Branch created with git checkout -b <name>

  ---

  ## Scenario S3: using-git makes doc-first commit
  Given: a feature branch has been created
  When: using-git is invoked for doc-first commit (by sdd-tasks)
  Then:
  - [ ] Skill stages only files under docs/specs/NNN-slug/
  - [ ] No source code or test files are staged
  - [ ] Proposed commit message follows commit_format from docs/git-convention.md
  - [ ] User confirms message before commit executes
  - [ ] Invalid message: skill shows violation + re-prompts until valid
  - [ ] Commit failure (nothing staged, git error): skill reports exact git output and halts
  - [ ] Skill does not proceed until commit succeeds

  ---

  ## Scenario S4: using-git makes per-task commit
  Given: a task has been implemented; prior commit SHA is known
  When: using-git is invoked for per-task commit (by sdd-execute Step 3e)
  Then:
  - [ ] Skill checks git status for conflict markers (<<<<<<, =======, >>>>>>>)
  - [ ] If conflicts found: skill halts, lists conflicting files, waits for resolution
  - [ ] Skill stages all files modified or added since prior commit SHA
  - [ ] Files already committed before this task are NOT re-staged
  - [ ] Proposed commit message follows commit_format and allowed_types
  - [ ] User confirms message before commit executes
  - [ ] Invalid message: skill shows violation + corrected suggestion + re-prompts
  - [ ] After commit: skill verifies with git log --oneline -1 and returns new SHA

  ---

  ## Scenario S5: using-git prepares and validates merge commit message
  Given: finishing-a-development-branch is about to merge; current branch name is known
  When: using-git is invoked for merge commit message (by finishing-a-development-branch Step 2.5)
  Then:
  - [ ] Skill derives feature scope from branch name
  - [ ] Skill suggests a compliant merge commit message
  - [ ] User can confirm or type an alternative
  - [ ] Invalid message: skill shows violation reason + corrected suggestion + re-prompts
  - [ ] Skill does NOT validate or block based on the source branch name
  - [ ] Confirmed message is returned to the caller for use in git merge --no-ff and PR title

  ---

  ## Scenario S6: using-git presents operation menu when invoked directly
  Given: a user invokes using-git without specifying an operation
  When: the skill starts
  Then:
  - [ ] Skill presents menu: (1) Create branch, (2) Ad-hoc commit, (3) Merge commit message, (4) Show convention
  - [ ] "Show convention" displays branch_pattern, commit_format, allowed_types, and examples
  - [ ] Menu options follow the same logic as Operations A, B (ad-hoc), D respectively
  - [ ] Operation C (per-task commit, SHA-based) is NOT available in the direct menu
  - [ ] No git operation executes before docs/git-convention.md is loaded

  ---

  ## Scenario S7: using-git contains Advanced worktrees section
  Given: a developer reads using-git/SKILL.md
  When: they look for worktrees guidance
  Then:
  - [ ] Skill contains "Advanced: Parallel Workstreams with Worktrees" section
  - [ ] Section documents git worktree add and git worktree remove with examples
  - [ ] Section states: "This is not part of the standard SDD workflow"
  - [ ] Section documents .gitignore verification before creating a worktree
  - [ ] Section does NOT automate any worktree operation

  ---

  ## Scenario S8: sdd-tasks Step 5 delegates entirely to using-git
  Given: sdd-tasks has written tasks.md
  When: Step 5 executes
  Then:
  - [ ] Step 5 contains only a delegation instruction pointing to using-git
  - [ ] Step 5 names the inputs to pass: spec folder path, optional ticket ID
  - [ ] Step 5 does NOT contain inline branch suggestion logic
  - [ ] Step 5 does NOT contain inline convention loading logic
  - [ ] Step 5 does NOT contain inline commit execution logic
  - [ ] sdd-tasks proceeds to handoff only after using-git reports branch created and commit made

  ---

  ## Scenario S9: sdd-execute Step 3e delegates entirely to using-git
  Given: a task has been implemented and reviews have passed
  When: Step 3e executes
  Then:
  - [ ] Step 3e contains only a delegation instruction pointing to using-git
  - [ ] Step 3e names the inputs to pass: prior commit SHA, task description
  - [ ] Step 3e does NOT contain inline conflict detection logic
  - [ ] Step 3e does NOT contain inline git add / git commit commands
  - [ ] Step 3e does NOT contain inline message validation logic
  - [ ] Task checkbox is marked complete only after using-git reports commit created

  ---

  ## Scenario S10: finishing-a-development-branch Step 2.5 delegates entirely to using-git
  Given: finishing-a-development-branch has verified tests and determined base branch
  When: Step 2.5 executes
  Then:
  - [ ] Step 2.5 contains only a delegation instruction pointing to using-git
  - [ ] Step 2.5 names the input to pass: current branch name
  - [ ] Step 2.5 does NOT contain inline convention loading logic
  - [ ] Step 2.5 does NOT contain inline message suggestion or validation logic
  - [ ] The confirmed message returned by using-git is used in git merge --no-ff and PR title

  ---

  ## Scenario S11: using-git-worktrees is fully removed
  Given: all skill files have been updated
  When: searching the entire skills/ directory and CLAUDE.md for "using-git-worktrees"
  Then:
  - [ ] skills/using-git-worktrees/ directory does not exist
  - [ ] No file in skills/ contains the string "using-git-worktrees"
  - [ ] CLAUDE.md does not contain "using-git-worktrees"
  - [ ] CLAUDE.md bundled skills table contains a row for "using-git"
  ```

  Done when: file exists at `docs/specs/003-replace-using-git-worktrees/quickstart.md` with all 11 scenarios and their checklist items.

- [ ] **T002** Verify quickstart.md is complete: read `docs/specs/003-replace-using-git-worktrees/quickstart.md` and confirm all 11 scenarios (S1–S11) are present with their checklist items. Count: S1=5 items, S2=9 items, S3=7 items, S4=8 items, S5=6 items, S6=5 items, S7=5 items, S8=6 items, S9=6 items, S10=5 items, S11=4 items. Total: 71 checklist items. Done when: all present.

---

## Sequential: Phase 1 — Create skills/using-git/SKILL.md

*Complete T001–T002 before starting this phase.*

- [ ] **T003** Verify current state: read `skills/sdd-tasks/SKILL.md` Step 5 — confirm it contains inline sub-steps 5.1–5.4 (NOT yet a delegation block). This establishes the pre-implementation baseline for S8. Done when: confirmed inline logic exists (not yet delegating).

- [ ] **T004** Create `skills/using-git/` directory and write `skills/using-git/SKILL.md` with the following complete content:

  ```markdown
  ---
  name: using-git
  description: Use when any git operation is needed in an SDD project — branch creation, commits, merge commit validation, or showing the convention. Called by sdd-tasks, sdd-execute, and finishing-a-development-branch, and directly by users.
  ---

  # Using Git in SDD Projects

  **Announce at start:** "I'm using the using-git skill to perform a git operation."

  **Core principle:** All SDD git operations run through this skill. Other skills delegate here; users invoke here directly. The convention in `docs/git-convention.md` governs every branch name and commit message.

  **Two usage modes:**
  - **Direct invocation:** User runs this skill and picks from the operation menu
  - **Delegation:** Another skill invokes a named operation and passes inputs; `using-git` handles the rest

  ## Convention Loading

  **Applies before every operation.**

  Read `docs/git-convention.md` from the project root. Parse YAML frontmatter:
  - `branch_pattern` — POSIX regex for valid branch names
  - `ticket_prefix` — expected ticket ID prefix (empty string if none)
  - `commit_format` — commit message format string
  - `allowed_types` — list of valid commit type prefixes

  **If `docs/git-convention.md` is missing:**
  - No `CLAUDE.md` in project root (new project): halt — "Run `sdd-init` first to establish a git convention."
  - `CLAUDE.md` exists (existing project): offer one-time creation dialogue:
    > "I need to set up your git convention. I'll ask 4 quick questions."
    Ask the same 4 questions as `sdd-init` Step 5.4. Write `docs/git-convention.md`. Continue.
  - If user declines the dialogue: halt — do not perform any git operation.

  ## Direct Invocation — Operation Menu

  When invoked without a specified operation, present:

  > "Which git operation?
  > 1. Create branch
  > 2. Ad-hoc commit
  > 3. Merge commit message
  > 4. Show convention"

  Wait for selection, then run the corresponding operation.

  **Option (4) Show convention:** Read `docs/git-convention.md` and display:
  - Branch pattern: `<branch_pattern>` regex
  - Commit format: `<commit_format>`
  - Allowed types: `<allowed_types list>`
  - Examples section from the file

  ## Operation A — Branch Creation

  **Invoked by:** `sdd-tasks` Step 5, or directly via menu option (1)

  **Inputs:** spec folder path (`docs/specs/NNN-slug/`), optional ticket ID

  **Steps:**

  1. Load convention (see Convention Loading above).

  2. Prompt for ticket ID if not already provided:
     > "Do you have an external ticket ID? (e.g. PROJ-123) Press Enter to skip."

  3. Generate branch name suggestions:
     - **A:** `NNN-<feature-slug>` derived from the spec folder name
     - **B:** ticket-ID-based per `branch_pattern` (only if ticket ID provided)
     - **C:** "Type a custom name"

  4. Present:
     > "Choose a branch name:
     > A) `<suggestion A>`
     > B) `<suggestion B>` (if ticket ID provided)
     > C) Type a custom name"

  5. Validate chosen name against `branch_pattern` regex:
     - Matches → proceed
     - Doesn't match → warn: "Branch name `<name>` doesn't match the convention pattern `<pattern>`. Proceed anyway? (yes/no)" — require explicit yes

  6. If branch already exists:
     > "Branch `<name>` already exists. Options:
     > 1. Switch to existing branch
     > 2. Choose a different name
     > 3. Abort"
     Wait for selection.

  7. If on `main` or `master`: refuse — "Cannot create a branch from the default branch. Check out a base branch first."

  8. Create:
     ```bash
     git checkout -b <name>
     ```

  **Output:** Branch name created (reported back to caller or confirmed to user)

  ## Operation B — Doc-First Commit

  **Invoked by:** `sdd-tasks` Step 5 immediately after Operation A

  **Inputs:** spec folder path (`docs/specs/NNN-slug/`)

  **Steps:**

  1. Stage spec folder contents only:
     ```bash
     git add docs/specs/<NNN>-<feature-slug>/
     ```
     Do NOT stage any source code or test files outside `docs/specs/`.

  2. Propose commit message:
     > "Proposed commit: `docs(<NNN>-<feature-slug>): add spec, plan, and tasks`
     > Confirm this message, or type an alternative:"

  3. Validate confirmed message against `commit_format` and `allowed_types`. If invalid:
     > "Message `<message>` violates the convention: `<reason>`. Expected format: `<commit_format>`.
     > Type a valid message:"
     Re-prompt until valid.

  4. Execute:
     ```bash
     git commit -m "<confirmed message>"
     ```

  5. If commit fails (nothing staged, git error):
     > "Commit failed: `<exact git error output>`. Resolve the issue and re-run this step."
     Halt. Do not proceed until resolved.

  **Output:** Commit SHA (confirm with `git log --oneline -1`, report to caller)

  ## Operation C — Per-Task Commit

  **Invoked by:** `sdd-execute` Step 3e (delegation only — NOT available in the direct menu)

  **Inputs:** prior commit SHA (from caller), task description

  **Steps:**

  1. Check for merge conflicts:
     ```bash
     git status
     ```
     If output contains `<<<<<<`, `=======`, or `>>>>>>>`:
     > "Merge conflicts detected in: `<file list>`. Resolve conflicts, then re-run this step."
     Halt until conflicts cleared.

  2. Stage files modified or added since prior SHA:
     ```bash
     git add $(git diff --name-only HEAD)
     git add $(git ls-files --others --exclude-standard)
     ```
     Do NOT re-stage files already committed before this task began (verified against prior SHA).

  3. Propose commit message:
     > "Proposed commit: `feat(<NNN>-<slug>): <task description>`
     > Confirm this message, or type an alternative:"

  4. Validate confirmed message against `commit_format` and `allowed_types`. If invalid, show violation reason + corrected suggestion + re-prompt until valid.

  5. Execute:
     ```bash
     git commit -m "<confirmed message>"
     ```

  6. Verify and report:
     ```bash
     git log --oneline -1
     ```

  **Output:** New commit SHA returned to caller (`sdd-execute`)

  ## Operation D — Merge Commit Message

  **Invoked by:** `finishing-a-development-branch` Step 2.5, or directly via menu option (3)

  **Inputs:** current branch name

  **Steps:**

  1. Derive feature scope from branch name (e.g. `002-git-flow-integration` → scope `002-git-flow-integration`).

  2. Suggest compliant message:
     > "Proposed merge commit: `feat(<scope>): merge <feature-description>`
     > Confirm this message, or type an alternative:"

  3. Validate:
     - Type must be in `allowed_types`
     - Format must match `commit_format`

     If invalid:
     > "Message `<message>` violates the convention: `<reason>`.
     > Suggested: `<corrected message>`
     > Type a valid message:"
     Re-prompt until valid.

  4. Do NOT validate or reject the source branch name — only the commit message is enforced.

  **Output:** Confirmed message returned to caller

  ## Error Reference

  | Scenario | Behavior |
  |----------|----------|
  | `docs/git-convention.md` missing, new project | Halt: "Run `sdd-init` first" |
  | `docs/git-convention.md` missing, existing project | Offer 4-question creation dialogue |
  | User declines convention creation | Halt without git operation |
  | Branch name violates `branch_pattern` | Warn + "Proceed anyway? (yes/no)" — require explicit yes |
  | Branch already exists | Offer: switch / choose different / abort |
  | On `main`/`master` at branch creation | Refuse; instruct to check out a base branch |
  | Merge conflicts at per-task commit | Halt; list conflicting files; wait for resolution |
  | Commit message violates convention | Show violation + corrected suggestion + re-prompt |
  | Commit fails (nothing staged, git error) | Report exact git output; halt until resolved |
  | Git not initialised | Detect; offer `git init && git add -A && git commit -m "chore: initial commit"` |

  ## Advanced: Parallel Workstreams with Worktrees

  > **This is not part of the standard SDD workflow.** Use this only when you need multiple branches checked out simultaneously (e.g. working on two features in parallel without switching branches). In the standard SDD flow, branches are created in `sdd-tasks` within the main checkout — no worktrees needed.

  ### Before creating a worktree

  Verify the target directory is gitignored — otherwise worktree contents will pollute `git status`:

  ```bash
  git check-ignore -q .worktrees
  ```

  If not ignored, add `.worktrees/` to `.gitignore` and commit before proceeding.

  ### Create a worktree

  ```bash
  # Create a new worktree with a new branch
  git worktree add .worktrees/my-feature -b feat/my-feature

  # Work in the worktree
  cd .worktrees/my-feature
  ```

  ### Remove a worktree

  ```bash
  # From the main repo root
  git worktree remove .worktrees/my-feature

  # Delete the branch if no longer needed
  git branch -d feat/my-feature
  ```

  ## Integration

  **Called by:**
  - `sdd-tasks` Step 5 — Operations A (Branch Creation) + B (Doc-First Commit)
  - `sdd-execute` Step 3e — Operation C (Per-Task Commit, delegation only)
  - `finishing-a-development-branch` Step 2.5 — Operation D (Merge Commit Message)

  **Direct invocation:** User picks from operation menu — Operations A, B (ad-hoc), D, and Show Convention
  ```

  Done when: `skills/using-git/SKILL.md` exists with all sections: Convention Loading, Operation Menu, Operations A–D, Error Reference, Advanced Worktrees, Integration.

- [ ] **T005** Verify S1–S7 against `skills/using-git/SKILL.md`: read the file and check each checklist item in scenarios S1–S7. All 45 items must pass.
  - S1 (5 items): Convention Loading section covers all cases ✓?
  - S2 (9 items): Operation A covers all branch creation behaviors ✓?
  - S3 (7 items): Operation B covers all doc-first commit behaviors ✓?
  - S4 (8 items): Operation C covers all per-task commit behaviors ✓?
  - S5 (6 items): Operation D covers all merge commit message behaviors ✓?
  - S6 (5 items): Operation Menu section covers all direct invocation behaviors ✓?
  - S7 (5 items): Advanced Worktrees section covers all documentation requirements ✓?

  Done when: all 45 items confirmed present. If any fail: fix `skills/using-git/SKILL.md` before proceeding.

---

## Parallel Group 1: Update Delegating Skills

*Complete T001–T005 before starting. Tasks T006, T008, T010 touch different files and can run concurrently.*

- [ ] **T006** `[P]` Replace Step 5 in `skills/sdd-tasks/SKILL.md` with delegation block.

  Find the section starting with `### Step 5: Branch Creation and Doc-First Commit` and replace everything from that heading through the end of sub-step 5.4 (the `git commit` and failure handling) with:

  ```markdown
  ### Step 5: Branch Creation and Doc-First Commit

  Invoke `using-git` — **Branch Creation and Doc-First Commit**

  Pass to `using-git`:
  - Spec folder path: `docs/specs/<NNN>-<feature-slug>/`
  - Optional ticket ID: ask the user now if not already known — "Do you have an external ticket ID? (e.g. PROJ-123) Press Enter to skip."

  `using-git` will handle: convention loading, branch name suggestions, branch creation, doc staging, commit message confirmation, and commit execution.

  Proceed to Step 6 (Handoff) only after `using-git` reports:
  - Branch `<name>` created
  - Doc-first commit made: `<commit-sha>`
  ```

  Done when: Step 5 contains only the delegation block above and no inline sub-steps 5.1–5.4.

- [ ] **T008** `[P]` Replace Step 3e in `skills/sdd-execute/SKILL.md` with delegation block.

  Find the section starting with `**3e. Commit completed task**` and replace everything through the final `git log --oneline -1` and "Only mark the task checkbox complete..." line with:

  ```markdown
  **3e. Commit completed task**

  Invoke `using-git` — **Per-Task Commit**

  Pass to `using-git`:
  - Prior commit SHA: `git rev-parse HEAD` (recorded before this task was dispatched)
  - Task description: the task title from tasks.md (e.g. "implement FR-2 branch name suggestions")

  `using-git` will handle: conflict detection, file staging, commit message proposal, validation, confirmation, and commit execution.

  Mark the task checkbox complete only after `using-git` reports the new commit SHA.
  ```

  Done when: Step 3e contains only the delegation block above and no inline git commands.

- [ ] **T010** `[P]` Replace Step 2.5 in `skills/finishing-a-development-branch/SKILL.md` with delegation block.

  Find the section starting with `### Step 2.5: Load Convention and Prepare Merge Commit Message` and replace everything through the "Store the confirmed message" and Option 1/2 update lines with:

  ```markdown
  ### Step 2.5: Prepare Merge Commit Message

  Invoke `using-git` — **Merge Commit Message**

  Pass to `using-git`:
  - Current branch name: `git branch --show-current`

  `using-git` will handle: convention loading, scope derivation, message suggestion, validation, re-prompting on violation.

  Store the confirmed message returned by `using-git` as `<merge-commit-message>`.

  Use `<merge-commit-message>` in:
  - Option 1 (Merge Locally): `git merge --no-ff <feature-branch> -m "<merge-commit-message>"`
  - Option 2 (Push and Create PR): pre-fill `gh pr create --title "<merge-commit-message>"`
  ```

  Done when: Step 2.5 contains only the delegation block above and no inline convention/validation logic.

---

## Parallel Group 2: Verify Delegating Skills

*Complete T006, T008, T010 before starting. T007, T009, T011 are independent of each other.*

- [ ] **T007** `[P]` Verify S8 against `skills/sdd-tasks/SKILL.md` Step 5: read the file and check all 6 S8 checklist items. Done when: all 6 pass. If any fail: fix T006 output first.

- [ ] **T009** `[P]` Verify S9 against `skills/sdd-execute/SKILL.md` Step 3e: read the file and check all 6 S9 checklist items. Done when: all 6 pass. If any fail: fix T008 output first.

- [ ] **T011** `[P]` Verify S10 against `skills/finishing-a-development-branch/SKILL.md` Step 2.5: read the file and check all 5 S10 checklist items. Done when: all 5 pass. If any fail: fix T010 output first.

---

## Sequential: Phase 5 — Remove using-git-worktrees and Clean Up References

*Complete T007, T009, T011 before starting.*

- [ ] **T012** Delete `skills/using-git-worktrees/` directory:
  ```bash
  rm -rf skills/using-git-worktrees/
  ```
  Done when: `ls skills/using-git-worktrees/` returns "No such file or directory".

- [ ] **T013** Update `skills/subagent-driven-development/SKILL.md` Integration section.

  Find and replace this line:
  ```
  - **using-git-worktrees** - OPTIONAL: Set up isolated workspace if multi-branch parallel work is needed (standard SDD branch creation happens in `sdd-tasks`)
  ```
  With:
  ```
  - **using-git** - For any git operation (branch creation, commits, convention validation); advanced worktrees guidance available within `using-git`
  ```

  Done when: the line no longer contains "using-git-worktrees".

- [ ] **T014** Update `CLAUDE.md` bundled skills table.

  Find and replace this row (currently reads "Parallel multi-branch workstreams (advanced, opt-in)"):
  ```
  | Parallel multi-branch workstreams (advanced, opt-in) | `using-git-worktrees` |
  ```
  With:
  ```
  | Any git operation in an SDD project (branches, commits, convention) | `using-git` |
  ```

  Done when: CLAUDE.md row references `using-git` with the new description.

- [ ] **T015** Verify S11 — grep for "using-git-worktrees":
  ```bash
  grep -r "using-git-worktrees" skills/ CLAUDE.md
  ```
  Expected output: **no matches**. Done when: command returns empty output. If any matches found: fix the offending file before marking complete.

---

## Sequential: Phase 6 — Integration Verification

*Complete T015 before starting.*

- [ ] **T016** Add S12 to `docs/specs/003-replace-using-git-worktrees/quickstart.md`:

  ```markdown
  ---

  ## Scenario S12: Full git flow using using-git end-to-end
  Given: an SDD project with docs/git-convention.md
  Steps:
  1. sdd-tasks completes tasks.md → Step 5 says "Invoke using-git — Branch Creation and Doc-First Commit" → using-git creates branch and makes doc-first commit
  2. sdd-execute Step 3e says "Invoke using-git — Per-Task Commit" → using-git stages files, confirms message, commits
  3. finishing-a-development-branch Step 2.5 says "Invoke using-git — Merge Commit Message" → using-git returns confirmed message → merge uses it

  Then:
  - [ ] All 11 previous scenarios (S1–S11) pass
  - [ ] using-git is the only file containing branch creation, commit, and merge commit validation logic
  - [ ] sdd-tasks, sdd-execute, finishing-a-development-branch contain delegation instructions only (no inline git logic)
  - [ ] skills/using-git-worktrees/ does not exist in the repository
  ```

  Done when: S12 appended to quickstart.md.

- [ ] **T017** Final integration verification — read each file and confirm S12 checklist items:
  - Read `skills/using-git/SKILL.md` — confirm it is the only file with branch creation, commit, and merge commit validation logic ✓?
  - Read `skills/sdd-tasks/SKILL.md` Step 5 — confirm delegation only, no inline git ✓?
  - Read `skills/sdd-execute/SKILL.md` Step 3e — confirm delegation only, no inline git ✓?
  - Read `skills/finishing-a-development-branch/SKILL.md` Step 2.5 — confirm delegation only ✓?
  - Confirm `skills/using-git-worktrees/` does not exist ✓?
  - Re-run: `grep -r "using-git-worktrees" skills/ CLAUDE.md` — expect: no matches ✓?

  Done when: all 6 checks pass. **Do not claim complete without running the grep and reading all four files.**

---

## Task Summary

| Range | Phase | Can Parallelize? |
|-------|-------|-----------------|
| T001–T002 | Phase 0: Acceptance scenarios | No (sequential) |
| T003–T005 | Phase 1: Create using-git/SKILL.md | No (sequential) |
| T006, T008, T010 | Parallel Group 1: Update delegating skills | Yes (different files) |
| T007, T009, T011 | Parallel Group 2: Verify delegating skills | Yes (different files) |
| T012–T015 | Phase 5: Remove using-git-worktrees | No (sequential) |
| T016–T017 | Phase 6: Integration verification | No (sequential) |

**Total tasks:** 17
**Parallelizable:** 6 tasks across 2 parallel groups
**Estimated parallel speedup:** ~1.5x (phases 2/3/4 and their verifications run concurrently)
