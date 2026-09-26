# Design: SDD Init Redesign — Mission Constitution + Steering Files

**Status:** Approved  
**Created:** 2026-06-23  
**Branch:** `013-sdd-init-redesign`

---

## Problem

The current `sdd-init` produces a nine-article constitution that mixes two fundamentally different concerns:

1. **SDD methodology rules** (Articles I–III, VII–IX: Library-First, CLI Mandate, TDD, Simplicity Gate, Anti-Abstraction, Integration-First) — these are SDD's own built-in principles, already enforced by the skills themselves
2. **Project-specific principles** (Articles IV–VI) — always delivered as `[NEEDS CLARIFICATION]` stubs, always left undefined

The result: a 12+ exchange ceremony that produces a document where 6 of 9 articles are generic SDD rules and the 3 articles that should be project-specific are always blank. The constitution is static after init and plays no active role in session behavior.

**Inspiration:** Kiro's steering files (scoped, composable, auto-injected context) + GitHub Spec-Kit's constitution-first approach (focused mission document before any feature work).

---

## Approach C: Two-Layer Foundation

### Architecture

```
memory/
  constitution.md          ← Mission Charter (always loaded, immutable, project-specific)
  steering/
    tech-stack.md          ← Languages, frameworks, infra choices
    test-strategy.md       ← Test philosophy, tooling, coverage expectations
    conventions.md         ← Naming, file structure, patterns your team follows
    team-practices.md      ← Review process, branching, release discipline
    [custom].md            ← User-defined topics with loaded-by frontmatter

skills/sdd-*/             ← SDD Hard Gates live here (baked into skill infrastructure)
```

### Layer Ownership

| Layer | Owned by | Changes via | Loaded when |
|---|---|---|---|
| Constitution | Project team | Amendment process (explicit approval) | Every session via CLAUDE.md |
| Steering files | Project team | Direct edit | Skill determines relevance via frontmatter |
| SDD Hard Gates | SDD methodology | Plugin release | Always (baked into skills) |

### What moves out of the constitution

SDD methodology articles (I, II, III, VII, VIII, IX) move fully into skill infrastructure — they are already enforced there implicitly. They are no longer part of the project constitution.

Articles IV–VI (always stubs in current design) become the seed for the user's 3–5 project-specific principles, surfaced through 4 focused questions rather than abstract article slots.

---

## Section 1: Constitution Format

### Init questions (one per turn, 4 total)

**Q1 — Mission:**
> "In one or two sentences: what does this project exist to do, and who does it serve?"

**Q2 — Non-negotiables:**
> "What are 1–3 things your team will never compromise on? (e.g. 'we never ship without a test', 'CLI-first always', 'no external dependencies without a spike')"

**Q3 — What failure looks like:**
> "What does a bad outcome look like for this project? (e.g. 'feature works locally but breaks in prod', 'specs drift from code', 'every PR needs a rewrite')"
> *(Inverts Q2 — surfaces principles people forget to state positively)*

**Q4 — Amendment process:**
> "How should principles change? Default: document rationale → explicit team approval → backwards-compatibility check. Accept or customise?"

Claude drafts the constitution from these four answers and shows it to the user for approval before writing.

### Constitution document structure

```markdown
# [Project Name] Constitution

> Loaded every session. To amend, follow the Amendment Process below.

## Mission
[Synthesized from Q1]

## Principles
1. [Derived from Q2 + Q3 — stated positively as an invariant]
2. [...]
3. [...]
(3–5 max, no SDD enforcement rules, no methodology mechanics)

## Operational Context
Steering files in `memory/steering/` carry project-specific operational context.
Each file's `loaded-by` frontmatter lists which skills inject it automatically.
Edit steering files freely — they are not subject to the amendment process.

## Amendment Process
[From Q4 — default: document rationale → explicit team approval → backwards-compatibility check]
```

---

## Section 2: Steering File Taxonomy

### Default files (scaffolded by init, pre-filled from project context)

| File | Scope | Auto-filled from |
|---|---|---|
| `memory/steering/tech-stack.md` | Languages, frameworks, infra | `package.json`, `pyproject.toml`, `go.mod`, README |
| `memory/steering/test-strategy.md` | Test philosophy, tooling, coverage | Detected test framework, CI config |
| `memory/steering/conventions.md` | Naming, file structure, architectural patterns | Directory structure, README patterns |
| `memory/steering/team-practices.md` | Review, branching, release discipline | `docs/git-convention.md` + defaults |

