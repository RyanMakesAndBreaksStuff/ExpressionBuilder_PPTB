# Implementation Plan: Feature 018 — Taskless Execute from Plan

**Spec:** `docs/specs/018-taskless-execute-from-plan/spec.md`
**Status:** Draft

---

## Goal

Update four skills so that `sdd-execute` drives implementation directly from `spec.md` + `plan.md` when no `tasks.md` exists, eliminating the required `sdd-tasks` step from the execution path. No new files are created. All changes are prose edits to existing skill Markdown files.

---

## Architecture

This feature has no data model, API contract, or executable code. All changes are to skill prose files (`.md` files under `skills/`). Each phase touches a different skill directory — all four phases are file-disjoint and can run concurrently.

**Files modified:**

| File | Change summary |
|------|---------------|
| `skills/sdd-workflow/SKILL.md` | Remove `sdd-tasks` row from routing table; remove `NO TASKS without a plan` gate |
| `skills/sdd-workflow/routing.md` | Remove `sdd-tasks` from skill map and priority ordering; update mandatory-skill conditions |
| `skills/sdd-execute/SKILL.md` | Add plan-driven mode; update frontmatter, examples, When to Use, error handling |
| `skills/sdd-execute/reference.md` | Replace Step 2 (read tasks.md) with work-unit derivation from plan.md; add restart detection; update status tracking to TodoWrite |
| `skills/subagent-driven-development/SKILL.md` | Update source-of-truth from tasks.md → plan.md (with tasks.md fallback); update process diagram and SDD source files table |
| `skills/sdd-tasks/SKILL.md` | Add retired notice at the top pointing to `sdd-execute` |

---

## Tech Stack

Bash (for test assertions), Markdown (skill files). No build system.

---

## Phases

All four phases touch disjoint files — they are safe to run concurrently.

---

### Phase 1: Update `sdd-workflow` skill

**Spec coverage:** FR-5, AC-4.1, AC-4.2

**Goal:** Remove every reference to `sdd-tasks` as a required routing step. Remove the `NO TASKS without a plan` gate. Route plan-approved state directly to `sdd-execute`.

#### 1.1 Test — verify current state fails assertions

```bash
# These greps must PASS before changes (confirming the old text exists):
grep -q "NO TASKS without a plan" skills/sdd-workflow/SKILL.md && echo "FOUND-OLD-GATE" || echo "NOT-FOUND"
grep -q "sdd-superpowers:sdd-tasks" skills/sdd-workflow/SKILL.md && echo "FOUND-OLD-ROUTE" || echo "NOT-FOUND"
grep -q "sdd-superpowers:sdd-tasks" skills/sdd-workflow/routing.md && echo "FOUND-OLD-ROUTE-ROUTING" || echo "NOT-FOUND"
```

