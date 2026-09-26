# Implementation Plan: Git Flow Integration

> **For agentic workers:** Use sdd-tasks to generate an executable task list from this plan.

**Spec:** docs/specs/002-git-flow-integration/spec.md
**Created:** 2026-04-17

---

## Goal

Modify five SDD skill files and create a convention file template so that every SDD project has an enforced, documented git discipline: convention established at init, branch created after all docs are done, doc-first commit, per-task commits during execution, and merge commit validation at completion.

## Architecture

This feature modifies existing Markdown skill prompt files — there is no runtime code. The "contract" between skills is the `docs/git-convention.md` YAML frontmatter format (FR-5): every skill that touches git reads this file to determine branch patterns, commit format, and allowed types. The change surface is:

1. `sdd-init` — adds a git convention Q&A step that writes `docs/git-convention.md`
2. `sdd-specify` — removes the `using-git-worktrees` invocation; defers branch creation to `sdd-tasks`
3. `sdd-tasks` — adds branch name suggestion, branch creation, and doc-first commit as a final step
4. `sdd-execute` — adds convention check at start and a per-task commit step after each task completes
5. `finishing-a-development-branch` — adds merge commit message validation against the convention

## Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Skill files | Markdown (SKILL.md) | All skills in this project are Markdown prompt files |
| Convention file | YAML frontmatter + Markdown body | FR-5: machine-parseable by skills, human-readable |
| Validation | POSIX regex match | FR-5: `branch_pattern` validated by regex |

## File Structure

- `skills/sdd-init/SKILL.md` — add git convention Q&A step (FR-1)
- `skills/sdd-specify/SKILL.md` — remove `using-git-worktrees` Step 7; replace with handoff note (FR-4 prep)
- `skills/sdd-tasks/SKILL.md` — add Step 5: convention check → branch suggestions → branch creation → doc-first commit (FR-2, FR-3, FR-4)
- `skills/sdd-execute/SKILL.md` — add convention check in Step 1; add commit step in Step 3e (FR-4, FR-6)
- `skills/finishing-a-development-branch/SKILL.md` — add Step 2.5: convention load + merge commit validation (FR-4, FR-7)
- `docs/specs/002-git-flow-integration/git-convention.template.md` — reference template illustrating the required YAML frontmatter format (FR-5)
- `docs/specs/002-git-flow-integration/quickstart.md` — behavioral scenario checklist for manual verification

## Complexity Tracking

- **Gate:** Simplicity Gate (≤3 major components)
- **Violation:** 5 skill files modified + 1 template created = 6 components
- **Justification:** FR-4 requires all git-touching skills to enforce the convention; there are exactly 5 such skills. Each change is a targeted section edit; no new abstraction layers.

---

## Phase 0: Convention File Template (FR-5)

**Implements:** FR-5
**Files:** `docs/specs/002-git-flow-integration/git-convention.template.md`

### 0.1 Write acceptance scenario for FR-5

Write the scenario test (in quickstart.md) that verifies the convention file format is valid before writing the template:

```markdown
## Scenario S1: Convention file format
Given: a `docs/git-convention.md` created by `sdd-init`
When: a skill reads the file to validate a branch name
Then:
- [ ] YAML frontmatter is parseable (delimited by `---`)
- [ ] `branch_pattern` field is present and is a valid POSIX regex string
- [ ] `ticket_prefix` field is present (may be empty string)
- [ ] `commit_format` field is present
- [ ] `allowed_types` field is present as a YAML list
- [ ] `## Examples` section exists in the Markdown body with ≥2 branch examples and ≥2 commit examples
```

### 0.2 Create convention file template

Create `docs/specs/002-git-flow-integration/git-convention.template.md`:

```markdown
---
branch_pattern: "^(feat|fix|docs|chore|refactor|test)/[0-9]+-[a-z0-9-]+$"
ticket_prefix: ""
commit_format: "<type>(<scope>): <message>"
allowed_types:
  - feat
  - fix
  - docs
  - chore
  - refactor
  - test
