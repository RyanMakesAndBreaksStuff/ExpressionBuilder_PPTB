# Power Automate Expression Builder

> **Version**: 1.1.1 · **License**: BSD-3-Clause · **Maintainer**: Ryan Rettinger

Build Power Automate **Trigger Condition** and **Filter array** advanced-mode expressions visually, inside the Power Platform Toolbox — instead of hand-writing `@and(...)` / `@or(...)` predicates and discovering the syntax errors at runtime.

![The Expression Builder tool: field toolbox on the left, the AND/OR condition builder in the centre, live diagnostics on the right, and the generated Power Automate expression at the bottom.](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/docs/images/expression-builder.png)

Nested AND/OR groups, in the Toolbox dark theme:

![A nested OR group inside a top-level AND group, in dark mode, with the combined expression in the preview panel.](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/docs/images/nested-groups-dark.png)

No Dataverse connection? Import a field schema as Field JSON, a sample payload, JSON Schema, or CSV:

![The Import field schema dialog, with tabs for Field JSON, Sample, Schema, and CSV.](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/docs/images/import-schema.png)

## What It Does

- **Visual condition composer** — nested AND/OR groups and rules, reorderable by drag handle or keyboard-accessible up/down buttons.
- **Live expression preview** — the generated Power Automate expression updates as you build, ready to copy.
- **Dataverse field discovery** — connect to a table and the tool pulls its columns, types, and choice option sets straight from the connected environment.
- **Schema import** — load fields from CSV, JSON, or JSON Schema when you have no live connection.
- **Field profiles** — save a field set and reload it in a later session.
- **Real-time diagnostics** — type mismatches, unknown fields, and unsupported operators are flagged before you paste into a flow.
- **Two expression modes** — Trigger Condition (`triggerBody()`) and Filter array (`item()`).

## Install

1. Open **Power Platform Toolbox** (host API `1.0.17` or later — see the `features.minAPI` manifest field).
2. Go to the **Marketplace**, search for **Expression Builder**, and install it.
3. Open the tool from the tool list. It runs immediately — no configuration, no sign-in of its own.

To use Dataverse field discovery, select an environment connection in the Toolbox before opening the tool. Every other feature (manual fields, schema import, sample fields) works with no connection at all.

## Run — Your First Expression

1. **Load fields** — click **Connect Table** to pull them from Dataverse, **Import a schema** to paste CSV/JSON/JSON Schema, **Add a field manually**, or **Load sample fields** to try it out.
2. **Pick a mode** — *Trigger condition* or *Filter array* in the header.
3. **Add rules** — click a field in the Toolbox to add a rule, then choose an operator and a value. The value editor matches the field type (string, number, boolean, dateTime, choice).
4. **Nest logic** — **+ Group** adds a nested AND/OR group; drag the grip handle or use the up/down buttons to reorder.
5. **Check diagnostics** — the Details pane confirms the expression is valid or explains what is wrong.
6. **Copy** the expression into your flow's trigger condition or Filter array box. **Export** saves the whole document as JSON; **Import** restores it later.

## Permissions & External Connections

- **`cspExceptions`: none.** The tool declares no CSP exceptions and makes no requests to any external domain. It has no telemetry, no analytics, and no backend of its own.
- **Dataverse access** is performed entirely through the host's `dataverseAPI`, scoped to the environment connection you select in the Toolbox. The tool reads table and attribute *metadata* only — it never reads, writes, or deletes records.
- **Storage** is limited to the host's `settings` API (saved field profiles and UI preferences).

## Theme & Accessibility

The tool follows the Power Platform Toolbox app theme automatically — light, dark, and high contrast — via the host `getTheme()` / `onThemeChanged()` APIs. No manual configuration. Reordering, field selection, and every dialog are reachable by keyboard.

## Support & Maintenance

- **Issues and bugs**: [GitHub Issues](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/issues)
- **Maintainer**: Ryan Rettinger (active — see the repository commit history)
- **Source**: [GitHub repository](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB)

## Building From Source

Requires Node `24.17.0` on the `24.x` LTS line, matching the workspace `engines` fields and the root-owned Vite 8 / `@vitejs/plugin-react` 6 toolchain. If you use `nvm`, the repo root includes `.nvmrc`.

```bash
nvm use
npm install          # from the repo root
npm run dev:pptb     # run the PPTB host locally
npm run build:pptb   # emit the PPTB package into apps/pptb/dist
```

The app workspace inherits Vite, TypeScript, and the React plugin from the repo root — do not add duplicate toolchain entries to `apps/pptb`.

Theme edits belong in `packages/builder-ui/src/theme/workbenchTokens.ts`; `fluentTheme.ts` only mirrors that runtime source for compatibility exports. Rebuild with `npm run build:pptb` before loading the package so `dist` includes the latest theme output.

Package layout:

```text
packages/engine:      pure TypeScript expression formatting and diagnostics
packages/platform:    PPTB and web platform adapters
packages/builder-ui:  shared Fluent UI v9 composer
apps/pptb:            Power Platform Toolbox bootstrap
```

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

## Docs

- [PPTB Usage](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/PPTB_USAGE.md)
- [User manual & developer docs](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/USER_MANUAL.md)
