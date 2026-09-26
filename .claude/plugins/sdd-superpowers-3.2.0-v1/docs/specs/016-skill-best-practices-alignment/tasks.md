# Tasks: Skill Best-Practices Alignment

**Plan:** docs/specs/016-skill-best-practices-alignment/plan.md
**Generated:** 2026-06-24

> **For agentic workers:** Execute tasks in order. `[P]` tasks within the same parallel
> group can run concurrently — they touch different files. Never skip T002 (red-phase
> verification) before editing skills. All `<examples>` blocks insert after `## Overview`.
> All `## Constraints` and `## Error Handling` sections append at the end of the skill body.

---

## Sequential: Phase 0 — Verification Script

### T001 Write verification script

- [x] **T001** Create `tests/016-verify-skill-structure.sh` with this exact content:

```bash
#!/usr/bin/env bash
set -euo pipefail

SKILLS_DIR="skills"
ERRORS=0

PHASE1_SKILLS=(
  "test-driven-development"
  "systematic-debugging"
  "verification-before-completion"
  "sdd-specify"
  "sdd-execute"
  "sdd-brainstorm"
  "requesting-code-review"
)

for skill_dir in "$SKILLS_DIR"/*/; do
  skill_name=$(basename "$skill_dir")
  if [ "$skill_name" = "writing-skills" ]; then continue; fi

  skill_file="$skill_dir/SKILL.md"
  if [ ! -f "$skill_file" ]; then continue; fi

  lines=$(wc -l < "$skill_file")
  if [ "$lines" -gt 500 ]; then
    echo "FAIL [$skill_name]: $lines lines (exceeds 500)"
    ERRORS=$((ERRORS + 1))
  fi

  if ! grep -q "<examples>" "$skill_file"; then
    echo "FAIL [$skill_name]: missing <examples> block"
    ERRORS=$((ERRORS + 1))
  fi

  is_phase1=false
  for p1 in "${PHASE1_SKILLS[@]}"; do
    if [ "$skill_name" = "$p1" ]; then is_phase1=true; break; fi
  done
  if $is_phase1; then
    example_count=$(grep -c "<example>" "$skill_file" || true)
    if [ "$example_count" -lt 2 ]; then
      echo "FAIL [$skill_name]: Phase 1 skill has $example_count <example> entries (need >= 2)"
      ERRORS=$((ERRORS + 1))
    fi
  fi

  if ! grep -q "^## Constraints" "$skill_file"; then
    echo "FAIL [$skill_name]: missing ## Constraints section"
    ERRORS=$((ERRORS + 1))
  fi

  if ! grep -q "^## Error Handling" "$skill_file"; then
    echo "FAIL [$skill_name]: missing ## Error Handling section"
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "^## Constraints" "$skill_file" && grep -q "^## Error Handling" "$skill_file"; then
    constraints_line=$(grep -n "^## Constraints" "$skill_file" | head -1 | cut -d: -f1)
    error_line=$(grep -n "^## Error Handling" "$skill_file" | head -1 | cut -d: -f1)
    if [ "$error_line" -lt "$constraints_line" ]; then
      echo "FAIL [$skill_name]: ## Error Handling appears before ## Constraints"
      ERRORS=$((ERRORS + 1))
    fi
  fi

  if ! grep -q "User requests gate bypass" "$skill_file"; then
    echo "FAIL [$skill_name]: missing 'User requests gate bypass' in Error Handling"
    ERRORS=$((ERRORS + 1))
  fi

done

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "TOTAL: $ERRORS failure(s)"
  exit 1
else
  echo "All 19 skills pass structural validation."
fi
```

- [x] `chmod +x tests/016-verify-skill-structure.sh`

---

### T002 Run verification script — confirm RED

- [x] **T002** Run: `bash tests/016-verify-skill-structure.sh`
- [x] Expected: Multiple `FAIL [skill-name]: missing ...` lines, exit code 1
- [x] If output shows `All 19 skills pass structural validation.` — stop and investigate (skills already modified unexpectedly)

---

## Parallel Group 1: Phase 1 Skills

*Complete T001–T002 before starting this group. All tasks in this group are independent — they touch different files.*

---

### T003 `[P]` Edit `test-driven-development/SKILL.md`

- [x] **T003** Insert after the line `## Overview` in `skills/test-driven-development/SKILL.md`:

```markdown
<examples>
<example>
<context>User says "let's add a sorting function to the list utility."</context>
<correct>Invoke test-driven-development. Write the failing test for sort behaviour before touching the implementation file.</correct>
<incorrect>Open the implementation file and write the sort function first because "the logic is straightforward."</incorrect>
</example>
<example>
<context>User says "it's just a one-liner fix, I'll write the test after."</context>
<correct>Stop. Write the failing test first, confirm it is red, then write the fix.</correct>
<incorrect>Write the one-liner now and add the test retroactively — retroactive tests cannot prove the code was broken before the fix.</incorrect>
</example>
</examples>
```

