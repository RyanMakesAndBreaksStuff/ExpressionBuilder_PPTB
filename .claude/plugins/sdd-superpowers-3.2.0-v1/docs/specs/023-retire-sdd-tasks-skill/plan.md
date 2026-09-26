# Implementation Plan: Feature 023 — Retire sdd-tasks Skill Completely

**Spec:** `docs/specs/023-retire-sdd-tasks-skill/spec.md`  
**Status:** Approved

---

## Goal

Remove every live routing surface for the retired `sdd-tasks` skill: tombstone its frontmatter, scrub all peer skill cross-references, delete the two dedicated hook scripts and their tests, deregister those hooks from `hooks.json`, and strip the `tasks.md` context injection from `session-start.sh`.

## Architecture

This is a pure text-surgery change across three layers:

| Layer | Files touched | Change type |
|-------|--------------|-------------|
| Skill routing | `skills/sdd-tasks/SKILL.md` | Frontmatter tombstone |
| Skill prose | 10 files in `skills/` | Reference replacement |
| Hook layer | 2 scripts + 2 test files deleted; `hooks.json` edited; `session-start.sh` edited | Deletion + edit |

No new files are created. No behavior changes to `sdd-execute`, `sdd-plan`, or any hook that stays.

## File Structure

Files **modified**:
- `skills/sdd-tasks/SKILL.md` — description tombstoned
- `skills/sdd-plan/SKILL.md` — handoff updated
- `skills/sdd-plan/reference.md` — next-steps list updated
- `skills/sdd-plan/template.md` — agentic-worker note removed
- `skills/sdd-brainstorm/SKILL.md` — pipeline pipeline updated
- `skills/sdd-brainstorm/reference.md` — no-invoke list updated
- `skills/sdd-spec-update/reference.md` — MAJOR row updated
- `skills/sdd-specify/reference.md` — branch-creation note updated
- `skills/subagent-driven-development/SKILL.md` — sdd-tasks line removed
- `skills/using-git/SKILL.md` — caller attribution updated
- `skills/using-git/reference.md` — caller attribution updated (2 lines)
- `skills/sdd-execute/SKILL.md` — incorrect-action example updated for clarity
- `hooks/hooks.json` — 3 hook entries removed
- `scripts/hooks/session-start.sh` — tasks.md block removed

Files **deleted**:
- `scripts/hooks/pre-write-tasks-gate.sh`
- `scripts/hooks/post-write-tasks-check.sh`
- `tests/hooks/test_pre_write_tasks_gate.sh`
- `tests/hooks/test_post_write_tasks_check.sh`

---

## Phase 1: Tombstone sdd-tasks/SKILL.md

**Implements:** FR-1 | **Satisfies:** AC-1.1, AC-1.2, AC-1.3

### Step 1 — Write failing test

```bash
# Verify the description field currently triggers on routing-relevant text
grep 'description:' skills/sdd-tasks/SKILL.md | grep -q "approved and needs to be broken"
echo "Exit $? — expect 0 (field is still live, test FAILS the desired state)"
```

Expected: exit 0 (the live description exists — confirms we still need to change it).

### Step 2 — Edit frontmatter description

In `skills/sdd-tasks/SKILL.md`, change:

```yaml
description: Use when an implementation plan is approved and needs to be broken down into executable tasks
```

to:

```yaml
description: "Retired — do not use. See sdd-superpowers:sdd-execute."
```

### Step 3 — Verify

```bash
grep 'description:' skills/sdd-tasks/SKILL.md
# Expected output: description: "Retired — do not use. See sdd-superpowers:sdd-execute."
grep 'description:' skills/sdd-tasks/SKILL.md | grep -qv "approved and needs"
echo "Exit $? — expect 0 (old phrase gone)"
```

---

## Phase 2: Update sdd-plan Skill Files

**Implements:** FR-2 | **Satisfies:** AC-2.1, AC-2.2, AC-2.3

### Step 1 — Write failing test

```bash
grep -n "sdd-tasks" skills/sdd-plan/SKILL.md skills/sdd-plan/reference.md skills/sdd-plan/template.md
# Expected: 3 matches found — confirms changes still needed
```

### Step 2 — Update sdd-plan/SKILL.md handoff

Current text (line 93):
```
> "Plan complete. Next: run `sdd-superpowers:sdd-tasks` to generate the executable task list."
```

Replace with:
```
> "Plan complete. Next: run `sdd-superpowers:sdd-execute` to begin implementation."
```

### Step 3 — Update sdd-plan/reference.md next-steps list

Current text (lines 104–107):
```
> **Next steps:**
> 1. Run `sdd-superpowers:sdd-review` (spec mode) to validate plan-spec alignment before execution
> 2. Run `sdd-superpowers:sdd-tasks` to generate a flat, executable task list
> 3. Run `sdd-superpowers:sdd-execute` to implement with subagent dispatch and two-stage review"
```

