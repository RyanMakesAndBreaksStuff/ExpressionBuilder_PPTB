# Plan: Feature 019 — Rules Generation in sdd-init

**Spec:** `docs/specs/019-rules-gen-init/spec.md`
**Status:** Draft

---

## Goal

Extend `sdd-init` with an automated rules generation phase (Step 4) inserted between Step 3 (write `foundation.md`) and Step 5 (scaffold creation). The phase detects the tech stack, dispatches 3 parallel research subagents, proposes per-topic rule files and `settings.json` entries for user review, then writes approved files atomically before continuing the existing init flow.

---

## Architecture

This feature modifies two skill files only — no new files are created:

| File | Change |
|------|--------|
| `skills/sdd-init/reference.md` | Insert Step 4 (Rules Generation Phase); update Step 5.2; update Step 5.6 commit command |
| `skills/sdd-init/SKILL.md` | Update files table + process summary to reflect new outputs |

No code is written. These are skill prose files read by Claude at runtime.

---

## Tech Stack

Markdown skill prose. No runtime dependencies. Changes are verified by reading the updated files and manually tracing through the flow against each acceptance criterion.

---

## File Structure

```
skills/sdd-init/
  SKILL.md          ← update: files table, process summary
  reference.md      ← update: insert Step 4; update Steps 5.2 and 5.6
```

---

## Phases

### Phase 1 — Insert Step 4 into `reference.md`

Insert the complete Step 4 block between Step 3 and Step 5 in `skills/sdd-init/reference.md`.

**Locate insertion point:** after the closing line of Step 3:
```
## Step 5: Scaffold Creation
```

**Insert before that line:**

```markdown
## Step 4: Rules Generation Phase

### Step 4.1: Detect Tech Stack

Use the Project Profile already gathered in Step 1.5. If any manifest files were not read during exploration, read them now:

| File | Read fields |
|------|-------------|
| `package.json` | `dependencies`, `devDependencies`, `scripts` |
| `pyproject.toml` | `[tool.poetry.dependencies]`, `[project]` |
| `requirements.txt` | all packages |
| `Cargo.toml` | `[dependencies]` |
| `go.mod` | module name, `require` block |
| `composer.json` | `require`, `require-dev` |
| `Gemfile` | all gems |
| `build.gradle` | `dependencies` block |
| `pom.xml` | `<dependencies>` |

Produce a **Stack Context** string: language(s), frameworks, test runners, linters, notable tools (e.g. "TypeScript, Next.js 14, Prisma, Jest, ESLint/Prettier").

**Fallback:** If no manifest files are found and Step 1.5 returned "Empty project — no context detected", ask exactly one question:
> "What is the primary language and framework for this project?"

Use the answer as the Stack Context. Do not ask any further questions.

---

### Step 4.2: Dispatch Research Subagents (Parallel)

Announce: "Researching best practices, security rules, and automation patterns for your stack. Running three parallel lookups."

Dispatch exactly three subagents **concurrently** — not sequentially — each receiving the Stack Context.

**Subagent 1 — Conventions**

> "You are researching development best practices for: [Stack Context].
>
> Search the web for:
> 1. Naming conventions (files, functions, variables, modules)
> 2. Recommended project directory structure
> 3. Linting and formatting best practices
> 4. Commonly cited best practices (dos) for this stack
> 5. Commonly cited anti-patterns (don'ts) to avoid
>
> Based on your research, propose a set of per-topic rule files for `.claude/rules/`. Infer the topics from the stack — do NOT use a fixed list. For each topic:
> - `filename`: descriptive, e.g. `testing.md`, `api-design.md`
> - `subdir` (optional): use when the stack has distinct layers, e.g. `frontend/`, `backend/`
> - `rules`: 5–10 rules mixing best practices (✓ do), anti-patterns (✗ avoid), and conventions
>
> Return a structured list. Do NOT return raw web text — synthesize into actionable rules only."

**Subagent 2 — Security & Permissions**

> "You are researching security and permission needs for: [Stack Context].
>
> Search the web for:
> 1. Dangerous shell commands that should be blocked when working with this stack
> 2. Safe CLI tools developers commonly allow in Claude Code for this stack
> 3. Sensitive file patterns that should be protected
> 4. Security anti-patterns specific to this stack
>
> Return a structured summary with exactly these keys:
> - `allowedTools`: list of safe CLI command prefixes (e.g. `npm`, `jest`, `prisma`)
> - `blockedTools`: dangerous commands to block (e.g. `rm -rf`, `DROP TABLE`)
> - `ignorePatterns`: sensitive file/directory patterns (e.g. `.env`, `*.pem`, `secrets/`)
>
> Do NOT return raw web text — synthesize into concrete, actionable entries only."

**Subagent 3 — Automation & Hooks**

> "You are researching automation and hook patterns for: [Stack Context].
>
> Search the web for:
> 1. Common pre-commit checks for this stack (lint, format, type check)
> 2. Test-on-push patterns
> 3. Community-recommended Claude Code hook setups for this stack
>
> Return a structured list of hooks for Claude Code's `settings.json`. For each hook:
> - `event`: one of `PreToolUse`, `PostToolUse`, `Stop`, `Notification`
> - `matcher` (optional): tool name pattern to match
> - `command`: the shell command to run
>
> Do NOT return raw web text — synthesize into concrete, actionable entries only."

**Empty result handling:** If a subagent returns no usable results, mark its section as empty and note: "No [conventions / security / automation] rules could be generated — you can add these manually later." Init does not fail.

---

### Step 4.3: User Review Flow

After all three subagents complete, present proposals for review in two sections. Do NOT write any files during this step.

**Section A — Rule files (from Subagent 1 results)**

For each proposed `.claude/rules/` file, present in sequence:

```
Proposed: .claude/rules/[subdir/]filename.md

