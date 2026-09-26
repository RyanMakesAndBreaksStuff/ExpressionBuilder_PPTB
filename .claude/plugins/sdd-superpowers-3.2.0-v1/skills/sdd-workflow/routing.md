# SDD Workflow — Full Routing Rules and Red Flags

This file contains the complete routing logic, mandatory skill conditions, red flags, and decision rules referenced from `SKILL.md`.    

---

## New Project Detection (runs before all routing)

Before evaluating any routing or skill invocation, check whether this project is initialised:

1. Check if `CLAUDE.md` exists in the current working directory
2. Check if `docs/specs/` directory exists in the current working directory

**If NEITHER exists** → this is an uninitialised project:
- Announce: "I'm using sdd-init to set up the Constitutional Foundation for this new SDD project."
- Invoke `sdd-superpowers:sdd-init` before taking any other action
- After `sdd-superpowers:sdd-init` completes, return here and re-evaluate the user's original request using the routing rules below

**If EITHER exists** → project is already initialised:
- Skip this block entirely
- Proceed to routing below

---

## Instruction Priority

1. **User's explicit instructions** (CLAUDE.md, direct requests) — highest priority
2. **SDD skills** — govern the development workflow
3. **Default behavior** — lowest priority

---

## The SDD Skill Map (Full)

| Situation | Invoke |
|-----------|--------|
| Idea is fuzzy, exploratory, has competing approaches, or needs a technical decision investigated | `sdd-superpowers:sdd-brainstorm` |
| Idea is clear and ready to formalize | `sdd-superpowers:sdd-specify` |
| Spec exists, need an implementation plan | `sdd-superpowers:sdd-plan` |
| Plan approved, ready to implement | `sdd-superpowers:sdd-execute` |
| User describes a change or addition to an approved spec | `sdd-superpowers:sdd-spec-update` |
| Checking spec completeness before planning | `sdd-superpowers:sdd-review` |
| Checking implementation matches spec after coding | `sdd-superpowers:sdd-review` |
| A task fails or behavior is unexpected | `sdd-superpowers:systematic-debugging` |
| About to claim a feature is complete | `sdd-superpowers:verification-before-completion` |
| Implementation complete, deciding how to merge | `sdd-superpowers:finishing-a-development-branch` |
| Implementing fixes after a code review flagged issues | `sdd-superpowers:receiving-code-review` |
| Dispatching 2+ independent tasks concurrently | `sdd-superpowers:dispatching-parallel-agents` |
| Executing tasks in current session with subagents | `sdd-superpowers:subagent-driven-development` |
| Each implementer subagent (dispatched from subagent-driven-development) | `sdd-superpowers:test-driven-development` |
| Ending a session | `sdd-superpowers:session-wrap` |

---

## Skill Priority Ordering

**Process skills first, execution skills second:**

1. `sdd-superpowers:sdd-brainstorm` (optional) — establish WHAT to build and decide HOW via ADRs
2. `sdd-superpowers:sdd-plan` — establish the technical approach
3. `sdd-superpowers:sdd-execute` — actually build it
   - **At any point after spec approval:** `sdd-superpowers:sdd-spec-update` — integrate mid-flight changes before continuing
4. `sdd-superpowers:sdd-review` + `sdd-superpowers:verification-before-completion` — confirm it was built correctly

Never skip steps. "Let's just code it" means `sdd-superpowers:sdd-brainstorm` or `sdd-superpowers:sdd-specify` first.

---

## Routing: Brainstorm vs. Specify

When the user describes a new idea, assess before routing:

### Explicit triggers → invoke `sdd-superpowers:sdd-brainstorm`

User language: "brainstorm", "explore", "not sure what to build", "thinking about", "what if we", "some kind of", "a better way to"

### Auto-detected fuzziness signals → suggest `sdd-superpowers:sdd-brainstorm` (advisory)

- No concrete user action or outcome stated ("I want to improve X" with no specifics)
- Multiple competing directions mentioned in one message
- Vague qualifiers: "something like", "some kind of", "not sure how"

When fuzziness signals are detected, **ask before routing** (user can override):
> "Your idea sounds exploratory — there may be a few different directions we could take. Would you like to brainstorm approaches first (`sdd-superpowers:sdd-brainstorm`), or do you have a clear direction and want to go straight to spec (`sdd-superpowers:sdd-specify`)?"

### Multi-subsystem scope → block both paths (mandatory decomposition)

If the idea spans 2+ independent subsystems:
> "This spans multiple independent subsystems. Before we brainstorm or specify, let's decompose it — which piece should we tackle first?"

This is blocking. Neither `sdd-superpowers:sdd-brainstorm` nor `sdd-superpowers:sdd-specify` until scope is agreed.

### Clear idea → invoke `sdd-superpowers:sdd-specify` directly

When the idea contains a concrete user action, clear outcome, and no competing approaches.

---

## Trigger Language

The following tables map exact user phrases and agent-action signals to bundled skills. These supplement the Skill Map above with phrase-level specificity — use when the situation description in the Skill Map is insufficient.

### User-language triggers

