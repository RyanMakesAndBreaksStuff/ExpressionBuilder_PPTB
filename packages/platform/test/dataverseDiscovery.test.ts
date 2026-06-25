import { describe, expect, it, vi } from 'vitest';
import { createPptbAdapter } from '../src/pptbAdapter';
import type { DataverseApi } from '../src/dataverseApi';

const entities = [
  { LogicalName: 'account', DisplayName: { UserLocalizedLabel: { Label: 'Account' } }, IsCustomEntity: false },
  { LogicalName: 'new_widget', DisplayName: { UserLocalizedLabel: { Label: 'Widget' } }, IsCustomEntity: true },
];

const attributes = [
  { LogicalName: 'name', AttributeType: 'String', DisplayName: { UserLocalizedLabel: { Label: 'Name' } } },
  {
    LogicalName: 'statuscode',
    AttributeType: 'Status',
    DisplayName: { UserLocalizedLabel: { Label: 'Status' } },
    OptionSet: { Options: [{ Value: 1, Label: { UserLocalizedLabel: { Label: 'Active' } } }] },
  },
];

function mockDv(over: Partial<DataverseApi> = {}): DataverseApi {
  return {
    getAllEntitiesMetadata: vi.fn().mockResolvedValue(entities),
    getEntityRelatedMetadata: vi.fn().mockResolvedValue({ value: attributes }),
    ...over,
  };
}

describe('PPTB adapter discovery', () => {
  it('getTables maps entities to TableRef with isSystem', async () => {
    const adapter = createPptbAdapter(undefined, mockDv());
    const tables = await adapter.getTables?.();
    expect(tables?.map((t) => t.displayName)).toEqual(['Account', 'Widget']);
    expect(tables?.[0].isSystem).toBe(true);
    expect(tables?.[1].isSystem).toBe(false);
  });

  it('getTables unwraps the { value: [...] } response shape', async () => {
    const adapter = createPptbAdapter(
      undefined,
      mockDv({ getAllEntitiesMetadata: vi.fn().mockResolvedValue({ value: entities }) }),
    );
    const tables = await adapter.getTables?.();
    expect(tables?.map((t) => t.displayName)).toEqual(['Account', 'Widget']);
  });

  it('discoverFields maps attributes incl. choice labels', async () => {
    const adapter = createPptbAdapter(undefined, mockDv());
    const result = await adapter.discoverFields?.({ table: 'account' });
    expect(result?.fields.map((f) => f.type)).toEqual(['string', 'choice']);
    expect(result?.fields[1].choices).toEqual(['Active']);
    expect(result?.fields[0].source).toBe('dataverse');
  });

  it('degrades to empty + notify when bridge missing', async () => {
    const notify = vi.fn().mockResolvedValue(undefined);
    const adapter = createPptbAdapter({ notify } as never, undefined);
    const result = await adapter.discoverFields?.({ table: 'account' });
    expect(result?.fields).toEqual([]);
    expect(notify).toHaveBeenCalled();
  });
});

describe('PPTB adapter related discovery', () => {
  it('discoverRelatedFields flattens under the navigation property with a group label', async () => {
    const getEntityRelatedMetadata = vi
      .fn()
      .mockResolvedValueOnce({ value: [{ ReferencingEntityNavigationPropertyName: 'ownerid', ReferencedEntity: 'systemuser' }] })
      .mockResolvedValueOnce({ value: [{ LogicalName: 'fullname', AttributeType: 'String', DisplayName: { UserLocalizedLabel: { Label: 'Full Name' } } }] });
    const adapter = createPptbAdapter(undefined, { getEntityRelatedMetadata });
    const result = await adapter.discoverRelatedFields?.('account', 'ownerid');
    expect(result?.fields[0].path).toEqual(['ownerid', 'fullname']);
    expect(result?.fields[0].group).toBe('systemuser');
  });
});
