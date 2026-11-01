import type { FieldDefinition, FieldType } from '@ryanmakes/eb_engine';

export interface JsonSchemaImportResult {
  fields: FieldDefinition[];
  warnings: string[];
}

const UNSUPPORTED_SHAPE_ERROR = 'Unsupported JSON Schema shape.';

type EnumOptions = NonNullable<FieldDefinition['options']>;

type ClassifiedEnum =
  | { kind: 'invalid'; messages: string[] }
  | { kind: 'string'; choices: string[] }
  | { kind: 'number'; integral: boolean; options: EnumOptions }
  | { kind: 'boolean' }
  | { kind: 'boolean-singleton'; value: boolean };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function primaryType(type: unknown): unknown {
  if (Array.isArray(type)) return type.find((t) => t !== 'null');
  return type;
}

function unsupportedTypeWarning(key: string, type: unknown): string {
  return `Property "${key}" has unsupported type "${String(type)}" — defaulted to string.`;
}

function schemaFieldType(prop: Record<string, unknown>): FieldType | undefined {
  const t = primaryType(prop.type);
  if (t === 'integer' || t === 'number') return 'number';
  if (t === 'boolean') return 'boolean';
  if (t === 'string')
    return prop.format === 'date-time' || prop.format === 'date' ? 'dateTime' : 'string';
  return undefined;
}

/** `reportAbsentType` keeps a typeless property on the pre-enum warning path. */
function fallbackField(
  prop: Record<string, unknown>,
  warnings: string[],
  key: string,
  reportAbsentType: boolean,
): FieldDefinition {
  const mapped = schemaFieldType(prop);
  if (mapped) return baseField(key, prop, mapped);
  if (prop.type !== undefined || reportAbsentType) {
    warnings.push(unsupportedTypeWarning(key, prop.type));
  }
  return baseField(key, prop, 'string');
}

function enumRejected(key: string, problem: string): string {
  return `Property "${key}" enum ${problem} — enum was not imported.`;
}

function declaredTypeLabel(type: unknown): string {
  const primary = primaryType(type);
  if (typeof primary === 'string') return primary;
  return JSON.stringify(type);
}

function enumConflicts(
  kind: 'string' | 'number' | 'boolean',
  integral: boolean,
  type: unknown,
): boolean {
  if (type === undefined) return false;
  const primary = primaryType(type);
  if (kind === 'string') return primary !== 'string';
  if (kind === 'boolean') return primary !== 'boolean';
  if (primary === 'number') return false;
  if (primary === 'integer') return !integral;
  return true;
}

function classifyEnum(key: string, members: unknown[]): ClassifiedEnum {
  let sawString = false;
  let sawFinite = false;
  let sawBoolean = false;
  let sawTrue = false;
  let sawFalse = false;
  let sawObject = false;
  let sawNull = false;
  let sawNonFinite = false;
  let integral = true;
  const choices: string[] = [];
  const options: EnumOptions = [];

  for (const member of members) {
    if (typeof member === 'string') {
      sawString = true;
      choices.push(member);
      continue;
    }
    if (typeof member === 'number') {
      if (!Number.isFinite(member)) {
        sawNonFinite = true;
        continue;
      }
      sawFinite = true;
      if (!Number.isInteger(member)) integral = false;
      options.push({ label: String(member), value: member });
      continue;
    }
    if (typeof member === 'boolean') {
      sawBoolean = true;
      if (member) sawTrue = true;
      else sawFalse = true;
      continue;
    }
    if (member === null) {
      sawNull = true;
      continue;
    }
    sawObject = true;
  }

  const messages: string[] = [];
  if (sawObject) messages.push(enumRejected(key, 'has an object or array member'));
  if (sawNull) messages.push(enumRejected(key, 'has a null member'));
  if (sawNonFinite) messages.push(enumRejected(key, 'has a non-finite number'));
  const scalarKinds = [sawString, sawFinite, sawBoolean].filter(Boolean).length;
  if (scalarKinds > 1) messages.push(enumRejected(key, 'has mixed member types'));
  if (messages.length > 0) return { kind: 'invalid', messages };

  if (sawString) return { kind: 'string', choices };
  if (sawFinite) return { kind: 'number', integral, options };
  if (sawTrue && sawFalse) return { kind: 'boolean' };
  return { kind: 'boolean-singleton', value: sawTrue };
}

function baseField(key: string, prop: Record<string, unknown>, type: FieldType): FieldDefinition {
  return {
    id: key,
    label: typeof prop.title === 'string' ? prop.title : key,
    type,
    path: [key],
    source: 'jsonSchema',
  };
}

function fieldFromEnum(
  prop: Record<string, unknown>,
  warnings: string[],
  key: string,
): FieldDefinition {
  const members = prop.enum;
  if (!Array.isArray(members) || members.length === 0) {
    return fallbackField(prop, warnings, key, true);
  }

  const classified = classifyEnum(key, members);
  if (classified.kind === 'invalid') {
    warnings.push(...classified.messages);
    return fallbackField(prop, warnings, key, false);
  }

  const conflictKind =
    classified.kind === 'number' ? 'number' : classified.kind === 'string' ? 'string' : 'boolean';
  const integral = classified.kind === 'number' ? classified.integral : true;
  if (enumConflicts(conflictKind, integral, prop.type)) {
    warnings.push(
      enumRejected(key, `conflicts with declared type "${declaredTypeLabel(prop.type)}"`),
    );
    return fallbackField(prop, warnings, key, true);
  }

  if (classified.kind === 'string') {
    return { ...baseField(key, prop, 'choice'), choices: classified.choices };
  }
  if (classified.kind === 'number') {
    return { ...baseField(key, prop, 'number'), options: classified.options };
  }
  if (classified.kind === 'boolean-singleton') {
    // A two-value boolean control cannot enforce a one-value enum.
    warnings.push(
      `Property "${key}" enum limitation: only ${classified.value} is allowed — the boolean editor cannot enforce a single value.`,
    );
  }
  return baseField(key, prop, 'boolean');
}

export function importJsonSchema(source: string): JsonSchemaImportResult | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return { error: 'JSON is not valid.' };
  }
  if (!isRecord(parsed)) return { error: UNSUPPORTED_SHAPE_ERROR };
  if (!isRecord(parsed.properties)) return { error: 'Schema has no "properties" object.' };

  const warnings: string[] = [];
  const fields: FieldDefinition[] = [];
  for (const [key, prop] of Object.entries(parsed.properties)) {
    if (!isRecord(prop)) return { error: UNSUPPORTED_SHAPE_ERROR };
    fields.push(fieldFromEnum(prop, warnings, key));
  }

  return { fields, warnings };
}
