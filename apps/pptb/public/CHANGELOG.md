# Changelog — Expression Builder (Power Platform Toolbox)

All notable changes to the published PPTB tool. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Workspace-level changes (engine, shared UI, web host) are tracked in the [root CHANGELOG](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/CHANGELOG.md).

## [Unreleased]

## [1.3.1] — 2026-10-30

### Added

- **Functions** screen: choose one of 99 Power Automate expression functions in six groups — String, Collection, Logical, Math, Date and time, and Conversion — fill its arguments, and copy the resulting expression. Argument badges show the expected type and whether a value is required. Picking a function while an argument is focused wraps that value; dragging a function onto an argument inserts its call.
- **Conversion** group with 24 functions, including `int`, `float`, `decimal`, `string`, `bool`, `json`, `xml`, `array`, `createArray`, base64, data URI, and URI component conversions. Deprecated functions are omitted, and conversion calls work when nested inside other arguments.
- **Multiple JSON payloads**: keep up to five action or trigger outputs open at once, each with its own source, reference root, sample, selection, and loop name. Add a payload with **New payload** and close any card except the last.
- **Search across payloads** in JSON reference: find a path or value in any parsed payload, see which payload it belongs to, and jump straight to it in that payload's tree.
- **Parsed Value groups** in Functions: each parsed payload is its own collapsible group, labelled with its action or trigger and showing its match count, so you can insert a reference from the correct output with a double-click or Enter. The reference root is available as a tooltip, and primitive array values are listed once. **Alt+Down** in an argument jumps to Parsed Value and remembers which argument to fill.

### Changed

- The header is now a single compact pill with three screen tabs, in order **Trigger / Filter**, **JSON reference**, and **Functions**. Each screen keeps its state while you move between them, and the tool reopens on the last screen you used.
- The condition screen is now called **Trigger / Filter**. The expression-mode switch stays in the header, **Import** moves into the overflow menu, and **Export** remains the primary action; all three appear on that screen only.
- Pasting into **Sample JSON** replaces the sample and parses it immediately; typing parses again after a short pause. A successful paste shows **Parsed · N values**, a material change made by typing shows **Payload updated · N values**, and whitespace, key-order, and equivalent number changes update quietly.
- Payload cards show their root function, and the strip shows an `N / 5` count; both stay usable on narrow and short tool windows.
- Pasted JSON remains local to the session. The tool still declares no `cspExceptions`, contacts no external domain, and stores only field profiles, UI preferences, and cached Dataverse metadata through the host `settings` API.
- Cached Dataverse metadata is scoped to the selected environment, so changing connections no longer shows the previous environment's tables or fields. The first load after upgrading fetches fresh data, and if the connection changes while fields are loading, the load stops with **The environment changed while loading fields. Please retry.**
- The **Graphite** theme replaces Porcelain in both light and dark modes: solid primary buttons, a clearer focus ring, and refreshed status colours. The tool still follows the Toolbox theme.
- Operators and the value box follow a rule's wrappers. `length` on a text column offers number operators and a numeric value box, a text wrapper on a date offers text operators, and a wrapper that cannot follow the current chain is disabled in the **Wrappers** menu.
- Dataverse Lookup, Customer, and Owner columns now use the payload key Dataverse returns, `_<logicalname>_value`, in the generated expression.
- Importing a JSON sample encodes keys that contain dots, so they resolve to the real key. JSON Schema import is stricter: it rejects a non-object root, imports a numeric `enum` as a number field with options, and skips an invalid or conflicting `enum` with a warning.
- **Manage Profiles** disables Save, Load, and Delete while one is running and reports failures with a notification.
- On **JSON reference**, **Action name** is now **Action**, and the **Selected path** breadcrumb is removed from the Reference card.
- New diagnostics flag non-finite number literals and results whose type cannot be determined, and wrapper inputs of the wrong type say which function rejected which type.

### Fixed

- Undo and redo work naturally after pasting a JSON sample.
- An invalid edit while typing keeps the last successfully parsed payload and its references available; an invalid paste clears the tree, selection, and expansion and reports **Could not parse**.
- Payload close buttons no longer get clipped in narrow tabs, and closing or replacing a payload cannot fire a stale automatic parse.
- One screen failing no longer blanks the workspace: it shows an alert with a **Reset** button while the other screens keep working.
- Importing a saved condition rejects duplicate fields or nodes and non-text rule values with a message instead of loading a broken document.
- Primitive array values appear once in the parsed tree, and the `length` and `coalesce` wrappers apply to the field side only.
- A failed Dataverse field fetch is reported once and retried on the next connect instead of leaving an empty table.
- A failed table list or related-table load shows **Could not load tables.** or **Could not load fields.** with a **Retry** button instead of looking empty.
- Theme and settings failures at startup fall back to the default theme or a closed dialog, the switch-source dialog always opens on **Keep rules**, and the **Action** field is marked as required.

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
