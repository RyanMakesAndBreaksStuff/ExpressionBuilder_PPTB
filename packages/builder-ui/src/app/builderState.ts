import {
  formatExpression,
  isOperatorSupported,
  OPERATORS_BY_FIELD_TYPE,
  type ExpressionMode,
  type ExpressionNode,
  type FieldDefinition,
  type FormatDiagnostic,
  type FormatResult,
  type LiteralNode,
} from '@ryanmakes/eb_engine';
import type { QueryDocument, QueryGroup, QueryNode, QueryRule, RulePatch } from '../composer/querySchema';

export interface DerivedBuilderState {
  expression: string;
  diagnostics: FormatDiagnostic[];
  formatResult: FormatResult;
}

export function deriveBuilderState(document: QueryDocument): DerivedBuilderState {
  const ast = queryGroupToAst(document.root, document.fields);
  const formatResult = formatExpression(ast, {
    mode: document.mode,
    fields: document.fields,
  });

  return {
    expression: formatResult.expression,
    diagnostics: formatResult.diagnostics,
    formatResult,
  };
}

export function queryGroupToAst(group: QueryGroup, fields: FieldDefinition[]): ExpressionNode {
  return {
    kind: 'group',
    conjunction: group.conjunction,
    children: group.children.map((child) => queryNodeToAst(child, fields)),
  };
}

export function queryNodeToAst(node: QueryNode, fields: FieldDefinition[]): ExpressionNode {
  if (node.kind === 'group') {
    return queryGroupToAst(node, fields);
  }

  const field = findField(fields, node.fieldId);
  const right = needsValue(node.operator) ? literalForRule(node, field) : undefined;

  return {
    kind: 'rule',
    operator: node.operator,
    caseInsensitive: node.caseInsensitive,
    left: {
      kind: 'field',
      fieldId: node.fieldId,
    },
    right,
  };
}

export function findField(fields: FieldDefinition[], fieldId: string): FieldDefinition | undefined {
  return fields.find((field) => field.id === fieldId);
}

export function findRule(root: QueryNode, ruleId?: string): QueryRule | undefined {
  if (!ruleId) {
    return findFirstRule(root);
  }

  if (root.kind === 'rule') {
    return root.id === ruleId ? root : undefined;
  }

  for (const child of root.children) {
    const match = findRule(child, ruleId);
    if (match) {
      return match;
    }
  }

  return undefined;
}

export function findFirstRule(node: QueryNode): QueryRule | undefined {
  if (node.kind === 'rule') {
    return node;
  }

  for (const child of node.children) {
    const match = findFirstRule(child);
    if (match) {
      return match;
    }
  }

  return undefined;
}

export function getOperatorsForField(field?: FieldDefinition): readonly string[] {
  return field ? OPERATORS_BY_FIELD_TYPE[field.type] : [];
}

export function getSafeOperator(field: FieldDefinition, operator: string): string {
  return isOperatorSupported(field.type, operator) ? operator : OPERATORS_BY_FIELD_TYPE[field.type][0];
}

export function countRules(node: QueryNode): number {
  if (node.kind === 'rule') {
    return 1;
  }

  return node.children.reduce((total, child) => total + countRules(child), 0);
}

export function literalValueType(field?: FieldDefinition): LiteralNode['valueType'] {
  if (!field) {
    return 'unknown';
  }

  return field.type === 'choice' ? 'string' : field.type;
}

export function coerceValueForField(value: string, field?: FieldDefinition): QueryRule['value'] {
  if (!field) {
    return value;
  }

  if (field.type === 'number') {
    return value.trim() === '' ? null : Number(value);
  }

  if (field.type === 'boolean') {
    return value === 'true';
  }

  return value;
}

export function modeLabel(mode: ExpressionMode): string {
  return mode === 'triggerCondition' ? 'Trigger condition' : 'Filter array';
}

function literalForRule(rule: QueryRule, field?: FieldDefinition): LiteralNode {
  const value: LiteralNode['value'] = rule.value === undefined ? defaultValueForField(field) : rule.value;

  return {
    kind: 'literal',
    value,
    valueType: value === null ? 'null' : literalValueType(field),
  };
}

function defaultValueForField(field?: FieldDefinition): LiteralNode['value'] {
  if (!field) {
    return '';
  }

  if (field.type === 'number') {
    return 0;
  }

  if (field.type === 'boolean') {
    return false;
  }

  return field.choices?.[0] ?? '';
}

function needsValue(operator: string): boolean {
  return operator !== 'empty' && operator !== 'notEmpty';
}

// ── Remap helpers (T17) ─────────────────────────────────────────────────────

/**
 * Compute the patch to remap an orphaned rule onto `target`.
 * Keeps the operator when the target type still supports it; otherwise resets to
 * the target's first safe operator and picks a sensible default value.
 */
export function remapRulePatch(target: FieldDefinition, currentOperator: string): RulePatch {
  const operator = getSafeOperator(target, currentOperator);
  return {
    fieldId: target.id,
    operator,
    // Reset value only when the operator changed (cross-type) to avoid carrying an incompatible literal.
    value: operator === currentOperator ? undefined : defaultValueForRemap(target),
  };
}

function defaultValueForRemap(field: FieldDefinition): string | number | boolean {
  if (field.choices?.length) return field.choices[0];
  if (field.type === 'number') return 0;
  if (field.type === 'boolean') return false;
  return '';
}
