# Implementation Plan: Feature 024 — Session Wrap Auto-Digest

## Goal

Add a Quick Mode to `session-wrap` that auto-digests both memory and lesson candidates, surface it automatically at the end of `finishing-a-development-branch`, and add a routing row to `sdd-workflow`. No new files. Three skill files edited.

## Architecture

No new components or abstractions. All changes are prose edits to existing SKILL.md files.

| File | Change type | Word budget |
|------|------------|-------------|
| `skills/session-wrap/SKILL.md` | Add Quick Mode section; restructure existing content as Deep Mode; trim redundant template display | 465 → ≤500 |
| `skills/finishing-a-development-branch/SKILL.md` | Add Step 6; add closing instruction; trim to offset additions | 500 → ≤500 |
| `skills/sdd-workflow/SKILL.md` | Add one routing row | 878 (pre-existing over-limit; spec only constrains the two above) |

## File Structure

```
skills/
  session-wrap/SKILL.md          ← modified
  finishing-a-development-branch/SKILL.md  ← modified
  sdd-workflow/SKILL.md          ← modified
```

---

## Phase 1 — Modify `skills/session-wrap/SKILL.md`

### Step 1.1 — Insert Quick Mode section

After the overview paragraph (after line 10, before `## Memory Phase`), insert:

```markdown
## Quick Mode (auto-digest)

**Triggered by endpoint skills.** Scan the full conversation and produce a digest of up to 5 candidates, labeled by type:

```
**Memory candidates:**
- [feedback] <one-line summary>

**Lesson candidates:**
- [lesson] <one-line summary>

Save these?
1. **Save all** — write all candidates immediately; report "N memories, M lessons written"
2. **Select** — name which bullets to keep; write only those
3. **Skip** — save nothing this session
4. **Deep mode** — hand off to the full Deep Mode review below
```

**No candidates found:** Report "Nothing worth saving this session." Close without prompting.
**Count > 5:** Present top 5 by significance; note remaining candidates are available in deep mode.
**Save all / Select:** Write memory candidates to `.claude/memory/<slug>.md` and add to `MEMORY.md`. Write lesson candidates to `docs/lessons/YYYY-MM-DD-<slug>.md` (create directory if needed). Suggest commit: `chore(memory): capture session learnings`.
```

### Step 1.2 — Add Deep Mode heading; demote subsections

Before the existing `## Memory Phase` section, insert:

```markdown
## Deep Mode (full review)
```

Then demote the three headings that follow:
- `## Memory Phase` → `### Memory Phase`
- `## Lesson Phase` → `### Lesson Phase`
- `## Closing Summary` → `### Closing Summary`

### Step 1.3 — Trim: remove redundant lesson template code block (saves ~80 words)

In the Lesson Phase section, the instruction on line 60 already says "Present each candidate using the lesson template (see `templates/lesson.md`):" — the code block that follows (the full template) duplicates information already in the template file. Remove the code block entirely, keeping only the instruction line.

Replace:

```markdown
Present each candidate using the lesson template (see `templates/lesson.md`):

```
**Slug:** YYYY-MM-DD-my-slug
...
## Signals to watch for
...
```
```

With:

```markdown
Present each candidate using the lesson template (see `templates/lesson.md`).
```

### Step 1.4 — Trim: condense Memory Phase candidate format block (saves ~30 words)

Replace the full YAML frontmatter example block in Memory Phase with:

```markdown
For each candidate, present: type, slug, one-sentence rationale, and body (Why + How to apply). Use standard memory frontmatter (name, description, metadata.type).
```

### Step 1.5 — Trim: condense Closing Summary (saves ~15 words)

Replace the current Closing Summary content with:

```markdown
Report "N memories written, M lessons written." If files were written, suggest: `chore(memory): capture session learnings`.
```

### Step 1.6 — Update Constraints

Add one constraint bullet:

```markdown
- Quick Mode does NOT auto-write files — the user must explicitly choose "Save all" or "Select"
```

