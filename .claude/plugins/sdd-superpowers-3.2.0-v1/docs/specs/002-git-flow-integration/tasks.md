# Tasks: Git Flow Integration

**Plan:** docs/specs/002-git-flow-integration/plan.md
**Generated:** 2026-04-17

> **For agentic workers:** Execute tasks in order. `[P]` tasks within the same parallel group can run concurrently. Never start an implementation task without the prior scenario-fail verification completed.
>
> **Testing model for this project:** Skills are Markdown prompt files. "Tests" are behavioral scenario checklists in `quickstart.md`. "Verify FAIL" = read the current (unmodified) skill file and confirm each checklist item is NOT satisfied. "Verify PASS" = read the updated skill file and confirm every checklist item IS satisfied.

---

## Sequential: Phase 0 — Verify Baseline Artifacts

*Confirm template already satisfies S1, and confirm all five skill files currently FAIL their scenarios.*

- [ ] **T001** Verify S1 PASSES against `docs/specs/002-git-flow-integration/git-convention.template.md`:
  Read the file. Confirm:
  - YAML frontmatter delimited by `---` ✓
  - `branch_pattern` field present as POSIX regex string ✓
  - `ticket_prefix` field present ✓
  - `commit_format` field present ✓
  - `allowed_types` field present as YAML list ✓
  - `## Examples` section present with ≥2 branch + ≥2 commit examples ✓
  Expected: ALL 6 items PASS. If any fail, fix `git-convention.template.md` before proceeding.

- [ ] **T002** Verify S2 FAILS against current `skills/sdd-init/SKILL.md`:
  Read the file. Confirm these items are NOT yet satisfied:
  - Step 5.4 does NOT exist (no git convention Q&A step) ✓ expect FAIL
  - `docs/git-convention.md` is NOT included in the initial commit command ✓ expect FAIL
  Expected: S2 checklist items FAIL. If Step 5.4 already exists, stop and investigate.

- [ ] **T003** Verify S3 FAILS against current `skills/sdd-specify/SKILL.md`:
  Read Step 7. Confirm:
  - `using-git-worktrees` IS still invoked (FAIL condition for S3) ✓ expect FAIL
  - No note about branch creation at sdd-tasks ✓ expect FAIL
  Expected: S3 checklist items FAIL.

- [ ] **T004** Verify S4/S5/S6 FAIL against current `skills/sdd-tasks/SKILL.md`:
  Read the file. Confirm:
  - No Step 5 with convention check, branch suggestions, or doc-first commit ✓ expect FAIL
  - Handoff step has no branch creation or doc-first commit confirmation ✓ expect FAIL
  Expected: S4/S5/S6 items FAIL.

- [ ] **T005** Verify S7/S8 FAIL against current `skills/sdd-execute/SKILL.md`:
  Read Step 1 and Step 3e. Confirm:
  - Step 1 does NOT load `docs/git-convention.md` ✓ expect FAIL
  - Step 3e does NOT check for conflicts, stage files, or propose a commit ✓ expect FAIL
  Expected: S7/S8 items FAIL.

- [ ] **T006** Verify S9/S10 FAIL against current `skills/finishing-a-development-branch/SKILL.md`:
  Read between Step 2 and Step 3. Confirm:
  - No Step 2.5 present ✓ expect FAIL
  - Option 1 merge command does NOT use `--no-ff` with a validated message ✓ expect FAIL
  Expected: S9/S10 items FAIL.

---

## Parallel Group 1: Implement All Skill Changes

*Complete T001–T006 before starting. Tasks in this group touch different files — safe to run concurrently.*

