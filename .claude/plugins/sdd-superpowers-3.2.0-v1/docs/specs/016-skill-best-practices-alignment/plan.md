# Implementation Plan: Skill Best-Practices Alignment

> **For agentic workers:** Use sdd-tasks to generate an executable task list from this plan.

**Spec:** docs/specs/016-skill-best-practices-alignment/spec.md
**Created:** 2026-06-24

---

## Goal

Add `<examples>` XML blocks and explicit `## Constraints` / `## Error Handling` sections
to all 19 in-scope SDD skills so that invocation reliability and boundary behavior are
explicit and structurally uniform across the portfolio.

## Architecture

Pure Markdown editing — no executable code, no data models, no APIs. A Bash verification
script defines structural correctness before any skill is touched (test-first), then each
skill's SKILL.md is edited to insert the required blocks. Every `<HARD-GATE>` block already
present in a skill dictates the exact language of that skill's Constraints entries; no gate
may be softened or contradicted. Line counts are checked before and after each skill to
enforce FR-6.

## Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Content | Markdown (SKILL.md per skill) | FR-1 through FR-5: all deliverables are skill body additions |
| Verification | Bash (`tests/016-verify-skill-structure.sh`) | FR-6, AC-1.1–AC-4.3: structural assertions run before and after edits |

## File Structure

**Modified (19 files):**
- `skills/dispatching-parallel-agents/SKILL.md` — add examples + sections
- `skills/finishing-a-development-branch/SKILL.md` — add examples + sections
- `skills/receiving-code-review/SKILL.md` — add examples + sections
- `skills/requesting-code-review/SKILL.md` — add examples + sections
- `skills/sdd-brainstorm/SKILL.md` — add examples + sections
- `skills/sdd-execute/SKILL.md` — add examples + sections
- `skills/sdd-init/SKILL.md` — add examples + sections
- `skills/sdd-plan/SKILL.md` — add examples + sections
- `skills/sdd-research/SKILL.md` — add examples + sections
- `skills/sdd-review/SKILL.md` — add examples + sections
- `skills/sdd-spec-update/SKILL.md` — add examples + sections
- `skills/sdd-specify/SKILL.md` — add examples + sections
- `skills/sdd-tasks/SKILL.md` — add examples + sections
- `skills/sdd-workflow/SKILL.md` — add examples + sections
- `skills/subagent-driven-development/SKILL.md` — add examples + sections
- `skills/systematic-debugging/SKILL.md` — add examples + sections
- `skills/test-driven-development/SKILL.md` — add examples + sections
- `skills/using-git/SKILL.md` — add examples + sections
- `skills/verification-before-completion/SKILL.md` — add examples + sections

**Created (1 file):**
- `tests/016-verify-skill-structure.sh` — structural verification script

## Complexity Tracking

All Pre-Implementation Gates pass:
- ≤3 components: verify script + 19 Markdown edits + integration check
- No abstractions: framework (Markdown) used directly
- Contracts-first: verification script written and run failing before any edits

---

## Content Templates

All edits follow these templates exactly. No deviation from tag names or section headings.

### `<examples>` block template

Insert immediately after the `## Overview` section (before `## When to Use` or the first
`<HARD-GATE>` block, whichever comes first).

```markdown
<examples>
<example>
<context>One sentence describing the triggering situation.</context>
<correct>What Claude must do — invoke this skill, follow the protocol.</correct>
<incorrect>The bypass rationalization Claude must reject and why.</incorrect>
</example>
</examples>
```

Phase 1 skills get two `<example>` entries inside one `<examples>` block.
Phase 2 skills get one `<example>` entry.

### `## Constraints` template

Append as the second-to-last section (before `## Error Handling`).
Use existing `<HARD-GATE>` language verbatim where a gate already covers the constraint.

```markdown
## Constraints

- Does NOT [concrete prohibition matching gate language if a gate exists]
- Does NOT [second prohibition]
- Does NOT [additional prohibition if needed — 2–5 total]
```

### `## Error Handling` template

Append as the final section of the skill body.

```markdown
## Error Handling

- **[Missing input name]**: [Concrete action — ask for X before proceeding / halt with explanation]
- **[Ambiguous situation]**: [Default behavior — name the default, not "use judgment"]
- **User requests gate bypass**: Name the gate, explain why it holds, offer the correct path forward.
```