---

# Git Convention

This file is read by SDD skills to enforce branch naming and commit message standards.

## Examples

### Branch names
- `feat/002-git-flow-integration`
- `fix/003-auth-timeout`

### Commit messages
- `docs(002-git-flow-integration): add spec, plan, and tasks`
- `feat(002-git-flow-integration): implement branch name suggestions`
```

Verify against S1 checklist: all 6 items must pass before proceeding.

---

## Phase 1: sdd-init Git Convention Q&A (FR-1)

**Implements:** FR-1, Story 1
**Files:** `skills/sdd-init/SKILL.md`

### 1.1 Write acceptance scenario for FR-1

Add to quickstart.md:

```markdown
## Scenario S2: sdd-init creates docs/git-convention.md
Given: a developer runs sdd-init on a new project
When: the Nine Articles are complete and scaffold is about to be written
Then:
- [ ] Skill asks: preferred branch naming pattern (shows examples: NNN-slug, feat/NNN-slug)
- [ ] Skill asks: ticket ID prefix (optional; shows: PROJ-, GH-, or none)
- [ ] Skill asks: commit message format (defaults to Conventional Commits)
- [ ] Skill asks: allowed commit types (defaults shown)
- [ ] `docs/git-convention.md` is written in YAML frontmatter + Markdown format before the initial commit
- [ ] `docs/git-convention.md` is included in the sdd-init initial commit
- [ ] Skill does NOT proceed past scaffold creation without git-convention.md existing
```

### 1.2 Add git convention Q&A to sdd-init Step 5 scaffold creation

In `skills/sdd-init/SKILL.md`, insert a new **Step 5.4** between "5.3 Create or update CLAUDE.md" and "Step 6: Handoff":

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

```yaml
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

### 1.3 Update Step 5 initial commit to include git-convention.md

In the existing Step 5 scaffold creation sequence, ensure the initial commit stages `docs/git-convention.md`:

In the existing initial commit instruction (Step 5 write sequence), confirm the commit command includes:
```bash
git add memory/constitution.md docs/specs/.gitkeep CLAUDE.md docs/git-convention.md
git commit -m "chore: initial SDD scaffold with constitutional foundation and git convention"
```

### 1.4 Add error scenario to sdd-init

Add to the error scenarios table in `skills/sdd-init/SKILL.md`:

```markdown
| User skips git convention Q&A (presses Ctrl-C during Step 5.4) | Write no files for Step 5.4; warn: "git-convention.md not created — git-touching skills will prompt you to create it on first use." Proceed with the rest of the scaffold. |
```

Verify S2 checklist: all 7 items must pass.

---

## Phase 2: sdd-specify — Remove Worktree Step (FR-4 prep)

**Implements:** FR-4 (removes conflicting instruction), Story 2 (defers branch creation to sdd-tasks)
**Files:** `skills/sdd-specify/SKILL.md`

### 2.1 Write acceptance scenario for sdd-specify change

Add to quickstart.md:

```markdown
## Scenario S3: sdd-specify no longer creates a worktree/branch
Given: a developer completes sdd-specify and approves the spec
When: sdd-specify reaches its handoff step
Then:
- [ ] Skill does NOT invoke `using-git-worktrees`
- [ ] Skill does NOT run `git checkout -b`
- [ ] Handoff message mentions that branch creation will happen at end of sdd-tasks
- [ ] Options A/B/C are still presented (research, review, plan)
```

### 2.2 Replace Step 7 in sdd-specify

Replace the existing Step 7 ("Create Isolated Workspace") in `skills/sdd-specify/SKILL.md` with:

```markdown
### Step 7: Note on Branch Creation

Branch creation happens **after all documentation is complete** — at the end of `sdd-tasks`, not here. When `sdd-tasks` finishes generating the task list, it will:
1. Read `docs/git-convention.md` for the naming convention
2. Suggest branch names based on this spec's NNN and slug
3. Create the branch with your chosen name
4. Make the doc-first commit containing all spec documents

No git action is needed here.
```

