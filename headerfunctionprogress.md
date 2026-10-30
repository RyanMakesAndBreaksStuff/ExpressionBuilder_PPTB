# Header and Functions implementation progress

Updated: 2026-10-03. Repository: ExpressionBuilder. Branch: `v3-function-updates`.
Plan: [function-update.md](function-update.md). Specification: [Functions screen](docs/specs/001-functions-screen/spec.md).

## Current checkpoint

**20 of 21 planned tasks are complete and committed: T1–T20.**
T18 passed 16/16 and was committed as 26d20fe. T21 remains open for final integration verification.
Responsive viewport and independent function-list scrolling passed browser checks. Final theme styling passed 19/19 style/audit checks; the last fixes remain uncommitted.
The overall implementation is **not complete**. Final regression and complete two-palette Quickstart verification remain pending; the coordinator is taking over after the GPT-6-Luna/high verification delegate hit its usage limit.

This file consolidates recorded progress; historical test results below were not rerun for this documentation update.
Continue updating this root file as work advances, alongside the task checkboxes in the plan.

## User instructions and scope

- Execute `function-update.md`; all subagents must use **GPT-6-Luna with high reasoning**.
- Earlier pauses after T1–T3, T1–T8, and T13 were honored; later continue requests resumed execution. The latest implementation resume starts at T14.
- Any theme toggle belongs **only in apps/web**. Never add one to apps/pptb or shared builder UI; PPTB follows its host theme.
- Make the layout respond to viewport width **and height**.
- Give the Functions list pane its own overflow scrolling.
- Confirm that base theme tokens are applied to the actual rendered components in both palettes.
- User explicitly authorized excluding `.codex` skill samples from ESLint, verifying full lint, then continuing.
- Preserve unrelated package, lockfile, research, and audit changes. Stage exact task-owned paths only.
- One bounded task per agent, followed by coordinator review and verification. T19 and T20 used the execution skill's serial fallback after repeated agent-thread-limit errors.
- User requested that all progress be recorded in root `headerfunctionprogress.md`.

## Prerequisite and contract decisions

The items() loop-name prerequisite is present at `ec5bb7f`. It separates the source action name from the enclosing loop name and retains loop state across screen switches.

An initial execution gate found contradictions around live focus, retained argument focus, and duplicate catalog names. The revised plan resolved them before implementation:

- Capture live input focus when wrapping; selecting after focus leaves the input changes the selected function.
- Return focus to the filled argument after wrapping or inserting a reference.
- String and Collection chunk entries share the collection/length signature.
- Parsed Value always emits source references, never items() loop roots.
- Keep `controls/TabStrip.tsx` for SupportPane; retire only BuilderTabs and WorkbenchHeader.

## Task ledger

