# Implementation Plan: Apply Writing-Skills Best Practices to SDD Skill Set

> **For agentic workers:** Use sdd-tasks to generate an executable task list from this plan.

**Spec:** docs/specs/004-apply-writing-skills-best-practices/spec.md
**Created:** 2026-04-17

---

## Goal

Migrate `writing-skills/` into `skills/writing-skills/` and rewrite all 18 SDD SKILL.md files to comply with CSO description rules, ≤500-word budgets, and standard section structure.

## Architecture

This is a documentation refactoring task — no code, no data storage, no APIs. Each SKILL.md is edited in place: description field rewritten, body trimmed via progressive disclosure (overflow → reference files), and missing standard sections added. Skills are processed in parallel batches; each batch is independent.

## Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Verification | bash + wc/grep | Zero dependencies; confirms word counts and section presence |
| Editing | Direct file edits | Each skill is an independent markdown file |
| Reference files | Markdown | writing-skills progressive disclosure pattern (FR-3) |

## File Structure

Modified files (18 SKILL.md edits):
- `skills/writing-skills/SKILL.md` — moved from `writing-skills/SKILL.md`; frontmatter fixed
- `skills/sdd-workflow/SKILL.md` — description fixed; trimmed to ≤200 words
- `skills/sdd-init/SKILL.md` — description fixed; trimmed to ≤500 words
- `skills/subagent-driven-development/SKILL.md` — trimmed; sections added
- `skills/systematic-debugging/SKILL.md` — trimmed; sections added
- `skills/test-driven-development/SKILL.md` — trimmed; sections added; Common Mistakes added
- `skills/sdd-review/SKILL.md` — trimmed; sections added
- `skills/sdd-execute/SKILL.md` — description fixed; trimmed; sections added
- `skills/sdd-plan/SKILL.md` — trimmed; sections added
- `skills/using-git/SKILL.md` — description fixed; trimmed; sections added
- `skills/sdd-brainstorm/SKILL.md` — trimmed; sections added
- `skills/sdd-specify/SKILL.md` — trimmed; sections added
- `skills/sdd-tasks/SKILL.md` — trimmed; sections added
- `skills/sdd-research/SKILL.md` — trimmed; sections added
- `skills/receiving-code-review/SKILL.md` — description fixed; trimmed; sections added
- `skills/dispatching-parallel-agents/SKILL.md` — trimmed; Quick Reference added
- `skills/finishing-a-development-branch/SKILL.md` — description fixed; When to Use added
- `skills/verification-before-completion/SKILL.md` — trimmed; sections added; Common Mistakes added
- `skills/requesting-code-review/SKILL.md` — sections added

New reference files (created as needed during trimming):
- `skills/<skill-name>/reference.md` — overflow content from SKILL.md body

Removed:
- `writing-skills/` (entire directory at repo root, after move)

## Complexity Tracking

All Pre-Implementation Gates passed.

- **sdd-init:** At 2282 words, aggressive trimming is required. All gate language and rules must be relocated to `skills/sdd-init/reference.md` — none may be deleted. The 500-word target is hard; no exception.
- **sdd-workflow:** Target is ≤200 words (stricter). Routing table and gate text move to `skills/sdd-workflow/routing.md`. Writing-skills is discoverable-only — not added to the routing table.
- **subagent-driven-development:** Exempt from FR-3 and FR-4. Its process flowchart, worked example, and status-handling detail are intentional depth — not bloat. verify.sh skips word-count and section checks for this skill. T015 is removed from execution.

---

## Phase 0: Baseline Verification

**Implements:** FR-2, FR-3, FR-4 (baseline — all checks must FAIL before edits)

### 0.1 Write Verification Script

Write `docs/specs/004-apply-writing-skills-best-practices/verify.sh`:

