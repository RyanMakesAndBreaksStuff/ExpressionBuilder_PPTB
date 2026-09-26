# Task List: Feature 015 — Skills Frontmatter and Description Refinement

**Spec:** `docs/specs/015-skills-frontmatter-description-refinement/spec.md` (v2.0.0)
**Plan:** `docs/specs/015-skills-frontmatter-description-refinement/plan.md`
**Branch:** `015-skills-frontmatter-description-refinement`

> **v2.0.0 change:** Story 3 (allowed-tools) removed. Tasks 8–17 from v1 are dropped.
> Phase 1 Tasks 2, 3, 5 are description-only (no combined allowed-tools edits).

---

## Setup

### Task 0 — Create feature branch and doc-first commit

Already done. Branch: `015-skills-frontmatter-description-refinement`

---

## Phase 1 — Description CSO Fixes + sdd-workflow Frontmatter

All Phase 1 tasks touch different files. [P] = safe to run concurrently.

---

### [P] Task 1 — sdd-workflow: fix description + add user-invocable: false ✅ DONE

**Completed in initial execution run.**

Verified: `description` ends at "SDD project"; `user-invocable: false` present.

---

### [P] Task 2 — sdd-brainstorm: fix description ✅ DONE

**Completed in initial execution run.**

Verified: description is `"Use when an idea is fuzzy, exploratory, or has competing approaches that need design exploration before specification"`.

> Note: `allowed-tools` line was added during v1 execution and must be reverted — see Task 2R.

---

### [P] Task 2R — sdd-brainstorm: revert allowed-tools (v2.0.0 change)

**File:** `skills/sdd-brainstorm/SKILL.md`

**RED — verify problem (allowed-tools present):**
```bash
grep "allowed-tools" /Users/hllj/Projects/sdd-superpowers/skills/sdd-brainstorm/SKILL.md
```
Expected: `allowed-tools: Bash, Read`

**EDIT — remove allowed-tools line from frontmatter:**

Old:
```
---
name: sdd-brainstorm
description: Use when an idea is fuzzy, exploratory, or has competing approaches that need design exploration before specification
allowed-tools: Bash, Read
---
```

New:
```
---
name: sdd-brainstorm
description: Use when an idea is fuzzy, exploratory, or has competing approaches that need design exploration before specification
---
```

**GREEN:**
```bash
grep "allowed-tools" /Users/hllj/Projects/sdd-superpowers/skills/sdd-brainstorm/SKILL.md
```
Expected: no output

---

### [P] Task 3 — sdd-tasks: fix description ✅ DONE

**Completed in initial execution run.**

Verified: description is `"Use when an implementation plan is approved and needs to be broken down into executable tasks"`.

> Note: `allowed-tools` line was added during v1 execution and must be reverted — see Task 3R.

---

### [P] Task 3R — sdd-tasks: revert allowed-tools (v2.0.0 change)

**File:** `skills/sdd-tasks/SKILL.md`

**RED:**
```bash
grep "allowed-tools" /Users/hllj/Projects/sdd-superpowers/skills/sdd-tasks/SKILL.md
```
Expected: `allowed-tools: Bash, Read`

**EDIT — remove allowed-tools line from frontmatter:**

Old:
```
---
name: sdd-tasks
description: Use when an implementation plan is approved and needs to be broken down into executable tasks
allowed-tools: Bash, Read
---
```

New:
```
---
name: sdd-tasks
description: Use when an implementation plan is approved and needs to be broken down into executable tasks
---
```

**GREEN:**
```bash
grep "allowed-tools" /Users/hllj/Projects/sdd-superpowers/skills/sdd-tasks/SKILL.md
```
Expected: no output

---

### [P] Task 4 — sdd-spec-update: fix description ✅ DONE

**Completed in initial execution run.**

---

### [P] Task 5 — verification-before-completion: fix description ✅ DONE

**Completed in initial execution run.**

> Note: `allowed-tools` line was added during v1 execution and must be reverted — see Task 5R.

---

### [P] Task 5R — verification-before-completion: revert allowed-tools (v2.0.0 change)

**File:** `skills/verification-before-completion/SKILL.md`

**RED:**
```bash
grep "allowed-tools" /Users/hllj/Projects/sdd-superpowers/skills/verification-before-completion/SKILL.md
```
Expected: `allowed-tools: Bash, Read`