[full proposed file content]

Approve as-is, tweak the content, or skip this file? (approve / tweak / skip)
```

- **approve**: mark for writing; move to next file
- **tweak**: show content in an editable block; when user confirms, mark for writing; move to next file
- **skip**: mark as skipped; do not prompt for this file again; move to next file

**Section B — settings.json (from Subagents 2 and 3)**

Merge both subagents' results into a single `settings.json` block:

```json
{
  "allowedTools": ["<tool>", "..."],
  "blockedTools": ["<tool>", "..."],
  "ignorePatterns": ["<pattern>", "..."],
  "hooks": [
    {
      "event": "<PreToolUse|PostToolUse|Stop|Notification>",
      "matcher": "<optional>",
      "command": "<shell command>"
    }
  ]
}
```

**Conflict check:** Before presenting, check whether `settings.json` already exists at the project root.
- If it exists: announce "A `settings.json` already exists. Choose: (merge) add proposed entries alongside existing ones, (overwrite) replace the file entirely, or (skip) leave the file unchanged."
- If it does not exist: present the block directly.

Then ask: "Approve this settings.json block, tweak it, or skip it? (approve / tweak / skip)"

---

### Step 4.4: Write Approved Files (Atomic)

Write all approved files in one uninterrupted pass — no user interaction between writes.

1. **Rule files:** For each approved rule file:
   - Create parent directory if it does not exist (e.g. `mkdir -p .claude/rules/frontend/`)
   - If a file already exists at the target path: prompt "`.claude/rules/[path]` exists — overwrite or skip?" and act accordingly
   - Write the approved content

2. **settings.json:**
   - If approved with **merge**: read existing file, merge entries (union lists for arrays, no duplicates), write merged result
   - If approved with **overwrite**: write proposed block as the new file
   - If approved with **no conflict**: write proposed block as new file
   - If skipped: write nothing

After writing, announce:
> "Rules generation complete:
> - `.claude/rules/` — [N] files written ([list filenames])
> - `settings.json` — [written / merged / skipped]"

Proceed to Step 5.

---
```

**Covers:** FR-1 through FR-14, AC-1.1 through AC-6.3, NFR-1 through NFR-4, all error scenarios.

---

### Phase 2 — Update Step 5.2 in `reference.md`

After Step 4 is inserted, update `Step 5.2 Generate Steering Files` to use the Stack Context and subagent results from Step 4 instead of re-deriving from scratch.

**Locate:** the `tech-stack.md` template block in Step 5.2.

**Replace** the comment `Use the Project Profile from Step 1.5 to pre-fill each file.` with:

```markdown
Use the Stack Context from Step 4.1 and the Conventions subagent summary from Step 4.2 to pre-fill each file. If rules generation was skipped or returned empty, fall back to the Project Profile from Step 1.5.
```

**Update** the `tech-stack.md` template placeholders:
- `[Detected: {{language}} — edit to match reality]` → populated from Stack Context language field
- `[Detected: {{framework}} — edit to match reality]` → populated from Stack Context framework field

