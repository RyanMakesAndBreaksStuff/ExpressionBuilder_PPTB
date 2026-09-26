---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing
---

# Verification Before Completion

## Overview

<examples>
<example>
<context>Implementation is written and the user is about to say "that should be done."</context>
<correct>Invoke verification-before-completion. Run the test suite now, in this session, and report the actual output before claiming completion.</correct>
<incorrect>Say "looks good, tests should pass" based on code review alone — passing tests must be observed, not inferred.</incorrect>
</example>
<example>
<context>User says "tests passed earlier in the session, so we're good."</context>
<correct>Earlier results are stale. Run the suite again against the current state of the code before claiming done.</correct>
<incorrect>Accept the earlier run as sufficient — code may have changed since then, and stale evidence is not verification.</incorrect>
</example>
</examples>

Claiming work is complete without running verification is dishonesty, not efficiency.

**Iron Law:** No completion claim without fresh verification evidence.

**Violating the letter of this rule is violating the spirit of this rule.**

**Announce at start:** "I'm using the verification-before-completion skill before making any claim."

## When to Use

**ALWAYS before:**
- Any success or completion claim — "done", "fixed", "passing", "works"
- Any expression of satisfaction ("Great!", "Perfect!", "Done!")
- Committing, creating a PR, or marking a task complete
- Moving to the next task or delegating to agents

**Rule applies to:** Exact phrases, paraphrases, implications, and any wording suggesting completion.

## Quick Reference

**The Gate Function — run before any claim:**

```
1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, not a prior run)
3. READ: Full output — check exit code, count failures
4. VERIFY: Does output confirm the claim?
5. ONLY THEN: Make the claim
```

**Common Failures:**

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Command output: 0 failures | Previous run, "should pass" |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Agent completed | VCS diff shows changes | Agent reports "success" |
| Requirements met | Line-by-line checklist | Tests passing |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| "Should work now" | Run the verification command |
| "I'm confident this is correct" | Confidence ≠ evidence — run it |
| "Linter passed" for a build claim | Linter ≠ compiler |
| Trusting agent success reports | Verify independently via VCS diff |
| Partial verification ("ran some tests") | Full suite, full output |
| "Just this once" | No exceptions, ever |

**REQUIRED READING before proceeding:** [reference.md](reference.md) — rationalization patterns, red flags, TDD red-green verification, and why this matters.

## Constraints

- Does NOT accept past test runs as current verification — evidence must be fresh, from the current HEAD
- Does NOT claim completion, "done", "fixed", or "passing" without running verification in this session
- Does NOT treat visual inspection of code as equivalent to a passing test run

## Error Handling

- **No automated test suite exists**: Document what was manually verified with exact steps performed and observed output — do not skip the verification section.
- **CI results referenced instead of local run**: Acceptable only if CI ran on the current HEAD commit; state the commit SHA and CI job URL in the completion claim.
- **User requests gate bypass**: The gate is "no completion claim without fresh evidence." Explain that claiming done without running tests means the claim cannot be trusted. Offer to run the suite — it is one command.
