# Adopt Superpowers v6.0-v6.3 Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backport the upstream `obra/superpowers` v6.0.0 → v6.3.0 improvements that fit our architecture into the sdd-superpowers skillset, without adopting the per-task-reviewer-subagent machinery our `subagent-driven-development` intentionally doesn't have.

**Architecture:** Eight workstreams: `sdd-execute` (stop-condition rewrite), `subagent-driven-development` (conflict scan/batching/no-spawn), `sdd-plan` (Global Constraints/Interfaces/right-sizing), `sdd-brainstorm` visual companion (security port), `test-driven-development` (reference rewrite), `writing-skills` (two new sections), `finishing-a-development-branch` (three bug fixes), and a style pass (two files). Tasks 1, 3, 4, 5, 7 touch disjoint files and are safe to dispatch in any order, including in parallel groups. Task 8 shares `skills/subagent-driven-development/SKILL.md` with Task 2 and `skills/writing-skills/SKILL.md` with Task 6 — it edits sections neither of those tasks touches (no content conflict), but must be committed after both, per this skill's own guidance to sequence tasks that share a file (see `sdd-superpowers:subagent-driven-development` Error Handling). Recommended order: {1, 2, 3, 4, 5, 6, 7} in parallel groups, then 8 last.

**Tech Stack:** Markdown skill files, YAML frontmatter, Node.js (`server.cjs`) and Bash (`start-server.sh`/`stop-server.sh`) for the visual companion. No unit-test framework exists for skill content — per this repo's own precedent (`docs/specs/027-merge-brainstorm-research-skill/plan.md`), each task's red/green cycle is a `grep`/`diff` assertion pair: confirm the old text is present before the edit (red), confirm the new text is present / old text is gone after (green).

**Spec:** `docs/specs/028-adopt-superpowers-v6-improvements/design.md`

## Global Constraints

- Every `SKILL.md` frontmatter: `name` + `description` starting with `"Use when..."`, total frontmatter under 1024 chars (`.claude/rules/skill-writing.md`)
- Skill body: exactly one `# Heading`, `##` for sections, `###` for subsections, never skip levels (`.claude/rules/skill-writing.md`, `.claude/rules/markdown-conventions.md`)
- Never reference other skills with `@path/to/file.md` — reference by skill name only, e.g. `sdd-superpowers:sdd-execute` (`.claude/rules/skill-writing.md`)
- All non-root markdown files: `kebab-case.md` (`.claude/rules/markdown-conventions.md`)
- Bash scripts: `#!/usr/bin/env bash` + `set -euo pipefail`, quoted `"${var}"`, `$()` not backticks, `[[ ]]` conditionals, `local` for function-scoped vars, `mktemp` + `trap ... EXIT` for temp files (`.claude/rules/bash-scripting.md`) — applies to any hand-edited script in Task 4; the ported upstream scripts are already compliant (verify, don't rewrite)
- No placeholders: no "TBD", "TODO", "implement later", or vague "handle appropriately" text in any written file
- No `plugin.json` version bump required — no new skill added, no breaking skill/hook API change (`.claude/rules/yaml-config.md` only mandates a bump for those two cases)
- Fetched upstream source lives at `/home/a5152154/.claude/jobs/525ac86c/tmp/superpowers-v630/` (v6.3.0 tarball, already extracted) — read from there, do not re-fetch

---

### Task 1: `sdd-execute` — rulings, not stalls

**Files:**
- Modify: `skills/sdd-execute/SKILL.md` (the `## When to Stop and Ask` section)

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: nothing consumed by other tasks (independent file)

- [ ] **Step 1: Write the failing check**

```bash
grep -c "An instruction in the plan is unclear or contradictory" skills/sdd-execute/SKILL.md
grep -c "Ruling:" skills/sdd-execute/SKILL.md
```

Expected: first command prints `1` (old blanket-stop bullet still present), second prints `0` (ruling language absent).

- [ ] **Step 2: Run it, confirm the pre-edit state**

Run both commands above. Confirm exactly that output before touching the file.

- [ ] **Step 3: Replace the section**

Replace the entire `## When to Stop and Ask` section (currently the bullet list starting "A dependency is missing or broken" through "Ask for clarification rather than guessing. Don't force through blockers.") with:

```markdown
## When to Stop and Ask

Four things stop execution — nothing else:

- An irreversible or destructive operation
- A security-sensitive action
- A side effect outside the current worktree that norms say you ask about
  first (a merge, a push to a shared branch, a publish)
- A plan so broken that every path forward is a guess

Everything else — an unclear instruction, a plan gap, a conflict between two
work units, a cap you'd otherwise ask to exceed — gets a ruling, not a stop.
Decide it yourself: the spec is the binding authority, the plan is its
argument, and your judgment settles what neither answers. Record every
ruling in TodoWrite (or the commit message for the unit it affects) as
`Ruling: <what you decided> — <why> — <what it costs if wrong>`, and keep
executing. A wrong ruling costs rework your human partner can see and undo;
a session parked on a question costs their whole day and buys nothing.

For the four things above: stop and ask.
```

- [ ] **Step 4: Run the checks again to verify green**

```bash
grep -c "An instruction in the plan is unclear or contradictory" skills/sdd-execute/SKILL.md
grep -c "Ruling:" skills/sdd-execute/SKILL.md
```

Expected: first command prints `0`, second prints `1` or more.

- [ ] **Step 5: Commit**

```bash
git add skills/sdd-execute/SKILL.md
git commit -m "feat(sdd-execute): stop only for irreversible/destructive/security/unrecoverable cases"
```

---

### Task 2: `subagent-driven-development` — conflict scan, batching, no-subagent-spawning

**Files:**
- Modify: `skills/subagent-driven-development/SKILL.md`
- Modify: `skills/subagent-driven-development/implementer-prompt.md`

**Interfaces:**
- Consumes: the term "Global Constraints block" from Task 3's `sdd-plan` output (referenced by name only — this task does not read `sdd-plan`'s files, it just names the convention in prose)
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Write the failing checks**

