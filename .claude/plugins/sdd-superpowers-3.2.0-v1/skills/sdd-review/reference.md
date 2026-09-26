# SDD Review: Full Procedure Reference

> Complete Mode A and Mode B procedures. See [SKILL.md](SKILL.md) for the summary.

## Step 0: Load Steering Context

Scan `.claude/memory/steering/` for `.md` files whose `loaded-by` frontmatter includes `sdd-review`. Read each matched file and incorporate its content as context before producing any user-facing output. Loading is silent — no announcement to the user.

If `.claude/memory/steering/` does not exist, or no files contain `sdd-review` in `loaded-by`, proceed without change.

Rescan on every invocation — custom files added after init are discovered automatically.

## Mode A: Spec Review

### Step 1: Read the Spec

Read `docs/specs/<NNN>-<feature-slug>/spec.md` in full.

### Step 2: Completeness Check

Work through each section systematically:

**Problem Statement:**
- [ ] Is the problem specific enough to define scope?
- [ ] Does it explain who is affected and why it matters?

**Goals:**
- [ ] Are all goals measurable? ("users can search" → measurable; "better UX" → not measurable)
- [ ] Does achieving all goals equal a successful feature?

**Non-Goals:**
- [ ] Are there obvious adjacent features not explicitly excluded?
- [ ] Could a developer reasonably think an out-of-scope feature was required?

**User Stories:**
- [ ] Does each story have acceptance criteria?
- [ ] Is each acceptance criterion testable (can be written as a passing/failing automated test)?
- [ ] Are there edge cases missing? (empty states, error states, permission boundaries)

**Functional Requirements:**
- [ ] Does every user story map to at least one FR?
- [ ] Are there any FRs with no corresponding user story? (scope creep risk)
- [ ] Are "must" and "must not" statements specific enough to implement?

**Non-Functional Requirements:**
- [ ] Are performance targets concrete? (`< 200ms` vs. "should be fast")
- [ ] Are security requirements specific? ("authenticated users only" vs. "secure")

**Error Scenarios:**
- [ ] Does the spec cover: invalid input, missing data, permission denied, service failures?
- [ ] Is the expected behavior for each error scenario defined?

**Open Questions:**
- [ ] Are all `[NEEDS CLARIFICATION]` items truly open, or can they be answered from context?
- [ ] Are these questions blocking implementation or can they be deferred?

### Step 3: Ambiguity Scan

Search for these red flags:
- Vague quantifiers: "fast", "good", "appropriate", "reasonable", "standard"
- Implicit assumptions: "obviously", "of course", "as usual"
- Missing subjects: "should validate" (validate what? validate how?)
- Undefined terms: domain vocabulary used without definition

For each red flag found: either resolve it or add a `[NEEDS CLARIFICATION]` marker.

### Step 4: Implementation Feasibility Check

Would a skilled developer be able to implement this spec without asking questions?

Check for:
- [ ] All inputs and outputs defined for every user interaction
- [ ] Data relationships implied but not stated (if spec mentions "user's orders", is a User-Order relationship defined?)
- [ ] State transitions clear (if something can be "active" or "inactive", what triggers transitions?)

### Step 5: Report

```
## Spec Review: <Feature Name>

### Overall Assessment
<READY TO PLAN | NEEDS REVISION>

### Issues Found

#### Critical (blocking)
- <Specific issue> — Location: <section>
  Suggested fix: <concrete suggestion>

#### Important (should fix before planning)
- <Specific issue> — Location: <section>
  Suggested fix: <concrete suggestion>

#### Minor (can address during planning)
- <Specific issue> — Location: <section>

### Confirmed Complete
- [ ] All user stories have acceptance criteria ✓
- [ ] Performance requirements are measurable ✓
- [ ] Error scenarios are defined ✓
- ...
```

---

## Mode B: Implementation Review

### Step 1: Load All Artifacts

Read:
1. `docs/specs/<NNN>-<feature-slug>/spec.md`
2. `docs/specs/<NNN>-<feature-slug>/plan.md`
3. `docs/specs/<NNN>-<feature-slug>/tasks.md`
4. All source files referenced in the plan
5. All test files referenced in the plan

### Step 2: Requirements Coverage

