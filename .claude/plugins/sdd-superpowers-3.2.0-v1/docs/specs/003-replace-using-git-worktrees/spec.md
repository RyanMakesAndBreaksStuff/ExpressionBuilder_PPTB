# Feature 003: Replace using-git-worktrees with using-git

**Status:** Draft
**Created:** 2026-04-17
**Branch:** `003-replace-using-git-worktrees`

---

## Problem Statement

Git logic is duplicated across three SDD skills — `sdd-tasks` (branch creation, doc-first commit), `sdd-execute` (per-task commits), and `finishing-a-development-branch` (merge commit validation). Any change to the git convention requires edits in three places. Additionally, the `using-git-worktrees` skill is now misaligned with the 002-git-flow-integration workflow: it was designed as a prerequisite for feature work but branch creation has moved to `sdd-tasks`, making the skill obsolete as a workflow component and confusing as a reference.

## Goals

- Establish a single source of truth for all SDD git operations in one `using-git` skill
- Make `using-git` both directly user-invocable and delegatable-to by other SDD skills
- Remove the `using-git-worktrees` skill entirely from the repository
- Update all skill references so no skill points to `using-git-worktrees`
- Preserve worktrees as an advanced, opt-in capability documented in `using-git` but not automated by the workflow

## Non-Goals

- Changing the git convention format defined in `docs/git-convention.md` (established by 002)
- Remote push, pull request creation, or any remote git interaction
- CI/CD pipeline integration
- Enforcing commit signing or GPG
- Automating worktree creation or management as part of the standard SDD workflow
- Updating `sdd-init` Step 5.4 — it remains the authoritative first-time creator of `docs/git-convention.md` and does not delegate to `using-git`

## Users and Context

**Primary users:** Developers using SDD skills, and SDD skills themselves (as a shared helper)
**Usage context:** Any point in the SDD workflow where a git operation is needed — branch creation at `sdd-tasks` completion, per-task commits during `sdd-execute`, merge commit validation at `finishing-a-development-branch`, or ad-hoc git actions invoked directly by the user
**User mental model:** Users expect one place to look for "how do I do git in this SDD project." Skills expect to hand off git work to `using-git` rather than embedding their own git steps.

---

## User Stories

### Story 1: Direct invocation — branch creation
**As a** developer who needs to create a feature branch outside the normal `sdd-tasks` flow
**I want to** invoke `using-git` directly
**So that** the branch is named and created following `docs/git-convention.md` without me having to remember the convention

**Acceptance criteria:**
- [ ] User can invoke `using-git` with intent "create branch" and receive name suggestions (spec-slug, ticket-ID if provided, custom)
- [ ] Chosen branch name is validated against `branch_pattern` from `docs/git-convention.md` before creation
- [ ] Branch is created with `git checkout -b <name>`
- [ ] If `docs/git-convention.md` is missing, skill halts and instructs user to run `sdd-init` (new project) or offers one-time creation dialogue (existing project)

### Story 2: Direct invocation — ad-hoc commit
**As a** developer who needs to commit work following the convention
**I want to** invoke `using-git` with intent "commit"
**So that** the commit message is validated against `docs/git-convention.md` before the commit is created

**Acceptance criteria:**
- [ ] User can invoke `using-git` with intent "commit" and receive a suggested message based on current branch name and `commit_format`
- [ ] Confirmed message is validated against `commit_format` and `allowed_types`
- [ ] If validation fails, skill shows violation and re-prompts before committing
- [ ] Commit is created only after user confirmation
- [ ] User can invoke `using-git` with intent "show convention" and see `branch_pattern`, `commit_format`, `allowed_types`, and examples displayed in human-readable form

### Story 3: Delegation — sdd-tasks hands off branch creation and doc-first commit
**As** `sdd-tasks` (or a developer following its flow)
**I want** `sdd-tasks` to delegate its Step 5 (branch creation + doc-first commit) entirely to `using-git`
**So that** the branch naming and commit logic is maintained in one place only

**Acceptance criteria:**
- [ ] `sdd-tasks` Step 5 contains only a delegation instruction: "Invoke `using-git` — Branch Creation and Doc-First Commit"
- [ ] `sdd-tasks` passes the spec folder path (`docs/specs/NNN-slug/`) and optional ticket ID to `using-git`
- [ ] `using-git` handles suggestion generation, branch creation, doc staging, commit message confirmation, and commit execution
- [ ] `sdd-tasks` proceeds to handoff only after `using-git` reports branch created and commit made

### Story 4: Delegation — sdd-execute hands off per-task commit
**As** `sdd-execute` (or a developer following its flow)
**I want** `sdd-execute` Step 3e to delegate the per-task commit entirely to `using-git`
**So that** conflict checking, staging, message proposal, validation, and commit execution are maintained in one place only

