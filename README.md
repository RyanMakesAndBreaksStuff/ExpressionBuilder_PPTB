# Power Automate Expression Builder

> **Version**: 1.3.1

A visual workbench for Power Automate expressions. Build **Trigger Condition** and **Filter Array** advanced-mode predicates, assemble **Workflow Definition Language function calls**, and turn action or trigger outputs into correctly rooted **JSON references** — with live preview and real-time diagnostics instead of hand-written `@and(...)` syntax.

Ships two ways from one shared codebase: a standalone **web app** ([open it in your browser](https://ryanmakesandbreaksstuff.github.io/ExpressionBuilder_PPTB/)) and a **Power Platform Toolbox (PPTB)** tool.

![Field toolbox on the left, the AND/OR condition canvas in the centre, live diagnostics on the right, and the generated Power Automate expression at the bottom.](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/assets/images/expression-builder.png)

## Three Screens

Three tabs in the header switch between screens. Each screen stays mounted while another is showing, so its state survives switching, and the app reopens on the last screen you used.

| Screen | Use it to |
| --- | --- |
| **Trigger / Filter** | Compose AND/OR groups and rules into a trigger condition (`triggerBody()`) or a Filter array predicate (`item()`), then copy or **Export** the result. |
| **JSON reference** | Paste an action or trigger output, select a value, and copy a correctly rooted reference — `outputs()`, `body()`, `triggerOutputs()`, or `triggerBody()` — plus `item()` / `items()` loop references. |
| **Functions** | Pick one of 99 Workflow Definition Language functions, fill its arguments, nest calls, insert values from your parsed payloads, and copy the expression. |

![Expression Builder header with the Trigger / Filter, JSON reference, and Functions screen tabs above the Trigger / Filter workspace](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/assets/images/screen-tabs.png)

<details>
<summary>More screenshots</summary>

Nested AND/OR groups in the dark theme:

![A nested OR group inside a top-level AND group, in dark mode, with the combined expression in the preview panel.](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/assets/images/nested-groups-dark.png)

Schema import — Field JSON, a sample payload, JSON Schema, or CSV:

![The Import field schema dialog, with tabs for Field JSON, Sample, Schema, and CSV.](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/assets/images/import-schema.png)

Functions — browse the catalog, then insert a parsed path into an argument:

![Functions screen with concat selected, the six catalog groups collapsed, and the Get customer and Get order payload groups with match counts, Get order expanded](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/assets/images/functions-navigation.png)

![concat arguments with a parsed Email reference inserted into text1, type badges, Valid status cards, the generated expression, and the Copy expression button](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/assets/images/function-insertion.png)

JSON reference — search every open payload, and read loop references for an indexed path:

![Search all payloads listing Email matches from both Get customer and Get order, with the selected Email leaf revealed in its payload tree](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/assets/images/multi-payload-search.png)

![Reference card for an indexed path showing the fixed-position note, the item() and items() loop cards, a Loop name of Each customer, and their Copy buttons](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/assets/images/loop-references.png)

An invalid edit while typing keeps the last good tree available:

![JSON reference with an invalid typed edit in Sample JSON, the previous tree still shown, and the status "Could not parse. Showing last successful payload."](https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/main/assets/images/retained-typed-edit.png)

</details>

## Key Features

- **Visual condition composer** — groups (AND/OR), rules, and nested logic in two modes, **Trigger condition** and **Filter array**; reorder by drag handle or keyboard-accessible move buttons. Per-rule **Wrappers** apply `trim`, `toLower`, `toUpper`, `length`, or `coalesce` to the field, and `trim`, `toLower`, and `toUpper` also apply to the typed value.
- **Functions screen** — 99 Workflow Definition Language functions across String, Collection, Logical, Math, Date and time, and Conversion; typed required, optional, and variadic arguments; wrap an argument by choosing a function, or drag a function onto an argument to insert its call; copy the result bare or inside `@{…}`.
- **JSON references** — keep up to five action or trigger outputs open, search across all of them, and copy a correctly rooted reference, bare or inside `@{…}`. Pasted JSON is processed locally and is not uploaded or saved. Samples are strict JSON and parse automatically on paste (or after a 600 ms typing pause), up to 1 MiB, 10,000 values, and 64 nesting levels. See the [user manual](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/USER_MANUAL.md#58-json-references).
- **Parsed Value insertion** — every parsed payload appears in the Functions nav, so a sample path can be dropped into an argument by double-click, Enter, or **Alt+Down**.
- **Live expression preview** — see the generated expression as you build, with validity and argument-set status on the Functions screen.
- **Diagnostics** — real-time validation: type mismatches, unknown fields, unsupported operators, and invalid function arguments.
- **Field discovery** — connect to Dataverse tables (PPTB) to discover fields and types automatically.
- **Schema import** — load fields from Field JSON, a sample payload, JSON Schema, or CSV without a live connection.
- **Field profiles** — save and reload field sets across sessions.
- **Export and import** — save a condition document as JSON and restore it later. Functions and JSON reference state stays in memory and is never added to the export.
- **Graphite theme system** — accessible light and dark semantic tokens on Fluent UI v9; the PPTB tool follows the Toolbox theme automatically.
- **Dockable workspace** — collapsible toolbox and support panes around the central canvas.
- **Contained failures** — if one screen hits a render error, it shows an alert with a **Reset** button and the other screens keep working.

## What's New in 1.3.1

- The **Functions** screen, with a 99-function catalog and a 24-function **Conversion** group.
- A **multi-payload** JSON reference workspace with cross-payload search.
- Three header tabs — **Trigger / Filter** (formerly **Condition builder**), **JSON reference**, and **Functions**.
- The **Graphite** theme.
- Fixes to wrapper scoping, saved-expression import validation, Dataverse fetch caching, and startup error handling.

The full list is in the [changelog](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/CHANGELOG.md).

## Two Deployment Targets

| Target                 | Purpose                                                            | Run                | Build                |
| ---------------------- | ------------------------------------------------------------------ | ------------------ | -------------------- |
| **Web** (`apps/web`)   | Standalone browser app — try it with no Power Platform context     | `npm run dev:web`  | `npm run build:web`  |
| **PPTB** (`apps/pptb`) | Power Platform Toolbox package, published to the PPTB marketplace  | `npm run dev:pptb` | `npm run build:pptb` |

The web build deploys automatically to GitHub Pages on every push to `main` — see [`.github/workflows/deploy-pages.yml`](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/.github/workflows/deploy-pages.yml). To use the PPTB tool, install **Expression Builder** from the Toolbox marketplace; see [PPTB Usage](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/PPTB_USAGE.md).

## Privacy and Permissions

The PPTB tool declares no `cspExceptions` and contacts no external domain. Dataverse access goes through the host adapter and reads table and attribute metadata only — never records. Persistence is limited to saved field profiles, UI preferences, cached Dataverse metadata, and the last-used screen. Pasted JSON is never uploaded or stored. Details are in the [PPTB README](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/apps/pptb/README.md#permissions--external-connections).

## Architecture

Three shared packages, two thin host apps:

```text
┌───────────────────────────────┬───────────────────────────────┐
│  apps/web                     │  apps/pptb                    │
│  Browser host                 │  Power Platform Toolbox host  │
│  createWebAdapter()           │  createPptbAdapter()          │
└───────────────┬───────────────┴───────────────┬───────────────┘
                │                               │
                └───────────────┬───────────────┘
                                │
┌───────────────────────────────┴───────────────────────────────┐
│  packages/builder-ui                                          │
│  Shared Fluent UI v9 screens, workbench, and theme system     │
│  Exports ExpressionBuilderShell, the query document types     │
│  (QueryGroup, QueryRule, ...) and actions (addRule, ...)      │
└───────────────────────────────┬───────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
 ┌──────────────┴──────────────┐ ┌──────────────┴──────────────┐
 │ packages/engine             │ │ packages/platform           │
 │ Pure TypeScript             │ │ PlatformAdapter interface   │
 │ AST + formatter             │ │ Web and PPTB adapters       │
 │ Function catalog            │ │ Clipboard, notify, Dataverse│
 └─────────────────────────────┘ └─────────────────────────────┘
```

**Design principles**

1. **Pure engine** — `packages/engine` has zero UI dependencies; it knows expression AST nodes, field definitions, formatting rules, diagnostics, and the Workflow Definition Language function catalog.
2. **Platform abstraction** — `packages/platform` defines a `PlatformAdapter` interface; web and PPTB implement it differently (clipboard, notifications, settings, Dataverse API access).
3. **Shared UI** — `packages/builder-ui` holds all visual components; the apps are thin bootstraps that inject the right adapter.
4. **Type safety** — every package is TypeScript with `type: "module"`; types flow `engine` → `builder-ui` → `apps`.

## Setup

This workspace requires Node `24.17.0` on the `24.x` LTS line (`engines`: `>=24.17.0 <25`), matching the root-owned Vite 8 / `@vitejs/plugin-react` 6 toolchain.

If you use `nvm`, the repo root includes `.nvmrc`:

```bash
nvm use
```

Install dependencies from the repo root:

```bash
npm install
```

The app workspaces inherit Vite, TypeScript, and the React plugin from the repo root. Do not add duplicate toolchain entries to `apps/web` or `apps/pptb` unless the workspace layout changes.

## Development

Theme edits belong in `packages/builder-ui/src/theme/workbenchTokens.ts`. `fluentTheme.ts` only mirrors that runtime source for compatibility exports.

Run the browser host:

```bash
npm run dev:web
```

Run the Power Platform Toolbox host:

```bash
npm run dev:pptb
```

When loading the Power Platform Toolbox package, rebuild first so the emitted `dist` artifacts include the latest builder-ui theme changes:

```bash
npm run build:pptb
```

## Verification

Run the fast checks from the repo root:

```bash
npm run lint
npm run typecheck
npm test
```

Run end-to-end smoke tests:

```bash
npm run test:e2e
```

[CI](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/.github/workflows/ci.yml) runs lint, typecheck, and unit tests on every pull request and on pushes to `main`. End-to-end tests are not part of CI; run them locally before a release.

## Build

Build both packages and apps:

```bash
npm run build
```

Build individual static hosts:

```bash
npm run build:web
npm run build:pptb
```

Preview a build:

```bash
npm run preview:web
npm run preview:pptb
```

`preview:web` rebuilds the web host before serving `apps/web/dist`, so it reflects the current workspace package output instead of stale preview assets.

## Docs

- [User manual & developer docs](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/USER_MANUAL.md)
- [PPTB Usage](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/PPTB_USAGE.md)
- [PPTB marketplace README](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/apps/pptb/README.md)
- [Changelog](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/CHANGELOG.md) (workspace) and the [PPTB tool changelog](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/apps/pptb/public/CHANGELOG.md)

## Support

Report bugs and request features on [GitHub Issues](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/issues).

## License

[BSD-3-Clause](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/LICENSE)