Replace with:
```
> **Next steps:**
> 1. Run `sdd-superpowers:sdd-review` (spec mode) to validate plan-spec alignment before execution
> 2. Run `sdd-superpowers:sdd-execute` to implement with subagent dispatch and two-stage review"
```

### Step 4 — Update sdd-plan/template.md

Current text (line 3):
```
> **For agentic workers:** Use sdd-tasks to generate an executable task list from this plan.
```

Remove this line entirely (the template note is stale and contradicts the live workflow).

### Step 5 — Verify

```bash
grep "sdd-tasks" skills/sdd-plan/SKILL.md skills/sdd-plan/reference.md skills/sdd-plan/template.md
# Expected: no output
```

---

## Phase 3: Update Peer Skill Files

**Implements:** FR-2 | **Satisfies:** AC-3.1 through AC-3.7

Each step is one file edit. Run the failing check, make the edit, verify.

### Step 1 — sdd-brainstorm/SKILL.md (line 65)

Current:
```
- **User wants to jump straight to implementation**: Stop. Redirect through sdd-specify → sdd-plan → sdd-tasks first; implementation without a spec has no source of truth.
```

Replace with:
```
- **User wants to jump straight to implementation**: Stop. Redirect through sdd-specify → sdd-plan → sdd-execute first; implementation without a spec has no source of truth.
```

### Step 2 — sdd-brainstorm/reference.md (line 57)

Current:
```
**The terminal state is invoking `sdd-superpowers:sdd-specify`.** Do NOT invoke `sdd-superpowers:sdd-plan`, `sdd-superpowers:sdd-tasks`, `sdd-superpowers:sdd-execute`, or any other skill. `sdd-superpowers:sdd-specify` is the only next step.
```

Replace with:
```
**The terminal state is invoking `sdd-superpowers:sdd-specify`.** Do NOT invoke `sdd-superpowers:sdd-plan`, `sdd-superpowers:sdd-execute`, or any other skill. `sdd-superpowers:sdd-specify` is the only next step.
```

### Step 3 — sdd-spec-update/reference.md (line 195)

Current:
```
| MAJOR | Stop current execution; re-run `sdd-superpowers:sdd-plan` for affected phases, then `sdd-superpowers:sdd-tasks` for affected scope, then resume |
```

Replace with:
```
| MAJOR | Stop current execution; re-run `sdd-superpowers:sdd-plan` for affected phases, then `sdd-superpowers:sdd-execute` to resume |
```

### Step 4 — sdd-specify/reference.md (line 116)

Current:
```
Branch creation happens **after all documentation is complete** — at the end of `sdd-superpowers:sdd-tasks`, not here. When `sdd-superpowers:sdd-tasks` finishes generating the task list, it will:
```

Replace with:
```
Branch creation happens **after all documentation is complete** — at the start of `sdd-superpowers:sdd-execute`, not here. When `sdd-superpowers:sdd-execute` begins implementation, it will:
```

### Step 5 — subagent-driven-development/SKILL.md (line 316)

Current:
```
- `sdd-superpowers:sdd-tasks` — creates `tasks.md` when it exists (task-driven mode, backward-compatible)
```

Remove this line entirely. The backward-compat behavior lives inside `sdd-execute`; documenting `sdd-tasks` as a callable skill is incorrect.

### Step 6 — using-git/SKILL.md (lines 35–36)

Current:
```
| A — Branch Creation | `sdd-superpowers:sdd-tasks`, user | 1 |
| B — Doc-First Commit | `sdd-superpowers:sdd-tasks` (after A), user | 2 (ad-hoc) |
```

Replace with:
```
| A — Branch Creation | `sdd-superpowers:sdd-execute`, user | 1 |
| B — Doc-First Commit | `sdd-superpowers:sdd-execute` (after A), user | 2 (ad-hoc) |
```

### Step 7 — using-git/reference.md (lines 50 and 94)

Line 50 — current:
```
**Invoked by:** `sdd-superpowers:sdd-tasks` Step 5, or directly via menu option (1)
```
Replace with:
```
**Invoked by:** `sdd-superpowers:sdd-execute`, or directly via menu option (1)
```

Line 94 — current:
```
**Invoked by:** `sdd-superpowers:sdd-tasks` Step 5 immediately after Operation A
```
Replace with:
```
**Invoked by:** `sdd-superpowers:sdd-execute` immediately after Operation A
```

### Step 8 — sdd-execute/SKILL.md (line 16)

Current (incorrect-action example):
```
<incorrect>Redirect to sdd-tasks — execution derives work units directly from plan.md.</incorrect>
```

The contrast is still useful but naming the retired skill is confusing. Replace with:
```
<incorrect>Generate a tasks.md list before starting — execution derives work units directly from plan.md.</incorrect>
```

### Step 9 — Verify all peer files

```bash
grep -rn "sdd-tasks" skills/ | grep -v "skills/sdd-tasks/"
# Expected: no output
```

