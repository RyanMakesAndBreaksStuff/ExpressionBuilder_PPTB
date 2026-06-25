import type { FieldDefinition, FieldType } from '@ryanmakes/eb_engine';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;

function inferType(value: unknown): FieldType | null {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return ISO_DATE.test(value.trim()) ? 'dateTime' : 'string';
  return null; // null/array/object handled by caller
}

function titleCase(segment: string): string {
  return segment
    .replace(/[_\-.]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Infer fields from a single sample record. Nested objects flatten to dotted paths.
 * Arrays are skipped (no element model). Returns `source: 'json'` fields.
 */
export function inferFieldsFromSample(
  record: Record<string, unknown>,
  prefix: string[] = [],
): FieldDefinition[] {
  const fields: FieldDefinition[] = [];

  for (const [key, value] of Object.entries(record)) {
    const path = [...prefix, key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      fields.push(...inferFieldsFromSample(value as Record<string, unknown>, path));
      continue;
    }
    const type = inferType(value);
    if (type === null) continue; // skip null/array — let the user add manually
    fields.push({
      id: path.join('.'),
      label: titleCase(key),
      type,
      path,
      source: 'json',
    });
  }
  return fields;
}

/** Parse a pasted sample object string into inferred fields. */
export function parseSampleRecord(source: string): FieldDefinition[] | { error: string } {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return { error: 'JSON is not valid.' };
  }
  const record = Array.isArray(value) ? value[0] : value;
  if (typeof record !== 'object' || record === null) {
    return { error: 'Expected a JSON object (or an array of objects).' };
  }
  return inferFieldsFromSample(record as Record<string, unknown>);
}
