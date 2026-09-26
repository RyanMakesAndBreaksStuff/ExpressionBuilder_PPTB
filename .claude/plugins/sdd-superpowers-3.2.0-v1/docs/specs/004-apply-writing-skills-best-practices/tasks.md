# Tasks: Apply Writing-Skills Best Practices to SDD Skill Set

**Plan:** docs/specs/004-apply-writing-skills-best-practices/plan.md
**Generated:** 2026-04-18

> **For agentic workers:** Execute tasks in order. `[P]` tasks within the same parallel group can run concurrently — they touch different files. Never skip a verification task. Complete each batch fully before starting the next.

---

## Sequential: Phase 0 — Baseline Setup

*Must complete before any skill edits begin. Establishes RED baseline — all checks must fail.*

- [ ] **T001** Write `docs/specs/004-apply-writing-skills-best-practices/verify.sh` with full content from plan.md Phase 0.1 (word-count checks, FR-2 description CSO checks, section checks, placeholder checks, content-preservation checks).
  Done: file exists and contains `check_words`, `check_description`, `check_section` functions.

- [ ] **T002** Capture baseline word counts:
  ```bash
  cd /Users/hllj/Projects/sdd-superpowers
  for d in skills/*/; do
    skill=$(basename "$d")
    count=$(wc -w < "$d/SKILL.md" 2>/dev/null || echo 0)
    echo "$skill,$count"
  done > docs/specs/004-apply-writing-skills-best-practices/baseline_wordcounts.txt
  cat docs/specs/004-apply-writing-skills-best-practices/baseline_wordcounts.txt
  ```
  Done: `baseline_wordcounts.txt` exists with one `skill,wordcount` line per skill.

- [ ] **T003** Run baseline verification (expect many FAILs — this confirms RED):
  ```bash
  chmod +x docs/specs/004-apply-writing-skills-best-practices/verify.sh
  bash docs/specs/004-apply-writing-skills-best-practices/verify.sh
  ```
  Done: script runs to completion (non-zero exit is expected). Read output and note: all 18 skills over word budget, 17 missing Quick Reference, at least 5 description CSO violations. Record failure count.

---

## Sequential: Phase 1 — Move writing-skills (FR-1)

*Complete Phase 0 before starting.*

- [ ] **T004** Copy `writing-skills/` into `skills/`:
  ```bash
  cp -r writing-skills/ skills/writing-skills/
  ```
  Done: `skills/writing-skills/SKILL.md` exists and matches `writing-skills/SKILL.md` content.

- [ ] **T005** Remove `writing-skills/` from repo root:
  ```bash
  rm -rf writing-skills/
  ```
  Done: `ls writing-skills/` returns "No such file or directory".

- [ ] **T006** Fix `skills/writing-skills/SKILL.md` frontmatter — update only the YAML block:
  ```yaml
  ---
  name: writing-skills
  description: Use when creating new skills, editing existing skills, or verifying skills work before deployment
  ---
  ```
  Do NOT alter any body content. Done: frontmatter matches exactly; body is identical to original.

- [ ] **T007** Verify FR-1 passes:
  ```bash
  bash docs/specs/004-apply-writing-skills-best-practices/verify.sh 2>&1 | grep "\[fr1\]"
  ```
  Expected output:
  ```
  PASS [fr1] skills/writing-skills exists
  PASS [fr1] writing-skills/ removed from root
  ```
  Done: both lines show PASS.

- [ ] **T008** Commit:
  ```bash
  git add skills/writing-skills/ && git commit -m "feat: move writing-skills into skills/ directory"
  ```
  Done: commit created, `git log --oneline -1` shows the commit message.

---

## Sequential: Phase 2 — sdd-workflow Rewrite (FR-2, FR-3, FR-4)

*Complete Phase 1 before starting. sdd-workflow loads every conversation — highest priority.*

- [ ] **T009** Read `skills/sdd-workflow/SKILL.md` in full. Identify which content stays in SKILL.md (routing table summary, hard gates, announce instruction) vs. moves to `routing.md` (full routing rules, mandatory triggers, red flags, new-project detection detail, skill-priority ordering). Done: mental map complete — proceed to T010.

- [ ] **T010** Create `skills/sdd-workflow/routing.md` containing all overflow content from `skills/sdd-workflow/SKILL.md`: complete routing table with all trigger conditions, mandatory/when-to-use rules per skill, red flags table, new-project detection logic, brainstorm-vs-specify decision rules, multi-subsystem decomposition rule. Done: `routing.md` contains all content that will be removed from SKILL.md; file is ≥600 words.