```bash
grep -c "Pre-Dispatch Conflict Scan" skills/subagent-driven-development/SKILL.md
grep -c "Batching Small Same-Shape Work" skills/subagent-driven-development/SKILL.md
grep -c "Never dispatch your own subagents" skills/subagent-driven-development/implementer-prompt.md
```

Expected: all three print `0`.

- [ ] **Step 2: Run them, confirm the pre-edit state**

Run the three commands above. Confirm all three print `0`.

- [ ] **Step 3: Insert two new sections into `SKILL.md`**

Insert immediately after the line `` `sdd-execute` runs the single spec-alignment review (`sdd-review` Mode B) and `finishing-a-development-branch` after this skill returns control — not this skill itself. `` and before the `## Model Selection` heading:

```markdown
## Pre-Dispatch Conflict Scan

Before dispatching the first work unit, scan `plan.md` once for conflicts and
write down what you checked:

- tasks/phases that contradict each other or the plan's Global Constraints
  block (see `sdd-superpowers:sdd-plan`)
- anything a task explicitly mandates that would fail `sdd-review`'s rubric
  (a test that asserts nothing, verbatim duplication of a logic block)

Record the scan in TodoWrite before dispatching the first unit: one entry per
pair of units that share a file or interface (what one produces against what
the other consumes, and what you found), one entry per unit (whether its own
text agrees with itself). If the scan is clean, proceed without comment. If
it surfaces a conflict, rule on it — the spec is the binding authority, the
plan is its argument — and record the ruling before dispatching Task 1. The
end-of-execution `sdd-review` remains the net for conflicts that only emerge
from implementation.

## Batching Small Same-Shape Work

When the plan lists several tasks that are each a small, independent edit of
the same kind — the same one-line fix, constant change, or field addition
repeated across files — do not dispatch one subagent per task. Compose ONE
dispatch brief listing every file and its change, send the whole batch to a
single implementer subagent, and treat its diff as one unit for commit and
TodoWrite purposes. Reserve one-dispatch-per-task for work that needs its
own judgment, its own tests, or its own review surface.
```

- [ ] **Step 4: Add the no-subagents contract to `implementer-prompt.md`**

In the `## Your Job` section, immediately after the line `Work from: [directory]` and before the `**While you work:**` line, insert:

```markdown
    **Never dispatch your own subagents** — not helpers, not a reviewer. If
    you need a second opinion or hit something beyond this task, report
    NEEDS_CONTEXT or BLOCKED instead; the controller decides whether to
    bring in another agent.
```

- [ ] **Step 5: Add a matching Red Flags line to `SKILL.md`**

In the `## Red Flags` → `**Never:**` list, add a new bullet after the existing "Dispatch multiple implementation subagents in parallel" line:

```markdown
- Let an implementer subagent spawn its own subagents (helpers or reviewers) — escalate to the controller instead
```

- [ ] **Step 6: Run the checks again to verify green**

```bash
grep -c "Pre-Dispatch Conflict Scan" skills/subagent-driven-development/SKILL.md
grep -c "Batching Small Same-Shape Work" skills/subagent-driven-development/SKILL.md
grep -c "Never dispatch your own subagents" skills/subagent-driven-development/implementer-prompt.md
```

Expected: all three print `1` or more.

- [ ] **Step 7: Commit**

```bash
git add skills/subagent-driven-development/SKILL.md skills/subagent-driven-development/implementer-prompt.md
git commit -m "feat(subagent-driven-development): add pre-dispatch conflict scan, task batching, no-subagent-spawning ban"
```

---

### Task 3: `sdd-plan` — Global Constraints, Interfaces, right-sizing

**Files:**
- Modify: `skills/sdd-plan/template.md`
- Modify: `skills/sdd-plan/SKILL.md`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: the "Global Constraints block" and "Interfaces block" naming convention that Task 2 references by name (prose reference only, no shared file)

- [ ] **Step 1: Write the failing checks**

```bash
grep -c "Global Constraints" skills/sdd-plan/template.md
grep -c "Interfaces:" skills/sdd-plan/template.md
grep -c "Phase Right-Sizing" skills/sdd-plan/SKILL.md
```

Expected: all three print `0`.

- [ ] **Step 2: Run them, confirm the pre-edit state**

