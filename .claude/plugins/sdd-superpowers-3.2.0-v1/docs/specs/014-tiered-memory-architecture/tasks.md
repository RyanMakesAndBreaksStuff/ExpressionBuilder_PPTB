# Tasks: Tiered Memory Architecture

**Plan:** docs/specs/014-tiered-memory-architecture/plan.md
**Generated:** 2026-06-24

> **For agentic workers:** Execute tasks in order. `[P]` tasks within the same parallel group can run concurrently. Never start an implementation task without the prior test task completed and confirmed red.

---

## Parallel Group 0: Failing Hook Tests

Sub-groups A, B, C touch different files — run concurrently.

### Group 0-A: test_session_start.sh (constitution → foundation)

- [x] **T001** `[P]` Edit `tests/hooks/test_session_start.sh` — change fixture and assertion.

  Replace:
  ```bash
  echo "# Constitution content" > "$TMP/memory/constitution.md"
  ```
  with:
  ```bash
  echo "# Foundation content" > "$TMP/memory/foundation.md"
  ```
  Replace:
  ```bash
  assert_contains "$OUTPUT" "Constitution content" "AC-1.1: constitution.md injected"
  ```
  with:
  ```bash
  assert_contains "$OUTPUT" "Foundation content" "AC-1.1: foundation.md injected"
  ```

- [x] **T002** `[P]` Verify T001 is RED:
  ```bash
  bash tests/hooks/test_session_start.sh
  ```
  Expected: AC-1.1 FAILS — "Foundation content" not found (hook still reads constitution.md which no longer exists in the fixture directory)

- [x] **T003** `[P]` Commit:
  ```bash
  git add tests/hooks/test_session_start.sh
  git commit -m "test: update session_start fixture to foundation.md"
  ```

### Group 0-B: test_post_write_memory_validate.sh (whitelist cases)

- [x] **T004** `[P]` Edit `tests/hooks/test_post_write_memory_validate.sh` — insert three whitelist test cases before `rm -rf "$TMP"`:

  ```bash
  # FR-6 whitelist: foundation.md silenced
  echo "# Foundation" > "$TMP/memory/foundation.md"
  INPUT=$(make_input "$TMP" "$TMP/memory/foundation.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "FR-6 whitelist: silent for foundation.md"

  # FR-6 whitelist: MEMORY.md silenced
  echo "# Memory" > "$TMP/memory/MEMORY.md"
  INPUT=$(make_input "$TMP" "$TMP/memory/MEMORY.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "FR-6 whitelist: silent for MEMORY.md"

  # FR-6 whitelist: steering file silenced
  mkdir -p "$TMP/memory/steering"
  echo "# Tech Stack" > "$TMP/memory/steering/tech-stack.md"
  INPUT=$(make_input "$TMP" "$TMP/memory/steering/tech-stack.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "FR-6 whitelist: silent for steering file"
  ```

- [x] **T005** `[P]` Verify T004 is RED:
  ```bash
  bash tests/hooks/test_post_write_memory_validate.sh
  ```
  Expected: 3 new FAIL lines — "FR-6 whitelist: silent for foundation.md", "…MEMORY.md", "…steering file"

- [x] **T006** `[P]` Commit:
  ```bash
  git add tests/hooks/test_post_write_memory_validate.sh
  git commit -m "test: add whitelist cases to post_write_memory_validate"
  ```

### Group 0-C: test_subagent_start.sh (must-not future-proofing)

- [x] **T007** `[P]` Edit `tests/hooks/test_subagent_start.sh` — extend must-not grep pattern.

  Replace:
  ```bash
  if echo "$OUTPUT" | grep -qi "constitution"; then
  ```
  with:
  ```bash
  if echo "$OUTPUT" | grep -qi "foundation\|constitution"; then
  ```

- [x] **T008** `[P]` Verify T007 still PASSES (subagent-start.sh loads neither file):
  ```bash
  bash tests/hooks/test_subagent_start.sh
  ```
  Expected: 5 passed, 0 failed

