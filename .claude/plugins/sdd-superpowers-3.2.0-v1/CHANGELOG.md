# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2026-08-15

### Added

- **Backported `obra/superpowers` v6.0.0-v6.3.0 improvements** — `sdd-execute` now rules on non-catastrophic plan ambiguity instead of stopping (four named stop conditions only: irreversible/destructive ops, security-sensitive actions, side effects outside the worktree, or a plan too broken to guess at); `subagent-driven-development` gained a pre-dispatch conflict scan, task-batching guidance for same-shape work, and a ban on implementer subagents spawning their own subagents; `sdd-plan` gained a Global Constraints block and per-phase Interfaces block in its plan template, plus phase right-sizing guidance; `sdd-brainstorm`'s visual companion was security-hardened (per-session auth key, cookie re-auth, sandboxed file serving, restart persistence, 4-hour idle timeout) via a file-for-file port of upstream's server — a third-party telemetry image call that rode along with the port was identified during review and stripped out; `test-driven-development`'s `testing-anti-patterns.md` was replaced by `writing-good-tests.md` (falsifiability discipline, mutation check, string-presence and change-detector traps); `writing-skills` gained "Match the Form to the Failure" and "Micro-Test Wording" guidance.

### Changed

- **`finishing-a-development-branch`'s menu** — "Discard this work" is no longer a standing 4th option; it's now available only in response to an explicit request. PR creation is forge-agnostic (uses whatever CLI is available, or the URL the push prints) instead of hardcoding `gh pr create`. Worktree removal that's refused for holding untracked files now stops and asks instead of ever force-removing.

### Fixed

- **`systematic-debugging`** — an unhyphenated "Ultrathink this" string was the exact keyword Claude Code scans for to force extended thinking, so every session loading the skill silently triggered it. Hyphenated to "Ultra-think this."

---

## [3.0.0] - 2026-08-15

### Changed

- **BREAKING: merged `sdd-research` into `sdd-brainstorm`** — one pre-spec skill now covers idea exploration, technical investigation, and formal architecture decisions. `design.md` and `research.md` are replaced by `prd.md` (product-level why/what) and a durable `docs/adr/<NNN>-<slug>.md` log (one file per significant technical decision, Michael Nygard ADR format: Status/Context/Options Considered/Decision/Consequences). `sdd-research` skill directory removed; `sdd-workflow`, `sdd-specify`, `sdd-plan`, `sdd-init`, and the `tech-stack.md` steering file updated to the new routing and artifact names. Existing `design.md`/`research.md` files from features brainstormed before this change are left as-is — this is forward-only, not migrated.

---

## [2.12.0] - 2026-07-12

### Added

- **Worktree isolation operation in `using-git`** — new Operation E ("Isolated Workspace Setup"), adopting the fuller `using-git-worktrees` skill logic from the `obra/superpowers` plugin: detects pre-existing isolation (git-dir/git-common-dir comparison with a submodule guard), prefers a native harness worktree tool over raw `git worktree` commands, falls back to a directory-priority-aware manual flow with gitignore safety and branch-name resolution/validation/collision handling, handles sandbox/permission denial gracefully, and verifies a clean baseline (dependency install + test run) before reporting the workspace ready. Reachable only via menu option 5 or an explicit named delegation — never auto-triggered by `sdd-execute`, `sdd-workflow`, or any other skill, preserving spec 003's original opt-in decision. Replaces the thinner "Advanced: Parallel Workstreams with Worktrees" section added by spec 003.

## [2.11.0] - 2026-07-05

### Added

- **Skill-level model/effort pinning** — `sdd-plan`, `sdd-research`, `sdd-brainstorm` pinned to `model: opus` / `effort: high` for the SDD workflow's architecture, research, and design-exploration judgment; `sdd-execute`, `test-driven-development`, `subagent-driven-development`, `dispatching-parallel-agents`, `systematic-debugging`, `finishing-a-development-branch`, `requesting-code-review`, `receiving-code-review` pinned to `model: sonnet` / `effort: high` for implementation and code-review work; `.claude/rules/skill-writing.md` updated to permit additional frontmatter fields beyond `name`/`description` for this purpose

