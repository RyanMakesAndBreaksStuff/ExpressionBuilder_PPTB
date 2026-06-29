# Expression Builder Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add double-click rule creation, grouped related-table fields, numeric choice option values, and a stackable both-sides wrapper system to the Expression Builder.

**Architecture:** Two schema additions carry the design — `options` on `FieldDefinition` (engine) and `wrappers` on `QueryRule` (builder-ui composer). Wrappers are rendered by composing existing `FunctionCallNode`s at AST-build time, so the engine formatter needs no new branch. The legacy `caseInsensitive`/`valueFunction` mechanisms are removed outright (pre-release, no back-compat).

**Tech Stack:** TypeScript monorepo (npm workspaces), React 19 + Fluent UI v9, Vitest + Testing Library (jsdom), packages `engine` / `platform` / `builder-ui`.

**Conventions:**
- Run one test file: `npx vitest run <path> -t "<test name>"`
- Run a package's tests: `npx vitest run packages/<pkg>`
- Typecheck the repo: `npm run typecheck`
- Lint: `npm run lint`
- UI test files start with `// @vitest-environment jsdom`.

---

## File Structure

Created:
- `packages/engine/src/formatter.test.ts` — engine choice/number + wrapper rendering tests
- `packages/builder-ui/test/builderState.test.ts` — `findParentGroupId`, default value, wrapper AST
- `packages/builder-ui/test/wrapperChips.test.tsx` — chip selection/clear

Modified:
- `packages/engine/src/types.ts` — `FieldDefinition.options`; drop `RuleNode.caseInsensitive`
- `packages/engine/src/formatter.ts` — `isCompatibleType` choice↔number; remove `caseInsensitive` branch
- `packages/platform/src/dataverseMetadata.ts` — populate `options`
- `packages/platform/src/dataverseMetadata.test.ts` — options test
- `packages/builder-ui/src/composer/querySchema.ts` — `QueryRule.wrappers`; drop `valueFunction`/`caseInsensitive`
- `packages/builder-ui/src/app/builderState.ts` — `findParentGroupId`, `getDefaultValue`, wrapper AST composition, literal value type
- `packages/builder-ui/src/importExport/savedExpressionSchema.ts` — validate `options` + `wrappers`
- `packages/builder-ui/src/workbench/types.ts` — toolbox/rule prop changes
- `packages/builder-ui/src/workbench/WrapperChips.tsx` — selectable, scoped palette, clear
- `packages/builder-ui/src/workbench/RuleRowEditor.tsx` — optgroups, numeric choice + raw toggle, Apply Wrap, applied-wrapper chips/undo
- `packages/builder-ui/src/workbench/FieldToolboxPane.tsx` — double-click, wrapper-selection plumbing
- `packages/builder-ui/src/workbench/ConditionGroupCard.tsx` — thread `selectedWrappers`
- `packages/builder-ui/src/app/ExpressionBuilderShell.tsx` — wrapper-selection state, `createRuleFromField`, wire callbacks
- `packages/builder-ui/test/fieldToolboxPane.test.tsx` — rewrite to current props + double-click
- `packages/builder-ui/test/sharedBuilderUi.test.tsx` — rewrite wrapper test

Deleted (orphaned, unimported legacy UI referencing removed fields):
- `packages/builder-ui/src/components/RuleInspectorPane.tsx`
- `packages/builder-ui/src/components/ConditionSummaryRow.tsx`
- `packages/builder-ui/src/components/ConditionMasterPane.tsx`

---

## Task 1: Engine — `options` on FieldDefinition + choice/number compatibility

**Files:**
- Modify: `packages/engine/src/types.ts:10-21`
- Modify: `packages/engine/src/formatter.ts:226-232`
- Create: `packages/engine/src/formatter.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/engine/src/formatter.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatExpression } from './formatter';
import type { ExpressionNode, FieldDefinition } from './types';

const choiceField: FieldDefinition = {
  id: 'statuscode',
  label: 'Status',
  type: 'choice',
  path: ['statuscode'],
  options: [{ label: 'Active', value: 1 }],
  choices: ['Active'],
};

function group(children: ExpressionNode[]): ExpressionNode {
  return { kind: 'group', conjunction: 'and', children };
}

describe('formatExpression — numeric choice', () => {
  it('emits a bare numeric literal and raises no type mismatch', () => {
    const ast = group([
      {
        kind: 'rule',
        operator: 'equals',
        left: { kind: 'field', fieldId: 'statuscode' },
        right: { kind: 'literal', value: 1, valueType: 'number' },
      },
    ]);

    const result = formatExpression(ast, { mode: 'triggerCondition', fields: [choiceField] });

    expect(result.expression).toContain('equals');
    expect(result.expression).toContain(', 1)');
    expect(result.diagnostics.find((d) => d.code === 'TYPE_MISMATCH')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/engine/src/formatter.test.ts -t "emits a bare numeric literal"`
Expected: FAIL — a `TYPE_MISMATCH` diagnostic is present (choice vs number).

- [ ] **Step 3: Add `options` to FieldDefinition**

In `packages/engine/src/types.ts`, the `FieldDefinition` interface — add `options` after `choices`:

```ts
export interface FieldDefinition {
  id: string;
  label: string;
  type: FieldType;
  path: string[];
  choices?: string[];
  options?: Array<{ label: string; value: number }>;
  nullable?: boolean;
  source?: FieldSourceKind;
  logicalName?: string;
  group?: string;
  orphaned?: boolean;
}
```

- [ ] **Step 4: Allow choice↔number in the formatter**

In `packages/engine/src/formatter.ts`, replace `isCompatibleType`:

```ts
function isCompatibleType(fieldType: FieldDefinition['type'], valueType: ValueType | PredicateType): boolean {
  if (fieldType === 'choice') {
    return valueType === 'choice' || valueType === 'string' || valueType === 'number';
  }

  return fieldType === valueType;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run packages/engine/src/formatter.test.ts -t "emits a bare numeric literal"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/types.ts packages/engine/src/formatter.ts packages/engine/src/formatter.test.ts
git commit -m "feat(engine): add FieldDefinition.options and allow numeric choice literals"
```

---

## Task 2: Engine — remove `caseInsensitive` mechanism

**Files:**
- Modify: `packages/engine/src/types.ts:36-42`
- Modify: `packages/engine/src/formatter.ts:5` and `:186-207`

- [ ] **Step 1: Write the failing test**

Append to `packages/engine/src/formatter.test.ts`:

