# Power Automate Expression Builder

Power Automate Expression Builder is a React and TypeScript app for building Trigger Condition and Filter array advanced-mode predicates inside the Power Platform Toolbox. It uses a pure expression engine and shared Fluent UI v9 builder UI, with a thin host bootstrap for PPTB.

## Package Boundaries

```text
packages/engine: pure TypeScript expression formatting and diagnostics
packages/platform: PPTB platform adapter
packages/builder-ui: shared Fluent UI v9 Concept C composer
apps/pptb: Power Platform Toolbox bootstrap
```

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

The app workspace inherits Vite, TypeScript, and the React plugin from the repo root. Do not add duplicate toolchain entries to `apps/pptb` unless the workspace layout changes.

## Development

Theme edits belong in `packages/builder-ui/src/theme/workbenchTokens.ts`. `fluentTheme.ts` only mirrors that runtime source for compatibility exports.

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

Build the PPTB host:

```bash
npm run build:pptb
```

Preview a build:

```bash
npm run preview:pptb
```

## Docs

- [Usage](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/usage.md)
- [User manual & developer docs](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/USER_MANUAL.md)