### Changed

- **Subagent model-selection guidance** — implementer subagents (in `subagent-driven-development` and `dispatching-parallel-agents`) now default to inheriting the calling session's model instead of picking cheap/standard/capable tiers by task complexity; spec-reviewer and code-quality-reviewer subagents may still use a cheaper model
- **`sdd-review` coverage-matrix dispatch** — pinned to a cheap model (e.g. haiku) inside `sdd-execute`, since building the acceptance-criteria-to-test matrix is mechanical; re-dispatches on the calling session's model if the reviewer flags ambiguity needing judgment

### Fixed

- **Skill doc style consistency** — capitalized word after bold label across skill files

---

## [2.10.0] - 2026-07-04

### Added

- **`session-wrap` Quick Mode auto-digest** (spec 024) — scans the conversation and presents a ≤5-bullet digest of memory and lesson candidates labeled by type, with Save all / Select / Skip / Deep mode offered in one step; existing flow preserved as Deep Mode with explicit invocation routing gates for both modes
- **`finishing-a-development-branch` session-wrap handoff** — Step 6 added to the Quick Reference table; closing instruction now invokes `session-wrap` quick mode after any of the four integration options completes
- **"Ending a session" routing** — `sdd-workflow/SKILL.md` and `routing.md` both gain a row pointing to `sdd-superpowers:session-wrap`

### Fixed

- **`reference.md` required-reading enforcement** — all skill files that link to a `reference.md` now mark it as required reading before proceeding, instead of an optional "see also" pointer

## [2.9.0] - 2026-07-04

### Added

- **`session-wrap` skill** (spec 022) — end-of-session discipline for capturing memory candidates and narrative lessons before context is lost; scans the conversation for feedback, project state, user preferences, and reference entries; presents candidates for approval, then writes only approved entries to `.claude/memory/` and `docs/lessons/`; `stop.sh` hook updated to prompt for `session-wrap` invocation alongside `verification-before-completion`

### Removed

- **`sdd-tasks` routing surface** (spec 023) — skill frontmatter replaced with a tombstone description so it can never be triggered by skill routing; `pre-write-tasks-gate.sh` and `post-write-tasks-check.sh` hook scripts removed along with their test files; `tasks.md` context injection removed from `session-start.sh`; all cross-references to `sdd-tasks` in peer skill files replaced with `sdd-execute` or `sdd-plan`; `sdd-tasks/` directory preserved as an inert historical artifact

---

## [2.8.1] - 2026-07-04

### Fixed

- **Bash rule compliance in all hook scripts** — replaced every `[ ]` conditional with `[[ ]]` across `pre-write-plan-gate.sh`, `pre-write-tasks-gate.sh`, `post-write-memory-validate.sh`, `post-write-tasks-check.sh`, `stop.sh`, `session-start.sh`, `subagent-start.sh`, and the shared lib
- **`ls` parsing removed from `detect-active-spec.sh`** — glob iteration replaces `ls -d` for branch-prefix matching; `find`+`stat -f %m` replaces `ls -dt` for mtime-sorted fallback; eliminates word-splitting risk on spec directory names
- **Missing test for `pre-write-edit-state` hook** — added `tests/hooks/test_pre_write_edit_state.sh` with 5 assertions covering SDD/non-SDD detection, Write and Edit flag creation, and zero stdout guarantee
- **Test scripts now include `set -uo pipefail`** — all 9 test files and `run_all.sh` gain `-uo pipefail`; `-e` intentionally omitted so tests can assert on non-zero exit codes
- **`sdd-workflow` frontmatter** — removed non-standard `user-invocable: false` field; frontmatter now contains only the required `name` and `description` fields per skill-writing rules
- **`writing-skills` `@path` references** — two `@file` force-load references replaced with plain inline file references per skill-writing rules

