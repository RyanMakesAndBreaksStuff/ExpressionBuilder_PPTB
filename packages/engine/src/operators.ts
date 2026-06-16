import type { FieldType } from './types';

export const OPERATORS_BY_FIELD_TYPE: Record<FieldType, readonly string[]> = {
  string: ['equals', 'notEquals', 'contains', 'startsWith', 'endsWith', 'empty', 'notEmpty'],
  choice: ['equals', 'notEquals', 'empty', 'notEmpty'],
  number: ['equals', 'notEquals', 'greater', 'less', 'greaterOrEquals', 'lessOrEquals'],
  boolean: ['equals', 'notEquals'],
  dateTime: ['equals', 'notEquals', 'greater', 'less', 'greaterOrEquals', 'lessOrEquals'],
};

export const UNARY_OPERATORS = new Set(['empty', 'notEmpty']);

export function isOperatorSupported(fieldType: FieldType, operator: string): boolean {
  return OPERATORS_BY_FIELD_TYPE[fieldType].includes(operator);
}

export function needsRightOperand(operator: string): boolean {
  return !UNARY_OPERATORS.has(operator);
}

export function isDateComparison(operator: string): boolean {
  return ['equals', 'notEquals', 'greater', 'less', 'greaterOrEquals', 'lessOrEquals'].includes(operator);
}

export function isStringComparison(operator: string): boolean {
  return ['equals', 'notEquals', 'contains', 'startsWith', 'endsWith'].includes(operator);
}
