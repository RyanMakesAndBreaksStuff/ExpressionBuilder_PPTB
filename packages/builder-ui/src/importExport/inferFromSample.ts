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
 * `~` → `~0`, `.` → `~1`, empty → `~2`. Tilde is escaped first so a literal
 * `~1` or `~2` cannot look like an encoded dot or empty segment.
 */
function encodePathSegment(segment: string): string {
  const escaped = segment.replaceAll('~', '~0').replaceAll('.', '~1');
  return escaped.length === 0 ? '~2' : escaped;
}

function fieldId(path: readonly string[]): string {
  return path.map(encodePathSegment).join('.');
}

/**
 * Infer fields from a single sample record. Nested objects flatten to dotted ids.
 * Segments are encoded before joining so those ids are injective. Original path
 * segments and labels are kept. Arrays are skipped (no element model).
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
      id: fieldId(path),
      label: titleCase(key),
      type,
      path,
      source: 'json',
    });
  }
  return fields;
}

function duplicateInferredId(fields: readonly FieldDefinition[]): string | undefined {
  const seen = new Set<string>();
  for (const field of fields) {
    if (seen.has(field.id)) return field.id;
    seen.add(field.id);
  }
  return undefined;
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
  const fields = inferFieldsFromSample(record as Record<string, unknown>);
  // Distinct paths encode to distinct ids, and JSON object keys are unique, so
  // this cannot fire for a value Object.entries will walk. Kept so an encoder
  // regression cannot import two fields under one id.
  const duplicateId = duplicateInferredId(fields);
  if (duplicateId !== undefined) {
    return { error: `Inferred field id "${duplicateId}" is duplicated.` };
  }
  return fields;
}
