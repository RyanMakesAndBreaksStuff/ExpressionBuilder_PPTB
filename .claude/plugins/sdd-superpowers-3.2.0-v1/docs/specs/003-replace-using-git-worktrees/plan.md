# Implementation Plan: Replace using-git-worktrees with using-git

> **For agentic workers:** Use sdd-tasks to generate an executable task list from this plan.

**Spec:** docs/specs/003-replace-using-git-worktrees/spec.md
**Created:** 2026-04-17

---

## Goal

Replace the obsolete `using-git-worktrees` skill with a new `using-git` skill that is the single source of truth for all SDD git operations, and update the three delegating skills (`sdd-tasks`, `sdd-execute`, `finishing-a-development-branch`) to point to it instead of embedding git logic inline.

## Architecture

This feature modifies Markdown skill prompt files — there is no runtime code. The "shared helper" pattern is implemented as prose delegation: a skill's step says "Invoke `using-git` — <Operation>" and names the inputs and expected output. `using-git` owns all the logic; callers own only the trigger condition. The `using-git-worktrees` directory is deleted and every reference to it is removed.

## Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Skill files | Markdown (SKILL.md) | All skills in this project are Markdown prompt files |
| Convention file | YAML frontmatter + Markdown body | Established by 002-git-flow-integration; unchanged |
| Validation | POSIX regex match | Inherited from 002; `branch_pattern` validated by regex |

## File Structure

- `skills/using-git/SKILL.md` — new skill; single source of truth for all git operations (FR-1–FR-7)
- `skills/sdd-tasks/SKILL.md` — Step 5 replaced with delegation block (Story 3, FR-2, FR-3)
- `skills/sdd-execute/SKILL.md` — Step 3e replaced with delegation block (Story 4, FR-4)
- `skills/finishing-a-development-branch/SKILL.md` — Step 2.5 replaced with delegation block (Story 5, FR-5)
- `skills/subagent-driven-development/SKILL.md` — worktrees reference removed (FR-8)
- `CLAUDE.md` — bundled skills table updated: `using-git-worktrees` → `using-git` (FR-8)
- `skills/using-git-worktrees/SKILL.md` — deleted (FR-8)
- `docs/specs/003-replace-using-git-worktrees/quickstart.md` — acceptance scenario checklist

## Complexity Tracking

- **Gate:** Simplicity Gate (≤3 major components)
- **Violation:** 1 new skill + 3 delegating-skill edits + 2 reference cleanups + 1 deletion = 7 components
- **Justification:** FR-8 requires touching every file that references `using-git-worktrees`; there are exactly that many. Each change is a targeted replacement with no new abstraction layers.

---

## Phase 0: Acceptance Scenarios (Test-First)

**Implements:** All FRs (scenarios written before skill editing)
**Files:** `docs/specs/003-replace-using-git-worktrees/quickstart.md`

Write all acceptance scenarios in `quickstart.md` **before editing any skill file**. Each scenario is a checklist that the implementation must satisfy; verify each one by reading the relevant skill file after implementation.

### 0.1 Write S1 — using-git loads convention

```markdown
## Scenario S1: using-git loads docs/git-convention.md
Given: a project with a valid docs/git-convention.md
When: using-git is invoked for any operation
Then:
- [ ] Skill reads docs/git-convention.md at the start of the operation
- [ ] Skill parses branch_pattern, ticket_prefix, commit_format, allowed_types from YAML frontmatter
- [ ] On new project (no CLAUDE.md): skill halts with "Run sdd-init first"
- [ ] On existing project, file missing: skill offers 4-question creation dialogue before continuing
- [ ] If user declines creation dialogue: skill halts without performing any git operation
```

### 0.2 Write S2 — branch creation

```markdown
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
```

### 0.3 Write S3 — doc-first commit

```markdown
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
```

### 0.4 Write S4 — per-task commit

```markdown
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
```

### 0.5 Write S5 — merge commit message

```markdown
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
```

### 0.6 Write S6 — direct invocation menu

