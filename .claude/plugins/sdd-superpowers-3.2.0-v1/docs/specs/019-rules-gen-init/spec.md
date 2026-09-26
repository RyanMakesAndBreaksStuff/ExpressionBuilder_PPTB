# Feature 019: Rules Generation in sdd-init

**Status:** Approved
**Created:** 2026-07-04
**Branch:** `019-rules-gen-init`

---

## Problem Statement

`sdd-init` establishes a project foundation through manual Q&A but has no awareness of the project's actual tech stack or community best practices. Rules — the primary mechanism for shaping Claude Code's behavior on a project — are left entirely to the user to write from scratch after init. This means every new project starts with no guardrails, no enforced conventions, and no automation hooks until the user manually researches and writes them.

## Goals

- Extend `sdd-init` with a rules generation phase that runs between foundation approval and steering file generation
- Detect the project's tech stack automatically from manifest files
- Dispatch parallel research subagents to gather best practices, anti-patterns, permissions, and automation patterns from the web
- Propose per-topic rule files in `.claude/rules/` for user review before writing
- Propose `settings.json` entries (allowedTools, blockedTools, ignorePatterns, hooks) for user review before writing
- Allow users to approve, tweak, or skip each proposed section independently
- Write all approved files atomically, then continue the normal `sdd-init` flow unchanged

## Non-Goals

- Generating or updating rules on existing projects (not init territory)
- Refreshing or re-running rules generation after init completes
- Cross-referencing generated rules with existing `CLAUDE.md` content for conflicts
- Supporting non-Markdown rule file formats
- Providing a migration path for projects that already have `.claude/rules/`
- Generating a fixed, mandatory set of rule files regardless of stack

## Users and Context

**Primary users:** Claude (the AI model) — reads the updated `sdd-init` skill prose and executes the rules generation phase  
**Secondary users:** SDD practitioners — invoke `sdd-init` on a new project and review the proposed rules before they are written  
**Usage context:** Every new project initialization where `sdd-init` is invoked and a tech stack is detectable  
**User mental model:** After answering the Mission Charter questions, users expect the tool to "know" their stack and give them sensible rules to start with — not a blank slate

---

## User Stories

### Story 1: Tech stack is detected from manifest files

**As a** developer initializing a new project  
**I want** the init skill to detect my tech stack automatically  
**So that** research subagents have accurate context without me answering additional questions

**Acceptance criteria:**

- [ ] **AC-1.1** Given a `package.json` exists at the project root When phase 2b runs Then the stack is identified from its `dependencies` and `devDependencies` fields and passed to all three subagents
- [ ] **AC-1.2** Given multiple manifest files exist (e.g. `package.json` + `pyproject.toml`) When phase 2b runs Then all detected stacks are included in the context passed to subagents
- [ ] **AC-1.3** Given no known manifest files exist When phase 2b runs Then the controller asks exactly one question: the primary language and framework, and uses the answer as the stack context

### Story 2: Three research subagents run in parallel

**As a** developer  
**I want** best practices, security rules, and automation patterns researched concurrently  
**So that** init does not take longer than necessary

**Acceptance criteria:**

- [ ] **AC-2.1** Given stack context is available When phase 2c begins Then exactly three subagents are dispatched concurrently: Conventions, Security & Permissions, and Automation & Hooks
- [ ] **AC-2.2** Given all three subagents complete When the controller collects results Then each result is a structured summary (topics + rules), not raw web content
- [ ] **AC-2.3** Given a subagent returns no usable results When the controller synthesizes proposals Then that subagent's output section is marked as empty and the user is notified — init does not fail

### Story 3: Conventions subagent infers per-topic rule files from the stack

**As a** developer  
**I want** rule files organized by topic, inferred from my stack  
**So that** I get relevant files (e.g. `frontend/components.md`) without a fixed generic set

**Acceptance criteria:**