| Task | Status and delivered behavior | Commit(s) | Recorded verification |
| --- | --- | --- | --- |
| T1 Palette tokens | Complete: shell, panel, code, shadow, glow and segment tokens in both palettes | `d9beac0` | Expected red captured; 9 token/audit tests passed; scoped lint and whitespace passed |
| T2 Function catalog | Complete: 79 WDL catalog entries and engine exports | `0f94a88` | Missing-import red; 5 tests, TypeScript, scoped lint and whitespace passed |
| T3 Parsed-value model | Complete: parsed paths and source-reference root derivation | `1393edf` | Missing-import red; 29 model/state tests, TypeScript, scoped lint and whitespace passed |
| T4 Screen contract | Complete: three-screen contract intentionally red until shell wiring | `ab47776` | Four contract cases failed before T15 and passed after integration |
| T5 Shell CSS | Complete: pill and responsive shell stylesheet | `92ecd1a` | 8 style tests passed; scoped lint and whitespace passed |
| T6 Functions CSS | Complete initial stylesheet; subsequent integration repairs remain pending | `40cbecc`, `03fb458` | 6 style tests passed; nav row sizing repaired; scoped lint and whitespace passed |
| T7 Pill header | Complete: screen chip menu, mode, overflow and Export | `c11926f` | 5 tests, TypeScript, scoped lint and whitespace passed |
| T8 Argument parser | Complete: WDL argument parsing, including items() references | `01d8606` | 71 engine tests passed; final focused 6/6; TypeScript, scoped lint and whitespace passed |
| T9 Functions state | Complete: reducer, derivation, selection, wrapping and validation | `8e6e9e5` | Missing-module red; 16 tests, TypeScript, scoped lint and whitespace passed |
| T10 Functions nav | Complete: groups, search, live-focus wrapping and Parsed Value insertion | `4fcd7eb` | Missing-component red; 14 tests, TypeScript, scoped lint and whitespace passed |
| T11 Arguments panel | Complete: labeled slots, input kinds, focus callbacks and native drops | `3549043` | Missing-component red; 5 tests, TypeScript, scoped lint and whitespace passed |
| T12 Status/info cards | Complete: validity, required counts and optional counts | `fa6f3d2` | Missing-component red; 4 tests, scoped lint and whitespace passed; shared TypeScript check passed after nav edits settled |
| T13 Expression dock | Complete: format segments, crumbs and copy actions | `a35da92`, `8a73db2` | Missing-component red; 7 tests, TypeScript and scoped lint passed; EOF cleanup and staged whitespace passed |
| T14 FunctionsWorkspace | Complete: region composition, reference insertion, focus return and clipboard state | `e6c8175` | Missing-module red; 6 tests, TypeScript, scoped lint, full lint and staged whitespace passed |
| T15 Shell wiring | Complete: three mounted screens, hoisted JSON reducer, old header/tab components removed | `d83fc09` | Contract red 4/4; contract/state green 26/26; TypeScript, full lint and whitespace passed |
| T16 Builder switching tests | Complete: switch through the chip; preserve state, copy reset, document and Export assertions | `103ad52` | 5 tests, scoped lint and staged whitespace passed |
| T17 Retired CSS removal | Complete: remove old header/tab rules and obsolete assertions | `90d6368` | 6 style/audit tests, scoped lint, zero stale selectors and staged whitespace passed |
| T18 Browser spec | Complete: chip switching and keyboard focus sequence verified | `26d20fe` | Resumed baseline 15/16; focused keyboard 1/1, full suite 16/16, scoped lint and whitespace passed |
| T19 JSON workspace harness | Complete: reducer host replaces standalone renders; all assertions preserved | `8b4f5d5` | 16/16 tests, scoped lint and staged whitespace passed |
| T20 Overflow Import tests | Complete: Import menu entry and affected mounted-screen/Copy locators | `bd8e8e4` | Final 25/25 unit tests and 2/2 browser tests; scoped lint and staged whitespace passed |
| T21 Integration verification | Pending: full regression, build, browser quickstart and final review | — | Structural preliminary checks passed; final full validation still required |

Combined T9–T13 plus theme-color audit verification passed **47/47 tests across six files**.
The JSON reference, condition canvas, toolbox and support bodies were preserved during T15; JSON workspace changes are limited to accepting shell-owned state/dispatch.

## Additional completed repairs

### ESLint sample scope — 8eeef89

Full lint originally failed with 21 errors exclusively in ignored skill sample files.
After the user authorized the fix, `eslint.config.js` gained the narrow global ignore `**/.codex/skills/**/samples/**`.
Full `npm run lint` then passed. No application lint rule was disabled.

### Code foreground tokens — 31083ff

Live inspection confirmed that base palette variables existed, but the light palette's dark code well inherited unsuitable foreground colors.
Added shared code text, muted text, accent, good/warn/danger and segment foreground tokens to both palettes in `workbenchTokens.ts`.
All seven code foregrounds meet the tested 4.5:1 contrast threshold against the code background.
Two new contrast cases failed before implementation; afterward **11 token/audit tests**, TypeScript and scoped lint passed.
Binding these tokens in Functions dock CSS remains an open integration step.

## Responsive and theme repairs in progress

Files currently changed:

- `packages/builder-ui/src/theme/shell.css`
- `packages/builder-ui/src/theme/functions.css`
- `packages/builder-ui/test/shellStyles.test.ts`
- `packages/builder-ui/test/functionsStyles.test.ts`

Real browser findings:

- At 1280×800, root content-box sizing plus padding produced a 1296px-wide, 832px-high box.
- The Functions screen wrapper lacked the flex/height constraint needed to contain its own navigation and content scroll areas.
- Base light theme values resolved correctly, but Arguments heading, card values, code preview and format segments lacked intended component typography/styles.
- The dark code well needs its own foreground token bindings in both palettes.

Current uncommitted changes add root border-box sizing, hidden-safe Functions wrapper flex sizing, heading/card typography, scoped dock preview overrides and segment styling.
Argument labels and optional text retain the intended 14px size.
An intermediate shared shell/functions/color-audit run passed **17/17 tests**; an earlier owner run passed 24/24 shell/functions/token tests.
These passes do not establish final browser correctness or cover subsequent edits.

Still required:

- Bind code-well text, accent, validation and segment variables to the dedicated code tokens.
- Verify desktop nav scrolling at 1280×800 and 1280×420 leaves arguments/cards/dock stationary.
- At 375×667, verify nav independently scrolls within 40vh and the remaining column scrolls to reachable copy actions.
- Verify inactive mounted panels remain display:none.
- Reload before final checks to remove any temporary inline browser probes.
- Validate all three screens in both palettes at 375×667, 768×1024, 900×700, 1280×420, 1280×800 and 1440×900.
- Keep color literals confined to the token source and retain all existing viewport assertions.

