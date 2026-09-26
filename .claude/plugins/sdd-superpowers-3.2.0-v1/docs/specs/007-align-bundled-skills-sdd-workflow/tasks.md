# Feature 007: Task List

All tasks completed in session 2026-04-19.

---

## Phase 1: Entry Point — sdd-workflow

- [x] **T001** — `sdd-workflow/SKILL.md`: Add `<SUBAGENT-STOP>` gate, `<EXTREMELY-IMPORTANT>` block with 1% rule, Instruction Priority section, decision flowchart (dot diagram), TodoWrite requirement, Skill Types (Rigid/Flexible) section, and subagent-in-SKILL common mistake
- [x] **T002** — `sdd-workflow/routing.md`: Add `subagent-driven-development` to full skill map; add mandatory condition entry; add Reality column to Red Flags table; add "I need more context before invoking a skill" red flag row

---

## Phase 2: Execution Skills — subagent-driven-development

- [x] **T003** — `subagent-driven-development/SKILL.md`: Fix When to Use flowchart (entry point `tasks.md`, node labels to `sdd-superpowers:` names, fallback to `sdd-superpowers:sdd-execute`); update process diagram entry node; add SDD Source Files table; fix example workflow paths; fix integration section (remove superpowers equivalents, namespace all skills)
- [x] **T004** — `subagent-driven-development/spec-reviewer-prompt.md`: Add Authoritative Spec section injecting `spec.md`; update report format to reference `spec.md` sections
- [x] **T005** — `subagent-driven-development/code-quality-reviewer-prompt.md`: Fix `superpowers:code-reviewer` → `sdd-superpowers:code-reviewer`
- [x] **T006** — `subagent-driven-development/implementer-prompt.md`: Add `sdd-superpowers:test-driven-development` as Step 1; add `sdd-superpowers:using-git` in commit step

---

## Phase 3: Parallelization — dispatching-parallel-agents

- [x] **T007** — `dispatching-parallel-agents/SKILL.md`: Add `<SUBAGENT-STOP>` gate; add SDD context paragraph in overview; rewrite When to Use flowchart (entry from `tasks.md`, nodes namespaced); update Quick Reference after-agents flow; add Integration section
- [x] **T008** — `dispatching-parallel-agents/reference.md`: Rewrite agent prompt template with SDD spec/plan injection and TDD+using-git constraints; replace debugging example with SDD implementation example; rewrite verification section as 6-step SDD review process

---

## Phase 4: Review Loop Skills

- [x] **T009** — `receiving-code-review/SKILL.md`: Add SDD invocation trigger (spec-compliance or code-quality reviewer returning issues)
- [x] **T010** — `receiving-code-review/reference.md`: Add "From Reviewer Subagents (SDD)" as first source category; add YAGNI SDD override rule (spec.md first); add Step 5 re-dispatch requirement to Implementation Order; add Integration section
- [x] **T011** — `requesting-code-review/SKILL.md`: Fix `superpowers:code-reviewer` → `sdd-superpowers:code-reviewer` (2 occurrences); add code-quality-vs-spec-compliance clarification in overview; add `subagent-driven-development` and `dispatching-parallel-agents` to Mandatory When to Use; add Integration section
- [x] **T012** — `requesting-code-review/code-reviewer.md`: Add code quality purpose statement (not spec compliance); replace `{PLAN_REFERENCE}` with SDD-specific Spec + Plan injection guidance

---

## Phase 5: Implementation Discipline

- [x] **T013** — `test-driven-development/SKILL.md`: Fix `@testing-anti-patterns.md` → plain path reference; add SDD item to Verification Checklist (tests verify spec requirements); add Integration (SDD) section naming callers and spec context
- [x] **T014** — `sdd-execute/SKILL.md`: Add `Mid-flight change: STOP → sdd-update → resume` to Quick Reference flow; add `verification-before-completion` before `sdd-review` in flow; add Mid-Flight Spec Changes section
- [x] **T015** — `sdd-execute/reference.md`: Add `verification-before-completion` invocation as hard gate in Step 4; add Mid-Flight Spec Changes procedural section with PATCH/MINOR/MAJOR resume rules

---

## Phase 6: Terminal Skill — finishing-a-development-branch

- [x] **T016** — `finishing-a-development-branch/reference.md`: Add Prerequisites block (`sdd-review` + `verification-before-completion`); fix `subagent-driven-development` → `sdd-superpowers:subagent-driven-development`; fix `executing-plans` → `sdd-superpowers:sdd-execute`; fix `using-git` → `sdd-superpowers:using-git`
