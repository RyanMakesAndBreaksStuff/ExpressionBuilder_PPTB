# Design: Improve Skill Trigger Routing in SDD Workflow

**Date:** 2026-05-30
**Feature:** 010-improve-skill-trigger-routing

## Problem

Four bundled skills fail to trigger reliably in practice:

- **`test-driven-development`** — not invoked when implementation starts (the trigger "Any implementation task" is too abstract; agents rationalize it away with "this is just a small change")
- **`requesting-code-review`** — not invoked when the user says "can you review this" (the trigger "Phase boundary during execution" doesn't match how users phrase review requests)
- **`receiving-code-review`** — not invoked when review feedback arrives (the trigger "Implementing fixes after review feedback" is too narrow; agents skip it when feedback comes from a human rather than a reviewer subagent)
- **`systematic-debugging`** — not invoked when unexpected behavior is observed or before proposing a fix (trigger "Task fails OR unexpected behavior" still leaves room to rationalize "I already know the fix")

Root cause: the Quick Reference trigger descriptions in `sdd-workflow/SKILL.md` are **situational** ("Phase boundary during execution") and the routing rules in `routing.md` have no language pattern matching. Agents can rationalize away situational triggers but struggle to rationalize away concrete action-based triggers and exact phrase matches.

Spec 007 fixed alignment inside the bundled skill files. This feature fixes the **sdd-workflow routing layer** — the entry point where skills are selected.

## Chosen Approach

**B + C combined:** Language pattern triggers in `routing.md` (Approach B) + agent pre-action red flags in `sdd-workflow/SKILL.md` (Approach C).

### Approach B — New "Trigger Language" section in `routing.md`

Add a `## Trigger Language` section after the full Skill Map table. Two sub-tables:

**User-language triggers** (exact phrase patterns → skill):

| If the user says… | Invoke |
|-------------------|--------|
| "review this", "can you review", "take a look", "LGTM?", "what do you think of this code" | `sdd-superpowers:requesting-code-review` |
| Pastes review feedback, "the reviewer said", "based on this feedback", "fixing review comments" | `sdd-superpowers:receiving-code-review` |
| "it's not working", "getting an error", "this fails", "weird behavior", "why is X happening" | `sdd-superpowers:systematic-debugging` |

**Agent-action triggers** (before the agent acts → skill fires first):

| Before the agent… | Invoke |
|-------------------|--------|
| Writes any implementation code (new function, class, fix, modification) | `sdd-superpowers:test-driven-development` |
| Proposes or applies any fix for a failure or unexpected behavior | `sdd-superpowers:systematic-debugging` |
| Moves to the next implementation phase | `sdd-superpowers:requesting-code-review` |
| Implements any change from review feedback | `sdd-superpowers:receiving-code-review` |

### Approach C — Updated Quick Reference + new Common Mistakes in `sdd-workflow/SKILL.md`

**Updated Quick Reference rows** (action-based, not situational):

| Skill | Before | After |
|-------|--------|-------|
| `systematic-debugging` | "Task fails OR unexpected behavior (before proposing any fix)" | "Test fails, error appears, unexpected behavior, OR before proposing any fix" |
| `requesting-code-review` | "Phase boundary during execution, OR after spec compliance passes per task" | "User says 'review this'/'can you review', OR at any phase boundary" |
| `receiving-code-review` | "Implementing fixes after review feedback" | "Review feedback received (from human or reviewer subagent) — before implementing any change" |
| `test-driven-development` | "Any implementation task — subagent OR direct (write failing test first)" | "Before writing any implementation code — subagent or direct" |

**Four new Common Mistakes entries:**
- Writing implementation code before invoking `test-driven-development` — "I'll write the test after" is the rationalization
- Responding to "review this" without invoking `requesting-code-review` — the skill dispatches a structured reviewer, not an ad-hoc read
- Implementing review feedback without invoking `receiving-code-review` — the skill enforces verify-before-implement
- Proposing a fix without first invoking `systematic-debugging` — symptom fix without root cause = regression risk

## Trade-offs & Rationale

**Why B+C over A alone:** Approach A (refining trigger descriptions only) has the same weakness as the current text — agents can still rationalize past abstract situational language. B+C adds two independent enforcement layers: phrase matching (hard to argue "the user said 'review this' but that's not really a review request") and action-based red flags (hard to argue "I'm not really writing implementation code").

**Why not Approach A:** Too weak for TDD, which is the most frequently skipped skill. The pattern "Any implementation task" has been in the file since 007 and still doesn't fire reliably.

**Cost of B+C:** ~30 lines added across 2 files. No new files, no new skills, no changes to bundled skill files themselves.

## Key Design Decisions

1. **Phrase matching lives in `routing.md`, not `SKILL.md`** — SKILL.md is loaded on every invocation and must stay concise. Phrase tables belong in routing.md which is read when more detail is needed.
2. **Common Mistakes in SKILL.md use the rationalization pattern** — each entry names the specific excuse ("I'll write the test after") to intercept the thought at the moment it occurs, matching the style of `using-superpowers` red flags.
3. **Two sub-tables in Trigger Language** — user-language and agent-action are distinct: user-language fires on what was said, agent-action fires on what the agent is about to do. Keeping them separate avoids ambiguity.
4. **Quick Reference row updates are minimal** — only reword to be more concrete; don't add prose. The table must stay scannable.

## Out of Scope

- Updating any bundled skill SKILL.md files (spec 007 already did that)
- Adding new bundled skills
- Changing the SDD workflow order or methodology
- Updating skill frontmatter `description:` fields
- Changes to any file outside `sdd-workflow/SKILL.md` and `sdd-workflow/routing.md`