- [ ] **T007** `[P]` Implement `skills/sdd-init/SKILL.md` — add Step 5.4, update initial commit, add error row:

  **Edit 1 — Insert Step 5.4 between "5.3 Create or update CLAUDE.md" and "## Step 6: Handoff":**

  Find the line:
  ```
  ## Step 6: Handoff
  ```
  Insert immediately before it:

  ```markdown
  ### Step 5.4 Create docs/git-convention.md

  Announce: "Setting up your git convention. I'll ask four quick questions."

  Ask the following questions **one at a time**, waiting for each answer:

  **Q1 — Branch naming pattern:**
  > "What branch naming pattern would you like? Examples:
  > - `NNN-slug` (e.g. `002-git-flow-integration`)
  > - `feat/NNN-slug` (e.g. `feat/002-git-flow-integration`)
  > - `feat/TICKET-slug` (e.g. `feat/PROJ-123-git-flow`)
  > Type a pattern or pick A/B/C:"

  **Q2 — Ticket ID prefix (optional):**
  > "Do you use an external issue tracker (JIRA, GitHub Issues, Linear)? If yes, what is the ticket prefix? (e.g. `PROJ-`, `GH-`, or press Enter to skip)"

  **Q3 — Commit message format:**
  > "Commit message format? Default is Conventional Commits: `<type>(<scope>): <message>`. Press Enter to accept, or type your format:"

  **Q4 — Allowed commit types:**
  > "Allowed commit types? Default: feat, fix, docs, chore, refactor, test. Press Enter to accept, or list yours comma-separated:"

  After collecting answers, derive the POSIX regex for the chosen branch pattern:
  - `NNN-slug` → `"^[0-9]+-[a-z0-9-]+$"`
  - `feat/NNN-slug` → `"^(feat|fix|docs|chore|refactor|test)/[0-9]+-[a-z0-9-]+$"`
  - `feat/TICKET-slug` → `"^(feat|fix|docs|chore|refactor|test)/[A-Z]+-[0-9]+-[a-z0-9-]+$"`
  - Custom → generate best-effort regex and show it to the user for confirmation

  Write `docs/git-convention.md` with YAML frontmatter:

  ```
  ---
  branch_pattern: "<derived regex>"
  ticket_prefix: "<answer or empty string>"
  commit_format: "<answer or default>"
  allowed_types:
    - <type1>
    - <type2>
    ...
  ---

  # Git Convention

  This file is read by SDD skills to enforce branch naming and commit message standards.
  To change these settings, edit this file directly.

  ## Examples

  ### Branch names
  - `<example using pattern A>`
  - `<example using pattern B>`

  ### Commit messages
  - `<example using commit_format with allowed_types[0]>`
  - `<example using commit_format with allowed_types[1]>`
  ```

  **Must not:** proceed to Step 6 without this file written.

  ```

  **Edit 2 — Update the initial commit command in Step 5:**

  Find the text in Step 5 (scaffold creation) that stages files for the initial commit. Replace:
  ```bash
  git init && git add -A && git commit -m "chore: initial commit"
  ```
  With:
  ```bash
  git add memory/constitution.md docs/specs/.gitkeep CLAUDE.md docs/git-convention.md
  git commit -m "chore: initial SDD scaffold with constitutional foundation and git convention"
  ```

  **Edit 3 — Add error scenario row to the error scenarios table:**

  Find the error scenarios table. Add a new row:
  ```markdown
  | User skips git convention Q&A (presses Ctrl-C during Step 5.4) | Write no files for Step 5.4; warn: "git-convention.md not created — git-touching skills will prompt you to create it on first use." Proceed with the rest of the scaffold. |
  ```

- [ ] **T008** `[P]` Implement `skills/sdd-specify/SKILL.md` — replace Step 7:

  Find the entire Step 7 section (begins `### Step 7: Create Isolated Workspace`, ends before `### Step 8: Handoff`). Replace it with:

  ```markdown
  ### Step 7: Note on Branch Creation

  Branch creation happens **after all documentation is complete** — at the end of `sdd-tasks`, not here. When `sdd-tasks` finishes generating the task list, it will:
  1. Read `docs/git-convention.md` for the naming convention
  2. Suggest branch names based on this spec's NNN and slug
  3. Create the branch with your chosen name
  4. Make the doc-first commit containing all spec documents

  No git action is needed here.
  ```

