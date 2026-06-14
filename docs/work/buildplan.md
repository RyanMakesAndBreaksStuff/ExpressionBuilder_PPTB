# Final Option 1 Expression Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the selected Final Option 1 Concept C inspector UI as a production React expression builder for Power Automate Trigger Condition and Filter array advanced-mode predicates.

**Architecture:** Use one pure TypeScript expression engine, one shared React builder UI package, and thin host bootstraps for web and Power Platform Toolbox. The selected UI path is an app-owned Fluent UI v9 composer modeled after `docs/mocks/FinalOption1.html`, not `@react-awesome-query-builder/fluent`, because current package metadata still shows RAQB Fluent as `6.7.0-alpha.0` with Fluent UI v8 peers.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Fluent UI v9 (`@fluentui/react-components`), Vitest, Testing Library, Playwright, npm workspaces, Power Automate Workflow Definition Language expressions.

---

## Source Inputs

- `docs/mocks/FinalOption1.html`: selected shell.
- `docs/mocks/concept-c.jsx`: selected Concept C layout and interactions.
- `docs/mocks/parts.jsx`: reusable expression, field, rule, group, and diagnostic mock parts.
- `docs/mocks/fluent-tokens.css`: Slate / Steel light and dark token system.
- `docs/plans/initialplan.html`: original implementation waves and engine/platform boundaries.
- `docs/plans/initialplanR1.html`: required corrections before implementation.
- Current Microsoft Learn checks:
  - Trigger conditions must start with `@`.
  - Filter array reduces array items and does not reshape objects.
  - Filter array text filtering is case-sensitive.
  - `item()` refers to the current array item in array iteration surfaces.
  - WDL functions apply to Power Automate and Logic Apps.
  - Date comparisons must use `ticks()` for reliable non-ISO date handling.
  - `empty()` is valid for null/empty strings and collections, not numbers.
- Current npm metadata checks:
  - `@react-awesome-query-builder/fluent@latest`: `6.7.0-alpha.0`, peers on `@fluentui/react` v8 packages.
  - `@react-querybuilder/fluent@latest`: `8.19.1`, peers on `@fluentui/react-components` v9.
  - `@fluentui/react-components@latest`: `9.74.1`.

## Elegant Path

The more elegant implementation is the app-owned composer shown by Final Option 1. It removes the RAQB adapter layer from the critical path, keeps the UI aligned to Fluent UI v9, and makes the engine AST the single canonical query representation. If the app-owned composer stalls, run the `react-querybuilder` Fluent v9 spike in Task 2 as a fallback; do not introduce `@react-awesome-query-builder/fluent` unless the dependency spike explicitly proves its v8/v9 theme bridge and alpha risk are acceptable.

## Component Deconstruction

| Mock Part | Production Component | Responsibility |
| --- | --- | --- |
| `ConceptC` | `ExpressionBuilderShell` | Full-viewport root, theme state, mode state, pane layout, selected rule id |
| `CCmdBar` | `ExpressionCommandBar` | Product mark, title, draft status, mode selector, import/export, theme toggle, copy split button |
| `ModeSeg` | `ModeSegmentedControl` | Switch `triggerCondition` and `filterArray` modes and update field-reference context |
| `FieldSource` | `FieldSourcePane` | Searchable schema fields, type glyphs, sample/Dataverse status, connect action |
| `CGroupHead` | `ConditionGroupHeader` | AND/OR group label, indentation, add-rule action |
| `CRow` | `ConditionSummaryRow` | Selectable summary row with field, operator, value preview, warning state, drag affordance |
| center list | `ConditionMasterPane` | Editable predicate tree and add rule/group commands |
| `CInspector` | `RuleInspectorPane` | Detailed editor for one selected rule with field/operator/value/wrappers/diagnostics |
| `Diagnostic` | `DiagnosticCard` | Error, warning, info, and success diagnostics with accessible announcements |
| bottom strip | `ExpressionValidationBar` | Boolean-root status, warning/error counts, one-line expression preview, copy action |
| `ExpressionBody` | `ExpressionPreview` | Syntax-highlighted full expression and per-rule expression previews |
| `fluent-tokens.css` | `tokens.css` and Fluent theme bridge | Slate / Steel light/dark variables and Fluent provider tokens |

