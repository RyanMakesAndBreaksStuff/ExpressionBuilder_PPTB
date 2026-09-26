# Tasks: Improve Skill Trigger Routing in SDD Workflow

**Plan:** docs/specs/010-improve-skill-trigger-routing/plan.md
**Generated:** 2026-05-30

> **For agentic workers:** Execute tasks in order. `[P]` tasks within the same parallel group can run concurrently. Never start an edit task without the prior baseline-verification task confirmed.

---

## Sequential: Phase 0 — Baseline Verification

Confirm the current state of both files before making any changes. All four greps in T001 must return matches; all four greps in T002 must return 0.

- [ ] **T001** Verify SKILL.md contains the old Quick Reference rows that will be replaced:
  ```bash
  grep -n "Each implementer subagent (dispatched from subagent-driven-development)" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  grep -n "Phase boundary during execution" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  grep -n "Implementing fixes after review feedback" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  grep -n "^| Task fails |" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  ```
  Expected: each grep returns exactly 1 line with a line number.

- [ ] **T002** Verify SKILL.md and routing.md do NOT yet contain the new content:
  ```bash
  grep -c "Before writing any implementation code" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  grep -c "Trigger Language" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
  grep -c "I'll write the test after" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  grep -c "User-language triggers" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
  ```
  Expected: all four return `0`. If any return non-zero, that change already exists — skip the corresponding edit task.

- [ ] **T003** Verify routing.md insertion point headings exist:
  ```bash
  grep -n "When Each Skill Is Mandatory" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
  grep -n "Routing: Brainstorm vs. Specify" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
  ```
  Expected: both return exactly 1 match with a line number. Note the line number of `## When Each Skill Is Mandatory` — the new section inserts immediately before it.

---

## Parallel Group 1: SKILL.md and routing.md edits

*Complete T001–T003 before starting this group. T004–T008 (SKILL.md) and T009–T011 (routing.md) touch different files and can run concurrently.*

### Track A: Update `sdd-workflow/SKILL.md` [P]

- [ ] **T004** `[P]` Edit SKILL.md — replace the nine-row block in the Quick Reference table with updated trigger descriptions for 4 rows (systematic-debugging, requesting-code-review, receiving-code-review, test-driven-development). The other 5 rows are unchanged.

  File: `skills/sdd-workflow/SKILL.md`

  old_string (exact, including unchanged rows — needed to make the match unique):
  ```
  | Task fails | `sdd-superpowers:systematic-debugging` |
  | About to claim done | `sdd-superpowers:verification-before-completion` |
  | Merge decision | `sdd-superpowers:finishing-a-development-branch` |
  | Any git operation (branch, commit, convention) | `sdd-superpowers:using-git` |
  | Phase boundary during execution | `sdd-superpowers:requesting-code-review` |
  | Implementing fixes after review feedback | `sdd-superpowers:receiving-code-review` |
  | Dispatching 2+ independent tasks concurrently | `sdd-superpowers:dispatching-parallel-agents` |
  | Executing tasks in current session with subagents | `sdd-superpowers:subagent-driven-development` |
  | Each implementer subagent (dispatched from subagent-driven-development) | `sdd-superpowers:test-driven-development` |
  ```

  new_string:
  ```
  | Test fails, error appears, unexpected behavior, OR before proposing any fix | `sdd-superpowers:systematic-debugging` |
  | About to claim done | `sdd-superpowers:verification-before-completion` |
  | Merge decision | `sdd-superpowers:finishing-a-development-branch` |
  | Any git operation (branch, commit, convention) | `sdd-superpowers:using-git` |
  | User says 'review this'/'can you review', OR at any phase boundary | `sdd-superpowers:requesting-code-review` |
  | Review feedback received (from human or reviewer subagent) — before implementing any change | `sdd-superpowers:receiving-code-review` |
  | Dispatching 2+ independent tasks concurrently | `sdd-superpowers:dispatching-parallel-agents` |
  | Executing tasks in current session with subagents | `sdd-superpowers:subagent-driven-development` |
  | Before writing any implementation code — subagent or direct | `sdd-superpowers:test-driven-development` |
  ```

- [ ] **T005** `[P]` Verify T004 GREEN — all four updated rows are present:
  ```bash
  grep "Before writing any implementation code — subagent or direct" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  grep "User says 'review this'" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  grep "Review feedback received (from human or reviewer subagent)" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  grep "Test fails, error appears, unexpected behavior" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  ```
  Expected: each returns exactly 1 match. If any miss, re-examine T004 and re-apply.

- [ ] **T006** `[P]` Edit SKILL.md — append four Common Mistakes entries immediately after the last existing entry in `## Common Mistakes`.

  File: `skills/sdd-workflow/SKILL.md`

  old_string:
  ```
  - Invoking this skill inside a subagent task — subagents skip this skill entirely
  ```

  new_string:
  ```
  - Invoking this skill inside a subagent task — subagents skip this skill entirely
  - Writing implementation code before invoking `sdd-superpowers:test-driven-development` — "I'll write the test after" is the rationalization
  - Responding to "review this" without invoking `sdd-superpowers:requesting-code-review` — the skill dispatches a structured reviewer, not an ad-hoc read
  - Implementing review feedback without invoking `sdd-superpowers:receiving-code-review` — the skill enforces verify-before-implement
  - Proposing a fix without first invoking `sdd-superpowers:systematic-debugging` — symptom fix without root cause = regression risk
  ```

- [ ] **T007** `[P]` Verify T006 GREEN — all four new Common Mistakes entries are present:
  ```bash
  grep "I'll write the test after" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  grep "dispatches a structured reviewer" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  grep "enforces verify-before-implement" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  grep "symptom fix without root cause" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  ```
  Expected: each returns exactly 1 match.

