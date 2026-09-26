# Using Git: Full Operations Reference

> Complete convention loading, all five operations, error table, and worktrees guide. See [SKILL.md](SKILL.md) for the summary.

## Step 0: Load Steering Context

Scan `.claude/memory/steering/` for `.md` files whose `loaded-by` frontmatter includes `using-git`. Read each matched file and incorporate its content as context before producing any user-facing output. Loading is silent — no announcement to the user.

If `.claude/memory/steering/` does not exist, or no files contain `using-git` in `loaded-by`, proceed without change.

Rescan on every invocation — custom files added after init are discovered automatically.

## Convention Loading

**Applies before every operation.**

Read `docs/git-convention.md` from the project root. Parse YAML frontmatter:
- `branch_pattern` — POSIX regex for valid branch names
- `ticket_prefix` — expected ticket ID prefix (empty string if none)
- `commit_format` — commit message format string
- `allowed_types` — list of valid commit type prefixes

**If `docs/git-convention.md` is missing:**
- No `CLAUDE.md` in project root (new project): halt — "Run `sdd-superpowers:sdd-init` first to establish a git convention."
- `CLAUDE.md` exists (existing project): offer one-time creation dialogue:
  > "I need to set up your git convention. I'll ask 4 quick questions."
  Ask the same 4 questions as `sdd-superpowers:sdd-init` Step 5.4. Write `docs/git-convention.md`. Continue.
- If user declines the dialogue: halt — do not perform any git operation.

## Direct Invocation — Operation Menu

When invoked without a specified operation, present:

> "Which git operation?
> 1. Create branch
> 2. Ad-hoc commit
> 3. Merge commit message
> 4. Show convention
> 5. Set up isolated workspace (worktree)"

Wait for selection, then run the corresponding operation.

**Option (4) Show convention:** Read `docs/git-convention.md` and display:
- Branch pattern: `<branch_pattern>` regex
- Commit format: `<commit_format>`
- Allowed types: `<allowed_types list>`
- Examples section from the file

## Operation A — Branch Creation

**Invoked by:** `sdd-superpowers:sdd-execute`, or directly via menu option (1)

**Inputs:** spec folder path (`docs/specs/NNN-slug/`), optional ticket ID

**Steps:**

1. Load convention.

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

**Invoked by:** `sdd-superpowers:sdd-execute` immediately after Operation A

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

**Invoked by:** `sdd-superpowers:sdd-execute` Step 3e (delegation only — NOT available in the direct menu)

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

**Output:** New commit SHA returned to caller (`sdd-superpowers:sdd-execute`)

## Operation D — Merge Commit Message

**Invoked by:** `sdd-superpowers:finishing-a-development-branch` Step 2.5, or directly via menu option (3)

**Inputs:** current branch name

**Steps:**

1. Derive feature scope from branch name (e.g. `002-git-flow-integration` → scope `002-git-flow-integration`).

2. Suggest compliant message:
   > "Proposed merge commit: `feat(<scope>): merge <feature-description>`
   > Confirm this message, or type an alternative:"

3. Validate:
   - Type must be in `allowed_types`
   - Format must match `commit_format`

   If invalid, show violation + corrected suggestion + re-prompt until valid.

4. Do NOT validate or reject the source branch name — only the commit message is enforced.

**Output:** Confirmed message returned to caller

## Operation E — Isolated Workspace Setup (Worktree)

**Invoked by:** directly via menu option (5), or another SDD skill via an explicit, named delegation request for "Isolated Workspace Setup" — never invoked automatically as part of another skill's standard flow

**Inputs:** none required; an optional branch name if the caller already knows it

### E.1 Detect Existing Isolation

Before creating anything, check whether the current workspace is already isolated:

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**Submodule guard:** `GIT_DIR != GIT_COMMON` is also true inside git submodules. Before concluding "already in a worktree," verify this is not a submodule:

```bash
git rev-parse --show-superproject-working-tree 2>/dev/null
```

If this returns a path, treat the workspace as a normal checkout — not pre-existing isolation.

- **If `GIT_DIR != GIT_COMMON` (and not a submodule):** already isolated.
  - On a branch: report "Already in isolated workspace at `<path>` on branch `<name>`." Stop — do not create a new worktree.
  - Detached HEAD: report "Already in isolated workspace at `<path>` (detached HEAD). Branch creation needed at finish time." Stop.
- **If `GIT_DIR == GIT_COMMON` (or in a submodule):** normal checkout. Continue to E.2.

### E.2 Prefer a Native Worktree Tool

Check whether the current session already has a tool for creating or entering an isolated workspace — it may be named `EnterWorktree`, `WorktreeCreate`, a `/worktree` command, or a `--worktree` flag.

