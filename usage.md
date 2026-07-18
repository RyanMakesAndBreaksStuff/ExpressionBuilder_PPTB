# Usage

## Table of Contents

- [Web (apps/web)](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/usage.md#web-appsweb)
- [Power Platform Toolbox plugin (apps/pptb)](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/usage.md#power-platform-toolbox-plugin-appspptb)
- [Shared](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/usage.md#shared)

## Web (`apps/web`)

Standalone browser build of Expression Builder.

```bash
npm run dev:web       # dev server, http://127.0.0.1:5173
npm run build:web     # tsc -b + vite build
npm run preview:web   # build then serve prod build on :4173
```

## Power Platform Toolbox plugin (`apps/pptb`)

Same builder packaged as a Power Platform Toolbox (PPTB) plugin. Entry point `index.html` / `src/main.tsx`, uses `@pptb/types` for the host API (see [`src/toolboxApi.d.ts`](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/apps/pptb/src/toolboxApi.d.ts)).

```bash
npm run dev:pptb       # dev server, http://127.0.0.1:5174
npm run build:pptb     # tsc -b + vite build
npm run preview:pptb   # serve prod build on :4174
npm run validate -w @ryanmakes/expressionbuilder_pptb   # pptb-validate manifest check
```

Load into PPTB by pointing it at the plugin's built output / manifest per PPTB's plugin-loading docs.

## Shared

```bash
npm run build      # build all workspaces
npm test           # vitest unit tests
npm run test:e2e   # playwright
npm run lint
npm run typecheck
```

Both apps share [`packages/builder-ui`](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/tree/main/packages/builder-ui) and [`packages/platform`](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/tree/main/packages/platform) (`@ryanmakes/eb_platformadapter` abstracts host differences between web and PPTB).

## See also

- [README](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/README.md)
- [User manual & developer docs](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/USER_MANUAL.md)
