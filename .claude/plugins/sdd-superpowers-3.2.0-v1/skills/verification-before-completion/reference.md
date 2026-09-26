# Verification Before Completion: Full Reference

> Rationalization patterns, key examples, and why this matters. See [SKILL.md](SKILL.md) for the summary.

## Red Flags — STOP

Stop if you notice any of these thoughts:

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!")
- About to commit/push/PR without running the command
- Trusting an agent's success report
- Relying on partial verification
- Thinking "just this once"
- Tired and wanting work to be over
- **ANY wording implying success without having run verification**

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter ≠ compiler |
| "Agent said success" | Verify independently |
| "I'm tired" | Exhaustion ≠ excuse |
| "Partial check is enough" | Partial proves nothing |
| "Different words so rule doesn't apply" | Spirit over letter |

## Key Patterns

**Tests:**
```
✅ [Run test command] [See: 34/34 pass] → "All tests pass"
❌ "Should pass now" / "Looks correct"
```

**Regression tests (TDD Red-Green):**
```
✅ Write test → Run (FAIL) → Revert fix → Run (MUST FAIL) → Restore fix → Run (PASS)
❌ "I've written a regression test" (without red-green verification)
```

**Build:**
```
✅ [Run build] [See: exit 0] → "Build passes"
❌ "Linter passed" (linter doesn't check compilation)
```

**Requirements:**
```
✅ Re-read plan → Create checklist → Verify each item → Report gaps or completion
❌ "Tests pass, phase complete"
```

**Agent delegation:**
```
✅ Agent reports success → Check VCS diff → Verify changes exist → Report actual state
❌ Trust agent report without checking
```

## Why This Matters

From documented failures:
- Human partner said "I don't believe you" — trust broken
- Undefined functions shipped — would crash in production
- Missing requirements shipped — incomplete features delivered
- Time wasted on false completion → redirect → rework

Core value: **Honesty is non-negotiable. Evidence before assertions, always.**