- [ ] **T011** Rewrite `skills/sdd-workflow/SKILL.md` to ≤200 words. Required structure:
  1. YAML frontmatter: `description: Use when starting any conversation in an SDD project`
  2. `## Overview` — 1-2 sentences: entry point for all SDD work; routes to the correct skill for each situation
  3. `## When to Use` — 3 bullets: at start of every conversation in this repo; after any SDD skill completes and next step is unclear; NOT for non-SDD repositories
  4. `## Quick Reference` — compact table: one row per skill, one-line trigger (8–10 rows max)
  5. Hard gates block (4 lines, verbatim from original)
  6. Single line: `Full routing rules and red flags: See [routing.md](routing.md)`
  Done: file saved.

- [ ] **T012** Verify sdd-workflow:
  ```bash
  echo "Word count: $(wc -w < skills/sdd-workflow/SKILL.md)"
  bash docs/specs/004-apply-writing-skills-best-practices/verify.sh 2>&1 | grep "sdd-workflow"
  ```
  Expected: word count ≤200; all lines for sdd-workflow show PASS.

- [ ] **T013** Commit:
  ```bash
  git add skills/sdd-workflow/ && git commit -m "feat: rewrite sdd-workflow to ≤200 words with routing.md overflow"
  ```

---

## Parallel Group A — Heaviest Skills (FR-2, FR-3, FR-4)

*Complete Phase 2 before starting. T014, T015, T016 can run concurrently — different directories.*

- [ ] **T014** `[P]` Rewrite `skills/sdd-init/SKILL.md`:
  - Read current file (2282 words)
  - Fix description to: `"Use when starting a new project that has no CLAUDE.md and no docs/specs/ directory"`
  - Create `skills/sdd-init/reference.md` containing: all existing init procedure steps, Constitutional Foundation creation instructions, full checklist, directory scaffold detail — everything currently in the body
  - Rewrite SKILL.md to ≤500 words with: Overview (what sdd-init does in 2 sentences), When to Use (bullets: no CLAUDE.md + no docs/specs/; NOT when either exists), Quick Reference (what files it creates), link `See [reference.md](reference.md) for the full initialisation procedure`
  Done: `wc -w skills/sdd-init/SKILL.md` ≤500; `skills/sdd-init/reference.md` exists.

- [ ] **T015** `[P]` Rewrite `skills/subagent-driven-development/SKILL.md`:
  - Read current file (1542 words)
  - Create `skills/subagent-driven-development/reference.md` with overflow: detailed dispatch templates, full parallel coordination patterns, example agent prompts
  - Rewrite SKILL.md to ≤500 words with: Overview, When to Use (bullets + when NOT to use), Quick Reference (table of dispatch patterns), link to reference.md
  Done: `wc -w skills/subagent-driven-development/SKILL.md` ≤500; reference.md exists.

- [ ] **T016** `[P]` Rewrite `skills/systematic-debugging/SKILL.md`:
  - Read current file (1504 words; already has Overview, When to Use, Quick Reference)
  - Create `skills/systematic-debugging/reference.md` with overflow: full root-cause tracing procedure, detailed condition-based waiting patterns, extended examples
  - Trim SKILL.md to ≤500 words; add `## Common Mistakes` section (discipline skill) with top 3-4 mistakes from existing content; link to reference.md
  Done: `wc -w skills/systematic-debugging/SKILL.md` ≤500; `## Common Mistakes` present.

- [ ] **T017** Verify Batch A:
  ```bash
  for skill in sdd-init subagent-driven-development systematic-debugging; do
    echo "--- $skill: $(wc -w < skills/$skill/SKILL.md) words ---"
    bash docs/specs/004-apply-writing-skills-best-practices/verify.sh 2>&1 | grep "$skill"
  done
  ```
  Done: all lines show PASS; all word counts ≤500.

- [ ] **T018** Commit:
  ```bash
  git add skills/sdd-init/ skills/subagent-driven-development/ skills/systematic-debugging/ && \
  git commit -m "feat: rewrite sdd-init, subagent-driven-development, systematic-debugging"
  ```

---

## Parallel Group B — (FR-2, FR-3, FR-4)

*Complete Batch A commit before starting. T019, T020, T021 can run concurrently.*

- [ ] **T019** `[P]` Rewrite `skills/test-driven-development/SKILL.md`:
  - Read current file (1496 words)
  - Create `skills/test-driven-development/reference.md` with overflow: full RED-GREEN-REFACTOR procedure, detailed cycle steps, extended code examples, complete rationalisation table
  - Rewrite SKILL.md to ≤500 words with: Overview, When to Use, Quick Reference (the iron law + cycle summary table), `## Common Mistakes` (discipline skill — top rationalizations and counters), link to reference.md
  Done: `wc -w` ≤500; `## Common Mistakes` present.