Run the three commands above. Confirm all three print `0`.

- [ ] **Step 3: Add Global Constraints block to `template.md`**

Replace the file's header (from `# Implementation Plan: <Feature Name>` through the `---` separator) with:

```markdown
# Implementation Plan: <Feature Name>

**Spec:** docs/specs/<NNN>-<feature-slug>/spec.md
**Decisions:** docs/adr/<NNN>-*.md (if applicable)
**Created:** YYYY-MM-DD

## Global Constraints

<Project-wide rules from spec.md that bind every phase — version floors,
naming/copy rules, dependency limits, exact values — one line each, copied
verbatim from the spec. Every phase's requirements implicitly include this
section.>

---
```

- [ ] **Step 4: Add Interfaces line to both phase templates in `template.md`**

In the `## Phase 0: Contracts and Tests First` block, after the `**Files:**` line, add:

```markdown
**Interfaces:** Consumes: <what this phase uses from earlier phases — exact signatures, or "nothing" for Phase 0>. Produces: <what later phases rely on — exact function/type names, since an implementer subagent sees only its own phase text>.
```

In the `## Phase 1: <First Component>` block, after its `**Files:**` line, add the same `**Interfaces:**` line.

- [ ] **Step 5: Add Phase Right-Sizing section to `SKILL.md`**

Insert a new section immediately after `## File Structure` and before `## No Placeholders`:

```markdown
## Phase Right-Sizing

A phase is the smallest unit that carries its own test cycle and is worth a
fresh reviewer's gate. When drawing phase boundaries: fold setup,
configuration, scaffolding, and documentation steps into the phase whose
deliverable needs them; split only where a reviewer could meaningfully
reject one phase while approving its neighbor. Each phase ends with an
independently testable deliverable.
```

- [ ] **Step 6: Run the checks again to verify green**

```bash
grep -c "Global Constraints" skills/sdd-plan/template.md
grep -c "Interfaces:" skills/sdd-plan/template.md
grep -c "Phase Right-Sizing" skills/sdd-plan/SKILL.md
```

Expected: first prints `1`, second prints `2` (one per phase template), third prints `1`.

- [ ] **Step 7: Commit**

```bash
git add skills/sdd-plan/template.md skills/sdd-plan/SKILL.md
git commit -m "feat(sdd-plan): add Global Constraints block, per-phase Interfaces block, right-sizing guidance"
```

---

### Task 4: `sdd-brainstorm` visual companion — security hardening

**Files:**
- Modify (replace): `skills/sdd-brainstorm/scripts/server.cjs`
- Modify (replace): `skills/sdd-brainstorm/scripts/start-server.sh`
- Modify (replace): `skills/sdd-brainstorm/scripts/stop-server.sh`
- Modify (replace): `skills/sdd-brainstorm/scripts/helper.js`
- Modify (replace): `skills/sdd-brainstorm/scripts/frame-template.html`
- Modify: `skills/sdd-brainstorm/visual-companion.md`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: nothing consumed by other tasks

Pre-verified during planning: `grep -il "sdd-\|docs/specs\|superpowers:sdd" skills/sdd-brainstorm/scripts/*` returns no matches — none of the 5 script files contain sdd-superpowers-specific customization, so this is a safe wholesale replace, not a merge.

- [ ] **Step 1: Write the failing check**

```bash
diff -q skills/sdd-brainstorm/scripts/server.cjs /home/a5152154/.claude/jobs/525ac86c/tmp/superpowers-v630/skills/brainstorming/scripts/server.cjs
```

Expected: reports the files differ (exit code 1).

- [ ] **Step 2: Run it, confirm the pre-edit state**

Run the command above. Confirm it reports the files differ.

- [ ] **Step 3: Replace the five script files**

```bash
cp /home/a5152154/.claude/jobs/525ac86c/tmp/superpowers-v630/skills/brainstorming/scripts/server.cjs skills/sdd-brainstorm/scripts/server.cjs
cp /home/a5152154/.claude/jobs/525ac86c/tmp/superpowers-v630/skills/brainstorming/scripts/start-server.sh skills/sdd-brainstorm/scripts/start-server.sh
cp /home/a5152154/.claude/jobs/525ac86c/tmp/superpowers-v630/skills/brainstorming/scripts/stop-server.sh skills/sdd-brainstorm/scripts/stop-server.sh
cp /home/a5152154/.claude/jobs/525ac86c/tmp/superpowers-v630/skills/brainstorming/scripts/helper.js skills/sdd-brainstorm/scripts/helper.js
cp /home/a5152154/.claude/jobs/525ac86c/tmp/superpowers-v630/skills/brainstorming/scripts/frame-template.html skills/sdd-brainstorm/scripts/frame-template.html
chmod +x skills/sdd-brainstorm/scripts/start-server.sh skills/sdd-brainstorm/scripts/stop-server.sh
```

- [ ] **Step 4: Update `visual-companion.md`'s "Starting a Session" section**