```markdown
## Scenario S6: using-git presents operation menu when invoked directly
Given: a user invokes using-git without specifying an operation
When: the skill starts
Then:
- [ ] Skill presents menu: (1) Create branch, (2) Commit, (3) Merge commit message, (4) Show convention
- [ ] "Show convention" displays branch_pattern, commit_format, allowed_types, and examples
- [ ] Each menu option follows the same logic as S2–S5 respectively
- [ ] No git operation executes before docs/git-convention.md is loaded
```

### 0.7 Write S7 — advanced worktrees section

```markdown
## Scenario S7: using-git contains Advanced worktrees section
Given: a developer reads using-git/SKILL.md
When: they look for worktrees guidance
Then:
- [ ] Skill contains "Advanced: Parallel Workstreams with Worktrees" section
- [ ] Section documents git worktree add and git worktree remove with examples
- [ ] Section states: "This is not part of the standard SDD workflow"
- [ ] Section documents .gitignore verification before creating a worktree
- [ ] Section does NOT automate any worktree operation
```

### 0.8 Write S8 — sdd-tasks delegation

```markdown
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
```

### 0.9 Write S9 — sdd-execute delegation

```markdown
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
```

### 0.10 Write S10 — finishing-a-development-branch delegation

```markdown
## Scenario S10: finishing-a-development-branch Step 2.5 delegates entirely to using-git
Given: finishing-a-development-branch has verified tests and determined base branch
When: Step 2.5 executes
Then:
- [ ] Step 2.5 contains only a delegation instruction pointing to using-git
- [ ] Step 2.5 names the input to pass: current branch name
- [ ] Step 2.5 does NOT contain inline convention loading logic
- [ ] Step 2.5 does NOT contain inline message suggestion or validation logic
- [ ] The confirmed message returned by using-git is used in git merge --no-ff and PR title
```

### 0.11 Write S11 — using-git-worktrees removed

```markdown
## Scenario S11: using-git-worktrees is fully removed
Given: all skill files have been updated
When: searching the entire skills/ directory and CLAUDE.md for "using-git-worktrees"
Then:
- [ ] skills/using-git-worktrees/ directory does not exist
- [ ] No file in skills/ contains the string "using-git-worktrees"
- [ ] CLAUDE.md does not contain "using-git-worktrees"
- [ ] CLAUDE.md bundled skills table contains a row for "using-git"
```

Verify: all 11 scenario checklists are written and cover every acceptance criterion from spec. Do not proceed to Phase 1 until quickstart.md is complete.

---

## Phase 1: Create skills/using-git/SKILL.md

**Implements:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, Stories 1–2, 6
**Files:** `skills/using-git/SKILL.md`

### 1.1 Write S1 scenario (already done in Phase 0)

Verify S1 checklist items are present in quickstart.md before writing the skill.

### 1.2 Write the using-git skill

Create `skills/using-git/SKILL.md` with the following sections:

**Frontmatter:**
```yaml
---
name: using-git
description: Use when any git operation is needed in an SDD project — branch creation, commits, merge commit validation, or showing the convention. Called by sdd-tasks, sdd-execute, and finishing-a-development-branch, and directly by users.
---
```

**Overview section:** Announce string, core principle, two usage modes (direct invocation + delegation from other skills).

**Section: Convention Loading (FR-1)** — applies before every operation:
- Read `docs/git-convention.md`
- Parse YAML frontmatter: `branch_pattern`, `ticket_prefix`, `commit_format`, `allowed_types`
- Missing on new project (no `CLAUDE.md`): halt with "Run `sdd-init` first."
- Missing on existing project: offer 4-question creation dialogue (same questions as `sdd-init` Step 5.4); write file; continue
- If user declines: halt without git operation

**Section: Direct Invocation — Operation Menu (FR-6):**
- When invoked without a specified operation: present menu
  - (1) Create branch → runs Operation A
  - (2) Commit → runs Operation C
  - (3) Merge commit message → runs Operation D
  - (4) Show convention → display branch_pattern, commit_format, allowed_types, examples in human-readable form

