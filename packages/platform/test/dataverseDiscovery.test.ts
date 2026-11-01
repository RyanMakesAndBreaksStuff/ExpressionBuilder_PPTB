import { describe, expect, it, vi } from 'vitest';
import { createPptbAdapter } from '../src/pptbAdapter';
import type { DataverseApi } from '../src/dataverseApi';

const entities = [
  { LogicalName: 'account', DisplayName: { UserLocalizedLabel: { Label: 'Account' } }, IsCustomEntity: false },
  { LogicalName: 'new_widget', DisplayName: { UserLocalizedLabel: { Label: 'Widget' } }, IsCustomEntity: true },
];

// Base attributes come back WITHOUT OptionSet — the host's getEntityRelatedMetadata
// 3rd arg is $select-only and cannot pull the OptionSet navigation property. The
// adapter must fetch it separately via path navigation (enrichOptionSets).
const attributes = [
  { LogicalName: 'name', AttributeType: 'String', DisplayName: { UserLocalizedLabel: { Label: 'Name' } } },
  {
    LogicalName: 'statuscode',
    AttributeType: 'Status',
    DisplayName: { UserLocalizedLabel: { Label: 'Status' } },
  },
];

const statusOptionSet = { Options: [{ Value: 1, Label: { UserLocalizedLabel: { Label: 'Active' } } }] };

// Serves relationships/attributes for the base path, and the OptionSet entity for the
// deep cast+navigation path so the two-phase enrich flow is exercised end to end.
const relatedMetadata = vi.fn((_entity: string, path: string) =>
  Promise.resolve(path.endsWith('/OptionSet') ? statusOptionSet : { value: attributes }),
);