---

## Phase 0: Verification Script (Test-First) [DONE]

**Implements:** FR-6 | **Satisfies:** AC-1.1, AC-2.1, AC-3.1, AC-4.1, AC-4.3

### 0.1 Write the verification script

- [x] Create `tests/016-verify-skill-structure.sh`:

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
  # writing-skills is a meta-skill, out of scope
  if [ "$skill_name" = "writing-skills" ]; then continue; fi

  skill_file="$skill_dir/SKILL.md"
  if [ ! -f "$skill_file" ]; then continue; fi

  # FR-6: 500-line limit
  lines=$(wc -l < "$skill_file")
  if [ "$lines" -gt 500 ]; then
    echo "FAIL [$skill_name]: $lines lines (exceeds 500)"
    ERRORS=$((ERRORS + 1))
  fi

  # FR-1: <examples> block present
  if ! grep -q "<examples>" "$skill_file"; then
    echo "FAIL [$skill_name]: missing <examples> block"
    ERRORS=$((ERRORS + 1))
  fi

  # FR-2: Phase 1 skills must have exactly 2 <example> entries
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

  # FR-4: ## Constraints section present
  if ! grep -q "^## Constraints" "$skill_file"; then
    echo "FAIL [$skill_name]: missing ## Constraints section"
    ERRORS=$((ERRORS + 1))
  fi

  # FR-4: Constraints use "Does NOT" language
  if grep -q "^## Constraints" "$skill_file"; then
    constraints_block=$(awk '/^## Constraints/,/^## /' "$skill_file" | grep "^- " || true)
    if echo "$constraints_block" | grep -qv "Does NOT"; then
      non_does_not=$(echo "$constraints_block" | grep -v "Does NOT" | head -1)
      echo "FAIL [$skill_name]: Constraints entry missing 'Does NOT': $non_does_not"
      ERRORS=$((ERRORS + 1))
    fi
  fi

  # FR-5: ## Error Handling section present
  if ! grep -q "^## Error Handling" "$skill_file"; then
    echo "FAIL [$skill_name]: missing ## Error Handling section"
    ERRORS=$((ERRORS + 1))
  fi

  # FR-5: Error Handling comes after Constraints
  if grep -q "^## Constraints" "$skill_file" && grep -q "^## Error Handling" "$skill_file"; then
    constraints_line=$(grep -n "^## Constraints" "$skill_file" | head -1 | cut -d: -f1)
    error_line=$(grep -n "^## Error Handling" "$skill_file" | head -1 | cut -d: -f1)
    if [ "$error_line" -lt "$constraints_line" ]; then
      echo "FAIL [$skill_name]: ## Error Handling appears before ## Constraints"
      ERRORS=$((ERRORS + 1))
    fi
  fi

  # AC-4.3: gate-bypass entry in Error Handling
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

### 0.2 Run verification — expect FAIL

- [x] Run: `bash tests/016-verify-skill-structure.sh`
- [x] Expected: multiple FAIL lines (no skill has the required sections yet), exit code 1

---

## Phase 1: Phase 1 Skills — 2 Examples + Constraints + Error Handling [DONE]

**Implements:** FR-1, FR-2, FR-4, FR-5 | **Satisfies:** AC-1.1, AC-1.2, AC-1.3, AC-3.1–AC-3.3, AC-4.1–AC-4.3

Each Phase 1 skill gets the same edit sequence:
1. Insert `<examples>` block (2 entries) after `## Overview`
2. Append `## Constraints` as second-to-last section
3. Append `## Error Handling` as last section
4. Verify line count ≤ 500

### Per-skill content targets