Expected: all three print `FOUND-OLD-*` (confirming old text is present and our edits haven't been made yet).

#### 1.2 Edit `skills/sdd-workflow/SKILL.md`

**Change 1 — Quick Reference table:** Replace:

```markdown
| Plan exists | `sdd-superpowers:sdd-tasks` |
| Tasks exist | `sdd-superpowers:sdd-execute` |
```

With:

```markdown
| Plan approved | `sdd-superpowers:sdd-execute` |
```

**Change 2 — Gates block:** Replace:

```
NO PLAN without an approved spec
NO TASKS without a plan
NO CODE without a prior failing test
NO COMPLETION CLAIM without fresh verification evidence
```

With:

```
NO PLAN without an approved spec
NO CODE without a prior failing test
NO COMPLETION CLAIM without fresh verification evidence
```

**Change 3 — Common Mistakes:** Remove the line:

```
- Updating tasks or plan without running `sdd-superpowers:sdd-spec-update` when user requests a change — spec must be versioned first
```

Replace with:

```
- Updating plan without running `sdd-superpowers:sdd-spec-update` when user requests a change — spec must be versioned first
```

#### 1.3 Edit `skills/sdd-workflow/routing.md`

**Change 1 — SDD Skill Map table:** Remove row:

```
| Plan exists, need executable tasks | `sdd-superpowers:sdd-tasks` |
```

Change row:

```
| Ready to execute tasks with agents | `sdd-superpowers:sdd-execute` |
```

To:

```
| Plan approved, ready to implement | `sdd-superpowers:sdd-execute` |
```

**Change 2 — Skill Priority Ordering:** Remove step 4 entirely:

```
4. `sdd-superpowers:sdd-tasks` — establish the ORDER to build it
```

Renumber former step 5 to step 4:

```
4. `sdd-superpowers:sdd-execute` — actually build it
```

**Change 3 — When Each Skill Is Mandatory:** Remove the entire `sdd-tasks` mandatory block:

```
**`sdd-superpowers:sdd-tasks` is mandatory when:**
- A plan exists and execution is imminent
- User wants to track progress or dispatch agents
```

Update the `sdd-execute` mandatory block from:

```
**`sdd-superpowers:sdd-execute` is mandatory when:**
- A tasks.md exists and user says "implement", "build", "execute"
```

To:

```
**`sdd-superpowers:sdd-execute` is mandatory when:**
- A plan is approved and user says "implement", "build", "execute", or "let's start"
```

**Change 4 — Red Flags table:** Remove the row:

```
| "I know what tests to write" | Skipping tasks skips parallelization hints and spec traceability. | `sdd-superpowers:sdd-tasks` first |
```

#### 1.4 Verify changes pass assertions

```bash
# These greps must FAIL after changes (confirming old text is gone):
grep -q "NO TASKS without a plan" skills/sdd-workflow/SKILL.md && echo "FAIL-OLD-GATE-STILL-PRESENT" || echo "PASS-gate-removed"
grep -q "sdd-superpowers:sdd-tasks" skills/sdd-workflow/SKILL.md && echo "FAIL-OLD-ROUTE-STILL-PRESENT" || echo "PASS-route-removed"
grep -q "sdd-superpowers:sdd-tasks" skills/sdd-workflow/routing.md && echo "FAIL-OLD-ROUTE-STILL-PRESENT" || echo "PASS-route-removed"

# These greps must PASS after changes (confirming new text is present):
grep -q "Plan approved" skills/sdd-workflow/SKILL.md && echo "PASS-new-route" || echo "FAIL-new-route-missing"
grep -q "NO CODE without a prior failing test" skills/sdd-workflow/SKILL.md && echo "PASS-tdd-gate-intact" || echo "FAIL-tdd-gate-missing"
```

Expected: all five assertions print `PASS-*`.

#### 1.5 Commit

```
git commit -m "feat(018): remove sdd-tasks from sdd-workflow routing and gates"
```

---

### Phase 2: Update `sdd-execute` skill

**Spec coverage:** FR-1, FR-2, FR-3, FR-4, AC-1.1, AC-1.2, AC-1.3, AC-2.1–AC-2.4, AC-3.1–AC-3.3

**Goal:** Add plan-driven mode. When `tasks.md` is absent, read `plan.md` + `spec.md`, derive work units into TodoWrite, and proceed. Add restart detection via git log.

#### 2.1 Test — verify current state fails assertions

```bash
grep -q "tasks.md does not exist" skills/sdd-execute/SKILL.md && echo "FOUND-OLD-ERROR" || echo "NOT-FOUND"
grep -q "plan-driven mode" skills/sdd-execute/SKILL.md && echo "FOUND-NEW" || echo "NOT-FOUND-as-expected"
grep -q "plan-driven mode" skills/sdd-execute/reference.md && echo "FOUND-NEW" || echo "NOT-FOUND-as-expected"
```

Expected: first prints `FOUND-OLD-ERROR`, second and third print `NOT-FOUND-as-expected`.

#### 2.2 Edit `skills/sdd-execute/SKILL.md`

**Change 1 — Frontmatter description:** Replace:

```yaml
description: Use when a tasks.md exists and implementation should begin
```

With:

```yaml
description: Use when a plan is approved and implementation should begin; works with or without tasks.md
```

**Change 2 — Overview examples:** Replace first example:

```markdown
<example>
<context>tasks.md exists with 12 tasks. User says "let's start implementing."</context>
<correct>Invoke sdd-execute. Verify the current branch is correct, then dispatch subagents in task order, completing each before the next.</correct>
<incorrect>Begin writing implementation code in the main conversation context without checking branch or following task order.</incorrect>
</example>
```

With:

```markdown
<example>
<context>plan.md is approved. tasks.md does not exist. User says "let's start implementing."</context>
<correct>Invoke sdd-execute. Verify the current branch is correct, read plan.md + spec.md, derive work units into TodoWrite, then dispatch subagents in work-unit order.</correct>
<incorrect>Redirect to sdd-tasks — tasks.md is not required. Plan-driven mode handles execution directly from plan.md.</incorrect>
</example>
<example>
<context>tasks.md exists with 12 tasks. User says "let's start implementing."</context>
<correct>Invoke sdd-execute. Verify the current branch is correct, then read tasks.md and dispatch subagents in task order, completing each before the next.</correct>
<incorrect>Ignore tasks.md and re-derive work units from plan.md — if tasks.md exists, use it.</incorrect>
</example>
```

**Change 3 — When to Use:** Replace:

```markdown
- A `tasks.md` exists and implementation is ready to start
- NOT when `tasks.md` is missing — run `sdd-superpowers:sdd-tasks` first
- NOT on `main`/`master` — a feature branch must exist
```

With:

```markdown
- A `plan.md` is approved and implementation is ready to start (with or without `tasks.md`)
- If `tasks.md` exists: use it as-is (existing behavior)
- If `tasks.md` is absent: plan-driven mode — derive work units from `plan.md` + `spec.md`
- NOT on `main`/`master` — a feature branch must exist
```

**Change 4 — Quick Reference execution flow:** Replace:

```
Verify branch + baseline
→ Sequential tasks: one subagent at a time
→ Parallel groups: dispatch concurrently, wait for all, then review
→ After each task: spec-compliance → code-quality → commit
→ Phase boundary: requesting-code-review (blocking gate)
→ Mid-flight change: STOP → sdd-spec-update → resume
After all tasks: verification-before-completion → sdd-review → finishing-a-development-branch
```

With:

```
Verify branch + baseline
→ Detect mode: tasks.md present → task-driven | tasks.md absent → plan-driven
→ Plan-driven: read plan.md + spec.md → derive work units → record in TodoWrite
→ Restart detection: check git log for completed work units → skip matched units
→ Sequential units: one subagent at a time
→ Parallel units: dispatch concurrently, wait for all, then review
→ After each unit: spec-compliance → code-quality → commit (include plan section heading in commit message)
→ Phase boundary: requesting-code-review (blocking gate)
→ Mid-flight change: STOP → sdd-spec-update → resume
After all units: verification-before-completion → sdd-review → finishing-a-development-branch
```

**Change 5 — Status handling table:** Replace `tasks.md` references:

```markdown
| DONE | Mark task `[x]` in `tasks.md`, then proceed to spec-compliance review |
| DONE_WITH_CONCERNS | Mark task `[x]` in `tasks.md`; if correctness concern fix first; if observational proceed |
```

With:

```markdown
| DONE | Mark unit complete in TodoWrite (task-driven: also mark `[x]` in `tasks.md`), then proceed to spec-compliance review |
| DONE_WITH_CONCERNS | Mark unit complete in TodoWrite (task-driven: also mark `[x]` in `tasks.md`); if correctness concern fix first; if observational proceed |
```

**Change 6 — Mid-Flight Spec Changes step 3:** Replace:

```
3. Propagate the change to `plan.md` and `tasks.md` as directed by `sdd-spec-update`
```

With:

```
3. Propagate the change to `plan.md` as directed by `sdd-spec-update` (and `tasks.md` if it exists)
```

**Change 7 — Error Handling:** Replace:

```markdown
- **tasks.md does not exist**: Redirect to `sdd-superpowers:sdd-tasks` before proceeding.
```

With:

```markdown
- **tasks.md does not exist**: Activate plan-driven mode — read `plan.md` + `spec.md` and derive work units. Do NOT redirect to `sdd-tasks`.
- **plan.md does not exist and tasks.md does not exist**: Surface error: "No plan.md found at docs/specs/NNN-feature/plan.md. Run sdd-plan first." Halt.
- **plan.md has no sections**: Surface error: "plan.md has no sections to derive work units from. Ensure plan.md follows the standard plan template." Halt.
```

#### 2.3 Edit `skills/sdd-execute/reference.md`

**Change 1 — Step 1, main-branch halt:** Replace:

```
If output is `main` or `master`: **STOP**. Route user back to `sdd-superpowers:sdd-tasks` to create a feature branch first.
```

With:

```
If output is `main` or `master`: **STOP**. Ask user to confirm the correct feature branch before any implementation begins.
```

**Change 2 — Step 2: rename and replace entirely:**

Replace the entire Step 2 section:

```markdown
## Step 2: Read and Extract Tasks

Read `docs/specs/<NNN>-<feature-slug>/tasks.md` in full. Extract:
- All tasks with complete text and code blocks
- Parallel groups (sections marked "can run in parallel")
- Sequential phases and their prerequisites
- The spec file path for reviewer context

**Do NOT make subagents read the tasks file** — provide them the full task text directly.
```

With:

```markdown
## Step 2: Detect Mode and Derive Work Units

### 2a. Detect execution mode

Check whether `docs/specs/<NNN>-<feature-slug>/tasks.md` exists:

- **tasks.md present → task-driven mode**: Read `tasks.md` in full. Extract all tasks with complete text and code blocks, parallel groups, sequential phases and prerequisites, and the spec file path. Skip to Step 3 — use task text as work unit content. **Do NOT make subagents read the tasks file** — provide full task text directly.

- **tasks.md absent → plan-driven mode**: Continue with steps 2b–2e below.

### 2b. Read source files (plan-driven only)

Read both files in full:
- `docs/specs/<NNN>-<feature-slug>/plan.md`
- `docs/specs/<NNN>-<feature-slug>/spec.md`

If `plan.md` cannot be read: surface error "No plan.md found at docs/specs/NNN-feature/plan.md. Run sdd-plan first." Halt.
If `plan.md` has no sections: surface error "plan.md has no sections to derive work units from." Halt.

**Do NOT make subagents read these files** — extract and inject content directly into each subagent prompt.

### 2c. Derive work units (plan-driven only)

From `plan.md`, produce a flat ordered list of work units. Each work unit:
- Is scoped to one plan section or sub-section
- Is sized to be implementable by one subagent in a single TDD red-green-refactor cycle
- Has a title equal to the plan section heading (used for commit message matching in restart detection)

Work unit size guide:
- One well-scoped function or behavior change = one work unit
- If a plan section describes 3+ distinct behaviors, split into sub-units (one per behavior)
- If a plan section is a single configuration change or single file edit, keep as one unit

Record all derived work units as TodoWrite entries before dispatching any subagent.

### 2d. Determine parallelization (plan-driven only)

For each pair of work units, mark as parallelizable only if BOTH conditions hold:
1. The plan text explicitly states the sections are independent, OR the units modify disjoint sets of files
2. No ordering constraint is stated or implied in the plan between the two sections

Default to sequential when parallelism cannot be confirmed. Do not invent concurrency.

### 2e. Restart detection (plan-driven only)

Run:
```bash
git log --oneline
```

For each work unit, check whether its plan section heading appears in any commit message. If a match is found: mark that unit complete in TodoWrite and skip it in dispatch. Only dispatch units with no matching commit.
```

**Change 3 — Step 3a dispatch scene:** Replace:

```
- The scene: "You are implementing task TNNNN as part of feature NNN-<slug>. Complete this task using the `sdd-superpowers:test-driven-development` skill (RED-GREEN-REFACTOR: write failing test → confirm it fails → write minimal implementation → confirm it passes → commit). Do NOT write implementation code before a failing test exists. Report DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED."
```

With:

```
- The scene: "You are implementing [work unit title / task ID] as part of feature NNN-<slug>. Complete this work using the `sdd-superpowers:test-driven-development` skill (RED-GREEN-REFACTOR: write failing test → confirm it fails → write minimal implementation → confirm it passes → commit). Do NOT write implementation code before a failing test exists. Include the work unit title '[exact plan section heading]' in your commit message. Report DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED."
```

**Change 4 — Step 3b-1 task tracking:** Replace:

```markdown
Find the line for the task that just completed. Edit its checkbox from `[ ]` to `[x]`.

```
- [ ] Task N: Description   →   - [x] Task N: Description
```

Constraints:
- Edit only the one task line that just completed
- Do not modify any other task lines
- Do not mark a task `[x]` speculatively before the subagent result is known
- If the subagent returns `NEEDS_CONTEXT` or `BLOCKED`, leave the line as `[ ]`
```

With:

```markdown
**Task-driven mode:** Find the line for the task that just completed. Edit its checkbox from `[ ]` to `[x]`.

```
- [ ] Task N: Description   →   - [x] Task N: Description
```

**Plan-driven mode:** Mark the work unit complete in TodoWrite. No file edit needed.

Constraints (both modes):
- Mark only the unit that just completed
- Do not mark speculatively before the subagent result is known
- If the subagent returns `NEEDS_CONTEXT` or `BLOCKED`, leave the unit incomplete
```

**Change 5 — Mid-Flight Spec Changes propagation step 3:** Replace:

```
3. Propagate to `plan.md` and `tasks.md` as directed by `sdd-spec-update`
```

With:

```
3. Propagate to `plan.md` as directed by `sdd-spec-update` (and `tasks.md` if it exists)
```

#### 2.4 Verify changes pass assertions

```bash
# Old text gone:
grep -q "tasks.md does not exist.*Redirect to.*sdd-tasks" skills/sdd-execute/SKILL.md && echo "FAIL-old-error-present" || echo "PASS-old-error-removed"
grep -q "NOT when.*tasks.md is missing.*run.*sdd-tasks" skills/sdd-execute/SKILL.md && echo "FAIL-old-when-present" || echo "PASS-old-when-removed"

# New text present:
grep -q "plan-driven mode" skills/sdd-execute/SKILL.md && echo "PASS-plan-driven-in-skill" || echo "FAIL-plan-driven-missing"
grep -q "plan-driven mode" skills/sdd-execute/reference.md && echo "PASS-plan-driven-in-ref" || echo "FAIL-plan-driven-missing"
grep -q "Restart detection" skills/sdd-execute/reference.md && echo "PASS-restart-detection" || echo "FAIL-restart-missing"
grep -q "Derive work units" skills/sdd-execute/reference.md && echo "PASS-derive-work-units" || echo "FAIL-derive-missing"
```

Expected: all six assertions print `PASS-*`.

#### 2.5 Commit

```
git commit -m "feat(018): add plan-driven execution mode to sdd-execute"
```

---

### Phase 3: Update `subagent-driven-development` skill

**Spec coverage:** FR-6, AC-2.1

**Goal:** Update the source-of-truth from `tasks.md` to `plan.md` (with `tasks.md` fallback). Update the process description and SDD source files table.

#### 3.1 Test — verify current state fails assertions

```bash
grep -q "plan-driven" skills/subagent-driven-development/SKILL.md && echo "FOUND-NEW" || echo "NOT-FOUND-as-expected"
grep -q "Read tasks.md + spec.md, extract all tasks" skills/subagent-driven-development/SKILL.md && echo "FOUND-OLD" || echo "NOT-FOUND"
```

Expected: first prints `NOT-FOUND-as-expected`, second prints `FOUND-OLD`.

#### 3.2 Edit `skills/subagent-driven-development/SKILL.md`

**Change 1 — When to Use diagram:** Replace:

```
"Have tasks.md?" [shape=diamond];
...
"Have tasks.md?" -> "Tasks mostly independent?" [label="yes"];
"Have tasks.md?" -> "Run sdd-tasks first" [label="no"];
```

With:

```
"Have tasks.md or plan.md?" [shape=diamond];
...
"Have tasks.md or plan.md?" -> "Tasks mostly independent?" [label="yes"];
"Have tasks.md or plan.md?" -> "Run sdd-plan first" [label="no — neither exists"];
```

**Change 2 — Process diagram:** Replace:

```
"Read tasks.md + spec.md, extract all tasks with full text, note context, create TodoWrite" [shape=box];
```

With:

```
"Read tasks.md (if exists) or derive work units from plan.md + spec.md; create TodoWrite" [shape=box];
```

**Change 3 — SDD Source Files table:** Replace:

```markdown
| File | Purpose |
|------|---------|
| `docs/specs/NNN-feature/tasks.md` | Source of all tasks — extract full text per task |
| `docs/specs/NNN-feature/spec.md` | Authoritative spec — pass to spec reviewer as ground truth |
| `docs/specs/NNN-feature/plan.md` | Architecture and contracts — include as implementer context |
```

With:

```markdown
| File | Purpose |
|------|---------|
| `docs/specs/NNN-feature/tasks.md` | Primary task source when present — extract full text per task (task-driven mode) |
| `docs/specs/NNN-feature/plan.md` | Primary source when tasks.md is absent — derive work units from sections (plan-driven mode); always include as implementer context |
| `docs/specs/NNN-feature/spec.md` | Authoritative spec — pass to spec reviewer as ground truth |
```

**Change 4 — Example Workflow first read comment:** Replace:

```
[Read docs/specs/NNN-feature/tasks.md and docs/specs/NNN-feature/spec.md once]
[Extract all 5 tasks with full text and context]
[Create TodoWrite with all tasks]
```

With:

```
[Read docs/specs/NNN-feature/tasks.md if it exists; otherwise read plan.md + spec.md and derive work units]
[Extract all work units with full text and context]
[Create TodoWrite with all work units]
```

**Change 5 — Integration note:** Replace:

```
- `sdd-superpowers:sdd-plan` - Creates the plan and `sdd-superpowers:sdd-tasks` creates the tasks.md this skill executes
```

With:

```
- `sdd-superpowers:sdd-plan` - Creates the plan this skill executes from (tasks.md is optional; plan-driven mode derives work units from plan.md directly)
```

#### 3.3 Verify changes pass assertions

```bash
grep -q "plan-driven" skills/subagent-driven-development/SKILL.md && echo "PASS-plan-driven-present" || echo "FAIL-plan-driven-missing"
grep -q "tasks.md if it exists" skills/subagent-driven-development/SKILL.md && echo "PASS-fallback-logic" || echo "FAIL-fallback-missing"
grep -q "Run sdd-tasks first" skills/subagent-driven-development/SKILL.md && echo "FAIL-old-route-present" || echo "PASS-old-route-removed"
```

Expected: first two print `PASS-*`, third prints `PASS-old-route-removed`.

#### 3.4 Commit

```
git commit -m "feat(018): update subagent-driven-development to support plan-driven mode"
```

---

### Phase 4: Retire `sdd-tasks` skill

**Spec coverage:** FR-5 (gate removal), Non-Functional — Maintainability

**Goal:** Add a retired notice to `sdd-tasks/SKILL.md` pointing to `sdd-execute` as the replacement.

#### 4.1 Test — verify current state fails assertions

```bash
grep -q "RETIRED" skills/sdd-tasks/SKILL.md && echo "FOUND-RETIRED" || echo "NOT-FOUND-as-expected"
```

Expected: prints `NOT-FOUND-as-expected`.

#### 4.2 Edit `skills/sdd-tasks/SKILL.md`

After the frontmatter (after the closing `---`), insert at the very top of the skill body:

```markdown
> **RETIRED — Feature 018**
> This skill is no longer part of the standard SDD workflow. `sdd-execute` now drives implementation directly from `plan.md` when no `tasks.md` exists.
> If you have an existing `tasks.md`, `sdd-execute` will continue to use it. For new features, go from plan approval directly to `sdd-execute`.
```

#### 4.3 Verify changes pass assertions

```bash
grep -q "RETIRED" skills/sdd-tasks/SKILL.md && echo "PASS-retired-notice" || echo "FAIL-notice-missing"
grep -q "sdd-execute.*now drives" skills/sdd-tasks/SKILL.md && echo "PASS-redirect" || echo "FAIL-redirect-missing"
```

Expected: both print `PASS-*`.

#### 4.4 Commit

```
git commit -m "feat(018): retire sdd-tasks skill — sdd-execute now handles plan-driven mode"
```

---

## Integration Verification

After all four phases are committed:

```bash
# Confirm no stray sdd-tasks references remain in active routing skills:
grep -r "sdd-superpowers:sdd-tasks" skills/sdd-workflow/ && echo "FAIL-stray-reference" || echo "PASS-workflow-clean"
grep -r "sdd-superpowers:sdd-tasks" skills/sdd-execute/ && echo "FAIL-stray-reference" || echo "PASS-execute-clean"
grep -r "sdd-superpowers:sdd-tasks" skills/subagent-driven-development/ && echo "FAIL-stray-reference" || echo "PASS-subagent-clean"

# Confirm plan-driven text is present in all expected locations:
grep -q "plan-driven" skills/sdd-execute/SKILL.md && echo "PASS" || echo "FAIL"
grep -q "plan-driven" skills/sdd-execute/reference.md && echo "PASS" || echo "FAIL"
grep -q "plan-driven" skills/subagent-driven-development/SKILL.md && echo "PASS" || echo "FAIL"

# Confirm gates are correct in workflow:
grep -q "NO TASKS without a plan" skills/sdd-workflow/SKILL.md && echo "FAIL-old-gate-present" || echo "PASS-gate-removed"
grep -q "NO CODE without a prior failing test" skills/sdd-workflow/SKILL.md && echo "PASS-tdd-gate-intact" || echo "FAIL"
```

Expected: all assertions print `PASS-*`.

---

## Self-Review

**Spec coverage check:**
- FR-1 (plan-driven mode detection): Covered in Phase 2, sections 2.2 Change 3 + 2.3 Change 2
- FR-2 (work unit derivation): Covered in Phase 2, section 2.3 Change 2 (Step 2c)
- FR-3 (parallelization inference): Covered in Phase 2, section 2.3 Change 2 (Step 2d)
- FR-4 (restart and resume): Covered in Phase 2, section 2.3 Change 2 (Step 2e)
- FR-5 (sdd-workflow routing update): Covered in Phase 1
- FR-6 (subagent-driven-development update): Covered in Phase 3
- Non-functional/Maintainability (retired notice): Covered in Phase 4

**Placeholder scan:** None found. All changes are concrete prose edits with exact before/after text.

**Type consistency:** No function signatures — all prose. Section headings and skill names are consistent across all phases.
