# SDD Execute: Full Process Reference

> Complete dispatch procedure, model selection, and failure escalation paths. See [SKILL.md](SKILL.md) for the summary.

## Step 0: Load Steering Context

Scan `.claude/memory/steering/` for `.md` files whose `loaded-by` frontmatter includes `sdd-execute`. Read each matched file and incorporate its content as context before producing any user-facing output. Loading is silent — no announcement to the user.

If `.claude/memory/steering/` does not exist, or no files contain `sdd-execute` in `loaded-by`, proceed without change.

Rescan on every invocation — custom files added after init are discovered automatically.

## Step 1: Verify Starting Baseline

```bash
git branch --show-current
```
If output is `main` or `master`: **STOP**. Ask user to confirm the correct feature branch before any implementation begins.

**Load git convention:** Read `docs/git-convention.md`.
- Missing on new project (no `CLAUDE.md`): halt — "Run `sdd-superpowers:sdd-init` first."
- Missing on existing project: offer one-time creation dialogue (same 4 questions as `sdd-superpowers:sdd-init` Step 5.4), write `docs/git-convention.md`, then continue.

```bash
# Confirm baseline tests pass
<project test command>
```
If tests fail: stop, report failures, do not proceed.

## Step 2: Derive Work Units

### 2a. Read source files

Read both files in full:
- `docs/specs/<NNN>-<feature-slug>/plan.md`
- `docs/specs/<NNN>-<feature-slug>/spec.md`

If `plan.md` cannot be read: surface error "No plan.md found at docs/specs/NNN-feature/plan.md. Run sdd-plan first." Halt.
If `plan.md` has no sections: surface error "plan.md has no sections to derive work units from." Halt.

**Do NOT make subagents read these files** — extract and inject content directly into each subagent prompt.

### 2b. Derive work units

From `plan.md`, produce a flat ordered list of work units. Each work unit:
- Is scoped to one plan section or sub-section
- Is sized to be implementable by one subagent in a single TDD red-green-refactor cycle
- Has a title equal to the plan section heading (used for commit message matching in restart detection)

Work unit size guide:
- One well-scoped function or behavior change = one work unit
- If a plan section describes 3+ distinct behaviors, split into sub-units (one per behavior)
- If a plan section is a single configuration change or single file edit, keep as one unit

Record all derived work units as TodoWrite entries before dispatching any subagent.

### 2c. Determine parallelization

For each pair of work units, mark as parallelizable only if BOTH conditions hold:
1. The plan text explicitly states the sections are independent, OR the units modify disjoint sets of files
2. No ordering constraint is stated or implied in the plan between the two sections

Default to sequential when parallelism cannot be confirmed. Do not invent concurrency.

### 2d. Restart detection

Run:
```bash
git log --oneline
```

For each work unit, check whether its plan section heading appears in any commit message. If a match is found: mark that unit complete in TodoWrite and skip it in dispatch. Only dispatch units with no matching commit.

## Step 3: Execute Each Phase

### Sequential Tasks

For each sequential task, in order:

**3a. Dispatch implementer subagent**

Provide the subagent with:
- The complete work unit text (from the derived plan section)
- The feature branch name
- The spec file path: `docs/specs/<NNN>-<feature-slug>/spec.md`
- The scene: "You are implementing [work unit title / task ID] as part of feature NNN-<slug>. Complete this work using the `sdd-superpowers:test-driven-development` skill (RED-GREEN-REFACTOR: write failing test → confirm it fails → write minimal implementation → confirm it passes → commit). Do NOT write implementation code before a failing test exists. Include the work unit title '[exact plan section heading]' in your commit message. Report DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED."

> **TDD for prose/config changes:** If the work unit is a prose or Markdown edit (skill files, config, documentation) rather than executable code, TDD still applies — adapted as verification assertions: (1) grep/check to confirm the old text exists before editing (RED — change not yet made), (2) apply the edit, (3) grep/check to confirm the new text is present (GREEN — change verified). The implementer subagent must still invoke `sdd-superpowers:test-driven-development` and follow this adapted cycle. "It's just prose" is not an exemption from the discipline.

**3b. Handle implementer status**

| Status | Action |
|--------|--------|
| DONE | Commit directly (3c), then mark unit complete in TodoWrite |
| DONE_WITH_CONCERNS | If correctness concern, address before committing; if observational, commit and note it; mark unit complete in TodoWrite |
| NEEDS_CONTEXT | Provide missing context, re-dispatch same task |
| BLOCKED | Assess: context problem → provide context; wrong model → upgrade; task too large → split; plan wrong → escalate to human |

Never ignore BLOCKED. Never force retry without changing something.

**3c. Commit completed task**

Invoke `sdd-superpowers:using-git` — **Per-Task Commit**. Pass: prior commit SHA (`git rev-parse HEAD` recorded before dispatch) and task description. `sdd-superpowers:using-git` handles conflict detection, staging, message validation, and commit execution.

The implementer's own TDD cycle (failing test → passing test) is the quality gate for this unit — no review subagent runs between DONE and commit, and no gate runs at phase boundaries. Proceed straight to the next work unit.

### Parallel Task Groups