Replace the fenced code block and the two paragraphs immediately following it (from `` ```bash `` through `Tell user to open the URL.`) with:

```markdown
```bash
# Start AFTER the user approves the companion. --open auto-opens their browser on
# the first screen; --project-dir persists mockups and enables same-port restart.
scripts/start-server.sh --project-dir /path/to/project --open

# Returns: {"type":"server-started","port":52341,
#           "url":"http://localhost:52341/?key=ab12…",
#           "screen_dir":"/path/to/project/.superpowers/brainstorm/12345-1706000000/content",
#           "state_dir":"/path/to/project/.superpowers/brainstorm/12345-1706000000/state"}
```

Save `screen_dir` and `state_dir` from the response. With `--open`, the browser opens itself when you push the first screen — you don't need to ask the user to open it, but still share the URL as a fallback (headless/remote setups won't auto-open).

**The URL contains a session key (`?key=…`).** The server rejects any request
without it, so always give the user the **complete** URL from the `url` field —
never strip the query string, and never hand out a bare `http://host:port`. The
key gates HTTP and WebSocket access so a stray browser tab or another machine on
the network can't read the screens or inject events. After the first load the
browser remembers the key via a cookie, so reloads and `/files/*` assets work
without repeating it.
```

- [ ] **Step 5: Update the idle-timeout and restart note in "The Loop" step 1**

Replace the line `The server auto-exits after 30 minutes of inactivity.` with:

```markdown
   If it has shut down, restart it with `start-server.sh` using the **same
   `--project-dir`** — it reuses the same port, so the user's open tab
   reconnects on its own (it shows a "paused" overlay while the server is
   down) and you don't need to send a new URL. The server auto-exits after
   4 hours idle (configurable with `--idle-timeout-minutes`).
```

- [ ] **Step 6: Run the check again to verify green**

```bash
diff -q skills/sdd-brainstorm/scripts/server.cjs /home/a5152154/.claude/jobs/525ac86c/tmp/superpowers-v630/skills/brainstorming/scripts/server.cjs
grep -c "key=" skills/sdd-brainstorm/visual-companion.md
```

Expected: first command prints nothing (files now identical); second prints `1` or more.

- [ ] **Step 7: Commit**

```bash
git add skills/sdd-brainstorm/scripts/ skills/sdd-brainstorm/visual-companion.md
git commit -m "fix(sdd-brainstorm): harden visual companion with per-session key, sandboxed file serving, restart persistence"
```

---

### Task 5: `test-driven-development` — replace `testing-anti-patterns.md` with `writing-good-tests.md`

**Files:**
- Delete: `skills/test-driven-development/testing-anti-patterns.md`
- Create: `skills/test-driven-development/writing-good-tests.md`
- Modify: `skills/test-driven-development/SKILL.md`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Write the failing checks**

```bash
test -f skills/test-driven-development/testing-anti-patterns.md && echo "old file present"
test -f skills/test-driven-development/writing-good-tests.md && echo "new file present"
grep -c "testing-anti-patterns.md" skills/test-driven-development/SKILL.md
```

Expected: `old file present` prints, `new file present` does not print, `grep` prints `1`.

- [ ] **Step 2: Run them, confirm the pre-edit state**

Run the three commands above. Confirm the expected output.

- [ ] **Step 3: Create `writing-good-tests.md`**

```markdown
# Writing Good Tests

**Load this reference when:** writing or changing tests, adding mocks, or
adding cleanup/helper methods for tests.

## Overview

A test exists to catch a specific break. Two principles govern everything
here:

```
1. Every test names the break it catches
2. Every test exercises the real thing
```

Strict TDD produces both naturally: a test written first and watched
failing against real code has already proven it can fail, and only earns
a mock when the real dependency proves slow or external.

## Principle 1: Name the Break

Before writing the test body, answer: **what production change should
make this test fail — and is that change a bug or a decision?** A test
earns its place by catching a wrong branch, missing side effect, wrong
argument, boundary case, or broken contract.

**Derive expectations independently.** Use literals and hand-checked
fixtures; table-driven tests with literal `want` values are the preferred
shape. An expectation computed by the code under test — or its helpers —
passes no matter what that code does:

```typescript
// ❌ Mirror assertion: the same builder computes both sides — always true
const expected = buildSearchQuery({ tag: 'urgent' });
expect(buildSearchQuery({ tag: 'urgent' })).toBe(expected);

// ✅ Hand-derived literal
expect(buildSearchQuery({ tag: 'urgent' })).toBe('tag:"urgent"');
```

**No change detectors.** If only intentional decisions can fail a test —
a constant's value, exact message wording, private structure — it fires
on redesign and sleeps through bugs. Test the behavior that depends on
the decision: not `expect(MAX_RETRIES).toBe(5)` but "a failing call is
retried 5 times and the 6th attempt never happens."

**Behavior, not text.** Asserting that a script, skill, or config
contains an exact line proves only that the source is the source. Run
scripts against controlled inputs and assert outputs, side effects, or
exit codes. Documents that instruct agents are tested by the consuming
agent's behavior (`sdd-superpowers:writing-skills`); prose for humans
earns no test at all.