### Steering file structure

```markdown
---
scope: [tech-stack | test-strategy | conventions | team-practices | custom]
loaded-by: [comma-separated skill names]
---

# [Topic]

[Auto-generated content from project context — edit to match reality]
```

### Skill-loading protocol

| Skill | Loads |
|---|---|
| `sdd-specify` | `tech-stack.md`, `conventions.md` |
| `sdd-plan` | all four |
| `sdd-execute` | `tech-stack.md`, `test-strategy.md`, `conventions.md` |
| `sdd-research` | `tech-stack.md` |
| `sdd-review` | all four |
| `using-git` | `team-practices.md` |

User-defined steering files: any `.md` in `memory/steering/` with a valid `loaded-by` frontmatter field is automatically picked up by the listed skills.

---

## Section 3: Redesigned Init Flow

### New ceremony (~6 exchanges, two phases)

```
Phase 1: Mission Charter
  1. Announce + silent project context detection (subagent)
  2. Q1: Mission
  3. Q2: Non-negotiables
  4. Q3: What failure looks like
  5. Q4: Amendment process
  6. Show draft constitution → approval gate
  → Write memory/constitution.md

Phase 2: Steering Scaffold
  7. Auto-generate 4 steering files from detected project context
  8. Show summary: "Here's what I pre-filled — edit these to match reality"
  → Write memory/steering/*.md

Then (unchanged):
  → CLAUDE.md (created/updated with foundation pointer)
  → docs/specs/.gitkeep
  → docs/git-convention.md (4 git questions, unchanged)
  → Initial commit
  → Hand off to sdd-workflow
```

### Comparison to current flow

| Current | New |
|---|---|
| 9 articles reviewed one-by-one | 4 mission questions |
| Articles IV–VI always stubs | No stubs — principles from user's own words |
| SDD rules embedded in constitution | SDD rules stay in skills |
| No steering files | 4 pre-filled steering files |
| 12+ exchanges | ~6 exchanges |
| Constitution static | Steering files evolve freely; constitution stays immutable |

### CLAUDE.md addition

```markdown
## Project Foundation

Before any feature work, read:
- `memory/constitution.md` — Mission and principles. Loaded every session.
- `memory/steering/` — Operational context. Loaded by skills when relevant.
  Each file's `loaded-by` frontmatter shows which skills inject it.
```

---

## Edge Cases and Decisions

### Migration from nine-article constitution
**Decision:** Out of scope. If `memory/constitution.md` exists in the old nine-article format, `sdd-init` warns the user and exits without writing files. Migration is a future feature.

### Steering file loading mechanism
Skills load steering files via **explicit file reads at invocation time** — each skill reads `memory/steering/` and filters for files whose `loaded-by` frontmatter includes the skill's name. Loading is **silent by default** (no announcement to the user). The skill incorporates the content as context before proceeding. This scan happens at invocation time each session, so custom files added after init are discovered automatically.

### CLAUDE.md detection for existing foundation block
When `CLAUDE.md` already exists, detect the new format by looking for the `## Project Foundation` marker. If found: skip. If absent but `## SDD Workflow` marker exists (old format): append the `## Project Foundation` block after showing the user what will be added and getting approval.

### Abort handling for Phase 2 (steering scaffold)
If the user aborts during Phase 2 (steering file generation), any files already written are **kept** — they are pre-filled templates and not destructive. A warning is shown: "Steering files partially created — edit `memory/steering/` to complete them." Phase 1 (constitution) is already committed at this point.

### Git convention setup
The 4-question git convention setup (branch pattern, ticket prefix, commit format, allowed types) is **unchanged** from the current `sdd-init/reference.md` Step 5.4. The redesign does not modify that step — it remains the source of truth.

---

## Non-Goals

- Auto-enforcing constitution principles in code generation (stays with `sdd-plan` gates)
- Migrating existing projects with nine-article constitutions (future feature — blocked with warning at init time)
- Visual companion for constitution review
- Steering file versioning (files are edited directly, not versioned like specs)
