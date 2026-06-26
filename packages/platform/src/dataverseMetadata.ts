import type { FieldDefinition, FieldType } from '@ryanmakes/eb_engine';

/**
 * Minimal shape of a Dataverse attribute as returned by the PPTB
 * `dataverseAPI.getEntityRelatedMetadata(table, 'Attributes', ...)` call.
 * Only the properties the mapper reads are modeled.
 */
export interface DataverseAttributeMetadata {
  LogicalName: string;
  /** Legacy enum string, e.g. 'String' | 'Picklist' | 'Money' | 'Lookup'. */
  AttributeType?: string;
  /** v9 structured type name; preferred when present (e.g. 'MoneyType'). */
  AttributeTypeName?: { Value?: string } | null;
  DisplayName?: { UserLocalizedLabel?: { Label?: string } | null } | null;
  RequiredLevel?: { Value?: string } | null;
  /** Present for choice-like attributes after OptionSet expansion. */
  OptionSet?: { Options?: DataverseOptionLabel[] } | null;
  IsValidForRead?: boolean;
}

export interface DataverseOptionLabel {
  Value: number;
  Label?: { UserLocalizedLabel?: { Label?: string } | null } | null;
}

const STRING_TYPES = new Set(['String', 'Memo']);
const NUMBER_TYPES = new Set(['Integer', 'BigInt', 'Decimal', 'Double', 'Money']);
const STRING_LIKE_REF_TYPES = new Set([
  'Lookup',
  'Customer',
  'Owner',
  'Uniqueidentifier',
  'PartyList',
]);
const CHOICE_SINGLE_TYPES = new Set(['Picklist', 'State', 'Status']);
/** Types we deliberately drop — the engine has no representation for them. */
const UNSUPPORTED_TYPES = new Set(['File', 'Image', 'EntityName', 'Virtual', 'CalendarRules']);

function attrTypeOf(attr: DataverseAttributeMetadata): string | undefined {
  return attr.AttributeTypeName?.Value?.replace(/Type$/, '') ?? attr.AttributeType;
}

function labelOf(attr: DataverseAttributeMetadata): string {
  return attr.DisplayName?.UserLocalizedLabel?.Label?.trim() || attr.LogicalName;
}

function choicesOf(attr: DataverseAttributeMetadata): string[] | undefined {
  const options = attr.OptionSet?.Options;
  if (!options?.length) {
    return undefined;
  }
  return options.map(
    (option) => option.Label?.UserLocalizedLabel?.Label?.trim() || String(option.Value),
  );
}

function optionsOf(attr: DataverseAttributeMetadata): Array<{ label: string; value: number }> | undefined {
  const options = attr.OptionSet?.Options;
  if (!options?.length) {
    return undefined;
  }
  return options.map((option) => ({
    label: option.Label?.UserLocalizedLabel?.Label?.trim() || String(option.Value),
    value: option.Value,
  }));
}

function isRequired(attr: DataverseAttributeMetadata): boolean {
  const level = attr.RequiredLevel?.Value;
  return level === 'SystemRequired' || level === 'ApplicationRequired';
}

function fieldTypeFor(dvType: string | undefined): FieldType | null {
  if (!dvType) {
    return null;
  }
  if (STRING_TYPES.has(dvType) || STRING_LIKE_REF_TYPES.has(dvType)) {
    return 'string';
  }
  if (NUMBER_TYPES.has(dvType)) {
    return 'number';
  }
  if (dvType === 'Boolean') {
    return 'boolean';
  }
  if (dvType === 'DateTime') {
    return 'dateTime';
  }
  if (CHOICE_SINGLE_TYPES.has(dvType) || dvType === 'MultiSelectPicklist') {
    return 'choice';
  }
  return null;
}

/**
 * Map a single Dataverse attribute to a builder `FieldDefinition`.
 * Returns `null` for unsupported types (File/Image/EntityName/Virtual).
 *
 * @param attr Attribute metadata (OptionSet already expanded for choice types).
 * @param pathPrefix Optional navigation prefix for related/flattened fields (T14).
 */
export function mapDataverseAttribute(
  attr: DataverseAttributeMetadata,
  pathPrefix: string[] = [],
): FieldDefinition | null {
  const dvType = attrTypeOf(attr);
  if (!dvType || UNSUPPORTED_TYPES.has(dvType)) {
    return null;
  }

  const type = fieldTypeFor(dvType);
  if (type === null) {
    return null;
  }

  const path = [...pathPrefix, attr.LogicalName];
  const field: FieldDefinition = {
    id: path.join('.'),
    label: labelOf(attr),
    type,
    path,
    source: 'dataverse',
    logicalName: attr.LogicalName,
    nullable: !isRequired(attr),
  };

  if (type === 'choice') {
    const options = optionsOf(attr);
    if (options) {
      field.options = options;
      field.choices = options.map((option) => option.label);
    }
    // MultiSelectPicklist holds zero-or-more values; treat as nullable regardless of RequiredLevel.
    if (dvType === 'MultiSelectPicklist') {
      field.nullable = true;
    }
  }

  return field;
}

/** Map a list of attributes, dropping unsupported ones. */
export function mapDataverseAttributes(
  attrs: DataverseAttributeMetadata[],
  pathPrefix: string[] = [],
): FieldDefinition[] {
  return attrs
    .filter((attr) => attr.IsValidForRead !== false)
    .map((attr) => mapDataverseAttribute(attr, pathPrefix))
    .filter((field): field is FieldDefinition => field !== null);
}
