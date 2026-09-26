# Feature 025: Worktree Isolation Operation in using-git

**Status:** Approved
**Version:** 1.1.0
**Created:** 2026-07-11
**Last Updated:** 2026-07-11
**Branch:** `025-using-git-worktree-isolation`

---

## Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.0.0 | 2026-07-11 | Initial approved spec |
| 1.1.0 | 2026-07-11 | Added branch-naming rule to FR-3/Story 3 (AC-3.6), and a new error scenario for branch/path collisions — found during sdd-review Mode A: FR-3 referenced `<branch-name>` with no rule for how it's determined when the caller doesn't supply one |

---

## Problem Statement

Spec 003 folded worktree guidance into `using-git` as an "Advanced: Parallel Workstreams with Worktrees" section, but that section only documents bare `git worktree add`/`remove` commands. It does not check whether the caller is already in an isolated workspace (risking a nested worktree), does not prefer a harness-native worktree tool when one is available (creating phantom git state the harness can't track), applies no consistent rule for where a manually-created worktree should live, and performs no baseline verification (dependency install, test run) before work begins in the new workspace. When a user or another skill asks `using-git` to set up isolation, the result is a handful of commands with no guidance on avoiding the mistakes a fuller procedure — like the `using-git-worktrees` skill from the `obra/superpowers` plugin — already solves.

## Goals

- Add a full worktree-isolation operation to `using-git` that checks for existing isolation before creating anything
- Prefer a native, harness-provided worktree tool over manual `git worktree` commands whenever one is available
- Apply a consistent directory-selection priority when manual worktree creation is required
- Verify the target directory is gitignored before manual worktree creation
- Auto-detect and run project setup (dependency install for the project's stack) and a baseline test run after entering the new workspace, and report the result
- Handle a sandbox/permission denial on worktree creation by falling back to working in place, without blocking
- Keep this operation available only through explicit invocation — direct menu selection or explicit delegation — never auto-triggered by `sdd-execute`, `sdd-workflow`, or any other SDD skill

## Non-Goals

- Automating worktree creation as part of the standard `sdd-execute`/`sdd-workflow` flow — isolation setup stays opt-in, per the decision in spec 003
- Restoring a separate `using-git-worktrees` skill file — this capability lives inside `using-git`
- Changing the branch-naming or commit-message conventions defined in `docs/git-convention.md`
- Remote git operations (push, fetch, PR creation)
- Automating worktree *removal* or cleanup — the existing manual `git worktree remove` guidance is retained unchanged

## Users and Context

**Primary users:** Claude, when a user or another SDD skill explicitly asks for an isolated workspace before starting parallel feature work
**Secondary users:** Developers who invoke `using-git` directly to set up a worktree for simultaneous branches
**Usage context:** Any point where isolation is explicitly requested — e.g. before starting a second feature while another is in progress, or when a harness/background job requires isolation before edits
**User mental model:** "Ask `using-git` to set me up in an isolated workspace, and trust it not to nest worktrees, fight my harness's own tooling, or leave me on a broken baseline."

---

## User Stories

### Story 1: Detect existing isolation before creating anything

**As a** developer or SDD skill invoking `using-git` for isolation
**I want** the operation to first check whether the current workspace is already isolated
**So that** I never end up with a worktree nested inside another worktree

**Acceptance criteria:**

- [ ] **AC-1.1** Given a normal repository checkout (git-dir equals git-common-dir) When the worktree-isolation operation runs Then it proceeds to check for a native worktree tool before creating anything
- [ ] **AC-1.2** Given the current workspace is already a linked git worktree (git-dir differs from git-common-dir, and it is not a submodule) When the worktree-isolation operation runs Then it reports the existing workspace path and current branch (or notes detached HEAD) and does not create a new worktree
- [ ] **AC-1.3** Given the current workspace is inside a git submodule (git-dir differs from git-common-dir, but a superproject working tree is detected) When the worktree-isolation operation runs Then it treats the workspace as a normal checkout, not as pre-existing isolation

### Story 2: Prefer a native worktree tool over manual git commands

**As a** Claude session running inside a harness that provides its own isolation mechanism
**I want** the worktree-isolation operation to use that mechanism instead of raw `git worktree` commands
**So that** the harness can track and later clean up the workspace correctly

**Acceptance criteria:**

- [ ] **AC-2.1** Given Step 0 determined the workspace is not already isolated, and a native worktree tool (e.g. a tool or command named for creating/entering a worktree) is available to the current session When the worktree-isolation operation runs Then it uses the native tool and does not run `git worktree add`
- [ ] **AC-2.2** Given no native worktree tool is available to the current session When the worktree-isolation operation runs Then it proceeds to the manual git worktree fallback (Story 3)

### Story 3: Manual worktree creation follows a consistent directory rule and gitignore safety check

**As a** developer relying on the manual git fallback (no native tool available)
**I want** the operation to pick a consistent location and confirm it won't pollute git status
**So that** worktree contents never get accidentally tracked or scattered across inconsistent paths

**Acceptance criteria:**

- [ ] **AC-3.1** Given no native worktree tool is available, and the user's instructions declare a specific worktree directory When the manual fallback runs Then it uses that declared directory without asking
- [ ] **AC-3.2** Given no declared directory preference, and `.worktrees/` or `worktrees/` already exists at the project root When the manual fallback runs Then it uses the existing directory, preferring `.worktrees/` if both exist
- [ ] **AC-3.3** Given no declared preference and neither directory exists When the manual fallback runs Then it defaults to `.worktrees/` at the project root
- [ ] **AC-3.4** Given a project-local directory has been chosen When the manual fallback runs Then it verifies the directory is covered by `.gitignore` before creating the worktree, and if it is not ignored, adds it to `.gitignore` and commits that change first
- [ ] **AC-3.5** Given the target directory is confirmed ignored (or is not project-local) When the manual fallback runs Then it executes `git worktree add <path> -b <branch-name>` and changes into the new worktree
- [ ] **AC-3.6** Given no branch name was supplied by the caller When the manual fallback determines a branch name Then it suggests a default (derived from the active feature/spec context if known, otherwise a generic name), validates the chosen name against `branch_pattern` from `docs/git-convention.md`, and confirms the name with the user before creating the worktree; if the suggested or chosen name (or the target path) already exists, it offers to reuse the existing branch/worktree, choose a different name, or abort — it does not silently overwrite or fail

### Story 4: Verify a clean baseline after entering the new workspace

**As a** developer starting work in a freshly created worktree
**I want** dependencies installed and tests run automatically
**So that** I know the workspace starts clean before I begin implementation

**Acceptance criteria:**

- [ ] **AC-4.1** Given a new worktree has been entered (by either the native tool or the manual fallback) When project setup runs Then it detects the project's dependency manifest (e.g. `package.json`, `Cargo.toml`, `requirements.txt`, `pyproject.toml`, `go.mod`) and runs the corresponding install command; if no manifest is found, it skips this step without error
- [ ] **AC-4.2** Given project setup has completed When baseline verification runs Then it runs the project-appropriate test command and reports pass/fail with counts
- [ ] **AC-4.3** Given the baseline test run fails When reporting completes Then the operation reports the failures and asks the user whether to proceed or investigate, rather than silently continuing
- [ ] **AC-4.4** Given the baseline test run passes When reporting completes Then the operation reports the worktree path, test pass count, and readiness to implement

### Story 5: Sandbox or permission denial falls back gracefully

**As a** developer whose environment blocks `git worktree add` (e.g. a sandboxed session)
**I want** the operation to keep working instead of halting
**So that** a sandbox restriction doesn't block the rest of my task

**Acceptance criteria:**

- [ ] **AC-5.1** Given the manual fallback's `git worktree add` command fails with a permission/sandbox-denial error When this is detected Then the operation reports that worktree creation was blocked and that it will continue in the current directory instead
- [ ] **AC-5.2** Given the sandbox fallback has been reported When the operation continues Then it still runs project setup and baseline verification (Story 4) in the current directory

### Story 6: Isolation setup stays an explicit, opt-in operation

**As a** maintainer of the SDD workflow
**I want** the worktree-isolation operation to be reachable only by direct request
**So that** the standard `sdd-execute`/`sdd-workflow` flow is not silently changed by this feature

**Acceptance criteria:**

- [ ] **AC-6.1** Given a user invokes `using-git` without specifying an operation When the operation menu is presented Then it includes an explicit "Set up isolated workspace (worktree)" option that the user must select
- [ ] **AC-6.2** Given `sdd-execute`, `sdd-workflow`, or any other SDD skill's documented steps When they run through their normal flow Then none of them invoke the worktree-isolation operation automatically
- [ ] **AC-6.3** Given a skill wants isolation for a specific reason (e.g. a background job) When it delegates to `using-git` Then it must do so with an explicit, named request for the worktree-isolation operation — it cannot happen as a side effect of another operation

---

## Functional Requirements

### FR-1: Existing isolation detection

`using-git`'s worktree-isolation operation must check for existing isolation before creating anything.

**Must:**
- Compare the resolved git-dir and git-common-dir paths to determine whether the current workspace is already a linked worktree
- Guard against misclassifying a git submodule as a pre-existing worktree
- When already isolated, report the workspace path and branch (or detached-HEAD state) and stop without creating a new worktree

**Must not:**
- Create a new worktree when the current workspace is already isolated
- Treat a submodule checkout as pre-existing isolation

### FR-2: Native tool preference

**Must:**
- Check whether the current session has access to a native worktree-creation mechanism (a tool, command, or flag provided by the harness) before running any manual git commands
- Use the native mechanism when available and skip the manual fallback entirely

**Must not:**
- Run `git worktree add` when a native worktree tool is available in the session

### FR-3: Manual worktree creation (fallback only)

Applies only when FR-2 finds no native tool available.

**Must:**
- Resolve the target directory using this priority: (1) an explicit directory preference already declared in the user's instructions, (2) an existing `.worktrees/` or `worktrees/` directory at the project root (`.worktrees/` wins if both exist), (3) default to `.worktrees/` at the project root
- Verify the chosen project-local directory is covered by `.gitignore`; if not, add it and commit that change before creating the worktree
- Determine the branch name: use the caller-supplied name if provided; otherwise suggest a default (derived from the active feature/spec context if known, otherwise a generic name), validate it against `branch_pattern` from `docs/git-convention.md`, and confirm with the user before creating the worktree
- If the resolved branch name or target path already exists, offer to reuse the existing branch/worktree, choose a different name, or abort
- Create the worktree with `git worktree add <path> -b <branch-name>` and change into it

**Must not:**
- Create a project-local worktree directory without first verifying (and if needed, fixing) `.gitignore` coverage
- Guess a directory location that contradicts an explicit user-declared preference
- Run `git worktree add` with an unvalidated or unconfirmed branch name
- Silently overwrite or fail when the resolved branch name or target path already exists

### FR-4: Sandbox / permission fallback

**Must:**
- Detect when `git worktree add` fails due to a permission or sandbox denial
- Report the denial to the user and continue working in the current directory instead of halting
- Still perform project setup and baseline verification (FR-5) in the current directory after falling back

**Must not:**
- Halt the overall operation solely because worktree creation was blocked by a sandbox

### FR-5: Project setup and baseline verification

**Must:**
- After entering the new workspace (native tool, manual fallback, or sandbox fallback-in-place), detect the project's dependency manifest and run the matching install command
- Skip the install step without error if no recognized manifest is found
- Run the project's test command and report pass/fail counts
- If tests fail, report the failures and ask whether to proceed or investigate — do not proceed silently
- If tests pass, report the workspace path, test results, and readiness to begin implementation

**Must not:**
- Proceed past a failing baseline without asking the user

### FR-6: Explicit invocation only

**Must:**
- Expose the worktree-isolation operation as a named option in `using-git`'s direct-invocation menu
- Require any other SDD skill that wants isolation to explicitly name the worktree-isolation operation when delegating to `using-git`

**Must not:**
- Have `sdd-execute`, `sdd-workflow`, or any other existing SDD skill invoke the worktree-isolation operation as part of their documented standard flow

---

## Non-Functional Requirements

### Performance

- Detection (FR-1, FR-2) and, if applicable, worktree creation (FR-3) must complete within 10 seconds, excluding dependency install and test run time, which are project-dependent and unbounded by this spec

### Security

- The operation must not expose credentials or modify remote git configuration
- All git operations performed by this feature are local only — no push, no fetch, no remote interaction

### Reliability

- Every step that can fail (native tool invocation, `git worktree add`, `.gitignore` commit, dependency install, test run) must report the exact error output to the user rather than failing silently
- The operation must never leave the repository in a state where a project-local worktree directory is untracked by `.gitignore`

---

## Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Already in a linked worktree | Report existing path/branch; do not create a new worktree |
| In a git submodule | Treat as a normal checkout, not pre-existing isolation |
| Native worktree tool available | Use it; skip manual git commands entirely |
| No native tool, no directory preference, no existing `.worktrees/`/`worktrees/` | Default to `.worktrees/` at project root |
| Both `.worktrees/` and `worktrees/` exist | Use `.worktrees/` |
| Chosen project-local directory not in `.gitignore` | Add it, commit, then proceed |
| Suggested/chosen branch name violates `branch_pattern`, or the branch/target path already exists | Re-prompt on pattern violation; on collision, offer to reuse existing / choose different name / abort — never overwrite or fail silently |
| `git worktree add` fails with permission/sandbox error | Report the denial; continue in the current directory; still run setup and baseline verification |
| No recognized dependency manifest in the workspace | Skip install step without error |
| Baseline test run fails | Report failures; ask whether to proceed or investigate |
| Baseline test run passes | Report workspace path, test results, readiness |

---

## Open Questions

None.

---

## Out of Scope (Future Considerations)

- Automating worktree creation as part of `sdd-execute`'s standard branch-creation step
- Automated worktree removal/cleanup as part of `finishing-a-development-branch`
- Restoring `using-git-worktrees` as a standalone skill file
- Support for non-git isolation mechanisms outside the "native tool or git fallback" model
