# Quickstart: Git Flow Integration

Behavioral scenario checklist for verifying the implementation. Each scenario maps to one or more functional requirements. Run by reading the updated skill files and confirming each checkbox.

---

## Scenario S1: Convention file format (FR-5)

Given: a `docs/git-convention.md` created by `sdd-init`
When: a skill reads the file to validate a branch name or commit message
Then:
- [ ] YAML frontmatter is present and delimited by `---`
- [ ] `branch_pattern` field is a valid POSIX regex string
- [ ] `ticket_prefix` field is present (may be empty string `""`)
- [ ] `commit_format` field is present as a format string
- [ ] `allowed_types` field is present as a YAML list
- [ ] `## Examples` section exists in the Markdown body with ≥2 branch examples and ≥2 commit examples

---

## Scenario S2: sdd-init creates docs/git-convention.md (FR-1)

Given: a developer runs `sdd-init` on a new project
When: the Nine Articles are complete and scaffold writing begins (Step 5.4)
Then:
- [ ] Skill asks: preferred branch naming pattern (shows examples: NNN-slug, feat/NNN-slug)
- [ ] Skill asks: ticket ID prefix (optional; shows: PROJ-, GH-, or none)
- [ ] Skill asks: commit message format (defaults to Conventional Commits)
- [ ] Skill asks: allowed commit types (defaults shown)
- [ ] `docs/git-convention.md` is written with YAML frontmatter format before the initial commit
- [ ] `docs/git-convention.md` is included in the `sdd-init` initial commit
- [ ] Skill does NOT proceed past scaffold creation without `docs/git-convention.md` written

---

## Scenario S3: sdd-specify no longer creates a worktree/branch (FR-4 prep)

Given: a developer completes `sdd-specify` and approves the spec
When: `sdd-specify` reaches its handoff step (Step 7)
Then:
- [ ] Skill does NOT invoke `using-git-worktrees`
- [ ] Skill does NOT run `git checkout -b`
- [ ] Step 7 note mentions that branch creation happens at end of `sdd-tasks`
- [ ] Options A/B/C (research / review / plan) are still presented

---

## Scenario S4: sdd-tasks creates branch with suggested names (FR-2, Story 2, Story 4)

Given: `sdd-tasks` has written `tasks.md` and `docs/git-convention.md` exists
When: `sdd-tasks` reaches Step 5 (Branch Creation)
Then:
- [ ] Skill reads `docs/git-convention.md` before generating suggestions
- [ ] Suggestion A is derived from spec NNN + feature slug (e.g. `002-git-flow-integration`)
- [ ] Skill prompts: "Do you have an external ticket ID?" (optional)
- [ ] If ticket ID provided: Suggestion B incorporates it per the convention pattern
- [ ] If ticket ID not provided: Suggestion B is omitted; other suggestions shown
- [ ] Suggestion C is always: "Type a custom name"
- [ ] Branch is created with `git checkout -b <chosen-name>`
- [ ] If chosen name violates `branch_pattern` regex: skill warns and requires explicit yes to override

---

## Scenario S5: sdd-tasks makes doc-first commit (FR-3, Story 2)

Given: branch has been created by Step 5
When: Step 5.4 (doc-first commit) executes
Then:
- [ ] Only files under `docs/specs/NNN-<feature-slug>/` are staged
- [ ] No source code or test files are staged
- [ ] Proposed commit message follows `commit_format` from `docs/git-convention.md`
- [ ] User confirms the commit message before commit executes
- [ ] Commit completes successfully before `sdd-execute` is offered
- [ ] If commit fails: skill reports exact git error output and halts

---

## Scenario S6: sdd-tasks halts when docs/git-convention.md is missing (FR-4)

Given: `docs/git-convention.md` does not exist when `sdd-tasks` reaches Step 5
When: Step 5.1 (Load convention) runs
Then:
- [ ] On new project (no CLAUDE.md): skill halts and instructs user to run `sdd-init`
- [ ] On existing project: skill offers one-time convention creation dialogue with the same 4 questions as `sdd-init` Step 5.4
- [ ] Convention file is written before branch creation proceeds

---

## Scenario S7: sdd-execute checks convention at start (FR-4)

Given: `sdd-execute` is about to begin implementing tasks
When: Step 1 (Verify Starting Baseline) runs
Then:
- [ ] Skill confirms current branch is NOT `main` or `master`
- [ ] If on `main`/`master`: skill halts and routes user back to `sdd-tasks`
- [ ] Skill reads `docs/git-convention.md`
- [ ] If missing on existing project: skill offers one-time creation dialogue

---

## Scenario S8: sdd-execute creates one commit per completed task (FR-6, Story 5)

Given: a task has been implemented and both spec-compliance and code-quality reviews have passed
When: Step 3e (Commit completed task) runs
Then:
- [ ] Skill checks `git status` for conflict markers before staging
- [ ] If conflicts exist: skill halts, reports conflicting files, and waits for resolution before retrying
- [ ] Skill stages all files modified/added since the previous commit
- [ ] Files from prior committed tasks are NOT re-staged
- [ ] Proposed commit message follows `commit_format` from `docs/git-convention.md`
- [ ] User confirms commit message before commit executes
- [ ] Exactly one commit is created per task (no bundling of multiple tasks)
- [ ] Task checkbox is only marked complete after tests pass + both reviews pass + commit created

---

## Scenario S9: finishing-a-development-branch validates merge commit message (FR-7, Story 6)

Given: `finishing-a-development-branch` is about to merge or create a PR
When: Step 2.5 (Load Convention and Prepare Merge Commit Message) runs
Then:
- [ ] Skill reads `docs/git-convention.md`
- [ ] If missing on existing project: offers one-time creation dialogue
- [ ] Skill suggests a compliant merge commit message derived from branch name and `commit_format`
- [ ] User can confirm or type an alternative message
- [ ] Merge/PR only proceeds after message is confirmed
- [ ] Skill does NOT block merge based on the source branch name
- [ ] Confirmed message is passed to the `git merge --no-ff` command (Option 1) or PR title (Option 2)

---

## Scenario S10: finishing-a-development-branch rejects invalid merge commit message (FR-7)

Given: user types a merge commit message that violates the convention
When: the confirmation prompt is answered with an invalid message
Then:
- [ ] Skill identifies the violation (bad type, wrong format, missing scope)
- [ ] Skill shows the specific violation and suggests a corrected message
- [ ] User is re-prompted before merge proceeds
- [ ] Merge does not execute until a valid message is confirmed

---

## Scenario S11: Full git flow — new project end-to-end (all FRs)

Given: an empty directory (no git repo, no CLAUDE.md, no docs/specs/)
Steps:
1. `sdd-workflow` → `sdd-init` runs Nine Articles + Step 5.4 git convention Q&A
2. `sdd-specify` → spec written; Step 7 shows note (no worktree invocation)
3. `sdd-plan` → plan written
4. `sdd-tasks` → tasks written → Step 5 branch suggestions → branch created → doc-first commit
5. `sdd-execute` → Step 1 loads convention + confirms feature branch → per-task commits after each task
6. `finishing-a-development-branch` → Step 2.5 suggests merge commit → merge executes with confirmed message

Then:
- [ ] All scenarios S1–S10 pass when reading skill files in sequence
- [ ] `git log` shape: `chore: initial SDD scaffold` → `docs(...): add spec, plan, and tasks` → N `feat(...)` task commits → merge commit
- [ ] All commit messages comply with `docs/git-convention.md`
- [ ] `docs/git-convention.md` exists from the initial commit onward
