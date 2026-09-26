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

/** One step into a pasted payload: an object key (string) or an array index (number). */
export type PayloadPathSegment = string | number;
export type PayloadPath = readonly PayloadPathSegment[];

/** Where the pasted payload came from, which decides the reference's root function. */
export type PayloadReferenceRoot =
  | { kind: 'triggerBody' | 'triggerOutputs' }
  | { kind: 'body' | 'outputs'; actionName: string };

export interface PayloadReference {
  root: PayloadReferenceRoot;
  path: PayloadPath;
}

/**
 * Trims the name and turns each run of whitespace into one underscore. Case is
 * kept: flow expressions match action names case-sensitively.
 */
function normalizeActionName(name: string): string {
  return name.trim().replace(/\s+/g, '_');
}

export function formatPayloadRoot(root: PayloadReferenceRoot): string {
  if (root.kind === 'body' || root.kind === 'outputs') {
    return `${root.kind}('${quotePathSegment(normalizeActionName(root.actionName))}')`;
  }
  return `${root.kind}()`;
}

/**
 * The root expression plus one accessor per path segment, and nothing else: a
 * key becomes ?['key'] with apostrophes doubled, an index becomes [n]. Returns
 * the bare expression; wrapping it for use inside text is the caller's choice.
 */
export function formatPayloadReference({ root, path }: PayloadReference): string {
  return path.reduce<string>(
    (expression, segment) =>
      typeof segment === 'number'
        ? `${expression}[${segment}]`
        : `${expression}?['${quotePathSegment(segment)}']`,
    formatPayloadRoot(root),
  );
}
