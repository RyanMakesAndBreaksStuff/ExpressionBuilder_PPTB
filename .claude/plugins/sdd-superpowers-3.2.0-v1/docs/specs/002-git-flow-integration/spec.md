# Feature 002: Git Flow Integration

**Status:** Approved
**Created:** 2026-04-17
**Branch:** `002-git-flow-integration`

---

## Problem Statement

The current SDD workflow has no enforced git discipline. `using-git-worktrees` is too complex for everyday use, branches may not exist when work begins, and specs or code can be committed in any order. This creates traceability gaps: there is no guarantee that a branch maps to a single feature, that documentation precedes code, or that commit messages follow a consistent convention. Teams lose the audit trail that makes SDD valuable.

## Goals

- Enforce a simple, repeatable git discipline: branch → doc-first commit → code
- Give every project a human-readable `docs/git-convention.md` that all SDD skills reference
- Make branch name suggestions contextual (spec title, external ticket IDs) while allowing custom input
- Establish the convention during `sdd-init` so it is present before any feature work begins

## Non-Goals

- Pull request creation or merge strategies
- CI/CD pipeline integration
- Git worktree management (that remains in `using-git-worktrees` for users who need it)
- Enforcing commit signing or GPG

## Users and Context

**Primary users:** Developers using SDD skills in a new or existing project
**Usage context:** At project initialisation (`sdd-init`) and at the transition from documentation to code (`sdd-tasks` → `sdd-execute`)
**User mental model:** Users expect to name their branch after a ticket or feature and have the tooling handle the boilerplate; they do not want to remember a convention — they want it enforced for them

---

## User Stories

### Story 1: Convention established at project init
**As a** developer initialising a new SDD project
**I want to** answer a few questions about my team's git conventions during `sdd-init`
**So that** every subsequent feature branch and commit follows a consistent, documented standard

**Acceptance criteria:**
- [ ] `sdd-init` asks the user for preferred branch naming pattern and commit message format
- [ ] Answers are written to `docs/git-convention.md` before the initial commit
- [ ] `docs/git-convention.md` is committed as part of the `sdd-init` initial commit

### Story 2: Branch created with suggested names after docs complete
**As a** developer who has finished spec, plan, and tasks
**I want** the `sdd-tasks` skill to propose branch name options and create the branch
**So that** I do not have to remember the naming convention or run git commands manually

**Acceptance criteria:**
- [ ] At `sdd-tasks` completion, the skill generates at least 3 branch name suggestions
- [ ] Suggestions include: spec-slug-based, ticket-ID-based (if provided), and a user-typed custom option
- [ ] User selects or types a name; skill creates the branch
- [ ] First commit on the new branch contains all docs (spec, plan, tasks, quickstart, any contracts) and nothing else
- [ ] Commit message follows the convention in `docs/git-convention.md`

### Story 3: Skill enforces convention on every git action
**As a** developer running any SDD skill that touches git
**I want** the skill to read `docs/git-convention.md` and validate branch names and commit messages against it
**So that** I cannot accidentally drift from the agreed convention

**Acceptance criteria:**
- [ ] Skills that perform git operations load `docs/git-convention.md` before acting
- [ ] If a branch name or commit message would violate the convention, the skill warns and prompts for correction
- [ ] If `docs/git-convention.md` is missing, the skill halts and instructs the user to run `sdd-init` or create the file manually

### Story 4: External ticket ID in branch name
**As a** developer working with JIRA or another issue tracker
**I want** to optionally provide a ticket ID when a branch is being named
**So that** my branch name links back to the external tracker (e.g. `feat/PROJ-123-git-flow-integration`)

**Acceptance criteria:**
- [ ] At branch-naming time, skill prompts: "Do you have an external ticket ID? (optional)"
- [ ] If provided, one suggestion incorporates it in the format defined by `docs/git-convention.md`
- [ ] If not provided, ticket-ID-based suggestion is omitted; other suggestions still shown

