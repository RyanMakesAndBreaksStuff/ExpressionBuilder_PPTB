# Tasks 006: SDD Update Skill

**Spec:** `docs/specs/006-sdd-update-skill/spec.md`
**Plan:** `docs/specs/006-sdd-update-skill/plan.md`
**Branch:** `006-sdd-update-skill`

> Note: All tasks below are marked complete — this task list was written retroactively after implementation. Tasks reflect exactly what was done, in the order work occurred.

---

## Task Group 1: Skill Contract (Phase 1)

### 1.1 — Verify SKILL.md does not exist yet
- [x] Read `skills/sdd-update/` directory
- Expected: directory does not exist — confirmed before creation

### 1.2 — Create `skills/sdd-update/SKILL.md` with contract skeleton
- [x] Write `skills/sdd-update/SKILL.md` with:
  - YAML frontmatter: `name: sdd-update`, `description: Use when a user describes a change, addition, or correction to an in-progress feature…`
  - Announce line: `"I'm using the sdd-update skill to assess and integrate this change."`
  - Overview paragraph
  - `<HARD-GATE>` block with 3 blocking conditions

### 1.3 — Verify contract sections present
- [x] Run: `grep -c "HARD-GATE\|Announce at start\|name: sdd-update" /Users/hllj/Projects/sdd-superpowers/skills/sdd-update/SKILL.md`
- Expected: `4` (HARD-GATE open + close tags, Announce at start, name field)

---

## Task Group 2: Core Skill Content (Phase 2)

### 2.1 — Add When to Use section (FR-1, FR-6)
- [x] Append to `skills/sdd-update/SKILL.md`:
  - 4 positive triggers ("User describes a change…", "User adds a requirement…", etc.)
  - 2 explicit NOT cases: new feature → sdd-specify, bug → systematic-debugging

### 2.2 — Add Spec Versioning table (FR-2, FR-3)
- [x] Append to `skills/sdd-update/SKILL.md`:
  - Table with PATCH / MINOR / MAJOR rows
  - Each row: bump label, triggers, downstream impact
  - Note: "Every spec starts at `1.0.0` when approved"

### 2.3 — Add flowchart (FR-1, FR-2, FR-4)
- [x] Append graphviz `dot` block to `skills/sdd-update/SKILL.md`:
  - Nodes: User describes change → Clarify → Classify → (3 update paths) → User confirms → Propagate
  - Edge labels: PATCH / MINOR / MAJOR on classify branches; yes / no — revisit on confirm

### 2.4 — Add Clarification First section (FR-1)
- [x] Append to `skills/sdd-update/SKILL.md`:
  - 5 numbered clarifying questions with inline annotations
  - Stop condition: "Stop when the new requirement could be written as a testable acceptance criterion"

### 2.5 — Add Common Mistakes section (FR-2, FR-3, FR-4)
- [x] Append to `skills/sdd-update/SKILL.md`:
  - 5 bullets covering: spec-first ordering, MINOR vs MAJOR confusion, skipping clarification, task-before-spec, MAJOR code flagging

### 2.6 — Add Execution Handoff section (FR-5)
- [x] Append to `skills/sdd-update/SKILL.md`:
  - Handoff template: `"Spec updated to vX.Y.Z. [List updated artifacts]. Resuming from…"`
  - Link to `reference.md` for full procedures

### 2.7 — Verify SKILL.md complete
- [x] Run: `grep -c "When to Use\|Spec Versioning\|digraph\|Clarification First\|Common Mistakes\|Execution Handoff" /Users/hllj/Projects/sdd-superpowers/skills/sdd-update/SKILL.md`
- Expected: `6`

---

## Task Group 3: Detailed Reference (Phase 3)

### 3.1 — Verify reference.md does not exist yet
- [x] Read `skills/sdd-update/reference.md`
- Expected: file does not exist — confirmed before creation

### 3.2 — Create `skills/sdd-update/reference.md` — Steps 1–2 (FR-1, FR-2)
- [x] Write Steps 1 and 2:
  - Step 1: Clarification dialogue — required answers, stop condition
  - Step 2: Classification — PATCH test, MINOR test, MAJOR test (each with explicit yes/no criterion)

### 3.3 — Add Step 3: spec.md update procedure (FR-3)
- [x] Append to `skills/sdd-update/reference.md`:
  - Version header format (Version, Last Updated fields)
  - Changelog table template with 3 example rows
  - Editing rules: PATCH/MINOR additions vs. MAJOR rewrites; no contradictions left in spec

### 3.4 — Add Steps 4–5: plan.md and tasks.md update procedures (FR-4)
- [x] Append to `skills/sdd-update/reference.md`:
  - Step 4: plan.md — MINOR phase append with `(added vX.Y.0)` marker; MAJOR phase strikethrough; Plan Changelog section
  - Step 5: tasks.md — MINOR new task group template with `[NEW vX.Y.0]`; MAJOR invalidation markers for completed and incomplete tasks

