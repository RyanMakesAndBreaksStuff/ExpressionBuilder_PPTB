# Changelog

All notable changes to this workspace. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file tracks the workspace as a whole (engine, platform, builder-ui, and both hosts). The published Power Platform Toolbox tool is versioned separately — see [apps/pptb/public/CHANGELOG.md](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/apps/pptb/public/CHANGELOG.md).

## [Unreleased]

## [1.3.1] — 2026-10-25

### Added

- **Functions** screen: pick a Workflow Definition Language function, fill its arguments, and copy the finished expression. The catalog holds 103 entries across six groups — String, Collection, Logical, Math, Date and time, and Conversion — each with its argument list, including required, optional, and variadic parameters, plus live validation. Picking a function while an argument is focused wraps that argument; dragging a function onto an argument inserts its call. Missing required arguments, gaps before a filled optional, and arguments that are not a valid literal, reference, or call are reported before copying.
- **Conversion** functions group, 24 entries: `array`, `base64`, `base64ToBinary`, `base64ToJson`, `base64ToString`, `binary`, `bool`, `createArray`, `dataUri`, `dataUriToBinary`, `dataUriToString`, `decimal`, `decodeDataUri`, `decodeUriComponent`, `encodeBase64`, `encodeUriComponent`, `float`, `int`, `json`, `string`, `uriComponent`, `uriComponentToBinary`, `uriComponentToString`, and `xml`. The deprecated `decodeBase64` and `parse` functions are omitted. Conversion calls are accepted nested inside any argument.
- **Multi-payload JSON reference workspace**: up to five independent payload cards, each with its own source, reference root, sample, selection, expansion state, and loop name. Cards show their label and root function, expose the full root expression and parse status to assistive technology, can be closed while more than one remains, and support arrow, Home, and End navigation. A **New payload** action adds an empty payload until the fifth.
- **Cross-payload search** in JSON reference: search every parsed payload by path or value, see the payload label, path, and value preview for each match, and reveal the selected leaf in its own payload tree. Up to eight results are listed with the total match and parsed-payload counts.
- **Parsed Value source groups** in Functions: each parsed payload is its own collapsible group in the nav, labelled with its action or trigger, with the reference root as a tooltip, so identical paths from different outputs produce the right reference. Primitive array elements appear once, as plain rows. A shared cap of 200 rows, per-source collapse, and array-item accordions keep large samples usable.
- **Alt+Down** in a Functions argument moves focus into Parsed Value while keeping that argument as the insert target.
- Browser coverage for multi-payload sessions, cross-payload search, Functions argument editing, and the JSON reference → Functions round trip.

### Changed

- The shell header is now a 48px pill with the title, three screen tabs, and the current screen's actions. The tabs, in order, are **Trigger / Filter**, **JSON reference**, and **Functions**; all three screens stay mounted, so their state survives switching, and the app reopens on the last screen you used. The expression-mode control, the **Import** overflow menu, and **Export** appear on **Trigger / Filter** only, and **JSON reference** shows its privacy line in the header.
- **Trigger / Filter** replaces **Condition builder** as the condition screen's name. It keeps the expression-mode control, **Import** in the overflow menu, and the **Export** primary action.
- Pasting into **Sample JSON** now replaces the whole sample and parses it immediately; typing re-parses automatically after a 600 ms pause. A successful paste raises **Parsed · N values**, and a material change made by typing raises **Payload updated · N values**.
- JSON reference feedback distinguishes cosmetic from material edits: whitespace, object key order, and equivalent number spellings refresh the status without a notification or a reset of tree selection and expansion. An invalid automatic parse keeps the last successful tree usable and labels it as retained output; an invalid paste clears the tree, selection, and expansion and reports **Could not parse**.
- Payload cards carry their root function and a screen-reader status (good, pending or warning, danger); the strip adds an `N / 5` count and a **New payload** action, and at 900px and below the search moves to its own row. The workspace and JSON cards are capped to the viewport minus 80px of host chrome, and payload tabs cap their width so **Close** stays reachable.
- The PPTB app's `@pptb/types` dev dependency is upgraded from 1.2.5 to 1.2.7. Workspace packages move to 1.3.1 (root manifest 1.0.3), and the product docs now carry the matching version.
- Cached Dataverse metadata is scoped to the selected environment, so changing connections no longer serves the previous environment's tables or field list.
- Functions and JSON reference state remain in memory only: their contents are never persisted, uploaded, or added to the exported condition document, and only the last screen id is saved.

### Fixed

