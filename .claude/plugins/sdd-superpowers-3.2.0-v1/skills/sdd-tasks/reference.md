# SDD Tasks: Full Process Reference

> Complete task derivation procedure, tasks.md template, and quality rules. See [SKILL.md](SKILL.md) for the summary.

## Prerequisites

- `docs/specs/<NNN>-<feature-slug>/plan.md` must exist (required)
- `docs/specs/<NNN>-<feature-slug>/data-model.md` (used if present)
- `docs/specs/<NNN>-<feature-slug>/contracts/` (used if present)
- `docs/specs/<NNN>-<feature-slug>/research.md` (used if present)

## Step 1: Read All Inputs

Read the plan and all supporting documents. Build a mental map of:
- All files that will be created or modified
- All tests that must be written (and in what order)
- All implementation steps (each requiring a prior red test)
- Dependencies between tasks (which must complete before others can start)
- Which tasks are truly independent (safe to parallelize)

## Step 2: Derive Tasks

Convert every plan step into a discrete task. Apply these rules:

**One task = one atomic action:**
- Write a test → one task
- Run a test to verify it fails → one task
- Write implementation → one task
- Run tests to verify pass → one task
- Commit → one task

**Never merge these into one task:**
- ❌ "Write test and implementation for login"
- ✅ Task A: "Write failing test for login validation"
- ✅ Task B: "Verify login test fails (feature not yet implemented)"
- ✅ Task C: "Implement login validation"
- ✅ Task D: "Verify login tests pass"
- ✅ Task E: "Commit: feat: add login validation"

**Mark parallelizable tasks `[P]`:**

A task is safe to parallelize when:
- It has no dependency on another in-progress task's output
- It touches different files than concurrent tasks
- It is a test-writing task for a different component

A task is NOT safe to parallelize when:
- It depends on code being written in another concurrent task
- It modifies the same file as a concurrent task

## Step 3: Write tasks.md

Generate `docs/specs/<NNN>-<feature-slug>/tasks.md`:

See [template.md](template.md) for the canonical tasks.md structure. Fill in every section; every task must show exact code or commands.

## Step 4: Validate the Task List

Check before presenting:

**Structural compliance:** Does the generated `tasks.md` contain all required sections from `template.md` in order (header metadata → Parallel Group 0 → Sequential phase sections → Task Summary table)? Fix any missing or reordered sections before continuing.

**Red-before-green:** For every implementation task, is there a preceding "write failing test" task AND a "verify fails" task? No exceptions.

**Complete code:** Every task that writes or runs code shows the exact code or command. No "write a test for login" without the actual test code.

**Commit granularity:** Is there a commit task after each logical unit? Commits should be frequent — every 2-5 implementation tasks.

**Dependency ordering:** Could any task fail because a prior task didn't produce the right output? If so, reorder.

**Parallelization safety:** Recheck every `[P]` task — does it truly touch different files than all concurrent tasks?

**Verification task format:** Every task that verifies an acceptance criterion must:
- Cite the AC ID from spec.md (e.g., `AC-1.1`)
- Reproduce the Given/When/Then text from the spec criterion inline
- Name the exact command or UI steps to confirm the outcome

Example:
- [ ] **T012** Verify AC-2.1: Given the user has no active session When they visit `/dashboard` Then confirm they are redirected to `/login` — run `curl -I http://localhost:3000/dashboard` and assert `Location: /login` in response headers

## Step 5: Branch Creation and Doc-First Commit

Invoke `sdd-superpowers:using-git` — **Branch Creation and Doc-First Commit**

Pass to `sdd-superpowers:using-git`:
- Spec folder path: `docs/specs/<NNN>-<feature-slug>/`
- Optional ticket ID: ask the user now if not already known

`sdd-superpowers:using-git` will handle: convention loading, branch name suggestions, branch creation, doc staging, commit message confirmation, and commit execution.

Proceed to Step 6 (Handoff) only after `sdd-superpowers:using-git` reports:
- Branch `<name>` created
- Doc-first commit made: `<commit-sha>`

## Step 6: Handoff

> "Task list generated: `docs/specs/NNN-feature/tasks.md`
> Branch `<branch-name>` created. Doc-first commit made: `<commit-sha> <commit-message>`
>
> **NNN total tasks** | **X parallelizable across Y parallel groups** | **Z sequential phases**
>
> **Execution options:**
>
> **Option A — Subagent-driven (recommended):**
> Use `sdd-superpowers:sdd-execute` — dispatches a fresh subagent per task with spec-compliance review and code-quality review after each task. Parallel groups dispatched concurrently.
>
> **Option B — Manual/inline:**
> Work through tasks in order, completing each checkbox before starting the next."

## Task Quality Rules

**No ambiguity in done criteria:** Each task must have an unambiguous pass/fail state. "Write tests" is ambiguous. "Write test, run it, confirm it outputs `FAILED: function not found`" is not.

**Show the complete artifact:** A test task shows the complete test. An implementation task shows the complete function. A command task shows the exact command with expected output.

**Commits have meaningful messages:** Every commit message follows `<type>: <description>` convention (feat, test, fix, refactor, chore).

**Tasks are idempotent:** Running a task twice should produce the same result. "Create directory" is fine (mkdir -p). "Append to file" is not idempotent — rewrite as "write file."