## T18 browser repair checkpoint

Owned file: `tests/e2e/json-references.spec.ts`; currently modified and uncommitted.

Updates already in the working tree switch via the screen chip and align stale locators with the unchanged JSON body:

- Combined root choices such as Action · Full output and Trigger · Body only.
- Payload count rather than a nonexistent parse-status element.
- Exact Copy scoped to the Reference region.
- Trigger / Filter expression scoped to its panel when exporting.
- Header chip focus-ring expectations.

The latest full run passed five cases: web network/storage behavior, clipboard failure handling, document/Export continuity, theme handling and the short-desktop reference case.
Eleven cases still failed, involving duplicate copy toasts, keyboard focus, viewport-menu timeouts, PPTB notification assertions and browser setup/performance timeouts.

Next diagnosis must:

- Scope copy-success checks to the appropriate visible/latest notice; repeated copies can legitimately create multiple notices.
- Respect that parsing emits a notice only when parsed text changes; a same-text reparse does not guarantee a fresh latest notice.
- Inspect the exact activeElement for the keyboard failure and preserve the keyboard assertion.
- Settle source/styles and rerun all 16 cases with fewer workers, e.g. `--workers=2`, to avoid overlapping HMR and browser contention.
- Preserve 30-second timeouts, the performance threshold, viewport bounds and no-false-copy-success assertions.
- Review the final diff and commit only after the required suite passes.

## Remaining integration gate

- [ ] Complete and review responsive/token-consumer repairs with real browser evidence.
- [x] Pass T18's complete 16-case suite and commit the bounded spec update.
- [ ] Run `npm test`; only documented CON-001 may remain.
- [ ] Run `npm run typecheck`.
- [ ] Run full `npm run lint`.
- [ ] Run full `npm run test:e2e`.
- [ ] Run `npm run build`.
- [ ] Repeat final structural checks and review all task-owned diffs.
- [ ] Walk every Quickstart step in both palettes, including references, validation, copy formats, focus return, wraps, chunk selection, persisted in-memory state and items() parsing.
- [ ] Confirm responsive and scroll behavior at the complete viewport matrix.
- [ ] Record final results and make the planned final feature commit.

Preliminary structural checks already found no BuilderTabs/WorkbenchHeader references under packages/apps/tests, confirmed TabStrip remains used by SupportPane, and confirmed feature commits do not include package.json or npm-shrinkwrap.json.

Historical full-suite baseline: CON-001 fails because the user's local `node: ^22.23.3` dependency conflicts with root engine requirements.
One prior run also failed the unchanged profile-delete confirmation case; its isolated rerun passed 2/2. The final full suite must reconcile that result rather than assume it is resolved.

## Evidence references

| Check | Recorded lean-ctx archive |
| --- | --- |
| Original skill-sample lint failure | `dec16f71e27b6e0f` |
| Full lint after authorized exclusion | `207d2f084fdae24b` |
| T15 pre-integration contract failure | `772781d5438c4b52` |
| T19 16/16 tests | `fd662036a3734741` |
| T20 25/25 unit tests | `364b4bc13addf8e5` |
| T20 2/2 browser tests | `d0ecd797ff5fbba6` |
| Code-token contrast red | `aadf8a1e95a75b41` |
| Code-token/audit green 11/11 | `bc9008f3c47c1fd2` |
| TypeScript after code-token repair | `706564644571b3f8` |
| Intermediate responsive styles/audit 17/17 | `8855362fb67991b2` |

## Worktree boundaries at this checkpoint

User-owned changes preserved: `package.json`, `npm-shrinkwrap.json`, `function-update.md`, `research/JSON BUILDERFlow Functions UI/` and `tokensaudit.md`.
Implementation work in progress consists of the four responsive style/test files and `tests/e2e/json-references.spec.ts`.
This progress-record update changes documentation only; it does not certify or commit the unfinished implementation.

## Progress log

- 2026-10-01 execution checkpoints: completed T1–T17, T19 and T20, plus lint and code-foreground repairs; T18/responsive integration remained open.
- 2026-10-03 documentation checkpoint: reconciled the recorded plan and task history with current Git status/log and created this root progress record at the user's request.

## Cloud execution assessment — 2026-10-03

