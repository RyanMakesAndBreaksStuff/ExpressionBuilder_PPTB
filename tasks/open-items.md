# ExpressionBuilder_PPTB — Open Work & Findings

_Recreated 2026-09-01. The prior version of this file did not exist on disk —
its content was served from a stale tool cache in a previous session and did
not correspond to any real file in the repo or its worktrees. This version is
rebuilt from verified sources: `git log`, and a direct re-read of
`packages/platform/src/pptbAdapter.ts`. Items not re-verified in this pass are
marked as such — confirm before acting on them._

## Status

Branch `feat/issue9-ui-items-1-3-4` (current branch) carries commits for
issue #9 items 1, 2, and 4, verified via `git log --oneline`:

- `1b5d860` — feat(ui): always follow host theme, remove light/dark toggle (#9 item 4)
- `588a5d5` — feat(ui): per-row wrapper selector, retire global "Apply Wrap" (#9 item 1)
- `9dc53fb` — fix(ui): canvas scroll (#7) and cross-group drag/drop (#9) (#10)

This branch has not been merged/PR'd — `origin/HEAD` points at
`codex/final-option-1-builder`, not `main`.

---

## 1. Open issues

### #7 — UI feedback (Matt Berg)

Believed complete (canvas-scroll fix landed in `9dc53fb`). Open only pending
confirmation from the original reporter — not independently re-verified this
pass.

### #9 — UI Review Issue 2

| # | Item | Status |
|---|---|---|
| 1 | "Apply Wrap" not intuitive with the Wrapper tab hidden | **Done** — `588a5d5` |
| 2 | Cross-group drag/drop | **Done** — `9dc53fb` |
| 3 | Padding issues (see screenshot on the issue) | **Still open — blocked.** Screenshot not in-repo; reproduction needs the real PPTB host and a specific viewport before any CSS edit. No script exists for this; would need Playwright against the live PPTB host once the target element/viewport is known. |
| 4 | Remove light/dark toggle; match toolbox theme | **Done** — `1b5d860` |

---

## 2. Findings carried over — resolved 2026-09-02

All six tasks in `tasks/plan-carried-over-findings.md` (A–F) were implemented,
independently verified, and committed. Summary per finding:

### 2.1 `settings.remove()` is a silent no-op — **fixed (Task A)**

`pptbAdapter.ts`'s `remove(key)` is now a real read-modify-write over
`api.settings.getAll()` / `setAll()` — the only primitives that actually
exist on `@pptb/types@1.2.5`'s `SettingsAPI`. Safe no-op when `api.settings`
is absent; now allowed to throw on a genuine host failure (previously
swallowed by missing branches, which was the root cause).

Callers fixed: `fieldProfiles.deleteProfile` (write-index-then-remove-blob
ordering fixed; failure surfaced via a new `onNotify` callback threaded
through `ManageProfilesDialog` → `adapter.notify`, level `'error'`, dialog
stays open on failure). `metadataCache.invalidate` was confirmed dead
(exported, never called) and left alone.

Task F additionally swept pre-existing orphaned `eb.profile.v1.*` blobs left
behind by the old no-op `remove` on installs that predate this fix, guarded
against corrupt/absent-index data loss, triggered once on `ManageProfilesDialog`
open.

### 2.2 `pptbAdapter.ts` declared a wide speculative API surface — **fixed (Task B)**

The adapter now imports `@pptb/types/toolboxAPI` directly
(`import type ToolBoxAPI from '@pptb/types/toolboxAPI'`) instead of
hand-declaring the host surface. All 11 dead top-level fallback members
(`clipboard`, `copyToClipboard`, `notify`, `showNotification`, `getTheme`,
`theme`, `onThemeChanged`, `addThemeChangedListener`, `getSetting`,
`setSetting`, `getDataverseFields`, `listDataverseFields`) are removed;
only the real `utils`/`settings`/`events` arms remain. `PlatformSettings`
stays `string`-typed (not widened to `any`) to protect `webAdapter`'s
`localStorage` backing from silent coercion corruption.

### 2.3a Keyboard cross-group move — **fixed (Task C)**

`ConditionMoveButtons` gained a Fluent `Menu` "Move to another group"
affordance (matches the existing per-row wrapper-menu idiom from `588a5d5`),
reusing the existing `moveNode` reducer from `queryActions.ts`/drag-drop
rather than a new mutation path. Keyboard-only test coverage added.

### 2.3b Duplicate "+ Rule"/"+ Group" accessible names — **fixed (Task D)**

Both button pairs (toolbar and footer) kept — the footer pair is a real
affordance for long groups — each now carries a unique `aria-label` scoped
by `group.id`, matching the file's existing labeling convention.

### 2.4 Missing `features.minAPI` manifest declaration — **fixed (Task E)**

`apps/pptb/package.json` now declares `"features": { "minAPI": "1.0.17",
"multiConnection": "none" }`, derived from the "Requires v1.0.17" badges on
every host method the adapter calls. `multiConnection: "none"` was required
by `pptb-validate`'s schema once any `features` block is present (not
optional as originally assumed) — set to `"none"` rather than omitted to
avoid triggering the host's connection selector for this single-connection tool.

**Verification:** `npx tsc -b` clean and `npx vitest run` green (41 test
files, 285 tests) across the whole repo after all six tasks landed; `npm run
validate` passes in `apps/pptb`.
