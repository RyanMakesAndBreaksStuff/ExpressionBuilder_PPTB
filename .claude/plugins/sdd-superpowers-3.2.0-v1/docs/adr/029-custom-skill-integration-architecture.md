# ADR-029-custom-skill-integration-architecture: Custom Skill Integration Architecture

**Status:** Accepted
**Date:** 2026-08-16
**Feature:** 029-custom-skill-integrations

## Context

Users want to plug their own custom skills (e.g. a Jira skill, a Confluence skill) into specific points in the SDD lifecycle — e.g. create a Jira ticket after `sdd-specify` produces an approved spec, or update Confluence after `sdd-review` passes. The Claude Code harness already auto-discovers custom skills from `~/.claude/skills/` and project `.claude/skills/` — the gap is not discovery of the skill itself, but knowing WHEN in the SDD workflow to invoke it, and doing so reliably without manual recall.

Requirements from the PRD that bear on this decision:

- Trigger points must be user-defined against any SDD skill name, not a fixed enum.
- Registration must follow a steering-file-style manifest, human-authored and version-controlled in the project.
- Invocation must always pause for explicit user confirmation before running a custom skill (side effects are external and often hard to reverse).
- The mechanism must not require editing every SDD skill file individually, to avoid duplicated logic drifting out of sync (this repo's `skill-writing.md` and `hook-scripts.md` rules both push toward centralizing detection logic, not copy-pasting it).

## Options Considered

### Option A: PostToolUse hook on the Skill tool

A new hook (`post-skill-integration-check.sh`) registered on `PostToolUse` with `matcher: "Skill"`. It reads `tool_input.skill_name` from the hook payload, checks `.claude/integrations.md` for every row whose `Trigger Skill` matches (there may be more than one), and — if any are found — emits a single `additionalContext` block listing each matched `Custom Skill` and `Purpose`. `sdd-workflow.md` gains one rule: when this context is present, announce it and confirm with the user before invoking each named skill in turn — one skill, one confirmation, one invocation at a time, even when multiple rows matched.

**Pros:** Single detection point; no edits to any existing SDD skill file; mirrors the plugin's existing pattern of injecting `additionalContext` from hooks (`session-start.sh`, `subagent-start.sh`); mechanical and reliable — doesn't depend on the model remembering to check on its own; confirmed feasible (`PostToolUse` can target `matcher: "Skill"`, `tool_input.skill_name` carries the invoked skill's name, and `additionalContext` demonstrably steers the model's next turn).

**Cons:** Adds one new hook file and its required test (`hook-scripts.md` mandates a test per hook); the injected context lands on the *next* turn rather than inline in the same turn the skill produced its own output — a one-hook-cycle lag (in practice negligible, since the very next thing the model does is decide what to do next).

### Option B: Prose-only check duplicated per skill

Add a step to the "Transition" section of every relevant SDD skill (`sdd-brainstorm`, `sdd-specify`, `sdd-plan`, `sdd-execute`, `sdd-review`, `finishing-a-development-branch`, `session-wrap`): check `.claude/integrations.md` for a matching row before moving on, and confirm-then-invoke if found.

**Pros:** No new hook or bash code; keeps all logic in markdown, consistent with how skills already narrate their own transitions.

**Cons:** The same instruction is duplicated across ~7 files, so any future change to the mechanism (manifest format, confirmation wording) requires editing all seven in lockstep — conflicts with the spirit of `hook-scripts.md`'s "shared logic belongs in a single place, never copy-paste detection logic" (applied here to skill prose, not hook code, but the same drift risk applies); relies entirely on the model reliably remembering to perform the check every time, with no mechanical enforcement — closer to "hope compliance" than "detection."

## Decision

**We chose Option A** (PostToolUse hook on the `Skill` tool) because it gives a single, mechanically enforced detection point that doesn't touch any existing SDD skill file, matches the PRD's requirement to avoid duplicated per-skill logic, and reuses a pattern (`additionalContext` injection from a hook) already proven in this plugin's own `session-start.sh` and `subagent-start.sh`. The one-turn lag in Option A is an acceptable tradeoff against Option B's duplicated, unenforced logic across seven files.

The manifest itself (`.claude/integrations.md`) is a GFM table rather than JSON or a YAML-frontmatter list, because the hook can parse fixed-column table rows with plain `grep`/`awk` — consistent with this repo's existing bash conventions, which don't already depend on a YAML parser (`yq`) — while remaining easy for a human to hand-edit, matching `markdown-conventions.md`'s guidance to use GFM tables for reference lookups.

The table has exactly three columns, in this order: `Trigger Skill` (an SDD skill name), `Custom Skill` (the user's installed skill to invoke), and `Purpose` (a one-line human-readable description surfaced in the confirmation prompt). All three producers/consumers of this file — `sdd-init`'s scaffolded header row, `sdd-integrations`' row-write logic, and the hook's `grep`/`awk` parsing — share this exact schema; none of them may add, drop, or reorder columns without a superseding ADR.

## Consequences

- New files: `scripts/hooks/post-skill-integration-check.sh`, its registration in `hooks/hooks.json` (`PostToolUse`, matcher `Skill`, timeout 10s per `yaml-config.md`'s context-hook convention), and `tests/hooks/test_post-skill-integration-check.sh`.
- No existing SDD skill file needs to change to support detection; only `sdd-workflow.md` gains one new confirm-then-invoke rule.
- If a future need arises for integration targets other than "invoke a skill" (e.g. a raw webhook), this hook's payload assumption (`tool_input.skill_name`) would need to be revisited — out of scope for now, flagged for whoever picks this up next.
- If the manifest format ever needs to grow beyond three columns (e.g. per-row confirmation-skip flags), the GFM-table choice should be revisited; a superseding ADR should be written rather than silently drifting to a different format.
