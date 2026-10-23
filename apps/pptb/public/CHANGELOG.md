# Changelog — Expression Builder (Power Platform Toolbox)

All notable changes to the published PPTB tool. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Workspace-level changes (engine, shared UI, web host) are tracked in the [root CHANGELOG](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/CHANGELOG.md).

## [Unreleased]

## [1.3.1] — 2026-10-23

### Added

- **Functions** screen: choose one of 103 Power Automate expression functions in six groups — String, Collection, Logical, Math, Date and time, and Conversion — fill its arguments, and copy the resulting expression. Argument badges show the expected type and whether a value is required. Picking a function while an argument is focused wraps that value; dragging a function onto an argument inserts its call.
- **Conversion** group with 24 functions, including `int`, `float`, `decimal`, `string`, `bool`, `json`, `xml`, `array`, `createArray`, base64, data URI, and URI component conversions. Deprecated functions are omitted, and conversion calls work when nested inside other arguments.
- **Multiple JSON payloads**: keep up to five action or trigger outputs open at once, each with its own source, reference root, sample, selection, and loop name. Add a payload with **New payload** and close any card except the last.
- **Search across payloads** in JSON reference: find a path or value in any parsed payload, see which payload it belongs to, and jump straight to it in that payload's tree.
- **Parsed Value groups** in Functions, one per parsed JSON payload, so you can insert a reference from the correct output with a double-click or Enter. **Alt+Down** in an argument jumps to Parsed Value and remembers which argument to fill.

### Changed

- The header is now a single compact pill with a mode chip that switches between **Functions**, **Trigger / Filter**, and **JSON reference**. Each screen keeps its state while you move between them.
- The condition screen is now called **Trigger / Filter**. The expression-mode switch stays in the header, **Import** moves into the overflow menu, and **Export** remains the primary action.
- Pasting into **Sample JSON** replaces the sample and parses it immediately; typing parses again after a short pause. Successful parses and material changes show a **Parsed** or **Payload updated** notification, while whitespace, key-order, and equivalent number changes update quietly.
- Payload cards show a status dot and root expression; the strip shows an `N / 5` count, and both stay usable on narrow and short tool windows.
- Pasted JSON remains local to the session. The tool still declares no `cspExceptions`, contacts no external domain, and stores only field profiles and UI preferences through the host `settings` API.

### Fixed

- Undo and redo work naturally after pasting a JSON sample.
- An invalid edit keeps the last successfully parsed payload and its references available instead of clearing the tree.
- Payload close buttons no longer get clipped in narrow tabs, and closing or replacing a payload cannot fire a stale automatic parse.

## [1.2.1] — 2026-10-04

### Added

- **JSON reference** builder: paste an action or trigger output from a flow run, select any value in a tree, and copy a correctly rooted reference. Pasted JSON is processed locally and is not uploaded or saved.
- Screenshots in the tool README — main view, nested AND/OR groups in the dark theme, and the schema import dialog.
- This changelog, shipped into the tool package at `dist/CHANGELOG.md`.

### Changed

- Header tabs switch between **Condition builder** and **JSON reference**. The marketplace description and keywords mention JSON references.
- Rewrote the marketplace README against the [tool maturity model](https://docs.powerplatformtoolbox.com/tool-development/maturity-model): install and run instructions, permissions and external connections, theme and accessibility notes, and maintainer/support details.
- Documented that the tool declares **no `cspExceptions`** and reaches no external domain. Dataverse access goes through the host `dataverseAPI` for the connection you select, and reads table and attribute metadata only — never records. Persistence is limited to the host `settings` API.

### Fixed

- Copying in a host without a clipboard API now reports the failure instead of claiming success, for the expression, Export and JSON references.
- Lint failure that broke CI: unused declarations in the PPTB platform adapter.

## [1.1.1] — 2026-09-03

### Added

- E2E coverage for a 1280x420 viewport, matching short PPTB tool frames.

### Changed

- Docks auto-collapse on small screens when fields are already loaded; the toolbox stays open when there are none, so the empty state stays actionable.
- A blocking overlay with a spinner covers async loads, preventing interaction with half-loaded state.
- The copy-confirmation live region is always mounted, so screen readers announce it reliably.

### Fixed

- Rules stay visible in short PPTB frames — the centre column scrolls instead of crushing the canvas.
- Below 900px the workbench stacks as a flex column with the canvas first, and the toolbox list is capped so the builder is reachable on phones.
- Dialogs no longer clip their actions at 375px; the import-schema tab strip scrolls, and the header compacts from 900px.

## [1.1.0] — 2026-09-02

### Added

- Per-rule wrapper selector — each row owns its `trim`/`toLower`/`toUpper`/`coalesce` choice via an accessible menu that preserves nesting order.
- Keyboard-accessible cross-group move for rules and groups.
- `features.minAPI` declared on the tool manifest (host API `1.0.17`).

### Changed

- The tool always follows the Power Platform Toolbox app theme, on load and live. The manual light/dark toggle is removed — nothing is lost, the host is now the single theme input.
- Retired the global "Apply Wrap" button and the Wrappers tab in favour of the per-row menu.

### Fixed

- **Saved field profiles could not be deleted.** `settings.remove()` called host methods that do not exist, so every delete silently did nothing. Rebuilt on the real host `getAll`/`setAll` primitives; profile keys orphaned by the old no-op are swept on load, and failures now raise a notification instead of failing quietly.
- Canvas scrolling and cross-group drag-and-drop; the rule list scrolls rather than overflowing.
- "+ Rule" and "+ Group" now have distinct accessible names per group.

## [1.0.x] and earlier

Initial release: visual condition composer, live expression preview, Dataverse field discovery, schema import (Field JSON / sample / JSON Schema / CSV), field profiles, and diagnostics. Not tracked in this file.
