# Feature 001: Constitutional Foundation Init

**Status:** Draft
**Created:** 2026-04-17
**Branch:** `001-constitutional-init`

---

## Problem Statement

New SDD projects have no mechanism to establish architectural principles before development begins. When `sdd-workflow` is invoked in a blank project, it routes straight to brainstorm/specify without first anchoring the project to a constitution — a set of immutable principles that govern how specifications become code. Without this foundation, every project risks architectural drift, over-engineering, and inconsistent standards across LLM-generated implementations.

## Goals

- Automatically detect when `sdd-workflow` is invoked in a new (uninitialised) project
- Interactively guide the user through creating a `memory/constitution.md` with Nine Articles
- Scaffold the SDD project structure (`docs/specs/`, `CLAUDE.md`) as part of the same init flow
- Ensure no feature work begins before the constitution is approved by the user

## Non-Goals

- This feature does NOT migrate or retrofit existing SDD projects that already have a constitution
- This feature does NOT enforce constitutional compliance during code generation (that is the role of `sdd-plan`'s Pre-Implementation Gates)
- This feature does NOT replace the built-in `/init` command — it extends `sdd-workflow` to run before routing

## Users and Context

**Primary users:** Developers starting a new project using the sdd-superpowers plugin
**Usage context:** First invocation of `sdd-workflow` (or any SDD skill) in a directory with no `CLAUDE.md` and no `docs/specs/` directory
**User mental model:** Users expect that starting fresh will prompt them to set up their project — similar to how `git init` or `npm init` establish project configuration before work begins

## User Stories

### Story 1: New Project Detection
**As a** developer starting a new SDD project
**I want** `sdd-workflow` to detect that I'm in an uninitialised project and trigger a setup flow
**So that** I don't accidentally begin specifying features without an architectural foundation

**Acceptance criteria:**
- [ ] When `sdd-workflow` is invoked and neither `CLAUDE.md` nor `docs/specs/` exist, the init flow activates automatically
- [ ] The init flow announces itself clearly before doing anything
- [ ] If the project is already initialised (CLAUDE.md or `docs/specs/` exist), the init flow is skipped and normal routing proceeds

### Story 2: Interactive Constitution Creation
**As a** developer setting up a new SDD project
**I want** to be walked through each of the Nine Articles interactively
**So that** I can tailor the constitution to my project's needs before any code is written

**Acceptance criteria:**
- [ ] Each Article is presented with its default text and a brief explanation of its purpose
- [ ] Articles I, II, III, VII, VIII, IX ship with pre-filled default content derived from spec-driven.md
- [ ] Articles IV, V, VI ship as `[NEEDS CLARIFICATION]` stubs with a prompt explaining what belongs there
- [ ] The user can accept a default, provide a custom value, or mark any Article as not applicable
- [ ] After all Nine Articles are reviewed, the user is asked for explicit approval before `memory/constitution.md` is written

### Story 3: Project Scaffold Creation
**As a** developer who has approved the constitution
**I want** the init flow to create the full SDD project scaffold
**So that** I can immediately begin feature work without manual directory setup

**Acceptance criteria:**
- [ ] `memory/constitution.md` is written with the approved Nine Articles
- [ ] `docs/specs/` directory is created (with a `.gitkeep` so it is tracked by git)
- [ ] `CLAUDE.md` is created (or updated if it already exists) with SDD workflow instructions referencing the constitution
- [ ] The user is informed of every file created/modified before it happens
- [ ] After scaffold creation, `sdd-workflow` resumes normal routing for the user's original request

### Story 4: Amendment Process
**As a** developer who wants to evolve the constitution
**I want** to know how to amend it after initial setup
**So that** principles can improve based on real-world experience without losing stability

**Acceptance criteria:**
- [ ] `memory/constitution.md` includes a Section 4.2 Amendment Process explaining: document rationale, review and approve, assess backwards compatibility
- [ ] The CLAUDE.md instructions note that constitution amendments require explicit user approval

## Functional Requirements

### FR-1: New Project Detection in sdd-workflow
At the start of `sdd-workflow` execution, before any routing logic, check for initialisation signals.

**Must:**
- Check for existence of `CLAUDE.md` in the current working directory
- Check for existence of `docs/specs/` directory
- If neither exists: activate the init flow before any other routing
- If either exists: skip the init flow entirely

**Must not:**
- Activate the init flow if only one of the two signals is present (partial init = already initialised)
- Block or delay routing after init completes

### FR-2: Nine Articles Interactive Review
Present each Article to the user one at a time, in order (I through IX).

**Must:**
- Display the Article number, name, and default text
- Explain in one sentence what the Article governs
- Offer three options: accept default / provide custom text / mark as not applicable
- For Articles IV, V, VI: display a `[NEEDS CLARIFICATION: <guidance on what belongs here>]` stub as the default
- Collect all responses before writing any files

**Must not:**
- Write `memory/constitution.md` until the user gives explicit final approval
- Skip any Article without user acknowledgement

### FR-3: Default Article Content
The six explicitly defined Articles must ship with canonical default content.

**Must:**
- Article I default: Library-First Principle (every feature begins as a standalone library)
- Article II default: CLI Interface Mandate (all libraries expose text-in/text-out CLI)
- Article III default: Test-First Imperative (no implementation before failing tests; non-negotiable)
- Article VII default: Simplicity Gate (≤3 projects; no future-proofing; complexity requires justification)
- Article VIII default: Anti-Abstraction Gate (use framework directly; single model representation)
- Article IX default: Integration-First Testing (real databases/services over mocks; contract tests mandatory)
- Articles IV, V, VI default: `[NEEDS CLARIFICATION]` stub with guidance text

**Must not:**
- Invent content for Articles IV–VI — they are stubs until the user fills them in

### FR-4: Scaffold Creation
After constitution approval, create the project scaffold.

**Must:**
- Write `memory/constitution.md` with approved Nine Articles and Amendment Process (Section 4.2)
- Create `docs/specs/.gitkeep`
- Create or update `CLAUDE.md` with: SDD workflow overview, link to `memory/constitution.md`, reference to the skill map
- Announce each file before creating it

**Must not:**
- Overwrite an existing `CLAUDE.md` without first showing the user what will change and getting approval

### FR-6: Project Context Exploration Before Article Review

Before presenting any Articles, `sdd-init` must run a codebase exploration to produce a Project Profile that personalises Article defaults for the user's specific stack.

**Must:**
- Dispatch a codebase exploration subagent before Step 2 begins
- The subagent reads: README.md, any package manifest (package.json, pyproject.toml, Cargo.toml, go.mod, requirements.txt, composer.json), and top-level directory structure
- Produce a Project Profile capturing: primary language, main framework, project type (service/library/CLI/web app/monorepo), existing test setup, notable architectural patterns
- Use the Project Profile to personalise the default text for each Article before presenting it (e.g. Article II CLI examples use language-appropriate tools; Article III test examples reference the detected framework)
- If the project is empty (no detectable files): fall back to generic defaults

**Must not:**
- Block or delay the Article review if exploration produces no useful signal
- Replace the user's ability to customise — exploration only personalises the starting default

### FR-5: Resume Normal Routing
After scaffold creation, `sdd-workflow` must resume its normal routing for the user's original request.

**Must:**
- Re-evaluate the user's original message against the SDD skill map
- Route to the appropriate skill (brainstorm, specify, etc.) as if init had not occurred

## Non-Functional Requirements

### Reliability
- If the user aborts the init flow mid-way, no partial files should be written
- If `memory/` directory does not exist, it must be created before writing `constitution.md`

### Usability
- Each Article interaction must fit in a single conversational turn (no walls of text)
- The full init flow should complete within 12 conversational exchanges (1 orient + 1 explore + 9 articles + 1 approval)

## Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| User aborts during Article review | No files written; inform user they can restart by invoking `sdd-workflow` again |
| `memory/constitution.md` already exists but `docs/specs/` does not | Skip constitution creation; create `docs/specs/` only; warn user that constitution already exists |
| `CLAUDE.md` exists but has no SDD content | Append SDD section to existing `CLAUDE.md` after showing diff and getting approval |

## Open Questions

- [NEEDS CLARIFICATION: Should Articles IV–VI have suggested names/topics in their stub text, or only a blank prompt? The spec-driven.md Core Principles section suggests IV=Research-Driven Context, V=Bidirectional Feedback, VI=Branching for Exploration — confirm if these should appear as hints in the stub]

## Out of Scope (Future Considerations)

- Constitution validation / linting during `sdd-plan` gate checks (separate feature)
- Multi-project monorepo support where each sub-project has its own constitution
- Visual companion integration for constitution review (could extend `sdd-brainstorm` visual companion)