---

## [2.8.0] - 2026-06-24

### Added

- **Plugin hooks for SDD workflow enforcement** (spec 011) — shared hook library (`hooks/lib.sh`) for SDD detection and active spec tracking; enforcement hooks cover all SDD phases: session-start reads `foundation.md`, pre-commit gate, pre-write gates for spec/plan/tasks, post-write tasks-completion detector, and Stop event advisory; all hooks registered via `hooks/hooks.json`
- **Three-tier memory architecture** (spec 014) — `memory/foundation.md` (Tier 0 project identity, loaded every session), `memory/steering/` (Tier 1 scoped context loaded silently by consuming skills), and CLAUDE.md boot-layer (auto-generated by `sdd-init`); hook whitelist exempts `foundation.md`, `MEMORY.md`, and steering files from memory validation

### Changed

- **`sdd-init` redesign** (spec 013) — replaces nine-article constitution ceremony with a 4-question mission charter (tech stack, test strategy, conventions, deployment); steering file scaffold created in `memory/steering/`; `constitution.md` superseded by `foundation.md`; all consuming skills load relevant steering files silently
- **Task and plan completion marking** (spec 012) — `sdd-execute` marks tasks `[x]` immediately after a subagent returns DONE or DONE_WITH_CONCERNS; new `post-write-tasks-check` hook fires when all checkboxes are checked, injecting advisory to mark plan phases `[DONE]` and invoke `sdd-review`; Stop hook corrected to use `systemMessage` field (was `hookSpecificOutput`, which is invalid in the Stop event schema)

### Fixed

- **CSO-violating skill descriptions** (spec 015) — five skill descriptions rewritten to contain only triggering conditions (`sdd-brainstorm`, `sdd-execute`, `sdd-review`, `sdd-specify`, `sdd-tasks`); `user-invocable: false` added to `sdd-workflow` to hide it from the `/` menu while keeping it auto-triggerable; broken `> Note:` block between integration table rows in `sdd-execute/SKILL.md` fixed; heading capitalisation corrected in `systematic-debugging/SKILL.md`

---

## [2.7.0] - 2026-05-30

### Added

- **Canonical template files** — dedicated `template.md` files added for all SDD skills (`sdd-specify`, `sdd-plan`, `sdd-research`, `sdd-tasks`, `sdd-brainstorm`) plus `contracts-api-template.md` and `data-model-template.md` for `sdd-plan`; `reference.md` files updated to link to these templates instead of embedding inline content (spec 009)
- **Phrase-matched trigger language in `sdd-workflow`** — SKILL.md trigger descriptions rewritten with concrete natural-language examples so Claude reliably routes phrases like "let's think about..." or "build me a..." to the correct SDD skill; new `Trigger Language` section added to `routing.md` with phrase-to-skill mapping (spec 010)
- **Action-based routing in `sdd-workflow` routing.md** — routing rules now distinguish between fuzzy-idea verbs (explore, think, brainstorm) and clear-idea verbs (build, create, implement) so the model reaches the right skill on first invocation without disambiguation turns (spec 010)

### Changed

- **`sdd-workflow` Common Mistakes** — added: invoking the wrong skill because the trigger phrase was ambiguous; updated routing guidance to anchor on the phrase pattern, not the technical category (spec 010)
- **`requesting-code-review` trigger scope** — clarified that the agent-action trigger (code just written by a subagent) applies specifically within `sdd-execute`; general `review this` invocations remain unchanged (spec 010)

---

## [2.6.0] - 2026-04-20

### Changed

- **`sdd-specify`, `sdd-plan`, `sdd-tasks` templates** — updated with BDD-style acceptance criteria (Given/When/Then) and AC traceability markers so every task can be traced back to a specific acceptance criterion in the spec; example spec, plan, and tasks docs added under `docs/specs/008-template-updates-bdd-acceptance-criteria/`

---