| If the user says… | Invoke |
|-------------------|--------|
| "review this", "can you review", "take a look", "LGTM?", "what do you think of this code" | `sdd-superpowers:requesting-code-review` |
| Pastes review feedback, "the reviewer said", "based on this feedback", "fixing review comments" | `sdd-superpowers:receiving-code-review` |
| "it's not working", "getting an error", "this fails", "weird behavior", "why is X happening" | `sdd-superpowers:systematic-debugging` |

### Agent-action triggers

| Before the agent… | Invoke |
|-------------------|--------|
| Writes any implementation code (new function, class, fix, modification) | `sdd-superpowers:test-driven-development` |
| Proposes or applies any fix for a failure or unexpected behavior | `sdd-superpowers:systematic-debugging` |
| Completes a phase within `sdd-superpowers:sdd-execute` and is about to start the next | `sdd-superpowers:requesting-code-review` |
| Implements any change from review feedback | `sdd-superpowers:receiving-code-review` |

---

## When Each Skill Is Mandatory

**`sdd-superpowers:sdd-brainstorm` is mandatory when:**
- User explicitly asks to brainstorm or explore
- (Advisory) Auto-detected fuzziness signals present and user chooses brainstorm path
- A technical decision needs investigation before committing — non-functional requirements to validate (performance, security), or multiple viable technology paths

**`sdd-superpowers:sdd-specify` is mandatory when:**
- Idea is clear and concrete, OR
- `sdd-superpowers:sdd-brainstorm` has completed and `prd.md` exists

**`sdd-superpowers:sdd-plan` is mandatory when:**
- A spec exists and implementation hasn't started
- User says "plan this" or "how do we implement X"

**`sdd-superpowers:sdd-execute` is mandatory when:**
- A plan is approved and user says "implement", "build", "execute", or "let's start"

**`sdd-superpowers:sdd-spec-update` is mandatory when:**
- User describes a change, addition, or correction to an already-approved spec
- User says "can we also add X", "actually I want Y instead of Z", "I realize we need to change…"
- A mid-implementation discovery invalidates an existing requirement
- Do NOT proceed with plan/tasks/code changes until `sdd-spec-update` has classified the bump and the user has confirmed scope

**`sdd-superpowers:sdd-review` is mandatory when:**
- Spec is about to be handed to planning (spec review mode)
- All tasks in `tasks.md` are complete — REQUIRED before `finishing-a-development-branch` (implementation review mode)

**`sdd-superpowers:requesting-code-review` is mandatory when:**
- The user says "review this" / "can you review" — not called by `sdd-superpowers:sdd-execute`'s internal flow

**`sdd-superpowers:receiving-code-review` is mandatory when:**
- `sdd-superpowers:sdd-review` (Mode B) returns issues during `sdd-superpowers:sdd-execute`'s follow-up loop, or `sdd-superpowers:requesting-code-review` returns issues in an ad hoc review

**`sdd-superpowers:dispatching-parallel-agents` is mandatory when:**
- Dispatching a parallel task group in `sdd-superpowers:sdd-execute` (2+ independent tasks concurrently)

**`sdd-superpowers:subagent-driven-development` is mandatory when:**
- Executing tasks in the current session using subagents (not dispatching to parallel agents, but running sequentially or semi-sequentially in session)

**`sdd-superpowers:test-driven-development` is mandatory when:**
- An implementer subagent begins work on any task — invoked by the subagent, not the controller
- This skill is NOT invoked by `sdd-execute` or `subagent-driven-development` directly; it is the responsibility of each implementer subagent

---

## Red Flags — Stop and Check Skills

| Thought | Reality | Action |
|---------|---------|--------|
| "This is small, I'll just code it" | Small features become large ones. Specs prevent scope drift. | `sdd-superpowers:sdd-specify` first |
| "The plan is obvious, skip planning" | Obvious plans surface hidden dependencies when written down. | `sdd-superpowers:sdd-plan` first |
| "I need more context before invoking a skill" | Skill check comes BEFORE information gathering. Skills tell you HOW to gather it. | Invoke the relevant skill first |
| "I'm sure it works" | Confidence is not evidence. Evidence is evidence. | `sdd-superpowers:verification-before-completion` |
| "Tests pass so it's done" | Tests passing ≠ spec alignment. They verify code, not intent. | `sdd-superpowers:sdd-review` to confirm spec alignment |
| "Let me just fix this quickly" | Quick fixes skip root-cause analysis and create regression risk. | `sdd-superpowers:systematic-debugging` first |
| "User said 'also add X' — I'll just update the tasks" | Un-versioned spec changes corrupt traceability and cause downstream drift. | `sdd-superpowers:sdd-spec-update` first — classify impact, update spec, then propagate |
| "This change seems minor, no need to update the spec" | Even PATCH bumps must be recorded. Minor = still versioned. | `sdd-superpowers:sdd-spec-update` — even PATCH bumps are recorded in the spec |

---

## Announcing Skill Usage

Always announce before invoking a skill:

> "I'm using [skill-name] to [purpose]."

This gives your human partner a chance to redirect before work begins.
