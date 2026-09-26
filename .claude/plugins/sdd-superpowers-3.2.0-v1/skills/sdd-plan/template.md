# Implementation Plan: <Feature Name>

**Spec:** docs/specs/<NNN>-<feature-slug>/spec.md
**Decisions:** docs/adr/<NNN>-*.md (if applicable)
**Created:** YYYY-MM-DD

## Global Constraints

<Project-wide rules from spec.md that bind every phase — version floors,
naming/copy rules, dependency limits, exact values — one line each, copied
verbatim from the spec. Every phase's requirements implicitly include this
section.>

---

## Goal

<One sentence: what working software this plan produces.>

---

## Phase 0: Contracts and Tests First

**Implements:** <FRs> | **Satisfies:** <ACs>
**Files:** `path/to/contract-test.ts`, `path/to/integration-test.ts`
**Interfaces:** Consumes: <what this phase uses from earlier phases — exact signatures, or "nothing" for Phase 0>. Produces: <what later phases rely on — exact function/type names, since an implementer subagent sees only its own phase text>.

<1-3 sentence goal: what this phase locks down before any implementation exists.>

- [ ] Write contract test for <API endpoint/event>: verify request shape, response shape, error codes
  <complete test code>
- [ ] Run contract tests — confirm they FAIL (feature not implemented yet)
- [ ] Commit: `test: add contract tests for <feature>`

---

## Phase 1: <First Component>

**Implements:** FR-1, FR-2 | **Satisfies:** AC-1.1, AC-1.2
**Files:** `src/path/file.ts`, `tests/path/test.ts`
**Interfaces:** Consumes: <what this phase uses from earlier phases — exact signatures, or "nothing" for Phase 0>. Produces: <what later phases rely on — exact function/type names, since an implementer subagent sees only its own phase text>.

<1-3 sentence goal: what this phase accomplishes and why it belongs here.>

- [ ] Write unit test:
  <complete test code>
- [ ] Run: `<exact test command>` — expect: FAIL
- [ ] Implement:
  <complete implementation code>
- [ ] Run: `<exact test command>` — expect: PASS
- [ ] Commit: `feat: implement <unit>`

> **Complexity note** (only if a Pre-Implementation Gate failed for this phase): Gate: <which gate>. Violation: <what complexity was added>. Justification: <specific spec requirement that forced it>.

---

## Phase N: Integration Verification

**Implements:** All FRs | **Satisfies:** All ACs

- [ ] Run full test suite: `<exact command>`
- [ ] Verify all acceptance criteria from spec manually
- [ ] Commit: `feat: complete <feature name>`

---

## Quickstart Validation

<Concrete sequence of commands or UI steps that confirms the feature works end-to-end>