```ts
describe('formatExpression — no legacy caseInsensitive', () => {
  it('does not auto-wrap string comparisons unless wrapped explicitly', () => {
    const nameField: FieldDefinition = { id: 'name', label: 'Name', type: 'string', path: ['name'] };
    const ast = group([
      {
        kind: 'rule',
        operator: 'equals',
        left: { kind: 'field', fieldId: 'name' },
        right: { kind: 'literal', value: 'bob', valueType: 'string' },
      },
    ]);

    const result = formatExpression(ast, { mode: 'triggerCondition', fields: [nameField] });

    expect(result.expression).not.toContain('toLower');
  });
});
```

- [ ] **Step 2: Run test to verify it passes already, then prove removal is safe**

Run: `npx vitest run packages/engine/src/formatter.test.ts -t "does not auto-wrap"`
Expected: PASS (this rule has no `caseInsensitive` flag). This test guards Step 3–4 against regressions.

- [ ] **Step 3: Drop `caseInsensitive` from `RuleNode`**

In `packages/engine/src/types.ts`, the `RuleNode` interface:

```ts
export interface RuleNode {
  kind: 'rule';
  operator: string;
  left: ExpressionNode;
  right?: ExpressionNode;
}
```

- [ ] **Step 4: Remove the formatter branch and its unused import**

In `packages/engine/src/formatter.ts` line 5, drop `isStringComparison` from the import:

```ts
import { isDateComparison, isOperatorSupported, needsRightOperand } from './operators';
```

Then replace `formatOperandsForOperator` (remove the `caseInsensitive` block and `wrapNullableStringField` use):

```ts
function formatOperandsForOperator(
  node: RuleNode,
  left: NodeFormat,
  right: NodeFormat,
  leftField: FieldDefinition | undefined,
): { left: string; right: string } {
  if (leftField?.type === 'dateTime' && isDateComparison(node.operator)) {
    return {
      left: wrapTicks(left.expression),
      right: node.right?.kind === 'function' && isTicksCall(node.right) ? right.expression : wrapTicks(right.expression),
    };
  }

  return { left: left.expression, right: right.expression };
}
```

Then delete the now-unused helper `wrapNullableStringField` (the `function wrapNullableStringField(...)` definition near the bottom of the file).

- [ ] **Step 5: Run engine tests**

Run: `npx vitest run packages/engine`
Expected: PASS (all engine tests including both new cases).

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/types.ts packages/engine/src/formatter.ts packages/engine/src/formatter.test.ts
git commit -m "refactor(engine): remove legacy caseInsensitive operand wrapping"
```

---

## Task 3: Platform — populate `options` from Dataverse metadata

**Files:**
- Modify: `packages/platform/src/dataverseMetadata.ts:47-55` and `:116-125`
- Modify: `packages/platform/src/dataverseMetadata.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `packages/platform/src/dataverseMetadata.test.ts`:

```ts
import { mapDataverseAttribute } from './dataverseMetadata';

describe('mapDataverseAttribute — choice options', () => {
  it('captures numeric option values alongside labels', () => {
    const field = mapDataverseAttribute({
      LogicalName: 'statuscode',
      AttributeType: 'Status',
      OptionSet: {
        Options: [
          { Value: 1, Label: { UserLocalizedLabel: { Label: 'Active' } } },
          { Value: 2, Label: { UserLocalizedLabel: { Label: 'Inactive' } } },
        ],
      },
    });

    expect(field?.type).toBe('choice');
    expect(field?.options).toEqual([
      { label: 'Active', value: 1 },
      { label: 'Inactive', value: 2 },
    ]);
    expect(field?.choices).toEqual(['Active', 'Inactive']);
  });
});
```

