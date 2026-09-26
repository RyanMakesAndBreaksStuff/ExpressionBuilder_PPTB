# Implementation Plan: Worktree Isolation Operation in using-git

**Spec:** docs/specs/025-using-git-worktree-isolation/spec.md
**Created:** 2026-07-11

---

## Goal

`using-git` gains a fifth operation — Operation E, "Isolated Workspace Setup (Worktree)" — that detects existing isolation, prefers a native harness worktree tool, falls back to a directory-priority-aware manual `git worktree` flow with gitignore safety and sandbox handling, and verifies a clean baseline (install + tests) before reporting the workspace ready — reachable only by explicit menu selection or explicit delegation.

## Architecture

This is a documentation-only change: `using-git` is a Markdown skill read by Claude at runtime, so "implementation" means writing the exact procedure text Claude will follow. The existing "Advanced: Parallel Workstreams with Worktrees" section in `skills/using-git/reference.md` (added by spec 003) is replaced by a fuller "Operation E — Isolated Workspace Setup (Worktree)" section that mirrors the five-step structure of the source `using-git-worktrees` skill (detect → prefer native tool → manual fallback → project setup → baseline verification), rewritten to fit `using-git`'s existing Operation A–D pattern (FR-1 through FR-5). `skills/using-git/SKILL.md` gets a new menu entry and Quick Reference row so the operation is discoverable and only reachable by explicit request, never auto-triggered (FR-6).

## Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Skill content | Markdown (SKILL.md + reference.md) | Matches every existing SDD skill; no new dependency, per Simplicity Gate |
| Verification | Manual read-through against `quickstart.md` checklists | Same pattern used by spec 003 for this same skill (Markdown-only project — no compiled/runtime code to unit test) |

## File Structure

- `skills/using-git/reference.md` — gains Operation E (detection, native-tool preference, manual fallback, project setup, baseline verification, worktree removal), an updated Operation Menu prompt, and new Error Reference rows; loses the old "Advanced: Parallel Workstreams with Worktrees" section (superseded)
- `skills/using-git/SKILL.md` — gains a Quick Reference row for Operation E, a "When to Use" bullet, a Constraints bullet stating explicit-invocation-only, and an updated frontmatter `description` for discoverability
- `docs/specs/025-using-git-worktree-isolation/quickstart.md` — scenario checklist (already written; see Phase 0)

## Complexity Tracking

(Empty — all gates passed: single skill, two files touched, no new dependency, no abstraction introduced beyond the existing Operation A–D pattern already established by spec 003.)

---

## Phase 0: Contracts and Tests First

**Principle:** Define the acceptance scenarios before editing any skill file.

### 0.1 Write Scenario Checklist

- [x] `docs/specs/025-using-git-worktree-isolation/quickstart.md` written with Scenarios S1–S7, covering every AC in spec.md (already completed as part of this planning session — see file)
- [ ] Confirm each scenario currently **fails**: `grep -c "GIT_COMMON\|Operation E\|isolated workspace" skills/using-git/reference.md` — expect `0` (none of this text exists yet)
- [ ] Commit: `docs(025-using-git-worktree-isolation): add quickstart scenarios for worktree isolation operation`

---

## Phase 1: Existing Isolation Detection and Native Tool Preference

**Implements:** FR-1, FR-2 | **Satisfies:** AC-1.1, AC-1.2, AC-1.3, AC-2.1, AC-2.2
**Files:** `skills/using-git/reference.md`

### 1.1 Verify Fails

- [ ] Run: `grep -n "Detect Existing Isolation\|Prefer a Native Worktree Tool" skills/using-git/reference.md` — expect: no output (section does not exist yet)

### 1.2 Insert Operation E (Steps E.1–E.2)

In `skills/using-git/reference.md`, find the line:

```
## Operation D — Merge Commit Message
```

Locate the end of Operation D (immediately before the `## Error Reference` heading) and insert the following new section between the end of Operation D's content and `## Error Reference`:

```markdown
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
```

- [ ] Confirm insertion placed the new section between Operation D and Error Reference (read the file and check heading order: `## Operation D`, `## Operation E`, `## Error Reference`)

### 1.3 Verify Passes

- [ ] Run: `grep -n "Detect Existing Isolation\|show-superproject-working-tree\|Prefer a Native Worktree Tool\|EnterWorktree" skills/using-git/reference.md` — expect: 4+ matching lines
- [ ] Re-check Scenario S1 and S2 items in `quickstart.md` against the inserted text — all items pass

### 1.4 Commit

- [ ] Commit: `docs(025-using-git-worktree-isolation): add worktree isolation detection and native-tool preference (Operation E.1-E.2)`

---

## Phase 2: Manual Fallback and Sandbox Handling (extended v1.1.0)

**Implements:** FR-3, FR-4 | **Satisfies:** AC-3.1, AC-3.2, AC-3.3, AC-3.4, AC-3.5, AC-3.6, AC-5.1, AC-5.2
**Files:** `skills/using-git/reference.md`