**EDIT — remove allowed-tools line from frontmatter:**

Old:
```
---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing
allowed-tools: Bash, Read
---
```

New:
```
---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing
---
```

**GREEN:**
```bash
grep "allowed-tools" /Users/hllj/Projects/sdd-superpowers/skills/verification-before-completion/SKILL.md
```
Expected: no output

---

### [P] Task 6R — revert allowed-tools from Phase 2 files (v2.0.0 change)

**Files:** `sdd-specify`, `sdd-plan`, `sdd-research`, `sdd-review`, `sdd-init`, `sdd-execute`, `using-git`, `systematic-debugging`, `requesting-code-review`, `test-driven-development`

These files had `allowed-tools` added during v1 Phase 2 execution before the spec was updated.

**RED — verify all 10 have allowed-tools:**
```bash
for f in skills/sdd-specify/SKILL.md skills/sdd-plan/SKILL.md skills/sdd-research/SKILL.md skills/sdd-review/SKILL.md skills/sdd-init/SKILL.md skills/sdd-execute/SKILL.md skills/using-git/SKILL.md skills/systematic-debugging/SKILL.md skills/requesting-code-review/SKILL.md skills/test-driven-development/SKILL.md; do
  echo "=== $f ==="; grep "allowed-tools" "/Users/hllj/Projects/sdd-superpowers/$f"
done
```
Expected: each file shows an `allowed-tools` line.

**EDIT sdd-specify — remove allowed-tools:**

Old:
```
---
name: sdd-specify
description: Use when a user describes a new feature, idea, or problem without an existing spec — before any planning, research, or code
allowed-tools: Bash, Read
---
```
New:
```
---
name: sdd-specify
description: Use when a user describes a new feature, idea, or problem without an existing spec — before any planning, research, or code
---
```

**EDIT sdd-plan — remove allowed-tools:**

Old:
```
---
name: sdd-plan
description: Use when a feature spec exists and needs to become a technical implementation plan
allowed-tools: Bash, Read
---
```
New:
```
---
name: sdd-plan
description: Use when a feature spec exists and needs to become a technical implementation plan
---
```

**EDIT sdd-research — remove allowed-tools:**

Old:
```
---
name: sdd-research
description: Use when a spec has unresolved technology choices, performance targets, security requirements, or external integrations that need investigation before planning
allowed-tools: Bash, Read
---
```
New:
```
---
name: sdd-research
description: Use when a spec has unresolved technology choices, performance targets, security requirements, or external integrations that need investigation before planning
---
```

**EDIT sdd-review — remove allowed-tools:**

Old:
```
---
name: sdd-review
description: Use when a spec needs a completeness check before planning, or when implementation claims to be complete and needs spec-alignment validation
allowed-tools: Bash, Read
---
```
New:
```
---
name: sdd-review
description: Use when a spec needs a completeness check before planning, or when implementation claims to be complete and needs spec-alignment validation
---
```

**EDIT sdd-init — remove allowed-tools:**

Old:
```
---
name: sdd-init
description: Use when starting a new project that has no CLAUDE.md and no docs/specs/ directory
allowed-tools: Bash, Read
---
```
New:
```
---
name: sdd-init
description: Use when starting a new project that has no CLAUDE.md and no docs/specs/ directory
---
```

**EDIT sdd-execute — remove allowed-tools:**

Old:
```
---
name: sdd-execute
description: Use when a tasks.md exists and implementation should begin
allowed-tools: Bash, Read
---
```
New:
```
---
name: sdd-execute
description: Use when a tasks.md exists and implementation should begin
---
```

**EDIT using-git — remove allowed-tools:**

Old:
```
---
name: using-git
description: Use when any git operation is needed in an SDD project — branch creation, commits, merge commit validation, or showing the convention
allowed-tools: Bash, Read
---
```
New:
```
---
name: using-git
description: Use when any git operation is needed in an SDD project — branch creation, commits, merge commit validation, or showing the convention
---
```

**EDIT systematic-debugging — remove allowed-tools:**

Old:
```
---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
allowed-tools: Bash, Read
---
```
New:
```
---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
---
```

**EDIT requesting-code-review — remove allowed-tools:**

Old:
```
---
name: requesting-code-review
description: Use when completing a development phase or major feature, and before merging to main
allowed-tools: Bash, Read
---
```
New:
```
---
name: requesting-code-review
description: Use when completing a development phase or major feature, and before merging to main
---
```

