# Tasks: Memory Relocation to `.claude/`

**Plan:** docs/specs/017-memory-relocation-claude-dir/plan.md
**Generated:** 2026-07-03

> **For agentic workers:** Execute tasks in order. `[P]` tasks within the same parallel group can run concurrently. Never start an implementation task without the prior test task completed and confirmed red.

---

## Parallel Group 0: Write Failing Tests

Tasks T001–T003 touch different files and can run concurrently. Run T004–T005 after their respective writes complete.

- [ ] **T001** `[P]` Write updated `tests/hooks/test_session_start.sh` with `.claude/memory/` fixture paths:
  ```bash
  cat > tests/hooks/test_session_start.sh << 'EOF'
  #!/usr/bin/env bash
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  source "$SCRIPT_DIR/helpers.sh"
  PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
  SCRIPT="$PLUGIN_ROOT/scripts/hooks/session-start.sh"

  echo "--- test_session_start.sh ---"

  TMP=$(mktemp -d)
  mkdir -p "$TMP/docs/specs/011-plugin-hooks"
  mkdir -p "$TMP/.claude/memory"
  echo "# Foundation content" > "$TMP/.claude/memory/foundation.md"
  echo "- [Memory](test.md)" > "$TMP/.claude/memory/MEMORY.md"
  cat > "$TMP/docs/specs/011-plugin-hooks/spec.md" <<'SPEC'
  # Feature 011: Plugin Hooks
  **Status:** Approved
  ## Problem Statement
  Test spec content line 3
  SPEC
  cat > "$TMP/docs/specs/011-plugin-hooks/tasks.md" <<'TASKS'
  - [x] done task
  - [ ] open task 1
  - [ ] open task 2
  TASKS

  INPUT=$(jq -n --arg cwd "$TMP" \
    '{"hook_event_name":"SessionStart","session_id":"t1","cwd":$cwd}')

  # AC-2.1: foundation.md and MEMORY.md injected from .claude/memory/
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" CWD="$TMP" bash "$SCRIPT" <<< "$INPUT")
  assert_contains "$OUTPUT" "Foundation content" "AC-2.1: foundation.md injected from .claude/memory/"
  assert_contains "$OUTPUT" "Memory" "AC-2.1: MEMORY.md injected from .claude/memory/"

  # active spec summary injected
  OUTPUT=$(cd "$TMP" && git() { echo "011-plugin-hooks"; }; export -f git; \
           CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" CWD="$TMP" bash "$SCRIPT" <<< "$INPUT")
  assert_contains "$OUTPUT" "Feature 011" "spec.md first 50 lines injected"

  # unchecked tasks injected, checked excluded
  assert_contains "$OUTPUT" "open task 1" "unchecked task 1 included"
  assert_contains "$OUTPUT" "open task 2" "unchecked task 2 included"
  if echo "$OUTPUT" | grep -q "done task"; then
    FAIL=$((FAIL + 1)); echo "  FAIL: checked task must not appear"
  else
    PASS=$((PASS + 1)); echo "  PASS: checked task excluded"
  fi

  # AC-2.2: silent outside SDD project
  TMP_NOSDD=$(mktemp -d)
  INPUT_NOSDD=$(jq -n --arg cwd "$TMP_NOSDD" \
    '{"hook_event_name":"SessionStart","session_id":"t1","cwd":$cwd}')
  OUTPUT_NOSDD=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT_NOSDD")
  assert_empty "$OUTPUT_NOSDD" "AC-2.2: no output outside SDD project"

  rm -rf "$TMP" "$TMP_NOSDD"
  summarize
  EOF
  chmod +x tests/hooks/test_session_start.sh
  ```

