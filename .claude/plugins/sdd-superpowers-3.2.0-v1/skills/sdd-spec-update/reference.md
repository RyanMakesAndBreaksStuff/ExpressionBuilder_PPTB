# SDD Update: Full Process Reference

> Complete classification guide, artifact update procedures, and version header format. See [SKILL.md](SKILL.md) for the summary.

## Step 1: Clarification Dialogue

Never classify a change until the intent is unambiguous. Ask one question at a time.

**Required answers before classifying:**
- What is the OLD behavior or missing piece?
- What is the NEW or ADDED behavior?
- Does this contradict, extend, or clarify an existing requirement?
- What are the acceptance criteria for the new behavior?

**Stop asking when:** the change can be written as a testable acceptance criterion with clear pass/fail.

If any clarification leads to more ambiguity, mark the item `[NEEDS CLARIFICATION]` and surface it to the user before proceeding.

---

## Step 2: Classify the Change

Read the current `spec.md` before classifying. The classification depends on what the spec currently says, not what you assume it says.

### PATCH — `0.0.x`

**Triggers:**
- A requirement was vague; now it's precise (same intent, clearer wording)
- A missing example is added to an existing requirement
- A typo or contradiction between two sentences in the spec is fixed
- An `[NEEDS CLARIFICATION]` item is resolved without changing scope

**Test:** Could a developer who already built to the old spec make zero code changes and still pass the new spec? If yes → PATCH.

**Downstream:** Update `spec.md` only. Bump version. No plan or task changes needed.

---

### MINOR — `0.x.0`

**Triggers:**
- A new user story is added
- A new Functional Requirement (FR-N) is added
- A new acceptance criterion is appended to an existing story
- Scope is extended without removing anything already approved

**Test:** Does this require new code that doesn't exist yet, without invalidating existing code? If yes → MINOR.

**Downstream:**
1. Update `spec.md` — add the new requirement in the correct section
2. Update `plan.md` — add or extend phases that address the new FR
3. Update `tasks.md` — append new tasks for the new behavior; mark them with `[NEW vX.Y.0]`
4. Do NOT re-open completed tasks unless the new requirement changes their behavior

---

### MAJOR — `x.0.0`

**Triggers:**
- An existing requirement is removed, replaced, or fundamentally rewritten
- The architecture changes (different data model, different API contract, different component boundary)
- A previously approved design decision is reversed
- A new requirement contradicts something already implemented

**Test:** Would a developer who built to the old spec need to delete or rewrite existing code? If yes → MAJOR.

**Downstream:**
1. Update `spec.md` — update/remove affected requirements; strike through nothing, rewrite sections
2. Review `plan.md` — identify phases that implement the changed requirement; flag or rewrite them
3. Review `tasks.md` — mark completed tasks that are now invalid as `[INVALIDATED vX.0.0 — <reason>]`; rewrite or add tasks for the new behavior
4. Flag in-progress code — list files that implement the invalidated requirement; surface to user before continuing

---

## Step 3: Update spec.md

### Version Header Format

Add a `Version` field to the spec frontmatter:

```markdown
# Feature NNN: <Feature Name>

**Status:** Approved
**Version:** 1.2.0
**Created:** YYYY-MM-DD
**Last Updated:** YYYY-MM-DD
**Branch:** `NNN-<feature-slug>`
```

### Changelog Block (append after frontmatter)

```markdown
## Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.0.0 | YYYY-MM-DD | Initial approved spec |
| 1.1.0 | YYYY-MM-DD | Added FR-5: <short description> |
| 2.0.0 | YYYY-MM-DD | Rewrote FR-2: replaced X with Y — <reason> |
```

### When editing requirements

- **PATCH/MINOR additions:** Add new content in the appropriate section. Do not remove existing text.
- **MAJOR changes:** Rewrite the affected section completely. Record the old version in the Changelog row with a brief description.
- **Never:** leave contradictory requirements in the spec after a MAJOR bump. Resolve the contradiction explicitly.

---

## Step 4: Update plan.md (MINOR and MAJOR only)

1. Re-read the current `plan.md` before editing
2. Identify phases that implement the changed/added requirements
3. **MINOR:** Append a new phase or extend an existing phase for the new FR. Mark it: `Phase N (added v1.1.0):`
4. **MAJOR:** Rewrite affected phases. Mark invalidated phases: `~~Phase N~~ (invalidated v2.0.0 — see Phase M)`
5. Add a `Plan Changelog` section at the bottom if it doesn't exist:

```markdown
## Plan Changelog

| Version | Phase | Change |
|---------|-------|--------|
| 1.1.0 | Phase 4 | Added: implements FR-5 |
| 2.0.0 | Phase 2 | Rewrote: new architecture for FR-2 |
```

---

## Step 5: Update tasks.md (MINOR and MAJOR only)

### MINOR: Add new tasks

Append a new task group at the bottom of `tasks.md`:

```markdown
### [NEW v1.1.0] FR-5: <Requirement Name>

- [ ] Write failing test for `<function>` (see plan Phase 4)
- [ ] Run `<command>` — expect: FAIL
- [ ] Implement `<function>`
- [ ] Run `<command>` — expect: PASS
- [ ] Commit: `feat: <description>`
```

Mark any existing incomplete tasks that are prerequisites for new tasks with `[MUST COMPLETE BEFORE v1.1.0 TASKS]`.

### MAJOR: Handle invalidated tasks

For each completed task that is now invalid:

```markdown
- [x] ~~Implement `old_function` in `src/foo.py`~~ [INVALIDATED v2.0.0 — FR-2 rewritten; see Task Group 7]
```

For each incomplete task that is now invalid:

```markdown
- [ ] ~~Write test for `old_function`~~ [INVALIDATED v2.0.0 — skipped]
```

Add the replacement task group:

```markdown
### [REWRITE v2.0.0] FR-2: <New Requirement Name>

- [ ] Write failing test for `<new_function>`
...
```

---

## Step 6: Flag In-Progress Code (MAJOR only)

Before the user confirms the MAJOR bump, surface the files at risk:

> "This MAJOR bump invalidates the following already-implemented behavior:
> - `src/foo.py` — implements old FR-2 (`old_function`)
> - `tests/test_foo.py` — tests old FR-2 behavior
>
> These will need to be rewritten. Proceed?"

Do NOT delete or modify these files until the user confirms. After confirmation, mark them for rewrite in `tasks.md`.

---

## Step 7: Resume Rules

After propagating all changes:

| Bump | Where to resume |
|------|----------------|
| PATCH | Continue exactly where you left off |
| MINOR | Complete all existing tasks first, then execute new task group |
| MAJOR | Stop current execution; re-run `sdd-superpowers:sdd-plan` for affected phases, then `sdd-superpowers:sdd-execute` to resume |

---

## Rules

**Spec first, always:** Never update plan or tasks before the spec is updated and the version is bumped.

**No silent changes:** Every change is recorded in the spec Changelog. No requirement is removed without a Changelog entry explaining why.

**User confirms scope:** Before propagating any MINOR or MAJOR change, present the impact summary and get explicit confirmation.

**Don't over-classify:** A "clarification" that adds a new acceptance criterion is MINOR, not PATCH. Classify conservatively — it's safer to bump higher than to under-classify and miss downstream impact.

**Don't under-classify:** A MAJOR change disguised as "just a small wording change" that contradicts the architecture is still MAJOR. Read what the spec currently says before deciding.