> **v1.1.0 extension:** AC-3.6 (branch-naming rule) was added after sdd-review Mode A found FR-3 referenced `<branch-name>` with no rule for determining it. §2.2 below now includes branch-name resolution before the create command.

### 2.1 Verify Fails

- [ ] Run: `grep -n "Manual Git Worktree Fallback\|Sandbox fallback\|Resolve the branch name" skills/using-git/reference.md` — expect: no output

### 2.2 Insert Operation E (Step E.3)

Immediately after the E.2 content added in Phase 1 (i.e., directly before the current `## Error Reference` heading), insert:

```markdown
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

**Safety verification** (project-local directories only) — must run before creating the worktree:

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

If **not** ignored: add the directory to `.gitignore` and commit that change before proceeding.

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
path="$LOCATION/$BRANCH_NAME"
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**Sandbox fallback:** if `git worktree add` fails with a permission error (sandbox denial), report that the sandbox blocked worktree creation and that work will continue in the current directory instead. Then proceed to E.4 in place — project setup and baseline verification still run.
```

- [ ] Confirm the inserted content sits between E.2 and `## Error Reference`

### 2.3 Verify Passes

- [ ] Run: `grep -n "Manual Git Worktree Fallback\|check-ignore\|Sandbox fallback\|Resolve the branch name\|branch_pattern" skills/using-git/reference.md` — expect: 5+ matching lines
- [ ] Re-check Scenario S3 (including the two v1.1.0 items) and S4 items in `quickstart.md` against the inserted text — all items pass

### 2.4 Commit

- [ ] Commit: `docs(025-using-git-worktree-isolation): add manual worktree fallback, branch-name resolution, and sandbox handling (Operation E.3)`

---

## Phase 3: Project Setup and Baseline Verification

**Implements:** FR-5 | **Satisfies:** AC-4.1, AC-4.2, AC-4.3, AC-4.4
**Files:** `skills/using-git/reference.md`

### 3.1 Verify Fails

- [ ] Run: `grep -n "E.4 Project Setup\|E.5 Verify Clean Baseline" skills/using-git/reference.md` — expect: no output

### 3.2 Insert Operation E (Steps E.4–E.5) and Worktree Removal

Immediately after the E.3 content added in Phase 2 (i.e., directly before the current `## Error Reference` heading), insert:

```markdown
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
  ```
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
```

- [ ] Confirm the inserted content sits between E.3 and `## Error Reference`

### 3.3 Remove the Superseded Advanced Worktrees Section

Find and delete the entire pre-existing section (originally added by spec 003), starting at:

```
## Advanced: Parallel Workstreams with Worktrees
```

and ending at the last line of the file (its "Remove a worktree" code block) — its content is now superseded by Operation E, and worktree removal now lives under "Removing a Worktree" inside Operation E (inserted in step 3.2).

- [ ] Confirm the heading `## Advanced: Parallel Workstreams with Worktrees` no longer appears anywhere in `skills/using-git/reference.md`: `grep -c "Advanced: Parallel Workstreams" skills/using-git/reference.md` — expect: `0`

### 3.4 Verify Passes

- [ ] Run: `grep -n "E.4 Project Setup\|E.5 Verify Clean Baseline\|Removing a Worktree" skills/using-git/reference.md` — expect: 3 matching lines
- [ ] Re-check Scenario S5 items in `quickstart.md` — all items pass
- [ ] Re-check Scenario S7's "no longer contains a separate...Advanced...section" item — passes

### 3.5 Commit

- [ ] Commit: `docs(025-using-git-worktree-isolation): add project setup, baseline verification, and remove superseded worktrees section`

---

## Phase 4: Menu Integration, Error Reference, and Explicit-Invocation-Only Guarantee

**Implements:** FR-6 | **Satisfies:** AC-6.1, AC-6.2, AC-6.3
**Files:** `skills/using-git/reference.md`, `skills/using-git/SKILL.md`

### 4.1 Verify Fails

- [ ] Run: `grep -n "Set up isolated workspace" skills/using-git/SKILL.md skills/using-git/reference.md` — expect: no output

### 4.2 Update Operation Menu Prompt in reference.md

Find in `skills/using-git/reference.md`:

```markdown
> "Which git operation?
> 1. Create branch
> 2. Ad-hoc commit
> 3. Merge commit message
> 4. Show convention"
```

Replace with:

```markdown
> "Which git operation?
> 1. Create branch
> 2. Ad-hoc commit
> 3. Merge commit message
> 4. Show convention
> 5. Set up isolated workspace (worktree)"
```

### 4.3 Add Operation E Rows to Error Reference in reference.md

Find the last row of the `## Error Reference` table in `skills/using-git/reference.md`:

```markdown
| Git not initialised | Detect; offer `git init && git add -A && git commit -m "chore: initial commit"` |
```

Insert the following rows immediately after it (still inside the same table):