- [x] Append to end of `skills/test-driven-development/SKILL.md`:

```markdown
## Constraints

- Does NOT write implementation code before a failing test exists for the behaviour being implemented
- Does NOT accept "I'll write the test after" as a valid path — tests precede implementation unconditionally
- Does NOT skip the red-phase verification step — a test that was never observed failing proves nothing

## Error Handling

- **No test framework configured**: Ask which testing framework and test runner to use before writing any test code.
- **Implementation already started without a test**: Stop. Write a test that captures the current expected behaviour, confirm it passes, then proceed — do not retroactively justify skipped tests.
- **User requests gate bypass**: The gate is "no implementation code before a failing test." Explain that skipping it means there is no evidence the code was broken before the fix. Offer to write the test first — it takes one step.
```

- [x] Verify: `wc -l skills/test-driven-development/SKILL.md` — must be ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "test-driven-development"` — expect no output (no FAILs for this skill)

---

### T004 `[P]` Edit `systematic-debugging/SKILL.md`

- [x] **T004** Insert after the line `## Overview` in `skills/systematic-debugging/SKILL.md`:

```markdown
<examples>
<example>
<context>User reports: "the export function crashes with a TypeError on null input."</context>
<correct>Invoke systematic-debugging. Reproduce the failure, form hypotheses about the null propagation path, trace to root cause before proposing any code change.</correct>
<incorrect>Immediately patch the null check at the crash site without tracing where the null originates — the root cause may be an upstream caller passing bad data.</incorrect>
</example>
<example>
<context>User says "just patch line 42, that's clearly where it breaks."</context>
<correct>Acknowledge the symptom at line 42, but run the diagnostic protocol first — the crash site is rarely the root cause.</correct>
<incorrect>Add the patch at line 42 without investigation — symptom fixes mask the underlying bug and create regression risk.</incorrect>
</example>
</examples>
```

- [x] Append to end of `skills/systematic-debugging/SKILL.md`:

```markdown
## Constraints

- Does NOT propose or write a fix before root cause is established through the diagnostic protocol
- Does NOT accept symptom location as root cause — the crash site and the origin of the fault are often different
- Does NOT skip hypothesis formation and testing steps under time pressure

## Error Handling

- **No error message or reproduction steps provided**: Ask for the exact error output, stack trace, and steps to reproduce before beginning diagnosis.
- **Root cause traces to a wide blast radius** (e.g. a shared utility used in many places): Surface the scope to the user before proposing a fix; do not auto-expand the change.
- **User requests gate bypass**: The gate is "no fix before root cause." Explain that patching without diagnosis creates regression risk. Offer to run the diagnosis protocol — it is designed to be fast.
```

- [x] Verify: `wc -l skills/systematic-debugging/SKILL.md` — must be ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "systematic-debugging"` — expect no output

---

### T005 `[P]` Edit `verification-before-completion/SKILL.md`

- [x] **T005** Insert after the line `## Overview` in `skills/verification-before-completion/SKILL.md`:

```markdown
<examples>
<example>
<context>Implementation is written and the user is about to say "that should be done."</context>
<correct>Invoke verification-before-completion. Run the test suite now, in this session, and report the actual output before claiming completion.</correct>
<incorrect>Say "looks good, tests should pass" based on code review alone — passing tests must be observed, not inferred.</incorrect>
</example>
<example>
<context>User says "tests passed earlier in the session, so we're good."</context>
<correct>Earlier results are stale. Run the suite again against the current state of the code before claiming done.</correct>
<incorrect>Accept the earlier run as sufficient — code may have changed since then, and stale evidence is not verification.</incorrect>
</example>
</examples>
```

- [x] Append to end of `skills/verification-before-completion/SKILL.md`:

```markdown
## Constraints

- Does NOT accept past test runs as current verification — evidence must be fresh, from the current HEAD
- Does NOT claim completion, "done", "fixed", or "passing" without running verification in this session
- Does NOT treat visual inspection of code as equivalent to a passing test run

## Error Handling

- **No automated test suite exists**: Document what was manually verified with exact steps performed and observed output — do not skip the verification section.
- **CI results referenced instead of local run**: Acceptable only if CI ran on the current HEAD commit; state the commit SHA and CI job URL in the completion claim.
- **User requests gate bypass**: The gate is "no completion claim without fresh evidence." Explain that claiming done without running tests means the claim cannot be trusted. Offer to run the suite — it is one command.
```

- [x] Verify: `wc -l skills/verification-before-completion/SKILL.md` — must be ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "verification-before-completion"` — expect no output

---

### T006 `[P]` Edit `sdd-specify/SKILL.md`

- [x] **T006** Insert after the line `## Overview` in `skills/sdd-specify/SKILL.md` (before the existing `<HARD-GATE>` block):