**EDIT test-driven-development — remove allowed-tools:**

Old:
```
---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code
allowed-tools: Bash
---
```
New:
```
---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code
---
```

**GREEN — verify all 10 have no allowed-tools:**
```bash
for f in skills/sdd-specify/SKILL.md skills/sdd-plan/SKILL.md skills/sdd-research/SKILL.md skills/sdd-review/SKILL.md skills/sdd-init/SKILL.md skills/sdd-execute/SKILL.md skills/using-git/SKILL.md skills/systematic-debugging/SKILL.md skills/requesting-code-review/SKILL.md skills/test-driven-development/SKILL.md; do
  grep "allowed-tools" "/Users/hllj/Projects/sdd-superpowers/$f" && echo "FAIL: $f" || echo "OK: $f"
done
```
Expected: all 10 print `OK`

---

## Phase 2 — Content Bug Fixes

### [P] Task 7 — sdd-execute: fix broken integration table ✅ DONE

**Completed in initial execution run** (before spec update).

Verified: note block appears after the last table row.

---

### [P] Task 8 — systematic-debugging: fix heading capitalisation ✅ DONE

**Completed in initial execution run** (before spec update).

Verified: `## Your Human Partner's Signals You're Doing It Wrong`

---

## Task 9 — Final verification sweep

```bash
# Descriptions clean
grep "^description:" \
  /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md \
  /Users/hllj/Projects/sdd-superpowers/skills/sdd-brainstorm/SKILL.md \
  /Users/hllj/Projects/sdd-superpowers/skills/sdd-tasks/SKILL.md \
  /Users/hllj/Projects/sdd-superpowers/skills/sdd-spec-update/SKILL.md \
  /Users/hllj/Projects/sdd-superpowers/skills/verification-before-completion/SKILL.md
```
Expected — none of these phrases appear:
- "establishes skill invocation order"
- "2-3 directions"
- "checkboxed task list" / "after sdd-plan" / "before sdd-execute"
- "assess impact, version the spec"
- "run the verification command"

```bash
# user-invocable on sdd-workflow
grep "user-invocable" /Users/hllj/Projects/sdd-superpowers/skills/sdd-workflow/SKILL.md
```
Expected: `user-invocable: false`

```bash
# No allowed-tools anywhere in any skill
grep -r "allowed-tools" /Users/hllj/Projects/sdd-superpowers/skills/
```
Expected: no output

```bash
# sdd-execute table fix
grep -n "finishing-a-development-branch\|Note:" /Users/hllj/Projects/sdd-superpowers/skills/sdd-execute/SKILL.md
```
Expected: `finishing-a-development-branch` line < `Note:` line

```bash
# systematic-debugging heading fix
grep "^## [Yy]our" /Users/hllj/Projects/sdd-superpowers/skills/systematic-debugging/SKILL.md
```
Expected: `## Your Human Partner's Signals You're Doing It Wrong`

---

## Task 10 — Commit all changes

```bash
git add \
  skills/sdd-brainstorm/SKILL.md \
  skills/sdd-tasks/SKILL.md \
  skills/sdd-spec-update/SKILL.md \
  skills/verification-before-completion/SKILL.md \
  skills/sdd-specify/SKILL.md \
  skills/sdd-plan/SKILL.md \
  skills/sdd-research/SKILL.md \
  skills/sdd-review/SKILL.md \
  skills/sdd-init/SKILL.md \
  skills/sdd-execute/SKILL.md \
  skills/using-git/SKILL.md \
  skills/systematic-debugging/SKILL.md \
  skills/requesting-code-review/SKILL.md \
  skills/test-driven-development/SKILL.md \
  docs/specs/015-skills-frontmatter-description-refinement/
git commit -m "fix(skills): description CSO fixes, user-invocable on sdd-workflow, content bug fixes"
```

---

## Done Criteria

- [ ] All 5 CSO-violating descriptions corrected
- [ ] `sdd-workflow` has `user-invocable: false`
- [ ] No `allowed-tools` field exists in any skill
- [ ] `sdd-execute` integration table has no `> Note:` block between rows
- [ ] `systematic-debugging` heading is `## Your Human Partner's Signals You're Doing It Wrong`
- [ ] Single clean commit on branch `015-skills-frontmatter-description-refinement`