## [2.5.0] - 2026-04-19

### Changed

- **`sdd-update` renamed to `sdd-spec-update`** — the new name clarifies this skill is specifically about versioning and propagating *spec* changes, not general project updates; all references updated across `sdd-workflow`, `sdd-execute`, `README.md`, and `CLAUDE.md`
- **Skill invocation hierarchy clarified** — `test-driven-development` is now correctly documented as an implementer-subagent skill (invoked inside `subagent-driven-development`), not a controller-level skill; previously it was listed alongside `subagent-driven-development` at the same level in `sdd-workflow`, `sdd-execute`, and `routing.md`
- **`subagent-driven-development` When To Use diagram fixed** — `sdd-execute` was incorrectly shown as a peer alternative; corrected to show `sdd-execute` as the parent caller that invokes this skill
- **`sdd-workflow` quick reference** — reordered and relabeled: `subagent-driven-development` now precedes `test-driven-development`, with TDD row labeled "Each implementer subagent (dispatched from subagent-driven-development)"
- **`sdd-execute` integration table** — removed `test-driven-development` from controller-level sub-skills; added note that TDD is mandated via `subagent-driven-development` implementer subagents
- **`routing.md` mandatory conditions** — added `test-driven-development` mandatory condition clarifying it is invoked by implementer subagents, not the controller
- **`README.md` Bundled Support Skills** — hierarchy note added: `sdd-execute → subagent-driven-development → implementer subagents → test-driven-development`

### Migration

Users upgrading from v2.4.0: replace all invocations of `sdd-superpowers:sdd-update` with `sdd-superpowers:sdd-spec-update`.

## [2.4.0] - 2026-04-19

### Changed

- **`sdd-workflow`** — added `<SUBAGENT-STOP>` gate, `<EXTREMELY-IMPORTANT>` 1% rule block, Instruction Priority section, skill invocation decision flowchart, TodoWrite requirement, and Skill Types (Rigid/Flexible) classification; `routing.md` adds `subagent-driven-development` to full skill map and mandatory conditions, plus Reality column in Red Flags table
- **`subagent-driven-development`** — fixed all `superpowers:` namespace references to `sdd-superpowers:`; added SDD Source Files table (`tasks.md`/`spec.md`/`plan.md` roles); updated example workflow paths to `docs/specs/NNN-feature/`; fixed all prompt templates: `implementer-prompt.md` now mandates TDD and `using-git` conventions, `spec-reviewer-prompt.md` injects `spec.md` as authoritative source, `code-quality-reviewer-prompt.md` corrects skill namespace
- **`dispatching-parallel-agents`** — added `<SUBAGENT-STOP>` gate and SDD context in overview; rewrote When to Use flowchart to start from `tasks.md`; rewrote agent prompt template with SDD artifact injection and file-ownership constraints; replaced debugging example with SDD implementation example; rewrote post-dispatch review section as 6-step SDD process with correct spec-compliance (via `spec-reviewer-prompt.md`) and code-quality (via `requesting-code-review`) split
- **`receiving-code-review`** — added "From Reviewer Subagents (SDD)" source category as first handler; added YAGNI override rule (`spec.md` takes precedence); added re-dispatch requirement after fixes; added Integration section mapping callers and post-fix flow
- **`requesting-code-review`** — fixed `superpowers:code-reviewer` → `sdd-superpowers:code-reviewer`; clarified this skill handles code quality only (spec compliance handled separately by `spec-reviewer-prompt.md`); added `subagent-driven-development` and `dispatching-parallel-agents` to mandatory invocation contexts; added Integration section; `code-reviewer.md` updated with SDD artifact injection guidance
- **`test-driven-development`** — removed `@testing-anti-patterns.md` force-load syntax; added SDD checklist item (tests must verify spec requirements, not just implementation behavior); added Integration (SDD) section naming callers and spec context
- **`sdd-execute`** — added mid-flight spec change procedure (`STOP → sdd-update → propagate → resume`) to both SKILL.md and reference.md; added `verification-before-completion` as explicit hard gate before `sdd-review` in both the Quick Reference flow and reference.md Step 4
- **`finishing-a-development-branch`** — fixed integration section: added Prerequisites block (`sdd-review` + `verification-before-completion`), corrected all bare skill names to `sdd-superpowers:` namespace, replaced `executing-plans` with `sdd-superpowers:sdd-execute`

