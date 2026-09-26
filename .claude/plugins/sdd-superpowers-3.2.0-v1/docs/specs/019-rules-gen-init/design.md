# Design: Rules Generation in sdd-init

**Status:** Approved
**Created:** 2026-07-04
**Feature slug:** 019-rules-gen-init

---

## Problem

`sdd-init` establishes a project foundation through manual Q&A, then writes steering files and scaffold with generic defaults. It has no awareness of the project's actual tech stack or community best practices. Rules — the primary mechanism for shaping Claude Code's behavior on a project — are left entirely to the user to write from scratch after init.

## Goal

Extend `sdd-init` with an automated rules generation phase: detect the tech stack from manifest files, dispatch parallel research subagents to gather best practices and anti-patterns from the web, propose per-topic rule files for user review, then write approved rules atomically before continuing the normal init flow.

---

## Where It Fits in `sdd-init`

Current flow:
1. Mission Charter (4 questions)
2. Write `foundation.md` → user approval
3. Auto-generate steering files
4. Write scaffold files → initial commit

New flow inserts two phases between steps 2 and 3:

> **2b.** Detect tech stack from manifest files  
> **2c.** Dispatch 3 parallel research subagents → collect results → propose rules → user approves/tweaks → write files  

Steering files in step 3 can read research results to pre-populate `tech-stack.md` instead of inferring from scratch.

---

## Tech Stack Detection

Scan the project root for known manifest files and read them to identify frameworks and tooling:

| File | Signals |
|------|---------|
| `package.json` | Node/JS frameworks (Next.js, React, Express, etc.), test runners, linters |
| `pyproject.toml` / `requirements.txt` | Python frameworks (FastAPI, Django, Flask), tools |
| `Cargo.toml` | Rust + crate ecosystem |
| `go.mod` | Go modules and version |
| `composer.json` | PHP frameworks (Laravel, Symfony) |
| `Gemfile` | Ruby frameworks (Rails, Sinatra) |
| `build.gradle` / `pom.xml` | JVM stack (Spring, Kotlin) |

Detection result feeds all three research subagents as context.

---

## Research Subagents (Parallel)

Three subagents run in parallel after stack detection. Each returns a structured summary — not raw web content — that the controller synthesizes into proposals.

| Subagent | Web searches for | Feeds |
|----------|-----------------|-------|
| **Conventions** | Naming conventions, project structure, linting/formatting standards, best practices, anti-patterns to avoid for the detected stack | `.claude/rules/*.md` topic files |
| **Security & Permissions** | Dangerous commands to block, safe CLI tools to allow, sensitive file patterns, security anti-patterns for the stack | `settings.json` (allowedTools, blockedTools, ignorePatterns) |
| **Automation & Hooks** | Common pre-commit checks, format-on-save, test-on-push patterns, community-recommended hook setups for the stack | `hooks` section in `settings.json` |

---

## Output Files

### `.claude/rules/` — per-topic rule files

Topics are **inferred from the stack**, not fixed. The Conventions subagent determines which files to generate. Examples for a Next.js + Prisma project:

```
.claude/rules/
  conventions.md          ← naming, structure, formatting
  best-practices.md       ← stack-specific dos
  anti-patterns.md        ← stack-specific don'ts
  testing.md              ← test strategy rules
  security.md             ← sensitive patterns, auth rules
  frontend/
    components.md         ← React/Next.js component rules
  backend/
    api-design.md         ← API conventions
```

Each file covers exactly one topic with a descriptive filename. Subdirectories (e.g. `frontend/`, `backend/`) are used when the stack has clearly distinct layers.

### `settings.json`

Populated with:
- `allowedTools` — safe CLI commands for the stack
- `blockedTools` — dangerous commands identified by Security subagent
- `ignorePatterns` — sensitive file patterns (`.env`, secrets, etc.)
- `hooks` — automation hooks from the Automation subagent

---

## User Review Flow

After subagents return, the controller presents proposals one file at a time:

1. **Rule files** — proposed content for each `.claude/rules/*.md` file, grouped by topic. User can accept all, edit individual rules, or drop any file.
2. **`settings.json`** — shown as structured blocks (allowedTools, blockedTools, ignorePatterns, hooks). User tweaks before writing.

Each section ends with an explicit **approve / tweak / skip** gate:
- **Approve**: write as proposed
- **Tweak**: user edits inline, then approve
- **Skip**: write nothing for that file (e.g. user already has their own `settings.json`)

After all gates pass, all files are written atomically in one pass, then `sdd-init` continues to steering files and scaffold as normal.

---

## Constraints

- Rules files use `.md` format, discovered recursively by Claude Code from `.claude/rules/`
- Topic files are inferred from stack — never a fixed mandatory set
- The review gate cannot be bypassed; no files are written until the user approves each section
- If stack detection finds no known manifest files, subagents fall back to asking the user one question: "What's the primary language and framework?"
- `settings.json` and `.claude/rules/` are written only if the user approves; existing files are not overwritten without explicit confirmation

---

## Non-Goals

- Generating rules for projects that already have `.claude/rules/` (that is not init territory)
- Updating or refreshing rules on existing projects
- Cross-referencing rules with existing `CLAUDE.md` content for conflicts
- Supporting non-Markdown rule formats