- [ ] **T002** `[P]` Write updated `tests/hooks/test_post_write_memory_validate.sh` with `.claude/memory/` fixture paths:
  ```bash
  cat > tests/hooks/test_post_write_memory_validate.sh << 'EOF'
  #!/usr/bin/env bash
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  source "$SCRIPT_DIR/helpers.sh"
  PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
  SCRIPT="$PLUGIN_ROOT/scripts/hooks/post-write-memory-validate.sh"

  echo "--- test_post_write_memory_validate.sh ---"

  TMP=$(mktemp -d)
  mkdir -p "$TMP/docs/specs" "$TMP/.claude/memory"

  make_input() {
    jq -n --arg cwd "$1" --arg path "$2" \
      '{"hook_event_name":"PostToolUse","session_id":"t1","cwd":$cwd,
        "tool_name":"Write","tool_input":{"file_path":$path}}'
  }

  # AC-3.1: validate when frontmatter missing
  echo "# No frontmatter" > "$TMP/.claude/memory/bad.md"
  INPUT=$(make_input "$TMP" "$TMP/.claude/memory/bad.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_contains "$OUTPUT" "frontmatter" "AC-3.1: mentions missing frontmatter"

  # AC-3.1: validate when required fields missing
  cat > "$TMP/.claude/memory/partial.md" <<'PARTIAL'
  ---
  name: partial-test
  ---
  # Body
  PARTIAL
  INPUT=$(make_input "$TMP" "$TMP/.claude/memory/partial.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_contains "$OUTPUT" "description" "AC-3.1: mentions missing description"
  assert_contains "$OUTPUT" "type" "AC-3.1: mentions missing metadata.type"

  # AC-3.1: validate when slug not in MEMORY.md
  cat > "$TMP/.claude/memory/valid.md" <<'VALID'
  ---
  name: valid-memory
  description: A test memory
  metadata:
    type: feedback
  ---
  # Valid memory
  VALID
  echo "# Memory Index" > "$TMP/.claude/memory/MEMORY.md"
  INPUT=$(make_input "$TMP" "$TMP/.claude/memory/valid.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_contains "$OUTPUT" "MEMORY.md" "AC-3.1: mentions MEMORY.md entry needed"

  # AC-3.1: silent when valid and indexed
  echo "- [valid-memory](valid.md) — test" >> "$TMP/.claude/memory/MEMORY.md"
  INPUT=$(make_input "$TMP" "$TMP/.claude/memory/valid.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "AC-3.1: silent when valid and indexed"

  # AC-3.2: silent for writes outside .claude/memory/
  INPUT=$(make_input "$TMP" "$TMP/docs/specs/001-test/spec.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "AC-3.2: silent for non-.claude/memory/ writes"

  # AC-3.3 whitelist: foundation.md silenced
  echo "# Foundation" > "$TMP/.claude/memory/foundation.md"
  INPUT=$(make_input "$TMP" "$TMP/.claude/memory/foundation.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "AC-3.3: silent for foundation.md"

  # AC-3.3 whitelist: MEMORY.md silenced
  echo "# Memory" > "$TMP/.claude/memory/MEMORY.md"
  INPUT=$(make_input "$TMP" "$TMP/.claude/memory/MEMORY.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "AC-3.3: silent for MEMORY.md"

  # AC-3.3 whitelist: steering file silenced
  mkdir -p "$TMP/.claude/memory/steering"
  echo "# Tech Stack" > "$TMP/.claude/memory/steering/tech-stack.md"
  INPUT=$(make_input "$TMP" "$TMP/.claude/memory/steering/tech-stack.md")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "AC-3.3: silent for steering file"

  rm -rf "$TMP"
  summarize
  EOF
  chmod +x tests/hooks/test_post_write_memory_validate.sh
  ```

- [ ] **T003** `[P]` Write updated `tests/hooks/fixtures/post_write_memory_input.json`:
  ```bash
  cat > tests/hooks/fixtures/post_write_memory_input.json << 'EOF'
  {
    "hook_event_name": "PostToolUse",
    "session_id": "test-session-001",
    "cwd": "__CWD_PLACEHOLDER__",
    "tool_name": "Write",
    "tool_input": {
      "file_path": "__CWD_PLACEHOLDER__/.claude/memory/test_memory.md",
      "content": ""
    }
  }
  EOF
  ```

- [ ] **T004** Verify T001 fails — run `bash tests/hooks/test_session_start.sh` — expect: FAIL on "foundation.md injected from .claude/memory/" (hook still reads old `memory/` path)

- [ ] **T005** Verify T002 fails — run `bash tests/hooks/test_post_write_memory_validate.sh` — expect: FAIL on AC-3.1 assertions (hook still matches `*/memory/*.md`)

- [ ] **T006** Commit:
  ```bash
  git add tests/hooks/test_session_start.sh tests/hooks/test_post_write_memory_validate.sh tests/hooks/fixtures/post_write_memory_input.json
  git commit -m "test(017-memory-relocation-claude-dir): update hook tests to expect .claude/memory/ paths"
  ```

---

## Sequential: Phase 1 — File Migration

*Complete T001–T006 before starting this phase.*