## [2.3.0] - 2026-04-19

### Added

- **`sdd-update` skill** — new skill intercepting mid-flight spec changes; classifies them as PATCH/MINOR/MAJOR, versions the spec, and propagates changes downstream in strict artifact order (spec → plan → tasks → flag code)
  - HARD-GATE blocks all downstream artifact updates until change is understood, version bump assigned, and user confirms scope
  - Spec versioning table: PATCH (clarification/wording, spec only), MINOR (new requirement, spec+plan+tasks), MAJOR (breaks/rewrites existing requirement, full review + flag code)
  - Graphviz flowchart: clarify → classify → per-path update → user confirms → propagate
  - 5-question clarification protocol; stops when change is expressible as testable acceptance criterion
  - `reference.md` with 7-step full process: clarification → classification → spec versioning → plan update → tasks update → code flagging → resume rules
- **Integration sections** — explicit sub-skill registration tables added to all relevant SDD skills:
  - `sdd-execute` Integration table extended with `dispatching-parallel-agents`, `subagent-driven-development`, `using-git`, `receiving-code-review`, `systematic-debugging`
  - `sdd-tasks` — new Integration section: `using-git` (branch creation + doc-first commit)
  - `sdd-review` — new Integration section: `verification-before-completion` (before claiming review complete)
  - `sdd-update` — Integration section: `using-git` (committing versioned artifacts after propagation)
- **`sdd-workflow` Quick Reference** extended with 6 previously missing bundled support skills: `using-git`, `test-driven-development`, `requesting-code-review`, `receiving-code-review`, `dispatching-parallel-agents`, `subagent-driven-development`

### Changed

- **`sdd-workflow` routing table** — added `sdd-update` row: mandatory for any change or addition to an approved spec
- **`sdd-workflow` Common Mistakes** — added: updating tasks/plan without running `sdd-update` first
- **`sdd-workflow` routing.md** — skill map, priority ordering, mandatory conditions, and red flags updated for `sdd-update`
- **`CLAUDE.md` skills table and workflow diagram** — `sdd-update` added with mid-flight change loop
- **README Bundled Support Skills** — replaced `using-git-worktrees` with `using-git`; SDD uses convention enforcement (branch naming + commit format), not isolated workspaces

---

## [2.2.1] - 2026-04-19

### Fixed

- **`CLAUDE.md` Project Context section** — added explicit context sources table pointing to `memory/constitution.md`, `memory/MEMORY.md`, `docs/git-convention.md`, and `docs/specs/`; Claude now knows where to look at the start of every conversation
- **`CLAUDE.md` Directory Structure** — expanded to show `memory/` and `docs/` as top-level entries with their contents
- **`sdd-init` CLAUDE.md template** — generated `CLAUDE.md` for new projects now includes the same Project Context table so the context-loading pattern is inherited automatically
- **`README.md` Project Context section** — added explanation of the generated CLAUDE.md context sources for plugin users

---

## [2.2.0] - 2026-04-18

### Added