Verify S3 checklist: all 4 items must pass.

---

## Phase 3: sdd-tasks — Branch Creation and Doc-First Commit (FR-2, FR-3, FR-4)

**Implements:** FR-2, FR-3, FR-4, Story 2, Story 4
**Files:** `skills/sdd-tasks/SKILL.md`

### 3.1 Write acceptance scenarios for FR-2 and FR-3

Add to quickstart.md:

```markdown
## Scenario S4: sdd-tasks creates branch with suggested names
Given: sdd-tasks has written tasks.md and docs/git-convention.md exists
When: sdd-tasks reaches its handoff step
Then:
- [ ] Skill reads docs/git-convention.md before generating suggestions
- [ ] Skill generates Suggestion A: NNN-slug derived from spec folder name
- [ ] Skill prompts: "Do you have an external ticket ID?" (optional)
- [ ] If ticket ID provided: Suggestion B incorporates it per convention pattern
- [ ] If ticket ID not provided: Suggestion B is omitted
- [ ] Suggestion C is always: "Type a custom name"
- [ ] User selects or types; branch is created with `git checkout -b <name>`
- [ ] Branch name is validated against `branch_pattern` regex; violation triggers warning

## Scenario S5: sdd-tasks makes doc-first commit
Given: branch has been created
When: branch creation completes
Then:
- [ ] Skill stages only files under docs/specs/NNN-<feature-slug>/
- [ ] No source code or test files are staged
- [ ] Proposed commit message follows commit_format from docs/git-convention.md
- [ ] User confirms commit message before commit executes
- [ ] Commit completes before sdd-execute is offered

## Scenario S6: sdd-tasks halts when docs/git-convention.md is missing
Given: docs/git-convention.md does not exist
When: sdd-tasks reaches its branch creation step
Then:
- [ ] On new project: skill halts and instructs user to run sdd-init
- [ ] On existing project: skill offers one-time convention creation dialogue (same 4 questions as sdd-init Step 5.4)
```

### 3.2 Add Step 5 to sdd-tasks: Convention Check, Branch, and Doc-First Commit

After the existing Step 4 (Validate the Task List) and before the existing Step 5 (Handoff) in `skills/sdd-tasks/SKILL.md`, insert a new **Step 5: Branch Creation and Doc-First Commit**. Renumber the existing Step 5 (Handoff) to Step 6.

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
> Proposed commit: `docs(<NNN>-<feature-slug>): add spec, plan, and tasks`
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

### 3.3 Update handoff in sdd-tasks

In the existing Step 5 Handoff (now Step 6), add a line confirming the doc-first commit was made:

```markdown
> "Task list generated: `docs/specs/NNN-feature/tasks.md`
> Branch `<branch-name>` created. Doc-first commit made: `<commit-sha> <commit-message>`
>
> **NNN total tasks** | ...
```

Verify S4, S5, S6 checklists: all items must pass.

---

## Phase 4: sdd-execute — Convention Check and Per-Task Commits (FR-4, FR-6)

**Implements:** FR-4, FR-6, Story 5
**Files:** `skills/sdd-execute/SKILL.md`

### 4.1 Write acceptance scenarios for FR-6

Add to quickstart.md:

```markdown
## Scenario S7: sdd-execute checks convention at start
Given: sdd-execute is about to begin
When: Step 1 baseline verification runs
Then:
- [ ] Skill confirms git branch is NOT main or master
- [ ] Skill reads docs/git-convention.md; if missing on existing project → offers creation dialogue
- [ ] If on main/master: halts and routes user back to sdd-tasks

## Scenario S8: sdd-execute creates one commit per completed task
Given: a task has been implemented and both reviews have passed
When: Step 3e marks the task complete
Then:
- [ ] Skill checks `git status` for conflict markers before staging
- [ ] If conflicts exist: skill halts, reports conflicting files, waits for resolution
- [ ] Skill stages all files modified since the previous commit
- [ ] Proposed commit message follows docs/git-convention.md commit_format
- [ ] User confirms commit message before commit executes
- [ ] Only one commit is created per task
- [ ] Files from prior completed tasks are NOT re-staged
```

