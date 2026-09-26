---
name: feedback-review-intermediate-phase-state
description: When a code-quality reviewer flags a multi-phase same-session skill-file build as internally inconsistent, check whether the issue resolves by the final phase before acting on it
metadata:
  type: feedback
---

When executing a plan that builds a single Markdown skill file across several sequential phases in one sdd-execute session (e.g. inserting Operation E.1, then E.2, then E.3... into `reference.md` one phase at a time), a code-quality reviewer dispatched after an early phase will sometimes flag the intermediate commit as "inconsistent" — forward references to sections that don't exist yet, a menu option mentioned before the menu is updated, a structural style that doesn't yet match the rest of the file. These are not defects; they are the expected, transient state of a document under construction within a single feature build.

**Why:** The reviewer subagent only sees the diff and file state at that moment — it has no visibility into the fact that later phases in the same session will complete the reference. Only the FINAL state (after the last phase's commit and the plan's Integration Verification step) needs to be self-consistent; that's what gets merged and read by users. Blindly sending every such finding back for a "fix" wastes a review cycle and can even push the implementer toward defensive hedging text ("to be added later") that has to be removed again once the next phase lands.

**How to apply:** Before dispatching a fix, ask: does this finding describe a problem with what THIS phase built, or does it describe the fact that later phases (already planned, same session) haven't landed yet? If the latter, push back with that reasoning (per `sdd-superpowers:receiving-code-review`) and note it will resolve once the remaining phases complete — then verify at final Integration Verification that it in fact did. Distinguish this from genuine defects (e.g. a missing markdown language tag, a stale operation-count reference after all phases landed) which are real and should always be fixed.
