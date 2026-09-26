# Design: Merge sdd-brainstorm and sdd-research into a Tech-Lead Skill

**Date:** 2026-08-15
**Feature:** 027-merge-brainstorm-research-skill

## Problem

`sdd-brainstorm` (fuzzy idea → `design.md`, runs pre-spec) and `sdd-research` (tech investigation → `research.md`, runs post-spec) are two separate skills that both exist to answer "what should we build and how." Splitting them forces an artificial seam: idea exploration happens before the spec, technology investigation after — even though a Tech Lead does both in the same sitting, before committing to a spec. The split also means technical decisions (library choice, architecture pattern) live in a research doc with no lasting record once the feature ships, so later features can't discover or supersede prior decisions.

## Chosen Approach

Merge both skills into one: `sdd-brainstorm`, a single pre-spec phase covering idea exploration, technical investigation, and formal architecture decisions — mirroring how a Tech Lead brainstorms, researches, and commits to decisions before writing a spec.

**New artifacts (replacing `design.md` and `research.md`):**

| Artifact | Path | Content |
|---|---|---|
| PRD | `docs/specs/NNN-<feature-slug>/prd.md` | WHY (problem), WHO, WHAT (goals/non-goals), success criteria, out-of-scope. Product-level only — no tech comparison matrix. Links out to relevant ADRs. |
| ADR | `docs/adr/<NNN>-<slug>.md` | One file per significant technical decision: Title, Status, Context, Options Considered (decision matrix — criteria × options, pros/cons), Decision, Consequences, Date. |

ADRs are a durable, cross-feature log — not deleted when a feature changes. A later decision that overturns an earlier one sets `Status: Superseded by <NNN-other-slug>` on the old ADR rather than deleting it.

**Revised process:**

1. Explore context — `docs/specs/` and `docs/adr/` (for reusable prior decisions)
2. Ask clarifying questions one at a time — merges old brainstorm questions (purpose/constraints/success criteria) with old research questions (tech constraints, NFRs, integrations, security) into one interview
3. Identify which decisions warrant an ADR (see Key Design Decisions — threshold)
4. For each ADR-worthy decision: investigate options (library/framework comparison, performance, security, integration analysis — absorbed from `sdd-research`), build a decision matrix, pick one, write rationale
5. Write ADR file(s) with `Status: Proposed`
6. Write `prd.md`, linking to the ADRs
7. Spec review loop — dispatch spec-document-reviewer against `prd.md` and all its linked ADRs **together, in one pass**
8. User approval gate — on approval, flip each new ADR's status `Proposed` → `Accepted`
9. Hand off to `sdd-specify` with `prd.md` + ADR paths (fast-path: skip re-asking questions already answered)

## Trade-offs & Rationale

- **One skill instead of two** removes the artificial pre-spec/post-spec seam, but means `sdd-brainstorm` is heavier — it now owns the full "what and how" decision, not just "what." Accepted because in practice teams rarely brainstorm an idea without already weighing at least one technical option, and the two skills were already chained back-to-back in the common path (brainstorm optional → specify → research optional → plan).
- **ADRs as a separate durable log** (vs. keeping the decision matrix inline in the PRD) costs an extra file per decision, but pays off the first time a later feature needs to know "why did we pick Postgres over Mongo" without re-reading an old feature's full design doc. This is the standard ADR convention (lightweight, timestamped, status-tracked) rather than a bespoke format.
- **No back-compat shim for `sdd-research`**: the skill is deleted outright, not aliased or deprecated-in-place. All five consumers (`sdd-workflow`, `sdd-specify`, `sdd-plan`, `sdd-init`, the tech-stack steering file) are updated in the same change, so there's no dangling reference. This is a breaking change to the skill API — per `.claude/rules/yaml-config.md`, that means a MAJOR version bump (`plugin.json`: 2.12.0 → 3.0.0), not minor.
- **Re-entry for post-spec discoveries**: if `sdd-plan` discovers an unresolved technical question after the spec is written (no separate `sdd-research` to fall back to), the fallback is to invoke `sdd-brainstorm` narrowly for that single new decision — producing one more ADR — rather than blocking planning entirely.

## Key Design Decisions

- **ADR threshold**: a decision gets its own ADR file only if it's hard to reverse or has genuinely competing options (library/framework choice, architecture pattern, external integration approach, security/auth mechanism). Trivial or obvious choices are mentioned inline in the PRD narrative — no ADR file for them. This is a judgment call made during brainstorming, not a fixed rule; the skill should state its reasoning when it decides something doesn't rise to ADR level.
- **ADR filename**: `docs/adr/<NNN>-<slug>.md`, where `NNN` is the originating feature's spec number and `<slug>` is a short decision topic (e.g. `027-merge-brainstorm-research-skill` might produce `docs/adr/027-choose-adr-file-format.md` if that were itself ADR-worthy). Multiple ADRs can share the same `NNN` prefix.
- **Historical artifacts are not migrated**: existing `docs/specs/*/design.md` and `research.md` files from past features are left as-is. The new `prd.md` / `docs/adr/` convention applies only to features brainstormed after this change ships.
- **Reviewer scope**: one spec-document-reviewer dispatch per brainstorm session, checking `prd.md` and all its linked ADRs together for consistency — not one dispatch per ADR.
- **Skill name unchanged**: stays `sdd-brainstorm` despite the expanded scope, to minimize churn in the skill map. `sdd-research` as a skill name and directory is deleted entirely; its investigation-method content (library comparison, performance analysis, security review, integration research guides) is folded into `skills/sdd-brainstorm/reference.md`.

## Out of Scope

- Migrating or backfilling ADRs for decisions already recorded in old `design.md`/`research.md` files from prior features
- Tooling to auto-detect ADR supersession (e.g. flagging when a new ADR contradicts an old one) — superseding is a manual step the skill prompts for, not automated
- Changes to `sdd-spec-update`, `sdd-review`, `sdd-execute`, or any skill downstream of `sdd-plan` — this change only affects the pre-spec phase and its immediate consumers
