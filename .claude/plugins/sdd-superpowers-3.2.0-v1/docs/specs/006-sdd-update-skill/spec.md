# Feature 006: SDD Update Skill

**Status:** Approved
**Version:** 1.1.0
**Last Updated:** 2026-04-19
**Created:** 2026-04-19
**Branch:** `006-sdd-update-skill`

---

## Problem Statement

The SDD workflow assumes a spec is stable once approved. In practice, users discover missing requirements, request additions, or realize a requirement was wrong during planning, tasking, or implementation. Without a structured process, these changes are applied ad-hoc — tasks get updated without the spec changing, or the spec changes without plan or task propagation — leaving the specification and the implementation out of sync and breaking traceability.

## Goals

- Provide a structured skill that intercepts any mid-flight change request to an approved spec
- Classify each change by its downstream impact so only affected artifacts are updated
- Apply a versioning scheme to specs so the history of changes is traceable
- Enforce that the spec is always updated before any downstream artifact (plan, tasks, code)
- Integrate the skill into the SDD workflow routing so it is automatically triggered at the right moment

## Non-Goals

- This skill does not handle bugs in implementation — that is `systematic-debugging`
- This skill does not create new specs for entirely new features — that is `sdd-specify`
- This skill does not perform a full spec review or alignment check — that is `sdd-review`
- This skill does not define how code is rewritten after a MAJOR bump — it flags and hands off to `sdd-plan` or `sdd-execute`

## Users and Context

**Primary users:** Claude agents operating within an SDD project during or after the planning phase
**Usage context:** A user requests a change to a feature that already has an approved spec — during plan creation, task generation, or implementation
**User mental model:** Users think of changes as "small tweaks" or "quick additions" and expect them to be applied immediately; the skill must intercept and structure that impulse without being obstructive

## User Stories

### Story 1: New Requirement Mid-Implementation
**As a** developer executing tasks
**I want to** safely add a new requirement discovered during implementation
**So that** the spec, plan, and task list stay consistent with what is being built

**Acceptance criteria:**
- [ ] Claude intercepts the change request before touching any plan or task file
- [ ] Claude asks clarifying questions until the new requirement can be written as a testable acceptance criterion
- [ ] Claude classifies the change as PATCH, MINOR, or MAJOR and states the justification
- [ ] Claude presents the downstream impact (which artifacts will change) and waits for user confirmation
- [ ] After confirmation, Claude updates `spec.md` first, then plan, then tasks in that order
- [ ] The spec version is bumped (e.g. 1.0.0 → 1.1.0) and a Changelog entry is added

### Story 2: Requirement Correction
**As a** developer who approved a spec
**I want to** correct a requirement that turned out to be wrong or contradictory
**So that** the implementation reflects the actual intent without silent divergence

**Acceptance criteria:**
- [ ] Claude reads the current spec before classifying the change
- [ ] Claude correctly identifies whether the correction is a wording fix (PATCH), a scope addition (MINOR), or a breaking change (MAJOR)
- [ ] For MAJOR: Claude lists every artifact — including in-progress code files — that implements the invalidated requirement before proceeding
- [ ] Claude does not delete or rewrite any artifact until the user explicitly confirms the MAJOR scope
- [ ] Invalidated tasks in `tasks.md` are marked `[INVALIDATED vX.0.0 — <reason>]`, not silently removed

### Story 3: Workflow Routing to sdd-update
**As a** Claude agent following the SDD workflow
**I want to** be automatically routed to `sdd-update` when a user describes a change to an approved spec
**So that** the workflow gate is enforced without the user having to remember to invoke the skill

**Acceptance criteria:**
- [ ] `sdd-workflow` routing table includes `sdd-update` as the mandatory skill for change requests
- [ ] `sdd-workflow` routing.md lists the mandatory trigger conditions for `sdd-update`
- [ ] `sdd-workflow` red flags table includes the two most common rationalization patterns that bypass `sdd-update`
- [ ] `sdd-workflow` common mistakes section warns against updating plan/tasks without `sdd-update`

## Functional Requirements

### FR-1: Change Interception and Clarification
When a user describes any change, addition, or correction to an approved spec, the skill must ask clarifying questions one at a time before classifying the change.

**Must:**
- Ask: what specifically changes (old vs. new behavior), why, whether it replaces or extends an existing requirement, any constraints, and what the boundary is
- Stop asking when the change can be expressed as a testable acceptance criterion
- Mark remaining ambiguities `[NEEDS CLARIFICATION]` rather than assuming

**Must not:**
- Proceed to classification while any aspect of the change is ambiguous
- Ask all questions at once

### FR-2: Impact Classification (PATCH / MINOR / MAJOR)
Every change must be assigned exactly one version bump level with a stated justification before any artifact is modified.

