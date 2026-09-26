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
| 2 | Exclude candidates already registered in `.claude/integrations.md`, and candidates bundled with sdd-superpowers itself — a candidate is bundled if its `SKILL.md` resolves to a path under this same plugin's `skills/` directory (the parent of the directory containing this file, `sdd-integrations/SKILL.md`); compare resolved paths, not names |
| 3 | For each remaining candidate, read its `SKILL.md` frontmatter `description` |
| 4 | Recommend exactly one trigger point per candidate, from signals in the description: ticket/issue words → `sdd-specify` (default) over `sdd-review`; doc/wiki words → `sdd-review` (default) over `finishing-a-development-branch`. When a description matches multiple categories, default to the earliest SDD lifecycle stage among the matches (earlier catches problems sooner). Ask the user to confirm the single recommendation or choose a different SDD skill name |
| 5 | Append the confirmed row to `.claude/integrations.md` (create the file, matching the `sdd-init` scaffold, if it doesn't exist yet) |
| 6 | Report what was registered |

## Manifest Format

`.claude/integrations.md` is a GFM table with exactly three columns, in this order: `Trigger Skill` \| `Custom Skill` \| `Purpose`. This skill only appends rows — it never edits or removes an existing one. Users may hand-edit or delete rows directly since it's plain markdown.

**No literal `|` in any column value.** The detection hook's parser splits on every `|` byte and does not support GFM's `\|` escape — a literal pipe in `Purpose` (or either other column) silently truncates the value instead of erroring. When writing a `Purpose`, keep it a short plain-text description with no `|` character.

## Constraints

- Does NOT register a candidate skill without the user's explicit confirmation of the trigger point
- Does NOT modify or remove any existing row in `.claude/integrations.md`
- Does NOT validate that the chosen trigger-skill name matches a real SDD skill — a typo is accepted as-is and simply never matches at detection time
- Does NOT run automatically — only invoked on direct user request
- Does NOT write a `|` character into any manifest column value — the detection hook's parser does not support GFM's `\|` escape

## Error Handling

- **No candidate skills found** (everything is already registered or bundled): report that there is nothing new to register; do not modify the manifest.
- **`.claude/integrations.md` does not exist yet**: create it with the standard header row before appending the first registration.
- **User requests gate bypass**: there is no gate to bypass — registration always requires the user's explicit confirmation by design; explain that this is what makes later automatic detection safe.
