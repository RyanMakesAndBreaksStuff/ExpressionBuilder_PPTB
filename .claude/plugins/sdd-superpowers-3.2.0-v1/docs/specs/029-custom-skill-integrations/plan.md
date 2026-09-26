# Implementation Plan: Custom Skill Integrations for the SDD Workflow

**Spec:** docs/specs/029-custom-skill-integrations/spec.md
**Decisions:** docs/adr/029-custom-skill-integration-architecture.md
**Created:** 2026-08-16

## Context

Users of the sdd-superpowers plugin often already have their own custom Claude Code skills for adjacent tools (Jira, Confluence, etc.), but nothing in the SDD workflow knows when to invoke them — there's no registration point and no mechanical reminder. This plan implements the design already approved in `prd.md`/ADR-029/`spec.md`: a plain-markdown manifest (`.claude/integrations.md`), a new on-demand `sdd-integrations` skill to populate it, a `PostToolUse` hook on the `Skill` tool that detects a match and surfaces it, and one new confirm-then-invoke rule in `sdd-workflow.md`. No existing SDD skill file is modified to add integration-awareness — that was a deliberate ADR decision to avoid duplicating detection logic across ~7 files.

Existing patterns being reused (all found in this repo):
- Hook shape: `scripts/hooks/subagent-start.sh` and `scripts/hooks/session-start.sh` — `INPUT=$(cat)` → `jq` parse → `detect_sdd_project` gate → build `additionalContext` → `jq -n` emit. `scripts/hooks/lib/detect-active-spec.sh` provides `detect_sdd_project`.
- Hook test shape: `tests/hooks/test_subagent_start.sh` / `tests/hooks/test_post_write_memory_validate.sh` — build the hook-event JSON inline with `jq -n` (no separate fixture file needed for this style), `mktemp -d`, `source helpers.sh`, `assert_*` helpers, `summarize` at the end.
- Skill-file structural rules enforced by `tests/016-verify-skill-structure.sh`: frontmatter, `<examples>` block, `## Constraints` before `## Error Handling`, and the literal string "User requests gate bypass" inside Error Handling. This script's final success line is a **hardcoded** `"All 19 skills pass structural validation."` string — adding a 20th skill means this must become dynamic (bug fix, in scope).
- `sdd-init`'s existing steering-file scaffolding block (`skills/sdd-init/reference.md`, ~line 397-410) is the precedent for adding one more scaffolded file.

## Global Constraints

- Manifest lives at `.claude/integrations.md`, a GFM table with exactly 3 columns in order: `Trigger Skill | Custom Skill | Purpose` — no other format (spec FR-1).
- New hook `post-skill-integration-check.sh` registered as `PostToolUse`, matcher `"Skill"`, `timeout: 10` (yaml-config.md context-hook convention, matching `session-start.sh`/`subagent-start.sh`).
- All hook scripts: `#!/usr/bin/env bash` + `set -euo pipefail`, `INPUT=$(cat)` then `jq`, `detect_sdd_project` as first substantive action, quoted variables, `$()` not backticks (bash-scripting.md, hook-scripts.md).
- Never invoke a custom skill without explicit user confirmation; a failed/missing custom-skill invocation must never block the SDD workflow (spec FR-4, FR-5).
- Every new/edited `SKILL.md` must keep passing `tests/016-verify-skill-structure.sh`.
- No existing SDD skill file (`sdd-specify`, `sdd-plan`, `sdd-execute`, `sdd-review`, `sdd-brainstorm`, `finishing-a-development-branch`, `session-wrap`) is modified — detection lives only in the new hook + `sdd-workflow.md` (ADR-029 decision).

---

## Goal

A user can register `Trigger Skill → Custom Skill` mappings via a new `sdd-integrations` skill; when the trigger skill later completes in a real session, a hook detects the match and the agent announces + confirms + invokes the custom skill — with zero behavior change for any project that has no manifest or no matching rows.

---

## Phase 0: Contracts and Tests First — Detection Hook