- **`memory/constitution.md`** — Nine Articles constitutional foundation establishing immutable architectural principles for the sdd-superpowers project itself
- **`sdd-plan`: Scope Check section** — prompts splitting multi-subsystem specs into sub-specs before planning begins
- **`sdd-plan`: File Structure section** — requires mapping all files and responsibilities before defining phases
- **`sdd-plan`: No Placeholders section** — lists forbidden plan patterns (TBD, "Similar to Phase N", steps without code)
- **`sdd-plan`: Self-Review section** — inline checklist: spec coverage, placeholder scan, type/signature consistency
- **`sdd-plan`: Execution Handoff section** — offers `sdd-tasks` as next step after plan is saved
- **`sdd-tasks`: Bite-Sized Task Granularity section** — defines one-action-per-step rule with write/verify/implement/verify/commit examples
- **`sdd-tasks`: No Placeholders section** — lists forbidden task patterns
- **`sdd-tasks`: Remember section** — key rules: exact paths, complete code, exact commands with expected output
- **`sdd-tasks`: Execution Handoff section** — offers `sdd-execute` as next step after tasks.md is saved
- **`sdd-execute`: When to Stop and Ask section** — explicit stop conditions: missing dependency, repeated failure, unclear instruction, plan gap
- **`sdd-execute`: Remember section** — follow plan exactly, don't skip verifications, stop when blocked
- **`sdd-execute`: Integration section** — required sub-skills table: test-driven-development, requesting-code-review, verification-before-completion, sdd-review, finishing-a-development-branch
- **`sdd-specify`: Remember section** — WHAT not HOW, testable acceptance criteria, `[NEEDS CLARIFICATION]` usage
- **`sdd-specify`: Self-Review section** — inline checklist: testability, no placeholders, goals/non-goals, open questions
- **`sdd-specify`: Execution Handoff section** — status update Draft→Approved + offer `sdd-plan` as next step

### Changed

- **`sdd-plan` and `sdd-tasks` HARD-GATEs** — now require `spec.md` status to be `Approved` (not `Draft`) before planning or task generation begins
- **`sdd-workflow` routing table** — `sdd-review` (post-implementation) is now an explicit required step after `sdd-execute`, before `finishing-a-development-branch`
- **`sdd-workflow` Common Mistakes** — added: "Skipping `sdd-review` after implementation"
- **`sdd-workflow` routing.md** — `sdd-review` mandatory condition now states "REQUIRED before `finishing-a-development-branch`"
- **`sdd-specify` Quick Reference** — removed duplicate "Key rules" list (now canonical in Remember section)

---

## [2.1.0] - 2026-04-18

### Added

- **`reference.md` overflow files** — each rewritten skill now has a companion `reference.md` containing full process steps, templates, and examples; `SKILL.md` links to it for progressive disclosure
- **`skills/writing-skills/`** — writing-skills moved from repo root into `skills/` so it is discoverable alongside all other skills
- **HARD-GATE blocks in `sdd-plan` and `sdd-tasks`** — enforces the Four Hard Gates at the skill level:
  - `sdd-plan` blocks until `spec.md` is user-approved and all `[NEEDS CLARIFICATION]` items are resolved
  - `sdd-tasks` blocks until `plan.md` is explicitly approved by the user
- **`verify.sh`** — automated compliance script checking CSO descriptions, word budgets, section structure, and content preservation across all skills

### Changed

- **All `SKILL.md` descriptions** rewritten to CSO format: start with "Use when", state triggering condition only, no workflow summaries
- **Word budgets enforced**: `sdd-workflow` ≤200 words; all other skills ≤500 words; overflow moved to `reference.md`
- **Standard section structure** applied to all rewritten skills: `## Overview`, `## When to Use`, `## Quick Reference`, `## Common Mistakes` (discipline skills)
- **`sdd-workflow`** — routing rules, red flags, and new-project detection moved to `routing.md`; SKILL.md trimmed to 199 words
- **All cross-skill references** updated from bare names (e.g. `` `sdd-plan` ``) to fully-qualified `sdd-superpowers:` namespace (e.g. `` `sdd-superpowers:sdd-plan` ``) to match the `Skill` tool invocation format

### Exempt (intentionally unchanged)

- `subagent-driven-development`, `systematic-debugging`, `test-driven-development` — exempt from word-count reduction and section standardization; verbose content is intentional

---

## [2.0.0] - 2026-04-17

### Added

