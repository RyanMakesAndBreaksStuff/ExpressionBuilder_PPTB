# Implementation Plan — `open-items.md` §2 "Findings carried over"

_Authored 2026-09-01. Grounded in `@pptb/types@1.2.5` (`apps/pptb/package.json`
bumped 1.2.4 → 1.2.5; installed and read from
`node_modules/@pptb/types/toolboxAPI.d.ts`)._

## Ground truth from `@pptb/types@1.2.5`

Verbatim from `toolboxAPI.d.ts`:

- `SettingsAPI` (L362-390) exposes exactly **`getAll`, `get`, `set`, `setAll`**.
  There is **no `remove`**. `get` returns `Promise<any>`; `set` takes
  `(key: string, value: any)` — **not** `string` as the adapter's local
  `PptbSettingsApi` declares.
- `API` (L395-439) is exactly:
  `connections | utils | fileSystem | settings | terminal | events | invocation | getToolContext`.
- `UtilsAPI` (L183-229) **does** provide `showNotification(options)`,
  `copyToClipboard(text)`, `getCurrentTheme(): Promise<"light"|"dark">`,
  `executeParallel`, `openInConnectionBrowser`.
- `EventsAPI` (L341-356) provides `getHistory`, `on`, `off`; event union
  (L66-78) includes `"settings:updated"` but has **no theme-specific event**.
- `getCurrentTheme` returns only `"light" | "dark"` — the adapter's
  `highContrast` normalization branch is unreachable via the real host.

**Correction to `open-items.md` §2.2:** it claims `copyToClipboard`, `notify`,
`showNotification`, `getTheme` don't exist. They *do* exist — under `utils`,
which the adapter already prefers. Only the **top-level** members
(`clipboard`, `copyToClipboard`, `notify`, `showNotification`, `getTheme`,
`theme`, `onThemeChanged`, `addThemeChangedListener`, `getSetting`,
`setSetting`, `removeSetting`, `getDataverseFields`, `listDataverseFields`)
are dead. Scope task B to those.

### Cross-checked against `docs/api-info/` (2026-09-01)

All six subdirectories reviewed. Outcome:

| Plan decision | Doc verdict |
|---|---|
| Keep `events` arm for theme (`onThemeChanged`) | **Validated** — `events-api:35-39` documents `settings:updated` → `payload.data.theme`. Sanctioned pattern. |
| `utils.*` are real; only top-level members are dead | **Validated** — `toolbox-api:144-193`. |
| `highContrast` unreachable on PPTB | **Validated** — `toolbox-api:193` returns `Promise<'light' \| 'dark'>`. |
| Handler registered once | **Compliant** — `events-api` "register once"; `ExpressionBuilderShell.tsx:117-122` uses stable `[adapter]` deps + cleanup. |
| `events.off` | In `toolboxAPI.d.ts:355` but **undocumented** — keep optional-chaining. |