**Update** the `conventions.md` template:
- After `## Code Style`, add: `[From rules generation research — edit to match reality]` when Conventions subagent results are available

**Covers:** AC-7.1, AC-7.2.

---

### Phase 3 — Update Step 5.6 initial commit in `reference.md`

**Locate** the `git add` command in Step 5.6:

```bash
git add .claude/memory/foundation.md .claude/memory/steering/ docs/specs/.gitkeep .claude/CLAUDE.md docs/git-convention.md
```

**Replace** with:

```bash
git add .claude/memory/foundation.md .claude/memory/steering/ docs/specs/.gitkeep .claude/CLAUDE.md docs/git-convention.md
# Include rules and settings if generated
git add .claude/rules/ settings.json 2>/dev/null || true
```

**Covers:** ensures generated files are included in the initial commit when present.

---

### Phase 4 — Update `SKILL.md`

**1. Update the files table** — add two new rows:

```markdown
| `.claude/rules/*.md` | Per-topic rule files — best practices, anti-patterns, conventions inferred from stack |
| `settings.json` | Allowed/blocked tools, ignore patterns, and automation hooks inferred from stack |
```

**2. Update Process Summary** — replace:

```markdown
4. Auto-generate 4 steering files from detected context → write `.claude/memory/steering/*.md`
```

with:

```markdown
4. Rules generation: detect stack → 3 parallel research subagents → user review (approve/tweak/skip) → write `.claude/rules/*.md` and `settings.json`
5. Auto-generate 4 steering files from detected context + research results → write `.claude/memory/steering/*.md`
```

(Re-number existing steps 4 and 5 to 5 and 6 accordingly.)

**Covers:** keeps SKILL.md accurate as the authoritative quick reference for the updated flow.

---

## Verification

After all phases are written, verify each acceptance criterion by tracing through the updated prose:

| AC | Verified by |
|----|-------------|
| AC-1.1 | Step 4.1 reads `package.json` `dependencies`/`devDependencies` and passes result to subagents |
| AC-1.2 | Step 4.1 reads all manifest files; Stack Context is a combined string |
| AC-1.3 | Step 4.1 fallback asks exactly one question |
| AC-2.1 | Step 4.2 dispatches "exactly three subagents **concurrently**" |
| AC-2.2 | All three subagent prompts end with "synthesize into actionable [X] only" |
| AC-2.3 | Step 4.2 empty-result handling explicitly prevents init failure |
| AC-3.1 | Subagent 1 prompt says "Infer topics from the stack — do NOT use a fixed list" |
| AC-3.2 | Subagent 1 prompt defines `subdir` field for layered stacks |
| AC-3.3 | Step 4.4 writes to `.claude/rules/<subdir>/<filename>.md` |
| AC-3.4 | Subagent 1 prompt requests "dos, don'ts, and conventions" |
| AC-4.1 | Step 4.3 Section A presents each file "in sequence" with full content |
| AC-4.2 | Step 4.3 defines approve/tweak/skip for each file |
| AC-4.3 | Step 4.3: "skip — do not prompt for this file again" |
| AC-5.1 | Step 4.3 Section B merges both subagents into one block with all four keys |
| AC-5.2 | Step 4.3 Section B asks approve/tweak/skip for settings block |
| AC-5.3 | Step 4.3 conflict check announces existing file and offers merge/overwrite/skip |
| AC-6.1 | Step 4.4 writes "in one uninterrupted pass — no user interaction between writes" |
| AC-6.2 | Step 4.4 ends with "Proceed to Step 5" — existing flow unchanged |
| AC-6.3 | Step 4.4: "if file exists at target path: prompt overwrite or skip" |
| AC-7.1 | Phase 2 updates Step 5.2 to use Stack Context from Step 4.1 |
| AC-7.2 | Phase 2 updates `conventions.md` template to use Conventions subagent results |

---

## Self-Review

- **Spec coverage:** all 14 FRs, 4 NFRs, 7 stories, and all error scenarios are addressed by Phase 1–4 prose — no gaps
- **Placeholder scan:** no "TBD", "TODO", or "implement later" in any phase — all subagent prompts and prose are fully written out
- **Consistency:** Step 4.2 subagent prompts reference "Stack Context" set in Step 4.1; Step 5.2 references "Stack Context from Step 4.1 and Conventions subagent summary from Step 4.2" — naming consistent across phases