- [x] **T009** `[P]` Commit:
  ```bash
  git add tests/hooks/test_subagent_start.sh
  git commit -m "test: extend subagent_start must-not to cover foundation"
  ```

---

## Parallel Group 1: Implementation

*Complete all Group 0 tasks before starting Group 1-A and 1-B. Groups 1-C through 1-F have no dependency on Group 0 and may start immediately.*

Sub-groups A–F touch different files — run concurrently.

### Group 1-A: session-start.sh hook (requires Group 0-A red)

- [x] **T010** `[P]` Edit `scripts/hooks/session-start.sh` — swap constitution.md → foundation.md.

  Replace:
  ```bash
  if [ -f "${CWD}/memory/constitution.md" ]; then
    append_section "memory/constitution.md" "$(cat "${CWD}/memory/constitution.md")"
  fi
  ```
  with:
  ```bash
  if [ -f "${CWD}/memory/foundation.md" ]; then
    append_section "memory/foundation.md" "$(cat "${CWD}/memory/foundation.md")"
  fi
  ```

- [x] **T011** `[P]` Verify AC-1.5 GREEN — Given foundation.md exists in SDD project When session starts Then it is injected:
  ```bash
  bash tests/hooks/test_session_start.sh
  ```
  Expected: all assertions PASS including "Foundation content"

- [x] **T012** `[P]` Run full suite to confirm no regressions:
  ```bash
  bash tests/hooks/run_all.sh
  ```
  Expected: 9 files pass, 0 fail

- [x] **T013** `[P]` Commit:
  ```bash
  git add scripts/hooks/session-start.sh
  git commit -m "fix: session-start hook reads foundation.md instead of constitution.md"
  ```

### Group 1-B: post-write-memory-validate.sh whitelist (requires Group 0-B red)

- [x] **T014** `[P]` Edit `scripts/hooks/post-write-memory-validate.sh` — insert whitelist case block after the existing path filter.

  After:
  ```bash
  case "$FILE_PATH" in
    */memory/*.md) ;;
    *) exit 0 ;;
  esac
  ```
  Insert:
  ```bash
  case "$FILE_PATH" in
    */memory/foundation.md|*/memory/MEMORY.md|*/memory/steering/*.md) exit 0 ;;
  esac
  ```

- [x] **T015** `[P]` Verify AC-3.4 GREEN — Given foundation.md written When hook fires Then silent:
  ```bash
  bash tests/hooks/test_post_write_memory_validate.sh
  ```
  Expected: all 7 assertions PASS (4 original + 3 whitelist)

- [x] **T016** `[P]` Run full suite:
  ```bash
  bash tests/hooks/run_all.sh
  ```
  Expected: 9 files pass, 0 fail

- [x] **T017** `[P]` Commit:
  ```bash
  git add scripts/hooks/post-write-memory-validate.sh
  git commit -m "feat: whitelist foundation.md, MEMORY.md, steering files in memory validation hook"
  ```

### Group 1-C: sdd-init CLAUDE.md template (no Group 0 dependency)

- [x] **T018** `[P]` Create `skills/sdd-init/templates/` directory and write `skills/sdd-init/templates/claude-md.md` with this exact content:

  ```markdown
  <!-- sdd-init: generated -->
  # [Project Name]

  Before starting work, invoke `sdd-superpowers:sdd-workflow`.

  ## Memory

  Memory lives in `memory/` — see `memory/MEMORY.md` for the index.
  Project identity is in `memory/foundation.md`.
  Steering files in `memory/steering/` are loaded by skills when relevant.

  ## Hard Gates

  - NO PLAN without an approved spec
  - NO TASKS without a plan
  - NO CODE without a prior failing test
  - NO COMPLETION CLAIM without fresh verification evidence
  ```

- [x] **T019** `[P]` Verify AC-2.2 — sentinel is first line:
  ```bash
  head -1 skills/sdd-init/templates/claude-md.md
  ```
  Expected: `<!-- sdd-init: generated -->`

- [x] **T020** `[P]` Verify AC-2.5 — no skills table in template:
  ```bash
  grep -c "| \`sdd-" skills/sdd-init/templates/claude-md.md
  ```
  Expected: `0`