- [ ] **T007** Create `.claude/memory/steering/` directory and move all memory files:
  ```bash
  mkdir -p .claude/memory/steering
  mv memory/foundation.md .claude/memory/foundation.md
  mv memory/MEMORY.md .claude/memory/MEMORY.md
  mv memory/feedback_follow_sdd_workflow.md .claude/memory/feedback_follow_sdd_workflow.md
  mv memory/feedback_release_process.md .claude/memory/feedback_release_process.md
  mv memory/project_constitution_format.md .claude/memory/project_constitution_format.md
  mv memory/steering/conventions.md .claude/memory/steering/conventions.md
  mv memory/steering/tech-stack.md .claude/memory/steering/tech-stack.md
  mv memory/steering/test-strategy.md .claude/memory/steering/test-strategy.md
  mv memory/steering/team-practices.md .claude/memory/steering/team-practices.md
  rmdir memory/steering memory/
  ```

- [ ] **T008** Verify AC-1.1: Given migration complete When `ls memory/` is run Then directory not found — run:
  ```bash
  ls .claude/memory/
  # expect: foundation.md  MEMORY.md  feedback_follow_sdd_workflow.md  feedback_release_process.md  project_constitution_format.md  steering
  ls memory/ 2>&1
  # expect: ls: memory/: No such file or directory (or equivalent)
  ```

- [ ] **T009** Write `.claude/CLAUDE.md` (Satisfies AC-1.4):
  ```bash
  cat > .claude/CLAUDE.md << 'EOF'
  <!-- sdd-init: generated -->
  # SDD Superpowers

  Before starting work, invoke `sdd-superpowers:sdd-workflow`.

  ## Memory

  Memory lives in `.claude/memory/` — see `.claude/memory/MEMORY.md` for the index.
  Project identity is in `.claude/memory/foundation.md`.
  Steering files in `.claude/memory/steering/` are loaded by skills when relevant.

  ## Hard Gates

  - NO PLAN without an approved spec
  - NO TASKS without a plan
  - NO CODE without a prior failing test
  - NO COMPLETION CLAIM without fresh verification evidence
  EOF
  ```

- [ ] **T010** Delete root `CLAUDE.md` and verify AC-1.3:
  ```bash
  rm CLAUDE.md
  ls CLAUDE.md 2>&1
  # expect: ls: CLAUDE.md: No such file or directory
  cat .claude/CLAUDE.md | grep "memory"
  # expect: lines containing .claude/memory/ (no bare memory/ references)
  ```

- [ ] **T011** Update `.claude/memory/foundation.md` — change the Operational Context steering path:
  Find: `Steering files in \`memory/steering/\` carry project-specific operational context`
  Replace with: `Steering files in \`.claude/memory/steering/\` carry project-specific operational context`

- [ ] **T012** Update `.claude/memory/MEMORY.md` — fix the index entry that references the old path:
  Find: `memory/foundation.md is the Tier 0 project identity file`
  Replace with: `.claude/memory/foundation.md is the Tier 0 project identity file`

- [ ] **T013** Update `.claude/memory/project_constitution_format.md` — replace all `memory/` path references with `.claude/memory/`:
  - In `description:` field: `memory/foundation.md` → `.claude/memory/foundation.md`
  - In body: every occurrence of `` `memory/foundation.md` `` → `` `.claude/memory/foundation.md` ``
  - In body: every occurrence of `memory/MEMORY.md` → `.claude/memory/MEMORY.md`
  - In body: every occurrence of `written to \`memory/\`` → `written to \`.claude/memory/\``
  - In body: `memory/foundation.md`, `memory/steering/*.md` in whitelist description → `.claude/memory/` equivalents

- [ ] **T014** Update `.claude/memory/steering/conventions.md` — replace the Directory Structure block:
  Find:
  ```
  memory/         # Tier 2 memory entries + MEMORY.md index
  memory/steering/ # Tier 1 operational context files
  ```
  Replace with:
  ```
  .claude/memory/          # Tier 2 memory entries + MEMORY.md index
  .claude/memory/steering/ # Tier 1 operational context files
  ```

- [ ] **T015** Commit:
  ```bash
  git add .claude/CLAUDE.md .claude/memory/ CLAUDE.md
  git commit -m "feat(017-memory-relocation-claude-dir): move memory/ to .claude/memory/ and migrate CLAUDE.md"
  ```

---

## Sequential: Phase 2 — Hook Script Updates

*Complete Phase 1 before starting this phase.*