function mockDv(over: Partial<DataverseApi> = {}): DataverseApi {
  return {
    getAllEntitiesMetadata: vi.fn().mockResolvedValue(entities),
    getEntityRelatedMetadata: relatedMetadata,
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

  it('discoverFields maps attributes and loads choice labels via OptionSet navigation', async () => {
    const dv = mockDv();
    const adapter = createPptbAdapter(undefined, dv);
    const result = await adapter.discoverFields?.({ table: 'account' });
    expect(result?.fields.map((f) => f.type)).toEqual(['string', 'choice']);
    expect(result?.fields[0].source).toBe('dataverse');
    // Choice labels arrive only through the second-phase path navigation. The host's
    // 3rd arg is $select-only (`['OptionSet']` → 0x80060888), so options MUST come from
    // a cast+/OptionSet fetch. This assertion fails if that navigation is dropped.
    expect(result?.fields[1].choices).toEqual(['Active']);
    expect(dv.getEntityRelatedMetadata).toHaveBeenCalledWith('account', 'Attributes');
    expect(dv.getEntityRelatedMetadata).toHaveBeenCalledWith(
      'account',
      "Attributes(LogicalName='statuscode')/Microsoft.Dynamics.CRM.StatusAttributeMetadata/OptionSet",
    );
  });

  it('degrades to empty + notify when bridge missing', async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined);
    const adapter = createPptbAdapter({ utils: { showNotification } }, undefined);
    const result = await adapter.discoverFields?.({ table: 'account' });
    expect(result?.fields).toEqual([]);
    expect(showNotification).toHaveBeenCalled();
  });

  it('rejects when the primary attribute fetch fails, without notifying', async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined);
    const getEntityRelatedMetadata = vi.fn().mockRejectedValue(new Error('primary metadata unavailable'));
    const adapter = createPptbAdapter({ utils: { showNotification } }, { getEntityRelatedMetadata });
    await expect(adapter.discoverFields?.({ table: 'account' })).rejects.toThrow('primary metadata unavailable');
    expect(showNotification).not.toHaveBeenCalled();
  });

  it('maps Lookup, Customer, and Owner payload leaves without changing id or logicalName', async () => {
    const getEntityRelatedMetadata = vi.fn().mockResolvedValue({
      value: [
        { LogicalName: 'parentaccountid', AttributeType: 'Lookup' },
        { LogicalName: 'customerid', AttributeType: 'Customer' },
        { LogicalName: 'ownerid', AttributeType: 'Owner' },
        { LogicalName: 'accountid', AttributeType: 'Uniqueidentifier' },
        { LogicalName: 'from', AttributeType: 'PartyList' },
      ],
    });
    const adapter = createPptbAdapter(undefined, { getEntityRelatedMetadata });
    const result = await adapter.discoverFields?.({ table: 'account' });
    expect(result?.fields.map((field) => ({
      id: field.id,
      logicalName: field.logicalName,
      path: field.path,
    }))).toEqual([
      { id: 'parentaccountid', logicalName: 'parentaccountid', path: ['_parentaccountid_value'] },
      { id: 'customerid', logicalName: 'customerid', path: ['_customerid_value'] },
      { id: 'ownerid', logicalName: 'ownerid', path: ['_ownerid_value'] },
      { id: 'accountid', logicalName: 'accountid', path: ['accountid'] },
      { id: 'from', logicalName: 'from', path: ['from'] },
    ]);
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
    // Related attributes use the same base 'Attributes' fetch; choice options (if any)
    // load via the same second-phase OptionSet navigation as primary fields.
    expect(getEntityRelatedMetadata).toHaveBeenCalledWith('systemuser', 'Attributes');
  });

  const ownerRelationship = {
    value: [{ ReferencingEntityNavigationPropertyName: 'ownerid', ReferencedEntity: 'systemuser' }],
  };
  const fullNameAttribute = {
    value: [
      {
        LogicalName: 'fullname',
        AttributeType: 'String',
        DisplayName: { UserLocalizedLabel: { Label: 'Full Name' } },
      },
    ],
  };

  it('rejects when the related attribute fetch fails', async () => {
    const failure = new Error('related attribute metadata unavailable');
    const getEntityRelatedMetadata = vi
      .fn()
      .mockResolvedValueOnce(ownerRelationship)
      .mockRejectedValueOnce(failure);
    const adapter = createPptbAdapter(undefined, { getEntityRelatedMetadata });
    await expect(adapter.discoverRelatedFields?.('account', 'ownerid')).rejects.toBe(failure);
    expect(getEntityRelatedMetadata).toHaveBeenNthCalledWith(2, 'systemuser', 'Attributes');
  });

  it('resolves fields: [] when related attributes are successfully empty', async () => {
    const getEntityRelatedMetadata = vi
      .fn()
      .mockResolvedValueOnce(ownerRelationship)
      .mockResolvedValueOnce({ value: [] });
    const adapter = createPptbAdapter(undefined, { getEntityRelatedMetadata });
    await expect(adapter.discoverRelatedFields?.('account', 'ownerid')).resolves.toEqual({
      fields: [],
      fetchedAt: expect.any(Number),
    });
  });

  it('returns related fields on a later successful retry', async () => {
    const failure = new Error('related attribute metadata unavailable');
    const getEntityRelatedMetadata = vi
      .fn()
      .mockResolvedValueOnce(ownerRelationship)
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(ownerRelationship)
      .mockResolvedValueOnce(fullNameAttribute);
    const adapter = createPptbAdapter(undefined, { getEntityRelatedMetadata });
    await expect(adapter.discoverRelatedFields?.('account', 'ownerid')).rejects.toBe(failure);
    const result = await adapter.discoverRelatedFields?.('account', 'ownerid');
    expect(result?.fields[0].path).toEqual(['ownerid', 'fullname']);
    expect(result?.fields[0].group).toBe('systemuser');
  });

  it('still returns related fields when OptionSet enrichment fails', async () => {
    const getEntityRelatedMetadata = vi
      .fn()
      .mockResolvedValueOnce(ownerRelationship)
      .mockResolvedValueOnce({
        value: [
          {
            LogicalName: 'statuscode',
            AttributeType: 'Status',
            DisplayName: { UserLocalizedLabel: { Label: 'Status' } },
          },
        ],
      })
      .mockRejectedValueOnce(new Error('option set unavailable'));
    const adapter = createPptbAdapter(undefined, { getEntityRelatedMetadata });
    const result = await adapter.discoverRelatedFields?.('account', 'ownerid');
    expect(result?.fields[0]).toMatchObject({
      path: ['ownerid', 'statuscode'],
      type: 'choice',
      group: 'systemuser',
    });
    expect(result?.fields[0].choices).toBeUndefined();
    expect(getEntityRelatedMetadata).toHaveBeenCalledWith(
      'systemuser',
      "Attributes(LogicalName='statuscode')/Microsoft.Dynamics.CRM.StatusAttributeMetadata/OptionSet",
    );
  });

  it('keeps an expanded navigation prefix and rewrites only a lookup leaf', async () => {
    const getEntityRelatedMetadata = vi
      .fn()
      .mockResolvedValueOnce({
        value: [{ ReferencingEntityNavigationPropertyName: 'customerid_account', ReferencedEntity: 'account' }],
      })
      .mockResolvedValueOnce({
        value: [
          { LogicalName: 'name', AttributeType: 'String' },
          { LogicalName: 'ownerid', AttributeType: 'Lookup' },
          { LogicalName: 'accountid', AttributeType: 'Uniqueidentifier' },
          { LogicalName: 'from', AttributeType: 'PartyList' },
        ],
      });
    const adapter = createPptbAdapter(undefined, { getEntityRelatedMetadata });
    const result = await adapter.discoverRelatedFields?.('incident', 'customerid_account');
    expect(result?.fields.map((field) => ({
      id: field.id,
      logicalName: field.logicalName,
      path: field.path,
    }))).toEqual([
      { id: 'customerid_account.name', logicalName: 'name', path: ['customerid_account', 'name'] },
      { id: 'customerid_account.ownerid', logicalName: 'ownerid', path: ['customerid_account', '_ownerid_value'] },
      { id: 'customerid_account.accountid', logicalName: 'accountid', path: ['customerid_account', 'accountid'] },
      { id: 'customerid_account.from', logicalName: 'from', path: ['customerid_account', 'from'] },
    ]);
  });
});