- [x] **T021** `[P]` Verify hard gates present:
  ```bash
  grep -c "NO PLAN" skills/sdd-init/templates/claude-md.md
  ```
  Expected: `1`

- [x] **T022** `[P]` Commit:
  ```bash
  git add skills/sdd-init/templates/
  git commit -m "feat: add CLAUDE.md boot-layer template for sdd-init"
  ```

### Group 1-D: sdd-init/reference.md — 7 touch points (no Group 0 dependency)

- [x] **T023** `[P]` Edit `skills/sdd-init/reference.md` touch point 4.1 — HARD-GATE text.

  Replace:
  ```
  Do NOT create any feature specs, plans, or code until the constitution is approved and the scaffold is written.
  ```
  with:
  ```
  Do NOT create any feature specs, plans, or code until the foundation file is approved and the scaffold is written.
  ```

- [x] **T024** `[P]` Edit `skills/sdd-init/reference.md` touch point 4.2 — Foundation Existence Check (4 states).

  Replace the entire `### Constitution Existence Check` block (from `### Constitution Existence Check` through `Jump to Step 5.2 (steering file generation).`) with:

  ```markdown
  ### Foundation Existence Check

  After the exploration subagent returns, check for existing foundation and constitution files:

  - **If `memory/foundation.md` exists:**
    Announce: "foundation.md already exists — project already initialized. No files will be written."
    **STOP — do not proceed to Step 2 or any scaffold step.**
  - **If `memory/constitution.md` exists and contains `## Article I`:**
    Announce: "An existing nine-article constitution was found at `memory/constitution.md`. Run migration before re-initializing: rename `memory/constitution.md` → `memory/foundation.md`, then re-invoke `sdd-init`. No files will be written."
    **STOP — do not proceed to Step 2 or any scaffold step.**
  - **If both `memory/constitution.md` and `memory/foundation.md` exist:**
    Announce: "Conflicting state — both `memory/constitution.md` and `memory/foundation.md` exist. Resolve manually before re-invoking `sdd-init`. No files will be written."
    **STOP — do not proceed to Step 2 or any scaffold step.**
  - **If `memory/constitution.md` exists and does NOT contain `## Article I`:**
    Announce: "A mission-charter constitution exists at `memory/constitution.md`. Rename it to `memory/foundation.md` to complete migration, then re-invoke `sdd-init`. No files will be written."
    **STOP — do not proceed to Step 2 or any scaffold step.**
  - **If neither file exists:** proceed to Step 2 normally.
  ```

- [x] **T025** `[P]` Edit `skills/sdd-init/reference.md` touch point 4.3 — Step 3 path and schema.

  Replace section heading:
  - `## Step 3: Write memory/constitution.md` → `## Step 3: Write memory/foundation.md`

  Replace announce line:
  - `Announce: "Writing \`memory/constitution.md\`."` → `Announce: "Writing \`memory/foundation.md\`."`

  Replace file title in schema:
  - `# [Project Name] Constitution` → `# [Project Name] Foundation`

- [x] **T026** `[P]` Edit `skills/sdd-init/reference.md` touch point 4.4 — Step 5.1 reference.

  Replace:
  ```
  Confirm that `memory/constitution.md` was written in Step 3.
  ```
  with:
  ```
  Confirm that `memory/foundation.md` was written in Step 3.
  ```