**Implements:** FR-3 | **Satisfies:** AC-2.1, AC-2.5, AC-3.1, Reliability NFR (malformed row), negative-path (non-SDD project)
**Files:** `tests/hooks/test_post_skill_integration_check.sh`
**Interfaces:** Consumes: nothing (Phase 0). Produces: the test contract that `scripts/hooks/post-skill-integration-check.sh` (Phase 1) must satisfy — a `PostToolUse` hook script at that exact path, taking the JSON shape built by `make_input()` below on stdin.

Lock down the hook's expected behavior before it exists: silent when no manifest/no match, emits `additionalContext` naming every matching row when trigger matches, tolerates a malformed row without crashing, and no-ops outside an SDD project.

- [ ] Write `tests/hooks/test_post_skill_integration_check.sh`:
  ```bash
  #!/usr/bin/env bash
  set -uo pipefail  # intentionally omits -e: tests call commands that return non-zero
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  source "$SCRIPT_DIR/helpers.sh"
  PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
  SCRIPT="$PLUGIN_ROOT/scripts/hooks/post-skill-integration-check.sh"

  echo "--- test_post_skill_integration_check.sh ---"

  TMP=$(mktemp -d)
  mkdir -p "$TMP/docs/specs" "$TMP/.claude"

  make_input() {
    jq -n --arg cwd "$1" --arg skill "$2" \
      '{"hook_event_name":"PostToolUse","session_id":"t1","cwd":$cwd,
        "tool_name":"Skill","tool_input":{"skill_name":$skill}}'
  }

  # AC-2.5: silent when no manifest file exists
  INPUT=$(make_input "$TMP" "sdd-specify")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "AC-2.5: silent when .claude/integrations.md missing"

  # AC-2.5 / AC-5.2: silent when manifest has zero data rows (scaffolded empty manifest)
  cat > "$TMP/.claude/integrations.md" <<'EOF'
  # Custom Integrations

  | Trigger Skill | Custom Skill | Purpose |
  |---|---|---|
  EOF
  INPUT=$(make_input "$TMP" "sdd-specify")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "AC-2.5: silent when manifest has zero data rows"

  # AC-2.1: one matching row surfaces the custom skill and purpose
  cat > "$TMP/.claude/integrations.md" <<'EOF'
  # Custom Integrations

  | Trigger Skill | Custom Skill | Purpose |
  |---|---|---|
  | sdd-specify | jira-ticket | Create a Jira ticket for the new feature spec |
  EOF
  INPUT=$(make_input "$TMP" "sdd-specify")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_contains "$OUTPUT" "jira-ticket" "AC-2.1: matched custom skill name in context"
  assert_contains "$OUTPUT" "Create a Jira ticket for the new feature spec" "AC-2.1: matched purpose in context"
  assert_json_field "$OUTPUT" ".hookSpecificOutput.hookEventName" "PostToolUse" "AC-2.1: correct hookEventName"

  # AC-2.5: silent when Trigger Skill doesn't match the completed skill
  INPUT=$(make_input "$TMP" "sdd-plan")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "AC-2.5: silent when no Trigger Skill row matches"

  # AC-3.1: multiple rows sharing the same Trigger Skill are all surfaced
  cat > "$TMP/.claude/integrations.md" <<'EOF'
  # Custom Integrations

  | Trigger Skill | Custom Skill | Purpose |
  |---|---|---|
  | sdd-review | confluence-update | Update the Confluence page with review outcomes |
  | sdd-review | notify-team | Post a summary to the team channel |
  EOF
  INPUT=$(make_input "$TMP" "sdd-review")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_contains "$OUTPUT" "confluence-update" "AC-3.1: first matching skill surfaced"
  assert_contains "$OUTPUT" "notify-team" "AC-3.1: second matching skill surfaced"

  # Reliability: malformed row (missing a column) is skipped without crashing; well-formed row still matches
  cat > "$TMP/.claude/integrations.md" <<'EOF'
  # Custom Integrations

  | Trigger Skill | Custom Skill | Purpose |
  |---|---|---|
  | sdd-execute | broken-row |
  | sdd-execute | deploy-notify | Notify ops channel after implementation |
  EOF
  INPUT=$(make_input "$TMP" "sdd-execute")
  EXIT_CODE=0
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT") || EXIT_CODE=$?
  assert_exit_zero "$EXIT_CODE" "Reliability: malformed row does not crash the hook"
  assert_contains "$OUTPUT" "deploy-notify" "Reliability: well-formed row still matches despite malformed sibling"

  # Negative path: silent outside an SDD project (no docs/specs/)
  TMP_NON_SDD=$(mktemp -d)
  mkdir -p "$TMP_NON_SDD/.claude"
  cat > "$TMP_NON_SDD/.claude/integrations.md" <<'EOF'
  # Custom Integrations

  | Trigger Skill | Custom Skill | Purpose |
  |---|---|---|
  | sdd-specify | jira-ticket | Create a Jira ticket |
  EOF
  INPUT=$(make_input "$TMP_NON_SDD" "sdd-specify")
  OUTPUT=$(CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" bash "$SCRIPT" <<< "$INPUT")
  assert_empty "$OUTPUT" "Negative path: silent outside an SDD project (no docs/specs/)"

  rm -rf "$TMP" "$TMP_NON_SDD"
  summarize
  ```
  (Note: the here-docs above are shown indented for readability in this plan; write them at column 0 in the actual file so the `<<'EOF'` delimiters match exactly.)
