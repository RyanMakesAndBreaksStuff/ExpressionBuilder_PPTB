import { describe, expect, it, vi } from 'vitest';
import { applySource, discoverThroughAdapter, resolveOrphans } from '../src/app/sourceState';
import type { QueryDocument, QueryGroup } from '../src/composer/querySchema';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';

const root: QueryGroup = {
  id: 'root',
  kind: 'group',
  conjunction: 'and',
  children: [{ id: 'r1', kind: 'rule', fieldId: 'Amount', operator: 'greater', value: 1 }],
};

const doc: QueryDocument = { version: 2, mode: 'triggerCondition', fields: [], root };

describe('sourceState', () => {
  it('applySource records provenance + fetchedAt', () => {
    const next = applySource(doc, { kind: 'import', label: 'JSON' }, [
      { id: 'Amount', label: 'Amount', type: 'number', path: ['Amount'] },
    ]);
    expect(next.source?.kind).toBe('import');
    expect(typeof next.source?.fetchedAt).toBe('number');
    expect(next.fields).toHaveLength(1);
  });

  it('discoverThroughAdapter prefers discoverFields', async () => {
    const adapter = {
      discoverFields: vi.fn().mockResolvedValue({ fields: [{ id: 'x' }] }),
      getDataverseFields: vi.fn(),
    } as unknown as PlatformAdapter;
    const result = await discoverThroughAdapter(adapter, 'account');
    expect(result.fields).toHaveLength(1);
    expect(adapter.getDataverseFields).not.toHaveBeenCalled();
  });

  it('discoverThroughAdapter falls back to getDataverseFields', async () => {
    const adapter = {
      getDataverseFields: vi.fn().mockResolvedValue([{ id: 'y', label: 'Y', type: 'string', path: ['y'] }]),
    } as unknown as PlatformAdapter;
    const result = await discoverThroughAdapter(adapter, 'account');
    expect(result.fields).toHaveLength(1);
  });

  it('resolveOrphans flags referenced-but-missing fields', () => {
    expect([...resolveOrphans(root, [])]).toEqual(['Amount']);
    expect([...resolveOrphans(root, [{ id: 'Amount', label: 'A', type: 'number', path: ['Amount'] }])]).toEqual([]);
  });
});