- [x] **T027** `[P]` Edit `skills/sdd-init/reference.md` touch point 4.5 — Step 5.4 sentinel detection.

  Replace the entire `### Step 5.4 Create or update CLAUDE.md` section (detection order list + block content) with:

  ```markdown
  ### Step 5.4 Create or update CLAUDE.md

  **Detection order:**
  1. If `CLAUDE.md` does not exist → write from `skills/sdd-init/templates/claude-md.md`, substituting `[Project Name]` with the project name detected in Step 1.5
  2. If `CLAUDE.md` first line is `<!-- sdd-init: generated -->` → skip (already initialised by sdd-init)
  3. If `CLAUDE.md` exists without the sentinel → append the `## Project Foundation` block below after showing the user what will be appended and getting approval

  **`## Project Foundation` block to append (backward-compat path):**

  ```markdown
  ## Project Foundation

  Before any feature work, read:
  - `memory/foundation.md` — Mission and principles. Loaded every session.
  - `memory/steering/` — Operational context. Loaded by skills when relevant.
    Each file's `loaded-by` frontmatter shows which skills incorporate it silently.
  ```
  ```

- [x] **T028** `[P]` Edit `skills/sdd-init/reference.md` touch point 4.6 — Step 5.6 git add.

  Replace:
  ```bash
  git add memory/constitution.md memory/steering/ docs/specs/.gitkeep CLAUDE.md docs/git-convention.md
  ```
  with:
  ```bash
  git add memory/foundation.md memory/steering/ docs/specs/.gitkeep CLAUDE.md docs/git-convention.md
  ```

- [x] **T029** `[P]` Edit `skills/sdd-init/reference.md` touch point 4.7 — Step 6 handoff.

  Replace:
  ```
  - `memory/constitution.md` — [Created/Updated] Mission Charter governing all implementation plans
  ```
  with:
  ```
  - `memory/foundation.md` — [Created/Updated] Foundation file: mission and principles loaded every session
  ```

- [x] **T030** `[P]` Verify AC-1.1–1.4 coverage — no spurious constitution references remain:
  ```bash
  grep -n "constitution" skills/sdd-init/reference.md | grep -v "Article I\|nine-article\|migration\|constitution\.md.*rename\|constitution\.md.*Rename"
  ```
  Expected: 0 lines (only legitimate Article I / migration references survive)

- [x] **T031** `[P]` Commit:
  ```bash
  git add skills/sdd-init/reference.md
  git commit -m "feat: update sdd-init reference.md to generate foundation.md and use sentinel CLAUDE.md detection"
  ```

### Group 1-E: sdd-init/SKILL.md (no Group 0 dependency)

- [x] **T032** `[P]` Edit `skills/sdd-init/SKILL.md` — apply 5 text replacements:

  | Old | New |
  |-----|-----|
  | `writes \`memory/constitution.md\`` | `writes \`memory/foundation.md\`` |
  | `Mission Charter — mission statement + 3–5 project-specific principles` | `Foundation file — mission statement + 3–5 project-specific principles` |
  | `check for existing constitution` | `check for existing foundation file` |
  | `Draft constitution from answers → user approval gate → write \`memory/constitution.md\`` | `Draft foundation from answers → user approval gate → write \`memory/foundation.md\`` |
  | `until the constitution is approved` | `until the foundation file is approved` |

- [x] **T033** `[P]` Verify AC-3.6 — no constitution references remain:
  ```bash
  grep -c "constitution" skills/sdd-init/SKILL.md
  ```
  Expected: `0`

- [x] **T034** `[P]` Commit:
  ```bash
  git add skills/sdd-init/SKILL.md
  git commit -m "feat: update sdd-init SKILL.md to reference foundation.md"
  ```

### Group 1-F: Repo self-migration (no Group 0 dependency)

- [x] **T035** `[P]` Write `memory/foundation.md` — copy content from `memory/constitution.md`, changing only the file title:

  Create `memory/foundation.md` with content identical to `memory/constitution.md` except the first heading:
  - Replace: `# SDD Superpowers Constitution`
  - With: `# SDD Superpowers Foundation`

  All other content (Mission, Principles, Operational Context, Amendment Process) is preserved verbatim.

- [x] **T036** `[P]` Delete `memory/constitution.md`:
  ```bash
  rm memory/constitution.md
  ```

- [x] **T037** `[P]` Verify AC-3.1 — foundation exists, constitution gone:
  ```bash
  head -1 memory/foundation.md
  ```
  Expected: `# SDD Superpowers Foundation`
  ```bash
  grep "Loaded every session" memory/foundation.md
  ```
  Expected: match found
  ```bash
  ls memory/constitution.md 2>&1
  ```
  Expected: `No such file or directory`

