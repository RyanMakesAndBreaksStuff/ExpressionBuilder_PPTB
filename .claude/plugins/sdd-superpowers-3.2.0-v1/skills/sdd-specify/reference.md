# SDD Specify: Full Process Reference

> Complete specification procedure, template, and quality rules. See [SKILL.md](SKILL.md) for the summary.

## Output Location

Save the completed spec to: `docs/specs/<NNN>-<feature-slug>/spec.md`

Where:
- `NNN` = next available feature number (scan `docs/specs/` directory, pad to 3+ digits)
- `feature-slug` = kebab-case name derived from the idea

Example: `docs/specs/003-user-authentication/spec.md`

## Step 0: Load Steering Context

Scan `.claude/memory/steering/` for `.md` files whose `loaded-by` frontmatter includes `sdd-specify`. Read each matched file and incorporate its content as context before producing any user-facing output. Loading is silent — no announcement to the user.

If `.claude/memory/steering/` does not exist, or no files contain `sdd-specify` in `loaded-by`, proceed without change.

Rescan on every invocation — custom files added after init are discovered automatically.

## Step 1: Scan Existing Specs and Detect Fast-Path

Before anything else:
1. Check the `docs/specs/` directory for existing feature numbers
2. Determine the next available number (NNN)
3. Check for related or overlapping specs that might affect scope
4. **Fast-path detection:** Check if `docs/specs/NNN-<feature-slug>/prd.md` exists (produced by `sdd-superpowers:sdd-brainstorm`)
   - If YES → validate the PRD and its linked ADRs:
     - Does `prd.md` contain all required sections: **Problem**, **Users & Context**, **Goals**, **Non-Goals**, **Success Criteria**, **Architecture Decisions**, **Out of Scope**?
     - Does every ADR linked from "Architecture Decisions" exist under `docs/adr/` with `Status: Accepted`?
     - Is each section non-empty?
     - If **valid** → skip Steps 2 and 3 entirely. Read `prd.md` and its linked ADRs, extract each section, formalize directly into `spec.md`. Jump to Step 4.
     - If **invalid** → warn the user: *"Found prd.md but it appears incomplete. Proceeding with normal spec dialogue."* Continue with Steps 2–3.
   - If NO → normal path: proceed with Steps 2 and 3 as usual.

## Step 2: Understand the Idea

Ask clarifying questions **one at a time** to understand:

- **What problem** does this solve? Who experiences it?
- **Who are the users?** What do they want to accomplish?
- **What does success look like?** How do we know it works?
- **What are the constraints?** Performance, security, compliance, timeline?
- **What's out of scope?** What explicitly will NOT be included?
- **What already exists?** Related systems, APIs, or data this touches?

Prefer multiple-choice questions when the space is bounded. Ask only what you need — stop when you have enough to write a complete spec.

## Step 3: Propose the Spec Structure

Before writing, present a brief outline:
- The problem statement and user need
- 2-3 key user stories
- Proposed acceptance criteria scope
- Any `[NEEDS CLARIFICATION]` items you've identified

Get user approval on the structure before writing the full document.

## Step 4: Write the Specification

Generate `docs/specs/<NNN>-<feature-slug>/spec.md` using this template:

See [template.md](template.md) for the canonical spec.md structure. Fill in every section; use `<angle brackets>` placeholders only where shown in the template.

## BDD Acceptance Criteria Rules

Each acceptance criterion must follow the `Given / When / Then` format:

- **Given** — the precondition or system state before the action
- **When** — the user action, API call, or event that triggers the behavior
- **Then** — the observable, verifiable outcome (what a test would assert)

AC IDs follow `AC-<story_number>.<criterion_sequence>` (e.g., Story 1 → `AC-1.1`, `AC-1.2`; Story 2 → `AC-2.1`).

**Valid example:**
- [ ] **AC-1.1** Given a user is on the login page with valid credentials When they submit the login form Then they are redirected to the dashboard and a session token is set