### 4.2 Update sdd-execute Step 1 to add convention check

In `skills/sdd-execute/SKILL.md`, extend the existing Step 1 (Verify Starting Baseline):

```markdown
### Step 1: Verify Starting Baseline

```bash
# Confirm on feature branch (not main/master)
git branch --show-current
```
If on main or master: **STOP**. Route user back to `sdd-tasks` to create a feature branch.

**Load git convention:**
Read `docs/git-convention.md`.
- If missing on new project: halt with "Run sdd-init first."
- If missing on existing project: offer one-time creation dialogue (same 4 questions as sdd-init Step 5.4).

```bash
# Confirm baseline tests pass
<project test command>
```
If tests fail before implementation starts: Stop. Report failures. Do not proceed.
```

### 4.3 Update sdd-execute Step 3e to add per-task commit

In `skills/sdd-execute/SKILL.md`, replace the existing Step 3e with:

```markdown
**3e. Commit completed task**

Before committing:
```bash
git status
```
Check output for conflict markers (`<<<<<<`, `=======`, `>>>>>>>`). If any exist:
> "Merge conflicts detected in: `<file list>`. Resolve conflicts, then re-run this step."
Do NOT proceed until conflicts are cleared.

Record the SHA of the last commit before this task: `git rev-parse HEAD`

Stage all modified/added files since that SHA:
```bash
git diff --name-only <prior-sha> HEAD  # verify nothing already committed
git add <all files shown by git status>
```

Propose commit message using `commit_format` and `allowed_types` from `docs/git-convention.md`:
> "Proposed commit: `feat(<NNN>-<slug>): <task description>`
> Confirm or type an alternative:"

Validate confirmed message. Execute:
```bash
git commit -m "<confirmed message>"
```

Verify:
```bash
git log --oneline -1
```

Only mark the checkbox complete after: tests pass + both reviews approve + commit created.
```

Verify S7, S8 checklists: all items must pass.

---

## Phase 5: finishing-a-development-branch — Merge Commit Validation (FR-4, FR-7)

**Implements:** FR-4, FR-7, Story 6
**Files:** `skills/finishing-a-development-branch/SKILL.md`

### 5.1 Write acceptance scenario for FR-7

Add to quickstart.md:

```markdown
## Scenario S9: finishing-a-development-branch validates merge commit message
Given: finishing-a-development-branch is about to merge or create a PR
When: Step 2 (Determine Base Branch) completes
Then:
- [ ] Skill reads docs/git-convention.md
- [ ] If missing on existing project: offers one-time creation dialogue
- [ ] Skill suggests a compliant merge commit message (e.g. `feat(scope): merge 002-git-flow-integration`)
- [ ] User can confirm or edit the message
- [ ] Merge/PR proceeds only after message is confirmed
- [ ] Skill does NOT block merge based on the source branch name
- [ ] Merge commit message is validated against commit_format and allowed_types

## Scenario S10: finishing-a-development-branch merge commit message violation
Given: user types a merge commit message that violates the convention
When: confirmation prompt is answered
Then:
- [ ] Skill identifies the violation (bad type, wrong format)
- [ ] Skill shows the violation and suggests a corrected message
- [ ] User is re-prompted before merge proceeds
```

### 5.2 Insert Step 2.5 in finishing-a-development-branch

In `skills/finishing-a-development-branch/SKILL.md`, insert after Step 2 (Determine Base Branch) and before Step 3 (Present Options):