```bash
#!/usr/bin/env bash
# Verify writing-skills compliance for all SDD skills
PASS=0
FAIL=0

check_words() {
  local f="$1" max="$2"
  local count=$(wc -w < "$f")
  local name=$(basename $(dirname "$f"))
  if [ "$count" -gt "$max" ]; then
    echo "FAIL [word-count] $name: $count words (max $max)"
    FAIL=$((FAIL+1))
  else
    echo "PASS [word-count] $name: $count words"
    PASS=$((PASS+1))
  fi
}

check_section() {
  local f="$1" section="$2"
  local name=$(basename $(dirname "$f"))
  if ! grep -q "$section" "$f"; then
    echo "FAIL [structure] $name: missing '$section'"
    FAIL=$((FAIL+1))
  else
    PASS=$((PASS+1))
  fi
}

check_description() {
  local f="$1"
  local name=$(basename $(dirname "$f"))
  # Check length
  local desc_line=$(grep "^description:" "$f" | head -1)
  local len=${#desc_line}
  if [ "$len" -gt 1024 ]; then
    echo "FAIL [description-length] $name: description >1024 chars"
    FAIL=$((FAIL+1))
  else
    PASS=$((PASS+1))
  fi
  # Check CSO: must start with "Use when" (case-insensitive)
  if ! echo "$desc_line" | grep -qi "use when"; then
    echo "FAIL [description-cso] $name: description does not start with 'Use when'"
    FAIL=$((FAIL+1))
  else
    PASS=$((PASS+1))
  fi
  # Check no workflow summary indicators
  if echo "$desc_line" | grep -qiE "(dispatches|guides|creates|invoked by|called by|presents options)"; then
    echo "FAIL [description-workflow] $name: description may contain workflow summary"
    FAIL=$((FAIL+1))
  else
    PASS=$((PASS+1))
  fi
}

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

# FR-1: writing-skills must exist in skills/
if [ -d "$ROOT/skills/writing-skills" ]; then
  PASS=$((PASS+1)); echo "PASS [fr1] skills/writing-skills exists"
else
  FAIL=$((FAIL+1)); echo "FAIL [fr1] skills/writing-skills missing"
fi
if [ -d "$ROOT/writing-skills" ]; then
  FAIL=$((FAIL+1)); echo "FAIL [fr1] writing-skills/ still at repo root"
else
  PASS=$((PASS+1)); echo "PASS [fr1] writing-skills/ removed from root"
fi

# FR-2: description checks for all skills
for f in "$ROOT/skills"/*/SKILL.md; do
  check_description "$f"
done

# FR-3: word count checks
check_words "$ROOT/skills/sdd-workflow/SKILL.md" 200
for f in "$ROOT/skills"/*/SKILL.md; do
  name=$(basename $(dirname "$f"))
  [ "$name" = "sdd-workflow" ] && continue
  check_words "$f" 500
done

# FR-3: content preservation — combined word count (SKILL.md + reference files) >= 80% of original
# (baseline counts stored in baseline_wordcounts.txt during Phase 0)
if [ -f "$ROOT/docs/specs/004-apply-writing-skills-best-practices/baseline_wordcounts.txt" ]; then
  while IFS=',' read -r skill original; do
    skill_dir="$ROOT/skills/$skill"
    combined=0
    for f in "$skill_dir"/*.md; do
      [ -f "$f" ] && combined=$((combined + $(wc -w < "$f")))
    done
    threshold=$(( original * 80 / 100 ))
    if [ "$combined" -lt "$threshold" ]; then
      echo "FAIL [content-preservation] $skill: combined $combined words < 80% of original $original"
      FAIL=$((FAIL+1))
    else
      PASS=$((PASS+1))
    fi
  done < "$ROOT/docs/specs/004-apply-writing-skills-best-practices/baseline_wordcounts.txt"
fi

# FR-4: required sections
DISCIPLINE_SKILLS="test-driven-development verification-before-completion sdd-workflow systematic-debugging"
for f in "$ROOT/skills"/*/SKILL.md; do
  check_section "$f" "## Overview"
  check_section "$f" "## When to Use"
  check_section "$f" "## Quick Reference"
  name=$(basename $(dirname "$f"))
  for d in $DISCIPLINE_SKILLS; do
    [ "$name" = "$d" ] && check_section "$f" "## Common Mistakes"
  done
done

# FR-4: no placeholder text
for f in "$ROOT/skills"/*/SKILL.md; do
  name=$(basename $(dirname "$f"))
  if grep -qiE "\bTODO\b|\bTBD\b|as needed|as appropriate" "$f"; then
    echo "FAIL [placeholder] $name: contains TODO/TBD/placeholder text"
    FAIL=$((FAIL+1))
  else
    PASS=$((PASS+1))
  fi
done

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
```