```markdown
| Already in a linked worktree (Operation E) | Report existing path/branch; do not create a new worktree |
| In a git submodule (Operation E) | Treat as a normal checkout, not pre-existing isolation |
| No native worktree tool found (Operation E) | Fall back to manual `git worktree add` (E.3) |
| Worktree directory not gitignored (Operation E) | Add to `.gitignore`, commit, then proceed |
| `git worktree add` fails with permission/sandbox error (Operation E) | Report the denial; continue in the current directory; still run E.4/E.5 |
| Baseline test run fails (Operation E) | Report failures; ask whether to proceed or investigate |
```

### 4.4 Update SKILL.md

In `skills/using-git/SKILL.md`, make four edits:

**a) Frontmatter description** — find:

```yaml
description: Use when any git operation is needed in an SDD project — branch creation, commits, merge commit validation, or showing the convention
```

Replace with:

```yaml
description: Use when any git operation is needed in an SDD project — branch creation, commits, merge commit validation, showing the convention, or setting up an isolated git worktree for parallel work
```

**b) "When to Use" bullets** — find:

```markdown
- Showing or verifying the git convention
- NOT for general shell git commands outside an SDD project context
```

Replace with:

```markdown
- Showing or verifying the git convention
- Setting up an isolated workspace (worktree) before parallel feature work — by explicit request only, never automatic
- NOT for general shell git commands outside an SDD project context
```

**c) Quick Reference table** — find:

```markdown
| D — Merge Commit Message | `sdd-superpowers:finishing-a-development-branch`, user | 3 |
| Show convention | user | 4 |
```

Replace with:

```markdown
| D — Merge Commit Message | `sdd-superpowers:finishing-a-development-branch`, user | 3 |
| Show convention | user | 4 |
| E — Isolated Workspace Setup (Worktree) | user, or explicit named delegation only | 5 |
```

**d) Constraints** — find:

```markdown
- Does NOT force-push to main/master
```

Replace with:

```markdown
- Does NOT force-push to main/master
- Does NOT invoke Operation E (worktree isolation) automatically — only via explicit menu selection or an explicit, named delegation request
```

### 4.5 Verify Passes

- [ ] Run: `grep -n "Set up isolated workspace" skills/using-git/SKILL.md skills/using-git/reference.md` — expect: 2 matching lines (one per file)
- [ ] Run: `grep -n "E — Isolated Workspace Setup" skills/using-git/SKILL.md` — expect: 1 matching line
- [ ] Run: `grep -rn "Isolated Workspace Setup\|Operation E" skills/sdd-execute/SKILL.md skills/sdd-workflow/SKILL.md skills/finishing-a-development-branch/SKILL.md` — expect: no output (confirms FR-6's must-not: no other skill's standard flow references or auto-invokes Operation E)
- [ ] Re-check Scenario S6 items in `quickstart.md` — all items pass

### 4.6 Commit

- [ ] Commit: `docs(025-using-git-worktree-isolation): wire Operation E into using-git menu, error reference, and constraints`

---

## Phase N: Integration Verification

**Implements:** All FRs | **Satisfies:** All ACs

- [ ] Run: `grep -c "Advanced: Parallel Workstreams" skills/using-git/reference.md` — expect: `0`
- [ ] Run: `grep -c "^### E\." skills/using-git/reference.md` — expect: `5` (E.1 through E.5)
- [ ] Read `skills/using-git/reference.md` in full and manually confirm every checklist item in Scenarios S1–S7 of `docs/specs/025-using-git-worktree-isolation/quickstart.md` passes
- [ ] Read `skills/using-git/SKILL.md` in full and confirm the Quick Reference table, When to Use, Constraints, and frontmatter description edits from Phase 4 are all present
- [ ] Run the repository's existing hook test suite as a regression sanity check (this change touches no hook scripts, so this confirms no unrelated breakage): `bash tests/hooks/run_all.sh` — expect: all existing tests still pass
- [ ] Commit: `docs(025-using-git-worktree-isolation): complete worktree isolation operation in using-git`

---

## Quickstart Validation

1. Open `skills/using-git/SKILL.md` — confirm the Quick Reference table lists Operation E with menu option 5, and Constraints states explicit-invocation-only.
2. Open `skills/using-git/reference.md` — confirm the Operation Menu prompt lists option 5, and a complete "Operation E — Isolated Workspace Setup (Worktree)" section exists with subsections E.1–E.5 plus "Removing a Worktree", positioned between Operation D and Error Reference.
3. Confirm the old "Advanced: Parallel Workstreams with Worktrees" heading is gone: `grep -c "Advanced: Parallel Workstreams" skills/using-git/reference.md` returns `0`.
4. Confirm no other skill's standard flow auto-invokes Operation E: `grep -rln "Isolated Workspace Setup" skills/` returns only `skills/using-git/SKILL.md` and `skills/using-git/reference.md`.
5. Walk through Scenario S7 in `quickstart.md` end-to-end by reading the finished files — every checklist item across S1–S7 should be checkable.

---

## Plan Changelog

| Version | Phase | Change |
|---------|-------|--------|
| 1.1.0 | Phase 2 | Extended §2.2 with branch-name resolution (default suggestion, `branch_pattern` validation, collision handling) to satisfy new AC-3.6 |