- **`using-git` skill** — single source of truth for all SDD git operations; replaces `using-git-worktrees` as the canonical git skill
  - **Operation A — Branch Creation**: loads `docs/git-convention.md`, suggests branch names (slug / ticket-ID / custom), validates against `branch_pattern` regex, creates branch
  - **Operation B — Doc-First Commit**: stages only `docs/specs/NNN-slug/`, proposes convention-compliant message, confirms, commits
  - **Operation C — Per-Task Commit** (delegation-only, called by `sdd-execute`): conflict detection, SHA-bounded staging, message validation, returns new commit SHA
  - **Operation D — Merge Commit Message**: derives scope from branch name, suggests and validates merge commit message, returns confirmed message to caller
  - **Direct Invocation Menu**: users can invoke `using-git` directly to create a branch, ad-hoc commit, prepare a merge message, or display the active convention
  - **Advanced: Parallel Workstreams with Worktrees** — opt-in documentation for manual worktree usage; not part of the standard workflow
- **`docs/git-convention.md`** — project-level git convention file (YAML frontmatter + Markdown body) established during `sdd-init` and read by `using-git` before every operation

### Changed

- **`sdd-tasks` Step 5** — now a single delegation block: "Invoke `using-git` — Branch Creation and Doc-First Commit"; all inline branch/commit logic moved to `using-git`
- **`sdd-execute` Step 3e** — now a single delegation block: "Invoke `using-git` — Per-Task Commit"; all inline conflict checking, staging, and commit logic moved to `using-git`
- **`finishing-a-development-branch` Step 2.5** — now a single delegation block: "Invoke `using-git` — Merge Commit Message"; all inline convention loading and validation moved to `using-git`
- **`subagent-driven-development`** — Integration section updated to reference `using-git` instead of `using-git-worktrees`
- **`CLAUDE.md` bundled skills table** — entry updated from `using-git-worktrees` to `using-git`

### Removed

- **`using-git-worktrees` skill** — removed entirely; worktree guidance preserved as an Advanced opt-in section inside `using-git`

---

## [1.2.0] - 2026-04-17

### Added

- **Git convention setup in `sdd-init`** — new Step 5.4 walks through a 4-question Q&A (branch prefix strategy, ticket ID format, commit types, merge style) and writes `docs/git-convention.md`; Step 5.5 commits it as part of the initial scaffold
- **Branch creation + doc-first commit in `sdd-tasks`** — new Step 5 loads the project's git convention, suggests branch names (slug / ticket-ID / custom), creates the feature branch, and makes the doc-first commit before handing off to `sdd-execute`
- **Per-task commits in `sdd-execute`** — Step 3e adds commit staging, message proposal (convention-compliant), and user confirmation after each task; Step 1 now halts if running on main/master and loads the convention
- **Merge commit validation in `finishing-a-development-branch`** — new Step 2.5 loads convention, suggests a compliant merge commit message, and validates it against `allowed_types` + `commit_format` before proceeding

### Changed

- **`sdd-specify`** — Step 7 (branch creation) removed; branch creation is now deferred to `sdd-tasks` to eliminate the `using-git-worktrees` dependency at spec time
- **`sdd-tasks`** — now owns the full branch lifecycle (load convention → suggest name → create branch → doc-first commit)
- **`sdd-execute`** — guards against accidental commits to main/master; per-task commit flow replaces ad-hoc git usage

---

## [1.1.0] - 2026-04-17

### Added

- **SDD Init skill** (`sdd-init`) — Constitutional Foundation setup for new projects: codebase exploration to build a Project Profile, interactive Nine Articles review (one per turn, with governance sentences and stack-personalised defaults), atomic scaffold creation (`memory/constitution.md`, `docs/specs/`, `CLAUDE.md`), and handoff back to `sdd-workflow`
- **New Project Detection in `sdd-workflow`** — automatically triggers `sdd-init` when neither `CLAUDE.md` nor `docs/specs/` exist in the current working directory; resumes normal routing after init completes