### 3.5 — Add Step 6: in-progress code flagging for MAJOR (FR-4)
- [x] Append to `skills/sdd-update/reference.md`:
  - Surface-before-confirmation block: list files at risk with reasons
  - Rule: do NOT modify files until user confirms

### 3.6 — Add Step 7: Resume rules (FR-5)
- [x] Append to `skills/sdd-update/reference.md`:
  - Table: PATCH → continue; MINOR → finish existing then new group; MAJOR → stop, re-plan, re-task, resume

### 3.7 — Add Rules footer (FR-2, FR-3, FR-4)
- [x] Append to `skills/sdd-update/reference.md`:
  - "Spec first, always"
  - "No silent changes"
  - "User confirms scope"
  - "Don't over-classify" / "Don't under-classify"

### 3.8 — Verify reference.md complete
- [x] Run: `grep -c "^## Step" /Users/hllj/Projects/sdd-superpowers/skills/sdd-update/reference.md`
- Expected: `7`

---

## Task Group 4: sdd-workflow/SKILL.md Integration (Phase 4) [P]

> [P] — independent of Task Groups 5 and 6; touches a different file

### 4.1 — Verify sdd-update row absent from routing table
- [x] Run: `grep "sdd-update" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md`
- Expected: no output — confirmed before edit

### 4.2 — Add sdd-update row to routing table (FR-6)
- [x] Edit `skills/sdd-workflow/SKILL.md`: insert after "Tasks exist" row:
  ```
  | **Change or addition to an approved spec** | `sdd-superpowers:sdd-update` |
  ```

### 4.3 — Add Common Mistakes entry (FR-6)
- [x] Edit `skills/sdd-workflow/SKILL.md`: append to Common Mistakes:
  ```
  - Updating tasks or plan without running `sdd-superpowers:sdd-update` when user requests a change — spec must be versioned first
  ```

### 4.4 — Verify SKILL.md integration
- [x] Run: `grep -c "sdd-update" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md`
- Expected: `2`

---

## Task Group 5: sdd-workflow/routing.md Integration (Phase 5) [P]

> [P] — independent of Task Groups 4 and 6; touches a different file

### 5.1 — Verify sdd-update absent from routing.md
- [x] Run: `grep "sdd-update" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md`
- Expected: no output — confirmed before edit

### 5.2 — Add Skill Map entry (FR-6)
- [x] Edit `skills/sdd-workflow/routing.md` Skill Map table: insert after "Ready to execute tasks" row:
  ```
  | User describes a change or addition to an approved spec | `sdd-superpowers:sdd-update` |
  ```

### 5.3 — Add Skill Priority Ordering annotation (FR-6)
- [x] Edit `skills/sdd-workflow/routing.md` Priority Ordering: annotate step 5 with:
  ```
  - **At any point after spec approval:** `sdd-superpowers:sdd-update` — integrate mid-flight changes before continuing
  ```

### 5.4 — Add mandatory conditions block (FR-6)
- [x] Edit `skills/sdd-workflow/routing.md` Mandatory Conditions: insert before `sdd-review` block:
  ```
  **`sdd-superpowers:sdd-update` is mandatory when:**
  - User describes a change, addition, or correction to an already-approved spec
  - User says "can we also add X", "actually I want Y instead of Z", "I realize we need to change…"
  - A mid-implementation discovery invalidates an existing requirement
  - Do NOT proceed with plan/tasks/code changes until `sdd-update` has classified the bump and the user has confirmed scope
  ```

### 5.5 — Add red flags rows (FR-6)
- [x] Edit `skills/sdd-workflow/routing.md` Red Flags table: append 2 rows:
  ```
  | "User said 'also add X' — I'll just update the tasks" | `sdd-superpowers:sdd-update` first — classify impact, update spec, then propagate |
  | "This change seems minor, no need to update the spec" | `sdd-superpowers:sdd-update` — even PATCH bumps are recorded in the spec |
  ```

### 5.6 — Verify routing.md integration
- [x] Run: `grep -c "sdd-update" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md`
- Expected: `6` (skill map, priority ordering, mandatory header + 1 inline ref, 2 red flag lines)

---

## Task Group 6: CLAUDE.md Integration (Phase 6) [P]

> [P] — independent of Task Groups 4 and 5; touches a different file

### 6.1 — Verify sdd-update absent from CLAUDE.md
- [x] Run: `grep "sdd-update" /Users/hllj/Projects/sdd-superpowers/CLAUDE.md`
- Expected: no output — confirmed before edit

### 6.2 — Add skills table row (FR-6)
- [x] Edit `CLAUDE.md` Skills table: insert after `sdd-execute` row:
  ```
  | `sdd-update` | Change or addition to an approved spec → classify impact (PATCH/MINOR/MAJOR), version spec, propagate downstream |
  ```

### 6.3 — Update workflow diagram (FR-6)
- [x] Edit `CLAUDE.md` Workflow block: replace `sdd-execute` section with mid-flight branch showing `sdd-update` loop