- [ ] **T009** `[P]` Implement `skills/sdd-tasks/SKILL.md` — add Step 5, renumber old Step 5 to Step 6:

  **Edit 1 — Insert new Step 5 before the existing "### Step 5: Handoff":**

  Find the line:
  ```
  ### Step 5: Handoff
  ```
  Rename it to `### Step 6: Handoff`.

  Then insert the following immediately before the (now renamed) `### Step 6: Handoff`:

  ```markdown
  ### Step 5: Branch Creation and Doc-First Commit

  #### 5.1 Load convention

  Read `docs/git-convention.md`.

  If missing:
  - Check if this is a new project (no `CLAUDE.md` exists) → halt: "Run `sdd-init` first to create the git convention."
  - If existing project → offer one-time convention creation:
    > "I need to set up your git convention before creating a branch. I'll ask 4 quick questions."
    Ask the same 4 questions as sdd-init Step 5.4. Write `docs/git-convention.md` before continuing.

  #### 5.2 Suggest branch names

  Prompt:
  > "Do you have an external ticket ID? (e.g. PROJ-123) Press Enter to skip."

  Generate suggestions based on `branch_pattern` from `docs/git-convention.md`:
  - **A:** `NNN-<feature-slug>` (derived from the spec folder name, e.g. `002-git-flow-integration`)
  - **B:** ticket-ID-based (only if ticket ID was provided, e.g. `feat/PROJ-123-git-flow-integration`)
  - **C:** Type a custom name

  Present:
  > "Choose a branch name:
  > A) `<suggestion A>`
  > B) `<suggestion B>` (if ticket ID provided)
  > C) Type a custom name
  >
  > Enter A, B, or your custom branch name:"

  #### 5.3 Validate and create branch

  Validate the chosen name against `branch_pattern` regex from `docs/git-convention.md`:
  - If it matches → create branch: `git checkout -b <name>`
  - If it doesn't match → warn: "Branch name `<name>` doesn't match the convention pattern `<pattern>`. Proceed anyway? (yes/no)" Require explicit yes to override.

  If the branch already exists:
  > "Branch `<name>` already exists. Options:
  > 1. Switch to the existing branch
  > 2. Choose a different name
  > 3. Abort"
  Wait for selection.

  #### 5.4 Doc-first commit

  Stage all files under `docs/specs/<NNN>-<feature-slug>/`:
  ```bash
  git add docs/specs/<NNN>-<feature-slug>/
  ```

  Propose a commit message using `commit_format` and `allowed_types` from `docs/git-convention.md`:
  > "Proposed commit: `docs(<NNN>-<feature-slug>): add spec, plan, and tasks`
  > Confirm this message, or type an alternative:"

  Validate the confirmed message against `commit_format` and `allowed_types`. If invalid, warn and re-prompt.

  Execute commit:
  ```bash
  git commit -m "<confirmed message>"
  ```

  If the commit fails (nothing staged, git error):
  > "Commit failed: `<exact git error output>`. Resolve the issue and re-run this step."
  Do not proceed to handoff until commit succeeds.

  ```

  **Edit 2 — Update the Step 6 Handoff opening line** to confirm the doc-first commit:

  Find the handoff quote block that begins:
  ```
  > "Task list generated: `docs/specs/NNN-feature/tasks.md`
  ```
  Replace the opening line with:
  ```
  > "Task list generated: `docs/specs/NNN-feature/tasks.md`
  > Branch `<branch-name>` created. Doc-first commit made: `<commit-sha> <commit-message>`
  ```

- [ ] **T010** `[P]` Implement `skills/sdd-execute/SKILL.md` — update Step 1 and replace Step 3e:

  **Edit 1 — Replace the existing Step 1 content:**

  Find `### Step 1: Verify Starting Baseline` and replace the entire step content with:

  ```markdown
  ### Step 1: Verify Starting Baseline

  ```bash
  # Confirm on feature branch (not main/master)
  git branch --show-current
  ```
  If output is `main` or `master`: **STOP**. Route user back to `sdd-tasks` to create a feature branch first.

  **Load git convention:**
  Read `docs/git-convention.md`.
  - If missing on a new project (no `CLAUDE.md`): halt with "Run `sdd-init` first to establish a git convention."
  - If missing on an existing project: offer one-time creation dialogue — ask the same 4 questions as `sdd-init` Step 5.4, write `docs/git-convention.md`, then continue.

  ```bash
  # Confirm baseline tests pass
  <project test command>
  ```
  If tests fail before implementation starts: Stop. Report failures. Do not proceed until baseline is clean.
  ```

  **Edit 2 — Replace Step 3e:**

  Find `**3e. Mark task complete**` and replace the entire 3e block with:

  ```markdown
  **3e. Commit completed task**

  Before committing, check for conflicts:
  ```bash
  git status
  ```
  If output contains `<<<<<<`, `=======`, or `>>>>>>>`:
  > "Merge conflicts detected in: `<file list>`. Resolve conflicts, then re-run this step."
  Do NOT proceed until conflicts are cleared.

  Record the SHA of the last commit before this task began:
  ```bash
  git rev-parse HEAD
  ```

  Stage all files modified or added since that SHA:
  ```bash
  git add $(git diff --name-only HEAD)
  git add $(git ls-files --others --exclude-standard)
  ```

  Propose a commit message using `commit_format` and `allowed_types` from `docs/git-convention.md`:
  > "Proposed commit: `feat(<NNN>-<slug>): <task description>`
  > Confirm this message, or type an alternative:"

  Validate the confirmed message (type must be in `allowed_types`, format must match `commit_format`). If invalid, warn and re-prompt.

  Execute commit:
  ```bash
  git commit -m "<confirmed message>"
  ```

  Verify the commit landed:
  ```bash
  git log --oneline -1
  ```

  Only mark the task checkbox complete after: tests pass + spec-compliance review approves + code-quality review approves + commit created.
  ```

