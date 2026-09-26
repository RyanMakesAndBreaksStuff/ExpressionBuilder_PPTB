---
name: requesting-code-review
description: Use when the user asks for a code review directly, before merging to main, or after completing a major feature
model: sonnet
effort: high
---

# Requesting Code Review

## Overview

<examples>
<example>
<context>Phase 1 implementation is complete and all tests pass. User is ready to move to Phase 2.</context>
<correct>Invoke requesting-code-review. Dispatch a code-reviewer subagent with the diff, spec, and plan as context before proceeding to Phase 2.</correct>
<incorrect>Continue to Phase 2 immediately — the code looks clean and a review would slow us down.</incorrect>
</example>
<example>
<context>User says "the code looks good to me, let's just merge."</context>
<correct>The author's review is not a substitute for structured review. Invoke requesting-code-review to dispatch a fresh reviewer subagent with no session bias.</correct>
<incorrect>Merge without dispatching a reviewer — the author cannot objectively catch their own blind spots.</incorrect>
</example>
</examples>

Dispatch a `sdd-superpowers:code-reviewer` subagent with precisely crafted context to catch issues before they cascade. The reviewer gets the work product, not your session history — keeping review focused and your context uncluttered.

This is a standalone, ad hoc review — SDD's execution flow (`sdd-superpowers:sdd-execute`) does not call this skill per unit or per phase; TDD is the quality gate during execution, and `sdd-superpowers:sdd-review` (Mode B) is the one spec-alignment check afterward. Use this skill when a human asks for a review directly, or as an optional pre-merge sanity check.

**Core principle:** Review early, review often.

**Announce at start:** "I'm using the requesting-code-review skill to get a code review."

## When to Use

**Mandatory:**
- User says "review this" / "can you review"
- Before merge to main
- After completing a major feature

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing a complex bug

**NOT** a substitute for running tests — always verify tests first.

## Quick Reference

**1. Get git SHAs:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Dispatch `sdd-superpowers:code-reviewer` subagent with:**
- `{WHAT_WAS_IMPLEMENTED}` — what you just built
- `{PLAN_OR_REQUIREMENTS}` — what it should do
- `{BASE_SHA}` / `{HEAD_SHA}` — commit range
- `{DESCRIPTION}` — brief summary

**3. Act on feedback:**
- **Critical:** Fix immediately
- **Important:** Fix before proceeding
- **Minor:** Note for later
- **Wrong:** Push back with technical reasoning

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Skipping review because "it's simple" | If the user asked for a review, dispatch the structured reviewer — don't substitute an ad hoc read |
| Ignoring Critical issues | Fix immediately — do not proceed |
| Proceeding with unfixed Important issues | Fix before merging or moving on |
| Accepting wrong feedback without pushback | Use technical reasoning and show evidence |

See template at: `requesting-code-review/code-reviewer.md`

## Integration

**Called by:**
- The user, directly ("review this" / "can you review")
- Anyone wanting an optional pre-merge or post-feature sanity check

**After review:**
- Critical/Important issues → `sdd-superpowers:receiving-code-review` to implement fixes, then re-dispatch this reviewer
- All issues resolved → proceed with whatever prompted the review (e.g. merging)

## Constraints

- Does NOT give an ad-hoc inline review (reading the diff and commenting without subagent dispatch) — this skill dispatches a structured code-reviewer subagent
- Does NOT skip the dispatch step even when the author believes the code is correct
- Does NOT review code that has failing tests — tests must pass before review is meaningful

## Error Handling

- **No GitHub PR exists**: Run the review against the local diff; note the absence of a PR in the context passed to the reviewer subagent.
- **Tests are failing**: Halt. Fix failing tests before requesting review — a review of broken code produces misleading findings.
- **User requests gate bypass**: The gate is "structured review before merge." Explain that bypassing review is how regressions ship. Offer to dispatch the reviewer — it runs in the background and does not block other work.
