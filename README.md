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

Install dependencies from the repo root:

```powershell
npm install
```

## Development

Run the browser host:

```powershell
npm run dev:web
```

Run the Power Platform Toolbox host:

```powershell
npm run dev:pptb
```

## Verification

Run the fast checks from the repo root:

```powershell
npm run lint
npm run typecheck
npm test
```

Run end-to-end smoke tests:

```powershell
npm run test:e2e
```

## Build

Build both packages and apps:

```powershell
npm run build
```

Build individual static hosts:

```powershell
npm run build:web
npm run build:pptb
```

Preview the browser build:

```powershell
npm run preview:web
```

## Docs

- [Architecture](docs/architecture.md)
- [Adapter contract](docs/adapter-contract.md)
- [Expression cookbook](docs/expression-cookbook.md)
- [Deployment](docs/deployment.md)