- [ ] **T011** `[P]` Implement `skills/finishing-a-development-branch/SKILL.md` — insert Step 2.5, update Options 1 and 2:

  **Edit 1 — Insert Step 2.5 between Step 2 and Step 3:**

  Find the line:
  ```
  ### Step 3: Present Options
  ```
  Insert immediately before it:

  ```markdown
  ### Step 2.5: Load Convention and Prepare Merge Commit Message

  Read `docs/git-convention.md`.
  - If missing on an existing project: offer one-time creation dialogue (same 4 questions as `sdd-init` Step 5.4) before continuing.
  - If missing on a new project: halt — "Run `sdd-init` first to establish a git convention."

  Extract `commit_format` and `allowed_types` from the YAML frontmatter.

  Derive the feature scope from the current branch name (e.g. branch `002-git-flow-integration` → scope `002-git-flow-integration`).

  Suggest a compliant merge commit message:
  > "Proposed merge commit: `feat(<scope>): merge <feature-description>`
  > Confirm this message, or type an alternative:"

  Validate the confirmed message:
  - Type must be in `allowed_types`
  - Format must match `commit_format` structure

  If validation fails:
  > "Message `<message>` violates the convention: `<reason>`. Expected format: `<commit_format>`.
  > Suggested: `<corrected message>`
  > Type a valid message:"

  Re-prompt until valid. Store the confirmed message as `<merge-commit-message>`.

  ```

  **Edit 2 — Update Option 1 merge command** to use `--no-ff` with the confirmed message:

  Find:
  ```bash
  git merge <feature-branch>
  ```
  Replace with:
  ```bash
  git merge --no-ff <feature-branch> -m "<merge-commit-message>"
  ```

  **Edit 3 — Update Option 2 PR creation** to pre-fill the PR title:

  Find the `gh pr create` command. Replace the `--title "<title>"` argument with:
  ```bash
  --title "<merge-commit-message>"
  ```

---

## Parallel Group 2: Verify Implementations Pass

*Complete T007–T011 before starting. Tasks in this group read different files — safe to run concurrently.*

- [ ] **T012** `[P]` Verify S2 PASSES against updated `skills/sdd-init/SKILL.md`:
  Read the file. Confirm each S2 item:
  - [ ] Step 5.4 exists with Q1 (branch pattern), Q2 (ticket prefix), Q3 (commit format), Q4 (allowed types)
  - [ ] Initial commit command includes `docs/git-convention.md`
  - [ ] "Must not proceed to Step 6 without this file written" or equivalent gate present
  - [ ] Error scenario row for skipped Q&A present in error table
  Expected: ALL S2 items PASS. If any fail, fix T007 and re-verify.

- [ ] **T013** `[P]` Verify S3 PASSES against updated `skills/sdd-specify/SKILL.md`:
  Read Step 7. Confirm each S3 item:
  - [ ] `using-git-worktrees` NOT present in Step 7
  - [ ] `git checkout -b` NOT present in Step 7
  - [ ] Step 7 mentions branch creation happens at `sdd-tasks`
  - [ ] Step 8 Handoff still presents Options A/B/C
  Expected: ALL S3 items PASS. If any fail, fix T008 and re-verify.

- [ ] **T014** `[P]` Verify S4/S5/S6 PASS against updated `skills/sdd-tasks/SKILL.md`:
  Read the file. Confirm:
  - [ ] Step 5 exists with sections 5.1, 5.2, 5.3, 5.4
  - [ ] 5.1 checks for missing `docs/git-convention.md` and handles new vs existing project
  - [ ] 5.2 prompts for ticket ID and generates suggestions A/B/C
  - [ ] 5.3 validates branch name against regex, handles existing branch
  - [ ] 5.4 stages only `docs/specs/NNN-*/`, proposes commit message, confirms, commits
  - [ ] Step 6 Handoff mentions branch name and doc-first commit SHA
  Expected: ALL S4/S5/S6 items PASS. If any fail, fix T009 and re-verify.

- [ ] **T015** `[P]` Verify S7/S8 PASS against updated `skills/sdd-execute/SKILL.md`:
  Read the file. Confirm:
  - [ ] Step 1 checks `git branch --show-current` and halts on main/master
  - [ ] Step 1 loads `docs/git-convention.md` with new/existing project handling
  - [ ] Step 3e checks `git status` for conflict markers before staging
  - [ ] Step 3e stages files using `git add` based on modified files
  - [ ] Step 3e proposes commit message using convention, confirms before committing
  - [ ] Step 3e only marks task complete after tests + reviews + commit
  Expected: ALL S7/S8 items PASS. If any fail, fix T010 and re-verify.