(If `describe`/`expect` are not already imported at the top of the file, add `import { describe, expect, it } from 'vitest';`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/platform/src/dataverseMetadata.test.ts -t "captures numeric option values"`
Expected: FAIL — `field.options` is `undefined`.

- [ ] **Step 3: Add an `optionsOf` helper**

In `packages/platform/src/dataverseMetadata.ts`, after `choicesOf` (around line 55), add:

```ts
function optionsOf(attr: DataverseAttributeMetadata): Array<{ label: string; value: number }> | undefined {
  const options = attr.OptionSet?.Options;
  if (!options?.length) {
    return undefined;
  }
  return options.map((option) => ({
    label: option.Label?.UserLocalizedLabel?.Label?.trim() || String(option.Value),
    value: option.Value,
  }));
}
```

- [ ] **Step 4: Populate `options` in the choice branch**

In `mapDataverseAttribute`, replace the `if (type === 'choice') { ... }` block:

```ts
  if (type === 'choice') {
    const options = optionsOf(attr);
    if (options) {
      field.options = options;
      field.choices = options.map((option) => option.label);
    }
    // MultiSelectPicklist holds zero-or-more values; treat as nullable regardless of RequiredLevel.
    if (dvType === 'MultiSelectPicklist') {
      field.nullable = true;
    }
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run packages/platform/src/dataverseMetadata.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/platform/src/dataverseMetadata.ts packages/platform/src/dataverseMetadata.test.ts
git commit -m "feat(platform): map Dataverse choice option values into FieldDefinition.options"
```

---

## Task 4: Composer — `wrappers` on QueryRule, drop legacy fields

**Files:**
- Modify: `packages/builder-ui/src/composer/querySchema.ts:37-45`

- [ ] **Step 1: Update the schema**

Replace the `QueryRule` interface in `packages/builder-ui/src/composer/querySchema.ts`:

```ts
export interface QueryRule {
  id: string;
  kind: 'rule';
  fieldId: string;
  operator: string;
  value?: string | number | boolean | null;
  /** Ordered function wrappers applied to BOTH operands (e.g. ['trim','toLower']). */
  wrappers?: string[];
}
```

- [ ] **Step 2: Typecheck to surface every consumer of the removed fields**

Run: `npm run typecheck`
Expected: FAIL with errors in `app/builderState.ts`, `app/ExpressionBuilderShell.tsx`, `workbench/RuleRowEditor.tsx`, `workbench/WrapperChips.tsx`, `components/RuleInspectorPane.tsx`, `components/ConditionSummaryRow.tsx`. These are fixed in Tasks 5–11. This step just confirms the blast radius.

- [ ] **Step 3: Commit**

```bash
git add packages/builder-ui/src/composer/querySchema.ts
git commit -m "feat(builder-ui): add QueryRule.wrappers and remove valueFunction/caseInsensitive"
```

---

## Task 5: builderState — parent lookup, default value, wrapper AST composition

**Files:**
- Modify: `packages/builder-ui/src/app/builderState.ts` (imports, `queryNodeToAst`, helpers)
- Create: `packages/builder-ui/test/builderState.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/builder-ui/test/builderState.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import { deriveBuilderState, findParentGroupId, getDefaultValue } from '../src/app/builderState';
import type { QueryDocument, QueryNode } from '../src/composer/querySchema';

const nameField: FieldDefinition = { id: 'name', label: 'Name', type: 'string', path: ['name'] };
const choiceField: FieldDefinition = {
  id: 'statuscode',
  label: 'Status',
  type: 'choice',
  path: ['statuscode'],
  options: [{ label: 'Active', value: 1 }],
  choices: ['Active'],
};

function doc(child: QueryNode, fields: FieldDefinition[]): QueryDocument {
  return {
    version: 2,
    mode: 'triggerCondition',
    fields,
    root: { id: 'root', kind: 'group', conjunction: 'and', children: [child] },
  };
}

describe('findParentGroupId', () => {
  it('returns the id of the group that holds the rule', () => {
    const root: QueryNode = {
      id: 'root',
      kind: 'group',
      conjunction: 'and',
      children: [
        { id: 'g1', kind: 'group', conjunction: 'and', children: [{ id: 'rule-2', kind: 'rule', fieldId: 'name', operator: 'equals' }] },
      ],
    };
    expect(findParentGroupId(root, 'rule-2')).toBe('g1');
    expect(findParentGroupId(root, 'missing')).toBeUndefined();
    expect(findParentGroupId(root, undefined)).toBeUndefined();
  });
});

describe('getDefaultValue', () => {
  it('uses the first numeric option value for a choice field', () => {
    expect(getDefaultValue(choiceField)).toBe(1);
  });
});

describe('deriveBuilderState — wrappers', () => {
  it('wraps both operands in nested functions in order', () => {
    const document = doc(
      { id: 'rule-1', kind: 'rule', fieldId: 'name', operator: 'equals', value: 'Bob', wrappers: ['trim', 'toLower'] },
      [nameField],
    );
    const { expression } = deriveBuilderState(document);
    expect(expression).toContain("toLower(trim(triggerBody()?['name']))");
    expect(expression).toContain("toLower(trim('Bob'))");
  });

  it('emits coalesce in binary form', () => {
    const document = doc(
      { id: 'rule-1', kind: 'rule', fieldId: 'name', operator: 'equals', value: 'Bob', wrappers: ['coalesce'] },
      [nameField],
    );
    const { expression } = deriveBuilderState(document);
    expect(expression).toContain("coalesce(triggerBody()?['name'], '')");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/builder-ui/test/builderState.test.ts`
Expected: FAIL — `findParentGroupId` / `getDefaultValue` are not exported; wrappers not applied.

- [ ] **Step 3: Update imports and `queryNodeToAst`**

In `packages/builder-ui/src/app/builderState.ts`, extend the engine import to include `FunctionCallNode`:

```ts
import {
  formatExpression,
  isOperatorSupported,
  OPERATORS_BY_FIELD_TYPE,
  type ExpressionMode,
  type ExpressionNode,
  type FieldDefinition,
  type FormatDiagnostic,
  type FormatResult,
  type FunctionCallNode,
  type LiteralNode,
} from '@ryanmakes/eb_engine';
```

Replace `queryNodeToAst` (remove the `caseInsensitive` passthrough; wrap operands):

```ts
export function queryNodeToAst(node: QueryNode, fields: FieldDefinition[]): ExpressionNode {
  if (node.kind === 'group') {
    return queryGroupToAst(node, fields);
  }

  const field = findField(fields, node.fieldId);
  const wrappers = node.wrappers ?? [];
  const left = applyWrappers({ kind: 'field', fieldId: node.fieldId }, wrappers);
  const right = needsValue(node.operator) ? applyWrappers(literalForRule(node, field), wrappers) : undefined;

  return {
    kind: 'rule',
    operator: node.operator,
    left,
    right,
  };
}

function applyWrappers(operand: ExpressionNode, wrappers: string[]): ExpressionNode {
  return wrappers.reduce<ExpressionNode>((acc, name) => wrapOne(acc, name), operand);
}

function wrapOne(arg: ExpressionNode, name: string): FunctionCallNode {
  if (name === 'coalesce') {
    return { kind: 'function', name, args: [arg, { kind: 'literal', value: '', valueType: 'string' }] };
  }
  return { kind: 'function', name, args: [arg] };
}
```

- [ ] **Step 4: Add `findParentGroupId` and export `getDefaultValue`; fix literal value type**

In `packages/builder-ui/src/app/builderState.ts`, add the parent lookup near `findRule`:

```ts
export function findParentGroupId(node: QueryNode, ruleId?: string): string | undefined {
  if (!ruleId || node.kind === 'rule') {
    return undefined;
  }

  for (const child of node.children) {
    if (child.id === ruleId) {
      return node.id;
    }
    const nested = findParentGroupId(child, ruleId);
    if (nested) {
      return nested;
    }
  }

  return undefined;
}

export function getDefaultValue(field?: FieldDefinition): QueryRule['value'] {
  if (field?.options?.length) {
    return field.options[0].value;
  }
  if (field?.choices?.length) {
    return field.choices[0];
  }
  if (field?.type === 'number') {
    return 0;
  }
  if (field?.type === 'boolean') {
    return false;
  }
  return '';
}
```

Then make `literalForRule` derive the literal's value type from the actual value so numeric choices format as numbers, and have `defaultValueForField` reuse `getDefaultValue`:

```ts
function literalForRule(rule: QueryRule, field?: FieldDefinition): LiteralNode {
  const value: LiteralNode['value'] = rule.value === undefined ? defaultValueForField(field) : rule.value;

  return {
    kind: 'literal',
    value,
    valueType: valueTypeForLiteral(value, field),
  };
}

function valueTypeForLiteral(value: LiteralNode['value'], field?: FieldDefinition): LiteralNode['valueType'] {
  if (value === null) return 'null';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return literalValueType(field);
}

function defaultValueForField(field?: FieldDefinition): LiteralNode['value'] {
  return getDefaultValue(field) ?? '';
}
```

(`QueryRule` is already imported at the top of `builderState.ts`; if not, add it to the `from '../composer/querySchema'` import.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run packages/builder-ui/test/builderState.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/builder-ui/src/app/builderState.ts packages/builder-ui/test/builderState.test.ts
git commit -m "feat(builder-ui): wrapper AST composition, findParentGroupId, numeric choice defaults"
```

---

## Task 6: Saved-expression schema — validate `options` and `wrappers`

**Files:**
- Modify: `packages/builder-ui/src/importExport/savedExpressionSchema.ts:89-106` and `:144-158`
- Modify: `packages/builder-ui/src/importExport/savedExpressionSchema.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `packages/builder-ui/src/importExport/savedExpressionSchema.test.ts` (match the file's existing import of `parseSavedExpression`; add it to the imports if missing):

```ts
describe('savedExpressionSchema — new fields', () => {
  it('accepts options on a field and wrappers on a rule', () => {
    const json = JSON.stringify({
      version: 2,
      mode: 'triggerCondition',
      fields: [
        { id: 'statuscode', label: 'Status', type: 'choice', path: ['statuscode'], choices: ['Active'], options: [{ label: 'Active', value: 1 }] },
      ],
      root: {
        id: 'root',
        kind: 'group',
        conjunction: 'and',
        children: [{ id: 'rule-1', kind: 'rule', fieldId: 'statuscode', operator: 'equals', value: 1, wrappers: ['toLower'] }],
      },
    });

    const result = parseSavedExpression(json);
    expect(result.ok).toBe(true);
  });

  it('rejects malformed options', () => {
    const json = JSON.stringify({
      version: 2,
      mode: 'triggerCondition',
      fields: [{ id: 'x', label: 'X', type: 'choice', path: ['x'], options: [{ label: 'A' }] }],
      root: { id: 'root', kind: 'group', conjunction: 'and', children: [] },
    });

    const result = parseSavedExpression(json);
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/builder-ui/src/importExport/savedExpressionSchema.test.ts -t "new fields"`
Expected: FAIL — the malformed-options case is currently accepted (`ok` is `true`).

- [ ] **Step 3: Validate `options` in `validateField`**

In `savedExpressionSchema.ts`, inside `validateField`, after the existing `choices` block (line ~93):

```ts
  if ('options' in value && value.options !== undefined) {
    if (
      !Array.isArray(value.options) ||
      value.options.some(
        (option) => !isRecord(option) || typeof option.label !== 'string' || typeof option.value !== 'number',
      )
    ) {
      errors.push(`Import failed: ${path}.options must be {label, value} pairs.`);
    }
  }
```

- [ ] **Step 4: Validate `wrappers` in `validateRule`**

In `savedExpressionSchema.ts`, inside `validateRule`, before `return true;`:

```ts
  if ('wrappers' in value && value.wrappers !== undefined) {
    if (!Array.isArray(value.wrappers) || value.wrappers.some((wrapper) => typeof wrapper !== 'string')) {
      errors.push(`Import failed: ${path}.wrappers must be an array of strings.`);
    }
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run packages/builder-ui/src/importExport/savedExpressionSchema.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/builder-ui/src/importExport/savedExpressionSchema.ts packages/builder-ui/src/importExport/savedExpressionSchema.test.ts
git commit -m "feat(builder-ui): validate field options and rule wrappers on import"
```

---

## Task 7: WrapperChips — selectable, scoped palette, clear selection

**Files:**
- Modify: `packages/builder-ui/src/workbench/WrapperChips.tsx` (whole file)
- Create: `packages/builder-ui/test/wrapperChips.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `packages/builder-ui/test/wrapperChips.test.tsx`:

```tsx
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WrapperChips } from '../src/workbench/WrapperChips';

afterEach(() => cleanup());

describe('WrapperChips', () => {
  it('shows selected state and toggles via callback', async () => {
    const onToggle = vi.fn();
    render(<WrapperChips selected={['toLower']} onToggle={onToggle} onClearSelection={vi.fn()} />);

    expect(screen.getByRole('button', { name: /toLower/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /toUpper/ })).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(screen.getByRole('button', { name: /trim/ }));
    expect(onToggle).toHaveBeenCalledWith('trim');
  });

  it('does not offer value-generator wrappers', () => {
    render(<WrapperChips selected={[]} onToggle={vi.fn()} onClearSelection={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /addDays/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /utcNow/ })).not.toBeInTheDocument();
  });

  it('clears the selection with one click', async () => {
    const onClearSelection = vi.fn();
    render(<WrapperChips selected={['toLower', 'trim']} onToggle={vi.fn()} onClearSelection={onClearSelection} />);
    await userEvent.click(screen.getByRole('button', { name: /clear selection/i }));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/builder-ui/test/wrapperChips.test.tsx`
Expected: FAIL — current `WrapperChips` takes `onApply`, has no selected state, lists addDays/utcNow.

- [ ] **Step 3: Rewrite WrapperChips**

Replace the entire `packages/builder-ui/src/workbench/WrapperChips.tsx`:

```tsx
import { CodeIcon } from './icons/BuilderIcons';

const wrappers: Array<{ id: string; label: string; detail: string }> = [
  { id: 'toLower', label: 'toLower', detail: 'Normalize text before comparing.' },
  { id: 'toUpper', label: 'toUpper', detail: 'Uppercase text before comparing.' },
  { id: 'trim', label: 'trim', detail: 'Remove leading and trailing spaces.' },
  { id: 'length', label: 'length', detail: 'Compare string length.' },
  { id: 'coalesce', label: 'coalesce', detail: 'Fall back to empty when null.' },
];

interface WrapperChipsProps {
  selected: string[];
  onToggle: (wrapperId: string) => void;
  onClearSelection: () => void;
}

export function WrapperChips({ selected, onToggle, onClearSelection }: WrapperChipsProps) {
  return (
    <div className="eb-wrap-stack">
      <div className="eb-wrap-grid" aria-label="Function wrappers">
        {wrappers.map((wrapper) => {
          const isSelected = selected.includes(wrapper.id);
          return (
            <button
              key={wrapper.id}
              type="button"
              className={`eb-wrap-chip${isSelected ? ' is-selected' : ''}`}
              aria-pressed={isSelected}
              aria-label={`Select ${wrapper.label}: ${wrapper.detail}`}
              title={wrapper.detail}
              onClick={() => onToggle(wrapper.id)}
            >
              <CodeIcon />
              <span aria-hidden="true">{wrapper.label}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="eb-text-btn"
        onClick={onClearSelection}
        disabled={selected.length === 0}
        aria-label="Clear wrapper selection"
      >
        Clear selection
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/builder-ui/test/wrapperChips.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/builder-ui/src/workbench/WrapperChips.tsx packages/builder-ui/test/wrapperChips.test.tsx
git commit -m "feat(builder-ui): selectable scoped wrapper chips with clear-selection"
```

---

## Task 8: Workbench types — toolbox & rule prop changes

**Files:**
- Modify: `packages/builder-ui/src/workbench/types.ts:39-62` (`FieldToolboxPaneProps`), `:63-81` (`ConditionCanvasProps`), `:99-109` (`RuleRowEditorProps`)

- [ ] **Step 1: Update `FieldToolboxPaneProps`**

In `packages/builder-ui/src/workbench/types.ts`, replace the wrapper-related lines at the end of `FieldToolboxPaneProps` (the `selectedRuleId` and `onApplyWrapper` members) with:

```ts
  /** Called when the user double-clicks a field row in the toolbox. */
  onCreateRuleFromField?: (field: FieldDefinition) => void;
  /** Currently selected wrapper ids (palette state). */
  selectedWrappers?: string[];
  /** Toggle a wrapper in the palette selection. */
  onToggleWrapper?: (wrapperId: string) => void;
  /** Clear the entire palette selection. */
  onClearWrapperSelection?: () => void;
```

- [ ] **Step 2: Thread `selectedWrappers` into `ConditionCanvasProps`**

Add to `ConditionCanvasProps` (after `selectedRuleId?`):

```ts
  /** Wrapper ids currently selected in the palette; applied when a rule's "Apply Wrap" is clicked. */
  selectedWrappers?: string[];
```

- [ ] **Step 3: Thread `selectedWrappers` into `RuleRowEditorProps`**

Add to `RuleRowEditorProps` (after `onRequestRemap?`):

```ts
  /** Wrapper ids currently selected in the palette. */
  selectedWrappers?: string[];
```

- [ ] **Step 4: Typecheck (expected partial failures)**

Run: `npm run typecheck`
Expected: FAIL only in `FieldToolboxPane.tsx`, `RuleRowEditor.tsx`, `ConditionGroupCard.tsx`, `ExpressionBuilderShell.tsx`, and the orphaned `components/*` — all fixed in Tasks 9–11.

- [ ] **Step 5: Commit**

```bash
git add packages/builder-ui/src/workbench/types.ts
git commit -m "feat(builder-ui): prop contracts for double-click and wrapper selection"
```

---

## Task 9: RuleRowEditor — optgroups, numeric choice + raw toggle, Apply Wrap, undo

**Files:**
- Modify: `packages/builder-ui/src/workbench/RuleRowEditor.tsx` (whole file)

- [ ] **Step 1: Write the failing test**

Create `packages/builder-ui/test/ruleRowEditor.test.tsx`:

```tsx
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import { RuleRowEditor } from '../src/workbench/RuleRowEditor';
import type { QueryRule } from '../src/composer/querySchema';

afterEach(() => cleanup());

const fields: FieldDefinition[] = [
  { id: 'name', label: 'Name', type: 'string', path: ['name'] },
  { id: 'ownerid.fullname', label: 'Owner Name', type: 'string', path: ['ownerid', 'fullname'], group: 'Owner' },
  { id: 'statuscode', label: 'Status', type: 'choice', path: ['statuscode'], options: [{ label: 'Active', value: 1 }], choices: ['Active'] },
];

const baseRule: QueryRule = { id: 'rule-1', kind: 'rule', fieldId: 'name', operator: 'equals', value: 'Bob' };

function renderRow(rule: QueryRule, extra: Record<string, unknown> = {}) {
  const onUpdate = vi.fn();
  render(
    <RuleRowEditor
      rule={rule}
      fields={fields}
      selected
      onSelect={vi.fn()}
      onUpdate={onUpdate}
      onDuplicate={vi.fn()}
      onDelete={vi.fn()}
      {...extra}
    />,
  );
  return { onUpdate };
}

describe('RuleRowEditor', () => {
  it('groups related fields under an optgroup', () => {
    renderRow(baseRule);
    const select = screen.getByLabelText('Field for Name') as HTMLSelectElement;
    const optgroup = select.querySelector('optgroup');
    expect(optgroup).not.toBeNull();
    expect(optgroup?.label).toBe('Owner');
  });

  it('stores the numeric option value for a choice field', async () => {
    const choiceRule: QueryRule = { id: 'rule-1', kind: 'rule', fieldId: 'statuscode', operator: 'equals', value: 1 };
    const { onUpdate } = renderRow(choiceRule);
    const valueSelect = screen.getByLabelText('Value for Status') as HTMLSelectElement;
    expect(within(valueSelect).getByText('Active')).toBeInTheDocument();
    // selecting an option reports a number
    await userEvent.selectOptions(valueSelect, '1');
    expect(onUpdate).toHaveBeenCalledWith('rule-1', { value: 1 });
  });

  it('applies the selected wrappers via Apply Wrap', async () => {
    const { onUpdate } = renderRow(baseRule, { selectedWrappers: ['toLower', 'trim'] });
    await userEvent.click(screen.getByRole('button', { name: 'Apply Wrap' }));
    expect(onUpdate).toHaveBeenCalledWith('rule-1', { wrappers: ['toLower', 'trim'] });
  });

  it('clears applied wraps with one click', async () => {
    const wrappedRule: QueryRule = { ...baseRule, wrappers: ['toLower'] };
    const { onUpdate } = renderRow(wrappedRule);
    await userEvent.click(screen.getByRole('button', { name: 'Clear wraps' }));
    expect(onUpdate).toHaveBeenCalledWith('rule-1', { wrappers: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/builder-ui/test/ruleRowEditor.test.tsx`
Expected: FAIL — no optgroup, no numeric option storage, no "Apply Wrap"/"Clear wraps" buttons.

- [ ] **Step 3: Rewrite RuleRowEditor**

Replace the entire `packages/builder-ui/src/workbench/RuleRowEditor.tsx`:

```tsx
import { useMemo, useState } from 'react';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import { coerceValueForField, findField, getDefaultValue, getOperatorsForField, getSafeOperator } from '../app/builderState';
import type { RuleRowEditorProps } from './types';
import { DuplicateIcon, GripIcon, TrashIcon, WrapIcon } from './icons/BuilderIcons';

export function RuleRowEditor({
  fields,
  onDelete,
  onDuplicate,
  onSelect,
  onUpdate,
  onRequestRemap,
  rule,
  selected,
  selectedWrappers = [],
}: RuleRowEditorProps) {
  const field = findField(fields, rule.fieldId);
  const fieldLabel = field?.label ?? rule.fieldId;
  const hasError = !rule.value && rule.operator !== 'empty' && rule.operator !== 'notEmpty';
  const [rawValue, setRawValue] = useState(false);
  const appliedWraps = rule.wrappers ?? [];

  // Group fields: ungrouped (primary) first, then one bucket per related table.
  const { primary, grouped } = useMemo(() => {
    const primaryFields: FieldDefinition[] = [];
    const groups = new Map<string, FieldDefinition[]>();
    for (const item of fields) {
      if (item.group) {
        const bucket = groups.get(item.group) ?? [];
        bucket.push(item);
        groups.set(item.group, bucket);
      } else {
        primaryFields.push(item);
      }
    }
    return { primary: primaryFields, grouped: [...groups.entries()] };
  }, [fields]);

  if (!field) {
    return (
      <div
        className={`eb-rule-row-editor is-orphan${selected ? ' is-selected' : ''}`}
        role="group"
        aria-label={`Unknown field ${rule.fieldId}`}
        onClick={() => onSelect(rule.id)}
      >
        <span className="eb-orphan-badge" title="This field is not in the active source" aria-label="Unknown field">
          ⚠ Unknown field
        </span>
        <span className="eb-field-title">{rule.fieldId}</span>
        <span className="eb-muted">{rule.operator} {String(rule.value ?? '')}</span>
        <div className="eb-rule-tools">
          {onRequestRemap ? (
            <button
              type="button"
              className="eb-text-btn"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(rule.id);
                onRequestRemap(rule.id);
              }}
            >
              Remap…
            </button>
          ) : null}
          <button
            type="button"
            className="eb-icon-btn"
            aria-label="Remove rule"
            title="Remove rule"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(rule.id);
            }}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`eb-rule-row-editor ${selected ? 'is-selected' : ''} ${hasError ? 'is-error' : ''}`}
      role="group"
      aria-label={`${fieldLabel} ${rule.operator} ${String(rule.value ?? '')}`}
      onClick={() => onSelect(rule.id)}
      onFocusCapture={() => onSelect(rule.id)}
    >
      <span className="eb-drag-dots">
        <GripIcon />
      </span>
      <span className={`eb-type ${field.type}`}>{getTypeLabel(field.type)}</span>
      <select
        className="eb-select"
        value={rule.fieldId}
        onChange={(event) => {
          const nextField = findField(fields, event.target.value);
          if (!nextField) return;
          onUpdate(rule.id, {
            fieldId: nextField.id,
            operator: getSafeOperator(nextField, rule.operator),
            value: getDefaultValue(nextField),
          });
        }}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Field for ${fieldLabel}`}
        title="Select field"
      >
        {primary.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
        {grouped.map(([groupName, groupFields]) => (
          <optgroup key={groupName} label={groupName}>
            {groupFields.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <select
        className="eb-select"
        value={rule.operator}
        onChange={(event) => onUpdate(rule.id, { operator: event.target.value })}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Operator for ${fieldLabel}`}
        title="Select operator"
      >
        {getOperatorsForField(field).map((operator) => (
          <option key={operator} value={operator}>
            {operator}
          </option>
        ))}
      </select>
      <div className="eb-value-wrap">
        {field.options?.length && !rawValue ? (
          <select
            className="eb-select"
            value={String(rule.value ?? field.options[0].value)}
            onChange={(event) => onUpdate(rule.id, { value: Number(event.target.value) })}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Value for ${fieldLabel}`}
          >
            {field.options.map((option) => (
              <option key={option.value} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        ) : field.options?.length && rawValue ? (
          <input
            className="eb-input"
            type="number"
            value={rule.value === undefined || rule.value === null ? '' : String(rule.value)}
            onChange={(event) => onUpdate(rule.id, { value: event.target.value === '' ? null : Number(event.target.value) })}
            onClick={(e) => e.stopPropagation()}
            placeholder="Raw value"
            aria-label={`Raw value for ${fieldLabel}`}
          />
        ) : field.choices?.length ? (
          <select
            className="eb-select"
            value={String(rule.value ?? '')}
            onChange={(event) => onUpdate(rule.id, { value: event.target.value })}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Value for ${fieldLabel}`}
          >
            {field.choices.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
        ) : field.type === 'boolean' ? (
          <select
            className="eb-select"
            value={String(rule.value ?? false)}
            onChange={(event) => onUpdate(rule.id, { value: event.target.value === 'true' })}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Value for ${fieldLabel}`}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : (
          <input
            className="eb-input"
            type={field.type === 'number' ? 'number' : 'text'}
            value={rule.value === undefined || rule.value === null ? '' : String(rule.value)}
            onChange={(event) => onUpdate(rule.id, { value: coerceValueForField(event.target.value, field) })}
            onClick={(e) => e.stopPropagation()}
            placeholder={hasError ? 'Enter a value' : 'Value'}
            aria-label={`Value for ${fieldLabel}`}
          />
        )}
        {field.options?.length ? (
          <button
            type="button"
            className="eb-icon-btn"
            aria-label="Toggle raw value"
            title="Toggle raw value"
            aria-pressed={rawValue}
            onClick={(e) => {
              e.stopPropagation();
              setRawValue((current) => !current);
            }}
          >
            #
          </button>
        ) : null}
        {appliedWraps.length ? (
          <span className="eb-wrap-chip" aria-label={`Applied wraps: ${appliedWraps.join(', ')}`}>
            <WrapIcon />
            {appliedWraps.join(' · ')}
          </span>
        ) : null}
      </div>
      <div className="eb-rule-tools">
        <button
          type="button"
          className="eb-icon-btn"
          title="Duplicate rule"
          aria-label="Duplicate rule"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(rule.id);
          }}
        >
          <DuplicateIcon />
        </button>
        <button
          type="button"
          className="eb-icon-btn"
          title="Delete rule"
          aria-label="Delete rule"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(rule.id);
          }}
        >
          <TrashIcon />
        </button>
      </div>
      <div className="eb-rule-row-actions">
        <button
          type="button"
          className="eb-action-btn eb-action-subtle"
          onClick={(e) => {
            e.stopPropagation();
            onUpdate(rule.id, { wrappers: selectedWrappers });
          }}
          disabled={selectedWrappers.length === 0}
          aria-label="Apply Wrap"
        >
          Apply Wrap
        </button>
        {appliedWraps.length ? (
          <button
            type="button"
            className="eb-action-btn eb-action-subtle"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(rule.id, { wrappers: [] });
            }}
            aria-label="Clear wraps"
          >
            Clear wraps
          </button>
        ) : null}
      </div>
    </div>
  );
}

function getTypeLabel(type: FieldDefinition['type']): string {
  switch (type) {
    case 'choice': return 'C';
    case 'string': return 'Aa';
    case 'number': return '#';
    case 'dateTime': return 'D';
    case 'boolean': return 'B';
    default: return '?';
  }
}
```

(The local `getDefaultValue` helper is removed — it now comes from `builderState`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/builder-ui/test/ruleRowEditor.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/builder-ui/src/workbench/RuleRowEditor.tsx packages/builder-ui/test/ruleRowEditor.test.tsx
git commit -m "feat(builder-ui): grouped field dropdown, numeric choice values, Apply Wrap + undo"
```

---

## Task 10: FieldToolboxPane — double-click + wrapper-selection plumbing

**Files:**
- Modify: `packages/builder-ui/src/workbench/FieldToolboxPane.tsx` (`FieldList`, destructured props, wrappers tab)
- Modify: `packages/builder-ui/test/fieldToolboxPane.test.tsx` (rewrite to current props)

- [ ] **Step 1: Rewrite the stale toolbox test**

Replace the entire `packages/builder-ui/test/fieldToolboxPane.test.tsx`:

```tsx
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleFields } from '../src/app/sampleData';
import { FieldToolboxPane } from '../src/workbench/FieldToolboxPane';
import type { DataSourceDescriptor } from '../src/composer/querySchema';

const source: DataSourceDescriptor = { kind: 'sample', label: 'Sample fields' };

afterEach(() => cleanup());

function baseProps() {
  return {
    fields: sampleFields,
    source,
    collapsed: false,
    onTabChange: vi.fn(),
    onToggleCollapsed: vi.fn(),
    onSwitchTable: vi.fn(),
    onImport: vi.fn(),
    onAddField: vi.fn(),
    onLoadSamples: vi.fn(),
    onManageProfiles: vi.fn(),
    onRefresh: vi.fn(),
  };
}

describe('FieldToolboxPane', () => {
  it('creates a rule when a field row is double-clicked', async () => {
    const onCreateRuleFromField = vi.fn();
    render(
      <FieldToolboxPane {...baseProps()} activeTab="dynamicContent" onCreateRuleFromField={onCreateRuleFromField} />,
    );

    const list = screen.getByRole('list', { name: 'Dynamic content fields' });
    const firstRow = list.querySelector('.eb-field-row') as HTMLElement;
    await userEvent.dblClick(firstRow);

    expect(onCreateRuleFromField).toHaveBeenCalledTimes(1);
    expect(onCreateRuleFromField.mock.calls[0][0].id).toBe(sampleFields[0].id);
  });

  it('toggles wrapper selection from the wrappers tab', async () => {
    const onToggleWrapper = vi.fn();
    render(
      <FieldToolboxPane
        {...baseProps()}
        activeTab="wrappers"
        selectedWrappers={[]}
        onToggleWrapper={onToggleWrapper}
        onClearWrapperSelection={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Select toLower/ }));
    expect(onToggleWrapper).toHaveBeenCalledWith('toLower');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/builder-ui/test/fieldToolboxPane.test.tsx`
Expected: FAIL — `FieldList` rows have no double-click; wrappers tab still uses old `onApply`.

- [ ] **Step 3: Add double-click to `FieldList`**

In `packages/builder-ui/src/workbench/FieldToolboxPane.tsx`, update the `FieldListProps` interface and `FieldList` component:

```tsx
interface FieldListProps {
  items: FieldDefinition[];
  ariaLabel: string;
  onCreateRuleFromField?: (field: FieldDefinition) => void;
}

function FieldList({ items, ariaLabel, onCreateRuleFromField }: FieldListProps) {
  return (
    <ul className="eb-field-list" role="list" aria-label={ariaLabel}>
      {items.map((field) => (
        <li key={field.id}>
          <div
            className="eb-field-row"
            tabIndex={0}
            onDoubleClick={() => onCreateRuleFromField?.(field)}
            title="Double-click to add a rule"
          >
            <TypeGlyph type={field.type} />
            <span className="eb-field-main">
              <span className="eb-field-title">{field.label}</span>
              <span className="eb-field-detail">
                {field.path.join('.')} &middot; {field.type}
              </span>
            </span>
            <span className="eb-field-type-badge">{field.type}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Update the main component's destructured props and pass-throughs**

In `FieldToolboxPane`, change the destructured props: remove `selectedRuleId` and `onApplyWrapper`; add `onCreateRuleFromField`, `selectedWrappers`, `onToggleWrapper`, `onClearWrapperSelection`. Pass `onCreateRuleFromField` into both `FieldList` usages (primary and related), and replace the wrappers tab body.

Primary `FieldList` usage:

```tsx
                        {filteredPrimary.length > 0 ? (
                          <FieldList
                            items={filteredPrimary}
                            ariaLabel="Dynamic content fields"
                            onCreateRuleFromField={onCreateRuleFromField}
                          />
                        ) : needle ? (
```

Related `FieldList` usage:

```tsx
                              <FieldList
                                items={visibleFields}
                                ariaLabel={section.displayName + ' fields'}
                                onCreateRuleFromField={onCreateRuleFromField}
                              />
```

Wrappers tab body (replace the `<WrapperChips ... />` block):

```tsx
        <div className="eb-toolbox-stack">
          <div className="eb-toolbox-scroll">
            <WrapperChips
              selected={selectedWrappers ?? []}
              onToggle={(wrapperId) => onToggleWrapper?.(wrapperId)}
              onClearSelection={() => onClearWrapperSelection?.()}
            />
          </div>
        </div>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run packages/builder-ui/test/fieldToolboxPane.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/builder-ui/src/workbench/FieldToolboxPane.tsx packages/builder-ui/test/fieldToolboxPane.test.tsx
git commit -m "feat(builder-ui): double-click field to add rule; wire wrapper selection in toolbox"
```

---

## Task 11: Shell + ConditionGroupCard — wire everything; delete legacy components

**Files:**
- Modify: `packages/builder-ui/src/workbench/ConditionGroupCard.tsx` (thread `selectedWrappers`)
- Modify: `packages/builder-ui/src/app/ExpressionBuilderShell.tsx` (state + handlers)
- Modify: `packages/builder-ui/test/sharedBuilderUi.test.tsx` (wrapper test)
- Delete: `packages/builder-ui/src/components/RuleInspectorPane.tsx`, `ConditionSummaryRow.tsx`, `ConditionMasterPane.tsx`

- [ ] **Step 1: Rewrite the integration wrapper test**

In `packages/builder-ui/test/sharedBuilderUi.test.tsx`, replace the test at lines 94–103 (`'case-insensitive fix wraps both sides in toLower()'`):

```tsx
  it('applies a selected toLower wrapper to both sides of a rule', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} initialDocument={sampleDocument} />);

    const approverRow = screen.getByRole('group', { name: /Approver contains finance/i });
    await user.click(approverRow);

    // Select the toLower wrapper in the Wrappers tab.
    await user.click(screen.getByRole('tab', { name: /wrappers/i }));
    await user.click(screen.getByRole('button', { name: /Select toLower/ }));

    // Apply it from the rule row.
    await user.click(within(approverRow).getByRole('button', { name: 'Apply Wrap' }));

    expect(screen.getByLabelText('Generated expression')).toHaveTextContent('toLower(');
    expect(screen.getByLabelText('Generated expression')).toHaveTextContent("toLower('finance')");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/builder-ui/test/sharedBuilderUi.test.tsx -t "applies a selected toLower wrapper"`
Expected: FAIL — wiring not yet in the shell.

- [ ] **Step 3: Thread `selectedWrappers` through ConditionGroupCard**

In `packages/builder-ui/src/workbench/ConditionGroupCard.tsx`: add `selectedWrappers?: string[];` to `ConditionGroupCardProps`, add `selectedWrappers` to the destructured params, pass it to the recursive `<ConditionGroupCard ... selectedWrappers={selectedWrappers} />` and to `<RuleRowEditor ... selectedWrappers={selectedWrappers} />`.

The recursive call adds:

```tsx
              selectedWrappers={selectedWrappers}
```

The `RuleRowEditor` call adds:

```tsx
              selectedWrappers={selectedWrappers}
```

- [ ] **Step 4: Wire the shell**

In `packages/builder-ui/src/app/ExpressionBuilderShell.tsx`:

Add imports — extend the `queryActions` import is not needed, but extend the `builderState` import:

```ts
import { deriveBuilderState, findFirstRule, findParentGroupId, findRule, getDefaultValue, getSafeOperator } from './builderState';
```

Add wrapper-selection state near the other `useState` calls (after `relatedSections`):

```ts
  const [selectedWrappers, setSelectedWrappers] = useState<string[]>([]);
```

Add a `createRuleFromField` handler (near `loadSampleFields`):

```ts
  const createRuleFromField = (field: FieldDefinition) => {
    setDocument((current) => {
      const targetGroupId = findParentGroupId(current.root, current.selectedRuleId) ?? current.root.id;
      return addRule(current, targetGroupId, {
        fieldId: field.id,
        operator: getSafeOperator(field, 'equals'),
        value: getDefaultValue(field),
      });
    });
  };

  const toggleWrapper = (wrapperId: string) =>
    setSelectedWrappers((current) =>
      current.includes(wrapperId) ? current.filter((id) => id !== wrapperId) : [...current, wrapperId],
    );
```

Update the `<FieldToolboxPane ... />` props: remove `selectedRuleId={selectedRule?.id}` and the `onApplyWrapper={...}` block; add:

```tsx
            onCreateRuleFromField={createRuleFromField}
            selectedWrappers={selectedWrappers}
            onToggleWrapper={toggleWrapper}
            onClearWrapperSelection={() => setSelectedWrappers([])}
```

Update the `onAddRule` handler to use `getDefaultValue` so option-backed choices default to a numeric value:

```tsx
              onAddRule={(groupId) =>
                setDocument((current) =>
                  addRule(current, groupId, {
                    fieldId: current.fields[0]?.id ?? '',
                    operator: 'equals',
                    value: getDefaultValue(current.fields[0]),
                  }),
                )
              }
```

Pass `selectedWrappers` to the canvas — in `<ConditionCanvas ... />` add:

```tsx
              selectedWrappers={selectedWrappers}
```

- [ ] **Step 5: Delete the orphaned legacy components**

```bash
git rm packages/builder-ui/src/components/RuleInspectorPane.tsx packages/builder-ui/src/components/ConditionSummaryRow.tsx packages/builder-ui/src/components/ConditionMasterPane.tsx
```

- [ ] **Step 6: Run the integration test + verify no dangling imports**

Run: `npx vitest run packages/builder-ui/test/sharedBuilderUi.test.tsx`
Expected: PASS (all cases).

Run: `grep -rn "RuleInspectorPane\|ConditionSummaryRow\|ConditionMasterPane" packages/builder-ui/src`
Expected: no output (no remaining references).

- [ ] **Step 7: Commit**

```bash
git add packages/builder-ui/src/workbench/ConditionGroupCard.tsx packages/builder-ui/src/app/ExpressionBuilderShell.tsx packages/builder-ui/test/sharedBuilderUi.test.tsx
git commit -m "feat(builder-ui): wire double-click rule creation and stackable wrappers; remove legacy panes"
```

---

## Task 12: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck the whole repo**

Run: `npm run typecheck`
Expected: PASS, no errors.

- [ ] **Step 2: Run the entire unit suite**

Run: `npm test`
Expected: PASS. If any pre-existing test references removed props/labels (e.g. searches for "Wrap both sides in toLower()", `onConnect`, `onApplyWrapper`, `valueFunction`, `caseInsensitive`), update it to the new API and re-run. Do not weaken assertions to pass.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS. Fix any unused-import or unused-variable errors introduced by the refactors (notably the removed `isStringComparison`/`wrapNullableStringField` in the engine and the removed `getDefaultValue` local in `RuleRowEditor`).

- [ ] **Step 4: Manual sanity (optional, if a dev server is available)**

Run: `npm run dev:pptb`
Confirm: double-clicking a field adds a rule to the selected group; related-table fields appear under optgroups; a choice field shows labels but the preview emits the numeric value; selecting wrappers + "Apply Wrap" wraps both sides; "Clear wraps" and "Clear selection" each work in one click.

- [ ] **Step 5: Final commit (if Step 2/3 required fixes)**

```bash
git add -A
git commit -m "test: align suite with new field/wrapper APIs"
```

---

## Self-Review Notes

- **Spec coverage:** Change 1 → Tasks 5 (`findParentGroupId`), 10 (double-click), 11 (shell wiring). Change 2 → Task 9 (optgroups). Change 3 → Tasks 1, 3, 5, 9 (options model, metadata, defaults/literal type, UI + raw toggle). Change 4 → Tasks 2, 4, 5, 7, 9, 11 (remove legacy, schema, AST, chips, Apply Wrap/undo, shell). Validation → Task 6. Cleanup → Task 11.
- **Type consistency:** `getDefaultValue` (builderState, exported) used by RuleRowEditor + shell; `findParentGroupId` signature `(node, ruleId?)`; `WrapperChips` props `{selected,onToggle,onClearSelection}`; toolbox props `{onCreateRuleFromField,selectedWrappers,onToggleWrapper,onClearWrapperSelection}`; rule applies wrappers via `onUpdate(id,{wrappers})`.
- **No placeholders:** every code step shows full content; tests include real assertions.
