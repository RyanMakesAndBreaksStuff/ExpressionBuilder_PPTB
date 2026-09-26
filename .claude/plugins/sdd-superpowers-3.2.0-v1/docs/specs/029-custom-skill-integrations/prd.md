# PRD: Custom Skill Integrations for the SDD Workflow

**Date:** 2026-08-16
**Feature:** 029-custom-skill-integrations

## Problem

Users who adopt SDD Superpowers often already have their own custom Claude Code skills for adjacent tools — creating or updating a Jira ticket, updating a Confluence page, and similar. The Claude Code harness already auto-discovers these skills (from `~/.claude/skills/` or the project's `.claude/skills/`), but nothing in the SDD workflow knows WHEN in the lifecycle to invoke them. Today, plugging a custom skill into the workflow means manually remembering to invoke it at the right moment, every time — there is no registration point and no mechanical reminder.

## Users & Context

Any developer using the sdd-superpowers plugin who has authored (or plans to author) their own skill for an external system — issue trackers, documentation wikis, notification tools, etc. — and wants that skill invoked automatically at a specific point in the SDD lifecycle (e.g. after a spec is approved, after review passes, after a branch is merged) without hand-editing multiple SDD skill files or relying on memory.

This touches: the `sdd-superpowers` plugin's hook lifecycle (`hooks/hooks.json`, `scripts/hooks/`), the `sdd-workflow` router skill, and `sdd-init`'s project scaffolding (which gains one more file to scaffold, alongside the steering files it already creates). It does not touch the custom skills themselves — those remain entirely the user's own code, outside this plugin.

## Goals

- Let a user register "after SDD skill X completes, offer to invoke my custom skill Y" for any SDD skill name, not a fixed list.
- Provide a dedicated, on-demand skill (`sdd-integrations`) that scans installed custom skills, recommends a plausible trigger point per skill based on its description, and writes the confirmed registration.
- Detect a registered integration automatically when its trigger skill completes, and always pause for explicit user confirmation before invoking the custom skill.
- Support multiple custom skills registered against the same trigger point.
- Fail gracefully (tell the user, keep going) if a registered custom skill has since been uninstalled.
- Have `sdd-init` scaffold an empty `.claude/integrations.md` — header row with columns `Trigger Skill | Custom Skill | Purpose` (see the linked ADR), zero data rows — during project init, so the manifest's location and schema are discoverable immediately, the same way `sdd-init` already scaffolds `.claude/memory/steering/*.md`.

## Non-Goals

- Building any actual external-system skill (Jira, Confluence, etc.) — that is entirely the user's own work.
- Validating that a registered `Trigger Skill` or `Custom Skill` name is real/currently installed at registration time or at manifest-write time — a typo simply never matches, silently.
- Supporting integration targets other than "invoke another skill" (e.g. raw webhooks, shell commands).
- Proactively nudging users about unregistered custom skills (e.g. via `session-start.sh`) — registration is on-demand only.

## Success Criteria

- A user can run `sdd-integrations`, see their installed custom skills (excluding ones already registered or bundled with the plugin), accept a recommended trigger point, and find a new row appended to `.claude/integrations.md`.
- After that, completing the registered trigger skill in a real session (e.g. `sdd-specify` producing an approved spec) surfaces a confirm-then-invoke prompt for the custom skill without any of the existing SDD skill files having been modified. When multiple custom skills are registered against the same trigger, each gets its own confirm-then-invoke prompt in turn, not one combined prompt.
- Declining the confirmation prompt lets the SDD workflow continue unaffected — the integration is advisory, never a gate.
- A project with no `.claude/integrations.md`, or one with zero matching rows (including the empty manifest `sdd-init` scaffolds by default, before any registration has happened), behaves identically to today — zero overhead, zero prompts.

## Architecture Decisions

- [Custom Skill Integration Architecture](../../adr/029-custom-skill-integration-architecture.md) — chose a `PostToolUse` hook on the `Skill` tool (matcher `"Skill"`, reading `tool_input.skill_name`) as the single detection point, over duplicating a manual check into every relevant SDD skill's Transition section; chose a GFM-table manifest (`.claude/integrations.md`) over JSON/YAML for `grep`/`awk`-friendly parsing without adding a YAML-parser dependency.

## Out of Scope

- Building example Jira/Confluence integration skills as part of this feature.
- Any validation/`doctor`-style check that manifest entries reference real, installed skills.
- Non-skill integration targets (webhooks, shell commands).
- Proactive/session-start-driven discovery of unregistered custom skills — deferred; on-demand `sdd-integrations` only.
- Editing any existing SDD skill file (`sdd-specify`, `sdd-plan`, etc.) to add integration-awareness — detection lives entirely in the new hook plus one new rule in `sdd-workflow.md`.
