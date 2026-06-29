import type { FieldDefinition, FieldType } from '@ryanmakes/eb_engine';

export interface FieldImportDiagnostic {
  severity: 'error' | 'warning';
  message: string;
}

export type FieldImportResult =
  | { ok: true; fields: FieldDefinition[]; warnings: FieldImportDiagnostic[] }
  | { ok: false; diagnostics: FieldImportDiagnostic[] };

const FIELD_TYPES = new Set<FieldType>(['string', 'number', 'boolean', 'dateTime', 'choice']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parse and validate a pasted `FieldDefinition[]` JSON string. */
export function parseFieldImport(source: string): FieldImportResult {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return { ok: false, diagnostics: [{ severity: 'error', message: 'JSON is not valid.' }] };
  }

  const list =
    Array.isArray(value)
      ? value
      : isRecord(value) && Array.isArray(value.fields)
        ? value.fields
        : null;

  if (!list) {
    return {
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          message:
            'Expected a JSON array of fields (or an object with a "fields" array).',
        },
      ],
    };
  }

  const diagnostics: FieldImportDiagnostic[] = [];
  const warnings: FieldImportDiagnostic[] = [];
  const fields: FieldDefinition[] = [];
  const seen = new Set<string>();

  list.forEach((raw, index) => {
    const at = `fields[${index}]`;
    if (!isRecord(raw)) {
      diagnostics.push({ severity: 'error', message: `${at} must be an object.` });
      return;
    }
    const id = typeof raw.id === 'string' ? raw.id : '';
    const label = typeof raw.label === 'string' ? raw.label : '';
    const type = raw.type as FieldType;

    if (!id) diagnostics.push({ severity: 'error', message: `${at}.id is required.` });
    if (!label) diagnostics.push({ severity: 'error', message: `${at}.label is required.` });
    if (!FIELD_TYPES.has(type))
      diagnostics.push({ severity: 'error', message: `${at}.type "${String(raw.type)}" is invalid.` });
    if (id && seen.has(id))
      diagnostics.push({ severity: 'error', message: `${at}.id "${id}" is duplicated.` });
    if (id) seen.add(id);

    const path =
      Array.isArray(raw.path) && raw.path.every((s) => typeof s === 'string')
        ? (raw.path as string[])
        : id
          ? [id]
          : [];
    if (!Array.isArray(raw.path)) {
      warnings.push({ severity: 'warning', message: `${at}.path missing — defaulted to [id].` });
    }

    if (id && label && FIELD_TYPES.has(type)) {
      const field: FieldDefinition = { id, label, type, path, source: 'json' };
      if (
        Array.isArray(raw.choices) &&
        raw.choices.every((c) => typeof c === 'string')
      ) {
        field.choices = raw.choices as string[];
      }
      if (
        Array.isArray(raw.options) &&
        raw.options.every(
          (o) => isRecord(o) && typeof o.label === 'string' && typeof o.value === 'number',
        )
      ) {
        field.options = (raw.options as Array<{ label: string; value: number }>).map((o) => ({
          label: o.label,
          value: o.value,
        }));
        // Enum choice fields show labels but emit int values; derive choices for
        // any consumer that reads the string list when none was supplied.
        if (!field.choices) {
          field.choices = field.options.map((o) => o.label);
        }
      }
      if (typeof raw.nullable === 'boolean') field.nullable = raw.nullable;
      fields.push(field);
    }
  });

  if (diagnostics.length > 0) {
    return { ok: false, diagnostics };
  }
  return { ok: true, fields, warnings };
}