**Must:**
- PATCH: clarification or wording fix with zero behavior change — spec only
- MINOR: new requirement, user story, or acceptance criterion that extends without contradicting — spec + affected plan phases + new/modified tasks
- MAJOR: removes, rewrites, or contradicts an existing approved requirement, or changes architecture/contracts — spec + full plan review + full task review + flag in-progress code
- State the test used to determine the level: "Would a developer who built to the old spec need to delete or rewrite existing code?"

**Must not:**
- Allow a change that contradicts an existing requirement to be classified as MINOR or PATCH
- Skip classification and proceed directly to artifact updates

### FR-3: Spec Versioning
Every change must produce a version bump in `spec.md` and a Changelog entry.

**Must:**
- Add a `Version: MAJOR.MINOR.PATCH` field to the spec frontmatter on first update (starting from 1.0.0 for a newly approved spec)
- Add a `Last Updated: YYYY-MM-DD` field
- Append a Changelog table at the end of the spec with columns: Version, Date, Change
- Update the version before updating any other artifact

**Must not:**
- Modify plan or tasks without first bumping the spec version
- Remove or overwrite Changelog entries from prior versions

### FR-4: Downstream Propagation
After the spec is versioned, affected downstream artifacts must be updated in order: spec → plan → tasks → (code flagged, not rewritten).

**Must:**
- PATCH: update spec only; no plan or task changes
- MINOR: extend plan with new/updated phases marked `(added vX.Y.0)`; append new task group marked `[NEW vX.Y.0]`
- MAJOR: flag affected plan phases as `~~Phase N~~ (invalidated vX.0.0)`; mark completed tasks as `[INVALIDATED vX.0.0 — <reason>]`; list in-progress code files at risk before user confirmation
- Present a summary of every artifact to be changed and obtain explicit user confirmation before writing

**Must not:**
- Update tasks before the spec version is bumped
- Silently remove completed tasks — invalidation must be marked, not deleted
- Rewrite code files during this skill — flag only, hand off to `sdd-execute` or `sdd-plan`

### FR-5: Resume Rules
After propagation, the skill must state where execution resumes.

**Must:**
- PATCH: resume exactly where execution left off
- MINOR: complete all existing tasks first, then execute new task group
- MAJOR: stop current execution; re-run `sdd-plan` for affected phases, then `sdd-tasks`, then resume

### FR-6: SDD Workflow Integration
The `sdd-update` skill must be registered in `sdd-workflow` as a mandatory routing entry.

**Must:**
- Appear in the routing table in `sdd-workflow/SKILL.md`
- Appear in the full skill map, skill priority ordering, mandatory conditions, and red flags in `sdd-workflow/routing.md`
- Appear in the Common Mistakes section of `sdd-workflow/SKILL.md`
- Appear in the skills table and workflow diagram in `CLAUDE.md`

### FR-7: Sub-skill Integration Registration
The `sdd-update` SKILL.md must explicitly list the bundled support skills it invokes and the conditions under which each is triggered.

**Must:**
- Include an Integration section in `skills/sdd-update/SKILL.md`
- Register `sdd-superpowers:using-git` as the required sub-skill for committing versioned spec, plan, and tasks after propagation
- Use the standard Integration table format (When | Sub-skill columns) consistent with other SDD skills

**Must not:**
- Leave sub-skill invocations implicit or undocumented in the skill body

## Non-Functional Requirements

### Traceability
- Every version bump must be traceable to a specific user request recorded in the Changelog
- No requirement may disappear from the spec without a Changelog entry explaining the removal

### Ordering Discipline
- The skill enforces strict artifact update order: spec → plan → tasks → code (flag only)
- Any deviation from this order is a skill failure

### User Confirmation Gates
- MINOR changes require confirmation of impact scope before propagation
- MAJOR changes require confirmation and explicit listing of at-risk code before any file is modified

## Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| User says "just update the tasks, the spec change is obvious" | Refuse; explain spec must be versioned first; offer to do both |
| Change contradicts an existing requirement but user insists it's MINOR | Classify as MAJOR; explain the contradiction; do not downgrade |
| `spec.md` has no Version field (pre-existing spec) | Add `Version: 1.0.0` as baseline before applying the bump |
| User cancels after seeing MAJOR impact list | Make no changes; return user to current execution state |
| MAJOR bump invalidates already-merged code | Flag the files; note that a follow-up task or PR is needed; do not attempt to rewrite |

## Open Questions

None.

## Out of Scope (Future Considerations)

- Visual diff between spec versions
- Automated detection of spec-code divergence (would require static analysis)
- Multi-spec change coordination (a change that affects two features simultaneously)

## Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.0.0 | 2026-04-19 | Initial approved spec |
| 1.1.0 | 2026-04-19 | Added FR-7: Sub-skill Integration Registration — explicit Integration section in SKILL.md listing required sub-skills |