```markdown
<examples>
<example>
<context>User says "we need to add rate limiting to the API."</context>
<correct>Invoke sdd-specify. Create spec.md capturing the problem, goals, user stories, and acceptance criteria before any planning or code begins.</correct>
<incorrect>Jump to planning ("we could use a token bucket approach") or ask about implementation approach — specs describe WHAT, and they come before HOW.</incorrect>
</example>
<example>
<context>User says "the idea is clear enough, let's just start the plan."</context>
<correct>A clear idea still needs a written spec — spec.md is what plan, tasks, and code are validated against. Create it first.</correct>
<incorrect>Proceed to sdd-plan without a spec — there is then no source of truth to validate the plan against.</incorrect>
</example>
</examples>
```

- [x] Append to end of `skills/sdd-specify/SKILL.md`:

```markdown
## Constraints

- Does NOT write implementation code, scaffold any project, or make architectural decisions — this skill produces only spec.md
- Does NOT proceed to sdd-plan, sdd-research, or any downstream skill before the spec is explicitly approved
- Does NOT leave [NEEDS CLARIFICATION] items unresolved in the final approved spec

## Error Handling

- **Spec already exists for this feature**: Redirect to `sdd-superpowers:sdd-plan` if no plan exists, or to `sdd-superpowers:sdd-spec-update` if a change is needed.
- **Idea is still fuzzy with competing approaches**: Redirect to `sdd-superpowers:sdd-brainstorm` before proceeding — a fuzzy idea produces a fuzzy spec.
- **User requests gate bypass**: The gate is "no planning or code before an approved spec." Explain that without a spec there is no source of truth for plan validation. Offer to write the spec — it is the fastest path to a trustworthy plan.
```

- [x] Verify: `wc -l skills/sdd-specify/SKILL.md` — must be ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "sdd-specify"` — expect no output

---

### T007 `[P]` Edit `sdd-execute/SKILL.md`

- [x] **T007** Insert after the line `## Overview` in `skills/sdd-execute/SKILL.md`:

```markdown
<examples>
<example>
<context>tasks.md exists with 12 tasks. User says "let's start implementing."</context>
<correct>Invoke sdd-execute. Verify the current branch is correct, then dispatch subagents in task order, completing each before the next.</correct>
<incorrect>Begin writing implementation code in the main conversation context without checking branch or following task order.</incorrect>
</example>
<example>
<context>User says "skip task 3, it's not blocking anything right now."</context>
<correct>Explain why task ordering exists (dependencies, test-before-implementation). Offer to clarify whether task 3 is truly independent before deciding.</correct>
<incorrect>Skip task 3 and proceed to task 4 — skipped tasks leave gaps in test coverage and may break later tasks that assume task 3 is complete.</incorrect>
</example>
</examples>
```

- [x] Append to end of `skills/sdd-execute/SKILL.md`:

```markdown
## Constraints

- Does NOT start implementation on main/master — branch must be verified before any subagent is dispatched
- Does NOT skip tasks from the task list — if a task seems unnecessary, surface the question before bypassing it
- Does NOT begin a new task until the prior task's verification step has passed

## Error Handling

- **tasks.md does not exist**: Redirect to `sdd-superpowers:sdd-tasks` before proceeding.
- **Current branch is main/master**: Stop. Ask the user to confirm the correct feature branch before any implementation begins.
- **A task is blocked by an unresolved dependency**: Surface the blocker explicitly to the user; do not skip the task or reorder silently.
- **User requests gate bypass**: The gate is "no implementation on main/master." Explain the risk of implementing directly on main. Offer to create the feature branch first.
```

- [x] Verify: `wc -l skills/sdd-execute/SKILL.md` — must be ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "sdd-execute"` — expect no output

---

### T008 `[P]` Edit `sdd-brainstorm/SKILL.md`

- [x] **T008** Insert after the line `## Overview` in `skills/sdd-brainstorm/SKILL.md` (before the existing `<HARD-GATE>` block):

```markdown
<examples>
<example>
<context>User says "I'm thinking we might want some kind of notification system — not sure if push, email, or in-app."</context>
<correct>Invoke sdd-brainstorm. The idea has competing approaches and unresolved trade-offs — explore before specifying.</correct>
<incorrect>Jump straight to sdd-specify with "notification system" as the feature — the competing approaches will surface as [NEEDS CLARIFICATION] items that block the spec.</incorrect>
</example>
<example>
<context>User says "I want to add dark mode, it's clear: a CSS variable toggle. Can we just spec it?"</context>
<correct>If the approach is genuinely settled, go directly to sdd-specify. Brainstorm is for fuzzy ideas — not every idea needs it.</correct>
<incorrect>Invoke sdd-brainstorm for every idea regardless of fuzziness — clear ideas waste brainstorm overhead and slow delivery.</incorrect>
</example>
</examples>
```

- [x] Append to end of `skills/sdd-brainstorm/SKILL.md`:

```markdown
## Constraints

- Does NOT invoke sdd-specify, sdd-plan, or any implementation skill until the user has explicitly approved the design
- Does NOT write code — this skill produces only design.md
- Does NOT produce a spec — design.md feeds into sdd-specify; they are different artifacts

## Error Handling

- **design.md already exists from a prior brainstorm session**: Skip directly to `sdd-superpowers:sdd-specify` fast-path — do not re-run brainstorm.
- **User wants to jump straight to implementation**: Stop. Redirect through sdd-specify → sdd-plan → sdd-tasks first; implementation without a spec has no source of truth.
- **User requests gate bypass**: The gate is "no sdd-specify or implementation before design approval." Explain that without an approved design, the spec will reflect the first approach considered rather than the best one. Offer to complete the design review — it is a short approval step.
```

- [x] Verify: `wc -l skills/sdd-brainstorm/SKILL.md` — must be ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "sdd-brainstorm"` — expect no output

---

### T009 `[P]` Edit `requesting-code-review/SKILL.md`

- [x] **T009** Insert after the line `## Overview` in `skills/requesting-code-review/SKILL.md`:

```markdown
<examples>
<example>
<context>Phase 1 implementation is complete and all tests pass. User is ready to move to Phase 2.</context>
<correct>Invoke requesting-code-review. Dispatch a code-reviewer subagent with the diff, spec, and plan as context before proceeding to Phase 2.</correct>
<incorrect>Continue to Phase 2 immediately — catching issues at a phase boundary is cheaper than finding them after Phase 2 is built on top.</incorrect>
</example>
<example>
<context>User says "the code looks good to me, let's just merge."</context>
<correct>The author's review is not a substitute for structured review. Invoke requesting-code-review to dispatch a fresh reviewer subagent with no session bias.</correct>
<incorrect>Merge without dispatching a reviewer — the author cannot objectively catch their own blind spots.</incorrect>
</example>
</examples>
```

- [x] Append to end of `skills/requesting-code-review/SKILL.md`:

```markdown
## Constraints

- Does NOT give an ad-hoc inline review (reading the diff and commenting without subagent dispatch) — this skill dispatches a structured code-reviewer subagent
- Does NOT skip the dispatch step even when the author believes the code is correct
- Does NOT review code that has failing tests — tests must pass before review is meaningful

## Error Handling

- **No GitHub PR exists**: Run the review against the local diff; note the absence of a PR in the context passed to the reviewer subagent.
- **Tests are failing**: Halt. Fix failing tests before requesting review — a review of broken code produces misleading findings.
- **User requests gate bypass**: The gate is "structured review before merge." Explain that bypassing review is how regressions ship. Offer to dispatch the reviewer — it runs in the background and does not block other work.
```

- [x] Verify: `wc -l skills/requesting-code-review/SKILL.md` — must be ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "requesting-code-review"` — expect no output

---

## Parallel Group 2: Phase 2 Skills

*Complete T001–T002 before starting this group (can run in parallel with Group 1). All tasks in this group are independent.*

---

### T010 `[P]` Edit `dispatching-parallel-agents/SKILL.md`

- [x] **T010** Insert after the line `## Overview` (or after the `<SUBAGENT-STOP>` block if Overview is absent) in `skills/dispatching-parallel-agents/SKILL.md`:

```markdown
<examples>
<example>
<context>Three implementation tasks exist but all write to the same shared configuration file.</context>
<correct>Identify the shared resource; execute the tasks sequentially to avoid write conflicts rather than dispatching them in parallel.</correct>
<incorrect>Mark all three [P] and dispatch concurrently — concurrent writes to the same file produce race conditions and corrupted output.</incorrect>
</example>
</examples>
```

- [x] Append to end of `skills/dispatching-parallel-agents/SKILL.md`:

```markdown
## Constraints

- Does NOT dispatch tasks that share mutable state or write to the same file concurrently
- Does NOT parallelize tasks that have sequential dependencies (task B requires task A's output)

## Error Handling

- **Tasks appear independent but share a common resource**: Identify the shared resource explicitly; execute those tasks sequentially instead.
- **User requests gate bypass**: The gate is "no concurrent dispatch for tasks with shared state." Explain the race condition risk. Offer to map out which tasks are truly independent before dispatching.
```

- [x] Verify: `wc -l skills/dispatching-parallel-agents/SKILL.md` — must be ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "dispatching-parallel-agents"` — expect no output

---

### T011 `[P]` Edit `finishing-a-development-branch/SKILL.md`

- [x] **T011** Insert after the line `## Overview` in `skills/finishing-a-development-branch/SKILL.md`:

```markdown
<examples>
<example>
<context>All tasks in tasks.md are checked off but the test suite has two failing tests.</context>
<correct>Halt. Fix the failing tests before presenting integration options — a branch with failing tests is not complete.</correct>
<incorrect>Present the four integration options anyway and let the user decide — failing tests are a blocker, not a trade-off.</incorrect>
</example>
</examples>
```

- [x] Append to end of `skills/finishing-a-development-branch/SKILL.md`:

```markdown
## Constraints

- Does NOT present integration options while tests are failing
- Does NOT claim a branch is ready to merge without running the full test suite first

## Error Handling

- **Tests are failing**: Halt. Fix failing tests before choosing an integration option.
- **No test suite exists**: Document what was manually verified before presenting integration options.
- **User requests gate bypass**: The gate is "tests must pass before integration." Explain that merging failing tests makes main broken for everyone. Offer to fix the failures first.
```

- [x] Verify: `wc -l skills/finishing-a-development-branch/SKILL.md` — must be ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "finishing-a-development-branch"` — expect no output

---

### T012 `[P]` Edit `receiving-code-review/SKILL.md`

- [x] **T012** Insert after the line `## Overview` in `skills/receiving-code-review/SKILL.md`:

```markdown
<examples>
<example>
<context>A code reviewer returns a finding: "the retry logic in fetch.ts is missing exponential backoff."</context>
<correct>Invoke receiving-code-review. Triage the finding: verify it against the spec, confirm the current code, assess severity, then decide to implement, defer, or reject with rationale.</correct>
<incorrect>Immediately implement the backoff change without triaging — the spec may not require it, making it scope creep.</incorrect>
</example>
</examples>
```

- [x] Append to end of `skills/receiving-code-review/SKILL.md`:

```markdown
## Constraints

- Does NOT implement review feedback without first verifying the finding against the spec and current code
- Does NOT accept all findings uncritically — findings may be outside spec scope or based on misread code
- Does NOT reject findings without documented rationale

## Error Handling

- **Feedback is ambiguous or references code that does not match current state**: Ask the reviewer for clarification before classifying or implementing.
- **Finding conflicts with an approved spec decision**: Note the conflict; defer to the spec unless the user decides to update it via sdd-spec-update.
- **User requests gate bypass**: The gate is "verify before implementing review feedback." Explain that unverified feedback may introduce scope creep or incorrect changes. Offer to triage one finding at a time.
```

- [x] Verify: `wc -l skills/receiving-code-review/SKILL.md` — must be ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "receiving-code-review"` — expect no output

---

### T013 `[P]` Edit `sdd-init/SKILL.md`

- [x] **T013** Insert after the line `## Overview` in `skills/sdd-init/SKILL.md`:

```markdown
<examples>
<example>
<context>A project directory exists with a CLAUDE.md and docs/specs/ directory already set up.</context>
<correct>Do NOT invoke sdd-init — the project foundation already exists. Use sdd-specify to start a new feature.</correct>
<incorrect>Run sdd-init anyway to "refresh" the foundation — it will overwrite existing steering files and memory entries.</incorrect>
</example>
</examples>
```

- [x] Append to end of `skills/sdd-init/SKILL.md`:

```markdown
## Constraints

- Does NOT create any feature specs, plans, or code until the foundation file is approved and the scaffold is written
- Does NOT overwrite an existing CLAUDE.md or memory/foundation.md without explicit user confirmation

## Error Handling

- **Project already has CLAUDE.md and docs/specs/**: Redirect to sdd-specify for new features — do not re-run init.
- **User cannot answer a Mission Charter question**: Mark it [NEEDS CLARIFICATION] and continue; the foundation can be amended later via the Amendment Process.
- **User requests gate bypass**: The gate is "no feature work before foundation approval." Explain that without a foundation there is no mission to validate features against. Offer to complete the four-question ceremony — it takes under ten minutes.
```

- [x] Verify: `wc -l skills/sdd-init/SKILL.md` — must be ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "sdd-init"` — expect no output

---

### T014 `[P]` Edit `sdd-plan/SKILL.md`

- [x] **T014** Insert after the line `## Overview` in `skills/sdd-plan/SKILL.md` (before the existing `<HARD-GATE>` block):

```markdown
<examples>
<example>
<context>spec.md exists but its status is still "Draft" and three [NEEDS CLARIFICATION] items remain open.</context>
<correct>Do NOT start planning. Redirect to sdd-specify to resolve the clarifications and obtain explicit approval before planning begins.</correct>
<incorrect>Plan against the Draft spec — the open items will surface as unknowns mid-plan and produce an incomplete or incorrect plan.</incorrect>
</example>
</examples>
```

- [x] Append to end of `skills/sdd-plan/SKILL.md`:

```markdown
## Constraints

- Does NOT start planning until spec.md exists, is Approved, and has zero [NEEDS CLARIFICATION] items
- Does NOT make architectural or technology decisions not traceable to a spec requirement
- Does NOT produce a plan while any of the four HARD-GATE conditions are unmet

## Error Handling

- **Spec has [NEEDS CLARIFICATION] items**: Resolve them in spec.md before planning begins.
- **research.md is recommended but missing for a feature with unresolved tech choices**: Offer to run sdd-research first; note that planning without research may require plan revision.
- **User requests gate bypass**: The gate is "no plan without an approved spec." Explain that a plan built on a Draft spec will need rework when the spec changes. Offer to resolve the open items first — it is faster than reworking the plan.
```

