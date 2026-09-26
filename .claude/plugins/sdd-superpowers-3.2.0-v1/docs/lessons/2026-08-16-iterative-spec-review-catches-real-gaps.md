---
date: 2026-08-16
spec: "029"
tags: [brainstorm, spec-review, prd, adr]
---

# Lesson: Iterative brainstorm spec-review loop caught 3 distinct real gaps

## Context

Brainstorming feature 029 (custom skill integrations for the SDD workflow). After writing `prd.md` and `docs/adr/029-custom-skill-integration-architecture.md`, the `sdd-brainstorm` skill's spec-review loop dispatched a fresh reviewer subagent up to 3 times, fixing issues between rounds.

## What happened

Each of the three review rounds found one distinct, real, non-cosmetic gap:
1. Round 1: the PRD claimed the feature touched "sdd-init's project scaffolding" but never specified what that meant, and it was in unstated tension with a Success Criterion promising zero overhead when no manifest exists.
2. Round 2 (after fixing #1): the manifest's exact column schema (`Trigger Skill | Custom Skill | Purpose`) was implied across the ADR but never enumerated in one place — three different downstream consumers (`sdd-init`, `sdd-integrations`, the hook) would each have had to guess or diverge.
3. Round 3 (after fixing #2, hitting the 3-iteration cap): multi-match confirmation behavior (what happens when 2+ custom skills register against the same trigger) was asserted as a Goal but never specified at the mechanism level.

Each fix was a one-paragraph addition, not a rework — but each was a real ambiguity that would have forced `sdd-specify` to stop and ask the same question again, or worse, let `sdd-plan`/implementers guess independently and diverge.

## What to do next time

Don't treat the spec-review loop as a formality to satisfy before moving on — read each round's findings as genuine signal. When the loop hits its 3-iteration cap with a small, unambiguous fix remaining (not a new design decision), it's reasonable to apply that fix directly and proceed to the user review gate rather than re-dispatching a 4th automated round, but say so explicitly so the human knows a review cycle was skipped.

## Signals to watch for

A reviewer finding that names a specific missing enumeration, an unstated interaction between two already-approved requirements, or a "Goal" that has no corresponding mechanism described anywhere — these are the pattern of gap this loop catches well. A reviewer finding that's purely about wording or emphasis is not this pattern and can be weighed less heavily.