| Skill | Example 1 context | Example 2 context | Gates to mirror in Constraints |
|---|---|---|---|
| `test-driven-development` | User asks to add a feature → write failing test first | "I'll write the test after, it's just a one-liner" | No HARD-GATE; derive from skill's core principle |
| `systematic-debugging` | Bug reported with obvious-looking cause → diagnose before proposing fix | "Just patch line 42, that's clearly where it breaks" | No HARD-GATE; derive from diagnostic protocol |
| `verification-before-completion` | About to say "done" → run fresh verification first | "Tests passed earlier, should still be fine" | No HARD-GATE; derive from verification principle |
| `sdd-specify` | New feature described, no spec exists → create spec before planning | "Let me just start planning, the idea is clear enough" | HARD-GATE: "Do NOT write any implementation code, scaffold any project, or make any architectural decisions until a spec is approved and written." |
| `sdd-execute` | tasks.md exists → begin implementation in task order | "Skip task 3, it's not blocking anything right now" | HARD-GATE: "Do NOT start implementation on main/master." |
| `sdd-brainstorm` | Fuzzy idea with competing approaches → explore before specifying | "I have a clear idea, let me skip brainstorm and just spec it" (but idea has hidden trade-offs) | HARD-GATE: "Do NOT invoke sdd-specify, sdd-plan, or any implementation skill until the user has approved the design. Do NOT write code." |
| `requesting-code-review` | Phase boundary reached → dispatch code-reviewer subagent | "Looks good to me, I'll just merge without review" | No HARD-GATE; derive from dispatch requirement |

### Error Handling targets per Phase 1 skill

| Skill | Scenario 1 | Scenario 2 | Gate bypass entry |
|---|---|---|---|
| `test-driven-development` | **No test framework configured**: Ask which testing framework to use before writing tests | **Implementation already started**: Stop; write a test for the existing behavior before proceeding | Required |
| `systematic-debugging` | **No error message or reproduction steps**: Ask for the exact error output and steps to reproduce | **Root cause leads to wide blast radius**: Surface the scope to the user; do not auto-expand the fix | Required |
| `verification-before-completion` | **No automated test suite**: Document what was manually verified with exact steps and observed output | **CI results referenced instead of local run**: Acceptable only if CI ran on the current HEAD commit — state the commit SHA | Required |
| `sdd-specify` | **Spec already exists for this feature**: Redirect to `sdd-superpowers:sdd-plan` (if no plan) or `sdd-superpowers:sdd-spec-update` (if change needed) | **Idea is still fuzzy**: Redirect to `sdd-superpowers:sdd-brainstorm` before proceeding | Required |
| `sdd-execute` | **tasks.md missing**: Redirect to `sdd-superpowers:sdd-tasks` before proceeding | **Task blocked by an unresolved dependency**: Surface the blocker to the user; do not skip the task | Required |
| `sdd-brainstorm` | **design.md already exists from a prior brainstorm**: Skip to `sdd-superpowers:sdd-specify` fast-path | **User wants to jump straight to implementation**: Stop; redirect through sdd-specify → sdd-plan → sdd-tasks first | Required |
| `requesting-code-review` | **No GitHub PR exists**: Run review against local diff; note the absence of a PR in the review context | **User says code review is unnecessary**: Explain the spec-alignment and regression-catch value; do not skip dispatch | Required |

### 1.1 `test-driven-development`