---

## Phase 2 — Modify `skills/finishing-a-development-branch/SKILL.md`

### Step 2.1 — Add Step 6 to Quick Reference table

Append to the table after Step 5:

```markdown
| 6 | Invoke `sdd-superpowers:session-wrap` quick mode |
```

### Step 2.2 — Add closing instruction after the 4-options block

After the `**Option 4 requires typed "discard" confirmation.**` line, add:

```markdown
After the chosen option executes and any cleanup completes, invoke `sdd-superpowers:session-wrap` quick mode to capture session learnings before closing.
```

### Step 2.3 — Trim to offset additions (~25 words added; trim ~25 words)

Apply these condensations:

1. **Overview sentence** — replace:
   > "Complete a development branch by verifying tests, preparing a merge commit message, and presenting four integration options: merge locally, create PR, keep as-is, or discard."

   With:
   > "Verify tests, prepare a merge commit message, and present four integration options: merge locally, create PR, keep, or discard."

2. **Reference footnote** — replace:
   > "See [reference.md](reference.md) for full step-by-step commands for each option, worktree cleanup detail, and integration notes."

   With:
   > "See [reference.md](reference.md) for per-option commands and worktree cleanup detail."

3. **Constraints** — second bullet, replace:
   > "Does NOT claim a branch is ready to merge without running the full test suite first"

   With:
   > "Does NOT claim merge-ready without running the full test suite"

4. **Error Handling — gate bypass entry** — replace:
   > "Explain that merging failing tests makes main broken for everyone. Offer to fix the failures first."

   With:
   > "Explain that merging failing tests breaks main; offer to fix failures first."

---

## Phase 3 — Modify `skills/sdd-workflow/SKILL.md`

### Step 3.1 — Add routing row to Quick Reference table

Append one row at the end of the Quick Reference table:

```markdown
| Ending a session | `sdd-superpowers:session-wrap` |
```

---

## Verification Gates

After all edits, verify:

```bash
# Word count ceilings
wc -w skills/session-wrap/SKILL.md
# → must be ≤ 500

wc -w skills/finishing-a-development-branch/SKILL.md
# → must be ≤ 500

# Quick Mode section present in session-wrap
grep -n "Quick Mode" skills/session-wrap/SKILL.md
# → line found

# Deep Mode heading present in session-wrap
grep -n "Deep Mode" skills/session-wrap/SKILL.md
# → line found

# Step 6 present in finishing-a-development-branch
grep -n "session-wrap" skills/finishing-a-development-branch/SKILL.md
# → two lines: table row and closing instruction

# Routing row present in sdd-workflow
grep -n "Ending a session" skills/sdd-workflow/SKILL.md
# → line found

# Heading hierarchy valid (no ## inside Deep Mode that should be ###)
grep -n "^## " skills/session-wrap/SKILL.md
# → only: Quick Mode, Deep Mode, Constraints
grep -n "^### " skills/session-wrap/SKILL.md
# → Memory Phase, Lesson Phase, Closing Summary
```

## Self-Review

**Spec coverage:**
- FR1 (two named modes in session-wrap) — Phase 1 Steps 1.1 + 1.2 ✓
- FR2 (Quick Mode before Deep Mode) — Step 1.1 inserts it first ✓
- FR3 (scan scope, output format, four options verbatim) — Step 1.1 content ✓
- FR4 (Save all writes without further prompting) — Step 1.1 "Save all / Select" block ✓
- FR5 (Deep mode option hands off) — Step 1.1 "4. Deep mode" option ✓
- FR6 (finishing-a-development-branch invokes quick mode after cleanup) — Phase 2 Steps 2.1 + 2.2 ✓
- FR7 (Step 6 in Quick Reference table) — Step 2.1 ✓
- FR8 (sdd-workflow routing row) — Phase 3 Step 3.1 ✓

**No placeholders:** All steps show exact replacement content. ✓
**Type consistency:** No functions or types — prose-only changes. ✓