- [x] Verify: `wc -l skills/sdd-plan/SKILL.md` — must be ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "sdd-plan"` — expect no output

---

### T015 `[P]` Edit `sdd-research/SKILL.md`

- [x] **T015** Insert after the line `## Overview` in `skills/sdd-research/SKILL.md`:

```markdown
<examples>
<example>
<context>Spec requires sub-100ms search across 10M records with an open question: "SQL full-text search vs. dedicated search engine?"</context>
<correct>Invoke sdd-research. Investigate both options against the performance target before planning — the wrong choice requires rework after implementation begins.</correct>
<incorrect>Choose PostgreSQL full-text search in the plan without investigation because "it's already in the stack" — the performance target may not be achievable without a dedicated engine.</incorrect>
</example>
</examples>
```

- [x] Append to end of `skills/sdd-research/SKILL.md`:

```markdown
## Constraints

- Does NOT make a technology recommendation without investigating against the specific requirement from the spec
- Does NOT produce a plan or implementation — research.md feeds into sdd-plan

## Error Handling

- **Research scope is unclear**: Ask the user which open questions from the spec to investigate — do not research speculatively beyond what the spec requires.
- **An external resource is unavailable**: Note the gap in research.md and flag it as an assumption for the plan.
- **User requests gate bypass**: The gate is "investigate before deciding." Explain that planning around an uninvestigated choice produces plans that require revision. Offer to scope the research narrowly to the single highest-risk question.
```

- [x] Verify: `wc -l skills/sdd-research/SKILL.md` — must be ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "sdd-research"` — expect no output

---

### T016 `[P]` Edit `sdd-review/SKILL.md`

- [x] **T016** Insert after the line `## Overview` in `skills/sdd-review/SKILL.md`:

```markdown
<examples>
<example>
<context>All tasks in tasks.md are checked off and the user says "I think we're done."</context>
<correct>Invoke sdd-review (post-implementation mode). Validate every acceptance criterion against the current code before claiming completion or merging.</correct>
<incorrect>Accept the task checklist as proof of completion — checked tasks confirm work was attempted, not that it satisfies the spec.</incorrect>
</example>
</examples>
```

- [x] Append to end of `skills/sdd-review/SKILL.md`:

```markdown
## Constraints

- Does NOT validate implementation without an approved spec.md to compare against
- Does NOT approve completion if any acceptance criterion lacks verification evidence

## Error Handling

- **No spec.md exists**: Halt. A spec must exist before implementation can be reviewed for alignment.
- **An acceptance criterion is untestable as written**: Flag it; do not skip it. Offer to rewrite the criterion with the user before reviewing.
- **User requests gate bypass**: The gate is "spec-alignment validation before merge." Explain that unchecked criteria may mean the feature is incomplete. Offer to review one story at a time to keep it fast.
```

- [x] Verify: `wc -l skills/sdd-review/SKILL.md` — must be ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "sdd-review"` — expect no output

---

### T017 `[P]` Edit `sdd-spec-update/SKILL.md`

- [x] **T017** Insert after the line `## Overview` in `skills/sdd-spec-update/SKILL.md` (before the existing `<HARD-GATE>` block):

```markdown
<examples>
<example>
<context>User says "we decided to drop the CSV export requirement — let's just remove it."</context>
<correct>Invoke sdd-spec-update. Assess downstream impact, assign a version bump, update spec.md, and propagate changes to plan and tasks before removing any code.</correct>
<incorrect>Delete the CSV export code and remove the relevant tasks from tasks.md without versioning the spec — the spec and implementation are now out of sync with no audit trail.</incorrect>
</example>
</examples>
```

- [x] Append to end of `skills/sdd-spec-update/SKILL.md`:

```markdown
## Constraints

- Does NOT update any downstream artifact (plan, tasks, code) until the spec change is fully understood and a version bump is assigned
- Does NOT make scope changes without an impact assessment on existing plan and tasks

## Error Handling

- **Change scope is unclear**: Ask one clarifying question before assigning a version bump — never assume the extent of a change.
- **Change conflicts with an already-completed task**: Surface the conflict to the user; offer options (revert the task, update the spec to reflect what was built, or add a new task to align).
- **User requests gate bypass**: The gate is "no downstream changes before spec is versioned." Explain that un-versioned spec changes break traceability. Offer to do the version bump first — it is a one-line change.
```

- [x] Verify: `wc -l skills/sdd-spec-update/SKILL.md` — must be ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "sdd-spec-update"` — expect no output

---

### T018 `[P]` Edit `sdd-tasks/SKILL.md`

- [x] **T018** Insert after the line `## Overview` in `skills/sdd-tasks/SKILL.md` (before the existing `<HARD-GATE>` block):

```markdown
<examples>
<example>
<context>plan.md was just written but the user has not yet reviewed or approved it.</context>
<correct>Do NOT generate tasks yet. Present plan.md and wait for explicit approval before generating the task list.</correct>
<incorrect>Generate tasks immediately after plan.md is saved — unreviewed plans produce task lists that encode unvalidated decisions.</incorrect>
</example>
</examples>
```