**Your code, not the framework.** Test the contract your code makes at
its boundaries — the route you register, the query you emit, the payload
you produce. Upstream mechanics are their maintainers' tests to write
(the classic: asserting your router invokes a registered handler — that
is the framework's test, not yours). When upstream behavior genuinely
surprised you, write one narrow characterization test naming the
assumption. The same boundary applies inside your code: constructors,
getters, constants, and trivial forwarding earn tests only when they
validate, normalize, default, derive, enforce, or cause side effects —
otherwise assert the first consumer-visible result that depends on them.

### Gate Function

```
BEFORE writing the test body:
  Name the production change that would make this test fail.

  Cannot name one            → redesign around an observable behavior
  "The source text changed"  → run the artifact and assert its effects
  Only intentional decisions → change detector; test the behavior
                               that depends on the decision

  Confirm the expected value is derived without the code under test.
  IF it reuses the code's logic or helpers:
    Replace it with a literal or hand-checked fixture
```

## Principle 2: Exercise the Real Thing

**The mock earns no assertions.** A mock assertion passes when the mock
is present and fails when it is absent — it says nothing about the
component. Assert the real component's behavior; if the mock is what you
are checking, unmock it or delete the assertion.

```typescript
// ✅ Real behavior
expect(screen.getByRole('navigation')).toBeInTheDocument();

// ❌ Mock existence
expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();
```

**your human partner's correction:** "Are we testing the behavior of a
mock?"

**Mock at the right level.** Learn every side effect of the real method
before replacing it; mock the slow or external operation and keep what
the test depends on real. When unsure, run the test against the real
implementation first and observe what actually needs to happen.

```typescript
// ❌ The mock swallows the config write that duplicate detection reads
vi.mock('ToolCatalog', () => ({
  discoverAndCacheTools: vi.fn().mockResolvedValue(undefined)
}));

// ✅ Mock only the slow server startup; the config write stays real
vi.mock('MCPServerManager');
```

**Make doubles specific.** When arguments, call counts, or ordering are
part of the contract, assert them — a fake that accepts anything verifies
nothing. Give each branch (success, error, malformed) its own fixture or
spy, so the wrong branch cannot satisfy the expectation.

**Mirror real data completely.** Mock the complete structure as it exists
in reality — all documented fields — not just the ones your test reads.
Partial mocks fail silently when downstream code reads an omitted field:
the test passes while integration breaks.

**Production classes carry production methods only.** Cleanup that only
tests need lives in test utilities, never as a `destroy()` on the
production class. Ask: is this method called only from tests? Does this
class own this resource's lifecycle? Wrong answers → test utility.

**Prefer real components over complex mocks.** When mock setup outgrows
the test logic, mocks miss methods the real components have, or tests
break when the mock changes, switch to an integration test with real
components. **your human partner's question:** "Do we need to be using a
mock here?"

### Gate Function

```
BEFORE adding a mock or test helper:
  List the real method's side effects; keep the ones the test
  depends on real — mock the slow/external level below them.

  Mock responses mirror the complete real structure.

  A method only tests call lives in test utilities, not production.

  About to assert on the mock itself?
    Unmock it or delete the assertion.
```

## Tests Ship With the Implementation

The TDD cycle — failing test, minimal implementation, refactor — is what
"complete" means. Ship the tests the behavior needs and only those:
trivial code and human prose earn none, and a test written to satisfy
process costs maintenance forever.

## The Mutation Check

Before finishing, mentally mutate the production code; at least one test
should fail for each realistic mutation:

- Wrong constant or argument
- Wrong branch handler
- Missing state change or side effect
- Empty or default return
- Missing validation for zero, empty, nil, unauthorized, or malformed input

A mutation nothing catches marks the behavior as unprotected — or the
test as tautological.

## Quick Reference

| When you... | Do |
|-------------|-----|
| Write any test | Name the break it catches — a bug, not a decision |
| Build an expected value | Derive it by hand; never with the code under test |
| Test a script or document | Run it / pressure-test its consumer; never grep its text |
| Reach for a dependency test | Test your boundary contract, not their documented mechanics |
| Want to assert on a mocked element | Test the real component, or unmock it |
| Are about to mock a method | Learn its side effects; mock the slow/external level |
| Build a mock response | Mirror the real structure completely |
| Need cleanup only tests use | Put it in test utilities |
| Watch mock setup balloon | Switch to an integration test with real components |
| Finish a test file | Run the mutation check |

## Warning Signs

- Setup and assertion share the same object, guaranteeing equality
- The test can fail only through a panic, crash, or missing selector
- The test fails on every intentional change, never on accidental breakage
- Expected values are hidden behind loops, builders, or helpers
- The test greps source text, or asserts a removed symbol stays removed
- The test would still matter if only the framework remained
- The test exists for coverage, checking no side effect or outcome
- An assertion checks a `*-mock` test ID, or fails if you remove the mock
- A method is called only from test files
- Mock setup is more than half the test, or you can't explain why the mock is needed
- Mocking "just to be safe"
```

- [ ] **Step 4: Delete the old file**

```bash
git rm skills/test-driven-development/testing-anti-patterns.md
```

- [ ] **Step 5: Update the reference in `SKILL.md`**

Replace the `## Testing Anti-Patterns` section:

```markdown
## Testing Anti-Patterns

When adding mocks or test utilities, read `testing-anti-patterns.md` (in this skill's directory) to avoid common pitfalls:
- Testing mock behavior instead of real behavior
- Adding test-only methods to production classes
- Mocking without understanding dependencies
```

with:

```markdown
## Writing Good Tests

When writing or changing tests, adding mocks, or adding test cleanup/helper
methods, read `writing-good-tests.md` (in this skill's directory):
- Name the production change that would make the test fail
- Exercise the real thing — mock only the slow/external level
- Run the mutation check before calling a test file done
```

- [ ] **Step 6: Run the checks again to verify green**

```bash
test -f skills/test-driven-development/testing-anti-patterns.md && echo "old file present" || echo "old file gone"
test -f skills/test-driven-development/writing-good-tests.md && echo "new file present"
grep -c "testing-anti-patterns.md" skills/test-driven-development/SKILL.md
```

Expected: `old file gone`, `new file present`, and the grep prints `0`.

- [ ] **Step 7: Commit**

```bash
git add skills/test-driven-development/
git commit -m "feat(test-driven-development): replace testing-anti-patterns.md with writing-good-tests.md"
```

---

### Task 6: `writing-skills` — Match the Form to the Failure, Micro-Test Wording

**Files:**
- Modify: `skills/writing-skills/SKILL.md`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Write the failing checks**

```bash
grep -c "Match the Form to the Failure" skills/writing-skills/SKILL.md
grep -c "Micro-Test Wording" skills/writing-skills/SKILL.md
```

Expected: both print `0`.

- [ ] **Step 2: Run them, confirm the pre-edit state**

Run the two commands above. Confirm both print `0`.

- [ ] **Step 3: Insert "Match the Form to the Failure" before "Bulletproofing Skills Against Rationalization"**

Insert immediately before the `## Bulletproofing Skills Against Rationalization` heading:

```markdown
## Match the Form to the Failure

Before writing guidance, classify the baseline failure. The form that bulletproofs one failure type measurably backfires on another.

| Baseline failure | Right form | Wrong form |
|---|---|---|
| Skips/violates a rule under pressure (knows better, does it anyway) | Prohibition + rationalization table + red flags (see Bulletproofing below) | Soft guidance ("prefer...", "consider...") |
| Complies, but output has the wrong shape (bloated prompt, buried verdict, restated spec) | Positive recipe or contract: state what the output IS — its parts, in order | Prohibition list ("don't restate", "never narrate") |
| Omits a required element from something they already produce | Structural: REQUIRED field or slot in the template they fill in | Prose reminders near the template |
| Behavior should depend on a condition | Conditional keyed to an observable predicate ("if the brief exists, reference it") | Unconditional rule + exemption clauses |

**Why prohibitions backfire on shaping problems:** under a competing incentive ("make the prompt self-contained"), agents negotiate with "don't X". In head-to-head wording tests on dispatch-prompt guidance, the prohibition arm produced clearly more of the unwanted content than the recipe arm (fully separated distributions), and trended worse than even the no-guidance control — micro-test your own case rather than assuming, but never reach for the prohibition by default. A recipe leaves nothing to negotiate: the output matches the stated shape or it doesn't.

**Rules for whichever form you pick:**
- **No nuance clauses.** "Don't X unless it matters" reopens the negotiation — appending a single nuance clause to a winning recipe degraded it from consistent to noisy in the same wording tests. Express a real exception as its own conditional on an observable predicate.
- **Exemption clauses don't scope.** "This limit doesn't apply to code blocks" still suppresses code blocks. If part of the output must be exempt, restructure so the rule can't reach it.
```

- [ ] **Step 4: Insert "Micro-Test Wording Before Full Scenarios" after "REFACTOR: Close Loopholes"**

Insert immediately after the `### REFACTOR: Close Loopholes` subsection's content (`Agent found new rationalization? Add explicit counter. Re-test until bulletproof.`) and before the `## Anti-Patterns` heading:

```markdown
### Micro-Test Wording Before Full Scenarios

Full pressure-scenario runs are the final gate, but they are slow and expensive per iteration. Verify the wording itself first with micro-tests:

1. **One fresh-context sample per call** — a raw API call, or a single-shot subagent if you don't have API access. System prompt = the realistic context the guidance will live in (the full skill or prompt template, not the guidance in isolation); user message = a task that tempts the failure.
2. **Always include a no-guidance control.** If the control doesn't exhibit the failure, there is nothing to fix — stop, don't author the guidance.
3. **5+ reps per variant.** Single samples lie.
4. **Manually read every flagged match.** Score programmatically if you like, but template echoes and quoted counter-examples masquerade as hits; automated counts alone overstate both failure and success.
5. **Variance is a metric.** When guidance lands, reps converge on the same shape. Five different interpretations across five reps means the wording isn't binding — tighten the form before adding words.

Micro-tests verify wording; they do not replace pressure scenarios for discipline skills.

**Testing methodology:** See [testing-skills-with-subagents.md](testing-skills-with-subagents.md) for the complete testing methodology:
- How to write pressure scenarios
- Pressure types (time, sunk cost, authority, exhaustion)
- Plugging holes systematically
- Meta-testing techniques
```

- [ ] **Step 5: Run the checks again to verify green**

```bash
grep -c "Match the Form to the Failure" skills/writing-skills/SKILL.md
grep -c "Micro-Test Wording" skills/writing-skills/SKILL.md
```

Expected: both print `1` or more.

- [ ] **Step 6: Commit**

```bash
git add skills/writing-skills/SKILL.md
git commit -m "feat(writing-skills): add Match the Form to the Failure and Micro-Test Wording sections"
```

---

### Task 7: `finishing-a-development-branch` — discard-menu, forge-agnostic PR, safe worktree removal

**Files:**
- Modify: `skills/finishing-a-development-branch/SKILL.md`
- Modify: `skills/finishing-a-development-branch/reference.md`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Write the failing checks**

```bash
grep -c "4. Discard this work" skills/finishing-a-development-branch/SKILL.md
grep -c "forge's tooling" skills/finishing-a-development-branch/reference.md
grep -c "never \`--force\`" skills/finishing-a-development-branch/reference.md
```

Expected: first prints `1`, second prints `0`, third prints `0`.

- [ ] **Step 2: Run them, confirm the pre-edit state**

Run the three commands above. Confirm the expected output.

- [ ] **Step 3: Rewrite `SKILL.md`'s menu section**

Replace from `**The 4 options (present verbatim):**` through the end of the `## Common Mistakes` table with:

```markdown
**The options (present verbatim):**

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)

Which option?
```

**After the chosen option and any cleanup complete, invoke `sdd-superpowers:session-wrap` quick mode to capture session learnings before closing.**

**Discarding the work happens only in response to an explicit request** to throw it away — it is never a standing menu item. See [reference.md](reference.md) for the discard flow and its typed-confirmation requirement.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Proceeding with failing tests | Always verify tests before offering options |
| Open-ended question instead of the 3 options | Present exactly the 3 options above, verbatim |
| Cleaning up worktree for Option 2 or 3 | Only clean up for Option 1 (and confirmed discards), and only if a worktree was used |
| Offering to discard because the feature "seems done" | The menu is complete as written; discard happens only when your human partner asks for it in so many words |
| Deleting work without confirmation | Require typed "discard" for the discard flow |
| Force-pushing without explicit request | Never force push unless user explicitly asked |
| `git worktree remove --force` on refusal | The refusal means untracked files exist only there — show your human partner and ask, never force |
```

- [ ] **Step 4: Rewrite `reference.md` Step 3 (Present Options) to drop the standing discard option and add the explicit-request-only flow**

Replace the `## Step 3: Present Options` section (through the end of `**Don't add explanation** - keep options concise.`) with:

```markdown
## Step 3: Present Options

Present exactly these 3 options:

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)

Which option?
```

**Don't add explanation** - keep options concise. Discarding the work
happens only in response to your human partner explicitly asking for it
(see "If your human partner asks to discard the work" below) — never offer
it as a fourth option.
```

- [ ] **Step 5: Replace the `### Option 2: Push and Create PR` block to be forge-agnostic**

Replace:

```markdown
### Option 2: Push and Create PR

```bash
git push -u origin <feature-branch>
gh pr create --title "<merge-commit-message>" --body "$(cat <<'EOF'
## Summary
<2-3 bullets of what changed>

## Test Plan
- [ ] <verification steps>
EOF
)"
```

Then: Cleanup worktree (Step 5)
```

