# Dispatching Parallel Agents: Full Reference

> Detailed dispatch templates, worked example, and integration notes. See [SKILL.md](SKILL.md) for the summary.

## The Pattern

### 1. Identify Independent Domains

Group failures/tasks by what's broken or what's being built:
- File A tests: Tool approval flow
- File B tests: Batch completion behavior
- File C tests: Abort functionality

Each domain is independent — fixing one doesn't affect the others.

### 2. Create Focused Agent Tasks

Each agent gets:
- **Specific scope:** One test file or subsystem
- **Clear goal:** Make these tests pass / implement this component
- **Constraints:** Don't change other code
- **Expected output:** Summary of what you found and fixed

### 3. Dispatch in Parallel

```typescript
// In Claude Code / AI environment
Task("Fix agent-tool-abort.test.ts failures")
Task("Fix batch-completion-behavior.test.ts failures")
Task("Fix tool-approval-race-conditions.test.ts failures")
// All three run concurrently
```

### 4. Review and Integrate

When agents return:
- Read each summary
- Verify fixes don't conflict
- Run full test suite
- Integrate all changes

## Agent Prompt Structure

Good agent prompts are focused, self-contained, and specific about output. In SDD, each agent implements one task from `tasks.md`:

```markdown
You are implementing Task N: [task name] as part of the NNN-feature feature.

## Authoritative Spec (Source of Truth)
[FULL TEXT of docs/specs/NNN-feature/spec.md — relevant sections]

## Task Requirements
[FULL TEXT of this task from tasks.md]

## Architectural Context
[Relevant section from docs/specs/NNN-feature/plan.md]

## Your Job

Follow sdd-superpowers:test-driven-development strictly:
1. Write a failing test first
2. Implement exactly what the task requires (no more, no less)
3. Make the test pass
4. Commit using sdd-superpowers:using-git conventions

## Constraints
- Touch only the files listed in this task
- Do NOT modify files owned by sibling tasks running in parallel
- Do NOT add features not in the spec

## Report Format
- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- Files changed
- Tests written and results
- Self-review findings
```

## Common Mistakes

**❌ Too broad:** "Fix all the tests" - agent gets lost
**✅ Specific:** "Fix agent-tool-abort.test.ts" - focused scope

**❌ No context:** "Fix the race condition" - agent doesn't know where
**✅ Context:** Paste the error messages and test names

**❌ No constraints:** Agent might refactor everything
**✅ Constraints:** "Do NOT change production code" or "Fix tests only"

**❌ Vague output:** "Fix it" - you don't know what changed
**✅ Specific:** "Return summary of root cause and changes"

## Real Example (SDD)

**Scenario:** `docs/specs/007-auth/tasks.md` Phase 1 has 3 independent tasks

**Tasks:**
- Task 1: Implement JWT token generation (`src/auth/token.ts`)
- Task 2: Implement session store adapter (`src/auth/session.ts`)
- Task 3: Implement refresh token rotation (`src/auth/refresh.ts`)

**Decision:** Independent domains — different files, no shared state, no output dependencies

**Dispatch:**
```
Agent 1 → Task 1: JWT token generation
Agent 2 → Task 2: Session store adapter
Agent 3 → Task 3: Refresh token rotation
// All three run concurrently, each following TDD
```

**Results:**
- Agent 1: DONE — token.ts implemented, 6/6 tests passing, committed
- Agent 2: DONE — session.ts implemented, 4/4 tests passing, committed
- Agent 3: DONE_WITH_CONCERNS — refresh.ts done, flagged that rotation window may be too short per spec

**Integration:** Review concerns from Agent 3 → each task's own tests already passed (TDD), so commit directly → all tasks marked complete

## After Agents Return

1. **Review each summary** — Read status and concerns; address BLOCKED/NEEDS_CONTEXT before proceeding
2. **Check for conflicts** — Did agents edit the same files? Resolve before continuing
3. **Commit each unit directly** — each unit's own TDD cycle already passed; no per-unit review gate
4. **Run full test suite** — Verify all parallel implementations work together
5. **Mark tasks complete** — Update TodoWrite; continue to next phase with `sdd-superpowers:sdd-execute`

## Key Benefits

1. **Parallelization** — Multiple investigations happen simultaneously
2. **Focus** — Each agent has narrow scope, less context to track
3. **Independence** — Agents don't interfere with each other
4. **Speed** — 3 problems solved in time of 1