- [ ] **T020** `[P]` Rewrite `skills/sdd-review/SKILL.md`:
  - Read current file (1465 words)
  - Create `skills/sdd-review/reference.md` with overflow: full Mode A checklist, full Mode B coverage matrix procedure, ambiguity scan details, common failure table
  - Rewrite SKILL.md to ≤500 words with: Overview (two modes in 2 sentences), When to Use (Mode A triggers, Mode B triggers, when NOT to use), Quick Reference (mode-selection table), link to reference.md
  Done: `wc -w` ≤500; reference.md exists.

- [ ] **T021** `[P]` Rewrite `skills/sdd-execute/SKILL.md`:
  - Read current file (1367 words)
  - Fix description to: `"Use when a tasks.md exists and implementation should begin"` (removes workflow summary)
  - Create `skills/sdd-execute/reference.md` with overflow: full subagent dispatch templates, spec-compliance review procedure, code-quality review procedure, parallel group coordination detail
  - Rewrite SKILL.md to ≤500 words with: Overview, When to Use, Quick Reference (dispatch flow table), link to reference.md
  Done: `wc -w` ≤500; description starts with "Use when".

- [ ] **T022** Verify Batch B:
  ```bash
  for skill in test-driven-development sdd-review sdd-execute; do
    echo "--- $skill: $(wc -w < skills/$skill/SKILL.md) words ---"
    bash docs/specs/004-apply-writing-skills-best-practices/verify.sh 2>&1 | grep "$skill"
  done
  ```
  Done: all PASS.

- [ ] **T023** Commit:
  ```bash
  git add skills/test-driven-development/ skills/sdd-review/ skills/sdd-execute/ && \
  git commit -m "feat: rewrite test-driven-development, sdd-review, sdd-execute"
  ```

---

## Parallel Group C — (FR-2, FR-3, FR-4)

*Complete Batch B commit before starting. T024, T025, T026 can run concurrently.*

- [ ] **T024** `[P]` Rewrite `skills/sdd-plan/SKILL.md`:
  - Read current file (1324 words)
  - Create `skills/sdd-plan/reference.md` with overflow: full plan template, gate checks detail, data-model.md and contracts/ templates, step-by-step process for each plan section
  - Rewrite SKILL.md to ≤500 words with: Overview, When to Use, Quick Reference (phase summary table: spec → plan outputs), link to reference.md
  Done: `wc -w` ≤500; reference.md exists.

- [ ] **T025** `[P]` Rewrite `skills/using-git/SKILL.md`:
  - Read current file (1293 words)
  - Fix description to: `"Use when any git operation is needed in an SDD project"` (removes "Called by sdd-tasks…" caller info)
  - Create `skills/using-git/reference.md` with overflow: full git convention detail, branch naming rules and examples, doc-first commit procedure, merge commit validation steps
  - Rewrite SKILL.md to ≤500 words with: Overview, When to Use (branch creation, commits, validation — and when NOT), Quick Reference (common git operations table), link to reference.md
  Done: `wc -w` ≤500; description corrected.

- [ ] **T026** `[P]` Rewrite `skills/sdd-brainstorm/SKILL.md`:
  - Read current file (1274 words)
  - Create `skills/sdd-brainstorm/reference.md` with overflow: full visual companion guide, spec-reviewer subagent prompt, detailed brainstorm session procedure, design.md template
  - Rewrite SKILL.md to ≤500 words with: Overview, When to Use (fuzzy idea signals + when to go straight to sdd-specify instead), Quick Reference (brainstorm outputs: design.md, 2-3 approaches), link to reference.md
  Done: `wc -w` ≤500.

- [ ] **T027** Verify Batch C:
  ```bash
  for skill in sdd-plan using-git sdd-brainstorm; do
    echo "--- $skill: $(wc -w < skills/$skill/SKILL.md) words ---"
    bash docs/specs/004-apply-writing-skills-best-practices/verify.sh 2>&1 | grep "$skill"
  done
  ```
  Done: all PASS.

- [ ] **T028** Commit:
  ```bash
  git add skills/sdd-plan/ skills/using-git/ skills/sdd-brainstorm/ && \
  git commit -m "feat: rewrite sdd-plan, using-git, sdd-brainstorm"
  ```

---

## Parallel Group D — (FR-2, FR-3, FR-4)

*Complete Batch C commit before starting. T029, T030, T031 can run concurrently.*

