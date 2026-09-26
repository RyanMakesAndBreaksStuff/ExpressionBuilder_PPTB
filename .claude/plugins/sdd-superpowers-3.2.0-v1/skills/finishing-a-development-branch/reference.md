# Finishing a Development Branch: Full Process Reference

> Complete step-by-step procedure for each integration option. See [SKILL.md](SKILL.md) for the summary.

## Step 1: Verify Tests

**Before presenting options, verify tests pass:**

```bash
npm test / cargo test / pytest / go test ./...
```

**If tests fail:**
```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed with merge/PR until tests pass.
```

Stop. Don't proceed to Step 2.

**If tests pass:** Continue to Step 2.

## Step 2: Determine Base Branch

```bash
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

Or ask: "This branch split from main - is that correct?"

## Step 2.5: Prepare Merge Commit Message

Invoke `sdd-superpowers:using-git` — **Merge Commit Message**

Pass to `sdd-superpowers:using-git`:
- Current branch name: `git branch --show-current`

`sdd-superpowers:using-git` will handle: convention loading, scope derivation, message suggestion, validation, re-prompting on violation.

Store the confirmed message returned by `sdd-superpowers:using-git` as `<merge-commit-message>`.

## Step 3: Present Options

Present exactly these 3 options:

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)

Which option?
```

**Don't add explanation** - keep options concise. Discarding the work
happens only in response to your human partner explicitly asking for it
(see "If your human partner asks to discard the work" below) — never offer
it as a fourth option.

## Step 4: Execute Choice

### Option 1: Merge Locally

```bash
git checkout <base-branch>
git pull
git merge --no-ff <feature-branch> -m "<merge-commit-message>"
<test command>
git branch -d <feature-branch>
```

Then: Cleanup worktree (Step 5)

### Option 2: Push and Create PR

```bash
git push -u origin <feature-branch>
```

Create the pull/merge request against `<base-branch>` with the forge's
tooling — its CLI if one is available (e.g. `gh pr create`), or the creation
URL most forges print when you push — following the repo's PR template and
conventions if present, and report the URL to your human partner.

Keep the worktree — your human partner iterates on PR feedback there.

### Option 3: Keep As-Is

Report: "Keeping branch <name>. Worktree preserved at <path>."

**Don't cleanup worktree.**

### If your human partner asks to discard the work

This path exists only as a response to an explicit request to throw the
work away. Confirm first:

```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for that exact confirmation. If confirmed:

```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

Then: Cleanup worktree (Step 5)

## Step 5: Cleanup Worktree (if applicable)

This step applies only if the branch was created inside a git worktree.

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
WORKTREE_PATH=$(git rev-parse --show-toplevel)
```

**If `GIT_DIR == GIT_COMMON`:** normal checkout, no worktree to clean up — done, skip the rest of this step.

**If `GIT_DIR != GIT_COMMON`:** a worktree is in use. For Option 1 and confirmed discards only:

```bash
git worktree remove "$WORKTREE_PATH"
```

**If removal is refused** (`contains modified or untracked files`): the
worktree holds files that exist nowhere else — uncommitted plans, notes, or
scratch work. Never `--force` on your own initiative. Show your human
partner what is at stake and ask:

```bash
git -C "<worktree-path>" status --porcelain -uall
```

```
Worktree removal refused — these files were never committed:

<file list>

1. Commit them to <branch> before cleanup
2. Move them into the main repo root
3. Delete them (unrecoverable)

Which?
```

Carry out the choice, then remove the worktree.

**For Option 3:** Keep worktree.

## Integration

**Prerequisites (must complete before invoking this skill):**
- `sdd-superpowers:sdd-review` — implementation review must report SPEC-ALIGNED
- `sdd-superpowers:verification-before-completion` — fresh test evidence required

**Called by:**
- `sdd-superpowers:subagent-driven-development` — after all tasks and reviews complete
- `sdd-superpowers:sdd-execute` — after all phases complete

**Pairs with:**
- `sdd-superpowers:using-git` — merge commit message (Step 2.5) and worktree cleanup (Step 5, when in use)
