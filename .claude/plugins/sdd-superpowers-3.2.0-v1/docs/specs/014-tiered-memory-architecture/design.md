# Design: Tiered Memory Architecture (Feature 014)

**Status:** Draft — pending spec
**Created:** 2026-06-24
**Branch:** `014-tiered-memory-architecture`

---

## Problem

Memory is currently scattered across three always-loaded artifacts with overlapping concerns:

- `CLAUDE.md` — carries meta-instructions, skill table, workflow diagram, AND implicitly describes project identity
- `memory/constitution.md` — carries mission + principles (project identity) — duplicates identity purpose with CLAUDE.md
- `memory/MEMORY.md` — index for reactive memory files

Additionally:
- `memory/steering/*.md` overlaps with CLAUDE.md on tech stack and conventions — no single source of truth
- The four memory types (user/feedback/project/reference) blur in practice — nothing enforces dedup before a new entry is written
- `CLAUDE.md` in the sdd-superpowers plugin repo is long and mixes static meta-instructions with project-specific content

## Decision

Adopt a **three-tier memory model** that assigns each artifact exactly one job, eliminates duplication, and makes the loading mechanism self-documenting via frontmatter.

---

## Tier Model

### Tier 0 — Foundation (`memory/foundation.md`)

**Job:** Project identity. Mission, principles, amendment process.
**Loaded:** Always — session-start hook.
**Written:** By `sdd-init` 4-question ceremony (replaces `memory/constitution.md`).
**Updated:** Via formal amendment process only (rationale + approval required).
**Protected:** Amendment gate declared inside the file itself.

Replaces `memory/constitution.md` 1-for-1. Same content schema (Mission, Principles, Operational Context pointer, Amendment Process). Only the filename changes.

### Tier 1 — Operational (`memory/steering/*.md`)

**Job:** Skill-specific operational context. Tech stack, conventions, test strategy, team practices.
**Loaded:** On demand — each skill reads its `loaded-by` frontmatter and pulls matching steering files at invocation time.
**Written:** By `sdd-init` project-context auto-detection.
**Updated:** Freely editable — no ceremony, no amendment process.
**Source of truth:** Tier 1 wins over CLAUDE.md for any fact both could describe (tech stack, conventions). CLAUDE.md must not repeat content already in steering files.

### Tier 2 — Reactive (`memory/*.md` + `memory/MEMORY.md`)

**Job:** Facts learned during sessions. User preferences, feedback on approach, project decisions, external references.
**Loaded:** MEMORY.md index always in context (truncated at 200 lines); individual files read on demand when relevant.
**Written:** During sessions when a new fact is established (correction, confirmation, decision).
**Dedup rule:** Check MEMORY.md index before writing. If the topic already has an entry, update that file — never create a duplicate.
**Types (unchanged):** user / feedback / project / reference.

---

## CLAUDE.md — Boot Layer Only

`CLAUDE.md` is reduced to four elements:

1. **Skill invocation rule** — invoke `sdd-superpowers:sdd-workflow` before any work
2. **Memory pointer** — memory lives in `memory/`; index is `MEMORY.md`; identity is `foundation.md`
3. **Hard gates** — the four gates (no plan without spec, no tasks without plan, no code without failing test, no completion without verification)
4. **Nothing else** — no skills table, no workflow diagram, no tech stack, no mission statement

The plugin ships a CLAUDE.md template. `sdd-init` generates a project-specific version from this template, substituting the project name.

---

## sdd-init Changes

### Existence Checks (run before generating anything)

| State | Action |
|-------|--------|
| `memory/foundation.md` exists | Warn "foundation.md already exists — project already initialized" and exit |
| `memory/constitution.md` exists (old format) | Warn "old constitution detected — run migration before re-initializing" and exit |
| Both `constitution.md` and `foundation.md` exist | Warn about conflicting state, tell user to manually resolve, exit |
| Neither exists | Proceed with generation |

### Generated Artifacts

`sdd-init` generates three artifacts for a new project:

### `CLAUDE.md` (from template)

The file includes an `<!-- sdd-init: generated -->` sentinel comment so `sdd-init` can detect a prior-written file and skip re-generation:

```markdown
<!-- sdd-init: generated -->
# [Project Name]

Before starting work, invoke `sdd-superpowers:sdd-workflow`.

Memory lives in `memory/` — see `memory/MEMORY.md` for the index.
Project identity is in `memory/foundation.md`.

## Hard Gates
- NO PLAN without an approved spec
- NO TASKS without a plan
- NO CODE without a prior failing test
- NO COMPLETION CLAIM without fresh verification evidence
```

If `CLAUDE.md` already exists and does NOT contain the sentinel, `sdd-init` appends a `## Project Foundation` section rather than overwriting.

### `memory/foundation.md` (from 4-question ceremony)

Same 4-question flow as spec 013 (mission, non-negotiables, failure definition, amendment process). Output schema:

```markdown
# [Project Name] Foundation

> Loaded every session. To amend, follow the Amendment Process below.

## Mission
[synthesized from Q1]

## Principles
[synthesized from Q2 + Q3]

## Operational Context
Steering files in `memory/steering/` carry skill-specific operational context.
Each file's `loaded-by` frontmatter lists which skills incorporate it.

## Amendment Process
[synthesized from Q4]
```

### `memory/steering/*.md` (auto-detected)

Same auto-detection logic as spec 013. Files: `tech-stack.md`, `test-strategy.md`, `conventions.md`, `team-practices.md`.

---

## Conflict Resolution Rules

| Conflict | Resolution |
|----------|-----------|
| Tier 0 vs Tier 2 on a principle | Tier 0 wins — foundation is authoritative |
| Tier 1 vs CLAUDE.md on tech stack or conventions | Tier 1 wins — CLAUDE.md must not repeat it |
| Two Tier 2 files covering the same topic | Before writing: scan MEMORY.md. Update existing entry. Never duplicate. |
| Stale Tier 2 memory vs current code/files | Current code wins. Verify before citing. Update or remove stale entry. |

---

## Retrieval Flow

```
Session start
├── Claude Code loads CLAUDE.md                    [boot layer, always — platform]
├── SessionStart hook loads memory/foundation.md   [Tier 0, always — settings.json hook]
└── SessionStart hook loads memory/MEMORY.md       [Tier 2 index, always — same hook]

Skill invoked (e.g. sdd-plan)
└── Skill reads loaded-by → loads steering files   [Tier 1, on demand — skill instruction]

Claude needs a specific fact
└── Reads MEMORY.md index → reads Tier 2 file      [Tier 2, on demand]
```

The SessionStart hook is configured in `.claude/settings.json` under `hooks.SessionStart`. It currently loads `memory/constitution.md`; this feature updates that reference to `memory/foundation.md`. No new hook type is introduced.

**MEMORY.md truncation:** The index is kept at ≤ 200 lines by always appending new entries at the bottom and pruning the oldest entries when the limit is reached. Entries are pruned oldest-first (bottom of file = most recent). If an entry is pruned, its backing file remains — it is just no longer auto-surfaced; Claude can still read it if given the filename directly.

---

## Migration (sdd-superpowers repo itself)

| Current | Action |
|---------|--------|
| `memory/constitution.md` | Rename to `memory/foundation.md`; update session-start hook reference |
| `CLAUDE.md` (this repo) | Trim to boot layer; move skill table + workflow diagram to a steering or reference doc |
| Session-start hook | Update file path: `constitution.md` → `foundation.md`; update whitelist |
| PostToolUse:Write hook | Whitelist: `foundation.md`, `MEMORY.md`, `steering/*.md` from frontmatter validation |
| Old-constitution detection in sdd-init | Update check: look for `## Article I` OR `## Mission` + missing `foundation.md` naming |

---

## What Does NOT Change

- The 4-question ceremony flow (from spec 013) — unchanged
- Tier 2 memory types: user / feedback / project / reference — unchanged
- Steering file `loaded-by` frontmatter convention — unchanged
- `memory/MEMORY.md` format and 200-line truncation rule — unchanged
- Amendment process semantics — unchanged, just moved from constitution.md to foundation.md

---

## Decisions

1. **CLAUDE.md template location** → `skills/sdd-init/templates/claude-md.md` (separate file, not inline in reference.md)
2. **sdd-superpowers CLAUDE.md migration** → in this feature (not a follow-on)
3. **Tier 1 enforcement** → documentation-only convention; no lint hook required
4. **Tier 2 dedup threshold** → Claude uses judgment per session; operationalizable rule: same memory type + overlapping named entity = same topic → update existing file; otherwise create new
5. **MEMORY.md pruning** → oldest-first confirmed