- [ ] Run: `bash tests/hooks/test_post_skill_integration_check.sh` — expect: FAIL (`scripts/hooks/post-skill-integration-check.sh: No such file or directory`)
- [ ] Commit: `test: add tests for post-skill-integration-check hook`

---

## Phase 1: Detection Hook Implementation

**Implements:** FR-1, FR-3 | **Satisfies:** AC-2.1, AC-2.5, AC-3.1, Reliability NFR, Performance NFR
**Files:** `scripts/hooks/post-skill-integration-check.sh`, `hooks/hooks.json`
**Interfaces:** Consumes: `detect_sdd_project` from `scripts/hooks/lib/detect-active-spec.sh` (already exists). Produces: the `post-skill-integration-check.sh` script itself, registered in `hooks.json` under `PostToolUse` matcher `"Skill"`.

Make Phase 0's tests pass: read which skill just completed, match it against the manifest, emit one combined `additionalContext` block for all matches, and stay silent otherwise.

- [ ] Implement `scripts/hooks/post-skill-integration-check.sh`:
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail

  INPUT=$(cat)
  CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
  CWD="${CWD:-$PWD}"

  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  source "${SCRIPT_DIR}/lib/detect-active-spec.sh"

  detect_sdd_project "$CWD" || exit 0

  SKILL_NAME=$(echo "$INPUT" | jq -r '.tool_input.skill_name // empty')
  [[ -n "$SKILL_NAME" ]] || exit 0

  MANIFEST="${CWD}/.claude/integrations.md"
  [[ -f "$MANIFEST" ]] || exit 0

  MATCHES=$(awk -F'|' -v skill="$SKILL_NAME" '
    /^\|/ {
      col1=$2; gsub(/^[ \t]+|[ \t]+$/, "", col1)
      if (col1 == "" || col1 == "Trigger Skill" || col1 ~ /^-+$/) next
      if (NF < 5) next
      col2=$3; gsub(/^[ \t]+|[ \t]+$/, "", col2)
      col3=$4; gsub(/^[ \t]+|[ \t]+$/, "", col3)
      if (col1 == skill) print col2 "\t" col3
    }
  ' "$MANIFEST")

  [[ -n "$MATCHES" ]] || exit 0

  CONTEXT="Custom integration(s) registered for '${SKILL_NAME}' in .claude/integrations.md — announce and confirm with the user before invoking each one, individually:
  "
  while IFS=$'\t' read -r custom_skill purpose; do
    CONTEXT="${CONTEXT}
  - Skill: ${custom_skill} — Purpose: ${purpose}"
  done <<< "$MATCHES"

  jq -n --arg ctx "$CONTEXT" '{
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: $ctx
    }
  }'
  ```
- [ ] Edit `hooks/hooks.json`: add a new matcher entry to the existing `PostToolUse` array (sibling of the `"Write"` matcher entry):
  ```json
  {
    "matcher": "Skill",
    "hooks": [
      {
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/post-skill-integration-check.sh",
        "timeout": 10
      }
    ]
  }
  ```
- [ ] Run: `jq . hooks/hooks.json` — expect: valid JSON printed, no error
- [ ] Run: `bash tests/hooks/test_post_skill_integration_check.sh` — expect: `Results: 8 passed, 0 failed`
- [ ] Commit: `feat: add post-skill-integration-check hook for custom skill integrations`

---

## Phase 2: Confirm-then-Invoke Rule in sdd-workflow

**Implements:** FR-4, FR-5 | **Satisfies:** AC-2.2, AC-2.3, AC-2.4, AC-3.2, AC-4.1
**Files:** `skills/sdd-workflow/SKILL.md`
**Interfaces:** Consumes: the `additionalContext` text produced by Phase 1's hook (read by the agent at runtime, not a code interface). Produces: nothing consumed by a later phase — this is the terminal behavioral rule.

Teach the router skill to act on the hook's injected context: announce, confirm, invoke each match individually; never block on decline or failure.

- [ ] Run: `grep -c "Custom Skill Integrations" skills/sdd-workflow/SKILL.md` — expect: `0` (or command errors/no match — section doesn't exist yet)
- [ ] Edit `skills/sdd-workflow/SKILL.md`: add a row to the existing Quick Reference table (after the `session-wrap` row):
  ```markdown
  | User wants to connect/register a custom skill to the workflow | `sdd-superpowers:sdd-integrations` |
  ```
- [ ] Edit `skills/sdd-workflow/SKILL.md`: insert a new section after `## Common Mistakes` (before the `Full routing rules...` line and `## Constraints`):
  ```markdown
  ## Custom Skill Integrations

  If a completed skill's tool result carries `additionalContext` naming a registered custom skill integration (from `.claude/integrations.md`, surfaced via the `post-skill-integration-check.sh` hook), announce it and ask the user to confirm before invoking that skill — one skill, one confirmation, one invocation at a time, even when multiple integrations matched the same trigger. Declining a confirmation never blocks the SDD workflow; continue normally. If the named skill fails to invoke (e.g. no longer installed), report the failure to the user and continue — this is never a gate.
  ```