Responsive rule: keep the desktop layout as 240px field pane, flexible master pane, and 380px inspector. At widths below 980px, collapse the field pane behind a toolbar button and make the inspector a right-side drawer. At widths below 700px, use a two-tab layout: `Conditions` and `Inspector`.

## R1 Corrections Folded Into This Plan

- Add `packages/builder-ui` so web and PPTB do not import from each other.
- Require boolean predicate roots for Trigger Condition and Filter array modes.
- Add return-type metadata for fields, literals, functions, and operators.
- Gate operators by field type, including date comparisons with `ticks()`.
- Drop RAQB Fluent from the default plan; use an app-owned Fluent UI v9 composer.
- Add root TypeScript project references, `composite`, declaration emit, `types`, and `exports`.
- Persist one canonical app-owned query shape; derive generated expressions from that shape.
- Add field `path` segments for safe nested references while keeping direct-property samples simple.
- Add accessibility tests for keyboard flow, labels, focus order, and diagnostics announcements.
- Add served PPTB smoke testing rather than only running the web dev server.

## Package And File Structure

Create or modify these paths:

```text
package.json
package-lock.json
eslint.config.js
tsconfig.json
tsconfig.base.json
vite.config.ts
vitest.config.ts
playwright.config.ts
apps/web/package.json
apps/web/index.html
apps/web/src/main.tsx
apps/web/src/webAdapterComposition.ts
apps/pptb/package.json
apps/pptb/index.html
apps/pptb/src/main.tsx
apps/pptb/src/toolboxApi.d.ts
packages/engine/package.json
packages/engine/src/index.ts
packages/engine/src/types.ts
packages/engine/src/fieldReferences.ts
packages/engine/src/literals.ts
packages/engine/src/operators.ts
packages/engine/src/functions.ts
packages/engine/src/formatter.ts
packages/engine/src/diagnostics.ts
packages/engine/test/formatter.trigger.test.ts
packages/engine/test/formatter.filterArray.test.ts
packages/engine/test/operatorTypes.test.ts
packages/engine/test/predicateRoots.test.ts
packages/platform/package.json
packages/platform/src/index.ts
packages/platform/src/PlatformAdapter.ts
packages/platform/src/webAdapter.ts
packages/platform/src/pptbAdapter.ts
packages/platform/test/webAdapter.test.ts
packages/platform/test/pptbAdapter.test.ts
packages/builder-ui/package.json
packages/builder-ui/src/index.ts
packages/builder-ui/src/app/ExpressionBuilderShell.tsx
packages/builder-ui/src/app/builderState.ts
packages/builder-ui/src/app/sampleData.ts
packages/builder-ui/src/components/ExpressionCommandBar.tsx
packages/builder-ui/src/components/ModeSegmentedControl.tsx
packages/builder-ui/src/components/FieldSourcePane.tsx
packages/builder-ui/src/components/ConditionMasterPane.tsx
packages/builder-ui/src/components/ConditionGroupHeader.tsx
packages/builder-ui/src/components/ConditionSummaryRow.tsx
packages/builder-ui/src/components/RuleInspectorPane.tsx
packages/builder-ui/src/components/DiagnosticCard.tsx
packages/builder-ui/src/components/ExpressionValidationBar.tsx
packages/builder-ui/src/components/ExpressionPreview.tsx
packages/builder-ui/src/components/TypeGlyph.tsx
packages/builder-ui/src/composer/queryActions.ts
packages/builder-ui/src/composer/querySchema.ts
packages/builder-ui/src/importExport/savedExpressionSchema.ts
packages/builder-ui/src/theme/fluentTheme.ts
packages/builder-ui/src/theme/tokens.css
packages/builder-ui/test/queryActions.test.ts
packages/builder-ui/test/savedExpressionSchema.test.ts
packages/builder-ui/test/accessibility.test.tsx
tests/e2e/web-smoke.spec.ts
tests/e2e/pptb-smoke.spec.ts
tests/e2e/fixtures/sampleExpression.json
tests/e2e/fixtures/toolboxApiMock.ts
docs/architecture.md
docs/adapter-contract.md
docs/expression-cookbook.md
docs/deployment.md
```

## Canonical Types

Use these as the initial contract in `packages/engine/src/types.ts`.