- [ ] **T008** `[P]` Commit SKILL.md changes:
  ```bash
  git add skills/sdd-workflow/SKILL.md
  git commit -m "docs(010): update sdd-workflow SKILL.md trigger descriptions and common mistakes"
  ```
  Expected: commit succeeds, exit 0.

### Track B: Update `sdd-workflow/routing.md` [P]

- [ ] **T009** `[P]` Edit routing.md — insert `## Trigger Language` section immediately before `## When Each Skill Is Mandatory`.

  File: `skills/sdd-workflow/routing.md`

  old_string:
  ```
  ## When Each Skill Is Mandatory
  ```

  new_string:
  ```
  ## Trigger Language

  The following tables map exact user phrases and agent-action signals to bundled skills. These supplement the Skill Map above with phrase-level specificity — use when the situation description in the Skill Map is insufficient.

  ### User-language triggers

  | If the user says… | Invoke |
  |-------------------|--------|
  | "review this", "can you review", "take a look", "LGTM?", "what do you think of this code" | `sdd-superpowers:requesting-code-review` |
  | Pastes review feedback, "the reviewer said", "based on this feedback", "fixing review comments" | `sdd-superpowers:receiving-code-review` |
  | "it's not working", "getting an error", "this fails", "weird behavior", "why is X happening" | `sdd-superpowers:systematic-debugging` |

  ### Agent-action triggers

  | Before the agent… | Invoke |
  |-------------------|--------|
  | Writes any implementation code (new function, class, fix, modification) | `sdd-superpowers:test-driven-development` |
  | Proposes or applies any fix for a failure or unexpected behavior | `sdd-superpowers:systematic-debugging` |
  | Moves to the next implementation phase | `sdd-superpowers:requesting-code-review` |
  | Implements any change from review feedback | `sdd-superpowers:receiving-code-review` |

  ---

  ## When Each Skill Is Mandatory
  ```

- [ ] **T010** `[P]` Verify T009 GREEN — Trigger Language section is present and correctly positioned:
  ```bash
  grep -n "Trigger Language\|When Each Skill Is Mandatory\|The SDD Skill Map" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
  ```
  Expected: three lines returned with line numbers increasing in order — Skill Map line < Trigger Language line < When Each Skill Is Mandatory line.

  Also verify table content:
  ```bash
  grep "User-language triggers" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
  grep "Agent-action triggers" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
  grep "it's not working" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
  grep "Writes any implementation code" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
  ```
  Expected: each returns 1 match.

- [ ] **T011** `[P]` Commit routing.md changes:
  ```bash
  git add skills/sdd-workflow/routing.md
  git commit -m "docs(010): add Trigger Language section to sdd-workflow routing.md"
  ```
  Expected: commit succeeds, exit 0.

---

## Sequential: Phase 3 — Integration Verification

*Complete all of Parallel Group 1 (T004–T011) before starting this phase.*

- [ ] **T012** Run full AC verification — all 14 grep checks must return matches:
  ```bash
  # AC-1.1
  grep "Before writing any implementation code — subagent or direct" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  # AC-1.2
  grep "Writes any implementation code" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
  # AC-1.3
  grep "I'll write the test after" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  # AC-2.1
  grep "review this.*can you review\|can you review.*review this" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md || grep "review this" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
  # AC-2.2
  grep "the reviewer said" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
  # AC-2.3
  grep "Implements any change from review feedback" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
  # AC-2.4
  grep "User says 'review this'" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  # AC-2.5
  grep "Review feedback received (from human or reviewer subagent)" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  # AC-2.6a
  grep "dispatches a structured reviewer" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  # AC-2.6b
  grep "enforces verify-before-implement" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  # AC-3.1
  grep "it's not working" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
  # AC-3.2
  grep "Proposes or applies any fix" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
  # AC-3.3
  grep "Test fails, error appears" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  # AC-3.4
  grep "symptom fix without root cause" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  ```
  Expected: all 14 return matches. Any miss = incomplete implementation, do not proceed.

- [ ] **T013** Verify section order in routing.md:
  ```bash
  grep -n "The SDD Skill Map\|## Trigger Language\|When Each Skill Is Mandatory" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md
  ```
  Expected: line numbers increase in order (Skill Map < Trigger Language < When Each Skill Is Mandatory). Confirms section was inserted in the correct location.

- [ ] **T014** Verify no old trigger text remains in SKILL.md:
  ```bash
  grep "Each implementer subagent (dispatched from subagent-driven-development)" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  grep "^| Phase boundary during execution |" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  grep "^| Implementing fixes after review feedback |" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  grep "^| Task fails |" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
  ```
  Expected: all return empty (no matches). If any match, the old_string in T004 was not fully replaced.

---

## Task Summary

| Range | Phase | Can Parallelize? | Spec ACs Covered |
|-------|-------|-----------------|-----------------|
| T001–T003 | Phase 0 — Baseline Verification | No (sequential) | — |
| T004–T008 | Phase 1 Track A — SKILL.md edits | Yes (with Track B) | AC-1.1, AC-1.3, AC-2.4, AC-2.5, AC-2.6, AC-3.3, AC-3.4 |
| T009–T011 | Phase 1 Track B — routing.md edit | Yes (with Track A) | AC-1.2, AC-2.1, AC-2.2, AC-2.3, AC-3.1, AC-3.2 |
| T012–T014 | Phase 3 — Integration Verification | No (sequential) | All ACs |

**Total tasks:** 14
**Estimated parallel speedup:** ~1.5x (Track A and Track B run concurrently after Phase 0)