- [ ] **T016** Edit `scripts/hooks/session-start.sh` — replace the two memory file conditional blocks:

  Find:
  ```bash
  if [ -f "${CWD}/memory/foundation.md" ]; then
    append_section "memory/foundation.md" "$(cat "${CWD}/memory/foundation.md")"
  fi

  if [ -f "${CWD}/memory/MEMORY.md" ]; then
    append_section "memory/MEMORY.md" "$(cat "${CWD}/memory/MEMORY.md")"
  fi
  ```
  Replace with:
  ```bash
  if [ -f "${CWD}/.claude/memory/foundation.md" ]; then
    append_section ".claude/memory/foundation.md" "$(cat "${CWD}/.claude/memory/foundation.md")"
  fi

  if [ -f "${CWD}/.claude/memory/MEMORY.md" ]; then
    append_section ".claude/memory/MEMORY.md" "$(cat "${CWD}/.claude/memory/MEMORY.md")"
  fi
  ```

- [ ] **T017** Verify AC-2.1 and AC-2.2 — run `bash tests/hooks/test_session_start.sh` — expect: ALL PASS

- [ ] **T018** Edit `scripts/hooks/post-write-memory-validate.sh` — update path-matching gate (lines 15–20):

  Find:
  ```bash
  case "$FILE_PATH" in
    */memory/*.md) ;;
    *) exit 0 ;;
  esac

  case "$FILE_PATH" in
    */memory/foundation.md|*/memory/MEMORY.md|*/memory/steering/*.md) exit 0 ;;
  esac
  ```
  Replace with:
  ```bash
  case "$FILE_PATH" in
    */.claude/memory/*.md) ;;
    *) exit 0 ;;
  esac

  case "$FILE_PATH" in
    */.claude/memory/foundation.md|*/.claude/memory/MEMORY.md|*/.claude/memory/steering/*.md) exit 0 ;;
  esac
  ```

- [ ] **T019** Edit `scripts/hooks/post-write-memory-validate.sh` — update FNAME error messages:

  Find:
  ```bash
    add_issue "memory/${FNAME} is missing the 'name' field in frontmatter"
  ```
  Replace with:
  ```bash
    add_issue ".claude/memory/${FNAME} is missing the 'name' field in frontmatter"
  ```
  Find:
  ```bash
    add_issue "memory/${FNAME} is missing the 'description' field in frontmatter"
  ```
  Replace with:
  ```bash
    add_issue ".claude/memory/${FNAME} is missing the 'description' field in frontmatter"
  ```
  Find:
  ```bash
    add_issue "memory/${FNAME} is missing the 'metadata.type' field in frontmatter (under metadata:)"
  ```
  Replace with:
  ```bash
    add_issue ".claude/memory/${FNAME} is missing the 'metadata.type' field in frontmatter (under metadata:)"
  ```

- [ ] **T020** Edit `scripts/hooks/post-write-memory-validate.sh` — update MEMORY.md path checks:

  Find:
  ```bash
    if [ ! -f "${CWD}/memory/MEMORY.md" ]; then
      add_issue "memory/MEMORY.md does not exist. Create it and add: '- [Title]($(basename "$FILE_PATH")) — description'"
    elif ! grep -q "$NAME_SLUG" "${CWD}/memory/MEMORY.md"; then
      add_issue "Name slug '${NAME_SLUG}' not found in memory/MEMORY.md. Add: '- [Title]($(basename "$FILE_PATH")) — one-line description'"
    fi
  ```
  Replace with:
  ```bash
    if [ ! -f "${CWD}/.claude/memory/MEMORY.md" ]; then
      add_issue ".claude/memory/MEMORY.md does not exist. Create it and add: '- [Title]($(basename "$FILE_PATH")) — description'"
    elif ! grep -q "$NAME_SLUG" "${CWD}/.claude/memory/MEMORY.md"; then
      add_issue "Name slug '${NAME_SLUG}' not found in .claude/memory/MEMORY.md. Add: '- [Title]($(basename "$FILE_PATH")) — one-line description'"
    fi
  ```

- [ ] **T021** Verify AC-3.1, AC-3.2, AC-3.3 — run `bash tests/hooks/test_post_write_memory_validate.sh` — expect: ALL PASS

- [ ] **T022** Edit `scripts/hooks/stop.sh` — update user-facing memory message:

  Find: `feedback to memory/ files now`
  Replace with: `feedback to .claude/memory/ files now`

- [ ] **T023** Run full test suite — `bash tests/hooks/run_all.sh` — expect: ALL suites PASS