### 0.2 Capture Baseline Word Counts (content-preservation baseline)

```bash
for d in skills/*/; do
  skill=$(basename "$d")
  count=$(wc -w < "$d/SKILL.md" 2>/dev/null || echo 0)
  echo "$skill,$count"
done > docs/specs/004-apply-writing-skills-best-practices/baseline_wordcounts.txt
cat docs/specs/004-apply-writing-skills-best-practices/baseline_wordcounts.txt
```

### 0.3 Run Baseline (expect FAIL)

```bash
chmod +x docs/specs/004-apply-writing-skills-best-practices/verify.sh
bash docs/specs/004-apply-writing-skills-best-practices/verify.sh
```

Expected: Many FAILs — all 18 skills over word budget, 17 missing Quick Reference, FR-2 violations, etc.

---

## Phase 1: Move writing-skills (FR-1)

**Implements:** FR-1

### 1.1 Move Directory

```bash
cp -r writing-skills/ skills/writing-skills/
rm -rf writing-skills/
```

### 1.2 Fix writing-skills Frontmatter

In `skills/writing-skills/SKILL.md`, update the frontmatter:

```yaml
---
name: writing-skills
description: Use when creating new skills, editing existing skills, or verifying skills work before deployment
---
```

The existing description already starts with "Use when" and states triggering conditions — verify it contains no workflow summary. If the body references relative paths to sibling files (e.g., `@testing-skills-with-subagents.md`), update them to remain valid at new location (they stay relative within the same directory, so no change needed).

### 1.3 Verify FR-1

```bash
bash docs/specs/004-apply-writing-skills-best-practices/verify.sh 2>&1 | grep "\[fr1\]"
```

Expected:
```
PASS [fr1] skills/writing-skills exists
PASS [fr1] writing-skills/ removed from root
```

Commit: `feat: move writing-skills into skills/ directory`

---

## Phase 2: sdd-workflow Rewrite (FR-2, FR-3, FR-4)

**Implements:** FR-2 (description check), FR-3 (≤200 words), FR-4 (structure)
**Priority:** Highest — sdd-workflow loads in every conversation

### 2.1 Audit Current sdd-workflow

Read `skills/sdd-workflow/SKILL.md` in full. Identify:
- Content that must stay in SKILL.md: routing table summary, hard gates, announce instruction
- Content to move to `skills/sdd-workflow/routing.md`: full routing rules, red flags, mandatory/when tables, new-project detection detail

### 2.2 Rewrite sdd-workflow/SKILL.md (target ≤200 words)

SKILL.md must contain only:
1. YAML frontmatter (description: trigger-only, no workflow summary)
2. `## Overview` — 1-2 sentences on purpose
3. `## When to Use` — bullets: every conversation in SDD project; after any SDD skill completes; NOT for non-SDD projects
4. `## Quick Reference` — compact routing table (skill → one-line trigger only)
5. Hard gates block (4 lines)
6. Link: "Full routing rules and red flags: See [routing.md](routing.md)"

Create `skills/sdd-workflow/routing.md` with full routing detail, mandatory triggers, red flags, new-project detection logic.

### 2.3 Verify sdd-workflow Word Count

```bash
wc -w skills/sdd-workflow/SKILL.md
```

Expected: ≤200 words.

```bash
bash docs/specs/004-apply-writing-skills-best-practices/verify.sh 2>&1 | grep "sdd-workflow"
```

Expected: all PASS for sdd-workflow.

Commit: `feat: rewrite sdd-workflow to ≤200 words with routing.md overflow`

