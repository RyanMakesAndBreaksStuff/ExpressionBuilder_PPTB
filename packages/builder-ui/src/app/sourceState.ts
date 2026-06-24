import type { FieldDefinition, FieldType } from '@ryanmakes/eb_engine';
import type {
  DiscoverFieldsResult,
  PlatformAdapter,
  PlatformSettings,
} from '@ryanmakes/eb_platformadapter';
import type {
  DataSourceDescriptor,
  QueryDocument,
  QueryGroup,
  QueryNode,
} from '../composer/querySchema';
import { readCache, writeCache } from '../importExport/metadataCache';

/** The runtime view of the active source: the descriptor plus its resolved fields. */
export interface ActiveSource {
  descriptor: DataSourceDescriptor;
  fields: FieldDefinition[];
}

const EMPTY_SOURCE: ActiveSource = {
  descriptor: { kind: 'unknown' },
  fields: [],
};

export function emptySource(): ActiveSource {
  return EMPTY_SOURCE;
}

/** Apply a discovered/imported field set to a document, recording provenance. */
export function applySource(
  document: QueryDocument,
  descriptor: DataSourceDescriptor,
  fields: FieldDefinition[],
): QueryDocument {
  return {
    ...document,
    version: 2,
    fields,
    source: { ...descriptor, fetchedAt: descriptor.fetchedAt ?? Date.now() },
  };
}

/**
 * Discover fields through the adapter, preferring the new contract and falling back to the
 * deprecated `getDataverseFields`. Never injects samples; returns an empty set on miss.
 */
export async function discoverThroughAdapter(
  adapter: PlatformAdapter,
  table?: string,
  includeRelated?: boolean,
): Promise<DiscoverFieldsResult> {
  if (adapter.discoverFields) {
    return adapter.discoverFields({ table, includeRelated });
  }

  const legacy = await adapter.getDataverseFields();
  const fields = Array.isArray(legacy) ? (legacy as FieldDefinition[]) : [];
  return { fields };
}

/** Cache-aware discovery: serves fresh cache unless `refresh`, otherwise discovers + writes through. */
export async function discoverCached(
  adapter: PlatformAdapter,
  settings: PlatformSettings,
  table: string,
  includeRelated: boolean,
  refresh: boolean,
): Promise<FieldDefinition[]> {
  if (!refresh) {
    const cached = await readCache(settings, table, includeRelated);
    if (cached) return cached;
  }
  const result = await discoverThroughAdapter(adapter, table, includeRelated);
  await writeCache(settings, table, includeRelated, result.fields);
  return result.fields;
}

/** Collect every fieldId referenced by rules in the tree. */
export function referencedFieldIds(node: QueryNode, into = new Set<string>()): Set<string> {
  if (node.kind === 'rule') {
    if (node.fieldId) {
      into.add(node.fieldId);
    }
    return into;
  }
  for (const child of node.children) {
    referencedFieldIds(child, into);
  }
  return into;
}

/**
 * Compute orphaned field ids: those referenced by rules but absent from `fields`.
 * Shared by T16 (rendering) and T18 (switch diff).
 */
export function resolveOrphans(root: QueryGroup, fields: FieldDefinition[]): Set<string> {
  const known = new Set(fields.map((field) => field.id));
  const orphans = new Set<string>();
  for (const id of referencedFieldIds(root)) {
    if (!known.has(id)) {
      orphans.add(id);
    }
  }
  return orphans;
}

// ── Add field helpers (T11) ──────────────────────────────────────────────────

export function slugifyFieldId(label: string): string {
  return label.trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '');
}

export interface NewFieldInput {
  label: string;
  type: FieldType;
  choices?: string[];
  nullable?: boolean;
  idOverride?: string;
  pathOverride?: string[];
}

/** Build a user `FieldDefinition`; returns null if label is empty or the id collides. */
export function buildUserField(input: NewFieldInput, existing: FieldDefinition[]): FieldDefinition | null {
  const label = input.label.trim();
  if (!label) return null;

  const id = input.idOverride?.trim() || slugifyFieldId(label);
  if (!id || existing.some((f) => f.id === id)) return null;

  const field: FieldDefinition = {
    id,
    label,
    type: input.type,
    path: input.pathOverride?.length ? input.pathOverride : [id],
    source: 'user',
  };
  if (input.type === 'choice' && input.choices?.length) field.choices = input.choices;
  if (typeof input.nullable === 'boolean') field.nullable = input.nullable;
  return field;
}