**Section: Operation A — Branch Creation (FR-2):**
- Inputs: spec folder path (NNN-slug), optional ticket ID (passed by caller or prompted)
- Steps: prompt ticket ID → generate A/B/C suggestions → validate against branch_pattern → handle existing branch → `git checkout -b <name>`
- Refuse if on main/master
- Output: branch name created

**Section: Operation B — Doc-First Commit (FR-3):**
- Inputs: spec folder path (NNN-slug)
- Steps: `git add docs/specs/NNN-slug/` → propose message per commit_format → confirm → validate → `git commit -m` → report exact git error and halt on failure
- Must not stage source code or test files
- Output: commit SHA

**Section: Operation C — Per-Task Commit (FR-4):**
- Inputs: prior commit SHA, task description
- Steps: check git status for conflict markers → halt if found → `git diff --name-only <prior-sha>..HEAD` + `git status` → stage modified/added files → propose message → confirm → validate → `git commit -m` → `git log --oneline -1`
- Output: new commit SHA returned to caller

**Section: Operation D — Merge Commit Message (FR-5):**
- Inputs: current branch name
- Steps: derive scope from branch name → suggest compliant message → confirm → validate type + format → re-prompt on violation (show reason + corrected suggestion)
- Must not validate branch name itself
- Output: confirmed message returned to caller

**Section: Error Reference:**
All error scenarios from spec error table, formatted as a quick-reference.

**Section: Advanced — Parallel Workstreams with Worktrees (FR-7):**
- Explicit disclaimer: "This is not part of the standard SDD workflow."
- Manual `git worktree add <path> -b <branch>` with example
- `.gitignore` verification: `git check-ignore -q <dir>` — add to `.gitignore` if not ignored
- Manual `git worktree remove <path>` with example

**Section: Integration:**
- Called by: `sdd-tasks` (Operations A + B), `sdd-execute` (Operation C), `finishing-a-development-branch` (Operation D)
- Direct invocation: user via operation menu

### 1.3 Verify S1–S7 against the skill file

Read `skills/using-git/SKILL.md` and check each item in scenarios S1–S7. All items must pass before proceeding to Phase 2.

---

## Phase 2: Update sdd-tasks — Delegate Step 5

**Implements:** Story 3, FR-2, FR-3
**Files:** `skills/sdd-tasks/SKILL.md`

### 2.1 Verify S8 scenario is written in quickstart.md (done in Phase 0)

### 2.2 Replace Step 5 in sdd-tasks with delegation block

In `skills/sdd-tasks/SKILL.md`, replace the entire content of **Step 5** (currently: "Branch Creation and Doc-First Commit" with inline sub-steps 5.1–5.4) with:

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

### 2.3 Verify S8 against updated sdd-tasks

Read `skills/sdd-tasks/SKILL.md` Step 5 and check all S8 checklist items. All must pass before Phase 3.

---

## Phase 3: Update sdd-execute — Delegate Step 3e

**Implements:** Story 4, FR-4
**Files:** `skills/sdd-execute/SKILL.md`

### 3.1 Verify S9 scenario is written in quickstart.md (done in Phase 0)

### 3.2 Replace Step 3e in sdd-execute with delegation block

In `skills/sdd-execute/SKILL.md`, replace the entire content of **Step 3e** ("Commit completed task" — currently contains inline conflict check, git add, git commit, git log) with:

```markdown
**3e. Commit completed task**

Invoke `using-git` — **Per-Task Commit**

Pass to `using-git`:
- Prior commit SHA: `git rev-parse HEAD` (recorded before this task dispatched)
- Task description: the task title from tasks.md (e.g. "implement FR-2 branch name suggestions")

`using-git` will handle: conflict detection, file staging, commit message proposal, validation, confirmation, and commit execution.

Mark the task checkbox complete only after `using-git` reports the new commit SHA.
```

### 3.3 Verify S9 against updated sdd-execute

Read `skills/sdd-execute/SKILL.md` Step 3e and check all S9 checklist items. All must pass before Phase 4.

