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

export function findField(fields: FieldDefinition[], fieldId: string): FieldDefinition | undefined {
  return fields.find((field) => field.id === fieldId);
}

// Tree-walk helpers live in the composer data layer (single source of truth).
// Re-exported here so app-layer consumers keep importing from builderState.
export { findRule, findParentGroupId, findFirstRule } from '../composer/queryActions';

export function getOperatorsForField(field?: FieldDefinition): readonly string[] {
  return field ? OPERATORS_BY_FIELD_TYPE[field.type] : [];
}

export function getSafeOperator(field: FieldDefinition, operator: string): string {
  return isOperatorSupported(field.type, operator) ? operator : OPERATORS_BY_FIELD_TYPE[field.type][0];
}

export function remapRulePatch(target: FieldDefinition, currentOperator: string): RulePatch {
  return {
    fieldId: target.id,
    operator: getSafeOperator(target, currentOperator),
    value: getDefaultValue(target),
  };
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

function needsValue(operator: string): boolean {
  return operator !== 'empty' && operator !== 'notEmpty';
}
