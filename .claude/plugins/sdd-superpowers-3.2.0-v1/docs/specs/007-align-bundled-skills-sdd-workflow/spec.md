# Feature 007: Align Bundled Skills to SDD Workflow

**Status:** Approved
**Version:** 1.0.0
**Last Updated:** 2026-04-19
**Created:** 2026-04-19
**Branch:** `007-align-bundled-skills-sdd-workflow`

---

## Problem Statement

The bundled skills in `skills/` were cloned from the generic `superpowers` plugin and adapted minimally. As a result, they contain outdated or wrong references: bare skill names instead of `sdd-superpowers:` namespaces, `superpowers:` prefixes instead of SDD equivalents, old superpowers file paths, missing SDD artifact references (`spec.md`, `tasks.md`, `plan.md`), and no integration sections documenting which SDD skills call them and what comes next.

In addition, `sdd-workflow` — the entry-point skill — lacked the enforcement language and decision flowchart borrowed from `superpowers:using-superpowers` that make skill invocation non-negotiable.

The result: agents reading bundled skills get mismatched guidance that sends them to the wrong skills, missing the spec as source of truth, and skipping required SDD-specific steps.

## Goals

- Align every bundled skill's integration section and skill references to correct `sdd-superpowers:` namespaces
- Add SDD-specific context (artifact paths, source of truth, workflow position) where it was missing
- Bring `sdd-workflow` up to parity with `superpowers:using-superpowers` enforcement patterns
- Add `<SUBAGENT-STOP>` gates to skills that should not be re-invoked by dispatched subagents
- Make mid-flight spec changes and the `verification-before-completion` gate explicit in `sdd-execute`

## Non-Goals

- Rewriting skill logic or adding new workflow steps not already in the SDD design
- Updating skills not bundled in this repo (`sdd-brainstorm`, `sdd-specify`, `sdd-plan`, etc.)
- Adding new bundled skills

## Users and Context

**Primary users:** Claude agents operating within an SDD project, reading bundled skills for guidance during execution
**Usage context:** Any point in the SDD workflow where a bundled skill is invoked — entry, execution, review, finishing
**User mental model:** Agents expect skill references to point to real, callable skills; artifact paths to match the actual SDD directory structure; integration sections to close the loop on what comes before and after each skill

## User Stories

### Story 1: Correct Skill Invocation
**As a** Claude agent in an SDD project
**I want** skill references inside bundled skills to use correct `sdd-superpowers:` namespaces
**So that** I invoke the right skill without having to mentally translate from superpowers equivalents

**Acceptance criteria:**
- [x] All `superpowers:` prefixes in integration sections replaced with `sdd-superpowers:`
- [x] All bare skill names (e.g. `using-git`, `finishing-a-development-branch`) in integration sections namespaced
- [x] Old superpowers equivalent notes (e.g. "SDD equivalent: sdd-plan") removed

### Story 2: SDD Artifact Awareness
**As a** implementer subagent dispatched by `sdd-execute`
**I want** the skills I invoke to tell me which SDD files to read and inject
**So that** I know to use `spec.md` as truth, `tasks.md` as my task source, and `plan.md` for context

**Acceptance criteria:**
- [x] `subagent-driven-development` has a SDD Source Files table listing `tasks.md`, `spec.md`, `plan.md` with their roles
- [x] `spec-reviewer-prompt.md` explicitly injects `spec.md` as the authoritative spec section
- [x] `code-reviewer.md` replaces the vague `{PLAN_REFERENCE}` placeholder with SDD-specific artifact guidance
- [x] Example workflow paths updated from `docs/superpowers/plans/` to `docs/specs/NNN-feature/`

### Story 3: Enforcement-Grade Entry Point
**As a** Claude agent starting a new SDD conversation
**I want** `sdd-workflow` to use the same enforcement language as `superpowers:using-superpowers`
**So that** I cannot rationalize skipping skill invocation checks

**Acceptance criteria:**
- [x] `<SUBAGENT-STOP>` gate added to `sdd-workflow/SKILL.md`
- [x] `<EXTREMELY-IMPORTANT>` block with 1% rule added
- [x] Instruction Priority section added inline (not just in routing.md)
- [x] Decision flowchart (dot diagram) added showing skill invocation flow
- [x] TodoWrite requirement added when invoked skill has checklist
- [x] Skill Types (Rigid vs Flexible) section added