with:

```markdown
### Option 2: Push and Create PR

```bash
git push -u origin <feature-branch>
```

Create the pull/merge request against `<base-branch>` with the forge's
tooling — its CLI if one is available (e.g. `gh pr create`), or the creation
URL most forges print when you push — following the repo's PR template and
conventions if present, and report the URL to your human partner.

Keep the worktree — your human partner iterates on PR feedback there.
```

- [ ] **Step 6: Replace `### Option 4: Discard` with an explicit-request-only flow, renumbered out of the standing menu**

Replace the entire `### Option 4: Discard` section with:

```markdown
### If your human partner asks to discard the work

This path exists only as a response to an explicit request to throw the
work away. Confirm first:

```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for that exact confirmation. If confirmed:

```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

Then: Cleanup worktree (Step 5)
```

- [ ] **Step 7: Add untracked-file-safe worktree removal to `## Step 5: Cleanup Worktree`**

Replace the block:

```markdown
If yes:
```bash
git worktree remove <worktree-path>
```
```

with:

```markdown
If yes:
```bash
git worktree remove <worktree-path>
```

**If removal is refused** (`contains modified or untracked files`): the
worktree holds files that exist nowhere else — uncommitted plans, notes, or
scratch work. Never `--force` on your own initiative. Show your human
partner what is at stake and ask:

```bash
git -C "<worktree-path>" status --porcelain -uall
```

```
Worktree removal refused — these files were never committed:

