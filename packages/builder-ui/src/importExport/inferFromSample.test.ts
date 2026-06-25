import { describe, expect, it } from 'vitest';
import { inferFieldsFromSample, parseSampleRecord } from './inferFromSample';

describe('inferFieldsFromSample', () => {
  it('infers string, number, boolean primitives', () => {
    const fields = inferFieldsFromSample({ name: 'Alice', age: 30, active: true });
    expect(fields.map((f) => f.type)).toEqual(['string', 'number', 'boolean']);
    expect(fields.map((f) => f.id)).toEqual(['name', 'age', 'active']);
  });

  it('infers dateTime from ISO date strings', () => {
    const fields = inferFieldsFromSample({ createdAt: '2024-01-15T08:00:00Z', date: '2024-06-01' });
    expect(fields.every((f) => f.type === 'dateTime')).toBe(true);
  });

  it('flattens nested objects to dotted paths', () => {
    const fields = inferFieldsFromSample({ address: { city: 'Austin', zip: '78701' } });
    expect(fields.map((f) => f.id)).toEqual(['address.city', 'address.zip']);
    expect(fields[0].path).toEqual(['address', 'city']);
  });

  it('skips null and array values', () => {
    const fields = inferFieldsFromSample({ name: null, tags: ['a', 'b'], score: 5 });
    expect(fields).toHaveLength(1);
    expect(fields[0].id).toBe('score');
  });

  it('produces title-cased labels from snake_case keys', () => {
    const fields = inferFieldsFromSample({ first_name: 'Bob' });
    expect(fields[0].label).toBe('First Name');
  });

  it('tags fields with source: json', () => {
    const fields = inferFieldsFromSample({ x: 1 });
    expect(fields[0].source).toBe('json');
  });
});

describe('parseSampleRecord', () => {
  it('parses a valid object', () => {
    const result = parseSampleRecord('{"status": "active", "count": 3}');
    expect(Array.isArray(result)).toBe(true);
    expect((result as ReturnType<typeof inferFieldsFromSample>).map((f) => f.type)).toEqual([
      'string',
      'number',
    ]);
  });

  it('accepts the first element of an array', () => {
    const result = parseSampleRecord('[{"x": true}]');
    expect(Array.isArray(result)).toBe(true);
    expect((result as ReturnType<typeof inferFieldsFromSample>)[0].type).toBe('boolean');
  });

  it('returns error for invalid JSON', () => {
    const result = parseSampleRecord('{bad json}');
    expect('error' in result).toBe(true);
  });

  it('returns error for non-object JSON', () => {
    const result = parseSampleRecord('"just a string"');
    expect('error' in result).toBe(true);
  });
});