- [ ] **T029** `[P]` Rewrite `skills/sdd-specify/SKILL.md`:
  - Read current file (1196 words)
  - Create `skills/sdd-specify/reference.md` with overflow: full spec template (all sections), step-by-step process (Steps 1-8), self-review checklist, placeholder anti-patterns list
  - Rewrite SKILL.md to ≤500 words with: Overview, When to Use (clear idea, or after brainstorm + design.md exists; NOT when idea is fuzzy), Quick Reference (spec sections table + fast-path trigger), link to reference.md
  Done: `wc -w` ≤500.

- [ ] **T030** `[P]` Rewrite `skills/sdd-tasks/SKILL.md`:
  - Read current file (1190 words)
  - Create `skills/sdd-tasks/reference.md` with overflow: full tasks.md template with examples, parallelization safety rules, task quality rules, commit granularity guidance
  - Rewrite SKILL.md to ≤500 words with: Overview, When to Use, Quick Reference (task anatomy: red→green→commit cycle), link to reference.md
  Done: `wc -w` ≤500.

- [ ] **T031** `[P]` Rewrite `skills/sdd-research/SKILL.md`:
  - Read current file (853 words)
  - Create `skills/sdd-research/reference.md` with overflow: full research report template, investigation methodology, technology comparison table format
  - Rewrite SKILL.md to ≤500 words with: Overview, When to Use (already has this — keep and trim), Quick Reference (research output: research.md sections), link to reference.md
  Done: `wc -w` ≤500.

- [ ] **T032** Verify Batch D:
  ```bash
  for skill in sdd-specify sdd-tasks sdd-research; do
    echo "--- $skill: $(wc -w < skills/$skill/SKILL.md) words ---"
    bash docs/specs/004-apply-writing-skills-best-practices/verify.sh 2>&1 | grep "$skill"
  done
  ```
  Done: all PASS.

- [ ] **T033** Commit:
  ```bash
  git add skills/sdd-specify/ skills/sdd-tasks/ skills/sdd-research/ && \
  git commit -m "feat: rewrite sdd-specify, sdd-tasks, sdd-research"
  ```

---

## Parallel Group E — (FR-2, FR-3, FR-4)

*Complete Batch D commit before starting. T034–T038 can run concurrently.*

- [ ] **T034** `[P]` Rewrite `skills/receiving-code-review/SKILL.md`:
  - Read current file (929 words)
  - Fix description to: `"Use when receiving code review feedback, before implementing review suggestions"`
  - Create `skills/receiving-code-review/reference.md` with overflow: full verification checklist, detailed pushback criteria, technical challenge procedure
  - Rewrite SKILL.md to ≤500 words with: Overview, When to Use, Quick Reference (response decision table: accept/challenge/clarify), link to reference.md
  Done: `wc -w` ≤500; description corrected.

- [ ] **T035** `[P]` Rewrite `skills/dispatching-parallel-agents/SKILL.md`:
  - Read current file (923 words; already has Overview, When to Use, Common Mistakes)
  - Create `skills/dispatching-parallel-agents/reference.md` with overflow: detailed dispatch templates, full coordination patterns, extended examples
  - Add `## Quick Reference` section (currently missing): table of safe-to-parallelize vs. not-safe scenarios
  - Trim SKILL.md to ≤500 words; link to reference.md
  Done: `wc -w` ≤500; `## Quick Reference` present.

- [ ] **T036** `[P]` Rewrite `skills/finishing-a-development-branch/SKILL.md`:
  - Read current file (822 words; has Overview, Quick Reference, Common Mistakes; missing When to Use)
  - Fix description to: `"Use when implementation is complete, all tests pass, and a decision is needed on how to integrate the work"`
  - Add `## When to Use` section: bullets for merge, PR, keep, discard trigger conditions; when NOT to use (before tests pass, before sdd-review)
  - Create `skills/finishing-a-development-branch/reference.md` with overflow: full option detail for each integration path, PR template, cleanup checklist
  - Trim SKILL.md to ≤500 words; link to reference.md
  Done: `wc -w` ≤500; `## When to Use` present; description corrected.

- [ ] **T037** `[P]` Rewrite `skills/verification-before-completion/SKILL.md`:
  - Read current file (668 words; has Overview; missing When to Use, Quick Reference, Common Mistakes)
  - Add `## When to Use`: bullets for before any completion claim, before commit, before PR; NOT when still actively implementing
  - Add `## Quick Reference`: table of claim types → required verification command
  - Add `## Common Mistakes` (discipline skill): top rationalizations and counters (e.g., "tests pass so it's done", "I ran it earlier")
  - Trim body to ≤500 words total; create reference.md for overflow if needed
  Done: `wc -w` ≤500; all three sections present.

