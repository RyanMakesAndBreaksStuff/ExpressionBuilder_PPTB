# Power Automate Expression Builder

Power Automate Expression Builder is a React and TypeScript workspace for building Trigger Condition and Filter array advanced-mode predicates. It uses a pure expression engine, shared Fluent UI v9 builder UI, and thin host bootstraps for the browser and Power Platform Toolbox.

## Package Boundaries

```text
packages/engine: pure TypeScript expression formatting and diagnostics
packages/platform: web and PPTB platform adapters
packages/builder-ui: shared Fluent UI v9 Concept C composer
apps/web: browser bootstrap only
apps/pptb: Power Platform Toolbox bootstrap only
```

## Setup

This workspace requires Node `18.18.0` or newer, matching the workspace `engines` fields and the root-owned Vite 5 / `@vitejs/plugin-react` 4 toolchain.

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

Preview the browser build:

```bash
npm run preview:web
```

`preview:web` rebuilds the web host before serving `apps/web/dist`, so it reflects the current workspace package output instead of stale preview assets.

## Docs

- [Architecture](docs/architecture.md)
- [Adapter contract](docs/adapter-contract.md)
- [Expression cookbook](docs/expression-cookbook.md)
- [Deployment](docs/deployment.md)