- [x] Append to end of `skills/sdd-tasks/SKILL.md`:

```markdown
## Constraints

- Does NOT generate tasks until plan.md exists and the user has explicitly approved it in the current session
- Does NOT generate tasks while spec.md status is Draft
- Does NOT produce a task with a "TBD", "TODO", or "similar to above" placeholder

## Error Handling

- **Plan has TBD or placeholder items**: Halt. Resolve placeholders in plan.md before generating tasks — tasks derived from incomplete plans are also incomplete.
- **Spec status is Draft**: Redirect to sdd-specify to obtain explicit approval before proceeding.
- **User requests gate bypass**: The gate is "no tasks without an approved plan." Explain that tasks built on an unapproved plan encode unvalidated decisions into the executable checklist. Offer to review the plan first.
```

- [x] Verify: `wc -l skills/sdd-tasks/SKILL.md` — must be ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "sdd-tasks"` — expect no output

---

### T019 `[P]` Edit `sdd-workflow/SKILL.md`

- [x] **T019** Insert after the line `## Overview` in `skills/sdd-workflow/SKILL.md`:

```markdown
<examples>
<example>
<context>User opens a conversation in a repository that has no CLAUDE.md and no docs/specs/ directory.</context>
<correct>This is not an SDD project. Announce that sdd-workflow does not apply and proceed with default Claude Code behaviour.</correct>
<incorrect>Invoke sdd-workflow and attempt to route to SDD skills — the project has no foundation, so SDD routing will produce meaningless results.</incorrect>
</example>
</examples>
```

- [x] Append to end of `skills/sdd-workflow/SKILL.md`:

```markdown
## Constraints

- Does NOT apply to repositories without CLAUDE.md and docs/specs/ (non-SDD projects)
- Does NOT replace the user's explicit instructions — sdd-workflow routes to skills; the user decides what to build

## Error Handling

- **Non-SDD repository detected** (no CLAUDE.md, no docs/specs/): Announce that this skill does not apply; proceed with default behaviour.
- **Multiple SDD skills seem applicable**: Route to the highest-priority skill per the Quick Reference table; do not invoke multiple skills simultaneously.
- **User requests gate bypass**: Name the specific gate the user wants to bypass; redirect to the appropriate SDD skill for the correct path forward.
```

- [x] Verify: `wc -l skills/sdd-workflow/SKILL.md` — must be ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "sdd-workflow"` — expect no output

---

### T020 `[P]` Edit `subagent-driven-development/SKILL.md`

- [x] **T020** Insert after the line `# Subagent-Driven Development` heading (first heading after frontmatter) in `skills/subagent-driven-development/SKILL.md`:

```markdown
<examples>
<example>
<context>tasks.md has 8 tasks where task 4 depends on output from task 3, and task 7 depends on task 6.</context>
<correct>Dispatch tasks 1–2 in parallel if independent, then task 3 sequentially, then task 4 after task 3 is confirmed complete — respecting the dependency chain throughout.</correct>
<incorrect>Dispatch all 8 tasks concurrently — dependent tasks will fail or produce incorrect results when their prerequisites are not yet complete.</incorrect>
</example>
</examples>
```

- [x] Append to end of `skills/subagent-driven-development/SKILL.md`:

```markdown
## Constraints

- Does NOT dispatch tasks that have sequential dependencies concurrently
- Does NOT allow a subagent to inherit the main session's conversation history — each subagent receives only the context constructed for its specific task

## Error Handling

- **A subagent returns a failure**: Do not dispatch the next dependent task. Surface the failure to the user and decide whether to retry, fix the task definition, or debug first with systematic-debugging.
- **Tasks appear parallelizable but share a file**: Identify the shared file; execute those tasks sequentially instead.
- **User requests gate bypass**: The gate is "no concurrent dispatch for dependent tasks." Explain the failure mode. Offer to map out the dependency graph before dispatching.
```

- [x] Verify: `wc -l skills/subagent-driven-development/SKILL.md` — must be ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "subagent-driven-development"` — expect no output

---

### T021 `[P]` Edit `using-git/SKILL.md`

- [x] **T021** Insert after the line `## Overview` in `skills/using-git/SKILL.md`:

```markdown
<examples>
<example>
<context>About to make the first commit on a new feature. User says "just commit everything."</context>
<correct>Invoke using-git. Read docs/git-convention.md for the commit message format, stage specific named files (not git add -A blindly), and craft a Conventional Commits message.</correct>
<incorrect>Run git add . && git commit -m "updates" — this violates the commit convention and may accidentally stage sensitive or unrelated files.</incorrect>
</example>
</examples>
```

- [x] Append to end of `skills/using-git/SKILL.md`:

```markdown
## Constraints

- Does NOT create a commit without reading docs/git-convention.md first (or using Conventional Commits format if no convention file exists)
- Does NOT use `git add -A` or `git add .` without reviewing what will be staged
- Does NOT force-push to main/master

## Error Handling

- **No docs/git-convention.md found**: Default to Conventional Commits format (`type: description`) and note the missing convention file.
- **Uncommitted changes exist on the wrong branch**: Halt. Help the user stash or move changes to the correct branch before committing.
- **User requests gate bypass** (e.g. `--no-verify`): Explain what the hook does and why it exists. Only bypass if the user explicitly confirms they understand the consequence.
```

