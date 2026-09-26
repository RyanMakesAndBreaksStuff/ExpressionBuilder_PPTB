# Tasks: <Feature Name>

**Plan:** docs/specs/<NNN>-<feature-slug>/plan.md
**Generated:** YYYY-MM-DD

> **For agentic workers:** Execute tasks in order. `[P]` tasks within the same parallel group can run concurrently. Never start an implementation task without the prior test task completed and confirmed red.

---

## Parallel Group 0: Setup and Contracts

Tasks in this group can run in parallel.

- [ ] **T001** `[P]` Create directory structure: `mkdir -p src/<path> tests/<path>`
- [ ] **T002** `[P]` Write contract test for `POST /endpoint`:
  Run: `<command>` — expect: FAIL (endpoint not implemented)

---

## Sequential: Phase 1 — <Component Name>

*Complete T001–T002 before starting this phase.*

- [ ] **T003** Write failing unit test for `<function/class>`
- [ ] **T004** Verify T003 fails: run `<exact command>` — expect: `FAIL <reason>`
- [ ] **T005** Implement `<function/class>`
- [ ] **T006** Verify T003 passes: run `<exact command>` — expect: `PASS`
- [ ] **T007** Commit: `git add <files> && git commit -m "feat: <description>"`

---

## Sequential: Phase N — Integration

*All prior phases must be complete.*

- [ ] **TNNN** Run full test suite: `<command>` — expect: ALL PASS
- [ ] **TNNN** Verify AC-1.1: Given <precondition> When <action> Then confirm <outcome> — run `<exact command or UI step>`
- [ ] **TNNN** Final commit: `git add . && git commit -m "feat: complete <feature>"`

---

## Task Summary

| Range | Phase | Can Parallelize? | Spec ACs Covered |
|-------|-------|-----------------|-----------------|
| T001–T002 | Setup & Contracts | Yes (within group) | — |
| T003–T007 | <Phase 1> | No (sequential) | AC-1.1, AC-1.2 |

**Total tasks:** <N>
**Estimated parallel speedup:** <X>x (Y tasks parallelizable)