### Changed

- `sdd-workflow` now checks for project initialisation before any routing logic (non-breaking — only activates in uninitialised projects)

---

## [1.0.0] - 2026-04-17

### Added

- **SDD Workflow skill** (`sdd-workflow`) — entry point establishing mandatory skill invocation rules and routing logic
- **SDD Brainstorm skill** (`sdd-brainstorm`) — fuzzy idea exploration with visual companion, dialogue-driven design, and automatic routing to `sdd-specify`
  - Visual companion server (Node.js + shell) for browser-based mockup sessions
  - Spec document reviewer subagent prompt
- **SDD Specify skill** (`sdd-specify`) — converts clear ideas or design.md artifacts into structured PRDs (`spec.md`), with fast-path when design.md exists
- **SDD Research skill** (`sdd-research`) — technical investigation for unresolved tech choices, performance, and security requirements before planning
- **SDD Plan skill** (`sdd-plan`) — transforms approved specs into implementation plans with architecture, API contracts, and data models
- **SDD Tasks skill** (`sdd-tasks`) — converts implementation plans into flat executable task lists with parallelization hints
- **SDD Execute skill** (`sdd-execute`) — subagent-driven implementation with per-task spec-compliance and code-quality review gates
- **SDD Review skill** (`sdd-review`) — validates spec completeness (pre-plan) and implementation alignment (post-execute) with coverage matrix
- **Bundled Superpowers skills** — key workflow skills cloned and integrated:
  - `systematic-debugging` — root-cause investigation before any fix
  - `verification-before-completion` — evidence required before any completion claim
  - `finishing-a-development-branch` — structured merge/PR/keep/discard decision after all tasks done
  - `test-driven-development` — enforces test-first discipline on every implementation task
  - `using-git-worktrees` — isolated feature workspace setup
  - `requesting-code-review` — phase-boundary review invocation
  - `receiving-code-review` — disciplined review feedback implementation
  - `dispatching-parallel-agents` — concurrent subagent dispatch for independent tasks
  - `subagent-driven-development` — in-session subagent execution with review checkpoints
- **Claude Code marketplace support** — `marketplace.json`, plugin manifest (`claude-plugin.json`), and `README.md` for marketplace publishing
- **The Four Hard Gates** — enforced discipline checkpoints:
  1. No plan without an approved spec
  2. No tasks without a plan
  3. No code without a prior failing test
  4. No completion claim without fresh verification evidence

### Project Structure

```
docs/specs/NNN-feature/
  spec.md        # PRD — source of truth
  research.md    # Technical investigation (optional)
  plan.md        # Implementation plan
  data-model.md  # Entity definitions (optional)
  contracts/     # API/event contracts (optional)
  tasks.md       # Executable task list
  quickstart.md  # Smoke test scenarios
skills/          # All SDD and bundled Superpowers skills
```

[2.9.0]: https://github.com/hllj/sdd-superpowers/compare/v2.8.1...v2.9.0
[2.8.1]: https://github.com/hllj/sdd-superpowers/compare/v2.8.0...v2.8.1
[2.7.0]: https://github.com/hllj/sdd-superpowers/compare/v2.6.0...v2.7.0
[2.6.0]: https://github.com/hllj/sdd-superpowers/compare/v2.5.0...v2.6.0
[2.5.0]: https://github.com/hllj/sdd-superpowers/compare/v2.4.0...v2.5.0
[2.4.0]: https://github.com/hllj/sdd-superpowers/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/hllj/sdd-superpowers/compare/v2.2.1...v2.3.0
[2.2.1]: https://github.com/hllj/sdd-superpowers/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/hllj/sdd-superpowers/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/hllj/sdd-superpowers/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/hllj/sdd-superpowers/compare/v1.2.0...v2.0.0
[1.2.0]: https://github.com/hllj/sdd-superpowers/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/hllj/sdd-superpowers/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/hllj/sdd-superpowers/releases/tag/v1.0.0
