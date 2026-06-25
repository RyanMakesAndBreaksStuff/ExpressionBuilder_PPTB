import type { FieldDefinition, FieldType } from '@ryanmakes/eb_engine';

interface JsonSchemaProperty {
  type?: string | string[];
  format?: string;
  enum?: unknown[];
  title?: string;
}

interface JsonSchema {
  properties?: Record<string, JsonSchemaProperty>;
}

export interface JsonSchemaImportResult {
  fields: FieldDefinition[];
  warnings: string[];
}

function primaryType(type: string | string[] | undefined): string | undefined {
  if (Array.isArray(type)) return type.find((t) => t !== 'null');
  return type;
}

function mapType(prop: JsonSchemaProperty, warnings: string[], key: string): FieldType {
  if (Array.isArray(prop.enum) && prop.enum.length > 0) return 'choice';
  const t = primaryType(prop.type);
  if (t === 'integer' || t === 'number') return 'number';
  if (t === 'boolean') return 'boolean';
  if (t === 'string')
    return prop.format === 'date-time' || prop.format === 'date' ? 'dateTime' : 'string';
  warnings.push(
    `Property "${key}" has unsupported type "${String(prop.type)}" — defaulted to string.`,
  );
  return 'string';
}

export function importJsonSchema(source: string): JsonSchemaImportResult | { error: string } {
  let schema: JsonSchema;
  try {
    schema = JSON.parse(source) as JsonSchema;
  } catch {
    return { error: 'JSON is not valid.' };
  }
  if (!schema.properties || typeof schema.properties !== 'object') {
    return { error: 'Schema has no "properties" object.' };
  }

  const warnings: string[] = [];
  const fields: FieldDefinition[] = Object.entries(schema.properties).map(([key, prop]) => {
    const type = mapType(prop, warnings, key);
    const field: FieldDefinition = {
      id: key,
      label: prop.title ?? key,
      type,
      path: [key],
      source: 'jsonSchema',
    };
    if (type === 'choice' && Array.isArray(prop.enum)) {
      field.choices = prop.enum.map((v) => String(v));
    }
    return field;
  });

  return { fields, warnings };
}
