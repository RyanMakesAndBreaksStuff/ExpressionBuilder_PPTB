# Power Automate Expression Builder

A visual composer for Power Automate **Trigger Condition** and **Filter Array** advanced-mode expressions. Instead of hand-writing `@and(...)` / `@or(...)` predicates, you build conditions in a UI and the app emits valid Power Automate expression syntax — with live preview and real-time diagnostics.

Ships two ways from one shared codebase: a standalone **web app** and a **Power Platform Toolbox (PPTB)** plugin.

## Key Features

- **Visual condition composer** — groups (AND/OR), rules, and nested logic
- **Live expression preview** — see the generated expression as you build
- **Field discovery** — connect to Dataverse tables to auto-discover fields and types
- **Schema import** — load fields from CSV, JSON, or JSON Schema without a live connection
- **Field profiles** — save and reload field sets across sessions
- **Diagnostics** — real-time validation (type mismatches, unknown fields, unsupported operators)
- **Porcelain theme system** — light/dark, glassmorphism UI on Fluent UI v9
- **Dockable workspace** — collapsible toolbox/support panes around the central canvas

## Two Deployment Targets

| Target                 | Purpose                                              | Run                | Build               |
| ---------------------- | ----------------------------------------------------- | ------------------ | -------------------- |
| **Web** (`apps/web`)   | Standalone browser app — try it with no Power Platform context | `npm run dev:web`  | `npm run build:web`  |
| **PPTB** (`apps/pptb`) | Power Platform Toolbox package, published to the PPTB marketplace | `npm run dev:pptb` | `npm run build:pptb` |

The web build deploys automatically to GitHub Pages on every push to `main` — see [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

## Architecture

Three shared packages, two thin host apps:

```text
┌─────────────────────────────────────────────────────────────┐
│  apps/web          │  apps/pptb                              │
│  Browser host       │  Power Platform Toolbox host            │
│  (createWebAdapter) │  (createPptbAdapter)                    │
└─────────┬───────────┴──────────┬───────────────────────────────┘
          │                      │
          └──────────┬───────────┘
                      │
┌─────────────────────┴─────────────────────────────────────┐
│  packages/builder-ui                                       │
│  Shared Fluent UI v9 composer + workbench + theme system   │
│  Exports: ExpressionBuilderShell, queryActions, querySchema │
└─────────────────────┬───────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
   ┌──────┴─────┐ ┌────┴──────┐ ┌───┴───────┐
   │ packages/  │ │ packages/ │ │ packages/ │
   │ engine     │ │ platform  │ │ icons     │
   │ Pure TS    │ │ Platform  │ │ SVG icons │
   │ expression │ │ adapters  │ │           │
   │ formatter  │ │ (web/pptb)│ │           │
   └────────────┘ └───────────┘ └───────────┘
```

**Design principles**

1. **Pure engine** — `packages/engine` has zero UI dependencies; it only knows expression AST nodes, field definitions, and formatting rules.
2. **Platform abstraction** — `packages/platform` defines a `PlatformAdapter` interface; web and PPTB implement it differently (clipboard, notifications, Dataverse API access).
3. **Shared UI** — `packages/builder-ui` holds all visual components; the apps are thin bootstraps that inject the right adapter.
4. **Type safety** — every package is TypeScript with `type: "module"`; types flow `engine` → `builder-ui` → `apps`.

## Setup

This workspace requires Node `24.17.0` on the active `24.x` LTS line, matching the workspace `engines` fields and the root-owned Vite 8 / `@vitejs/plugin-react` 6 toolchain.

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

- [User manual & developer docs](USER_MANUAL.md)
- [Usage (web + PPTB)](usage.md)

## License

[BSD-3-Clause](LICENSE)