- [x] **T038** `[P]` Create `docs/contributing.md` with the content specified in plan.md Phase 6.2 (What Is SDD, Skills table, Workflow diagram, Bundled Skills table, Directory Structure, Quick Start — full content from plan section 6.2).

- [x] **T039** `[P]` Verify AC-3.5 — contributing.md has moved content:
  ```bash
  grep "What Is SDD" docs/contributing.md
  ```
  Expected: match found
  ```bash
  grep "| \`sdd-workflow\`" docs/contributing.md
  ```
  Expected: match found

- [x] **T040** `[P]` Rewrite `CLAUDE.md` with this exact content:

  ```markdown
  <!-- sdd-init: generated -->
  # SDD Superpowers

  Before starting work, invoke `sdd-superpowers:sdd-workflow`.

  ## Memory

  Memory lives in `memory/` — see `memory/MEMORY.md` for the index.
  Project identity is in `memory/foundation.md`.
  Steering files in `memory/steering/` are loaded by skills when relevant.

  ## Hard Gates

  - NO PLAN without an approved spec
  - NO TASKS without a plan
  - NO CODE without a prior failing test
  - NO COMPLETION CLAIM without fresh verification evidence

  ## Project Context

  Before starting any work, read these sources:

  | Source | What it contains |
  |--------|-----------------|
  | `memory/foundation.md` | Mission and principles. Loaded every session. |
  | `memory/MEMORY.md` | Index of all persistent memory files |
  | `docs/git-convention.md` | Branch naming regex, commit format, allowed types |
  | `docs/specs/` | All feature specs, plans, and task lists |

  Always check `docs/specs/` for existing specs before starting a new feature.

  > For plugin contributor reference (skills, workflow, directory structure): see `docs/contributing.md`
  ```

- [x] **T041** `[P]` Verify AC-3.2 + AC-3.3:
  ```bash
  head -1 CLAUDE.md
  ```
  Expected: `<!-- sdd-init: generated -->`
  ```bash
  grep -c "sdd-brainstorm ──" CLAUDE.md
  ```
  Expected: `0`
  ```bash
  grep "foundation.md" CLAUDE.md
  ```
  Expected: match found