---

## Phase 4: Delete Hook Scripts and Test Files

**Implements:** FR-4 | **Satisfies:** AC-4.1, AC-4.2, AC-4.3

### Step 1 — Write failing test

```bash
ls scripts/hooks/pre-write-tasks-gate.sh scripts/hooks/post-write-tasks-check.sh \
   tests/hooks/test_pre_write_tasks_gate.sh tests/hooks/test_post_write_tasks_check.sh
# Expected: all four files listed (they still exist — confirms deletion needed)
```

### Step 2 — Delete the four files

```bash
rm scripts/hooks/pre-write-tasks-gate.sh
rm scripts/hooks/post-write-tasks-check.sh
rm tests/hooks/test_pre_write_tasks_gate.sh
rm tests/hooks/test_post_write_tasks_check.sh
```

### Step 3 — Verify

```bash
ls scripts/hooks/pre-write-tasks-gate.sh 2>&1
# Expected: No such file or directory

ls tests/hooks/test_pre_write_tasks_gate.sh 2>&1
# Expected: No such file or directory
```

---

## Phase 5: Deregister Hooks from hooks.json

**Implements:** FR-5 | **Satisfies:** AC-4.4 (hooks.json valid after removal)

### Step 1 — Write failing test

```bash
grep -c "tasks" hooks/hooks.json
# Expected: 3 (three entries still present)
```

### Step 2 — Edit hooks/hooks.json

Remove the `pre-write-tasks-gate.sh` entry from the `PreToolUse/Write` hooks array (leaving `pre-write-plan-gate.sh` and `pre-write-edit-state.sh` intact).

Remove both `post-write-tasks-check.sh` entries — one from `PostToolUse/Write` and one from `PostToolUse/Edit`.

Result for the affected sections:

```json
"PreToolUse": [
  {
    "matcher": "Write",
    "hooks": [
      {
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/pre-write-plan-gate.sh",
        "timeout": 5
      },
      {
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/pre-write-edit-state.sh",
        "timeout": 5
      }
    ]
  },
  {
    "matcher": "Edit",
    "hooks": [
      {
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/pre-write-edit-state.sh",
        "timeout": 5
      }
    ]
  }
],
"PostToolUse": [
  {
    "matcher": "Write",
    "hooks": [
      {
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/post-write-memory-validate.sh",
        "timeout": 5
      }
    ]
  }
]
```

(The `PostToolUse/Edit` block is removed entirely since it only contained the now-deleted hook.)

### Step 3 — Verify

```bash
jq . hooks/hooks.json > /dev/null && echo "valid JSON"
# Expected: valid JSON

grep "tasks" hooks/hooks.json
# Expected: no output
```

---

## Phase 6: Strip tasks.md Block from session-start.sh

**Implements:** FR-6 | **Satisfies:** AC-4.4 (no tasks.md in hooks), AC-4.5

### Step 1 — Write failing test

```bash
grep -n "tasks.md" scripts/hooks/session-start.sh
# Expected: lines 38–40 found (block still present)
```

### Step 2 — Remove the block

In `scripts/hooks/session-start.sh`, remove lines 38–41:

```bash
if [ -n "$ACTIVE_SPEC_DIR" ] && [ -f "${ACTIVE_SPEC_DIR}/tasks.md" ]; then
  OPEN=$(grep '^- \[ \]' "${ACTIVE_SPEC_DIR}/tasks.md" 2>/dev/null || true)
  [[ -n "$OPEN" ]] && append_section "Open tasks" "$OPEN"
fi
```

All surrounding logic (`detect_active_spec`, the `spec.md` injection above, and the output block below) stays intact.

### Step 3 — Verify

```bash
grep "tasks.md" scripts/hooks/session-start.sh
# Expected: no output

bash -n scripts/hooks/session-start.sh && echo "syntax OK"
# Expected: syntax OK
```

---

## Phase 7: Final Verification

**Implements:** FR-7

### Step 1 — Skill layer clean

```bash
grep -rn "sdd-tasks" skills/ | grep -v "skills/sdd-tasks/"
# Expected: no output
```

### Step 2 — Hook layer clean

```bash
grep -r "tasks\.md" scripts/hooks/
# Expected: no output
```

### Step 3 — hooks.json valid

```bash
jq . hooks/hooks.json > /dev/null && echo "hooks.json valid"
# Expected: hooks.json valid
```

### Step 4 — session-start.sh syntax

```bash
bash -n scripts/hooks/session-start.sh && echo "session-start.sh syntax OK"
# Expected: session-start.sh syntax OK
```

### Step 5 — sdd-tasks tombstone intact

```bash
grep 'description:' skills/sdd-tasks/SKILL.md
# Expected: description: "Retired — do not use. See sdd-superpowers:sdd-execute."

grep 'name:' skills/sdd-tasks/SKILL.md
# Expected: name: sdd-tasks
```