```markdown
### Step 2.5: Load Convention and Prepare Merge Commit Message

Read `docs/git-convention.md`.
- If missing on existing project: offer one-time creation dialogue (same 4 questions as sdd-init Step 5.4) before continuing.
- If missing on new project: halt — "Run sdd-init first to establish a git convention."

Extract `commit_format` and `allowed_types` from the YAML frontmatter.

Derive the feature scope from the current branch name (e.g. branch `002-git-flow-integration` → scope `002-git-flow-integration`).

Suggest a compliant merge commit message:
> "Proposed merge commit: `feat(002-git-flow-integration): merge git flow integration`
> Confirm this message, or type an alternative:"

Validate the confirmed message:
- Type must be in `allowed_types`
- Format must match `commit_format` structure

If validation fails:
> "Message `<message>` violates the convention: `<reason>`. Expected format: `<commit_format>`.
> Suggested: `<corrected message>`
> Type a valid message:"

Re-prompt until valid.

Store the confirmed message as `<merge-commit-message>` — pass it to the git command in Step 4 (Options 1 and 2).

Update Option 1 (Merge Locally) to use `--no-ff` with the confirmed message:
```bash
git merge --no-ff <feature-branch> -m "<merge-commit-message>"
```

Update Option 2 (Push and Create PR) to pre-fill the PR title with `<merge-commit-message>`.
```

Verify S9, S10 checklists: all items must pass.

---

## Phase 6: Integration Verification

**Implements:** All FRs — end-to-end scenario
**Files:** `docs/specs/002-git-flow-integration/quickstart.md`

### 6.1 End-to-end scenario

Add to quickstart.md:

```markdown
## Scenario S11: Full git flow — new project end-to-end
Given: an empty directory with no git repo, no CLAUDE.md, no docs/specs/
Steps:
1. Run sdd-workflow → sdd-init detects new project → runs through Nine Articles
2. At Step 5.4: answer git convention Q&A → docs/git-convention.md created and committed
3. Run sdd-specify for any feature → spec written; Step 7 shows note (no worktree invocation)
4. Run sdd-plan → plan written
5. Run sdd-tasks → tasks written → Step 5 prompts for branch name → branch created → doc-first commit made
6. Run sdd-execute → Step 1 confirms on feature branch and convention loaded → per-task commits after each task
7. Run finishing-a-development-branch → Step 2.5 suggests merge commit message → merge executes with confirmed message

Then:
- [ ] All 10 previous scenarios (S1–S10) pass
- [ ] git log shows: initial commit → doc-first commit → N task commits → merge commit
- [ ] All commit messages comply with docs/git-convention.md
- [ ] docs/git-convention.md exists in repo from the initial commit onward
```

### 6.2 Verify all skill files pass their scenarios

Run through each scenario checklist manually by reading the updated skill files:
- S1: `git-convention.template.md` format ✓
- S2: `sdd-init/SKILL.md` Step 5.4 present ✓
- S3: `sdd-specify/SKILL.md` Step 7 no worktree invocation ✓
- S4–S6: `sdd-tasks/SKILL.md` Step 5 present ✓
- S7–S8: `sdd-execute/SKILL.md` convention check + per-task commit ✓
- S9–S10: `finishing-a-development-branch/SKILL.md` Step 2.5 present ✓
- S11: End-to-end readable flow in skill sequence ✓

---

## Quickstart Validation

After implementation, manually verify the feature by reading through each updated skill file with these questions:

1. **Convention file:** Does `git-convention.template.md` contain YAML frontmatter with all 4 required fields?
2. **sdd-init:** Is Step 5.4 present with 4 questions and YAML-frontmatter output? Is git-convention.md included in the initial commit?
3. **sdd-specify:** Is the worktree invocation gone from Step 7? Does the handoff mention branch creation at sdd-tasks?
4. **sdd-tasks:** Is Step 5 present with convention check → branch suggestions → branch creation → doc-first commit (in that order)?
5. **sdd-execute:** Does Step 1 check for non-main branch AND load convention? Does Step 3e check for conflicts, stage files, propose commit, and confirm before committing?
6. **finishing-a-development-branch:** Is Step 2.5 present between Step 2 and Step 3? Does it load convention, suggest a message, validate it, and pass it to the merge command?
