import type { FunctionCallNode, ValueType } from './types';

const BOOLEAN_FUNCTIONS = new Set([
  'and',
  'or',
  'equals',
  'greater',
  'less',
  'greaterOrEquals',
  'lessOrEquals',
  'contains',
  'startsWith',
  'endsWith',
  'empty',
  'not',
]);

export function inferFunctionReturnType(node: FunctionCallNode): ValueType | 'boolean' {
  if (BOOLEAN_FUNCTIONS.has(node.name)) {
    return 'boolean';
  }

  if (node.name === 'utcNow' || node.name === 'addDays') {
    return 'dateTime';
  }

  if (node.name === 'ticks') {
    return 'number';
  }

  if (node.name === 'toLower' || node.name === 'toUpper' || node.name === 'trim' || node.name === 'coalesce') {
    return 'string';
  }

  return 'unknown';
}

export function isTicksCall(node: FunctionCallNode): boolean {
  return node.name === 'ticks';
}
