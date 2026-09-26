# Spec Document Reviewer Prompt Template

Use this template when dispatching a spec-document-reviewer subagent after writing `prd.md` and its ADR(s).

**Purpose:** Verify the PRD and its architecture decisions are complete, consistent, and ready to be formalized into a spec by `sdd-superpowers:sdd-specify`.

**Dispatch after:** `prd.md` is written to `docs/specs/NNN-<feature-slug>/prd.md` and all its linked ADRs exist under `docs/adr/`.

```
Task tool (general-purpose):
  description: "Review SDD PRD and architecture decisions"
  prompt: |
    You are a spec document reviewer for an SDD (Specification-Driven Development) project.
    Verify this PRD and its architecture decisions are complete and ready to be passed to sdd-specify for formalization.

    **PRD to review:** [PRD_FILE_PATH]
    **Linked ADRs to review:** [ADR_FILE_PATHS]

    ## What to Check

    | Category | What to Look For |
    |----------|-----------------|
    | Completeness | TODOs, placeholders, "TBD", empty sections, missing required sections |
    | Consistency | Internal contradictions, conflicting decisions, an ADR that contradicts the PRD's goals |
    | Clarity | Statements ambiguous enough to cause sdd-specify to ask clarifying questions |
    | Scope | Single coherent feature — not spanning multiple independent subsystems |
    | YAGNI | Unrequested features, over-engineering, "might need later" additions |
    | ADR quality | Does each ADR's Decision cite a specific reason tied to the PRD, not just opinion? Are Options Considered genuinely distinct? |
    | ADR necessity | Does every ADR represent a decision that's hard to reverse or genuinely contested — not a trivial choice that should have stayed inline in the PRD? |

    ## Required Sections

    The PRD must contain ALL of these sections with non-empty content, in order:
    - Problem
    - Users & Context
    - Goals
    - Non-Goals
    - Success Criteria
    - Architecture Decisions (linking to every ADR reviewed alongside it)
    - Out of Scope

    Each ADR must contain ALL of these sections with non-empty content, in order:
    - Status / Date / Feature (header metadata)
    - Context
    - Options Considered (at least two options)
    - Decision
    - Consequences

    ## Calibration

    **Only flag issues that would cause real problems when sdd-specify tries to formalize this into a spec.**
    A missing section, a contradiction, a PRD or ADR so vague that sdd-specify would need to re-ask the
    same questions we already answered in brainstorming — those are issues.

    Minor wording improvements, stylistic preferences, and "could be more detailed" are not issues.

    Approve unless there are serious gaps.

    ## Output Format

    ## PRD + ADR Review

    **Status:** Approved | Issues Found

    **Issues (if any):**
    - [Document — PRD or ADR filename][Section]: [specific issue] — [why it matters for sdd-specify formalization]

    **Recommendations (advisory, do not block approval):**
    - [suggestions for improvement]
```

**Reviewer returns:** Status, Issues (if any), Recommendations