**Anti-patterns (fix before approval):**

| Anti-pattern | Problem | Correction |
|---|---|---|
| "The system handles errors correctly" | No Given, no When, unobservable Then | Add all three clauses; name the specific error and expected response |
| "Given a user When they click Then it works" | Then is not verifiable | Replace "it works" with a concrete, assertable outcome |
| "Given \<state\> When \<action\> Then the user is happy" | Non-observable outcome | Replace with a measurable UI change, response code, or data state |
| Criterion with only Then ("The page loads in under 2s") | Missing Given and When | Specify starting state and triggering action |

## Step 5: Self-Review the Spec

After writing, review the spec yourself (do NOT delegate this):

**Structural compliance:** Does the generated `spec.md` contain all required sections from `template.md` in order (Problem Statement → Goals → Non-Goals → Users and Context → User Stories → Functional Requirements → Non-Functional Requirements → Error Scenarios → Open Questions → Out of Scope)? Fix any missing or reordered sections before continuing.

**Coverage check:** Does every user story have acceptance criteria? Does every functional requirement have clear must/must-not statements?

**Placeholder scan:** Search for "TODO", "TBD", "etc.", vague phrases like "appropriate handling" or "as needed." Replace with specifics or add `[NEEDS CLARIFICATION]`.

**Abstraction check:** Does any requirement mention implementation technology (React, PostgreSQL, REST)? If so, move it to Open Questions — specs describe WHAT, not HOW.

**Testability check:** Can each acceptance criterion be verified with a concrete test? If not, rewrite it.

**BDD completeness:** Does every acceptance criterion have all three clauses (Given, When, Then) and an `AC-N.M` ID? If not, rewrite before approval.

Fix issues inline. Do not move on until the spec passes this review.

## Step 6: Get User Approval

Present the spec to the user and ask for explicit approval:

> "Spec saved to `docs/specs/NNN-feature-slug/spec.md`. Please review — does this capture your intent correctly? Any requirements missing or misstated?"

If changes requested: update the spec and re-review.

## Step 7: Note on Branch Creation

Branch creation happens **after all documentation is complete** — at the start of `sdd-superpowers:sdd-execute`, not here. When `sdd-superpowers:sdd-execute` begins implementation, it will:
1. Read `docs/git-convention.md` for the naming convention
2. Suggest branch names based on this spec's NNN and slug
3. Create the branch with your chosen name
4. Make the doc-first commit containing all spec documents

No git action is needed here.

## Step 8: Handoff

After branch creation:

> "Specification complete and saved to `docs/specs/NNN-feature-slug/spec.md` on branch `NNN-feature-slug`.
>
> **Option A — Review the spec first:**
> Use `sdd-superpowers:sdd-review` (spec mode) for an independent completeness check before planning.
>
> **Option B — Plan directly:**
> Use `sdd-superpowers:sdd-plan` to create the implementation plan from this spec.
>
> Which would you like?"

## Rules

**Focus on WHAT, not HOW:**
- ✅ "Users must be able to filter results by date range"
- ❌ "Use a date picker component from the UI library"

**Mark ambiguity explicitly:**
- ✅ `[NEEDS CLARIFICATION: should this work offline?]`
- ❌ Assume offline is not required and skip it

**Write testable requirements:**
- ✅ "Search returns results within 200ms for queries under 1000 characters"
- ❌ "Search should be fast"

**Don't guess on business decisions:**
- If the user hasn't specified a behavior, mark it `[NEEDS CLARIFICATION]`
- Make no assumptions about authentication method, data retention, pricing, or access control

## No Placeholders

These are spec failures — never appear in a finished spec:
- "TBD", "TODO", "as appropriate", "etc."
- "Handle errors gracefully" (without specifying what graceful means)
- "Standard validation" (without specifying the rules)
- "Similar to existing feature" (name the feature and be explicit)
- Requirements that cannot be converted to a passing/failing test
