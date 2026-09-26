# SDD Plan: Full Process Reference

> Complete planning procedure, templates, and quality rules. See [SKILL.md](SKILL.md) for the summary.

## Step 0: Load Steering Context

Scan `.claude/memory/steering/` for `.md` files whose `loaded-by` frontmatter includes `sdd-plan`. Read each matched file and incorporate its content as context before producing any user-facing output. Loading is silent — no announcement to the user.

If `.claude/memory/steering/` does not exist, or no files contain `sdd-plan` in `loaded-by`, proceed without change.

Rescan on every invocation — custom files added after init are discovered automatically.

## Prerequisites

Before planning:
1. `docs/specs/<NNN>-<feature-slug>/spec.md` must exist and be approved
2. One or more `docs/adr/<NNN>-*.md` files should exist if technical decisions were made during brainstorming
3. No `[NEEDS CLARIFICATION]` markers should remain in the spec

Once prerequisites are confirmed, call `EnterPlanMode`. Steps 1–4 below (reading inputs, checking gates, drafting supporting documents and the main plan) all happen inside Plan Mode — nothing is written to `docs/specs/.../plan.md` until the draft is approved (see Step 4).

If `EnterPlanMode`/`ExitPlanMode` are unavailable in the current environment: skip them, but do not skip approval. Present the completed draft as a normal message and get explicit user approval before writing anything to disk — the gate is "no unapproved write," not "must use Plan Mode."

## Step 1: Read All Inputs

Read in order:
1. `docs/specs/<NNN>-<feature-slug>/spec.md`
2. Any `docs/adr/<NNN>-*.md` files (if they exist)
3. Any existing project architecture docs or CLAUDE.md

Map each functional requirement to a technical component. If a requirement has no obvious technical home, flag it before planning.

## Step 2: Pre-Implementation Gates

Validate these gates. Document any failures as a Complexity Tracking note under the specific phase where the violation occurs.

**Simplicity Gate:**
- [ ] Can this be implemented with ≤3 major components/modules?
- [ ] Are we building only what the spec requires (no future-proofing)?
- [ ] If adding a new dependency, is it truly necessary?

**Anti-Abstraction Gate:**
- [ ] Are we using framework features directly rather than wrapping them?
- [ ] Is there a single, canonical model representation (no parallel DTO/entity/view model chains)?

**Integration-First Gate:**
- [ ] Are API contracts defined before implementation starts?
- [ ] Are contract tests written before implementation code?

If a gate fails and the complexity is genuinely justified, document why in that phase's Complexity Tracking note.

## Step 3: Write Supporting Documents

Write these BEFORE the main plan, since the plan references them.

### `data-model.md` (if applicable)

See [data-model-template.md](data-model-template.md) for the canonical data-model.md structure.

### `contracts/api.md` (if applicable)

See [contracts-api-template.md](contracts-api-template.md) for the canonical contracts/api.md structure.

## Step 4: Write the Main Plan

Draft `docs/specs/<NNN>-<feature-slug>/plan.md`:

See [template.md](template.md) for the canonical plan.md structure. Fill in every phase.

Once the draft is complete and has passed Step 5 (Self-Review) and Step 6 (Verification Gate) below, call `ExitPlanMode` to request the user's approval. Only after approval, write `plan.md` to disk at `docs/specs/<NNN>-<feature-slug>/plan.md` (and any supporting documents from Step 3).

## Step 5: Self-Review

After writing all documents, check the plan against the spec:

**Structural compliance:** Does the generated `plan.md` contain all required sections from `template.md` in order (Global Constraints → Goal → Phase 0 → implementation phases → Integration Verification → Quickstart Validation)? Every phase header carries `Implements`/`Satisfies`/`Files`/`Interfaces`. There are no standalone Architecture, Tech Stack, or File Structure sections — that content lives inside each phase's goal line and `Files:` entry instead. Fix any missing or reordered sections before continuing.

**Optional document compliance (conditional):** If `data-model.md` was created, does it contain all required sections from `data-model-template.md` in order (Entities heading → EntityName subheadings with field tables → Indexes, Relationships, Spec requirement per entity)? If `contracts/api.md` was created, does it contain all required sections from `contracts-api-template.md` in order (endpoint heading with Purpose/Spec requirement → Request → Response → Error Responses)?

**Spec coverage:** For each FR in the spec, can you point to a specific phase that implements it? For each acceptance criterion (`AC-N.M`) in the spec, can you point to a phase that satisfies it? List any unmapped FRs or ACs as gaps — they must be covered before planning is complete.

**Traceability check:** Does every technical decision have a spec requirement driving it? Flag decisions without spec backing.

**No-placeholder scan:** Find and eliminate any "TBD", "implement as needed", "handle errors", "similar to above" in the plan.

**Code completeness:** Every step that creates or modifies code must show actual code, not pseudocode or descriptions.

**Test-first verification:** Does every implementation step have a prior failing test step?

Fix issues inline before presenting to user.

## Step 6: Verification Gate

Before claiming the plan is ready, confirm:
- [ ] Every FR in spec has a corresponding plan phase
- [ ] Every phase header lists the FR/story it implements
- [ ] `plan.md` has a Global Constraints section, and every phase has an Interfaces line
- [ ] Zero placeholders remain
- [ ] Pre-implementation gates documented
- [ ] All code in steps is complete, not pseudocode

**Do not say "plan complete" without passing this gate.**

## Step 7: Handoff

> "Implementation plan complete. Artifacts:
> - `docs/specs/NNN-feature/plan.md` — main plan
> - `docs/specs/NNN-feature/data-model.md` (if created)
> - `docs/specs/NNN-feature/contracts/` (if created)
>
> **Next steps:**
> 1. Run `sdd-superpowers:sdd-review` (spec mode) to validate plan-spec alignment before execution
> 2. Run `sdd-superpowers:sdd-execute` to implement — TDD-only per unit, one spec-alignment review at the end"

## Plan Quality Rules

**AC traceability in phase headers:**
Every phase header must include a `| **Satisfies:** AC-N.M, AC-P.Q` clause listing the spec acceptance criteria it delivers. Use the same `AC-N.M` IDs from `spec.md`. Example:
`**Implements:** FR-1, FR-2 | **Satisfies:** AC-1.1, AC-2.3`

**Every step is one action (2-5 min):**
- "Write the failing test" — one step
- "Run it to confirm it fails" — one step
- "Write minimal implementation" — one step
- "Run tests to confirm pass" — one step
- "Commit" — one step

**Complete code in every step:** Show the entire function/test, not just changed lines.

**Exact commands with expected output:**
- `pytest tests/feature/test_auth.py::test_login -v`
- Expected: `PASSED` (not "tests should pass")

**Requirements trace in every phase header:**
- `**Implements:** FR-1, FR-2, Story 3`