- [ ] **T038** `[P]` Add standard sections to `skills/requesting-code-review/SKILL.md`:
  - Read current file (400 words; missing Overview, When to Use, Quick Reference — all three)
  - Add `## Overview`: 1-2 sentences on purpose
  - Add `## When to Use`: bullets for phase boundaries, completing major features, before merging; when NOT to use (for style-only changes)
  - Add `## Quick Reference`: table of review types → what to include in the request
  - Keep additions minimal — file is already lean, target ≤500 words total
  Done: `wc -w` ≤500; all three sections present.

- [ ] **T039** Verify Batch E:
  ```bash
  for skill in receiving-code-review dispatching-parallel-agents finishing-a-development-branch verification-before-completion requesting-code-review; do
    echo "--- $skill: $(wc -w < skills/$skill/SKILL.md) words ---"
    bash docs/specs/004-apply-writing-skills-best-practices/verify.sh 2>&1 | grep "$skill"
  done
  ```
  Done: all PASS.

- [ ] **T040** Commit:
  ```bash
  git add skills/receiving-code-review/ skills/dispatching-parallel-agents/ \
    skills/finishing-a-development-branch/ skills/verification-before-completion/ \
    skills/requesting-code-review/ && \
  git commit -m "feat: rewrite receiving-code-review, dispatching-parallel-agents, finishing-a-development-branch, verification-before-completion, requesting-code-review"
  ```

---

## Sequential: Phase 8 — Final Verification

*All batch commits must be complete before starting.*

- [ ] **T041** Run full verification suite — must exit 0:
  ```bash
  bash docs/specs/004-apply-writing-skills-best-practices/verify.sh
  ```
  Done: output ends with `Results: N passed, 0 failed`. If any FAIL, fix before proceeding.

- [ ] **T042** Manual description audit for the 5 skills with fixed descriptions:
  ```bash
  for skill in sdd-execute sdd-init finishing-a-development-branch receiving-code-review using-git; do
    echo "=== $skill ==="
    grep "^description:" skills/$skill/SKILL.md
  done
  ```
  Done: each description starts with "Use when" and contains no step/process/workflow language.

- [ ] **T043** Verify writing-skills files accessible and root directory removed:
  ```bash
  ls skills/writing-skills/SKILL.md skills/writing-skills/anthropic-best-practices.md && \
  echo "Root check:" && ls writing-skills/ 2>&1 || true
  ```
  Done: both files listed successfully; root writing-skills/ shows "No such file or directory".

- [ ] **T044** Verify all reference files are linked from their SKILL.md:
  ```bash
  for f in skills/*/reference.md skills/*/checklist.md skills/*/routing.md; do
    [ -f "$f" ] || continue
    dir=$(dirname "$f"); fname=$(basename "$f"); skill=$(basename "$dir")
    grep -q "$fname" "$dir/SKILL.md" && echo "PASS $skill → $fname" || echo "FAIL $skill missing link to $fname"
  done
  ```
  Done: all lines show PASS.

- [ ] **T045** Final commit:
  ```bash
  git add docs/specs/004-apply-writing-skills-best-practices/ && \
  git commit -m "feat: complete writing-skills compliance for all SDD skills"
  ```

---

## Task Summary

| Range | Phase | Skills | Parallelizable? |
|-------|-------|--------|----------------|
| T001–T003 | Baseline setup | — | No (sequential) |
| T004–T008 | writing-skills move | 1 skill | No (sequential) |
| T009–T013 | sdd-workflow rewrite | 1 skill | No (sequential) |
| T014–T018 | Batch A | sdd-init, subagent-driven-development, systematic-debugging | Yes (T014–T016) |
| T019–T023 | Batch B | test-driven-development, sdd-review, sdd-execute | Yes (T019–T021) |
| T024–T028 | Batch C | sdd-plan, using-git, sdd-brainstorm | Yes (T024–T026) |
| T029–T033 | Batch D | sdd-specify, sdd-tasks, sdd-research | Yes (T029–T031) |
| T034–T040 | Batch E | receiving-code-review, dispatching-parallel-agents, finishing-a-development-branch, verification-before-completion, requesting-code-review | Yes (T034–T038) |
| T041–T045 | Final verification | — | No (sequential) |

**Total tasks:** 45
**Parallelizable tasks:** 18 (across 5 parallel groups of 3–5 tasks each)
**Sequential tasks:** 27
**Estimated parallel speedup:** ~3x on batch phases (18 skill edits reduced to 5 batch rounds)
