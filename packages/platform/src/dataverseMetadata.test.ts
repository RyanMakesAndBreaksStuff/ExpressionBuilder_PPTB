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