Two gaps found that §2 did not list, both now in scope: missing
`features.minAPI` (→ Task E) and
absent try/catch at adapter call sites (→ folded into Task A's constraints, as
it changes `remove`'s throw contract). `fileSystem.saveFile`/`selectPath` — the
migration flagged in `toolbox-api:142` — are unused here; no action.

---

## Parallelization

Six tasks, one agent each. **No agent receives a second task.**

- **A** and **B** both touch `packages/platform/src/pptbAdapter.ts` — they are
  the one real conflict. Run **A first, alone**; then **B, C, D in parallel**
  once A's diff has landed. C and D touch only `packages/builder-ui/src/workbench/`
  and never the same file as each other.
- **E** touches only `apps/pptb/package.json` and conflicts with nothing, so it
  can run alongside A in the first wave. Its `minAPI` floor must be re-derived
  after B lands if B changes which host methods are called — see Task E.
- **A now also touches `builder-ui`** (the `onNotify` threading and the
  `deleteProfile` ordering fix). Its edit to `ExpressionBuilderShell.tsx` is
  confined to the `<ManageProfilesDialog>` props at `:521-530`. **C** may also
  need to touch that file if the move-affordance call sites live there — C must
  re-check after A lands and must not touch `:521-530`.
- **F** shares `fieldProfiles.ts` with **A**, and its sweep is pointless until
  A's `remove` works — so F joins wave 2 alongside B, C, D. F and C both may
  touch `ManageProfilesDialog.tsx` / the shell; F's change there is a single
  call on dialog-open, so it rebases trivially if C lands first.

```
   ┌─────────┐                          ┌─────────┐
   │ Agent A │ ← runs alone, first      │ Agent E │ ← independent; may run
   └────┬────┘   settings.remove        └─────────┘   concurrently with A
        │        via getAll/setAll                    package.json minAPI
        │ A's edits land (pptbAdapter.ts + fieldProfiles.ts)
   ┌────┼──────┬───────┬───────┐
   ▼    ▼      ▼       ▼       ▼   (wave 2, parallel)
┌──────┐┌──────┐┌──────┐┌──────┐
│Agent ││Agent ││Agent ││Agent │
│  B   ││  C   ││  D   ││  F   │
└──────┘└──────┘└──────┘└──────┘
 adapter  keyboard  a11y   orphan
 typing   cross-grp dup    sweep
```

If strict full-parallel is required, B must be re-based onto A's result
afterward; the sequencing above avoids that.

---

## Task A — Make `settings.remove()` actually delete (finding §2.1)

**Agent: A. Files: `packages/platform/src/pptbAdapter.ts`,
`packages/builder-ui/src/importExport/fieldProfiles.ts`,
`packages/builder-ui/src/workbench/ManageProfilesDialog.tsx`,
`packages/builder-ui/src/app/ExpressionBuilderShell.tsx` (prop wiring only),
plus the tests covering those.**

**Problem.** `pptbAdapter.ts:247-253` tries `api.settings.remove` then
`api.removeSetting`. Neither exists on the 1.2.5 `API`, so the call resolves
without deleting. Two live callers are silently broken:

- `packages/builder-ui/src/importExport/metadataCache.ts:48` — cache clear
- `packages/builder-ui/src/importExport/fieldProfiles.ts:55` — profile delete

**Fix.** Re-implement `remove` as read-modify-write over the real primitives:

```ts
async remove(key) {
  const all = (await api?.settings?.getAll?.()) ?? {};
  if (!(key in all)) return;
  const { [key]: _removed, ...rest } = all;
  await api?.settings?.setAll?.(rest);
}
```

**Constraints.**
- Do **not** keep a `removeSetting` fallback arm — it does not exist in 1.2.5.
- `getAll`/`setAll` must be added to the adapter's local `PptbSettingsApi`
  interface (they are currently absent).
- Read-modify-write is **not atomic**. Note the last-writer-wins race in a
  comment; do not build locking — there is one host, one tool instance.
- If `api?.settings` is entirely absent (non-PPTB host / tests), `remove`
  must stay a safe no-op, not throw.
- **The throw contract changes — `remove` must be allowed to throw.**
  Today `remove` never throws (it silently misses). After this fix it makes
  two real host calls and *can* throw. Do **not** swallow it inside the
  adapter: that is precisely how bug §2.1 came to exist. `docs/api-info/error-handling`
  (L12, L70) and the `docs/settingsapi.md` checklist (L282) require
  `set`/`setAll` call sites to be guarded with user-facing feedback.

  Only one caller needs guarding:
  - `metadataCache.invalidate` (`metadataCache.ts:43`) is **exported but never
    called** — no references in `src`, `test`, or `platform`. Leave it; do not
    add error handling to dead code, and do not delete it either (out of scope).
  - `fieldProfiles.deleteProfile` (`fieldProfiles.ts:54`) has exactly one call
    site: `ManageProfilesDialog.tsx:143`, a bare `await` in an `onClick`.

- **Surface the failure via `adapter.notify()`, not a raw host call and not a
  MessageBar.** `builder-ui` is platform-agnostic and also runs under
  `webAdapter`, so it must never touch `window.toolboxAPI` directly.
  `adapter.notify()` already routes to `utils.showNotification` on PPTB
  (`pptbAdapter.ts:169-174`) and degrades safely on web, and it is the
  established idiom — 8 existing call sites in `ExpressionBuilderShell.tsx`
  (`:137, :147, :171, :202, :218, :250, :307, :345`).

  `ManageProfilesDialog` receives only `settings` (`:26-32`), so thread a
  narrow callback — not the whole adapter, which would widen coupling for one
  capability and break the existing `onDismiss`/`onLoad` prop style:
  1. add `onNotify: (message: string, level: NotificationLevel) => void` to
     `ManageProfilesDialogProps`;
  2. forward it through `ManageProfilesDialogBody` (`:69-74`);
  3. wire `onNotify={adapter.notify}` at `ExpressionBuilderShell.tsx:521`;
  4. update the dialog's test base props.

  Use level `'error'` and verify the adapter is not auto-dismissing it —
  `docs/api-info/error-handling` (L40) requires errors to persist longer than
  success toasts. The dialog stays open on failure with the profile still
  listed, which is correct: the delete did not happen.

- **Fix the write ordering in `deleteProfile` while you are in that file.**
  It currently does `remove(profileKey)` → `readIndex` → `set(INDEX_KEY, ...)`.
  Because `remove` is a no-op today, every deletion **orphans an
  `eb.profile.v1.<name>` blob permanently** while dropping it from the index —
  unreachable, and accumulating. Fixing `remove` resolves that, but the
  ordering then fails the other way: a throw from `remove` leaves the blob
  while the index has already been rewritten. Make the pair consistent —
  write the index first, or perform both in a single `setAll`. Same defect,
  same code path, so this stays within Task A.

**Verification.** Unit test asserting: `setAll` is called with the key
absent and every sibling key preserved; a missing key short-circuits without
calling `setAll`; absent `settings` namespace does not throw. Then confirm
`metadataCache.clear` and `fieldProfiles.delete` observably remove entries
against a fake settings store.

---

## Task B — Type the adapter against `@pptb/types`, drop dead arms (finding §2.2)

**Agent: B. Files: `packages/platform/src/pptbAdapter.ts` (+ its tests).**
**Starts only after Task A has landed** (same file).

**Problem.** `PptbToolboxApi` (L69-91) declares 13 top-level members that do
not exist on the real 1.2.5 `API`. Every one is a permanently-dead fallback
arm, and their presence lets a miss on the real branch be silently absorbed
(exactly the §2.1 failure).

**Fix.**
1. Import the real surface rather than re-declaring it:
   `import type ToolBoxAPI from '@pptb/types/toolboxAPI';` — verify the exact
   import form against the shipped `index.d.ts` before writing it; the package
   uses `export = ToolBoxAPI; export as namespace ToolBoxAPI;`, so the
   ergonomic import may differ from the naive guess. Do not assume.
2. Delete these top-level members and their consuming branches in
   `copyToClipboard`, `notify`, `getTheme`, `onThemeChanged`, `settings.get`,
   `settings.set`, `getDataverseFields`:
   `clipboard`, `copyToClipboard`, `notify`, `showNotification`, `getTheme`,
   `theme`, `onThemeChanged`, `addThemeChangedListener`, `getSetting`,
   `setSetting`, `removeSetting`, `getDataverseFields`, `listDataverseFields`.
3. **Keep** `utils`, `settings`, `events` — all three are real *and documented*.
   In particular **do not remove the `events` arm of `onThemeChanged`**:
   `docs/api-info/events-api/index.md:35-39` documents theme changes arriving
   as `settings:updated` with `payload.data.theme`, which is exactly what
   `pptbAdapter.ts:205-216` implements. It is the sanctioned pattern, not a
   speculative fallback. (`events.off`, used in the unsubscribe path, is in
   `toolboxAPI.d.ts:355` but is *not* documented — keep the
   `api.events?.off?.()` optional-chaining as the hedge.)
4. **Keep `settings` typed as `string` — decided, do not widen to `any`.**
   The host's `set` takes `value: any` and `get` returns `Promise<any>`
   (confirmed in `docs/settingsapi.md` and `toolboxAPI.d.ts` L362-390), but
   the port must not adopt that looseness:

   - **`PlatformSettings` has two implementations, and one is string-only.**
     `webAdapter.ts:66-78` backs it with `localStorage`, which coerces
     non-strings via `String()` — an object silently becomes
     `"[object Object]"`. Widening the port to `any` would typecheck against
     PPTB and **silently corrupt data on the web adapter**. `string` is the
     lowest common denominator the port is obligated to honor.
   - Narrowing is the safe direction: `string` is assignable to the host's
     `any`, so the PPTB call site typechecks with zero risk.
   - Every caller already serializes: `JSON.stringify` at
     `fieldProfiles.ts:33,36,57` and `metadataCache.ts:40`, `'1'` at
     `OnboardingPanel.tsx:49`. Widening would leak `any` into five call sites
     that would each have to re-narrow.

   **Do not "optimize away" the callers' `JSON.stringify`.** Per
   `docs/settingsapi.md`, PPTB's `set` JSON-serializes the value itself, so on
   PPTB we double-encode (we stringify, host serializes the string). It
   round-trips correctly, and it is exactly what web-adapter parity requires.
   Leave a comment saying so — removing it would break `webAdapter`.

   On the **read** side, coerce rather than assert — the host returns `any`,
   so make the `string | null` claim true at the boundary:
   `return typeof value === 'string' ? value : null;`
   (`docs/settingsapi.md`: `get` returns `undefined` when absent, which the
   existing `value ?? null` already handles.) Callers are already guarded
   (`readIndex` try/catches `JSON.parse`, `fieldProfiles.ts:11-16`), so this is
   defense-in-depth, not a bug fix.
5. `getCurrentTheme` returns only `"light" | "dark"`. Either drop the
   `highContrast` branch from `normalizeTheme` or comment why it is retained
   (e.g. non-PPTB adapters).

**Constraints.**
- **Do not** change `settings.remove`'s new implementation from Task A beyond
  the type-level edits this task requires.
- The `@deprecated getDataverseFields` shim's Dataverse path stays; only the
  `api?.getDataverseFields` / `api?.listDataverseFields` legacy fallback goes.
- Optional-chaining stays where the host may be absent (tests, browser dev
  mode) — removal of dead arms must not make the adapter throw off-host.

**Verification.** `tsc -b` clean across `packages/platform`, `packages/builder-ui`,
`apps/pptb`. Existing platform tests green. Confirm no test was asserting on a
removed fallback arm; if one was, it was testing fiction — delete it and say so.

---

## Task C — Keyboard affordance for cross-group moves (finding §2.3a)

**Agent: C. Files: `packages/builder-ui/src/workbench/ConditionMoveButtons.tsx`
and its call sites (+ tests).**

**Problem — verified.** `ConditionMoveButtons` only emits
`onMove(sourceIndex ± 1)`, bounded by `siblingCount`. Cross-group movement
introduced in `9dc53fb` is **mouse/drag-only**; there is no keyboard path to
move a rule into or out of a group. Reorder-within-group keyboard parity
existed before, so this is a genuine gap in the drag/drop work.

**Fix direction (agent decides the final shape).** Two credible options —
evaluate both, pick one, state why:
- **(a) Fluent `Menu` "Move to…"** on each row, listing sibling groups by
  label. Consistent with the per-row wrapper `Menu` already shipped in
  `588a5d5`, so it reuses an established pattern and needs no new keybindings.
- **(b) Modifier chord** (e.g. `Alt+Shift+Arrow`) for out-of-group promotion /
  into-group demotion. Faster for power users; discoverability is poor and it
  needs documenting in the user manual.

Recommend **(a)** unless the agent finds a blocker — it matches the existing
wrapper-menu idiom and is self-documenting.

**Constraints.**
- Must not regress drag/drop or within-group arrow reorder.
- Every new control needs a unique, descriptive `aria-label` (see Task D —
  do not create the same defect being fixed there).
- Reuse the existing move/reparent action in `composer/queryActions.ts` rather
  than writing new state mutation. Locate it first; do not invent a second path.

**Verification.** Unit test driving the new affordance by keyboard only
(no pointer events) and asserting the rule lands in the target group. E2E:
tab to a rule, move it across groups, assert the resulting query tree.

---

## Task D — Deduplicate `+ Rule` / `+ Group` accessible names (finding §2.3b)

**Agent: D. File: `packages/builder-ui/src/workbench/ConditionGroupCard.tsx`
(+ tests).**

**Problem — verified.** Two identical button pairs render per group:
`ConditionGroupCard.tsx:136` / `:139` (toolbar) and `:213` / `:216`
(below children). Neither carries an `aria-label`, so a screen reader
announces four buttons named "+ Rule", "+ Group", "+ Rule", "+ Group" per
group, with nesting multiplying the collisions. Sibling controls in the same
file already scope their labels by group id (`:106`, `:114`, `:147`), so the
convention exists and is simply not applied here.

**Fix.** Decide between:
- **(a) Keep both, disambiguate.** Give each an `aria-label` scoped by group
  and position, matching the file's existing convention — e.g.
  `` `Add rule to group ${group.id}` `` (toolbar) and
  `` `Add rule at end of group ${group.id}` `` (footer).
- **(b) Remove the duplicate pair** if the footer copy is redundant.

Prefer **(a)** — the footer pair is a real affordance for long groups where
the toolbar has scrolled out of view. Only choose (b) with evidence it is
unreachable or unused.

**Constraints.**
- Use `group.id` in the label the way `:106`/`:114`/`:147` already do; do not
  introduce a competing labeling scheme.
- `group.id` is opaque — if a human-readable group label is available in
  scope, prefer it and fall back to the id.
- Existing tests may select these buttons by text; update selectors rather
  than weakening the labels.

**Verification.** Render a nested group tree and assert every button has a
unique accessible name (`getAllByRole('button')` → names are a set with no
duplicates). Run the existing `ConditionGroupCard` / integration suites.

---

## Task E — Declare `features.minAPI` in the tool manifest

**Agent: E. File: `apps/pptb/package.json`.** Not from §2 — surfaced while
validating against `docs/api-info/`; in scope for this pass.

**Problem.** `apps/pptb/package.json` has **no `features` block at all**. The
`docs/api-info/toolbox-api/index.md` checklist (L412) requires
`features.minAPI` to cover the highest `Requires vX.Y.Z` badge among the host
methods the tool calls. Without it the host has no declared floor for this tool.

**Fix.** Every host method the adapter touches — `settings.get/set/getAll/setAll`,
`utils.copyToClipboard/showNotification/getCurrentTheme`, `events.on` — is
badged **Requires v1.0.17**. So:

```json
"features": { "minAPI": "1.0.17" }
```

**Constraints.**
- Do **not** declare `multiConnection` — this tool is single-connection and
  declaring it would trigger the host's connection selector.
- Re-derive the floor from the docs rather than copying the number above if
  Task B changes which host methods are called. `getAll`/`setAll` introduced by
  Task A are also v1.0.17, so no bump beyond 1.0.17 is expected.
- Runs independently of A-D; touches no file they touch.

**Verification.** `npm run validate` (`pptb-validate`) in `apps/pptb` passes.

---

## Task F — Sweep orphaned `eb.profile.v1.*` keys from existing installs

**Agent: F. File: `packages/builder-ui/src/importExport/fieldProfiles.ts`
(+ its tests), and the one call site that triggers the sweep.**
**Runs only after Task A has landed** — same file, and the sweep is meaningless
until `remove` actually works.

**Problem.** Because `settings.remove` has always been a no-op (§2.1), every
profile delete performed to date dropped the name from `eb.profiles.index.v1`
but left the `eb.profile.v1.<name>` blob behind. Existing installs carry
unreachable, accumulating keys. Task A stops new orphans; it does not clean up
old ones.

**Fix.** Add an exported `sweepOrphanedProfiles(settings: PlatformSettings)`:
read `getAll()`, find keys matching `eb.profile.v1.*` whose name is absent from
the index, and write the survivors back in a single `setAll()`.

**Constraints — read all three before writing code. Two are data-loss traps.**

1. **Do not call `readIndex` to decide what is orphaned.** `readIndex`
   (`fieldProfiles.ts:11-16`) returns `[]` for *every* failure mode — key
   absent, empty string, invalid JSON, non-array — so "no profiles" and "the
   index is unreadable" are indistinguishable through it. Sweeping on a `[]`
   from a corrupt index would delete **every profile the user has**.
   Read `INDEX_KEY` directly and sweep **only** when it is present *and*
   `JSON.parse` yields an array. Anything else → no-op and return. A fresh
   install with no index has no orphans either, so the no-op is always correct.

2. **`setAll` replaces the entire settings object.** Build the write from the
   full `getAll()` result minus the orphaned keys — never from just the profile
   keys. A `setAll` containing only profile entries would destroy the metadata
   cache (`eb.metadata.v1.*`), the onboarding flag, and anything else the tool
   or a future feature stores. Assert this in a test with unrelated keys present.

3. **Trigger it explicitly, not as a side effect of a read.** Call it once when
   `ManageProfilesDialog` opens. Do not bury a write inside `listProfiles` or
   run it on every app init — that turns a read path into a write path and
   costs a `getAll`/`setAll` round trip on every launch.

**Verification.** Tests must cover: orphans removed; live profiles retained;
unrelated keys untouched; **corrupt index → nothing deleted**; **absent index →
nothing deleted**; empty-but-valid index with orphans present → orphans removed.
The corrupt- and absent-index cases are the ones that matter most — write them
first.

---

## Cross-cutting rules for every agent

1. **Ground in `@pptb/types@1.2.5`.** Read
   `node_modules/@pptb/types/toolboxAPI.d.ts` before asserting anything about
   the host API. Never invent a member because it sounds plausible; if
   unsure, consult context7 / ms-learn rather than guessing.
2. **Stay in your lane.** Touch only the files listed for your task. If you
   find a defect elsewhere, report it — do not fix it.
3. **Run the suite before reporting done.** `tsc -b` plus the affected package
   tests. Report failures with the actual output; do not summarize them away.
4. **No commits.** Leave changes in the working tree; the orchestrator commits.
5. Update the corresponding row in `tasks/open-items.md` §2 with the outcome —
   including the §2.2 correction noted above.