**Acceptance criteria:**
- [ ] `sdd-execute` Step 3e contains only a delegation instruction: "Invoke `using-git` — Per-Task Commit"
- [ ] `sdd-execute` passes the prior commit SHA and task description to `using-git`
- [ ] `using-git` handles conflict detection, file staging, message proposal, validation, confirmation, and commit execution
- [ ] `sdd-execute` marks the task checkbox complete only after `using-git` reports commit created

### Story 5: Delegation — finishing-a-development-branch hands off merge commit validation
**As** `finishing-a-development-branch` (or a developer following its flow)
**I want** Step 2.5 to delegate merge commit message preparation and validation entirely to `using-git`
**So that** merge commit validation logic is not duplicated

**Acceptance criteria:**
- [ ] `finishing-a-development-branch` Step 2.5 contains only a delegation instruction: "Invoke `using-git` — Merge Commit Message"
- [ ] `finishing-a-development-branch` passes the current branch name to `using-git`
- [ ] `using-git` suggests a compliant merge commit message, validates it, re-prompts on violation, and returns the confirmed message
- [ ] `finishing-a-development-branch` uses the returned message in the `git merge --no-ff` and PR title commands

### Story 6: Advanced worktrees reference
**As a** developer who needs to work on two features simultaneously
**I want** `using-git` to document how to set up git worktrees
**So that** I can find the guidance without the workflow forcing it on me

**Acceptance criteria:**
- [ ] `using-git` contains an "Advanced: Parallel Workstreams with Worktrees" section
- [ ] The section documents the manual steps to create and remove a worktree
- [ ] The section is clearly marked as optional and not part of the standard SDD flow
- [ ] No other SDD skill invokes or references worktree creation as a required step

---

## Functional Requirements

### FR-1: Convention loading
`using-git` must load `docs/git-convention.md` before any git operation.

**Must:**
- Read `docs/git-convention.md` from the project root at the start of every operation
- Parse YAML frontmatter to extract `branch_pattern`, `ticket_prefix`, `commit_format`, and `allowed_types`
- On a **new project** (no `CLAUDE.md`): halt with "Run `sdd-init` first to establish a git convention."
- On an **existing project** where the file is missing: offer a one-time creation dialogue (same 4 questions as `sdd-init` Step 5.4), write `docs/git-convention.md`, then continue

**Must not:**
- Proceed with any git operation if `docs/git-convention.md` cannot be loaded and the user declines to create it

### FR-2: Branch name suggestion and creation
When invoked for branch creation (by `sdd-tasks` or directly by the user):

**Must:**
- Prompt: "Do you have an external ticket ID? (e.g. PROJ-123) Press Enter to skip."
- Generate suggestions:
  - Suggestion A: `NNN-<feature-slug>` derived from the spec folder name
  - Suggestion B: ticket-ID-based (only if ticket ID was provided, formatted per `docs/git-convention.md` `branch_pattern`)
  - Suggestion C: free-form custom input
- Validate the chosen name against `branch_pattern` regex; warn and require explicit "yes" to override if it doesn't match
- If branch already exists: offer to switch to it, choose a different name, or abort
- Create the branch: `git checkout -b <name>`

**Must not:**
- Create a branch on `main` or `master` (detect and refuse)
- Proceed to doc-first commit without a branch having been created

### FR-3: Doc-first commit
When invoked for doc-first commit (by `sdd-tasks` after branch creation):

**Must:**
- Stage all files under `docs/specs/<NNN>-<feature-slug>/`
- Propose a commit message using `commit_format` and `allowed_types` from `docs/git-convention.md` (e.g. `docs(NNN-slug): add spec, plan, and tasks`)
- Confirm the message with the user before committing
- Validate the confirmed message against `commit_format` and `allowed_types`; re-prompt if invalid
- Execute: `git commit -m "<confirmed message>"`
- If commit fails (nothing staged, git error): report the exact git output and halt — do not proceed until resolved

**Must not:**
- Stage any source code or test files in the doc-first commit
- Skip the confirmation step

### FR-4: Per-task commit
When invoked for a per-task commit (by `sdd-execute` Step 3e):

**Must:**
- Check `git status` for conflict markers (`<<<<<<`, `=======`, `>>>>>>>`); if found, report the conflicting files and halt until resolved
- Accept the prior commit SHA from the caller; stage all files modified or added since that SHA
- Propose a commit message using `commit_format` and `allowed_types` (e.g. `feat(NNN-slug): <task description>`)
- Confirm the message with the user before committing
- Validate the confirmed message; re-prompt if invalid
- Execute: `git commit -m "<confirmed message>"`
- Verify with `git log --oneline -1` and return the new commit SHA to the caller

