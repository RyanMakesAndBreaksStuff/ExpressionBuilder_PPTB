import { describe, expect, it } from 'vitest';
import { importCsv } from './csvImport';

const ok = (result: ReturnType<typeof importCsv>) => {
  if ('error' in result) throw new Error(`Expected fields but got error: ${result.error}`);
  return result;
};

describe('importCsv', () => {
  it('parses a header-only CSV and defaults types to string', () => {
    const fields = ok(importCsv('Name,Age,Active'));
    expect(fields.map((f) => f.id)).toEqual(['Name', 'Age', 'Active']);
    expect(fields.every((f) => f.type === 'string')).toBe(true);
  });

  it('infers types from the first data row', () => {
    const fields = ok(importCsv('Name,Age,Active,Score\nAlice,30,true,9.5'));
    expect(fields.map((f) => f.type)).toEqual(['string', 'number', 'boolean', 'number']);
  });

  it('infers dateTime from ISO date values', () => {
    const fields = ok(importCsv('Created\n2024-01-15'));
    expect(fields[0].type).toBe('dateTime');
  });

  it('slugifies headers with spaces', () => {
    const fields = ok(importCsv('First Name,Last Name'));
    expect(fields.map((f) => f.id)).toEqual(['First_Name', 'Last_Name']);
  });

  it('handles quoted commas in headers', () => {
    const fields = ok(importCsv('"Last, Name",Age'));
    expect(fields[0].id).toBe('Last__Name');
    expect(fields[0].label).toBe('Last, Name');
  });

  it('deduplicates clashing slug ids', () => {
    const fields = ok(importCsv('Name,Name'));
    const ids = fields.map((f) => f.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('uses fallback label for empty header cells', () => {
    const fields = ok(importCsv(',Status'));
    expect(fields[0].label).toBe('Column 1');
  });

  it('tags fields with source: csv', () => {
    const fields = ok(importCsv('x\n1'));
    expect(fields[0].source).toBe('csv');
  });

  it('returns error for empty input', () => {
    const result = importCsv('   \n  ');
    expect('error' in result).toBe(true);
  });
});