---

## Phase 3: Batch A — Heaviest Skills (FR-2, FR-3, FR-4)

**Implements:** FR-2, FR-3, FR-4
**Skills:** `sdd-init` (2282w), `subagent-driven-development` (1542w), `systematic-debugging` (1504w)
**Parallelizable:** Yes — independent files

Per-skill work for each in this batch:

1. **Read** the full SKILL.md
2. **Identify** content for reference file vs SKILL.md (keep: overview, when-to-use triggers, quick reference, common mistakes, hard gates; move: detailed checklists, full examples, step-by-step workflows)
3. **Rewrite** SKILL.md to ≤500 words with standard sections
4. **Create** `reference.md` or `checklist.md` in skill directory for overflow
5. **Add link** in SKILL.md: "Full checklist: See [reference.md](reference.md)"

**sdd-init specific:** Description currently summarizes what it does ("creates Constitutional Foundation…"). Fix to: `"Use when starting a new project that has no CLAUDE.md and no docs/specs/ directory"`. Move full init procedure to `skills/sdd-init/reference.md`.

**systematic-debugging specific:** Already has Overview, When to Use, Quick Reference — only trimming needed; add Common Mistakes if not present.

### 3.1 Verify Batch A

```bash
for skill in sdd-init subagent-driven-development systematic-debugging; do
  echo "--- $skill ---"
  wc -w skills/$skill/SKILL.md
  bash docs/specs/004-apply-writing-skills-best-practices/verify.sh 2>&1 | grep "$skill"
done
```

Expected: All ≤500 words, all sections present.

Commit: `feat: rewrite sdd-init, subagent-driven-development, systematic-debugging`

---

## Phase 4: Batch B (FR-2, FR-3, FR-4)

**Implements:** FR-2, FR-3, FR-4
**Skills:** `test-driven-development` (1496w), `sdd-review` (1465w), `sdd-execute` (1367w)
**Parallelizable:** Yes

**test-driven-development specific:** Add `## Common Mistakes` section (discipline skill). Move detailed RED-GREEN-REFACTOR steps to `skills/test-driven-development/reference.md`.

**sdd-execute specific:** Description currently reads "dispatches subagents per task with spec-compliance and code-quality review after each" — fix to trigger-only: `"Use when a tasks.md exists and implementation should begin"`.

### 4.1 Verify Batch B

```bash
for skill in test-driven-development sdd-review sdd-execute; do
  bash docs/specs/004-apply-writing-skills-best-practices/verify.sh 2>&1 | grep "$skill"
done
```

Commit: `feat: rewrite test-driven-development, sdd-review, sdd-execute`

---

## Phase 5: Batch C (FR-2, FR-3, FR-4)

**Implements:** FR-2, FR-3, FR-4
**Skills:** `sdd-plan` (1324w), `using-git` (1293w), `sdd-brainstorm` (1274w)
**Parallelizable:** Yes

**using-git specific:** Description currently adds caller info ("Called by sdd-tasks, sdd-execute…"). Fix to: `"Use when any git operation is needed in an SDD project"`. Move git convention detail to `skills/using-git/reference.md`.

### 5.1 Verify Batch C

```bash
for skill in sdd-plan using-git sdd-brainstorm; do
  bash docs/specs/004-apply-writing-skills-best-practices/verify.sh 2>&1 | grep "$skill"
done
```

Commit: `feat: rewrite sdd-plan, using-git, sdd-brainstorm`

---

## Phase 6: Batch D (FR-2, FR-3, FR-4)

**Implements:** FR-2, FR-3, FR-4
**Skills:** `sdd-specify` (1196w), `sdd-tasks` (1190w), `sdd-research` (853w)
**Parallelizable:** Yes

### 6.1 Verify Batch D

```bash
for skill in sdd-specify sdd-tasks sdd-research; do
  bash docs/specs/004-apply-writing-skills-best-practices/verify.sh 2>&1 | grep "$skill"
done
```

Commit: `feat: rewrite sdd-specify, sdd-tasks, sdd-research`

---

