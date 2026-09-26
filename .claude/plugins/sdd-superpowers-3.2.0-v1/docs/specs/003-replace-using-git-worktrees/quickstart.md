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