For every acceptance criterion in the spec:
- Find the test that verifies it
- Confirm that test passes
- Confirm the test actually exercises the production code path (not a mock of it)

Build a coverage matrix:

| Acceptance Criterion | Test File:Line | Status |
|---------------------|----------------|--------|
| <AC text> | `tests/path/test.ts:42` | PASS / MISSING / FAILING |

### Step 3: Spec Drift Detection

Check for implementation decisions that weren't in the spec:

**Extra functionality:** Does the code do anything the spec doesn't require? (not always bad, but should be explicit)

**Missing functionality:** Is anything in the spec not implemented?

**Behavior differences:** Does the implementation behave differently from the spec for any scenario?
- Different error messages than spec defines
- Different response shapes than contracts specify
- Different validation rules than FRs define

### Step 4: Contract Validation

For every API contract in `contracts/`:
- [ ] Request shape matches what the implementation accepts
- [ ] Response shape matches what the implementation returns
- [ ] All error codes are implemented and triggered by the documented conditions

### Step 5: Non-Functional Requirements Check

For each NFR in the spec:
- **Performance:** Were performance tests run? Do they pass?
- **Security:** Is authentication/authorization implemented as specified?
- **Reliability:** Are error handling and recovery implemented?

### Step 6: Report

```
## Implementation Review: <Feature Name>

### Overall Assessment
<SPEC-ALIGNED | DRIFT DETECTED | INCOMPLETE>

### Coverage Matrix

| Requirement | Status | Notes |
|-------------|--------|-------|
| <FR-1 or AC> | ✓ Covered | |
| <FR-2 or AC> | ✗ Missing | No test found |
| <FR-3 or AC> | ⚠ Partial | Test exists but doesn't cover edge case |

### Drift Issues

#### Implementation Exceeds Spec (undocumented features)
- <What was built that wasn't specified>
  Decision needed: update spec to document, or remove from implementation?

#### Implementation Falls Short of Spec (missing features)
- <What was specified but not implemented>
  Action: implement or defer with explicit scope change?

#### Behavior Differences
- <Spec says X, implementation does Y>
  Action: fix implementation or update spec?

### Recommended Actions

1. <Specific action with file reference>
2. <Specific action with file reference>

### Confirmed Aligned
- ✓ <requirement that is correctly implemented>
```

### Step 7: Run Tests and Verify

Before issuing any verdict, run the test suite and read the output:

```bash
# Run the full test suite — read every line of output
<project test command>
```

Confirm:
- [ ] Test command was run in this session (not from memory)
- [ ] Exit code read (0 = pass, non-zero = failures)
- [ ] Failure count: 0 failures required for SPEC-ALIGNED verdict
- [ ] All contract tests passing (if contracts exist)

**Do not issue a SPEC-ALIGNED verdict without running tests and reading output.**

### Step 8: Handoff

If SPEC-ALIGNED:
> "Implementation review complete — coverage matrix built, tests run (`<N> passing, 0 failing`), all requirements covered. Implementation matches spec.
>
> Ready to integrate. Use `sdd-superpowers:finishing-a-development-branch` to choose merge, PR, or cleanup."

If DRIFT DETECTED or INCOMPLETE:
> "Review found issues (see report above). Address them, then re-run `sdd-superpowers:sdd-review` to confirm alignment before merging. Use `sdd-superpowers:systematic-debugging` if any failures have unclear root causes."

---

## Review Quality Standards

**Cite specific locations:** Every issue must reference the spec section AND the code file/line where the problem is found. "The spec says X in FR-3, but the implementation in `src/auth.ts:47` does Y."

**Distinguish facts from opinions:** "This function is missing the null check required by FR-2" is a fact. "This could be written more cleanly" is an opinion. Report only facts.

**Don't suggest refactoring:** The review's job is spec-implementation alignment, not code quality. If code is technically correct and matches the spec, it passes review.

---

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| "Spec is complete" | Section-by-section checklist with results | Skimming and feeling good |
| "Implementation matches spec" | Coverage matrix with test file:line for each FR | Tests passing |
| "Contracts are correct" | Running contract tests, reading output | Code looks right |
| "All ACs covered" | Test for each AC confirmed passing | Assuming coverage from test count |
