# PPTB Usage

> **Version**: 1.3.1

![The Expression Builder workbench: field toolbox, condition canvas, support panes, and generated expression preview.](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/assets/images/expression-builder.png)

## Install

Install **Expression Builder** from the Power Platform Toolbox marketplace (host API `1.0.17`+), then open it from the tool list. Select an environment connection first if you want Dataverse field discovery; every other feature works without one.

## Screens

Three tabs in the header switch between the screens, in this order:

- **Trigger / Filter** — build the AND/OR predicate used by a trigger condition or a Filter array action.
- **JSON reference** — turn a sample action or trigger output into a correctly rooted reference.
- **Functions** — assemble a Workflow Definition Language call from the 99-function catalog.

Each screen stays mounted while another is showing, so its state survives switching, and the tool reopens on the last screen you used. Functions and JSON reference state is held in memory only: its contents are never saved or included in the exported condition document.

![Expression Builder header with the Trigger / Filter, JSON reference, and Functions screen tabs above the Trigger / Filter workspace](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/assets/images/screen-tabs.png)

## Permissions & External Connections

The tool declares **no `cspExceptions`** and contacts no external domain — no telemetry, no backend. Dataverse access goes through the host `dataverseAPI` against the connection you pick, and reads table/attribute **metadata only** (never records). Persistence uses the host `settings` API for field profiles, UI preferences, and cached Dataverse metadata (table and field details for the environment you connected). Pasted JSON in the JSON reference builder (up to five payloads) is processed locally and is not uploaded or saved by this feature.

## Trigger / Filter

1. **Pick the screen and mode** — select the **Trigger / Filter** tab, then _Trigger condition_ (`triggerBody()`) or _Filter array_ (`item()`).
2. **Connect a table** — pull field metadata live from a connected Dataverse table.
3. **Add Field** — click a field in the Field Toolbox to add a rule to the active group.
4. **Set operator/value** — the type (string, number, boolean, dateTime, choice) drives which operators and value editor show.
5. **Add Group** — nest AND/OR logic as needed. The **Wrappers** menu on a rule applies `toLower`, `toUpper`, `trim`, `length`, or `coalesce` to the field, in the order you check them; `toLower`, `toUpper`, and `trim` also apply to the typed value.
6. Copy the generated expression from the Expression Preview panel, or **Export** the document as JSON to reload later. **Import** is under the header's overflow (`···`) menu.

Nested AND/OR groups, in the Toolbox dark theme:

![A nested OR group inside a top-level AND group, in dark mode, with the combined expression in the preview panel.](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/assets/images/nested-groups-dark.png)

With no Dataverse connection, import fields as Field JSON, a sample payload, JSON Schema, or CSV:

![The Import field schema dialog, with tabs for Field JSON, Sample, Schema, and CSV.](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/assets/images/import-schema.png)

## Reordering Conditions (Drag-and-Drop)

Rules and groups can be repositioned within the canvas two ways:

- **Drag handle** — grab the grip icon on a rule or group and drop it on a highlighted position target (before/after a sibling, or into a group).
- **Move buttons** — use the up/down chevron buttons next to a condition as a keyboard-accessible alternative to dragging; disabled at the first/last position in its group.

Both paths update the same underlying document via `moveNode`/`reorderNode`, so diagnostics and the expression preview stay in sync as you reorder.

## Functions

Select the **Functions** tab to build a Workflow Definition Language call without writing its syntax.

1. **Find a function** — browse String, Collection, Logical, Math, Date and time, or Conversion, or type in the catalog search.
2. **Pick it** — the function becomes active and its argument list appears. Required arguments are marked; optional arguments may stay blank; variadic functions accept any number of trailing values.
3. **Fill arguments** — click or drag a function onto an argument to nest it (`click` wraps the argument; `drag` inserts a call), or insert a value from **Parsed Value**.
4. **Jump to values** — press **Alt+Down** in any argument to move to Parsed Value; the argument remains the insert target. Double-click or press Enter on a row to insert it.
5. **Copy** — use the bare expression in an expression editor, or the `@{…}` form inside text.