- [x] **T042** `[P]` Update `memory/project_constitution_format.md` — rewrite entire file:

  ```markdown
  ---
  name: project-constitution-format
  description: memory/foundation.md is the Tier 0 project identity file — no frontmatter required; hook whitelist exempts it from validation
  metadata:
    type: project
  ---

  `memory/foundation.md` is the project foundation file introduced in feature 014 (tiered-memory-architecture). It holds Mission, Principles, Operational Context pointer, and Amendment Process — no YAML frontmatter.

  **Why:** The PostToolUse:Write hook validates all files written to `memory/` as memory entries and required YAML frontmatter. `foundation.md` is not a memory entry; it is the Tier 0 project identity file. Feature 014 added a hook whitelist that exempts `foundation.md`, `MEMORY.md`, and `steering/*.md` from frontmatter validation — the hook is now silent for these files.

  **How to apply:** No action needed. The whitelist handles it automatically. If the hook fires on `foundation.md` in a project that has not yet applied feature 014's hook update, the old guidance applies: ignore the warning.
  ```

- [x] **T043** `[P]` Verify AC-3.7:
  ```bash
  grep "foundation.md" memory/project_constitution_format.md
  ```
  Expected: match found

- [x] **T044** `[P]` Commit:
  ```bash
  git add memory/foundation.md memory/project_constitution_format.md docs/contributing.md CLAUDE.md
  git commit -m "feat: self-migrate repo — foundation.md, contributing.md, boot-layer CLAUDE.md"
  ```

---

## Sequential: Phase 7 — Integration Verification

*All Group 0 and Group 1 tasks must be complete before starting Phase 7.*

- [x] **T045** Run full hook test suite:
  ```bash
  bash tests/hooks/run_all.sh
  ```
  Expected: 9 files pass, 0 fail (all test updates from Group 0 now green)

- [x] **T046** Quickstart Scenario A — session-start loads foundation.md:
  ```bash
  TMP=$(mktemp -d)
  mkdir -p "$TMP/docs/specs" "$TMP/memory"
  echo "# SDD Superpowers Foundation" > "$TMP/memory/foundation.md"
  echo "- [test](test.md)" > "$TMP/memory/MEMORY.md"
  INPUT=$(jq -n --arg cwd "$TMP" '{"hook_event_name":"SessionStart","session_id":"t","cwd":$cwd}')
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$(pwd)" CWD="$TMP" bash scripts/hooks/session-start.sh <<< "$INPUT")
  echo "$OUTPUT" | grep -q "Foundation" && echo "PASS: foundation.md loaded" || echo "FAIL"
  rm -rf "$TMP"
  ```
  Expected: `PASS: foundation.md loaded`

- [x] **T047** Quickstart Scenario B — hook silent for foundation.md:
  ```bash
  TMP=$(mktemp -d)
  mkdir -p "$TMP/docs/specs" "$TMP/memory/steering"
  echo "# Foundation" > "$TMP/memory/foundation.md"
  INPUT=$(jq -n --arg cwd "$TMP" --arg path "$TMP/memory/foundation.md" \
    '{"hook_event_name":"PostToolUse","cwd":$cwd,"tool_name":"Write","tool_input":{"file_path":$path}}')
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$(pwd)" bash scripts/hooks/post-write-memory-validate.sh <<< "$INPUT")
  [ -z "$OUTPUT" ] && echo "PASS: hook silent for foundation.md" || echo "FAIL: got output"
  rm -rf "$TMP"
  ```
  Expected: `PASS: hook silent for foundation.md`

- [x] **T048** Quickstart Scenario C — CLAUDE.md boot layer only:
  ```bash
  head -1 CLAUDE.md
  grep -c "sdd-brainstorm ──" CLAUDE.md
  grep "foundation.md" CLAUDE.md
  ```
  Expected: `<!-- sdd-init: generated -->` / `0` / match

- [x] **T049** Quickstart Scenario D — contributing.md has moved content:
  ```bash
  grep "What Is SDD" docs/contributing.md
  grep "| \`sdd-workflow\`" docs/contributing.md
  ```
  Expected: both match

- [x] **T050** Final commit:
  ```bash
  git add docs/specs/014-tiered-memory-architecture/
  git commit -m "feat: complete 014-tiered-memory-architecture — tiered memory, foundation.md, boot-layer CLAUDE.md"
  ```

---

## Task Summary

| Range | Phase | Can Parallelize? | Spec ACs Covered |
|-------|-------|-----------------|-----------------|
| T001–T003 | 0-A: test_session_start update | Yes (with 0-B, 0-C) | AC-1.5 (test precondition) |
| T004–T006 | 0-B: test_post_write_memory update | Yes (with 0-A, 0-C) | AC-3.4 (test precondition) |
| T007–T009 | 0-C: test_subagent_start update | Yes (with 0-A, 0-B) | — (forward-proofing) |
| T010–T013 | 1-A: session-start.sh hook | Yes (with 1-B through 1-F) | AC-1.5, AC-3.2 |
| T014–T017 | 1-B: whitelist hook | Yes (with 1-A, 1-C through 1-F) | AC-3.4 |
| T018–T022 | 1-C: sdd-init template | Yes (with all Group 1) | AC-2.1, AC-2.2, AC-2.5 |
| T023–T031 | 1-D: sdd-init/reference.md | Yes (with 1-A through 1-C, 1-E, 1-F) | AC-1.1–1.4, AC-2.1–2.4 |
| T032–T034 | 1-E: sdd-init/SKILL.md | Yes (with all Group 1) | AC-3.6 |
| T035–T044 | 1-F: repo self-migration | Yes (with 1-A through 1-E) | AC-3.1–3.5, AC-3.7 |
| T045–T050 | 7: Integration verification | No (all prior must complete) | All ACs |

**Total tasks:** 50
**Parallelizable:** 44 tasks across 2 parallel groups
**Estimated parallel speedup:** ~4× (9 sequential tasks gate the 41 parallel)
