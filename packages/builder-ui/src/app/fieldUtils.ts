import type { FieldDefinition } from '@ryanmakes/eb_engine';

/**
 * Runtime guard: confirms an array of unknowns looks like FieldDefinition[].
 * Lives in a .ts file (not .tsx) to avoid TSX generic-parsing ambiguities.
 */
export function isFieldDefinitionArray(arr: unknown[]): arr is FieldDefinition[] {
  return arr.every((item) => {
    if (typeof item !== 'object' || item === null) return false;
    const rec = item as Record<string, unknown>;
    return rec['id'] !== undefined && rec['label'] !== undefined
      && rec['type'] !== undefined && rec['path'] !== undefined;
  });
}
