# Specification Quality Checklist: JSON Reference Builder

**Purpose**: Check that the spec is complete and clear enough to plan from
**Created**: 2026-09-26
**Feature**: [spec.md](../spec.md)

## Content quality

- [x] Focused on user value and outcomes
- [x] All mandatory sections are complete: user scenarios, requirements, success criteria
- [x] Implementation detail is limited to brownfield constraints (note 1)
- [x] Visual detail is left to the design handoff (note 2)

## Requirement completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Every requirement is testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria avoid implementation detail (note 3)
- [x] Every user story has acceptance scenarios
- [x] Edge cases are identified
- [x] Scope is bounded (Out of scope)
- [x] Dependencies and assumptions are identified

## Feature readiness

- [x] Every functional requirement traces to a user story, a constraint or an owner decision (note 4)
- [x] User stories cover the main flows in both builds
- [x] The handoff's open questions are answered (Clarifications)
- [x] Conflicts between sources are resolved (Source reconciliation)
- [x] The normative reference cases were checked with a script: all 25 cases matched, and fixture A1 counts to 25 values (2026-09-26)

## Notes

1. The spec names the platform adapter, the engine and specific files only where a requirement protects existing behaviour (CON-001 to CON-008, FR-071, FR-072, FR-074). These are constraints of the existing codebase, not design choices, and the plan needs them.
2. Tokens, sizes and colours stay in the design handoff. FR-090 points to it.
3. SC-006 names Edge and the PPTB desktop app because the limits must hold in the two runtimes that ship.
4. Traceability:
   - FR-001 to FR-009: user story 3
   - FR-010 to FR-016: user stories 1 and 2
   - FR-020 to FR-029: user story 4
   - FR-030 to FR-039: user stories 1 and 5
   - FR-040 to FR-046: user stories 1 and 2
   - FR-050 to FR-055: user stories 1 and 6
   - FR-060 to FR-075: user story 6
   - FR-080 to FR-085: user story 5
   - FR-090 to FR-093: user story 6 and the handoff
   - FR-095 to FR-097: the owner's decision on product text
5. SC-006, SC-007 and SC-008 need live evidence. They are verification tasks, not open questions: the requirements are fixed, and those checks confirm them or trigger a spec change.
