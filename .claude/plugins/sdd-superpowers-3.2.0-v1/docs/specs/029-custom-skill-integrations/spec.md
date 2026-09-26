# Feature 029: Custom Skill Integrations for the SDD Workflow

**Status:** Approved
**Created:** 2026-08-16
**Branch:** `029-custom-skill-integrations`

---

## Problem Statement

Users who adopt SDD Superpowers often already have their own custom Claude Code skills for adjacent tools — creating or updating a Jira ticket, updating a Confluence page, and similar. The Claude Code harness already auto-discovers these skills (from `~/.claude/skills/` or the project's `.claude/skills/`), but nothing in the SDD workflow knows WHEN in the lifecycle to invoke them. Today, plugging a custom skill into the workflow means manually remembering to invoke it at the right moment, every time — there is no registration point and no mechanical reminder.

## Goals

- Let a user register "after SDD skill X completes, offer to invoke my custom skill Y" for any SDD skill name, not a fixed list.
- Provide a dedicated, on-demand skill (`sdd-integrations`) that scans installed custom skills, recommends a plausible trigger point per skill, and writes the confirmed registration.
- Detect a registered integration automatically when its trigger skill completes, and always pause for explicit user confirmation before invoking the custom skill.
- Support multiple custom skills registered against the same trigger point, each confirmed and invoked individually.
- Fail gracefully (tell the user, keep going) if a registered custom skill has since been uninstalled.
- Have `sdd-init` scaffold an empty integration manifest during project init, so its location and schema are discoverable immediately.

## Non-Goals

- Building any actual external-system skill (Jira, Confluence, etc.) — that is entirely the user's own work.
- Validating that a registered trigger-skill name or custom-skill name is real/currently installed, at registration time or at detection time — a typo simply never matches, silently.
- Supporting integration targets other than "invoke another skill" (e.g. raw webhooks, shell commands).
- Proactively nudging users about unregistered custom skills (e.g. via a session-start hook) — registration is on-demand only.
- Editing or removing existing registrations through `sdd-integrations` — this feature only adds new rows; since the manifest is a plain version-controlled markdown table, users edit or delete rows by hand.

## Users and Context

**Primary users:** Developers using the sdd-superpowers plugin who have authored (or plan to author) their own Claude Code skill for an external system — issue trackers, documentation wikis, notification tools, etc.

**Secondary users:** Other contributors on the same SDD project who benefit from integrations a teammate registered, once the manifest is committed to the repo.

**Usage context:** Registration happens once per custom skill, on demand, outside the normal SDD flow. Detection and confirmation happen repeatedly, inline, during ordinary SDD sessions whenever a trigger skill completes.

**User mental model:** "I already have a skill that does X in an external tool. I want the SDD workflow to remind me to run it at the right moment, and ask me before it actually does anything external."

This touches: the `sdd-superpowers` plugin's hook lifecycle (`hooks/hooks.json`, `scripts/hooks/`), the `sdd-workflow` router skill, and `sdd-init`'s project scaffolding. It does not touch the custom skills themselves — those remain entirely the user's own code, outside this plugin.

## User Stories

### Story 1: Register a custom skill

**As a** developer who has authored a custom skill for an external tool
**I want** to run `sdd-integrations` to register it against an SDD lifecycle point
**So that** the workflow can offer to invoke it automatically without me remembering to do so

**Acceptance criteria:**

- [ ] **AC-1.1** Given a project has an installed custom skill (in `~/.claude/skills/` or the project's `.claude/skills/`) not already listed in `.claude/integrations.md` and not part of the sdd-superpowers plugin's own bundled skills, When the user invokes `sdd-integrations`, Then that skill appears in the list of registration candidates.
- [ ] **AC-1.2** Given a candidate skill is presented, When `sdd-integrations` proposes a trigger point, Then it recommends a specific SDD skill name derived from signals in the candidate's own description, and asks the user to confirm that recommendation or choose a different SDD skill name as the trigger point.
- [ ] **AC-1.3** Given the user confirms a trigger point for a candidate skill, When `sdd-integrations` writes the registration, Then a new row is appended to `.claude/integrations.md` with the confirmed `Trigger Skill`, the candidate's `Custom Skill` name, and a one-line `Purpose`.
- [ ] **AC-1.4** Given a custom skill already has a row in `.claude/integrations.md`, When `sdd-integrations` scans candidates, Then that skill is excluded from the candidate list.
- [ ] **AC-1.5** Given `.claude/integrations.md` does not yet exist when `sdd-integrations` needs to write a registration, When the write happens, Then the file is created using the same header/column structure `sdd-init` scaffolds.

### Story 2: Automatic detection and confirm-then-invoke

**As a** developer with a registered custom skill integration
**I want** the SDD workflow to detect when the trigger skill completes and offer to invoke my custom skill
**So that** I don't have to remember to invoke it manually every time

**Acceptance criteria:**

- [ ] **AC-2.1** Given `.claude/integrations.md` contains a row whose `Trigger Skill` matches a skill name, When that skill is invoked and completes during a session, Then a hook detects the match and injects context naming the registered `Custom Skill` and `Purpose`.
- [ ] **AC-2.2** Given the injected context names a registered custom skill, When the agent's next turn begins, Then the agent announces the registered integration and explicitly asks the user for confirmation before invoking the named custom skill.
- [ ] **AC-2.3** Given the user confirms, When the agent proceeds, Then it invokes the named custom skill.
- [ ] **AC-2.4** Given the user declines confirmation, When the agent proceeds, Then it does not invoke the custom skill and the SDD workflow continues normally with no further gating.
- [ ] **AC-2.5** Given `.claude/integrations.md` has zero rows, or no row's `Trigger Skill` matches the completed skill's name, When any skill completes, Then no integration context is injected and no confirmation prompt appears.

### Story 3: Multiple integrations on the same trigger point

**As a** developer with more than one custom skill registered against the same SDD lifecycle point
**I want** each one surfaced and confirmed independently
**So that** I retain control over each side-effecting action separately

**Acceptance criteria:**

- [ ] **AC-3.1** Given `.claude/integrations.md` contains two or more rows sharing the same `Trigger Skill` value, When that trigger skill completes, Then the injected context lists all matching rows.
- [ ] **AC-3.2** Given multiple matching rows were surfaced, When the agent processes them, Then it announces and confirms each one individually and sequentially — one confirmation prompt per custom skill, never a single combined prompt covering multiple skills.

### Story 4: Graceful handling of an uninstalled custom skill

**As a** developer whose registered custom skill was later removed or renamed
**I want** the workflow to tell me it's gone and continue
**So that** a stale registration never blocks my SDD workflow

**Acceptance criteria:**

- [ ] **AC-4.1** Given a confirmed registration names a `Custom Skill` that is no longer installed, When the agent attempts to invoke it, Then the invocation fails, the agent reports the failure to the user, and the SDD workflow continues without further blocking.

### Story 5: Project scaffolding

**As a** developer initializing a new SDD project with `sdd-init`
**I want** an empty integration manifest scaffolded automatically
**So that** its location and schema are discoverable without needing to run `sdd-integrations` first

**Acceptance criteria:**

- [ ] **AC-5.1** Given a new project is being initialized via `sdd-init`, When scaffolding completes, Then `.claude/integrations.md` exists containing the header row and column headings (`Trigger Skill`, `Custom Skill`, `Purpose`) and zero data rows.
- [ ] **AC-5.2** Given the `sdd-init`-scaffolded `.claude/integrations.md` has zero data rows, When any SDD skill completes, Then no integration context is injected — identical behavior to a project with no manifest file at all.

## Functional Requirements

### FR-1: Integration Manifest Format

`.claude/integrations.md` is the single, version-controlled record of registered integrations.

**Must:**
- Be a GFM table with exactly three columns, in order: `Trigger Skill`, `Custom Skill`, `Purpose`.
- Accept any skill name as `Trigger Skill` — not restricted to a fixed enum of lifecycle points.

**Must not:**
- Use JSON, a YAML-frontmatter list, or any structure other than a GFM table for its data rows.

### FR-2: `sdd-integrations` Registration Skill

**Must:**
- Scan `~/.claude/skills/` and the project's `.claude/skills/` for candidate skills, excluding skills bundled with the sdd-superpowers plugin and skills already registered in `.claude/integrations.md`.
- Present each candidate one at a time with a recommended trigger point derived from signals in the candidate's own description, and accept the user's confirmation or an alternate trigger-point choice.
- Append confirmed registrations to `.claude/integrations.md`, creating the file (with the same structure `sdd-init` scaffolds) if it does not yet exist.

**Must not:**
- Register a candidate skill without explicit user confirmation.
- Modify or remove any existing row in `.claude/integrations.md`.

### FR-3: Detection Hook

**Must:**
- Fire after any skill completes, read which skill was just invoked, and check `.claude/integrations.md` for rows whose `Trigger Skill` matches.
- When one or more rows match, inject a single block of context listing every matched `Custom Skill` and `Purpose`.
- No-op entirely outside an SDD project (no `docs/specs/` directory present).

**Must not:**
- Inject any context when zero rows match.
- Invoke any custom skill itself — detection only surfaces the match; invocation is a separate, confirmed step.

### FR-4: Confirm-then-Invoke Behavior

**Must:**
- Announce and explicitly confirm with the user before invoking any custom skill surfaced by the detection hook.
- Confirm and invoke each matched custom skill individually, even when multiple rows matched the same trigger.

**Must not:**
- Invoke a custom skill without explicit user confirmation, regardless of how many rows matched.
- Block or gate progression through the SDD workflow on the user's confirmation decision — declining simply skips the custom-skill invocation.

### FR-5: Failure Handling

**Must:**
- Report to the user when a named custom skill invocation fails (e.g., the skill is no longer installed) and continue the SDD workflow.

**Must not:**
- Halt, block, or gate the SDD workflow due to a failed or missing custom-skill invocation.

### FR-6: Project Scaffolding

**Must:**
- `sdd-init` creates `.claude/integrations.md` with the header row and zero data rows during project initialization, alongside its existing steering-file scaffolding.

## Non-Functional Requirements

### Performance

- The detection hook completes within its configured timeout under normal manifest sizes (file read + text match over a markdown table with a small number of rows).

### Security

- The manifest stores no secrets or credentials — any credentials a custom skill needs to reach its external system (Jira, Confluence, etc.) are that skill's own responsibility, entirely outside this feature.

### Reliability

- The detection hook never errors out or blocks the completed skill's own output — a missing, empty, or malformed `.claude/integrations.md` behaves the same as "zero rows match."
- A malformed row (wrong column count, corrupted table syntax) is simply not matched — it does not crash the hook or block unrelated rows from matching correctly.

## Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Custom skill named in a registration is uninstalled or renamed | Invocation fails; agent reports the failure to the user; SDD workflow continues unaffected |
| `.claude/integrations.md` contains a `Trigger Skill` value that doesn't match any real SDD skill name (typo) | Hook never matches that row; no context injected for it; no error surfaced |
| `.claude/integrations.md` is malformed or missing expected columns | Hook finds no valid match for the malformed row; no crash; other well-formed rows still match normally |
| User declines the confirm-then-invoke prompt | Custom skill is not invoked; SDD workflow proceeds normally |
| Multiple rows match the same `Trigger Skill` | All matches are surfaced; each is confirmed and invoked individually, in sequence |
| `sdd-integrations` finds zero unregistered candidate skills | Skill reports nothing to register and exits without modifying the manifest |

## Open Questions

None — the brainstorm phase (`prd.md` and ADR-029) resolved all open design decisions before this spec was written.

## Out of Scope (Future Considerations)

- Building example Jira/Confluence integration skills as part of this feature.
- Any validation/`doctor`-style check confirming manifest entries reference real, installed skills.
- Non-skill integration targets (webhooks, shell commands).
- Proactive/session-start-driven discovery of unregistered custom skills.
- Editing or removing existing registrations through `sdd-integrations`.
