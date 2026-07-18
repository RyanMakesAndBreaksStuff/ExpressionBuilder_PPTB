# Power Automate Expression Builder — User Manual & Developer Documentation

> **Version**: 1.0.0 | **Last updated**: 2025-07-03 | **Node**: `24.17.0` | **React**: `19.2.6`

---

## Table of Contents

1. [What Is This?](#1-what-is-this)
2. [Architecture Overview](#2-architecture-overview)
3. [Project Structure](#3-project-structure)
4. [Getting Started](#4-getting-started)
5. [Using the Expression Builder](#5-using-the-expression-builder)
6. [Package Reference](#6-package-reference)
7. [Development Workflow](#7-development-workflow)
8. [Testing](#8-testing)
9. [Deployment](#9-deployment)
10. [Troubleshooting](#10-troubleshooting)
11. [Appendix: Glossary](#11-appendix-glossary)

---

## 1. What Is This?

**Power Automate Expression Builder** is a React/TypeScript application for building **Trigger Condition** and **Filter Array** advanced-mode predicates for Power Automate flows. Instead of hand-writing complex `@and(...)` / `@or(...)` expressions, you use a visual composer to build conditions, which the app translates into valid Power Automate expression syntax.

### Two Deployment Targets

| Target                 | Purpose                                                       | How to Run         |
| ---------------------- | ------------------------------------------------------------- | ------------------ |
| **Web** (`apps/web`)   | Standalone browser app for testing and development            | `npm run dev:web`  |
| **PPTB** (`apps/pptb`) | Power Platform Toolbox package for Power Automate integration | `npm run dev:pptb` |

### Key Features

- **Visual condition composer** — Drag-and-drop style condition builder with groups (AND/OR), rules, and nested logic.
- **Live expression preview** — See the generated Power Automate expression as you build.
- **Field discovery** — Connect to Dataverse tables to auto-discover fields and their types.
- **Schema import** — Import fields from CSV, JSON, or JSON Schema when you don't have a live connection.
- **Field profiles** — Save and reload field sets for reuse across sessions.
- **Diagnostics** — Real-time validation with actionable error messages (type mismatches, unknown fields, unsupported operators).
- **Six-palette theme system** — Porcelain light/dark themes with glassmorphism UI, adapted from Fluent UI v9.
- **Dockable workspace** — Collapsible left toolbox and right support panes around the central canvas.

---

## 2. Architecture Overview

The workspace follows a **layered architecture** with three shared packages and two thin host apps.

```text
┌─────────────────────────────────────────────────────────────┐
│  apps/web          │  apps/pptb                               │
│  Browser host      │  Power Platform Toolbox host              │
│  (createWebAdapter)│  (createPptbAdapter)                     │
└─────────┬──────────┴──────────┬────────────────────────────────┘
          │                   │
          │  ┌────────────────┘
          │  │
┌─────────┴──┴──────────────────────────────────────────────┐
│  packages/builder-ui                                       │
│  Shared Fluent UI v9 composer + workbench + theme system   │
│  Exports: ExpressionBuilderShell, queryActions, querySchema│
└─────────────────────────────────────────────────────────────┘
          │
          ├──────────┬──────────┐
          │          │          │
┌─────────┴──┐ ┌──────┴────┐ ┌──┴────────┐
│  packages  │ │  packages │ │  packages │
│  /engine   │ │  /platform│ │  /icons   │
│  Pure TS   │ │  Platform │ │  (SVG     │
│  expression│ │  adapters │ │  icons)   │
│  formatter │ │  (web/pptb)│ │           │
│  + types   │ │  + metadata│ │           │
└────────────┘ └───────────┘ └───────────┘
```

### Design Principles

1. **Pure engine** — `packages/engine` has zero UI dependencies. It only knows about expression AST nodes, field definitions, and formatting rules.
2. **Platform abstraction** — `packages/platform` defines a `PlatformAdapter` interface. The web and PPTB hosts implement this differently (clipboard, notifications, Dataverse API access).
3. **Shared UI** — `packages/builder-ui` contains all visual components. The two apps are thin bootstraps that inject the correct adapter and render the shell.
4. **Type safety** — All packages are TypeScript with `type: "module"`. Shared types flow from `engine` → `builder-ui` → `apps`.

---

## 3. Project Structure

```
ExpressionBuilder/
├── apps/
│   ├── web/                    # Browser host (Vite, React)
│   │   └── src/
│   │       └── main.tsx        # Renders ExpressionBuilderShell with web adapter
│   └── pptb/                   # Power Platform Toolbox host
│       ├── package.json        # PPTB manifest (keywords, license, configs)
│       └── src/
│           └── main.tsx        # Renders ExpressionBuilderShell with PPTB adapter
├── packages/
│   ├── engine/                 # Pure TypeScript expression engine
│   │   └── src/
│   │       ├── formatter.ts    # AST → Power Automate expression string
│   │       ├── types.ts        # FieldDefinition, ExpressionNode, etc.
│   │       ├── diagnostics.ts  # Error/warning diagnostic codes
│   │       ├── operators.ts    # Operator support matrix by field type
│   │       ├── functions.ts    # Function call validation and return types
│   │       ├── literals.ts     # Literal value formatting
│   │       └── fieldReferences.ts  # Field reference formatting by mode
│   ├── platform/               # Platform adapters and metadata
│   │   └── src/
│   │       ├── PlatformAdapter.ts  # Adapter interface contract
│   │       ├── webAdapter.ts   # Web host implementation
│   │       ├── pptbAdapter.ts  # PPTB host implementation
│   │       ├── dataverseMetadata.ts  # Dataverse attribute mapping
│   │       └── dataverseApi.ts     # Dataverse API types
│   └── builder-ui/             # Shared Fluent UI composer
│       └── src/
│           ├── app/
│           │   ├── ExpressionBuilderShell.tsx  # Main app shell (state + layout)
│           │   ├── builderState.ts             # Derived state (expression, diagnostics)
│           │   ├── sourceState.ts              # Field source discovery + cache
│           │   └── sampleData.ts               # Demo field set
│           ├── components/       # Small reusable UI components
│           ├── composer/
│           │   ├── querySchema.ts    # QueryDocument, QueryGroup, QueryRule types
│           │   └── queryActions.ts   # Document mutations (addRule, deleteNode, etc.)
│           ├── importExport/
│           │   ├── csvImport.ts          # CSV field import
│           │   ├── fieldImport.ts        # Field profile management
│           │   ├── jsonSchemaImport.ts   # JSON Schema import
│           │   └── savedExpressionSchema.ts  # Save/load expression JSON
│           ├── theme/
│           │   ├── workbenchTokens.ts  # Six-palette design token system
│           │   ├── fluentTheme.ts      # FluentProvider theme factory
│           │   └── tokens.css            # CSS custom properties
│           └── workbench/          # Workbench panels and dialogs
│               ├── ConditionCanvas.tsx       # Central drag/drop canvas
│               ├── WorkbenchHeader.tsx       # Top command bar
│               ├── FieldToolboxPane.tsx      # Left field/toolbox panel
│               ├── SupportPane.tsx           # Right diagnostics/help panel
│               ├── ExpressionDocumentPanel.tsx  # Bottom expression preview
│               ├── ImportSchemaDialog.tsx    # Import schema dialog
│               ├── TablePickerDialog.tsx     # Dataverse table picker
│               └── ... (more dialogs and panels)
├── tests/                        # E2E test specs
├── icons/                        # Custom SVG icon library
├── ui-ux/                        # Design reference files
├── package.json                  # Root workspace manifest
├── tsconfig.base.json            # Shared TypeScript config
├── vitest.config.ts              # Unit test config
└── playwright.config.ts          # E2E test config
```

---

## 4. Getting Started

### Prerequisites

| Requirement        | Version                            | Purpose                             |
| ------------------ | ---------------------------------- | ----------------------------------- |
| **Node.js**        | `24.17.0` (on the `24.x` LTS line) | Runtime and build toolchain         |
| **npm**            | Bundled with Node                  | Package management and workspaces   |
| **nvm** (optional) | Latest                             | Node version switching via `.nvmrc` |
| **Git**            | Any                                | Version control                     |

### Must Know

- **React 19** and **TypeScript 6** — The UI is built with React function components and hooks.
- **Fluent UI v9** (`@fluentui/react-components`) — Microsoft's design system for the component library.
- **Vite 8** — Build tool and dev server. No Webpack, no Create React App.
- **Power Automate expressions** — Familiarity with `@and()`, `@or()`, `@equals()`, `@contains()`, etc. is helpful but not required.

### Nice to Know

- **Dataverse / Dynamics 365** — Understanding tables, attributes, and relationships helps when using the field discovery features.
- **Power Platform Toolbox** — The PPTB host runs inside the Power Platform Toolbox desktop app.

### Installation

```bash
# 1. Switch to the correct Node version (if using nvm)
nvm use

# 2. Install dependencies from the repo root
npm install
```

### Verify Installation

```bash
# Check TypeScript compilation
npm run typecheck

# Run unit tests
npm test

# Run linting
npm run lint
```

All three commands should pass before you begin development.

---

## 5. Using the Expression Builder

### 5.1 Launch the App

```bash
# Browser host (standalone, no Dataverse connection)
npm run dev:web
# Opens at http://127.0.0.1:5173

# PPTB host (requires Power Platform Toolbox context)
npm run dev:pptb
# Opens at http://127.0.0.1:5174
```

### 5.2 The Workbench Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  WorkbenchHeader                                                  │
│  [Mode: Trigger Condition ▼] [🌙Theme] [Export] [Import] [Copy]   │
├──────────────────┬────────────────────────┬───────────────────────┤
│                  │                        │                       │
│  FieldToolbox    │    ConditionCanvas     │    SupportPane        │
│  (Left Dock)     │    (Center)            │    (Right Dock)       │
│                  │                        │                       │
│  • Table Picker  │    ┌─ AND ─┐          │    • Diagnostics      │
│  • Field List    │    │ Rule 1 │          │    • Expression Help  │
│  • Import/Export │    │ Rule 2 │          │    • Onboarding       │
│  • Sample Data   │    └─ OR ──┘          │                       │
│                  │                        │                       │
├──────────────────┴────────────────────────┴───────────────────────┤
│  ExpressionDocumentPanel                                          │
│  @and(equals(triggerBody()['status'], 'active'), ...)             │
│  [Copy] [Collapse]                                                │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Building Your First Expression

#### Step 1: Load Fields

- **Option A — Connect to Dataverse** (PPTB only): Click **Connect Table** → select a table → click **Confirm**. The app discovers all fields and their types.
- **Option B — Import a schema**: Click **Import** → paste CSV, JSON, or JSON Schema.
- **Option C — Use sample data**: Click **Load Samples** to populate demo fields.
- **Option D — Add manually**: Click **Add Field** and define fields one by one.

#### Step 2: Add Conditions

1. Click a field in the **Field Toolbox** — a new rule is added to the active group.
2. Select an **operator** from the dropdown (e.g., `equals`, `contains`, `greaterThan`).
3. Enter a **value** — the type is validated (string, number, boolean, dateTime, choice).
4. Click **+ Add Group** to create nested AND/OR logic.

#### Step 3: Review the Expression

The **Expression Preview** panel at the bottom updates live as you edit. The generated expression follows Power Automate syntax:

```
@and(
  equals(triggerBody()['status'], 'active'),
  or(
    greaterThan(triggerBody()['createdon'], '2025-01-01'),
    contains(triggerBody()['email'], '@contoso.com')
  )
)
```

#### Step 4: Copy or Export

- **Copy** — Copies the expression to your clipboard for pasting into Power Automate.
- **Export** — Copies the entire document as JSON (rules + fields) so you can reload it later.
- **Import** — Paste exported JSON to restore a saved expression.

### 5.4 Expression Modes

| Mode                  | Use Case                      | Generated Expression Target |
| --------------------- | ----------------------------- | --------------------------- |
| **Trigger Condition** | Filter when a flow should run | `triggerBody()` references  |
| **Filter Array**      | Filter items in an array      | `item()` references         |

Switch modes via the dropdown in the **Workbench Header**. The expression syntax changes automatically.

### 5.5 Field Types & Supported Operators

| Field Type | Supported Operators                                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| `string`   | `equals`, `notEquals`, `contains`, `startsWith`, `endsWith`, `empty`, `notEmpty`                                      |
| `number`   | `equals`, `notEquals`, `greaterThan`, `greaterThanOrEquals`, `lessThan`, `lessThanOrEquals`                           |
| `boolean`  | `equals`                                                                                                              |
| `dateTime` | `equals`, `notEquals`, `greaterThan`, `greaterThanOrEquals`, `lessThan`, `lessThanOrEquals` (with `ticks()` wrapping) |
| `choice`   | `equals`, `notEquals`                                                                                                 |

### 5.6 Function Wrappers

Apply string transformations to both operands using the **Wrappers** feature:

- `trim()` — Removes leading/trailing whitespace
- `toLower()` / `toUpper()` — Case conversion
- `coalesce()` — Null-safe fallback

> ⚠️ The engine warns if you wrap a nullable field with `toLower`/`toUpper`/`trim` without `coalesce` first — this prevents runtime null errors in Power Automate.

### 5.7 Common Workflows

#### Switch Data Source

1. Click **Switch Table** in the left panel.
2. Select a new table and click **Confirm**.
3. If existing rules reference fields not in the new table, the **Switch Source Dialog** appears:
   - **Keep rules** — Retains all rules; orphaned fields show as "unknown" in diagnostics.
   - **Remove affected rules** — Deletes rules that would become invalid.

#### Refresh Fields (Detect Schema Changes)

1. Click **Refresh** in the left panel.
2. The app fetches the latest schema and compares it to the cached version.
3. If fields were added, removed, or changed, the **Source Updated Dialog** shows a drift summary.

#### Manage Field Profiles

1. Click **Manage Profiles** in the left panel.
2. Save the current field set with a name.
3. Load a saved profile later to quickly switch between schemas.

---

## 6. Package Reference

### 6.1 `packages/engine` — Expression Engine

Pure TypeScript. No React, no DOM, no UI.

```typescript
import { formatExpression } from "@ryanmakes/eb_engine";

const result = formatExpression(astNode, {
  mode: "triggerCondition",
  fields: fieldDefinitions,
});

// result.expression  → "@and(equals(triggerBody()['status'], 'active'))"
// result.diagnostics → [{ code: 'TYPE_MISMATCH', severity: 'error', ... }]
// result.returnType  → 'boolean'
```

**Key exports:**

| Export                    | Purpose                                               |
| ------------------------- | ----------------------------------------------------- |
| `formatExpression`        | AST → Power Automate expression string                |
| `formatFieldReference`    | Field → `triggerBody()['field']` or `item()['field']` |
| `formatLiteral`           | Value → quoted/unquoted literal string                |
| `OPERATORS_BY_FIELD_TYPE` | Which operators each field type supports              |
| `FormatDiagnostic`        | Type for validation errors/warnings                   |

### 6.2 `packages/platform` — Platform Adapters

Defines the contract between the UI and the host environment.

```typescript
import {
  createWebAdapter,
  createPptbAdapter,
} from "@ryanmakes/eb_platformadapter";

// Web (browser)
const webAdapter = createWebAdapter();

// PPTB (Power Platform Toolbox)
const pptbAdapter = createPptbAdapter(window.toolboxAPI);
```

**PlatformAdapter interface:**

| Method                            | Purpose                                |
| --------------------------------- | -------------------------------------- |
| `copyToClipboard(text)`           | Copy expression to clipboard           |
| `notify(message, level)`          | Show toast notification                |
| `getTheme()` / `onThemeChanged()` | Light/dark/high-contrast theme         |
| `settings.get/set/remove`         | Persistent key-value storage           |
| `discoverFields(options)`         | Discover fields from a connected table |
| `getTables()`                     | List available Dataverse tables        |
| `getRelatedTables()`              | Get one-hop navigation properties      |
| `discoverRelatedFields()`         | Expand a related table's fields        |

### 6.3 `packages/builder-ui` — Shared UI Composer

The main application shell and all visual components.

```typescript
import { ExpressionBuilderShell } from '@ryanmakes/eb_builder-ui';

<ExpressionBuilderShell
  adapter={adapter}
  platform="pptb"
  initialDocument={savedDocument}
/>
```

**Props:**

| Prop              | Type              | Required | Description                                                |
| ----------------- | ----------------- | -------- | ---------------------------------------------------------- |
| `adapter`         | `PlatformAdapter` | ✅       | Host environment adapter                                   |
| `platform`        | `'web' \| 'pptb'` | ❌       | `'pptb'` (default) — affects table connection availability |
| `initialDocument` | `QueryDocument`   | ❌       | Pre-load a saved expression document                       |

---

## 7. Development Workflow

### 7.1 Running Dev Servers

```bash
# Web host (no Dataverse — import/manual fields only)
npm run dev:web

# PPTB host (full features — requires Power Platform Toolbox context)
npm run dev:pptb
```

### 7.2 Making Theme Changes

Theme edits belong in **`packages/builder-ui/src/theme/workbenchTokens.ts`**. The `fluentTheme.ts` file only mirrors that runtime source for compatibility exports.

```bash
# After theme changes, rebuild the PPTB package so dist includes the latest CSS
npm run build:pptb
```

### 7.3 Adding a New Dialog / Panel

1. Create the component in `packages/builder-ui/src/workbench/`.
2. Add state management in `ExpressionBuilderShell.tsx` (dialog open state + handler).
3. Wire it into the JSX of `ExpressionBuilderShell`.
4. If it needs document mutations, add an action in `composer/queryActions.ts`.

### 7.4 Adding a New Operator

1. Add the operator to `packages/engine/src/operators.ts` in the appropriate field type list.
2. Add formatting logic in `packages/engine/src/formatter.ts` if the operator needs special handling.
3. Update the UI operator dropdown in `packages/builder-ui/src/workbench/RuleRowEditor.tsx`.

### 7.5 Code Quality Checks

```bash
# TypeScript type checking
npm run typecheck

# ESLint
npm run lint

# Unit tests (Vitest)
npm test

# E2E tests (Playwright)
npm run test:e2e
```

Run all four before committing.

---

## 8. Testing

### 8.1 Unit Tests (Vitest)

Tests live alongside source files (`*.test.ts`) or in `test/` directories.

```bash
# Run all unit tests
npm test

# Run with watch mode
npx vitest

# Run a specific package's tests
npm run test -w @ryanmakes/eb_engine
npm run test -w @ryanmakes/eb_builder-ui
```

**Key test files:**

| File                                                                 | What it tests                     |
| -------------------------------------------------------------------- | --------------------------------- |
| `packages/engine/src/formatter.test.ts`                              | Expression formatting correctness |
| `packages/builder-ui/src/importExport/csvImport.test.ts`             | CSV parsing edge cases            |
| `packages/builder-ui/src/importExport/fieldImport.test.ts`           | Field profile serialization       |
| `packages/builder-ui/src/importExport/inferFromSample.test.ts`       | Type inference from sample data   |
| `packages/builder-ui/src/importExport/jsonSchemaImport.test.ts`      | JSON Schema → FieldDefinition     |
| `packages/builder-ui/src/importExport/savedExpressionSchema.test.ts` | Document save/load round-trip     |

### 8.2 E2E Tests (Playwright)

End-to-end tests verify the full application in a real browser.

```bash
# Run E2E tests
npm run test:e2e

# Run in headed mode (visible browser)
npx playwright test --headed

# Run a specific test file
npx playwright test tests/smoke.spec.ts
```

### 8.3 Writing New Tests

**Unit test pattern:**

```typescript
import { describe, it, expect } from "vitest";
import { formatExpression } from "./formatter";

describe("formatExpression", () => {
  it("formats a simple equals rule", () => {
    const result = formatExpression(simpleRuleNode, {
      mode: "triggerCondition",
      fields: [
        { id: "status", label: "Status", type: "string", path: ["status"] },
      ],
    });
    expect(result.expression).toBe(
      "@equals(triggerBody()['status'], 'active')",
    );
    expect(result.diagnostics).toHaveLength(0);
  });
});
```

---

## 9. Deployment

### 9.1 Web Build (GitHub Pages)

```bash
# Build the browser host
npm run build:web

# Preview locally
npm run preview:web

# Deploy the contents of apps/web/dist/ to GitHub Pages
```

The `apps/web/dist` directory is a static Vite build containing `index.html` + hashed asset files.

### 9.2 PPTB Build (Power Platform Toolbox)

```bash
# Build the PPTB package
npm run build:pptb

# The output in apps/pptb/dist/ is the PPTB static package
```

**Important:** After any `builder-ui` theme or CSS changes, rebuild the PPTB package before loading it into Power Platform Toolbox. The `dist` artifacts must be fresh.

```bash
npm run build:pptb
```

### 9.3 Build Everything

```bash
npm run build
```

This builds all packages and both apps in dependency order.

---

## 10. Troubleshooting

### Error 1: `npm install` fails with engine mismatch

**Full error message:**

```
npm ERR! notsup Required: {"node":">=24.17.0 <25"}
npm ERR! notsup Actual:   {"npm":"10.x","node":"22.x"}
```

**Cause:** Your Node.js version is too old. This workspace requires Node 24.17.0 on the 24.x LTS line.

**Solution:**

```bash
# If using nvm
nvm install 24.17.0
nvm use 24.17.0

# Verify
node --version  # Should print v24.17.0
```

**Verify the fix:**

```bash
npm install
```

---

### Error 2: `npm run typecheck` fails with TS2307 (module not found)

**Full error message:**

```
error TS2307: Cannot find module '@ryanmakes/eb_engine' or its corresponding type declarations.
```

**Cause:** The workspace packages haven't been built yet. TypeScript project references require the `dist` output to exist before cross-package imports resolve.

**Solution:**

```bash
# Build all packages once
npm run build

# Or build just the engine package
cd packages/engine && npm run build
```

**Verify the fix:**

```bash
npm run typecheck
```

---

### Error 3: `npm run dev:web` shows a blank page

**Cause:** The Vite dev server is running but the builder-ui package hasn't been built, so the import resolution fails silently.

**Solution:**

```bash
# Build the shared packages first
npm run build

# Then start the dev server
npm run dev:web
```

**Verify the fix:** Open `http://127.0.0.1:5173` — the Expression Builder UI should appear.

---

### Error 4: PPTB build fails with `pptb-validate` not found

**Full error message:**

```
'pptb-validate' is not recognized as an internal or external command
```

**Cause:** The `pptb-validate` tool is not installed globally or not in your PATH. This tool is only needed for packaging, not for development.

**Solution:**

```bash
# Skip the validate step during development
npm run build:pptb

# Or install the PPTB CLI globally (if available)
```

**Verify the fix:** Check that `apps/pptb/dist/index.html` exists.

---

### Error 5: Theme colors look wrong after editing `workbenchTokens.ts`

**Cause:** The CSS file `tokens.css` is copied during build, but the dev server may be serving a stale version.

**Solution:**

```bash
# Rebuild the builder-ui package to copy the fresh CSS
cd packages/builder-ui && npm run build

# Or rebuild everything
npm run build
```

**Verify the fix:** Hard-refresh the browser (`Ctrl+Shift+R` or `Cmd+Shift+R`).

---

### Error 6: Playwright E2E tests fail with browser not found

**Full error message:**

```
Error: browserType.launch: Executable doesn't exist at ...chromium...
```

**Cause:** Playwright browsers are not installed.

**Solution:**

```bash
npx playwright install
```

**Verify the fix:**

```bash
npm run test:e2e
```

---

### Error 7: `npm run lint` fails with React Hooks rules

**Full error message:**

```
error  React Hook useEffect is called conditionally  react-hooks/rules-of-hooks
```

**Cause:** Hooks are called inside a conditional block or after an early return.

**Solution:** Move all hooks to the top of the component, before any conditional logic. See the React Hooks rules of hooks documentation.

---

## 11. Appendix: Glossary

| Term                 | Definition                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| **AST**              | Abstract Syntax Tree — the tree representation of an expression (groups, rules, functions, fields, literals). |
| **Conjunction**      | The logical operator combining group children: `and` or `or`.                                                 |
| **Dataverse**        | Microsoft's cloud-native data store (formerly Common Data Service) used by Power Apps and Power Automate.     |
| **Diagnostic**       | A validation message (error or warning) produced by the expression engine during formatting.                  |
| **Expression Mode**  | Either `triggerCondition` (for flow triggers) or `filterArray` (for array filtering).                         |
| **Field Definition** | A typed schema describing a field: `id`, `label`, `type`, `path`, `choices`, `nullable`, etc.                 |
| **PPTB**             | Power Platform Toolbox — a desktop app for Power Platform developers that hosts custom tools.                 |
| **Predicate**        | A boolean expression that evaluates to true or false.                                                         |
| **Query Document**   | The complete state of the builder: mode, fields, root group, selected rule, and source descriptor.            |
| **Rule**             | A single condition in the condition tree: `fieldId` + `operator` + `value` (+ optional wrappers).             |
| **Wrapper**          | A function applied to both operands of a rule, e.g., `trim`, `toLower`, `coalesce`.                           |
| **Field Drift**      | When a refreshed schema differs from the cached version (fields added, removed, or changed).                  |
| **Orphaned Field**   | A field referenced in a rule that no longer exists in the current schema.                                     |

---

## Quick Reference Cheat Sheet

### Commands

| Task         | Command               |
| ------------ | --------------------- |
| Install deps | `npm install`         |
| Dev — web    | `npm run dev:web`     |
| Dev — PPTB   | `npm run dev:pptb`    |
| Build all    | `npm run build`       |
| Build web    | `npm run build:web`   |
| Build PPTB   | `npm run build:pptb`  |
| Preview web  | `npm run preview:web` |
| Type check   | `npm run typecheck`   |
| Lint         | `npm run lint`        |
| Unit tests   | `npm test`            |
| E2E tests    | `npm run test:e2e`    |

### Package Imports

```typescript
// Engine (pure TS)
import { formatExpression, FormatResult } from "@ryanmakes/eb_engine";

// Platform adapters
import {
  createWebAdapter,
  createPptbAdapter,
} from "@ryanmakes/eb_platformadapter";

// UI shell
import { ExpressionBuilderShell } from "@ryanmakes/eb_builder-ui";
```

### File Locations

| Concern              | Path                                                     |
| -------------------- | -------------------------------------------------------- |
| Theme tokens         | `packages/builder-ui/src/theme/workbenchTokens.ts`       |
| Expression formatter | `packages/engine/src/formatter.ts`                       |
| Adapter contract     | `packages/platform/src/PlatformAdapter.ts`               |
| Main app shell       | `packages/builder-ui/src/app/ExpressionBuilderShell.tsx` |
| Query mutations      | `packages/builder-ui/src/composer/queryActions.ts`       |
| Web bootstrap        | `apps/web/src/main.tsx`                                  |
| PPTB bootstrap       | `apps/pptb/src/main.tsx`                                 |

---

_End of document._