T18 and T21 can run in a cloud workspace with the current source snapshot, Node >=24.17.0 <25, installed dependencies, Microsoft Edge and its Playwright system dependencies, and both Vite services on ports 5173/5174. The current Playwright project explicitly uses channel msedge. Complete responsive/token-consumer repairs before the final T21 run; run T18 first, then T21. Transfer uncommitted style/spec changes and the untracked plan/progress files through a deliberate checkpoint or equivalent handoff; a fresh remote checkout does not contain local-only work. Preserve the documented CON-001 exception and existing test thresholds. Browser-based palette, viewport, clipboard and quickstart checks can be performed remotely; these do not establish integration with the real PPTB host. Cloud feasibility has been assessed, but no cloud task has been launched.

Official setup guidance: https://learn.chatgpt.com/docs/environments/cloud-environments

### Execution resumed — 2026-10-03

User requested continuation. Current session remains attached to the Windows workspace; no cloud-launch tool is available. Two bounded GPT-6-Luna/high delegates are investigating the responsive/theme integration and T18 respectively. Pre-edit shell/functions/color-audit baseline passed 18/18 (archive 7efd88e5c1c34624). T18 baseline is running with two workers before any source changes. Preserve the user’s newly staged package, research and documentation files; task commits must be path-limited.

Pre-edit T18 baseline completed: **15 passed / 1 failed** in 1.8 minutes (archive af319d461663187a). The only failure is the keyboard-only Copy focus assertion at spec line285; Reference info precedes CopyActions in the actual tab order. Both palette viewport sweeps, all web/PPTB root-copy/network/accessibility checks, SC003/SC007, short-desktop scrolling and one-second performance guards passed. Responsive owner is completing code-token bindings; T18 owner is preserving the keyboard-only path while aligning its focus assertions. T21 delegate is preparing read-only verification and will run after integration settles.

A user checkpoint commit appeared during this resumed run: **80750d9 — Add Functions screen and pill-style header**. It records the previously staged plan/progress, style/spec changes, research, audit document and package.json. Preserve this checkpoint; no amend or rollback. The package path audit must distinguish this user-owned checkpoint from bounded coordinator task commits. Subsequent responsive and T18 repairs will be committed separately by exact owned paths.

### T18 accepted — 2026-10-03

Committed **26d20fe** after coordinator review: two added assertions stop at Reference info before the inline and bare copy controls. Focused keyboard 1/1 and full16/16 passed (ac3c75530368a77e); scoped spec/style-test lint and staged whitespace exit0. CSS source is not linted by ESLint (ignored configuration warnings), so style/audit tests and the final build provide its verification. Final style/audit checks passed19/19 (272741ca39119845); dock aliases are local, search keeps page-theme text. T21 checks are now running; real nav-scroll/palette proof is pending owner report.

T21 full unit regression completed: **529 passed / 1 failed (530 total), 64 files passed / 1 failed**, exit1, archive595f680b59818fd6. The sole failure is documented CON-001 at test/workspaceBuildScripts.test.ts:84: user runtime dependencies include node. The earlier profile-delete confirmation flake passed both cases in this full run. TypeScript exit0; full lint, build, e2e and browser Quickstart remain in progress.

Responsive browser proof: at1280×800 nav706pxclient/962pxcontent moved250px with argument/card/dock rectangles unchanged; at1280×420 nav326/962 moved200px independently, copy y312–350. At375×667 nav267px (~40vh)/962pxcontent moved~695px; the content workspace scrolled545px to bring copy fromy1104 toy559. Document/window overflow remained0 and inactive panelsdisplay:none. Root inspected the mobile screenshot and found an unthemed native secondary-copy button; handoff typography check failed1/11 on its missing rule, then passed19/19 after the transparent text2/12px caption repair. Scoped style-test lint and whitespace passed. Final two-palette color/screenshot verification is underway.

T21 full browser run:21passed/2failed (23total), archivec457ec2dfcec61b1. All16T18 cases passed. Additional failures are the boundary scanner rejecting navigator.clipboard in browser-test instrumentation and PPTB smoke targeting the retired Copy expression label. Added two bounded verification-repair prerequisites in docs/plans/10-03-2026-functions-browser-regression-repairs.md before implementation; production boundaries remain enforced and clipboard assertions remain unchanged.


### Latest status checkpoint — 2026-10-03

T1–T20 are complete and committed; T21 remains open. Full TypeScript, lint and build passed before the last caption-selector correction. Responsive width/height and independent nav scrolling have real browser evidence; final style/audit tests passed19/19 after limiting the secondary-caption rule to the last button. Boundary repair (TypeScript parser/printer comment removal with regex regression coverage) passed2/2 focused browser tests; PPTB preview Copy locator repair passed1/1. These repairs still require exact-path commits and a final complete regression run. Full unit baseline remains529passed/1knownCON-001 failure caused by the user-owned node runtime dependency. The verification delegate stopped on a usage limit before supplying complete Quickstart evidence; do not markT21 complete.
