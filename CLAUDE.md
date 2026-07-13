# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Toolchain & Setup

- Node `>=24.17.0 <25` is required (`.nvmrc`, root `engines`). Use `nvm use` if available.
- Package manager: **npm** with workspaces (`apps/*`, `packages/*`).
- Install from the repo root: `npm install`.
- Do not duplicate toolchain deps in `apps/web` or `apps/pptb`; they inherit Vite/TypeScript/React plugin from the root.

## Common Commands

Run all commands from the repo root unless noted.

```bash
# Development servers
npm run dev:web          # browser host → http://127.0.0.1:5173
npm run dev:pptb         # Power Platform Toolbox host → http://127.0.0.1:5174

# Verification
npm run lint             # eslint .
npm run typecheck        # tsc -b
npm test                 # vitest run (excludes tests/e2e)
npm run test:e2e         # playwright test

# Build
npm run build            # tsc -b + build all workspaces
npm run build:web        # browser host only
npm run build:pptb       # PPTB host only
npm run preview:web      # build:web then preview apps/web/dist

# Single test file / workspace
npm test -- packages/engine/src/formatter.test.ts
npx vitest run packages/builder-ui/src/app/queryActions.test.ts
npm run test -w @ryanmakes/eb_engine
```

## Workspace Architecture

Monorepo with three shared packages and two thin app hosts.

```text
packages/engine:    pure TypeScript expression formatting and diagnostics
packages/platform:  web and PPTB platform adapters
packages/builder-ui: shared Fluent UI v9 composer
apps/web:           browser bootstrap only
apps/pptb:          Power Platform Toolbox bootstrap only
```

Dependency direction is strict:

- `packages/engine` must import **no** React, DOM, Fluent UI, or platform code.
- `packages/platform` owns the host contract (`PlatformAdapter`) and host-specific implementations. Browser APIs live only in `webAdapter.ts`; `window.toolboxAPI` and `window.dataverseAPI` live only in `pptbAdapter.ts` and the PPTB bootstrap.
- `packages/builder-ui` consumes `engine` and `platform` and owns all UI.
- `apps/*` only create the right adapter and render `ExpressionBuilderShell`.

Key entry points and data paths:

- `packages/engine/src/index.ts` — AST types, `formatExpression`, operator matrix.
- `packages/platform/src/index.ts` — `PlatformAdapter`, `createWebAdapter`, `createPptbAdapter`.
- `packages/builder-ui/src/index.ts` — `ExpressionBuilderShell`, `QueryDocument`, tree actions.
- `packages/builder-ui/src/app/ExpressionBuilderShell.tsx` — top-level state, dialogs, adapter orchestration, theme.
- `packages/builder-ui/src/composer/queryActions.ts` — immutable document mutations (`addRule`, `updateRule`, `moveNode`, etc.).
- `packages/builder-ui/src/app/builderState.ts` — derives live expression/diagnostics from the document.
- `packages/builder-ui/src/app/sourceState.ts` — field-source lifecycle, cache, drift, orphan detection.
- `packages/builder-ui/src/theme/workbenchTokens.ts` — source of truth for the runtime palette and Fluent theme.

## Build & Theme Gotchas

- `packages/builder-ui` builds with `tsc -b` and then manually copies `src/theme/tokens.css` to `dist/theme/tokens.css`. Consumers resolve the CSS relative to the emitted JS.
- Theme edits belong in `packages/builder-ui/src/theme/workbenchTokens.ts`. `fluentTheme.ts` only mirrors it for compatibility exports.
- After theme changes, rebuild `builder-ui` and any host that bundles it (especially `apps/pptb`) so emitted `dist` artifacts are fresh.
- Vite configs in `apps/web` and `apps/pptb` alias workspace packages directly to `packages/*/src/index.ts`, so dev builds use fresh source/CSS without pre-building packages.
- PPTB build emits an IIFE bundle with `inlineDynamicImports`, `base: './'`, and a custom Vite plugin that rewrites the HTML for iframe/srcdoc compatibility. The HTML rewrite is gated to `apply: 'build'` only.

## Quality, Accessibility & React Conventions

Preserved from the 2026-07-10 full review and remediation plan:

- **Keyboard accessibility**: every interactive element must be keyboard-operable. Icon-only buttons must have an accessible name (`ActionButton` enforces this).
- **ARIA pattern completeness**: if a widget claims `role="tablist"`/`role="listbox"`, implement the full pattern (roving tabindex, arrow keys, `aria-controls`) or drop to plain buttons.
- **`aria-expanded`** belongs on the controlling toggle button, not on landmark/region containers.
- **React purity**: never call `setState`, open dialogs, or issue other side effects inside a `setState` updater. Compute side-effect inputs first, then issue sibling state updates.
- **Touched-gated validation**: do not show pristine validation errors; wait for blur/submit.
- **Dead code**: confirm zero references with `grep` before deleting symbols or components.
- **Bounded concurrency**: Dataverse metadata fetches must not burst unbounded; use a small pool (see `pptbAdapter.ts`).
- **Error handling**: async actions (`copyExpression`, discovery chains) need `try/catch` or `.catch` plus user-visible error feedback via `adapter.notify`.

## Platform/Dataverse Specifics

- Dataverse choice labels require expanding `OptionSet` when fetching `Attributes`. The call must pass the third argument:
  ```ts
  dv.getEntityRelatedMetadata(table, 'Attributes', '$expand=OptionSet')
  ```
  Regression tests must assert this exact argument; removing it must make tests fail.
- `packages/platform/src/dataverseMetadata.ts` maps `AttributeMetadata` into `FieldDefinition[]` and reads `attr.OptionSet?.Options`.
- Browser-only notifications are surfaced visibly in `webAdapter.ts` via a DOM toast, not `console.log`.

## Workflow & Self-Improvement

- Enter plan mode for any non-trivial task (3+ steps or architectural decisions). If work goes sideways, stop and re-plan.
- Write plans to `tasks/plan.md` (not `tasks/todo.md`, which is ignored by `.gitignore`).
- Use subagents liberally for exploration and parallel analysis.
- After any user correction, update `tasks/lessons.md` with the pattern.
- Never mark a task complete without proving it works: run `typecheck`, `lint`, `test`, and the relevant build. For UI changes, exercise the real host when possible.
- Prefer simple, minimal-impact fixes. Find root causes, not workarounds.

## Line Endings

`.gitattributes` enforces LF. If CRLF phantom diffs appear, renormalize rather than hand-editing files:

```bash
git add --renormalize .
```

## Output Style

When `lean-ctx` is active, prefer the MCP tools (`ctx_read`, `ctx_search`, `ctx_shell`, etc.) over native file/search/shell equivalents. Keep responses concise: bullet points, one-sentence explanations, then code/action.