- Native undo and redo work after pasting into **Sample JSON**; undo rewrites the sample and the ordinary automatic-edit rules validate the result.
- A pending automatic parse is cancelled when its payload closes or a paste completes, so it cannot parse a different payload or raise a duplicate paste notification.
- Valid material payload changes raise exactly one **Parsed** or **Payload updated** notice per change; an invalid automatic edit no longer repeats a success notice or discards the retained tree.
- Payload close buttons stay inside narrow strips instead of being clipped by the tab width.
- A render error is contained: the affected screen shows an alert with a **Reset** button, and the other screens keep working instead of the whole window going blank.
- Importing a saved expression rejects duplicate field ids, duplicate node ids, and non-scalar rule values with a validation message instead of loading a broken document; stale rule and group selections are dropped.
- Primitive array elements in a parsed payload are listed once, as plain rows; object arrays still group under `[n]`.
- The `length` and `coalesce` wrappers apply to the field side only, while `toLower`, `toUpper`, and `trim` still mirror onto a string literal.
- A failed Dataverse field fetch is reported once and is no longer cached, so the next connect retries instead of showing an empty table.
- A rejected theme read or settings call during startup no longer throws: the app keeps its default theme and leaves onboarding closed.
- The switch-source dialog opens on **Keep rules** every time, and the **Action name** field on **JSON reference** is marked as required.

## [1.2.1] — 2026-10-04

### Added

- **JSON reference** builder, a second header tab next to **Condition builder**: paste an action or trigger output, select a value, and copy a correctly rooted reference, either bare or inside `@{…}`. It runs locally, saves nothing and never changes the condition document. Sample parsing is strict JSON, runs automatically on paste and after a typing pause, and checks its limits in order — 1 MiB, 10,000 values, 64 nesting levels — with a specific inline error for each failure.
- `tests/e2e/json-references.spec.ts`: both builds, all four roots, a privacy audit and an axe accessibility scan of both builders in both themes (`@axe-core/playwright`, dev-only).
- Three product screenshots (main view, nested AND/OR groups in dark theme, schema import dialog), captured from the running app and embedded across the README, user manual, and PPTB docs.
- `CHANGELOG.md` at the workspace root and in `apps/pptb` (the latter ships to `dist` on build).

### Changed

- The header gains **Condition builder** and **JSON reference** tabs. Above 900px it stays on one row: the title truncates first, then Import and Export become icon-only at 1,180px and below.
- Expression previews colour `outputs`, `body`, `triggerOutputs` and `items` as functions and keep strings with doubled apostrophes whole. In light mode, function names use a darker teal that meets 4.5:1 contrast.
- TypeScript project references name each `tsconfig.json` explicitly, so Playwright 1.62 can load the e2e specs again.
- Rewrote `apps/pptb/README.md` as the marketplace-facing README against the [PPTB tool maturity model](https://docs.powerplatformtoolbox.com/tool-development/maturity-model): screenshots, what the tool does, install and run instructions, permissions and external connections, theme/accessibility, and support/maintainer details.
- Documented that the tool declares **no `cspExceptions`** and contacts no external domain — Dataverse access runs through the host adapter and reads metadata only, never records.
- Every link and image across the four docs is now an absolute URL, matching the existing repo convention.
- Corrected the user manual's schema-import step, which pointed at the header **Import** (document import) rather than **Import a schema** (field import).
- Synced doc version headers with their `package.json` versions, which had drifted.

### Fixed

- The PPTB adapter no longer reports a copy as successful when the host has no clipboard API, so Condition Copy, Export and JSON reference Copy now report the failure. Export no longer leaves an unhandled promise rejection when copying fails.
- Lint failure that broke CI on `main`: an unused `MaybePromise` type alias and an unused destructured binding in `pptbAdapter.ts`.

## [1.0.2] — 2026-09-02

### Added

- Per-row wrapper selector — each rule owns its `trim`/`toLower`/`toUpper`/`coalesce` choice through an accessible menu, with wrapper nesting order preserved.
- Keyboard-accessible cross-group move, so reordering no longer requires dragging.
- CI workflow running lint, typecheck, and unit tests on every pull request.

### Changed

- The palette always follows the PPTB host theme, on mount and live. The manual light/dark toggle and its persisted override are gone — host-follow replaces it as the single theme input.
- The platform adapter is typed against `@pptb/types` directly, replacing a hand-declared surface whose dead fallback members let real misses pass silently.
- Retired the global "Apply Wrap" button and the Wrappers tab; explanatory wrapper text moved into the new per-row menu.

### Fixed

- `settings.remove()` was a permanent no-op — it called host methods that do not exist. Reimplemented over the real `getAll`/`setAll` primitives, with orphaned profile-blob keys swept and delete failures surfaced through `notify`.
- Canvas scrolling and cross-group drag-and-drop; the rule list now scrolls instead of overflowing the canvas.
- Duplicate "+ Rule" / "+ Group" accessible names disambiguated per group.

## [1.0.1] and earlier

Initial visual composer, expression engine, diagnostics, Dataverse field discovery, schema import, field profiles, and the two host apps. Not tracked in this file.