<file list>

1. Commit them to <branch> before cleanup
2. Move them into the main repo root
3. Delete them (unrecoverable)

Which?
```

Carry out the choice, then remove the worktree.
```

- [ ] **Step 8: Run the checks again to verify green**

```bash
grep -c "4. Discard this work" skills/finishing-a-development-branch/SKILL.md
grep -c "forge's tooling" skills/finishing-a-development-branch/reference.md
grep -c "never \`--force\`" skills/finishing-a-development-branch/reference.md
```

Expected: first prints `0`, second prints `1` or more, third prints `1` or more.

- [ ] **Step 9: Commit**

```bash
git add skills/finishing-a-development-branch/
git commit -m "fix(finishing-a-development-branch): explicit-only discard, forge-agnostic PR creation, untracked-file-safe worktree removal"
```

---

### Task 8: Style consistency — `subagent-driven-development` and `writing-skills`

**Files:**
- Modify: `skills/subagent-driven-development/SKILL.md`
- Modify: `skills/writing-skills/SKILL.md`

**Interfaces:**
- Consumes: nothing from other tasks (safe to run even though Task 2 and Task 6 also touch these two files — different sections: Task 2 edits `## Pre-Dispatch Conflict Scan`/`## Batching...`/`## Red Flags`; Task 6 edits mid-file sections; this task edits `## Advantages` and the final `## The Bottom Line`. Run this task after Task 2 and Task 6 commit, to avoid a merge conflict on the same files.)
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Write the failing checks**