- [ ] **T016** `[P]` Verify S9/S10 PASS against updated `skills/finishing-a-development-branch/SKILL.md`:
  Read the file. Confirm:
  - [ ] Step 2.5 exists between Step 2 and Step 3
  - [ ] Step 2.5 loads `docs/git-convention.md` with new/existing project handling
  - [ ] Step 2.5 suggests compliant merge commit message derived from branch name
  - [ ] Step 2.5 validates message against `allowed_types` and `commit_format`
  - [ ] Step 2.5 re-prompts on violation with suggestion
  - [ ] Option 1 merge uses `--no-ff -m "<merge-commit-message>"`
  - [ ] Option 2 PR uses `<merge-commit-message>` as title
  - [ ] Step 2.5 does NOT block on source branch name
  Expected: ALL S9/S10 items PASS. If any fail, fix T011 and re-verify.

---

## Sequential: Phase 3 — Commit Implementations

*Complete T012–T016 before starting.*

- [ ] **T017** Commit all skill file changes:
  ```bash
  git add skills/sdd-init/SKILL.md \
          skills/sdd-specify/SKILL.md \
          skills/sdd-tasks/SKILL.md \
          skills/sdd-execute/SKILL.md \
          skills/finishing-a-development-branch/SKILL.md \
          docs/specs/002-git-flow-integration/git-convention.template.md \
          docs/specs/002-git-flow-integration/quickstart.md \
          docs/specs/002-git-flow-integration/plan.md \
          docs/specs/002-git-flow-integration/tasks.md
  git commit -m "feat(002-git-flow-integration): implement git flow integration across all SDD skills"
  ```
  Verify: `git log --oneline -1` shows the commit.

---

## Sequential: Phase 4 — Integration Verification (S11)

*Complete T017 before starting.*

- [ ] **T018** Verify S11 (end-to-end) by reading skill files in workflow sequence:

  Walk through the complete workflow mentally, reading each updated skill file in order:

  **Step 1 — sdd-init:**
  - Read `skills/sdd-init/SKILL.md`
  - Confirm Step 5.4 is present and produces `docs/git-convention.md` in the initial commit

  **Step 2 — sdd-specify:**
  - Read `skills/sdd-specify/SKILL.md`
  - Confirm Step 7 contains the note about branch creation at sdd-tasks (no worktree)

  **Step 3 — sdd-plan:**
  - No changes to sdd-plan — confirm it is untouched

  **Step 4 — sdd-tasks:**
  - Read `skills/sdd-tasks/SKILL.md`
  - Confirm Step 5 (branch + doc-first commit) appears before Step 6 (handoff)

  **Step 5 — sdd-execute:**
  - Read `skills/sdd-execute/SKILL.md`
  - Confirm Step 1 loads convention + checks branch, Step 3e commits per task

  **Step 6 — finishing-a-development-branch:**
  - Read `skills/finishing-a-development-branch/SKILL.md`
  - Confirm Step 2.5 appears between Step 2 and Step 3

  Confirm the expected git log shape is achievable from this skill sequence:
  - [ ] `chore: initial SDD scaffold...` ← sdd-init initial commit includes git-convention.md
  - [ ] `docs(...): add spec, plan, and tasks` ← sdd-tasks doc-first commit
  - [ ] N × `feat(...): <task description>` ← sdd-execute per-task commits
  - [ ] `feat(...): merge <feature>` ← finishing-a-development-branch validated merge commit

  Expected: ALL S11 items PASS.

- [ ] **T019** Final commit for integration verification record:
  ```bash
  git add docs/specs/002-git-flow-integration/tasks.md
  git commit -m "docs(002-git-flow-integration): mark tasks complete and verify S11 integration"
  ```

---

## Task Summary

| Range | Phase | Can Parallelize? |
|-------|-------|-----------------|
| T001–T006 | Baseline verification (all FAIL checks) | Yes (within group) |
| T007–T011 | Implement skill changes | Yes (within group — different files) |
| T012–T016 | Verify implementations (all PASS checks) | Yes (within group) |
| T017 | Commit all implementations | No (sequential) |
| T018–T019 | Integration verification (S11) | No (sequential) |

**Total tasks:** 19
**Estimated parallel speedup:** ~3x (12 of 19 tasks parallelizable across 3 parallel groups)