**REQUIRED:** Invoke `sdd-superpowers:dispatching-parallel-agents` before dispatching this group.

Safety check before dispatch:
- [ ] Tasks touch different source files
- [ ] Tasks touch different test files
- [ ] No task depends on another in this group's output

If any check fails: execute sequentially.

1. Dispatch all tasks concurrently (one subagent each)
2. Wait for ALL implementers to finish
3. Commit each unit directly once its own tests pass (can be concurrent per unit)

## Step 4: Final Verification

```bash
<project test command>
```

Read complete output. Count failures. If any fail: use `sdd-superpowers:systematic-debugging` before proceeding.

Invoke `sdd-superpowers:verification-before-completion` — capture fresh test evidence before any completion claim. This is a **hard gate**: no completion claim without running this.

Dispatch `sdd-superpowers:sdd-review` (implementation mode) to build the coverage matrix. Building the matrix (mapping acceptance criteria to tests) is mechanical enough to use a cheap model (e.g. haiku); if the reviewer reports ambiguity that requires judgment to resolve, re-dispatch on the calling session's model instead.

This is the **only** review in the entire execution flow. No spec-compliance, code-quality, or phase-boundary review precedes it.

## Step 4b: Follow-Up Loop

If `sdd-superpowers:sdd-review` reports SPEC-ALIGNED: go to Step 5.

If it reports `DRIFT DETECTED` or `INCOMPLETE`:

1. From the reviewer's coverage matrix and drift findings, derive the corrective/missing work units — do not guess; use the reviewer's stated gaps directly
2. Dispatch implementer subagents for those units via `sdd-superpowers:subagent-driven-development` (each following TDD, per Step 3)
3. Commit each unit directly once its own tests pass (Step 3c)
4. Re-run the full test suite, then re-dispatch `sdd-superpowers:sdd-review` (Mode B)
5. Record this round's unresolved-AC set (the ACs marked ✗ Missing or ⚠ Partial in the coverage matrix), keeping the sets from the last 3 rounds (drop older ones)
6. Evaluate:
   - If this round's set is empty: SPEC-ALIGNED — go to Step 5
   - If any single AC appears in the unresolved sets of 2 of the last 3 rounds (consecutive or not — this catches an AC that oscillates between resolved and unresolved, not just one that repeats back-to-back): **stop looping**. Surface that specific AC to the user and ask how to proceed — do not dispatch another automatic round
   - Otherwise: repeat from step 1

Fewer than 3 rounds have happened yet? Just compare against whatever rounds exist so far (e.g. on round 2, check whether any AC from round 1 also appears in round 2's set).

Do not ask the user for confirmation before starting a follow-up round — only hitting the 2-of-3 threshold escalates.

## Step 5: Finish

After `sdd-superpowers:sdd-review` reports SPEC-ALIGNED (whether on the first dispatch or after follow-up rounds), use `sdd-superpowers:finishing-a-development-branch`. Do not merge, push, or delete branches directly.

---

## Mid-Flight Spec Changes

If the user requests a change, addition, or correction during execution:

1. **STOP** the current task (do not implement the change directly)
2. Invoke `sdd-superpowers:sdd-spec-update` — classify PATCH / MINOR / MAJOR, version the spec
3. Propagate to `plan.md` as directed by `sdd-spec-update`
4. Resume execution from the updated work units

**MAJOR bump** (architectural change): re-evaluate all derived work units before resuming.
**MINOR bump** (new scope): add work units, continue sequential execution.
**PATCH bump** (clarification): update work unit text in place, continue.

Never touch plan or tasks directly — `sdd-spec-update` owns that propagation.

---

## Model Selection Guide

| Task Characteristics | Model |
|---------------------|-------|
| Single file, clear spec, 1-2 functions | Fast/cheap model |
| Multiple files, needs integration judgment | Standard model |
| Architecture decisions, broad codebase knowledge | Most capable model |
| sdd-review (Mode B) coverage-matrix build | Fast/cheap model — escalate to calling session's model if ambiguity needs judgment (see Step 4) |

---

## When a Task Fails Repeatedly

If an implementer is BLOCKED after re-dispatch with context or model upgrade:

1. Read the failure carefully
2. Plan problem? → Update `plan.md`, continue
3. Spec ambiguity? → Clarify with user, update `spec.md`, continue
4. Architectural issue (3+ different fixes all fail)? → Stop, invoke `sdd-superpowers:systematic-debugging`, discuss with user

**Never try a 4th implementation approach without architectural discussion.**

---

## Integration

**Called after:** `sdd-superpowers:sdd-plan`

**Subagents must use:**
- `sdd-superpowers:test-driven-development` — mandatory for every implementation task
- `sdd-superpowers:verification-before-completion` — before reporting DONE

**During execution:**
- `sdd-superpowers:dispatching-parallel-agents` — before every parallel group dispatch
- `sdd-superpowers:receiving-code-review` — whenever sdd-review (Mode B) findings require fixes, during the follow-up loop

**On failure:** `sdd-superpowers:systematic-debugging`

**On completion:** `sdd-superpowers:sdd-review` (once, plus follow-up rounds if needed) → `sdd-superpowers:finishing-a-development-branch`