### Story 4: Subagent Boundary Gates
**As a** subagent dispatched to execute a single task
**I want** coordinator-level skills to skip themselves when I invoke them
**So that** I don't re-run the full SDD workflow setup inside my task scope

**Acceptance criteria:**
- [x] `<SUBAGENT-STOP>` added to `sdd-workflow/SKILL.md`
- [x] `<SUBAGENT-STOP>` added to `dispatching-parallel-agents/SKILL.md`
- [x] `finishing-a-development-branch` left without gate (terminal skill — subagents may legitimately invoke it)

### Story 5: Mid-Flight Change Handling in sdd-execute
**As a** Claude agent executing tasks
**I want** `sdd-execute` to explicitly guide me when the user requests a mid-flight spec change
**So that** I STOP, invoke `sdd-update`, and resume — rather than silently patching tasks

**Acceptance criteria:**
- [x] `sdd-execute/SKILL.md` Quick Reference flow includes `Mid-flight change: STOP → sdd-update → resume`
- [x] `sdd-execute/SKILL.md` has a dedicated Mid-Flight Spec Changes section
- [x] `sdd-execute/reference.md` has procedural Mid-Flight Spec Changes section with PATCH/MINOR/MAJOR resume rules

### Story 6: Verification Gate Visibility in sdd-execute
**As a** Claude agent finishing all tasks
**I want** `verification-before-completion` to appear explicitly in the `sdd-execute` execution flow
**So that** I don't skip it and proceed directly to `sdd-review`

**Acceptance criteria:**
- [x] `sdd-execute/SKILL.md` Quick Reference flow shows `verification-before-completion` before `sdd-review`
- [x] `sdd-execute/reference.md` Step 4 invokes `verification-before-completion` as a hard gate

### Story 7: Integration Sections in Receiving and Requesting Code Review
**As a** reviewer subagent or controller
**I want** `receiving-code-review` and `requesting-code-review` to have SDD-specific integration sections
**So that** I know what calls me, what I call, and what the post-review flow is

**Acceptance criteria:**
- [x] `receiving-code-review` has a new "From Reviewer Subagents (SDD)" source section
- [x] `receiving-code-review` integration section maps callers and post-fix re-dispatch flow
- [x] `receiving-code-review` YAGNI section notes spec.md overrides YAGNI
- [x] `requesting-code-review` integration section added with callers and post-review flow
- [x] `requesting-code-review` clarifies this is code-quality review (not spec compliance)

## Functional Requirements

### FR-1: Namespace Correctness
All skill references inside bundled skills must use the full `sdd-superpowers:` namespace. References to `superpowers:` equivalents must be replaced with the SDD skill. Bare names without namespace must be namespaced.

### FR-2: SDD Source File Injection
Skills that dispatch implementer or reviewer subagents must document which SDD files to read once and inject into prompts. Subagents must never be asked to read `tasks.md`, `spec.md`, or `plan.md` themselves.

### FR-3: SUBAGENT-STOP Gates
Coordinator-level skills (`sdd-workflow`, `dispatching-parallel-agents`) must include `<SUBAGENT-STOP>` blocks so dispatched subagents skip them. Terminal skills (`finishing-a-development-branch`, `receiving-code-review`, `test-driven-development`) must NOT have these gates.

### FR-4: Enforcement Language in sdd-workflow
`sdd-workflow/SKILL.md` must include: `<SUBAGENT-STOP>`, `<EXTREMELY-IMPORTANT>` with 1% rule, Instruction Priority, decision flowchart, TodoWrite requirement, and Skill Types classification.

### FR-5: sdd-execute Completeness
`sdd-execute` must explicitly show: mid-flight sdd-update procedure, and `verification-before-completion` as a hard gate before `sdd-review`.

### FR-6: Integration Sections
Every updated skill must have an Integration section (or updated Integration section) that names: which skills call it, which skills it calls, and what the flow is before and after.

## Non-Functional Requirements

### Consistency
All updated skills must follow the same Integration section format: **Called by** / **Each dispatched agent must use** / **After X** pattern used in `sdd-execute`.

### Token Efficiency
No skill should be made significantly longer than necessary. Additions should be targeted — new sections, not rewrites of existing content.

## Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.0.0 | 2026-04-19 | Initial approved spec — documents all bundled skill alignment work completed in this session |
