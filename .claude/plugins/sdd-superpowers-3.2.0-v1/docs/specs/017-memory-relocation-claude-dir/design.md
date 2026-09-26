# Design: Memory Relocation to `.claude/`

**Feature slug:** `017-memory-relocation-claude-dir`  
**Status:** Approved by user (Approach A — big-bang migration)

---

## Problem

The `memory/` directory lives at the project root alongside source code, docs, hooks, and
skills. Claude Code's operational files (`settings.local.json`) already live in `.claude/`.
Separating Claude-specific runtime files (`memory/`) from project content is cleaner and
makes the contract between "project code" and "Claude ops" explicit.

The root `CLAUDE.md` is the project-level instructions file. Claude Code also natively loads
`.claude/CLAUDE.md` as project instructions — moving there removes a top-level file that
belongs conceptually to the Claude runtime, not the project source.

---

## Chosen Approach: Big-bang migration (Approach A)

One spec, one branch, one PR. All changes land atomically so no intermediate broken state exists.

---

## Scope of Changes

### 1. Files to move
| From | To |
|------|----|
| `memory/foundation.md` | `.claude/memory/foundation.md` |
| `memory/MEMORY.md` | `.claude/memory/MEMORY.md` |
| `memory/feedback_*.md` (all feedback files) | `.claude/memory/feedback_*.md` |
| `memory/project_*.md` (all project files) | `.claude/memory/project_*.md` |
| `memory/steering/conventions.md` | `.claude/memory/steering/conventions.md` |
| `memory/steering/tech-stack.md` | `.claude/memory/steering/tech-stack.md` |
| `memory/steering/test-strategy.md` | `.claude/memory/steering/test-strategy.md` |
| `memory/steering/team-practices.md` | `.claude/memory/steering/team-practices.md` |
| `CLAUDE.md` (root) | `.claude/CLAUDE.md` |

Root `CLAUDE.md` is deleted after `.claude/CLAUDE.md` is created.

### 2. Hook scripts to update (path-level changes)
| File | Change |
|------|--------|
| `scripts/hooks/session-start.sh` | `${CWD}/memory/` → `${CWD}/.claude/memory/` (2 occurrences) |
| `scripts/hooks/post-write-memory-validate.sh` | `*/memory/*.md` pattern → `*/.claude/memory/*.md`; `${CWD}/memory/MEMORY.md` → `${CWD}/.claude/memory/MEMORY.md` |

### 3. Skills to update (prose references — ~40 occurrences)
All occurrences of `memory/` in skill files get updated to `.claude/memory/`:
- `skills/sdd-init/SKILL.md` — artifact table, step descriptions
- `skills/sdd-init/reference.md` — detection logic, write steps, steering file bodies
- `skills/sdd-init/templates/claude-md.md` — the generated CLAUDE.md template (also updates output location to `.claude/CLAUDE.md`)
- `skills/sdd-plan/reference.md` — steering scan instruction
- `skills/sdd-review/reference.md` — steering scan instruction
- `skills/sdd-research/reference.md` — steering scan instruction
- Any other skill files with `memory/` references

### 4. CLAUDE.md content update
The new `.claude/CLAUDE.md` is identical to the current root `CLAUDE.md` except:
- Path references updated: `memory/` → `.claude/memory/`

### 5. sdd-init behavior update
`sdd-init` currently creates `memory/` and writes `memory/foundation.md`. After this change it:
- Creates `.claude/memory/` and `.claude/memory/steering/`
- Writes `.claude/memory/foundation.md`
- Writes `.claude/memory/steering/*.md`
- Writes `.claude/CLAUDE.md` (not root `CLAUDE.md`)

---

## What Does NOT Change

- Hook mechanism (hooks.json, hook event names, hook logic) — only paths inside scripts change
- Memory file content, frontmatter format, MEMORY.md index format
- Skill workflow, gates, checklist items
- `.claude/settings.local.json`
- `docs/specs/`, `agents/`, `tests/`, `scripts/` (except the 2 hook scripts above)

---

## Risk: References in Memory Content Files

Memory files themselves may contain prose like "lives in `memory/`". These need a content
scan and update during migration. Likely only `CLAUDE.md` body and `memory/MEMORY.md` index
file have such references — both are being updated anyway.

---

## Verification

After migration:
1. `ls .claude/memory/` lists all moved files
2. `ls memory/` returns empty / directory not found
3. `CLAUDE.md` at root does not exist
4. `.claude/CLAUDE.md` exists with correct content
5. Session-start hook emits foundation.md and MEMORY.md content (manual test)
6. Writing a new memory file triggers post-write-validate hook (manual test)
7. `grep -r "memory/" skills/` returns zero results
8. Existing tests pass: `bash tests/*.sh`