```bash
grep -c "^## Advantages" skills/subagent-driven-development/SKILL.md
grep -c "^## The Bottom Line" skills/writing-skills/SKILL.md
```

Expected: both print `1`.

- [ ] **Step 2: Run them, confirm the pre-edit state**

Run the two commands above. Confirm both print `1`.

- [ ] **Step 3: Convert `subagent-driven-development`'s `## Advantages` section**

Replace the entire `## Advantages` section (from `## Advantages` through the line before `## Red Flags`) with:

```markdown
## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "I'll just fix this small thing myself instead of dispatching a subagent" | Direct fixes bypass TDD and commit discipline. Dispatch a fix subagent even for small changes. |
| "This subagent's context is basically the same as the last one's" | Fresh subagents never inherit session history. Construct exactly the context this task needs, every time. |
| "The implementer seems stuck, I'll just answer differently and hope" | A stuck implementer needs a decision: more context, a stronger model, a smaller task, or escalation — not a repeated attempt with the same inputs. |
| "Two tasks touch nearby code, parallel dispatch should be fine" | Shared files mean shared risk of conflicting edits. Sequence them. |
```

- [ ] **Step 4: Trim `writing-skills`' `## The Bottom Line` section**

Delete the entire `## The Bottom Line` section (from `## The Bottom Line` to the end of the file) with no replacement — it is the file's final section, so deleting it simply ends the file at the line before it (`**Optimize for this flow** - put searchable terms early and often.`).

- [ ] **Step 5: Run the checks again to verify green**

```bash
grep -c "^## Advantages" skills/subagent-driven-development/SKILL.md
grep -c "^## The Bottom Line" skills/writing-skills/SKILL.md
```

Expected: both print `0`.

- [ ] **Step 6: Commit**

```bash
git add skills/subagent-driven-development/SKILL.md skills/writing-skills/SKILL.md
git commit -m "style(subagent-driven-development,writing-skills): convert Advantages/Bottom Line prose to rationalization table / trim"
```

---

## Phase N: Integration Verification

- [ ] Run `jq . .claude-plugin/plugin.json .claude-plugin/marketplace.json` — confirm both remain valid JSON (untouched by this plan, but verify nothing else broke them)
- [ ] Run the full grep sweep from every task's Step 6/final-check above, in one pass, and confirm no old-text/new-text check regressed
- [ ] Run the existing hook test suite (`tests/hooks/`) to confirm no regression — this plan touches no hook scripts, so this is a smoke check, not an expected-change check
- [ ] Read through all 8 modified/created files once end-to-end for markdown structure (`.claude/rules/markdown-conventions.md`: one `# Title`, strict heading descent, no skipped levels)
- [ ] Commit: `docs(028): integration verification for superpowers v6.0-v6.3 backport`

## Quickstart Validation

1. Open `skills/sdd-execute/SKILL.md` — confirm `## When to Stop and Ask` lists exactly four stop conditions and defines "Ruling:" recording.
2. Open `skills/subagent-driven-development/SKILL.md` — confirm `## Pre-Dispatch Conflict Scan`, `## Batching Small Same-Shape Work`, and `## Common Rationalizations` (replacing `## Advantages`) all exist.
3. Open `skills/sdd-plan/template.md` — confirm a `## Global Constraints` section exists and both phase blocks have an `**Interfaces:**` line.
4. Start the visual companion (`scripts/start-server.sh --project-dir /tmp/test --open`) and confirm the returned URL includes `?key=`.
5. Open `skills/test-driven-development/writing-good-tests.md` — confirm it exists and `testing-anti-patterns.md` does not.
6. Open `skills/writing-skills/SKILL.md` — confirm `## Match the Form to the Failure` and `### Micro-Test Wording Before Full Scenarios` exist, and `## The Bottom Line` does not.
7. Open `skills/finishing-a-development-branch/SKILL.md` — confirm the menu shows exactly 3 options with no standing "Discard" item.