```ts
export type ExpressionMode = 'triggerCondition' | 'filterArray';
export type FieldType = 'string' | 'number' | 'boolean' | 'dateTime' | 'choice';
export type ValueType = FieldType | 'null' | 'unknown';
export type PredicateType = 'boolean';
export type Conjunction = 'and' | 'or';

export interface FieldDefinition {
  id: string;
  label: string;
  type: FieldType;
  path: string[];
  choices?: string[];
  nullable?: boolean;
}

export type ExpressionNode =
  | GroupNode
  | RuleNode
  | FunctionCallNode
  | FieldReferenceNode
  | LiteralNode;

export interface GroupNode {
  kind: 'group';
  conjunction: Conjunction;
  children: ExpressionNode[];
}

export interface RuleNode {
  kind: 'rule';
  operator: string;
  left: ExpressionNode;
  right?: ExpressionNode;
  caseInsensitive?: boolean;
}

export interface FunctionCallNode {
  kind: 'function';
  name: string;
  args: ExpressionNode[];
}

export interface FieldReferenceNode {
  kind: 'field';
  fieldId: string;
}

export interface LiteralNode {
  kind: 'literal';
  value: string | number | boolean | null;
  valueType: ValueType;
}

export interface FormatDiagnostic {
  code:
    | 'EMPTY_GROUP'
    | 'INVALID_ROOT_TYPE'
    | 'MISSING_OPERAND'
    | 'UNKNOWN_FIELD'
    | 'UNSUPPORTED_OPERATOR'
    | 'TYPE_MISMATCH'
    | 'UNSAFE_NULL_STRING_WRAPPER'
    | 'MAX_DEPTH';
  message: string;
  severity: 'error' | 'warning';
  path: string;
}

export interface FormatterOptions {
  mode: ExpressionMode;
  fields: FieldDefinition[];
  maxDepth?: number;
}

export interface FormatResult {
  expression: string;
  diagnostics: FormatDiagnostic[];
  returnType: PredicateType | ValueType;
}
```

Use this as the initial app-owned query schema in `packages/builder-ui/src/composer/querySchema.ts`.

```ts
import type { Conjunction, FieldDefinition, ExpressionMode } from '@pavb/engine';

export interface QueryDocument {
  version: 1;
  mode: ExpressionMode;
  fields: FieldDefinition[];
  root: QueryGroup;
  selectedRuleId?: string;
}

export interface QueryGroup {
  id: string;
  kind: 'group';
  conjunction: Conjunction;
  children: Array<QueryGroup | QueryRule>;
}

export interface QueryRule {
  id: string;
  kind: 'rule';
  fieldId: string;
  operator: string;
  value?: string | number | boolean | null;
  valueFunction?: 'toLower' | 'toUpper' | 'trim' | 'coalesce' | 'addDays' | 'utcNow';
  caseInsensitive?: boolean;
}
```

## Task 1: Workspace And Build Graph

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `tsconfig.base.json`
- Modify: `eslint.config.js`
- Create: package files and `tsconfig.json` files under `apps/*` and `packages/*`

- [ ] **Step 1: Move the starter app into a workspace shape**

Keep the current root Vite app as source material only. Move production boot code into `apps/web` and shared UI into `packages/builder-ui`; do not leave production UI in root `src/App.tsx`.

- [ ] **Step 2: Add root workspace scripts**

Use this root script contract:

```json
{
  "scripts": {
    "dev:web": "npm run dev -w @pavb/web",
    "dev:pptb": "npm run dev -w @pavb/pptb",
    "build": "tsc -b && npm run build -ws",
    "build:web": "npm run build -w @pavb/web",
    "build:pptb": "npm run build -w @pavb/pptb",
    "preview:web": "npm run preview -w @pavb/web",
    "preview:pptb": "npm run preview -w @pavb/pptb",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "lint": "eslint .",
    "typecheck": "tsc -b"
  },
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

- [ ] **Step 3: Add root TypeScript project references**

Root `tsconfig.json` must contain:

```json
{
  "files": [],
  "references": [
    { "path": "./packages/engine" },
    { "path": "./packages/platform" },
    { "path": "./packages/builder-ui" },
    { "path": "./apps/web" },
    { "path": "./apps/pptb" }
  ]
}
```

Each package `tsconfig.json` must set `composite: true`, emit declarations, and reference only lower-level packages. `packages/engine` references nothing. `packages/platform` references nothing. `packages/builder-ui` references `engine` and `platform`. `apps/web` and `apps/pptb` reference `builder-ui` and `platform`.

- [ ] **Step 4: Install pinned dependencies**

Install the production path:

```powershell
npm install @fluentui/react-components@9.74.1 @fluentui/react-icons@latest
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom playwright jsdom
```

Expected: `package-lock.json` updates and no unresolved peer dependency errors.

- [ ] **Step 5: Run the build graph**

Run:

```powershell
npm run typecheck
npm run lint
```

Expected: both commands complete without errors against empty package shells.

## Task 2: Composer Dependency Gate

**Files:**
- Create: `docs/work/composer-decision.md`
- Create: `packages/builder-ui/src/composer/queryActions.ts`
- Create: `packages/builder-ui/src/composer/querySchema.ts`

- [ ] **Step 1: Record the selected composer path**

Write `docs/work/composer-decision.md` with this decision:

```md
# Composer Decision

