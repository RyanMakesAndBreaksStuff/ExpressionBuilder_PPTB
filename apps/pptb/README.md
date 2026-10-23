# Power Automate Expression Builder

> **Version**: 1.3.1 · **License**: BSD-3-Clause · **Maintainer**: Ryan Rettinger

Build Power Automate **Trigger Condition** and **Filter array** advanced-mode expressions visually, assemble **Workflow Definition Language function calls** from a 103-function catalog, and turn action or trigger outputs into rooted **JSON references** — all inside the Power Platform Toolbox, instead of hand-writing `@and(...)` / `@or(...)` predicates and discovering the syntax errors at runtime.

![The Expression Builder workbench: field toolbox, condition canvas, live diagnostics, and the generated Power Automate expression.](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/assets/images/expression-builder.png)

Nested AND/OR groups, in the Toolbox dark theme:

![A nested OR group inside a top-level AND group, in dark mode, with the combined expression in the preview panel.](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/assets/images/nested-groups-dark.png)

No Dataverse connection? Import a field schema as Field JSON, a sample payload, JSON Schema, or CSV:

![The Import field schema dialog, with tabs for Field JSON, Sample, Schema, and CSV.](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/assets/images/import-schema.png)

## What It Does

- **Visual condition composer** — nested AND/OR groups and rules, reorderable by drag handle or keyboard-accessible up/down buttons; per-rule wrappers apply `toLower`, `toUpper`, `trim`, `length`, or `coalesce` to both operands.
- **Functions screen** — 103 Workflow Definition Language functions in String, Collection, Logical, Math, Date and time, and Conversion groups, with typed and required/optional argument badges, expanding variadic slots, nested calls, drag-to-insert, and live argument validation.
- **Live expression preview** — the generated Power Automate expression updates as you build, ready to copy.
- **Dataverse field discovery** — connect to a table and the tool pulls its columns, types, and choice option sets straight from the connected environment.
- **Schema import** — load fields from CSV, JSON, or JSON Schema when you have no live connection.
- **Field profiles** — save a field set and reload it in a later session.
- **Real-time diagnostics** — type mismatches, unknown fields, unsupported operators, and invalid function arguments are flagged before you paste into a flow.
- **Two condition modes** — Trigger Condition (`triggerBody()`) and Filter array (`item()`).
- **JSON reference builder** — keep up to five action or trigger outputs open, search across them, select any value in a tree, and copy a correctly rooted reference such as `outputs('Get_items')?['body']?['value'][0]?['Title']`, bare or as `@{…}` for text. Parsed values can be inserted into Functions arguments by double-click, Enter, or **Alt+Down**.

## Install

1. Open **Power Platform Toolbox** (host API `1.0.17` or later — see the `features.minAPI` manifest field).
2. Go to the **Marketplace**, search for **Expression Builder**, and install it.
3. Open the tool from the tool list. It runs immediately — no configuration, no sign-in of its own.

To use Dataverse field discovery, select an environment connection in the Toolbox before opening the tool. Every other feature (manual fields, schema import, sample fields) works with no connection at all.

## Run — Your First Expression

1. **Load fields** — click **Connect Table** to pull them from Dataverse, **Import a schema** to paste CSV/JSON/JSON Schema, **Add a field manually**, or **Load sample fields** to try it out.
2. **Pick a screen and mode** — open **Trigger / Filter** with the header's mode chip, then choose _Trigger condition_ or _Filter array_. **Functions** and **JSON reference** are one chip click away.
3. **Add rules** — click a field in the Toolbox to add a rule, then choose an operator and a value. The value editor matches the field type (string, number, boolean, dateTime, choice).
4. **Nest logic** — **+ Group** adds a nested AND/OR group; drag the grip handle or use the up/down buttons to reorder.
5. **Check diagnostics** — the Details pane confirms the expression is valid or explains what is wrong.
6. **Copy** the expression into your flow's trigger condition or Filter array box. **Export** saves the whole document as JSON; **Import**, under the header's `···` menu, restores it later.

Other screens:

- **Functions** — choose from 103 functions in six groups, fill typed/required/optional/variadic arguments, nest calls by click or drag, and copy the call bare or as `@{…}`. Parsed Value is one **Alt+Down** away from any argument.
- **JSON reference** — keep up to five payloads open, paste up to 1 MiB / 10,000 values / 64 levels of strict JSON, switch cards with the arrow keys, search across all payloads, and copy the selected reference.

## Permissions & External Connections

- **`cspExceptions`: none.** The tool declares no CSP exceptions and makes no requests to any external domain. It has no telemetry, no analytics, and no backend of its own.
- **Dataverse access** is performed entirely through the host's `dataverseAPI`, scoped to the environment connection you select in the Toolbox. The tool reads table and attribute _metadata_ only — it never reads, writes, or deletes records.
- **Storage** is limited to the host's `settings` API (saved field profiles and UI preferences).
- **Pasted JSON** in the JSON reference builder (up to five payloads) is processed locally and is not uploaded or saved by this feature. It is never written to the host `settings` API, and it is gone when the tool reloads.

## Theme & Accessibility

The tool follows the Power Platform Toolbox app theme automatically — light, dark, and high contrast — via the host `getTheme()` / `onThemeChanged()` APIs. No manual configuration. Reordering, field selection, function arguments, payload tabs (arrow/Home/End), and every dialog are reachable by keyboard; **Alt+Down** moves from a Functions argument to Parsed Value.

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
packages/engine:      pure TypeScript expression formatting, diagnostics, and the Workflow Definition Language function catalog
packages/platform:    PPTB and web platform adapters
packages/builder-ui:  shared Fluent UI v9 screens: Trigger / Filter, JSON reference, Functions
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
- [Changelog](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/CHANGELOG.md)
