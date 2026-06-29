import { describe, expect, it } from 'vitest';
import { parseFieldImport } from './fieldImport';

describe('parseFieldImport', () => {
  it('carries enum options through and derives choices when only options are present', () => {
    const result = parseFieldImport(
      JSON.stringify([
        {
          id: 'accountclassificationcode',
          label: 'Classification',
          type: 'choice',
          path: ['accountclassificationcode'],
          options: [
            { label: 'Default Value', value: 1 },
            { label: 'Preferred', value: 2 },
          ],
        },
      ]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [field] = result.fields;
    expect(field.options).toEqual([
      { label: 'Default Value', value: 1 },
      { label: 'Preferred', value: 2 },
    ]);
    // Derived label list so string-list consumers still render a dropdown.
    expect(field.choices).toEqual(['Default Value', 'Preferred']);
  });

  it('keeps an explicit choices list rather than overwriting it from options', () => {
    const result = parseFieldImport(
      JSON.stringify([
        {
          id: 'status',
          label: 'Status',
          type: 'choice',
          path: ['status'],
          choices: ['Open', 'Closed'],
          options: [
            { label: 'Open', value: 1 },
            { label: 'Closed', value: 2 },
          ],
        },
      ]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fields[0].choices).toEqual(['Open', 'Closed']);
    expect(result.fields[0].options).toHaveLength(2);
  });

  it('ignores malformed options without failing the import', () => {
    const result = parseFieldImport(
      JSON.stringify([
        {
          id: 'region',
          label: 'Region',
          type: 'choice',
          path: ['region'],
          options: [{ label: 'EMEA' }, { value: 2 }],
        },
      ]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fields[0].options).toBeUndefined();
  });
});