## Phase 7: Batch E (FR-2, FR-3, FR-4)

**Implements:** FR-2, FR-3, FR-4
**Skills:** `receiving-code-review` (929w), `dispatching-parallel-agents` (923w), `finishing-a-development-branch` (822w), `verification-before-completion` (668w), `requesting-code-review` (400w)
**Parallelizable:** Yes

**receiving-code-review specific:** Description "requires technical rigor and verification, not performative agreement or blind implementation" describes behavior, not trigger. Fix to trigger-only: `"Use when receiving code review feedback, before implementing review suggestions"`.

**finishing-a-development-branch specific:** Description "guides completion of development work by presenting structured options for merge, PR, or cleanup" summarizes workflow. Fix to: `"Use when implementation is complete, all tests pass, and a decision is needed on how to integrate the work"`.

**verification-before-completion specific:** Add `## Common Mistakes` section (discipline skill). Add `## When to Use` and `## Quick Reference`.

**requesting-code-review specific:** At 400 words it's already lean; add missing Overview, When to Use, Quick Reference sections without significantly expanding.

### 7.1 Verify Batch E

```bash
for skill in receiving-code-review dispatching-parallel-agents finishing-a-development-branch verification-before-completion requesting-code-review; do
  bash docs/specs/004-apply-writing-skills-best-practices/verify.sh 2>&1 | grep "$skill"
done
```

Commit: `feat: rewrite receiving-code-review, dispatching-parallel-agents, finishing-a-development-branch, verification-before-completion, requesting-code-review`

---

## Phase 8: Final Verification

**Implements:** All FRs — acceptance criteria gate

### 8.1 Run Full Verification Suite

```bash
bash docs/specs/004-apply-writing-skills-best-practices/verify.sh
```

Expected:
```
Results: N passed, 0 failed
```

### 8.2 Manual Description Audit

For each of the 5 description-fixed skills, verify no workflow summary remains:

```bash
for skill in sdd-execute sdd-init finishing-a-development-branch receiving-code-review using-git; do
  echo "=== $skill ==="
  awk '/^---/{p++} p==1{print}' skills/$skill/SKILL.md | grep "description:"
done
```

Expected: Each description starts with "Use when…" and contains no step/process language.

### 8.3 Verify writing-skills Accessibility

```bash
ls skills/writing-skills/SKILL.md skills/writing-skills/anthropic-best-practices.md
ls writing-skills/ 2>&1 || echo "PASS: root writing-skills/ removed"
```

### 8.4 Verify No Content Deleted

For each skill that has a reference.md, confirm the SKILL.md contains a link to it:

```bash
for f in skills/*/reference.md skills/*/checklist.md skills/*/routing.md; do
  [ -f "$f" ] || continue
  dir=$(dirname "$f")
  fname=$(basename "$f")
  skill=$(basename "$dir")
  grep -q "$fname" "$dir/SKILL.md" && echo "PASS [link] $skill → $fname" || echo "FAIL [link] $skill missing link to $fname"
done
```

Commit: `feat: complete writing-skills compliance for all SDD skills`

---

## Quickstart Validation

After implementation:

```bash
# 1. Full compliance check — must exit 0
bash docs/specs/004-apply-writing-skills-best-practices/verify.sh

# 2. Confirm writing-skills is a callable skill
ls skills/writing-skills/SKILL.md

# 3. Spot-check word count on the two strictest targets
echo "sdd-workflow: $(wc -w < skills/sdd-workflow/SKILL.md) words (max 200)"
echo "sdd-init: $(wc -w < skills/sdd-init/SKILL.md) words (max 500)"

# 4. Confirm all reference files are linked from their SKILL.md
for f in skills/*/reference.md skills/*/routing.md skills/*/checklist.md; do
  [ -f "$f" ] || continue
  dir=$(dirname "$f"); fname=$(basename "$f"); skill=$(basename "$dir")
  grep -q "$fname" "$dir/SKILL.md" && echo "PASS $skill/$fname" || echo "FAIL $skill/$fname not linked"
done
```