- [ ] **AC-3.1** Given the Conventions subagent result When topics are determined Then the set of proposed `.claude/rules/` files is derived from the stack, not a fixed mandatory list
- [ ] **AC-3.2** Given the stack has distinct layers (e.g. frontend + backend) When files are proposed Then they are organized into subdirectories (e.g. `.claude/rules/frontend/`, `.claude/rules/backend/`)
- [ ] **AC-3.3** Given a proposed rule file When its content is written Then it covers exactly one topic and has a descriptive filename (e.g. `testing.md`, `api-design.md`)
- [ ] **AC-3.4** Given a proposed rule file When its content is written Then it includes best practices (dos), anti-patterns (don'ts), and conventions for the topic

### Story 4: User reviews and approves rule files before writing

**As a** developer  
**I want** to review each proposed rule file and tweak or skip it  
**So that** only rules I agree with are written to my project

**Acceptance criteria:**

- [ ] **AC-4.1** Given proposed rule files When presented to the user Then each file is shown one at a time with its proposed content
- [ ] **AC-4.2** Given a proposed rule file is shown When the user responds Then they can choose: approve (write as-is), tweak (edit inline then approve), or skip (write nothing for that file)
- [ ] **AC-4.3** Given the user skips a rule file When init continues Then no file is written for that topic and init does not prompt for it again

### Story 5: User reviews and approves settings.json before writing

**As a** developer  
**I want** to review the proposed `settings.json` entries  
**So that** I control which tools are allowed, blocked, and which hooks run

**Acceptance criteria:**

- [ ] **AC-5.1** Given Security & Permissions and Automation & Hooks subagents complete When the `settings.json` block is proposed Then it includes `allowedTools`, `blockedTools`, `ignorePatterns`, and `hooks` sections
- [ ] **AC-5.2** Given the proposed `settings.json` is shown When the user responds Then they can approve, tweak, or skip the entire block
- [ ] **AC-5.3** Given an existing `settings.json` already exists at the project root When the proposal is shown Then the user is explicitly told a file already exists and asked whether to merge, overwrite, or skip — the existing file is never silently overwritten

### Story 6: Approved files are written atomically, then init continues

**As a** developer  
**I want** all approved files written in one uninterrupted pass  
**So that** the project is never left in a partially-written state

**Acceptance criteria:**

- [ ] **AC-6.1** Given all review gates have passed When writing begins Then all approved `.claude/rules/*.md` files and `settings.json` are written before any other action
- [ ] **AC-6.2** Given writing completes When init resumes Then the steering file generation phase (step 3) and scaffold phase (step 4) proceed unchanged
- [ ] **AC-6.3** Given existing `.claude/rules/` files exist at any path When writing begins Then each conflicting file prompts the user before overwriting — no silent overwrites

### Story 7: Steering files benefit from research results

**As a** developer  
**I want** the steering files generated by init to reflect the researched tech stack  
**So that** `tech-stack.md` is pre-populated from detection, not inferred from scratch

**Acceptance criteria:**

- [ ] **AC-7.1** Given the stack detection result from phase 2b When the steering file generation phase runs Then `tech-stack.md` is populated with the detected stack information
- [ ] **AC-7.2** Given the Conventions subagent result When `conventions.md` steering file is written Then it incorporates relevant findings from the subagent summary

---

## Functional Requirements

- **FR-1** The skill reads the following manifest files for stack detection: `package.json`, `pyproject.toml`, `requirements.txt`, `Cargo.toml`, `go.mod`, `composer.json`, `Gemfile`, `build.gradle`, `pom.xml`
- **FR-2** Stack detection runs before any subagent is dispatched
- **FR-3** Exactly three subagents are dispatched in parallel: Conventions, Security & Permissions, Automation & Hooks
- **FR-4** The Conventions subagent searches for: naming conventions, project structure, linting/formatting standards, best practices, and anti-patterns for the detected stack
- **FR-5** The Security & Permissions subagent searches for: dangerous commands to block, safe CLI tools to allow, sensitive file patterns, and security anti-patterns for the detected stack
- **FR-6** The Automation & Hooks subagent searches for: common pre-commit checks, format-on-save, test-on-push patterns, and community-recommended hook setups for the detected stack
- **FR-7** Topic files are inferred by the Conventions subagent from stack context — no fixed mandatory file list
- **FR-8** Rule files are written to `.claude/rules/` with `.md` extension; subdirectories are used when the stack has distinct layers
- **FR-9** Each rule file covers exactly one topic with a descriptive filename
- **FR-10** `settings.json` entries include `allowedTools`, `blockedTools`, `ignorePatterns`, and `hooks`
- **FR-11** Every proposed section (each rule file + settings.json) has an approve / tweak / skip gate before writing
- **FR-12** All approved files are written atomically in one pass before init continues
- **FR-13** Existing files are never silently overwritten — a conflict triggers an explicit user prompt
- **FR-14** If no manifest files are detected, the controller asks exactly one fallback question for stack context

## Non-Functional Requirements

- **NFR-1** The three research subagents run concurrently, not sequentially
- **NFR-2** Subagent results are structured summaries consumable by the controller without further web lookups
- **NFR-3** Rule files use standard Markdown and are discoverable recursively by Claude Code from `.claude/rules/`
- **NFR-4** The rules generation phase does not alter or delay any existing `sdd-init` phase beyond inserting phases 2b and 2c

---

## Error Scenarios

- **No manifest files found**: Controller asks one question — "What is the primary language and framework for this project?" — and uses the answer as stack context
- **Subagent returns no usable results**: That subagent's output section is presented as empty with a note to the user; init continues without failing
- **Existing `settings.json` at project root**: User is told the file exists and asked to choose: merge proposed entries, overwrite, or skip
- **Existing `.claude/rules/` files conflict with proposed files**: Each conflicting file triggers an individual prompt before overwriting
- **User skips all sections**: Init continues to steering files and scaffold with no rules written; user is not re-prompted

---

## Open Questions

_None — all design decisions resolved in brainstorm session (see `design.md`)._

---

## Out of Scope

- Updating or refreshing rules on existing projects
- A standalone `sdd-rules-gen` skill that works outside of init
- Cross-referencing generated rules with existing `CLAUDE.md` for conflicts
- Non-Markdown rule formats
- Migration tooling for projects that already have `.claude/rules/`