### 6.4 — Add directory structure entry (FR-6)
- [x] Edit `CLAUDE.md` Directory Structure: insert `sdd-update/` after `sdd-execute/`

### 6.5 — Verify CLAUDE.md integration
- [x] Run: `grep -c "sdd-update" /Users/hllj/Projects/sdd-superpowers/CLAUDE.md`
- Expected: `3` (skills table, workflow diagram, directory structure)

---

## Task Group 7: FR Coverage Verification (Phase 7)

### 7.1 — Verify FR-1 coverage (Clarification)
- [x] Read `skills/sdd-update/SKILL.md` §Clarification First — 5 questions present, stop condition stated
- [x] Read `skills/sdd-update/reference.md` §Step 1 — required answers and stop condition present
- Expected: both confirmed ✅

### 7.2 — Verify FR-2 coverage (Classification)
- [x] Read `skills/sdd-update/SKILL.md` §Spec Versioning — PATCH, MINOR, MAJOR rows with triggers
- [x] Read `skills/sdd-update/reference.md` §Step 2 — each level has explicit pass/fail test
- Expected: both confirmed ✅

### 7.3 — Verify FR-3 coverage (Versioning)
- [x] Read `skills/sdd-update/SKILL.md` — `1.0.0` baseline note present
- [x] Read `skills/sdd-update/reference.md` §Step 3 — Version header format and Changelog template present
- Expected: both confirmed ✅

### 7.4 — Verify FR-4 coverage (Propagation)
- [x] Read `skills/sdd-update/SKILL.md` flowchart — 3 bump paths, user confirm gate, propagate node
- [x] Read `skills/sdd-update/reference.md` §Steps 4–6 — spec→plan→tasks→code order enforced for each bump
- Expected: both confirmed ✅

### 7.5 — Verify FR-5 coverage (Resume Rules)
- [x] Read `skills/sdd-update/reference.md` §Step 7 — PATCH/MINOR/MAJOR resume destinations defined
- Expected: confirmed ✅

### 7.6 — Verify FR-6 coverage (Workflow Integration)
- [x] Run: `grep -c "sdd-update" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md` — Expected: `2`
- [x] Run: `grep -c "sdd-update" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/routing.md` — Expected: `7`
- [x] Run: `grep -c "sdd-update" /Users/hllj/Projects/sdd-superpowers/CLAUDE.md` — Expected: `3`
- Expected: all confirmed ✅

---

## Task Group 8: Doc-First Commit

### 8.1 — Stage spec documents
- [x] Run: `git add docs/specs/006-sdd-update-skill/`

### 8.2 — Commit spec, plan, and tasks
- [x] Run:
  ```
  git commit -m "docs(006-sdd-update-skill): add spec, plan, and tasks retroactively"
  ```
- Expected: commit succeeds on branch `006-sdd-update-skill`

---

## [NEW v1.1.0] Task Group 9: Sub-skill Integration Registration (FR-7)

### 9.1 — Verify Integration section absent from sdd-update/SKILL.md
- [x] Run: `grep "## Integration" /Users/hllj/Projects/sdd-superpowers/skills/sdd-update/SKILL.md`
- Expected: no output — confirmed before edit

### 9.2 — Add Integration section to sdd-update/SKILL.md
- [x] Edit `skills/sdd-update/SKILL.md`: insert before `## Execution Handoff`:
  ```markdown
  ## Integration

  Required sub-skills:

  | When | Sub-skill |
  |------|-----------|
  | Committing versioned spec, plan, and tasks after propagation | `sdd-superpowers:using-git` |
  ```

### 9.3 — Verify Integration section present
- [x] Run: `grep -c "## Integration\|using-git" /Users/hllj/Projects/sdd-superpowers/skills/sdd-update/SKILL.md`
- Expected: `2`

### 9.4 — Update spec 006 to v1.1.0
- [x] Edit `docs/specs/006-sdd-update-skill/spec.md`: bump Version to `1.1.0`, add Last Updated, add FR-7, add Changelog section

### 9.5 — Update plan 006 to v1.1.0
- [x] Edit `docs/specs/006-sdd-update-skill/plan.md`: add Phase 8, update File Structure table, update Self-Review, add Plan Changelog

### 9.6 — Update tasks 006 with this task group
- [x] Edit `docs/specs/006-sdd-update-skill/tasks.md`: add Task Group 9, update Completion Checklist

---

## Completion Checklist

- [x] FR-1: Clarification dialogue enforced before classification
- [x] FR-2: PATCH/MINOR/MAJOR classification with justification test
- [x] FR-3: Spec versioned before any downstream artifact changes
- [x] FR-4: Propagation order enforced (spec → plan → tasks → flag code)
- [x] FR-5: Resume rules defined for all three bump levels
- [x] FR-6: sdd-update registered in sdd-workflow routing, routing.md, and CLAUDE.md
- [x] FR-7: Integration section in SKILL.md listing using-git as required sub-skill