- [x] Verify: `wc -l skills/using-git/SKILL.md` — must be ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "using-git"` — expect no output

---

## Sequential: Phase 3 — Integration Verification

*Complete all tasks in Groups 1 and 2 before starting this phase.*

---

### T022 Run full verification — confirm GREEN

- [x] **T022** Verify AC-1.1, AC-2.1, AC-3.1, AC-4.1, AC-4.3:
  Run: `bash tests/016-verify-skill-structure.sh`
  Expected: `All 19 skills pass structural validation.` — exit code 0
  If any FAIL lines appear: fix the identified skill before continuing.

---

### T023 Confirm HARD-GATE / Constraints alignment

- [x] **T023** Verify AC-3.3: For each skill that has a `<HARD-GATE>` block, confirm the `## Constraints` section uses the same prohibitive verb:
  ```bash
  for skill in sdd-brainstorm sdd-specify sdd-execute sdd-plan sdd-tasks sdd-spec-update sdd-init; do
    echo "=== $skill ==="
    grep "HARD-GATE" -A3 skills/$skill/SKILL.md | grep "Do NOT" | head -3
    echo "--- Constraints ---"
    grep "Does NOT" skills/$skill/SKILL.md | head -5
    echo ""
  done
  ```
  Expected: Each "Do NOT" gate clause has a matching "Does NOT" Constraints entry covering the same prohibition.

---

### T024 Confirm section ordering in every skill

- [x] **T024** Verify `## Error Handling` is the final section and `## Constraints` is second-to-last:
  ```bash
  for skill_dir in skills/*/; do
    name=$(basename "$skill_dir")
    [ "$name" = "writing-skills" ] && continue
    file="$skill_dir/SKILL.md"
    last=$(grep "^## " "$file" | tail -1)
    second_last=$(grep "^## " "$file" | tail -2 | head -1)
    if [ "$last" != "## Error Handling" ]; then
      echo "FAIL [$name]: last section is '$last' (expected '## Error Handling')"
    fi
    if [ "$second_last" != "## Constraints" ]; then
      echo "FAIL [$name]: second-to-last section is '$second_last' (expected '## Constraints')"
    fi
  done
  echo "Section ordering check complete."
  ```
  Expected: No FAIL lines printed.

---

### T025 Quickstart spot-check

- [x] **T025** Spot-check a Phase 1 skill and a Phase 2 skill manually:
  ```bash
  # Phase 1 spot-check: test-driven-development
  grep -A 20 "<examples>" skills/test-driven-development/SKILL.md | head -20
  grep -A 8 "^## Constraints" skills/test-driven-development/SKILL.md
  grep -A 8 "^## Error Handling" skills/test-driven-development/SKILL.md

  # Phase 2 spot-check: using-git
  grep -A 10 "<examples>" skills/using-git/SKILL.md | head -10
  grep -A 6 "^## Constraints" skills/using-git/SKILL.md
  grep -A 6 "^## Error Handling" skills/using-git/SKILL.md
  ```
  Expected: Blocks are present, correctly formatted, and contain skill-specific content (not generic placeholders).

---

### T026 Commit all changes

- [x] **T026** Invoke `sdd-superpowers:using-git` for the final commit. Stage and commit:
  - All 19 modified `skills/*/SKILL.md` files
  - `tests/016-verify-skill-structure.sh`
  - `docs/specs/016-skill-best-practices-alignment/` (spec, plan, tasks, design)

  Commit message (Conventional Commits):
  ```
  feat(016): add examples, constraints, and error handling to all 19 SDD skills

  - <examples> XML blocks (2 per Phase 1 skill, 1 per Phase 2 skill)
  - ## Constraints section in every skill using "Does NOT" language
  - ## Error Handling section in every skill with gate-bypass entry
  - Verification script: tests/016-verify-skill-structure.sh
  ```

---

## Task Summary

| Range | Phase | Can Parallelize? | Spec ACs Covered |
|---|---|---|---|
| T001–T002 | Setup: verification script | No (sequential) | — |
| T003–T009 | Phase 1: 7 high-traffic skills | Yes (within group) | AC-1.1–1.3, AC-3.1–3.3, AC-4.1–4.3 |
| T010–T021 | Phase 2: 12 remaining skills | Yes (within group) | AC-2.1–2.2, AC-3.1–3.3, AC-4.1–4.3 |
| T022–T025 | Integration verification | No (sequential) | All ACs |
| T026 | Commit | No (sequential) | — |

**Total tasks:** 26
**Parallelizable:** 19 (T003–T021 across two independent parallel groups)
**Estimated parallel speedup:** ~7x (19 independent skill edits vs. 1 sequential stream)
