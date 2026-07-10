import type { ExpressionMode, FieldDefinition } from './types';

function quotePathSegment(segment: string): string {
  return segment.replaceAll("'", "''");
}

export function formatFieldReference(field: FieldDefinition, mode: ExpressionMode): string {
  const root = mode === 'triggerCondition' ? 'triggerBody()' : 'item()';
  return field.path.reduce((expression, segment) => {
    const accessor = '?';
    return `${expression}${accessor}['${quotePathSegment(segment)}']`;
  }, root);
}
