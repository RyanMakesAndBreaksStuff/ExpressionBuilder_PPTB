# PPTB Usage

> **Version**: 1.1.1

![Field toolbox on the left, the AND/OR condition builder in the centre, live diagnostics on the right, and the generated Power Automate expression at the bottom.](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/docs/images/expression-builder.png)

## Install

Install **Expression Builder** from the Power Platform Toolbox marketplace (host API `1.0.17`+), then open it from the tool list. Select an environment connection first if you want Dataverse field discovery; every other feature works without one.

## Permissions & External Connections

The tool declares **no `cspExceptions`** and contacts no external domain — no telemetry, no backend. Dataverse access goes through the host `dataverseAPI` against the connection you pick, and reads table/attribute **metadata only** (never records). Persistence uses the host `settings` API for field profiles and UI preferences.

## Building Conditions

1. **Connect Table** — pull field metadata live from a connected Dataverse table.
2. **Add Field** — click a field in the Field Toolbox to add a rule to the active group.
3. **Set operator/value** — the type (string, number, boolean, dateTime, choice) drives which operators and value editor show.
4. **Add Group** — nest AND/OR logic as needed.
5. Copy the generated expression from the Expression Preview panel, or Export the document as JSON to reload later.

Nested AND/OR groups, in the Toolbox dark theme:

![A nested OR group inside a top-level AND group, in dark mode, with the combined expression in the preview panel.](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/docs/images/nested-groups-dark.png)

With no Dataverse connection, import fields as Field JSON, a sample payload, JSON Schema, or CSV:

![The Import field schema dialog, with tabs for Field JSON, Sample, Schema, and CSV.](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/docs/images/import-schema.png)

## Reordering Conditions (Drag-and-Drop)

Rules and groups can be repositioned within the canvas two ways:

- **Drag handle** — grab the grip icon on a rule or group and drop it on a highlighted position target (before/after a sibling, or into a group).
- **Move buttons** — use the up/down chevron buttons next to a condition as a keyboard-accessible alternative to dragging; disabled at the first/last position in its group.

Both paths update the same underlying document via `moveNode`/`reorderNode`, so diagnostics and the expression preview stay in sync as you reorder.

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