**Must not:**
- Commit if merge conflicts exist
- Re-stage files already committed before this task began

### FR-5: Merge commit message
When invoked for merge commit preparation (by `finishing-a-development-branch` Step 2.5):

**Must:**
- Accept the current branch name from the caller
- Derive the feature scope from the branch name (e.g. `002-git-flow-integration` → scope `002-git-flow-integration`)
- Suggest a compliant merge commit message (e.g. `feat(scope): merge <feature-description>`)
- Validate the confirmed message against `commit_format` and `allowed_types`; re-prompt on violation, showing the violation reason and a corrected suggestion
- Return the confirmed message to the caller for use in `git merge --no-ff` and PR title

**Must not:**
- Validate or reject the source branch name
- Block the merge based on branch naming — only the merge commit message is enforced

### FR-6: Convention validation for ad-hoc use
When a user invokes `using-git` directly without a specific delegated operation:

**Must:**
- Present a menu of available operations: (1) Create branch, (2) Ad-hoc commit, (3) Merge commit message, (4) Show convention
- Menu option (2) **Ad-hoc commit**: stage the user's current working tree changes (`git add` files the user specifies, or all unstaged changes), propose a commit message based on the current branch name and `commit_format`, validate it against `allowed_types`, confirm with user, then execute — no prior SHA required
- Menu option (4) **Show convention**: read `docs/git-convention.md` and display `branch_pattern`, `commit_format`, `allowed_types`, and the `## Examples` section in human-readable form
- Menu options (1) and (3) follow the same logic as FR-2 and FR-5 respectively
- FR-4 (per-task commit, SHA-based) is a **delegation-only operation** — it is not available in the direct menu; it is invoked exclusively by `sdd-execute`

**Must not:**
- Perform any git operation without loading and validating against `docs/git-convention.md` first
- Expose the SHA-based per-task commit (FR-4) as a direct menu option

### FR-7: Advanced worktrees documentation
`using-git` must include an "Advanced: Parallel Workstreams with Worktrees" section.

**Must:**
- Document the manual `git worktree add` and `git worktree remove` commands with examples
- State explicitly: "This is not part of the standard SDD workflow. Use this only when you need multiple branches checked out simultaneously."
- Document how to verify the worktree directory is in `.gitignore` before creating it

**Must not:**
- Automate worktree creation or management
- Call or reference `using-git-worktrees` (that skill is removed)

### FR-8: Remove using-git-worktrees
The `skills/using-git-worktrees/` directory and all references to it must be removed.

**Must:**
- Delete `skills/using-git-worktrees/SKILL.md` and the directory
- Update every skill that referenced `using-git-worktrees` to reference `using-git` instead (or remove the reference if the operation is now fully delegated)
- Affected skills: `sdd-execute`, `subagent-driven-development`, `finishing-a-development-branch`, `CLAUDE.md`

**Must not:**
- Leave any skill file containing the string `using-git-worktrees` after the change

---

## Non-Functional Requirements

### Performance
- All git operations (branch creation, commit) must complete within 10 seconds on a standard developer machine

### Security
- `using-git` must not expose credentials or modify remote git configuration
- All git operations are local only — no push, no fetch, no remote interaction

### Reliability
- If git is not initialised in the project, detect this and offer to run `git init && git add -A && git commit -m "chore: initial commit"` before proceeding
- Every operation that can fail must report the exact git error output to the user

---

## Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| `docs/git-convention.md` missing on new project | Halt: "Run `sdd-init` first to establish a git convention." |
| `docs/git-convention.md` missing on existing project | Offer one-time 4-question creation dialogue; write file; continue |
| Chosen branch name violates `branch_pattern` | Warn with pattern, ask "Proceed anyway? (yes/no)"; require explicit yes |
| Branch name already exists | Offer: switch to existing, choose different name, or abort |
| On `main`/`master` when creating branch | Refuse branch creation from default branch; instruct to check out correct base |
| Merge conflicts detected at per-task commit | Halt; list conflicting files; wait for resolution before retrying |
| Confirmed commit message violates convention | Show violation reason + corrected suggestion; re-prompt until valid |
| Commit fails (nothing staged, git error) | Report exact git output; halt until user resolves |
| Git not initialised in project | Detect; offer `git init` before proceeding |

---

## Open Questions

None.

---

## Out of Scope (Future Considerations)

- Push to remote and PR creation (handled by `finishing-a-development-branch`)
- Changelog generation from conventional commits
- Integration with JIRA/GitHub Issues APIs to auto-fetch ticket titles
- Multi-branch or trunk-based development strategies
