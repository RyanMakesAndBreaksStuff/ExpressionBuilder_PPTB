---
name: receiving-code-review
description: Use when receiving code review feedback, before implementing review suggestions
model: sonnet
effort: high
---

# Code Review Reception

## Overview

<examples>
<example>
<context>A code reviewer returns a finding: "the retry logic in fetch.ts is missing exponential backoff."</context>
<correct>Invoke receiving-code-review. Triage the finding: verify it against the spec, confirm the current code, assess severity, then decide to implement, defer, or reject with rationale.</correct>
<incorrect>Immediately implement the backoff change without triaging — the spec may not require it, making it scope creep.</incorrect>
</example>
</examples>

Code review requires technical evaluation, not emotional performance. Verify before implementing. Ask before assuming. Technical correctness over social comfort.

## When to Use

- Receiving feedback from a human partner or external reviewer
- After `sdd-superpowers:sdd-review` (Mode B) returns issues during `sdd-superpowers:sdd-execute`'s follow-up loop
- After `sdd-superpowers:requesting-code-review` returns issues in an ad hoc review
- Before implementing any review suggestion (especially if it seems unclear or wrong)
- NOT for general debugging or self-review

## Quick Reference

Response pattern:
1. **READ** — Complete feedback without reacting
2. **UNDERSTAND** — Restate requirement in own words (or ask)
3. **VERIFY** — Check against codebase reality
4. **EVALUATE** — Technically sound for THIS codebase?
5. **RESPOND** — Technical acknowledgment or reasoned pushback
6. **IMPLEMENT** — One item at a time, test each

**Forbidden responses:**
- "You're absolutely right!" / "Great point!" — performative, never use
- "Let me implement that now" — never before verification
- Any gratitude expression — actions speak; just fix it

**Unclear feedback:** Stop. Ask for clarification on ALL unclear items before implementing any. Partial understanding = wrong implementation.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Performative agreement | State requirement or just act |
| Blind implementation | Verify against codebase first |
| Implementing without testing | One item at a time, test each |
| Avoiding pushback | Technical correctness > comfort |
| Partial implementation | Clarify all items first |
| Can't verify, proceed anyway | State limitation, ask for direction |

Push back when suggestion breaks functionality, reviewer lacks context, violates YAGNI, or conflicts with prior architectural decisions. Use technical reasoning, not defensiveness.

**REQUIRED READING before proceeding:** [reference.md](reference.md) — source-specific handling (human partner vs. external reviewers), YAGNI check procedure, implementation ordering, pushback technique, and real examples.

## Constraints

- Does NOT implement review feedback without first verifying the finding against the spec and current code
- Does NOT accept all findings uncritically — findings may be outside spec scope or based on misread code
- Does NOT reject findings without documented rationale

## Error Handling

- **Feedback is ambiguous or references code that does not match current state**: Ask the reviewer for clarification before classifying or implementing.
- **Finding conflicts with an approved spec decision**: Note the conflict; defer to the spec unless the user decides to update it via sdd-spec-update.
- **User requests gate bypass**: The gate is "verify before implementing review feedback." Explain that unverified feedback may introduce scope creep or incorrect changes. Offer to triage one finding at a time.