- [x] Check current line count: `wc -l skills/test-driven-development/SKILL.md` (currently 381)
- [x] Insert `<examples>` block (2 entries) after line containing `## Overview`
- [x] Append `## Constraints` section (3–4 "Does NOT" entries derived from TDD core principle)
- [x] Append `## Error Handling` section (3 entries per table above)
- [x] Verify line count: `wc -l skills/test-driven-development/SKILL.md` — must be ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "test-driven-development"` — expect no FAIL

### 1.2 `systematic-debugging`

- [x] Check current line count: `wc -l skills/systematic-debugging/SKILL.md` (currently 296)
- [x] Insert `<examples>` block (2 entries) after `## Overview`
- [x] Append `## Constraints` section
- [x] Append `## Error Handling` section
- [x] Verify line count ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "systematic-debugging"` — expect no FAIL

### 1.3 `verification-before-completion`

- [x] Check current line count: `wc -l skills/verification-before-completion/SKILL.md` (currently 61)
- [x] Insert `<examples>` block (2 entries) after `## Overview`
- [x] Append `## Constraints` section
- [x] Append `## Error Handling` section
- [x] Verify line count ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "verification-before-completion"` — expect no FAIL

### 1.4 `sdd-specify`

- [x] Check current line count: `wc -l skills/sdd-specify/SKILL.md` (currently 56)
- [x] Insert `<examples>` block (2 entries) after `## Overview` (before existing `<HARD-GATE>`)
- [x] Append `## Constraints` section — must echo the HARD-GATE: "Does NOT write implementation code, scaffold any project, or make architectural decisions before a spec is approved."
- [x] Append `## Error Handling` section
- [x] Verify line count ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "sdd-specify"` — expect no FAIL

### 1.5 `sdd-execute`

- [x] Check current line count: `wc -l skills/sdd-execute/SKILL.md` (currently 94)
- [x] Insert `<examples>` block (2 entries) after `## Overview`
- [x] Append `## Constraints` section — must echo the HARD-GATE: "Does NOT start implementation on main/master."
- [x] Append `## Error Handling` section
- [x] Verify line count ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "sdd-execute"` — expect no FAIL

### 1.6 `sdd-brainstorm`

- [x] Check current line count: `wc -l skills/sdd-brainstorm/SKILL.md` (currently 41)
- [x] Insert `<examples>` block (2 entries) after `## Overview` (before existing `<HARD-GATE>`)
- [x] Append `## Constraints` section — must echo the HARD-GATE: "Does NOT invoke sdd-specify, sdd-plan, or any implementation skill until the user has approved the design. Does NOT write code."
- [x] Append `## Error Handling` section
- [x] Verify line count ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "sdd-brainstorm"` — expect no FAIL

### 1.7 `requesting-code-review`

- [x] Check current line count: `wc -l skills/requesting-code-review/SKILL.md` (currently 74)
- [x] Insert `<examples>` block (2 entries) after `## Overview`
- [x] Append `## Constraints` section
- [x] Append `## Error Handling` section
- [x] Verify line count ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "requesting-code-review"` — expect no FAIL

---

## Phase 2: Phase 2 Skills — 1 Example + Constraints + Error Handling [DONE]

**Implements:** FR-1, FR-3, FR-4, FR-5 | **Satisfies:** AC-2.1, AC-2.2, AC-3.1–AC-3.3, AC-4.1–AC-4.3

Each Phase 2 skill gets the same edit sequence as Phase 1 but with one `<example>` entry.

### Per-skill content targets

| Skill | Example context (invocation boundary) | Gates to mirror in Constraints |
|---|---|---|
| `dispatching-parallel-agents` | 3 tasks exist but share mutable state → NOT appropriate to dispatch in parallel | No HARD-GATE |
| `finishing-a-development-branch` | Implementation complete but review not done → must complete review before finishing | No HARD-GATE |
| `receiving-code-review` | Review feedback arrives → must triage through this skill before implementing any change | No HARD-GATE |
| `sdd-init` | New project, no CLAUDE.md → invoke; existing project with CLAUDE.md → do NOT invoke | HARD-GATE: "Do NOT create any feature specs, plans, or code until the foundation file is approved and the scaffold is written." |
| `sdd-plan` | Approved spec exists → invoke; spec is still Draft → do NOT invoke | HARD-GATE: "Do NOT start planning until ALL of the following are true: spec.md exists, user has explicitly approved the spec, zero [NEEDS CLARIFICATION] items remain, status is Approved." |
| `sdd-research` | Spec has unresolved tech choices → invoke before planning | No HARD-GATE |
| `sdd-review` | Implementation claimed done → invoke for spec-alignment validation before merge | No HARD-GATE |
| `sdd-spec-update` | User verbally agrees to a scope change → must version the spec through this skill, not just update notes | HARD-GATE: "Do NOT update any downstream artifact (plan, tasks, code) until the change is fully understood and a version bump has been assigned." |
| `sdd-tasks` | Plan approved → invoke; plan still in progress → do NOT invoke | HARD-GATE: "Do NOT generate tasks until ALL of the following are true: plan.md exists, user has explicitly approved the plan." |
| `sdd-workflow` | SDD project conversation starts → invoke; non-SDD repo → do NOT invoke | No HARD-GATE |
| `subagent-driven-development` | Multiple independent tasks ready → dispatch as subagents; sequential tasks with shared context → do not dispatch | No HARD-GATE |
| `using-git` | About to make a commit → invoke to check convention first; just asking what branch to use → invoke | No HARD-GATE |

### Error Handling targets per Phase 2 skill

All Phase 2 skills share this minimum Error Handling set (adapt the "missing input" entry per skill):

```
- **[Skill-specific missing prerequisite]**: [Redirect to the prerequisite skill]
- **User requests gate bypass**: Name the gate, explain why it holds, offer the correct path forward.
```

Where a skill has additional common failure modes, add them. Specifics:

| Skill | Missing prerequisite entry | Additional entries |
|---|---|---|
| `dispatching-parallel-agents` | **Tasks share state**: Identify the shared resource; restructure as sequential tasks instead | — |
| `finishing-a-development-branch` | **Tests are failing**: Halt; fix failing tests before choosing an integration option | — |
| `receiving-code-review` | **Feedback is ambiguous**: Ask the reviewer for clarification before classifying or implementing | — |
| `sdd-init` | **Project already initialised**: Redirect to sdd-specify for new features | — |
| `sdd-plan` | **Spec has [NEEDS CLARIFICATION] items**: Resolve them in the spec before planning | **research.md recommended but missing**: Offer to run sdd-research first |
| `sdd-research` | **Research scope is unclear**: Ask the user which open questions from the spec to investigate | — |
| `sdd-review` | **No spec to compare against**: Halt; a spec must exist before implementation can be reviewed | — |
| `sdd-spec-update` | **Change scope is unclear**: Ask one clarifying question before assigning version bump | — |
| `sdd-tasks` | **Plan has TBD items**: Halt; resolve placeholders in plan before generating tasks | — |
| `sdd-workflow` | **Non-SDD repo detected**: Announce this skill does not apply; proceed with default behavior | — |
| `subagent-driven-development` | **Tasks are not independent**: Identify dependencies; execute sequentially instead | — |
| `using-git` | **No git-convention.md found**: Use Conventional Commits format as default; note the missing file | — |

### 2.1–2.12 Each Phase 2 skill (same edit sequence)

For each of the 12 Phase 2 skills:

- [x] Check current line count: `wc -l skills/<skill-name>/SKILL.md`
- [x] Insert `<examples>` block (1 entry) after `## Overview`
- [x] Append `## Constraints` section (matching HARD-GATE language where a gate exists)
- [x] Append `## Error Handling` section (per-skill entries from table above)
- [x] Verify line count ≤ 500
- [x] Run: `bash tests/016-verify-skill-structure.sh 2>&1 | grep "<skill-name>"` — expect no FAIL