Selected path: app-owned Fluent UI v9 condition composer.

Reason:
- Final Option 1 is a custom master-detail inspector composer.
- The app must use Fluent UI v9 consistently.
- Current `@react-awesome-query-builder/fluent` metadata is `6.7.0-alpha.0` and peers on Fluent UI v8.
- The engine AST should be the canonical source of truth.

Fallback:
- If the app-owned composer cannot meet keyboard editing or tree manipulation needs within the MVP window, spike `react-querybuilder@8.19.1` plus `@react-querybuilder/fluent@8.19.1`.
- Keep fallback code isolated under `packages/builder-ui/src/vendor-querybuilder`.
```

- [ ] **Step 2: Define app-owned query actions**

Implement pure actions for add rule, add group, update rule, duplicate rule, delete rule, select rule, move rule, and change group conjunction. Every action must return a new `QueryDocument`.

- [ ] **Step 3: Write failing query action tests**

Add tests for:

```ts
expect(addRule(sampleDocument, 'root')).toHaveProperty('root.children.length', 2);
expect(changeGroupConjunction(sampleDocument, 'root', 'or').root.conjunction).toBe('or');
expect(updateRule(sampleDocument, 'rule-status', { value: 'Rejected' })).toMatchObject({
  selectedRuleId: 'rule-status'
});
expect(deleteNode(sampleDocument, 'rule-status').selectedRuleId).toBeUndefined();
```

- [ ] **Step 4: Run tests**

Run:

```powershell
npm test -w @pavb/builder-ui
```

Expected before implementation: tests fail because actions are missing. Expected after implementation: tests pass.

## Task 3: Expression Engine

**Files:**
- Create/modify: `packages/engine/src/*`
- Create: `packages/engine/test/formatter.trigger.test.ts`
- Create: `packages/engine/test/formatter.filterArray.test.ts`
- Create: `packages/engine/test/operatorTypes.test.ts`
- Create: `packages/engine/test/predicateRoots.test.ts`

- [ ] **Step 1: Write exact formatter tests**

Trigger Condition expected output:

```ts
expect(formatExpression(statusApprovedAst, triggerOptions).expression).toBe(
  "@equals(triggerBody()?['Status'], 'Approved')"
);
```

Filter array expected output:

```ts
expect(formatExpression(statusApprovedAst, filterOptions).expression).toBe(
  "@equals(item()?['Status'], 'Approved')"
);
```

Nested Final Option 1 expected output:

```ts
expect(result.expression).toBe(
  "@and(equals(triggerBody()?['Status'], 'Approved'), or(equals(triggerBody()?['Region'], 'EMEA'), equals(triggerBody()?['Region'], 'APAC')), greater(triggerBody()?['Amount'], 5000), less(ticks(triggerBody()?['DueDate']), ticks(addDays(utcNow(), 7))))"
);
```

- [ ] **Step 2: Write R1 diagnostic tests**

Add tests that assert error diagnostics for these invalid roots:

```ts
utcNow()
triggerBody()?['Title']
'text'
42
```

Each must return `INVALID_ROOT_TYPE` in `triggerCondition` and `filterArray` modes.

- [ ] **Step 3: Write type-gated operator tests**

Required rules:

```text
string: equals, notEquals, contains, startsWith, endsWith, empty, notEmpty
choice: equals, notEquals, empty, notEmpty
number: equals, notEquals, greater, less, greaterOrEquals, lessOrEquals
boolean: equals, notEquals
dateTime: equals, notEquals, greater, less, greaterOrEquals, lessOrEquals
```

`empty()` on `number` or `boolean` must produce `TYPE_MISMATCH`.

- [ ] **Step 4: Implement field references**

Render paths from `FieldDefinition.path`:

```ts
triggerBody()?['Status']
triggerBody()?['body']?['OutputParameters']?['DeploymentStageName']
item()?['Status']
item()?['customer']?['address']?['city']
```

- [ ] **Step 5: Implement date comparisons**

For date comparisons, wrap both sides with `ticks()` unless the right side is already a `ticks()` call:

```text
less(ticks(triggerBody()?['DueDate']), ticks(addDays(utcNow(), 7)))
greaterOrEquals(ticks(item()?['SubmittedOn']), ticks('2026-01-01T00:00:00Z'))
```

- [ ] **Step 6: Implement null and case behavior**

For case-insensitive string checks, normalize both sides:

```text
contains(toLower(coalesce(triggerBody()?['Title'], '')), toLower('urgent'))
equals(toLower(coalesce(item()?['Status'], '')), toLower('approved'))
```

For default case-sensitive checks, do not silently normalize user values.

- [ ] **Step 7: Run engine verification**

Run:

```powershell
npm test -w @pavb/engine
npm run build -w @pavb/engine
```

Expected: all formatter, type, and diagnostic tests pass; declarations emit.

## Task 4: Platform Adapters

**Files:**
- Create/modify: `packages/platform/src/PlatformAdapter.ts`
- Create: `packages/platform/src/webAdapter.ts`
- Create: `packages/platform/src/pptbAdapter.ts`
- Create: `packages/platform/test/webAdapter.test.ts`
- Create: `packages/platform/test/pptbAdapter.test.ts`

- [ ] **Step 1: Implement adapter contract**

Use this public contract:

```ts
export type PlatformTheme = 'light' | 'dark' | 'highContrast';
export type NotificationLevel = 'success' | 'info' | 'warning' | 'error';

export interface PlatformSettings {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface PlatformAdapter {
  copyToClipboard(text: string): Promise<void>;
  notify(message: string, level: NotificationLevel): Promise<void>;
  getTheme(): Promise<PlatformTheme>;
  onThemeChanged(handler: (theme: PlatformTheme) => void): () => void;
  settings: PlatformSettings;
  getDataverseFields(): Promise<unknown[]>;
}
```

- [ ] **Step 2: Implement `webAdapter`**

Use `navigator.clipboard.writeText`, `localStorage`, and `matchMedia('(prefers-color-scheme: dark)')` only inside `webAdapter.ts`.

- [ ] **Step 3: Implement `pptbAdapter`**

Use `window.toolboxAPI` only inside `pptbAdapter.ts` and `toolboxApi.d.ts`. When no Dataverse connection API exists, return an empty field list and call `notify('Using sample fields because no Dataverse connection is available.', 'info')`.

- [ ] **Step 4: Run adapter tests**

Run:

```powershell
npm test -w @pavb/platform
npm run build -w @pavb/platform
```

Expected: mocked clipboard, storage, theme, notifications, settings, and PPTB fallbacks pass.

## Task 5: Shared Builder UI

**Files:**
- Create/modify: `packages/builder-ui/src/app/*`
- Create/modify: `packages/builder-ui/src/components/*`
- Create/modify: `packages/builder-ui/src/theme/*`
- Test: `packages/builder-ui/test/*`

- [ ] **Step 1: Port Slate / Steel tokens**

Move the selected token values from `docs/mocks/fluent-tokens.css` into `packages/builder-ui/src/theme/tokens.css`. Preserve light and dark Slate / Steel colors and syntax colors.

- [ ] **Step 2: Build `ExpressionBuilderShell`**

State owned by shell:

```ts
interface BuilderShellState {
  document: QueryDocument;
  theme: 'light' | 'dark';
  selectedRuleId?: string;
}
```

Render:

```tsx
<FluentProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
  <div className="eb-root" data-theme={theme}>
    <ExpressionCommandBar />
    <div className="eb-layout">
      <FieldSourcePane />
      <ConditionMasterPane />
      <RuleInspectorPane />
    </div>
  </div>
</FluentProvider>
```

- [ ] **Step 3: Build command bar**

Required controls:

```text
Product mark
Expression Builder title
Draft badge
ModeSegmentedControl
Import button
Export button
Theme toggle
Copy expression split button
```

Every icon-only button must have an accessible name and tooltip.

- [ ] **Step 4: Build field pane**

Use sample fields:

```ts
[
  { id: 'Status', label: 'Status', type: 'choice', path: ['Status'], choices: ['Approved', 'Rejected', 'Pending'] },
  { id: 'Approver', label: 'Approver', type: 'string', path: ['Approver'] },
  { id: 'Amount', label: 'Amount', type: 'number', path: ['Amount'] },
  { id: 'Region', label: 'Region', type: 'choice', path: ['Region'], choices: ['EMEA', 'APAC', 'AMER'] },
  { id: 'DueDate', label: 'Due date', type: 'dateTime', path: ['DueDate'] },
  { id: 'Submitted', label: 'Submitted', type: 'boolean', path: ['Submitted'] },
  { id: 'RequestId', label: 'Request ID', type: 'string', path: ['RequestId'] },
  { id: 'Department', label: 'Department', type: 'string', path: ['Department'] }
]
```

- [ ] **Step 5: Build condition master**

Match the selected design:

```text
Header: Conditions, mode badge, helper text, Rule button, Group button
Rows: indented group headers and selectable rule summaries
Footer: boolean-root status, warning/error counts, one-line expression preview, Copy button
```

- [ ] **Step 6: Build rule inspector**

Inspector edits one selected rule and must include:

```text
Breadcrumb: AND root > Rule name
Field dropdown
Operator dropdown filtered by field type
Value editor filtered by field type
Choice chips for choice fields
Rule diagnostics
Suggested fix button for case-insensitive text matching
Function wrapper chips
Per-rule expression preview
Duplicate and delete buttons
```

- [ ] **Step 7: Build import/export**

Persist only `QueryDocument`. Do not persist a second generated AST source. On import, validate `version`, `mode`, `fields`, and `root`, derive engine AST, and reject invalid documents with visible diagnostics.

- [ ] **Step 8: Add UI tests**

Required tests:

```text
Keyboard can switch mode selector.
Mode switch changes preview from triggerBody() to item().
Search filters fields by label.
Selecting a condition row updates inspector fields.
Changing a value updates the generated expression.
Case-insensitive fix wraps both sides in toLower().
Import/export round-trips without expression drift.
Diagnostics use aria-live or equivalent announcement semantics.
```

- [ ] **Step 9: Run UI verification**

Run:

```powershell
npm test -w @pavb/builder-ui
npm run build -w @pavb/builder-ui
```

Expected: all UI unit tests pass and package declarations emit.

## Task 6: Web And PPTB Bootstraps

**Files:**
- Create/modify: `apps/web/src/main.tsx`
- Create/modify: `apps/web/src/webAdapterComposition.ts`
- Create/modify: `apps/pptb/src/main.tsx`
- Create/modify: `apps/pptb/src/toolboxApi.d.ts`

- [ ] **Step 1: Web bootstrap**

`apps/web/src/main.tsx` must only compose:

```tsx
import { createRoot } from 'react-dom/client';
import { ExpressionBuilderShell } from '@pavb/builder-ui';
import { createWebAdapter } from '@pavb/platform';

createRoot(document.getElementById('root')!).render(
  <ExpressionBuilderShell adapter={createWebAdapter()} />
);
```

- [ ] **Step 2: PPTB bootstrap**

`apps/pptb/src/main.tsx` must only compose:

```tsx
import { createRoot } from 'react-dom/client';
import { ExpressionBuilderShell } from '@pavb/builder-ui';
import { createPptbAdapter } from '@pavb/platform';

createRoot(document.getElementById('root')!).render(
  <ExpressionBuilderShell adapter={createPptbAdapter(window.toolboxAPI)} />
);
```

- [ ] **Step 3: Build both apps**

Run:

```powershell
npm run build:web
npm run build:pptb
```

Expected: `apps/web/dist/index.html` and `apps/pptb/dist/index.html` exist.

## Task 7: E2E And Boundary Verification

**Files:**
- Create/modify: `playwright.config.ts`
- Create: `tests/e2e/web-smoke.spec.ts`
- Create: `tests/e2e/pptb-smoke.spec.ts`
- Create: `tests/e2e/fixtures/sampleExpression.json`
- Create: `tests/e2e/fixtures/toolboxApiMock.ts`

- [ ] **Step 1: Configure served targets**

Playwright must start both web and PPTB preview targets:

```ts
webServer: [
  { command: 'npm run dev:web', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI },
  { command: 'npm run dev:pptb', url: 'http://127.0.0.1:5174', reuseExistingServer: !process.env.CI }
]
```

- [ ] **Step 2: Add web smoke test**

Test:

```text
Open web app.
Verify Conditions, Fields, and Edit rule panes are visible.
Verify initial preview contains @and.
Switch to Filter array mode.
Verify preview contains item()?['Status'].
Switch back to Trigger condition.
Verify preview contains triggerBody()?['Status'].
Click case-insensitive suggested fix.
Verify preview contains toLower.
Export JSON.
Import JSON.
Verify expression is unchanged.
Click Copy.
Verify clipboard receives the expression.
```

- [ ] **Step 3: Add PPTB smoke test**

Inject `window.toolboxAPI` before app bootstrap. Test clipboard, notification, theme, settings, and field discovery bridge calls.

- [ ] **Step 4: Add boundary checks**

Add a test or lint rule that fails on:

```text
window.toolboxAPI outside packages/platform/src/pptbAdapter.ts and apps/pptb/src/main.tsx
navigator.clipboard outside packages/platform/src/webAdapter.ts
localStorage outside packages/platform/src/webAdapter.ts
React imports inside packages/engine
@fluentui/react imports anywhere
@react-awesome-query-builder/fluent imports anywhere
```

- [ ] **Step 5: Run full verification**

Run:

```powershell
npm run lint
npm run typecheck
npm test
npm run build:web
npm run build:pptb
npm run test:e2e
```

Expected: all checks pass.

## Task 8: Documentation

**Files:**
- Create/modify: `README.md`
- Create: `docs/architecture.md`
- Create: `docs/adapter-contract.md`
- Create: `docs/expression-cookbook.md`
- Create: `docs/deployment.md`

- [ ] **Step 1: Document architecture**

Include this package boundary:

```text
packages/engine: pure TypeScript expression formatting and diagnostics
packages/platform: web and PPTB platform adapters
packages/builder-ui: shared Fluent UI v9 Concept C composer
apps/web: browser bootstrap only
apps/pptb: Power Platform Toolbox bootstrap only
```

- [ ] **Step 2: Document expression examples**

Cookbook examples must match engine fixtures:

```text
@equals(triggerBody()?['Status'], 'Approved')
@equals(item()?['Status'], 'Approved')
@contains(toLower(coalesce(triggerBody()?['Title'], '')), toLower('urgent'))
@less(ticks(triggerBody()?['DueDate']), ticks(addDays(utcNow(), 7)))
```

- [ ] **Step 3: Document deployment**

Cover:

```text
npm run build:web
npm run preview:web
npm run build:pptb
GitHub Pages publishing from apps/web/dist
PPTB static package contents from apps/pptb/dist
```

## Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Generated expression syntax is wrong | High | Engine snapshots for every supported operator, mode, and date path |
| Predicate root returns non-boolean | High | Return-type metadata and `INVALID_ROOT_TYPE` diagnostics |
| UI dependency mismatch | High | Default to app-owned Fluent UI v9 composer; ban RAQB Fluent imports |
| Date comparisons are lexicographic | High | Use `ticks()` for date comparisons |
| Case sensitivity surprises users | Medium | Surface warning and explicit `toLower` suggested fix |
| PPTB APIs are absent in local dev | Medium | Adapter fallback with mocked E2E coverage |
| Mobile layout becomes unusable | Medium | Drawer/tab responsive rules and Playwright viewport checks |
| Parallel agents overlap edits | Medium | Shared contracts in Task 1 and package ownership by task |

## Done Definition

- `npm install` succeeds from the repo root.
- `npm run lint` passes.
- `npm run typecheck` passes through root project references.
- `npm test` passes for engine, platform, and builder UI.
- `npm run build:web` emits a static web app.
- `npm run build:pptb` emits a PPTB static app.
- `npm run test:e2e` passes for web and PPTB boot paths.
- The first screen is the usable Final Option 1 builder, not the Vite starter or a landing page.
- Trigger Condition mode emits `triggerBody()?['Field']` references.
- Filter array mode emits `item()?['Field']` references.
- Generated root predicates are boolean or show blocking diagnostics.
- The UI uses the Slate / Steel light and dark theme from the selected mock.
- The engine package has no React, DOM, Fluent UI, or platform imports.
- Direct clipboard, storage, and PPTB calls exist only in platform adapter files.
