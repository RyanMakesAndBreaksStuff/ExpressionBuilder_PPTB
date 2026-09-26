# Plan: Feature 020 — Remove tasks.md Mode from sdd-execute

**Spec:** `docs/specs/020-remove-tasks-mode-from-execute/spec.md`
**Status:** Draft

---

## Goal

Strip all tasks.md detection, task-driven branching, and checkbox-marking logic from `sdd-execute` — leaving a single, unconditional plan-driven execution path in both `SKILL.md` and `reference.md`.

---

## Architecture

Two skill prose files changed, no new files created:

| File | Change |
|------|--------|
| `skills/sdd-execute/SKILL.md` | Remove tasks.md references from frontmatter, examples, When to Use, execution flow, status table, and error handling |
| `skills/sdd-execute/reference.md` | Remove Step 2a (mode detection), collapse 2b–2e labels, remove tasks.md checkbox steps, clean Mid-Flight and Integration sections |

---

## Tech Stack

Markdown skill prose. Verified by grep-based assertions (old text absent, new text present).

---

## File Structure

```
skills/sdd-execute/
  SKILL.md      ← 7 targeted edits
  reference.md  ← 6 targeted edits
```

---

## Phase 1 — Update `SKILL.md`

### Edit 1.1 — Frontmatter description (FR-7)

**Find:**
```
description: Use when a plan is approved and implementation should begin; works with or without tasks.md
```

**Replace with:**
```
description: Use when a plan is approved and implementation should begin
```

### Edit 1.2 — Remove tasks.md example (FR-6)

**Find and remove the entire second `<example>` block:**
```
<example>
<context>tasks.md exists with 12 tasks. User says "let's start implementing."</context>
<correct>Invoke sdd-execute. Verify the current branch is correct, then read tasks.md and dispatch subagents in task order, completing each before the next.</correct>
<incorrect>Ignore tasks.md and re-derive work units from plan.md — if tasks.md exists, use it.</incorrect>
</example>
```

### Edit 1.3 — When to Use section (FR-1, FR-2)

**Find:**
```
- A `plan.md` is approved and implementation is ready to start (with or without `tasks.md`)
- If `tasks.md` exists: use it as-is (existing behavior)
- If `tasks.md` is absent: plan-driven mode — derive work units from `plan.md` + `spec.md`
- NOT on `main`/`master` — a feature branch must exist
```

**Replace with:**
```
- A `plan.md` is approved and implementation is ready to start
- Derive work units from `plan.md` + `spec.md`
- NOT on `main`/`master` — a feature branch must exist
```

### Edit 1.4 — Execution flow (FR-2)

**Find:**
```
Verify branch + baseline
→ Detect mode: tasks.md present → task-driven | tasks.md absent → plan-driven
→ Plan-driven: read plan.md + spec.md → derive work units → record in TodoWrite
```

**Replace with:**
```
Verify branch + baseline
→ Read plan.md + spec.md → derive work units → record in TodoWrite
```

### Edit 1.5 — Status handling table (FR-4)

**Find:**
```
| DONE | Mark unit complete in TodoWrite (task-driven: also mark `[x]` in `tasks.md`), then proceed to spec-compliance review |
| DONE_WITH_CONCERNS | Mark unit complete in TodoWrite (task-driven: also mark `[x]` in `tasks.md`); if correctness concern fix first; if observational proceed |
```

**Replace with:**
```
| DONE | Mark unit complete in TodoWrite, then proceed to spec-compliance review |
| DONE_WITH_CONCERNS | Mark unit complete in TodoWrite; if correctness concern fix first; if observational proceed |
```

### Edit 1.6 — Error handling: remove tasks.md entry (FR-5)

**Find and remove the entire line:**
```
- **tasks.md does not exist**: Activate plan-driven mode — read `plan.md` + `spec.md` and derive work units. Do NOT redirect to `sdd-tasks`.
```

### Edit 1.7 — Error handling: update plan.md missing message (AC-3.1)

**Find:**
```
- **plan.md does not exist and tasks.md does not exist**: Surface error: "No plan.md found at docs/specs/NNN-feature/plan.md. Run sdd-plan first." Halt.
```

**Replace with:**
```
- **plan.md does not exist**: Surface error: "No plan.md found at docs/specs/NNN-feature/plan.md. Run sdd-plan first." Halt.
```

---

## Phase 2 — Update `reference.md`

### Edit 2.1 — Step 2 title and remove Step 2a (FR-3)

**Find:**
```
## Step 2: Detect Mode and Derive Work Units

### 2a. Detect execution mode

Check whether `docs/specs/<NNN>-<feature-slug>/tasks.md` exists:

- **tasks.md present → task-driven mode**: Read `tasks.md` in full. Extract all tasks with complete text and code blocks, parallel groups, sequential phases and prerequisites, and the spec file path. Skip to Step 3 — use task text as work unit content. **Do NOT make subagents read the tasks file** — provide full task text directly.

- **tasks.md absent → plan-driven mode**: Continue with steps 2b–2e below.

### 2b. Read source files (plan-driven only)
```