- [ ] **T024** Commit:
  ```bash
  git add scripts/hooks/session-start.sh scripts/hooks/post-write-memory-validate.sh scripts/hooks/stop.sh
  git commit -m "feat(017-memory-relocation-claude-dir): update hook scripts to use .claude/memory/ paths"
  ```

---

## Parallel Group 1: Skill Prose Updates (FR-4) — 5 Independent Files

*Complete Phase 2 before starting this group. Tasks T025–T029 touch different files.*

- [ ] **T025** `[P]` Edit `skills/sdd-specify/reference.md` — replace `memory/steering/` with `.claude/memory/steering/` (use replace_all):
  - Step 0 instruction line 1: `Scan \`memory/steering/\`` → `Scan \`.claude/memory/steering/\``
  - Step 0 instruction line 2: `If \`memory/steering/\` does not exist` → `If \`.claude/memory/steering/\` does not exist`

- [ ] **T026** `[P]` Edit `skills/sdd-plan/reference.md` — same two replacements as T025 in the Step 0 section.

- [ ] **T027** `[P]` Edit `skills/sdd-review/reference.md` — same two replacements as T025 in the Step 0 section.

- [ ] **T028** `[P]` Edit `skills/sdd-research/reference.md` — same two replacements as T025 in the Step 0 section.

- [ ] **T029** `[P]` Edit `skills/sdd-execute/reference.md` — replace all `memory/` occurrences with `.claude/memory/`.

- [ ] **T030** Verify T025–T029 — run:
  ```bash
  grep "memory/" skills/sdd-specify/reference.md skills/sdd-plan/reference.md skills/sdd-review/reference.md skills/sdd-research/reference.md skills/sdd-execute/reference.md
  # expect: no output
  ```

- [ ] **T031** Commit:
  ```bash
  git add skills/sdd-specify/reference.md skills/sdd-plan/reference.md skills/sdd-review/reference.md skills/sdd-research/reference.md skills/sdd-execute/reference.md
  git commit -m "docs(017-memory-relocation-claude-dir): update skill prose paths in sdd-specify, sdd-plan, sdd-review, sdd-research, sdd-execute"
  ```

---

## Parallel Group 2: sdd-init Skill and Template Files

*Complete Phase 2 before starting this group. T032–T033 touch different files.*

- [ ] **T032** `[P]` Edit `skills/sdd-init/SKILL.md` — replace all `memory/` occurrences with `.claude/memory/` (artifact table rows and step descriptions, use replace_all).

- [ ] **T033** `[P]` Edit `skills/sdd-init/templates/claude-md.md` — replace all `memory/` occurrences with `.claude/memory/` (3 occurrences in the Memory section).

- [ ] **T034** Verify T032–T033:
  ```bash
  grep "memory/" skills/sdd-init/SKILL.md skills/sdd-init/templates/claude-md.md
  # expect: no output
  ```

- [ ] **T035** Commit:
  ```bash
  git add skills/sdd-init/SKILL.md skills/sdd-init/templates/claude-md.md
  git commit -m "docs(017-memory-relocation-claude-dir): update sdd-init SKILL.md and claude-md template"
  ```

---

## Sequential: Phase 4 — sdd-init Reference (FR-5)

*Complete Parallel Groups 1 and 2 before starting this phase.*

- [ ] **T036** Edit `skills/sdd-init/reference.md` — replace `memory/foundation.md` with `.claude/memory/foundation.md` (use replace_all).

- [ ] **T037** Edit `skills/sdd-init/reference.md` — replace `memory/constitution.md` with `.claude/memory/constitution.md` (use replace_all).

- [ ] **T038** Edit `skills/sdd-init/reference.md` — replace `memory/steering/` with `.claude/memory/steering/` (use replace_all).

- [ ] **T039** Edit `skills/sdd-init/reference.md` — replace `memory/MEMORY.md` with `.claude/memory/MEMORY.md` (use replace_all).

- [ ] **T040** Edit `skills/sdd-init/reference.md` — replace remaining `memory/` occurrences with `.claude/memory/` (use replace_all). Verify by running:
  ```bash
  grep "memory/" skills/sdd-init/reference.md
  # expect: no output
  ```

- [ ] **T041** Add legacy-detection error scenario to `skills/sdd-init/reference.md` detection logic section. Add after the existing `memory/constitution.md` detection block:
  ```
  - **If `memory/foundation.md` exists at project root (legacy layout):**
    Announce: "A `memory/foundation.md` was found at the old location. Migrate it to `.claude/memory/foundation.md` before re-invoking sdd-init: `mkdir -p .claude/memory && mv memory/ .claude/`. No files will be written."
    Exit — do not write any files.
  ```

