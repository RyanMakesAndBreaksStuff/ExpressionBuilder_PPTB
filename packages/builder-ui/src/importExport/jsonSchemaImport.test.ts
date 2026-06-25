import { describe, expect, it } from 'vitest';
import { importJsonSchema, type JsonSchemaImportResult } from './jsonSchemaImport';

const ok = (result: ReturnType<typeof importJsonSchema>): JsonSchemaImportResult => {
  if ('error' in result) throw new Error(`Expected ok but got error: ${result.error}`);
  return result;
};

describe('importJsonSchema', () => {
  it('maps string/integer/boolean/number to correct FieldTypes', () => {
    const result = ok(
      importJsonSchema(
        JSON.stringify({
          properties: {
            name: { type: 'string' },
            age: { type: 'integer' },
            score: { type: 'number' },
            active: { type: 'boolean' },
          },
        }),
      ),
    );
    expect(result.fields.map((f) => f.type)).toEqual(['string', 'number', 'number', 'boolean']);
  });

  it('maps string+date-time format to dateTime', () => {
    const result = ok(
      importJsonSchema(
        JSON.stringify({ properties: { created: { type: 'string', format: 'date-time' } } }),
      ),
    );
    expect(result.fields[0].type).toBe('dateTime');
  });

  it('maps enum to choice with choices array', () => {
    const result = ok(
      importJsonSchema(
        JSON.stringify({ properties: { status: { type: 'string', enum: ['open', 'closed'] } } }),
      ),
    );
    expect(result.fields[0].type).toBe('choice');
    expect(result.fields[0].choices).toEqual(['open', 'closed']);
  });

  it('handles nullable type array (string | null)', () => {
    const result = ok(
      importJsonSchema(
        JSON.stringify({ properties: { note: { type: ['string', 'null'] } } }),
      ),
    );
    expect(result.fields[0].type).toBe('string');
  });

  it('uses title as label when provided', () => {
    const result = ok(
      importJsonSchema(
        JSON.stringify({ properties: { firstName: { type: 'string', title: 'First Name' } } }),
      ),
    );
    expect(result.fields[0].label).toBe('First Name');
  });

  it('warns on unsupported types and defaults to string', () => {
    const result = ok(
      importJsonSchema(JSON.stringify({ properties: { data: { type: 'object' } } })),
    );
    expect(result.fields[0].type).toBe('string');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('tags fields with source: jsonSchema', () => {
    const result = ok(
      importJsonSchema(JSON.stringify({ properties: { x: { type: 'string' } } })),
    );
    expect(result.fields[0].source).toBe('jsonSchema');
  });

  it('returns error for invalid JSON', () => {
    const result = importJsonSchema('{bad}');
    expect('error' in result).toBe(true);
  });

  it('returns error when properties is missing', () => {
    const result = importJsonSchema(JSON.stringify({ type: 'object' }));
    expect('error' in result).toBe(true);
  });
});