- [ ] Run: `grep -c "Custom Skill Integrations" skills/sdd-workflow/SKILL.md` — expect: `1`
- [ ] Run: `bash tests/016-verify-skill-structure.sh` — expect: `All 19 skills pass structural validation.` (sdd-workflow still passes: `<examples>`, `## Constraints`, `## Error Handling` order unaffected by the new section, which sits before both)
- [ ] Commit: `feat: add confirm-then-invoke rule for custom skill integrations to sdd-workflow`

---

## Phase 3: sdd-integrations Registration Skill

**Implements:** FR-1, FR-2 | **Satisfies:** AC-1.1, AC-1.2, AC-1.3, AC-1.4, AC-1.5
**Files:** `skills/sdd-integrations/SKILL.md`, `tests/016-verify-skill-structure.sh`
**Interfaces:** Consumes: nothing from earlier phases (the manifest format from Phase 1's Global Constraints). Produces: `sdd-superpowers:sdd-integrations`, the skill name referenced by Phase 2's new Quick Reference row.

Add the on-demand registration skill, and fix the structural linter's hardcoded skill count so it no longer silently drifts as skills are added.

- [ ] Run: `[ -d skills/sdd-integrations ] && echo EXISTS || echo MISSING` — expect: `MISSING`
- [ ] Create `skills/sdd-integrations/SKILL.md`:
  ```markdown
  ---
  name: sdd-integrations
  description: Use when a user wants to connect their own custom Claude Code skill (e.g. a Jira or Confluence skill) to a point in the SDD lifecycle, or asks what custom skill integrations are registered
  ---

  # SDD Integrations

  ## Overview

  <examples>
  <example>
  <context>User says "I have a jira-ticket skill, can you wire it up so it runs after sdd-specify?"</context>
  <correct>Invoke sdd-integrations. Scan installed custom skills, confirm jira-ticket as a candidate, recommend sdd-specify as the trigger (or let the user pick), and append the confirmed row to .claude/integrations.md.</correct>
  <incorrect>Manually append a row to .claude/integrations.md without scanning for the skill or confirming the trigger point with the user — skips the candidate discovery and recommendation this skill exists to provide.</incorrect>
  </example>
  </examples>

  Registers a user's custom skill against an SDD lifecycle skill name in `.claude/integrations.md`, so the workflow can later detect when that lifecycle skill completes and offer to invoke the custom skill. On-demand only — never runs automatically.

  ## When to Use

  - User wants to connect a custom skill (Jira, Confluence, etc.) to the SDD workflow
  - User asks what integrations are currently registered
  - NOT triggered automatically — this skill is never invoked by a hook or another SDD skill

  ## Quick Reference

  | Step | Action |
  |------|--------|
  | 1 | Scan `~/.claude/skills/` and the project's `.claude/skills/` for candidate skills |
  | 2 | Exclude candidates already registered in `.claude/integrations.md`, and skills bundled with sdd-superpowers itself (`skills/` in this plugin) |
  | 3 | For each remaining candidate, read its `SKILL.md` frontmatter `description` |
  | 4 | Recommend a trigger point from signals in the description (ticket/issue words → `sdd-specify` or `sdd-review`; doc/wiki words → `sdd-review` or `finishing-a-development-branch`); ask the user to confirm or choose a different SDD skill name |
  | 5 | Append the confirmed row to `.claude/integrations.md` (create the file, matching the `sdd-init` scaffold, if it doesn't exist yet) |
  | 6 | Report what was registered |

  ## Manifest Format

  `.claude/integrations.md` is a GFM table with exactly three columns, in this order: `Trigger Skill` \| `Custom Skill` \| `Purpose`. This skill only appends rows — it never edits or removes an existing one. Users may hand-edit or delete rows directly since it's plain markdown.

  ## Constraints

  - Does NOT register a candidate skill without the user's explicit confirmation of the trigger point
  - Does NOT modify or remove any existing row in `.claude/integrations.md`
  - Does NOT validate that the chosen trigger-skill name matches a real SDD skill — a typo is accepted as-is and simply never matches at detection time
  - Does NOT run automatically — only invoked on direct user request

  ## Error Handling

  - **No candidate skills found** (everything is already registered or bundled): report that there is nothing new to register; do not modify the manifest.
  - **`.claude/integrations.md` does not exist yet**: create it with the standard header row before appending the first registration.
  - **User requests gate bypass**: there is no gate to bypass — registration always requires the user's explicit confirmation by design; explain that this is what makes later automatic detection safe.
  ```
- [ ] Run: `[ -f skills/sdd-integrations/SKILL.md ] && echo EXISTS || echo MISSING` — expect: `EXISTS`
- [ ] Edit `tests/016-verify-skill-structure.sh`: replace the hardcoded success message with a dynamic count so it stops drifting as skills are added. Add a counter, increment it once per validated skill directory (inside the existing `for skill_dir in "$SKILLS_DIR"/*/; do ... done` loop, right after the `[ -f "$skill_file" ] || continue` check), and use it in the final message:
  ```bash
  SKILL_COUNT=0
  ```
  (add near the top, alongside `ERRORS=0`)
  ```bash
  SKILL_COUNT=$((SKILL_COUNT + 1))
  ```
  (add immediately after `if [ ! -f "$skill_file" ]; then continue; fi`)
  ```bash
  if [ "$ERRORS" -gt 0 ]; then
    echo ""
    echo "TOTAL: $ERRORS failure(s)"
    exit 1
  else
    echo "All $SKILL_COUNT skills pass structural validation."
  fi
  ```
  (replaces the existing hardcoded `if/else` block at the end of the file)
- [ ] Run: `bash tests/016-verify-skill-structure.sh` — expect: `All 20 skills pass structural validation.`
- [ ] Commit: `feat: add sdd-integrations skill for registering custom skill integrations`

---

## Phase 4: sdd-init Scaffolding

**Implements:** FR-1, FR-6 | **Satisfies:** AC-5.1, AC-5.2
**Files:** `skills/sdd-init/reference.md`, `skills/sdd-init/SKILL.md`
**Interfaces:** Consumes: the exact 3-column manifest header from Phase 1's Global Constraints. Produces: nothing consumed by a later phase.

Have `sdd-init` scaffold an empty manifest alongside the steering files it already writes, using the same header row Phase 1's hook and Phase 3's skill both rely on.

- [ ] Run: `grep -c "integrations.md" skills/sdd-init/reference.md` — expect: `0`
- [ ] Edit `skills/sdd-init/reference.md`: in the steering-file-writing section (the block that writes `.claude/memory/steering/tech-stack.md` etc., around the existing "Write all four files" step), add one more file after the four steering files:
  ```markdown
  **`.claude/integrations.md`**

  Write this file verbatim — it starts empty; `sdd-superpowers:sdd-integrations` populates it later, never `sdd-init` itself.

  ```
  # Custom Integrations

  | Trigger Skill | Custom Skill | Purpose |
  |---|---|---|
  ```
  ```
- [ ] Run: `grep -c "integrations.md" skills/sdd-init/reference.md` — expect: `1` (or more)
- [ ] Edit `skills/sdd-init/SKILL.md`: add a row to the existing "Files created by sdd-init" table:
  ```markdown
  | `.claude/integrations.md` | Empty custom-skill-integration manifest — populated later by `sdd-superpowers:sdd-integrations` |
  ```
- [ ] Run: `bash tests/016-verify-skill-structure.sh` — expect: `All 20 skills pass structural validation.`
- [ ] Commit: `feat: scaffold empty .claude/integrations.md in sdd-init`

---

## Phase 5: Integration Verification

**Implements:** All FRs | **Satisfies:** All ACs

- [ ] Run: `bash tests/hooks/run_all.sh` — expect: `TOTAL: <N> files passed, 0 files failed` (no regressions in existing hook tests)
- [ ] Run: `bash tests/016-verify-skill-structure.sh` — expect: `All 20 skills pass structural validation.`
- [ ] Run: `jq . hooks/hooks.json` — expect: valid JSON printed, no error
- [ ] Manually verify against `spec.md`: AC-1.1–1.5 (registration flow reads correctly in `sdd-integrations`), AC-2.1–2.5 and AC-3.1–3.2 (hook test output already covers these mechanically), AC-4.1 and Error Scenarios table (failure handling is prose-only in `sdd-workflow.md` — confirm the wording matches "report the failure... continue"), AC-5.1–5.2 (scaffold template matches the exact 3-column header used by the hook's parser)
- [ ] Commit: `feat: complete custom skill integrations (029)`

---

## Quickstart Validation

1. In a scratch directory, run `sdd-init` (or manually create `docs/specs/` + `.claude/`) and confirm `.claude/integrations.md` exists with the header row and zero data rows.
2. Create a stub custom skill at `.claude/skills/jira-ticket/SKILL.md` with `description: Use when creating or updating a Jira ticket`.
3. Invoke `sdd-superpowers:sdd-integrations` — confirm it lists `jira-ticket` as a candidate, recommends `sdd-specify` (or asks), and appends a row to `.claude/integrations.md` after confirmation.
4. Invoke `sdd-superpowers:sdd-specify` in that project — confirm the agent announces the registered integration and asks to confirm invoking `jira-ticket` before doing so.
5. Decline the confirmation — confirm the SDD workflow continues normally and `jira-ticket` is not invoked.
6. Remove the `jira-ticket` skill directory, repeat step 4, confirm the invocation attempt fails gracefully and is reported to the user without blocking the workflow.