- [ ] **T042** Verify T036–T041:
  ```bash
  grep -r "memory/" skills/sdd-init/
  # expect: no output
  ```

- [ ] **T043** Commit:
  ```bash
  git add skills/sdd-init/reference.md
  git commit -m "feat(017-memory-relocation-claude-dir): update sdd-init reference to generate .claude/ layout and detect legacy memory/"
  ```

---

## Sequential: Phase 5 — Integration Verification

*All prior phases must be complete.*

- [ ] **T044** Verify AC-4.1 and AC-4.2 — zero skill prose references remain:
  ```bash
  grep -r "memory/" skills/
  # expect: no output
  ```

- [ ] **T045** Verify AC-4.1 and AC-4.2 — zero hook script references remain:
  ```bash
  grep -r "memory/" scripts/hooks/
  # expect: no output
  ```

- [ ] **T046** Verify AC-1.1 — file structure:
  ```bash
  ls .claude/memory/
  # expect: foundation.md  MEMORY.md  feedback_follow_sdd_workflow.md  feedback_release_process.md  project_constitution_format.md  steering
  ls .claude/memory/steering/
  # expect: conventions.md  tech-stack.md  test-strategy.md  team-practices.md
  ls memory/ 2>&1 | grep -q "No such" && echo "PASS: memory/ gone" || echo "FAIL"
  ls CLAUDE.md 2>&1 | grep -q "No such" && echo "PASS: root CLAUDE.md gone" || echo "FAIL"
  ```

- [ ] **T047** Verify AC-1.4 — `.claude/CLAUDE.md` content has no bare `memory/` references:
  ```bash
  grep "memory/" .claude/CLAUDE.md
  # expect: no output (all references are .claude/memory/)
  grep ".claude/memory/" .claude/CLAUDE.md
  # expect: 3 lines (MEMORY.md, foundation.md, steering/)
  ```

- [ ] **T048** Run full test suite — verify AC-2.1, AC-2.2, AC-3.1, AC-3.2, AC-3.3:
  ```bash
  bash tests/hooks/run_all.sh
  # expect: all suites PASS, zero failures
  ```

- [ ] **T049** Run session-start smoke test — verify AC-2.1 end-to-end:
  ```bash
  TMP=$(mktemp -d)
  mkdir -p "$TMP/docs/specs" "$TMP/.claude/memory"
  echo "# Test Foundation" > "$TMP/.claude/memory/foundation.md"
  echo "- entry" > "$TMP/.claude/memory/MEMORY.md"
  INPUT=$(jq -n --arg cwd "$TMP" '{"hook_event_name":"SessionStart","session_id":"t","cwd":$cwd}')
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$(pwd)" bash scripts/hooks/session-start.sh <<< "$INPUT")
  echo "$OUTPUT" | grep -q "Test Foundation" && echo "PASS: foundation injected" || echo "FAIL: foundation not injected"
  rm -rf "$TMP"
  # expect: PASS: foundation injected
  ```

- [ ] **T050** Final commit:
  ```bash
  git add -A
  git commit -m "feat(017-memory-relocation-claude-dir): complete memory relocation to .claude/"
  ```

---

## Task Summary

| Range | Phase | Can Parallelize? | Spec ACs Covered |
|-------|-------|-----------------|-----------------|
| T001–T006 | Parallel Group 0: Write Failing Tests | T001–T003 parallel | AC-2.1, AC-2.2, AC-3.1, AC-3.2, AC-3.3 (RED) |
| T007–T015 | Phase 1: File Migration | No | AC-1.1, AC-1.2, AC-1.3, AC-1.4 |
| T016–T024 | Phase 2: Hook Script Updates | No | AC-2.1, AC-2.2, AC-3.1, AC-3.2, AC-3.3 (GREEN) |
| T025–T031 | Parallel Group 1: Skill Prose (5 files) | T025–T029 parallel | AC-4.1, AC-4.2, AC-4.3 |
| T032–T035 | Parallel Group 2: sdd-init Skill + Template | T032–T033 parallel | AC-5.3 |
| T036–T043 | Phase 4: sdd-init Reference | No | AC-5.1, AC-5.2, AC-5.4 |
| T044–T050 | Phase 5: Integration Verification | No | All ACs verified |

**Total tasks:** 50
**Parallelizable tasks:** T001–T003, T025–T029, T032–T033 (10 tasks across 3 parallel groups)
**Estimated parallel speedup:** ~1.3× on the critical path