![Functions screen with concat selected, the six catalog groups collapsed, and the Get customer and Get order payload groups with match counts, Get order expanded](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/assets/images/functions-navigation.png)

Parsed Value lists each parsed payload as its own collapsible group, labelled with its action or trigger and its match count, with the reference root in the tooltip, so identical paths from different outputs insert the correct reference. Primitive array values appear once, as plain rows. A shared cap of 200 rows and array-item accordions keep large samples workable. Status cards report whether the call is valid and how many required arguments are set; missing required arguments, gaps before a filled optional, and arguments that are not a valid literal, reference, or call are reported inline.

![concat arguments with a parsed Email reference inserted into text1, type badges, Valid status cards, the generated expression, and the Copy expression button](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/assets/images/function-insertion.png)

## JSON References

Open the **JSON reference** tab to build a reference into a flow-run output:

1. **Start with the first payload** — the first payload card is ready to use. **New payload** adds another, up to five. Each card holds its own source, reference root, sample, selection, expansion state, and loop name.
2. **Choose the reference root** — under **Action** or **Trigger**, pick **Full output** for `outputs('<name>')` / `triggerOutputs()` (also right for Compose), or **Body only** for `body('<name>')` / `triggerBody()`.
3. **Name an Action root** — type the action name as the flow designer shows it. Triggers need no name.
4. **Paste or type the sample** — pasting replaces the sample and parses immediately; typing re-parses after a 600 ms pause. Samples up to 1 MiB, with up to 10,000 values and 64 nesting levels, are accepted, and only strict JSON is valid — comments, trailing commas, and single quotes are rejected.
5. **Select a value** in the tree and **Copy** it for the expression editor, or copy the `@{…}` form for use inside text.

**Payload cards** show the payload label and its root function (`outputs()`, `body()`, `triggerOutputs()`, or `triggerBody()`), with the full root expression and parse status announced to screen readers, plus a close button once more than one payload is open; use Left/Right or Home/End to move between them. An invalid edit while typing leaves the last successful tree available and labels it as retained output; an invalid paste clears the tree, selection, and expansion. Status reads **Could not parse**, **Could not parse. Showing last successful payload.**, or **Nothing parsed yet** before the first parse. A successful paste raises one **Parsed · N values** notification; a material change made by typing raises **Payload updated · N values**, while whitespace, key-order, and equivalent number changes update quietly.

![JSON reference with an invalid typed edit in Sample JSON, the previous tree still shown, and the status "Could not parse. Showing last successful payload."](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/assets/images/retained-typed-edit.png)

**Search across payloads** filters every parsed payload by path or value. Results show the payload, path, and a value preview, with the total match and parsed-payload counts; up to eight are listed. Selecting a result switches to that payload and reveals the leaf. Esc clears the search.

![Search all payloads listing Email matches from both Get customer and Get order, with the selected Email leaf revealed in its payload tree](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/assets/images/multi-payload-search.png)

An index such as `[0]` reads one fixed item, not each item in a loop. A generated reference does not prove that the action exists, has run, or has this shape at run time. Switching to **Trigger / Filter** leaves your conditions exactly as they were. See the [user manual](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/USER_MANUAL.md#58-json-references) for details.

![Reference card for an indexed path showing the fixed-position note, the item() and items() loop cards, a Loop name of Each customer, and their Copy buttons](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/assets/images/loop-references.png)

## Shared

```bash
npm run build      # build all workspaces
npm test           # vitest unit tests
npm run test:e2e   # playwright
npm run lint
npm run typecheck
```

The PPTB plugin shares [`packages/builder-ui`](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/tree/main/packages/builder-ui) and [`packages/platform`](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/tree/main/packages/platform) (`@ryanmakes/eb_platformadapter` abstracts host differences between web and PPTB).

## See also

- [PPTB README](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/apps/pptb/README.md)
- [User manual & developer docs](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/USER_MANUAL.md)
- [Changelog](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/CHANGELOG.md)
