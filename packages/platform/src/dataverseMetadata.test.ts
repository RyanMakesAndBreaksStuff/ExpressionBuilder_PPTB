import { describe, expect, it } from 'vitest';
import { mapDataverseAttribute, type DataverseAttributeMetadata } from './dataverseMetadata';

const base = (over: Partial<DataverseAttributeMetadata>): DataverseAttributeMetadata => ({
  LogicalName: 'name',
  AttributeType: 'String',
  DisplayName: { UserLocalizedLabel: { Label: 'Name' } },
  RequiredLevel: { Value: 'None' },
  ...over,
});

describe('mapDataverseAttribute', () => {
  it('maps String/Memo to string', () => {
    expect(mapDataverseAttribute(base({ AttributeType: 'String' }))?.type).toBe('string');
    expect(mapDataverseAttribute(base({ AttributeType: 'Memo' }))?.type).toBe('string');
  });

  it('maps numeric families to number', () => {
    for (const t of ['Integer', 'BigInt', 'Decimal', 'Double', 'Money']) {
      expect(mapDataverseAttribute(base({ AttributeType: t }))?.type).toBe('number');
    }
  });

  it('maps Boolean and DateTime', () => {
    expect(mapDataverseAttribute(base({ AttributeType: 'Boolean' }))?.type).toBe('boolean');
    expect(mapDataverseAttribute(base({ AttributeType: 'DateTime' }))?.type).toBe('dateTime');
  });

  it('maps Picklist/State/Status to choice with labels', () => {
    const field = mapDataverseAttribute(
      base({
        AttributeType: 'Picklist',
        OptionSet: {
          Options: [
            { Value: 1, Label: { UserLocalizedLabel: { Label: 'Open' } } },
            { Value: 2, Label: { UserLocalizedLabel: { Label: 'Closed' } } },
          ],
        },
      }),
    );
    expect(field?.type).toBe('choice');
    expect(field?.choices).toEqual(['Open', 'Closed']);
  });

  it('treats MultiSelectPicklist as nullable choice', () => {
    const field = mapDataverseAttribute(
      base({ AttributeType: 'MultiSelectPicklist', RequiredLevel: { Value: 'ApplicationRequired' } }),
    );
    expect(field?.type).toBe('choice');
    expect(field?.nullable).toBe(true);
  });

  it('maps Lookup/Customer/Owner/Uniqueidentifier to string', () => {
    for (const t of ['Lookup', 'Customer', 'Owner', 'Uniqueidentifier']) {
      expect(mapDataverseAttribute(base({ AttributeType: t }))?.type).toBe('string');
    }
  });

  it('derives nullable from RequiredLevel', () => {
    expect(mapDataverseAttribute(base({ RequiredLevel: { Value: 'None' } }))?.nullable).toBe(true);
    expect(mapDataverseAttribute(base({ RequiredLevel: { Value: 'SystemRequired' } }))?.nullable).toBe(false);
  });

  it('returns null for unsupported File/Image/EntityName', () => {
    for (const t of ['File', 'Image', 'EntityName']) {
      expect(mapDataverseAttribute(base({ AttributeType: t }))).toBeNull();
    }
  });

  it('prefers AttributeTypeName.Value when present', () => {
    const field = mapDataverseAttribute(
      base({ AttributeType: undefined, AttributeTypeName: { Value: 'MoneyType' } }),
    );
    expect(field?.type).toBe('number');
  });
});

describe('mapDataverseAttribute — choice options', () => {
  it('captures numeric option values alongside labels', () => {
    const field = mapDataverseAttribute({
      LogicalName: 'statuscode',
      AttributeType: 'Status',
      OptionSet: {
        Options: [
          { Value: 1, Label: { UserLocalizedLabel: { Label: 'Active' } } },
          { Value: 2, Label: { UserLocalizedLabel: { Label: 'Inactive' } } },
        ],
      },
    });

    expect(field?.type).toBe('choice');
    expect(field?.options).toEqual([
      { label: 'Active', value: 1 },
      { label: 'Inactive', value: 2 },
    ]);
    expect(field?.choices).toEqual(['Active', 'Inactive']);
  });
});

describe('mapDataverseAttribute — scalar lookup payload paths', () => {
  it('uses a _value payload leaf for Lookup, Customer, and Owner', () => {
    const cases = [
      { attributeType: 'Lookup', logicalName: 'parentaccountid' },
      { attributeType: 'Customer', logicalName: 'customerid' },
      { attributeType: 'Owner', logicalName: 'ownerid' },
    ] as const;

    for (const { attributeType, logicalName } of cases) {
      const field = mapDataverseAttribute(
        base({ LogicalName: logicalName, AttributeType: attributeType }),
      );
      expect(field).toMatchObject({
        id: logicalName,
        logicalName,
        path: [`_${logicalName}_value`],
        type: 'string',
      });
    }
  });

  it('keeps Uniqueidentifier and PartyList on the logical-name leaf', () => {
    for (const attributeType of ['Uniqueidentifier', 'PartyList'] as const) {
      const field = mapDataverseAttribute(
        base({ LogicalName: 'accountid', AttributeType: attributeType }),
      );
      expect(field).toMatchObject({
        id: 'accountid',
        logicalName: 'accountid',
        path: ['accountid'],
        type: 'string',
      });
    }
  });

  it('rewrites only a lookup leaf under an expanded navigation prefix', () => {
    const lookup = mapDataverseAttribute(
      base({ LogicalName: 'ownerid', AttributeType: 'Lookup' }),
      ['customerid_account'],
    );
    expect(lookup).toMatchObject({
      id: 'customerid_account.ownerid',
      logicalName: 'ownerid',
      path: ['customerid_account', '_ownerid_value'],
    });

    const name = mapDataverseAttribute(
      base({ LogicalName: 'name', AttributeType: 'String' }),
      ['customerid_account'],
    );
    expect(name).toMatchObject({
      id: 'customerid_account.name',
      logicalName: 'name',
      path: ['customerid_account', 'name'],
    });
  });

  it('preserves a custom logical name inside the lookup payload leaf', () => {
    const field = mapDataverseAttribute(
      base({ LogicalName: 'new_accountid', AttributeType: 'Lookup' }),
    );
    expect(field).toMatchObject({
      id: 'new_accountid',
      logicalName: 'new_accountid',
      path: ['_new_accountid_value'],
    });
  });

  it('reads LookupType from AttributeTypeName for the payload leaf', () => {
    const field = mapDataverseAttribute(
      base({
        LogicalName: 'ownerid',
        AttributeType: undefined,
        AttributeTypeName: { Value: 'LookupType' },
      }),
    );
    expect(field).toMatchObject({
      id: 'ownerid',
      logicalName: 'ownerid',
      path: ['_ownerid_value'],
    });
  });
});