Skills in order: `dispatching-parallel-agents`, `finishing-a-development-branch`,
`receiving-code-review`, `sdd-init`, `sdd-plan`, `sdd-research`, `sdd-review`,
`sdd-spec-update`, `sdd-tasks`, `sdd-workflow`, `subagent-driven-development`, `using-git`

---

## Phase 3: Integration Verification [DONE]

**Implements:** All FRs | **Satisfies:** All ACs

- [x] Run full verification: `bash tests/016-verify-skill-structure.sh`
- [x] Expected output: `All 19 skills pass structural validation.` — exit code 0
- [x] Confirm no `<HARD-GATE>` block is contradicted: for each skill with gates, verify the
  `## Constraints` entry uses the same prohibitive verb as the gate's "Do NOT" clause
- [x] Confirm `## Error Handling` is the final section in every skill (no content after it)
- [x] Confirm `## Constraints` is the second-to-last section in every skill

---

## Quickstart Validation

After all edits are complete and verification passes:

```bash
# Full structural check
bash tests/016-verify-skill-structure.sh

# Spot-check a Phase 1 skill (test-driven-development)
grep -A 20 "<examples>" skills/test-driven-development/SKILL.md
grep -A 10 "^## Constraints" skills/test-driven-development/SKILL.md
grep -A 10 "^## Error Handling" skills/test-driven-development/SKILL.md

# Confirm no skill exceeds 500 lines
for f in skills/*/SKILL.md; do
  name=$(dirname "$f" | xargs basename)
  [ "$name" = "writing-skills" ] && continue
  lines=$(wc -l < "$f")
  [ "$lines" -gt 500 ] && echo "OVER LIMIT: $name ($lines lines)"
done
echo "Line check complete."
```

Expected: verification passes, spot-check shows correct block placement, no skills over limit.
