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

This workspace requires Node `20.19.0` or newer. The current Vite 8 and `@vitejs/plugin-react` 6 toolchain will not build on Node 18.

Install dependencies from the repo root:

```bash
npm install
```

## Development

Run the browser host:

```bash
npm run dev:web
```

Run the Power Platform Toolbox host:

```bash
npm run dev:pptb
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

## Docs

- [Architecture](docs/architecture.md)
- [Adapter contract](docs/adapter-contract.md)
- [Expression cookbook](docs/expression-cookbook.md)
- [Deployment](docs/deployment.md)