- **If available:** use it. Skip E.3 entirely — running `git worktree add` when a native tool exists creates phantom state the harness can't track or clean up.
- **If not available:** continue to E.3.

### E.3 Manual Git Worktree Fallback

**Only reached when E.2 found no native tool.**

**Directory selection**, in priority order:

1. A worktree directory preference already declared in the user's instructions — use it without asking.
2. An existing project-local directory:
   ```bash
   ls -d .worktrees 2>/dev/null     # preferred (hidden)
   ls -d worktrees 2>/dev/null      # alternative
   ```
   If found, use it. If both exist, `.worktrees` wins.
3. If neither exists, default to `.worktrees/` at the project root.

The directory chosen by the priority above is referred to as `<dir>` below.

**Safety verification** (project-local directories only) — must run before creating the worktree:

```bash
git check-ignore -q "<dir>" 2>/dev/null
```

If **not** ignored: add `<dir>` to `.gitignore` and commit that change before proceeding.

**Resolve the branch name:**

- If the caller supplied a branch name, use it.
- Otherwise, suggest a default: derive it from the active feature/spec context if known (e.g. the current `docs/specs/NNN-slug/` in progress), or fall back to a generic name (e.g. `worktree-<short-timestamp>`) if no feature context is available.
- Validate the resolved name against `branch_pattern` from `docs/git-convention.md` (same rule `using-git` Operation A already applies). If it doesn't match, warn and re-prompt.
- Confirm the name with the user before creating anything.
- If the resolved branch name or target path already exists:
  > "Branch `<name>` (or path `<path>`) already exists. Options:
  > 1. Reuse the existing branch/worktree
  > 2. Choose a different name
  > 3. Abort"
  Wait for selection. Never silently overwrite or fail.

**Create the worktree:**

```bash
path="<dir>/$BRANCH_NAME"
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**Sandbox fallback:** if `git worktree add` fails with a permission error (sandbox denial), report that the sandbox blocked worktree creation and that work will continue in the current directory instead. Then proceed to E.4 in place — project setup and baseline verification still run.

### E.4 Project Setup

Auto-detect and run the appropriate install command:

```bash
if [ -f package.json ]; then npm install; fi
if [ -f Cargo.toml ]; then cargo build; fi
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi
if [ -f go.mod ]; then go mod download; fi
```

No recognized manifest → skip without error.

### E.5 Verify Clean Baseline

Run the project's test command (e.g. `npm test`, `cargo test`, `pytest`, `go test ./...`, or this repo's `tests/hooks/run_all.sh`).

- **Tests fail:** report failures and ask whether to proceed or investigate. Do not continue silently.
- **Tests pass:** report:
  ```text
  Worktree ready at <full-path>
  Tests passing (<N> tests, 0 failures)
  Ready to implement <feature-name>
  ```

**Output:** workspace path, isolation method used (native tool / manual worktree / sandbox fallback in place), and baseline test result — reported to the caller or user.

### Removing a Worktree

```bash
# From the main repo root
git worktree remove .worktrees/my-feature

# Delete the branch if no longer needed
git branch -d feat/my-feature
```

## Error Reference

| Scenario | Behavior |
|----------|----------|
| `docs/git-convention.md` missing, new project | Halt: "Run `sdd-superpowers:sdd-init` first" |
| `docs/git-convention.md` missing, existing project | Offer 4-question creation dialogue |
| User declines convention creation | Halt without git operation |
| Branch name violates `branch_pattern` | Warn + "Proceed anyway? (yes/no)" — require explicit yes |
| Branch already exists | Offer: switch / choose different / abort |
| On `main`/`master` at branch creation | Refuse; instruct to check out a base branch |
| Merge conflicts at per-task commit | Halt; list conflicting files; wait for resolution |
| Commit message violates convention | Show violation + corrected suggestion + re-prompt |
| Commit fails (nothing staged, git error) | Report exact git output; halt until resolved |
| Git not initialised | Detect; offer `git init && git add -A && git commit -m "chore: initial commit"` |
| Already in a linked worktree (Operation E) | Report existing path/branch; do not create a new worktree |
| In a git submodule (Operation E) | Treat as a normal checkout, not pre-existing isolation |
| No native worktree tool found (Operation E) | Fall back to manual `git worktree add` (E.3) |
| Worktree directory not gitignored (Operation E) | Add to `.gitignore`, commit, then proceed |
| `git worktree add` fails with permission/sandbox error (Operation E) | Report the denial; continue in the current directory; still run E.4/E.5 |
| Baseline test run fails (Operation E) | Report failures; ask whether to proceed or investigate |