### Story 5: Clean per-task commit history during execution
**As a** developer executing tasks with `sdd-execute`
**I want** each completed task to produce exactly one commit automatically
**So that** the branch history is clean, traceable, and reviewable task by task

**Acceptance criteria:**
- [ ] After each task is marked complete, `sdd-execute` proposes a commit message following `docs/git-convention.md`
- [ ] The commit is created only after user confirmation
- [ ] The commit contains only files modified since the previous commit
- [ ] If merge conflicts exist at commit time, the skill halts and reports the conflicting files before retrying

### Story 6: Merge commit validated against convention
**As a** developer completing a feature with `finishing-a-development-branch`
**I want** the merge commit message to be validated against `docs/git-convention.md` before it lands
**So that** the main branch history stays consistent with the project's commit convention

**Acceptance criteria:**
- [ ] `finishing-a-development-branch` reads `docs/git-convention.md` before preparing the merge commit
- [ ] A compliant merge commit message is suggested to the user
- [ ] User must confirm or edit the message before the merge is finalised
- [ ] Merge is not blocked based on the source branch name

---

## Functional Requirements

### FR-1: Convention file created during `sdd-init`
`sdd-init` must ask the user the following questions and persist the answers to `docs/git-convention.md`:

**Must:**
- Ask preferred branch naming pattern (examples: `NNN-slug`, `feat/NNN-slug`, `feat/TICKET-slug`)
- Ask preferred ticket ID prefix format if applicable (e.g. `PROJ-`, `GH-`, none)
- Ask commit message format (must default to Conventional Commits: `<type>(<scope>): <message>`)
- Ask allowed commit types (default: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`)
- Write all answers to `docs/git-convention.md` before the initial commit

**Must not:**
- Proceed past `sdd-init` without `docs/git-convention.md` existing

### FR-2: Branch name suggestion at `sdd-tasks` completion
At the end of `sdd-tasks`, before handing off to `sdd-execute`, the skill must:

**Must:**
- Read `docs/git-convention.md` to determine naming pattern
- Generate suggestions:
  - Suggestion A: derived from spec NNN + feature slug (e.g. `002-git-flow-integration`)
  - Suggestion B: pattern from convention with ticket ID (only if ticket ID provided)
  - Suggestion C: free-form custom input by the user
- Present suggestions and ask user to select or type
- Create the git branch using the chosen name

**Must not:**
- Proceed to `sdd-execute` without a branch having been created
- Create a branch that violates the naming pattern in `docs/git-convention.md` without an explicit user override

### FR-3: Doc-first commit
After branch creation, `sdd-tasks` must create the first commit:

**Must:**
- Stage all files under `docs/specs/NNN-<feature-slug>/` (spec, plan, tasks, quickstart, contracts if present)
- Format the commit message using Conventional Commits per `docs/git-convention.md` (e.g. `docs(002-git-flow-integration): add spec, plan, and tasks`)
- Confirm the commit message with the user before committing
- Complete the commit before invoking `sdd-execute`

**Must not:**
- Include any implementation files (source code, tests) in the first commit
- Skip the commit confirmation step

### FR-4: Convention enforcement in all git-touching skills
Every SDD skill that performs a git operation must:

**Must:**
- Load `docs/git-convention.md` at the start of any git action
- Validate proposed branch names and commit messages against the convention
- Warn the user and prompt for correction if a violation is detected
- Halt with a clear error if `docs/git-convention.md` is missing on a new project
- On an existing project where `docs/git-convention.md` is missing: offer a one-time "create convention" dialogue (same questions as FR-1) before proceeding

**Must not:**
- Silently bypass the convention
- Allow git operations to proceed after a detected violation without user acknowledgement

**Affected skills:** `sdd-specify`, `sdd-plan`, `sdd-tasks`, `sdd-execute`, `finishing-a-development-branch`

### FR-5: `docs/git-convention.md` format
The convention file must use YAML frontmatter + Markdown body so it is both machine-parseable by skills and human-readable by developers:

**Must:**
- Use YAML frontmatter (delimited by `---`) as the machine-readable section
- Contain a `branch_pattern` field as a POSIX-compatible regex string (e.g. `"^(feat|fix|docs|chore)/[0-9]+-[a-z0-9-]+$"`); skills validate branch names by regex match
- Contain a `ticket_prefix` field (empty string `""` if not applicable)
- Contain a `commit_format` field with the full Conventional Commits format string (e.g. `"<type>(<scope>): <message>"`)
- Contain an `allowed_types` list (e.g. `[feat, fix, docs, chore, refactor, test]`)
- Contain a Markdown `## Examples` section after the frontmatter with at least 2 branch name examples and 2 commit message examples

**Must not:**
- Use any binary format
- Mix structured data into the Markdown body (all machine-read fields must be in YAML frontmatter)

### FR-6: Per-task commits during `sdd-execute`
After each individual task completes (with no uncommitted conflicts), `sdd-execute` must create one commit:

**Must:**
- Verify no merge conflicts exist before committing (check `git status` for conflict markers)
- Stage all files reported as modified or added by `git status` at the moment the task is marked complete (trusting that one task is active at a time)
- Format the commit message per `docs/git-convention.md` (e.g. `feat(002-git-flow-integration): implement FR-2 branch name suggestions`)
- Confirm the commit message with the user before committing
- One task = one commit; never bundle multiple tasks into a single commit

**Must not:**
- Commit if there are unresolved merge conflicts
- Stage files that were already committed before this task began

### FR-7: Merge commit message validation in `finishing-a-development-branch`
When `finishing-a-development-branch` performs or prepares a merge:

**Must:**
- Load `docs/git-convention.md` and validate the merge commit message against the `commit_format` and `allowed_types` fields
- Suggest a compliant merge commit message (e.g. `feat(scope): merge 002-git-flow-integration`)
- Confirm the message with the user before finalising

**Must not:**
- Validate or reject the source branch name at merge time
- Block the merge based on branch naming — only the merge commit message is enforced

---

## Non-Functional Requirements

### Performance
- Branch creation and first commit must complete within 10 seconds on a standard developer machine

### Security
- Skills must not expose credentials or modify remote git configuration
- All git operations are local only (no push, no remote interaction)

### Reliability
- If git is not initialised in the project, the skill must detect this and offer to run `git init` before proceeding
- If the branch already exists, the skill must warn the user and offer: switch to it, rename the new branch, or abort

---

## Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| `docs/git-convention.md` missing on a new project | Skill halts, prints instructions to run `sdd-init` |
| `docs/git-convention.md` missing on an existing project (skipped `sdd-init`) | Skill offers one-time "create convention" dialogue with the same questions as FR-1; writes the file before continuing |
| Chosen branch name already exists in the repo | Skill warns, offers: switch to existing branch, choose a different name, or abort |
| Git not initialised in the project directory | Skill detects, offers to run `git init && git add -A && git commit -m "chore: initial commit"` |
| User provides a ticket ID that doesn't match the configured `ticket_prefix` | Skill warns about the mismatch, shows expected format, asks to confirm or correct |
| First commit fails (e.g. nothing staged) | Skill reports the error with the exact git output and prompts the user to resolve before continuing |
| `sdd-execute` is invoked without a branch having been created | `sdd-execute` checks for a non-main/non-master branch; if on default branch, halts and routes user back to `sdd-tasks` |
| Merge conflicts exist when `sdd-execute` tries to commit a completed task | Skill halts commit, reports conflicting files, and waits for user to resolve before retrying |
| Merge commit message violates convention in `finishing-a-development-branch` | Skill shows the violation, suggests a compliant alternative, and re-prompts before proceeding |

---

## Open Questions

None.

---

## Out of Scope (Future Considerations)

- Push to remote and PR creation (covered by `finishing-a-development-branch` evolution)
- Multi-branch or trunk-based development strategies
- Changelog generation from conventional commits
- Integration with JIRA/GitHub Issues APIs to auto-fetch ticket titles
