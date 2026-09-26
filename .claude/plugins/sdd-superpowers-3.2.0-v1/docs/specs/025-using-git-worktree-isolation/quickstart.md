# Quickstart: Worktree Isolation Operation in using-git

**Spec:** docs/specs/025-using-git-worktree-isolation/spec.md

Verify each scenario by reading `skills/using-git/reference.md` and `skills/using-git/SKILL.md` after implementation. "Fails" = the current file does not yet satisfy the item. "Passes" = the item is present and correctly described.

---

## Scenario S1: Existing isolation is detected before anything is created

Given: a developer or SDD skill invokes `using-git`'s worktree-isolation operation (Operation E)
When: the operation starts
Then:
- [ ] Operation E computes and compares git-dir and git-common-dir before doing anything else
- [ ] A normal checkout (git-dir == git-common-dir) proceeds to native-tool detection (E.2)
- [ ] An already-isolated workspace (git-dir != git-common-dir, not a submodule) is reported by path and branch (or detached-HEAD note), and no new worktree is created
- [ ] A submodule (git-dir != git-common-dir, but `git rev-parse --show-superproject-working-tree` returns a path) is treated as a normal checkout, not pre-existing isolation

---

## Scenario S2: A native worktree tool is preferred over manual git commands

Given: Scenario S1 determined the workspace is not already isolated
When: Operation E checks for a native worktree mechanism
Then:
- [ ] Operation E documents checking for a native tool (by name pattern, command, or flag) before running any `git worktree` command
- [ ] If a native tool is available, Operation E documents using it and skipping the manual fallback (E.3) entirely
- [ ] If no native tool is available, Operation E documents proceeding to the manual fallback (E.3)

---

## Scenario S3: Manual worktree creation follows directory priority and gitignore safety

Given: no native worktree tool is available (S2 fallback path)
When: Operation E creates a worktree manually
Then:
- [ ] A worktree directory preference already declared in the user's instructions is used without asking
- [ ] Absent a declared preference, an existing `.worktrees/` or `worktrees/` directory is used, with `.worktrees/` winning if both exist
- [ ] Absent both, the default is `.worktrees/` at the project root
- [ ] Before creating a project-local worktree, Operation E documents verifying the directory is covered by `.gitignore` via `git check-ignore`
- [ ] If not ignored, Operation E documents adding the directory to `.gitignore` and committing before proceeding
- [ ] The creation command `git worktree add <path> -b <branch-name>` (with `cd` into the new path) is documented
- [ ] If no branch name was supplied, Operation E documents suggesting a default (context-derived or generic), validating it against `branch_pattern` from `docs/git-convention.md`, and confirming with the user before creating the worktree
- [ ] If the resolved branch name or target path already exists, Operation E documents offering to reuse the existing branch/worktree, choose a different name, or abort — never silently overwriting or failing

---

## Scenario S4: Sandbox/permission denial falls back gracefully

Given: `git worktree add` fails with a permission or sandbox-denial error
When: Operation E detects this failure
Then:
- [ ] Operation E documents reporting the denial and continuing in the current directory instead of halting
- [ ] Operation E documents still running project setup (E.4) and baseline verification (E.5) in the current directory after this fallback

---

## Scenario S5: Project setup and baseline verification run after entering the workspace

Given: a new workspace has been entered (native tool, manual fallback, or sandbox fallback-in-place)
When: Operation E runs project setup and baseline verification
Then:
- [ ] Operation E documents detecting a dependency manifest (`package.json`, `Cargo.toml`, `requirements.txt`, `pyproject.toml`, `go.mod`) and running the matching install command
- [ ] Operation E documents skipping the install step without error when no manifest is found
- [ ] Operation E documents running the project's test command and reporting pass/fail with counts
- [ ] A failing baseline is documented as: report failures, then ask whether to proceed or investigate
- [ ] A passing baseline is documented as: report workspace path, test results, and readiness to implement

---

## Scenario S6: Isolation setup stays an explicit, opt-in operation

Given: `using-git`'s direct-invocation menu and other SDD skills' documented flows
When: reviewing how Operation E can be reached
Then:
- [ ] `using-git`'s operation menu (in `reference.md`) lists a numbered option for "Set up isolated workspace (worktree)"
- [ ] `skills/using-git/SKILL.md`'s Quick Reference table lists Operation E with its menu number
- [ ] `sdd-execute/SKILL.md`, `sdd-workflow/SKILL.md`, and every other SDD skill's documented steps contain no automatic invocation of Operation E
- [ ] Operation E's description states it is reachable only via explicit menu selection or an explicit, named delegation request

---

## Scenario S7: Full path — direct invocation end-to-end

Given: an SDD project, a user invokes `using-git` with no operation specified
Steps:
1. Menu is presented, user selects "Set up isolated workspace (worktree)"
2. Operation E runs E.1 (detection) → E.2 (native tool check) → E.3 (manual fallback, if needed) → E.4 (project setup) → E.5 (baseline verification)
3. Result is reported to the user

Then:
- [ ] All Scenarios S1-S6 checklist items pass
- [ ] `skills/using-git/reference.md` no longer contains a separate, thinner "Advanced: Parallel Workstreams with Worktrees" section duplicating Operation E — content is merged into Operation E (including the existing "Remove a worktree" commands)
- [ ] `skills/using-git/reference.md`'s Error Reference table includes rows for: already isolated, submodule, no native tool found, directory not ignored, sandbox/permission denial, baseline tests fail