---

## Phase 4: Update finishing-a-development-branch — Delegate Step 2.5

**Implements:** Story 5, FR-5
**Files:** `skills/finishing-a-development-branch/SKILL.md`

### 4.1 Verify S10 scenario is written in quickstart.md (done in Phase 0)

### 4.2 Replace Step 2.5 with delegation block

In `skills/finishing-a-development-branch/SKILL.md`, replace the entire content of **Step 2.5** ("Load Convention and Prepare Merge Commit Message" — currently contains inline convention loading, scope derivation, message suggestion, validation, re-prompt loop) with:

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

### 4.3 Verify S10 against updated finishing-a-development-branch

Read `skills/finishing-a-development-branch/SKILL.md` Step 2.5 and check all S10 checklist items. All must pass before Phase 5.

---

## Phase 5: Remove using-git-worktrees and Clean Up References

**Implements:** FR-8, Story 6 (no other skill references worktrees as required)
**Files:** `skills/using-git-worktrees/SKILL.md` (delete), `skills/subagent-driven-development/SKILL.md`, `CLAUDE.md`

### 5.1 Verify S11 scenario is written in quickstart.md (done in Phase 0)

### 5.2 Delete skills/using-git-worktrees/

Remove the directory and its contents:
```bash
rm -rf skills/using-git-worktrees/
```

### 5.3 Update subagent-driven-development Integration section

In `skills/subagent-driven-development/SKILL.md`, find the Integration section and remove or replace the `using-git-worktrees` line:

Current line (already partially updated):
```
- **using-git-worktrees** - OPTIONAL: Set up isolated workspace if multi-branch parallel work is needed (standard SDD branch creation happens in `sdd-tasks`)
```

Replace with:
```
- **using-git** - For any git operation (branch creation, commits, convention validation); advanced worktrees guidance available within `using-git`
```

### 5.4 Update CLAUDE.md bundled skills table

In `CLAUDE.md`, find the Bundled Skills table row for `using-git-worktrees` (currently updated to "Parallel multi-branch workstreams (advanced, opt-in)") and replace entirely:

```markdown
| Any git operation in an SDD project (branches, commits, convention) | `using-git` |
```

### 5.5 Verify S11 — grep for using-git-worktrees

Run:
```bash
grep -r "using-git-worktrees" skills/ CLAUDE.md
```

Expected output: no matches. If any found: fix before proceeding.

---

## Phase 6: Integration Verification

**Implements:** All FRs — end-to-end readable scenario
**Files:** `docs/specs/003-replace-using-git-worktrees/quickstart.md`

### 6.1 Verify all scenario checklists S1–S11

Read each updated skill file against its scenario checklist:
- S1–S7: `skills/using-git/SKILL.md` ✓
- S8: `skills/sdd-tasks/SKILL.md` Step 5 ✓
- S9: `skills/sdd-execute/SKILL.md` Step 3e ✓
- S10: `skills/finishing-a-development-branch/SKILL.md` Step 2.5 ✓
- S11: grep confirms no `using-git-worktrees` references ✓

### 6.2 End-to-end readable flow

Add to quickstart.md:

```markdown
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

---

## Quickstart Validation

After implementation, verify by reading through the skill files with these questions:

1. **using-git:** Does it have Convention Loading, Operations A–D, Error Reference, and Advanced Worktrees sections? Does every FR-1 through FR-7 map to a named section?
2. **sdd-tasks Step 5:** Is it a single delegation block with no inline git commands?
3. **sdd-execute Step 3e:** Is it a single delegation block with no inline git commands?
4. **finishing-a-development-branch Step 2.5:** Is it a single delegation block with no inline convention logic?
5. **Grep check:** `grep -r "using-git-worktrees" skills/ CLAUDE.md` returns zero results.
6. **S12 end-to-end:** Can you trace a feature from sdd-tasks → sdd-execute → finishing-a-development-branch and see the word "using-git" (not "using-git-worktrees") at each git step?