**Replace with:**
```
## Step 2: Derive Work Units

### 2a. Read source files
```

### Edit 2.2 — Remove "(plan-driven only)" labels from Steps 2b–2e (FR-3)

After Edit 2.1, three sub-step headings still carry stale "(plan-driven only)" labels. Remove that suffix from each:

**Find:** `### 2c. Derive work units (plan-driven only)`
**Replace with:** `### 2b. Derive work units`

**Find:** `### 2d. Determine parallelization (plan-driven only)`
**Replace with:** `### 2c. Determine parallelization`

**Find:** `### 2e. Restart detection (plan-driven only)`
**Replace with:** `### 2d. Restart detection`

*(Step 2b "Read source files" was already renumbered in Edit 2.1. The former 2b becomes 2a, former 2c becomes 2b, former 2d becomes 2c, former 2e becomes 2d.)*

### Edit 2.3 — Status table: remove tasks.md checkbox step (FR-4)

**Find:**
```
| DONE | **Mark `[x]` in tasks.md (step 3b-1), then** proceed to spec-compliance review |
| DONE_WITH_CONCERNS | **Mark `[x]` in tasks.md (step 3b-1);** if correctness concern, address before review; if observational, proceed |
```

**Replace with:**
```
| DONE | Mark unit complete in TodoWrite, then proceed to spec-compliance review |
| DONE_WITH_CONCERNS | Mark unit complete in TodoWrite; if correctness concern, address before review; if observational, proceed |
```

### Edit 2.4 — Remove Step 3b-1 entirely (FR-3, FR-4)

**Find and remove the entire section:**
```
**3b-1. Mark task complete in tasks.md**

Immediately after a subagent returns `DONE` or `DONE_WITH_CONCERNS` — before spec-compliance review — edit `tasks.md`:

**Task-driven mode:** Find the line for the task that just completed. Edit its checkbox from `[ ]` to `[x]`.

```
- [ ] Task N: Description   →   - [x] Task N: Description
```

**Plan-driven mode:** Mark the work unit complete in TodoWrite. No file edit needed.

Constraints (both modes):
- Mark only the unit that just completed
- Do not mark speculatively before the subagent result is known
- If the subagent returns `NEEDS_CONTEXT` or `BLOCKED`, leave the unit incomplete
```

*(Replace with nothing — the section is deleted entirely.)*

### Edit 2.5 — Mid-Flight Spec Changes: remove tasks.md reference (FR-3)

**Find:**
```
3. Propagate to `plan.md` as directed by `sdd-spec-update` (and `tasks.md` if it exists)
```

**Replace with:**
```
3. Propagate to `plan.md` as directed by `sdd-spec-update`
```

Also find:
```
2. Plan problem? → Update `plan.md` (and `tasks.md` if it exists), continue
```

**Replace with:**
```
2. Plan problem? → Update `plan.md`, continue
```

### Edit 2.6 — Integration section: remove task-driven mode callout (FR-3)

**Find:**
```
**Called after:** `sdd-superpowers:sdd-plan` (plan-driven mode) or `sdd-superpowers:sdd-tasks` (task-driven mode, when tasks.md exists)
```

**Replace with:**
```
**Called after:** `sdd-superpowers:sdd-plan`
```

Also find in Step 3a the scene-setting prose referencing tasks.md:
```
- The complete task text (copy verbatim from tasks.md)
```

**Replace with:**
```
- The complete work unit text (from the derived plan section)
```

---

## Verification

After all edits, verify each FR with grep:

| FR | Verification command | Expected result |
|----|---------------------|-----------------|
| FR-1 | `grep -n "tasks.md" skills/sdd-execute/SKILL.md` | 0 matches |
| FR-2 | `grep -n "task-driven\|tasks.md" skills/sdd-execute/SKILL.md` | 0 matches |
| FR-3 | `grep -n "tasks.md" skills/sdd-execute/reference.md` | 0 matches |
| FR-4 | `grep -n "\[x\].*tasks\|tasks.*\[x\]" skills/sdd-execute/reference.md` | 0 matches |
| FR-5 | `grep -n "tasks.md does not exist" skills/sdd-execute/SKILL.md` | 0 matches |
| FR-6 | `grep -n "tasks.md exists with" skills/sdd-execute/SKILL.md` | 0 matches |
| FR-7 | `grep -n "works with or without" skills/sdd-execute/SKILL.md` | 0 matches |
| NFR-1 | `wc -l skills/sdd-execute/SKILL.md` | Fewer lines than current (132 lines) |

---

## Self-Review

- **Spec coverage:** FR-1 through FR-7 each have a named edit; AC-1.1 through AC-3.2 are covered by removing the mode-detection prose; NFR-1 is verified by line count — no gaps
- **Placeholder scan:** No "TBD", "TODO", or "implement later" — every edit has exact before/after prose
- **Consistency:** Step numbers in reference.md are renumbered consistently in Edit 2.2; no dangling references to removed steps remain
