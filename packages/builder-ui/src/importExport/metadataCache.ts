import type { FieldDefinition } from '@ryanmakes/eb_engine';
import type { PlatformSettings } from '@ryanmakes/eb_platformadapter';

const PREFIX = 'eb.metadata.v1';
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  fields: FieldDefinition[];
  fetchedAt: number;
}

export function cacheKey(table: string, includeRelated: boolean): string {
  return `${PREFIX}.${table}.${includeRelated ? 'rel' : 'flat'}`;
}

export async function readCache(
  settings: PlatformSettings,
  table: string,
  includeRelated: boolean,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<FieldDefinition[] | null> {
  const raw = await settings.get(cacheKey(table, includeRelated));
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.fetchedAt > ttlMs) return null;
    return entry.fields;
  } catch {
    return null;
  }
}

export async function writeCache(
  settings: PlatformSettings,
  table: string,
  includeRelated: boolean,
  fields: FieldDefinition[],
): Promise<void> {
  const entry: CacheEntry = { fields, fetchedAt: Date.now() };
  await settings.set(cacheKey(table, includeRelated), JSON.stringify(entry));
}

export async function invalidate(
  settings: PlatformSettings,
  table: string,
  includeRelated: boolean,
): Promise<void> {
  await settings.remove(cacheKey(table, includeRelated));
}

// ── Field drift (T19) ───────────────────────────────────────────────────────

export interface FieldDrift {
  added: FieldDefinition[];
  removed: FieldDefinition[];
  changed: Array<{ before: FieldDefinition; after: FieldDefinition }>;
}

function fieldSignature(field: FieldDefinition): string {
  return JSON.stringify([field.type, field.choices ?? null, field.nullable ?? null, field.path]);
}

/** Diff a previous field set against the freshly discovered one. */
export function diffFields(previous: FieldDefinition[], next: FieldDefinition[]): FieldDrift {
  const prevById = new Map(previous.map((f) => [f.id, f]));
  const nextById = new Map(next.map((f) => [f.id, f]));

  const added = next.filter((f) => !prevById.has(f.id));
  const removed = previous.filter((f) => !nextById.has(f.id));
  const changed: FieldDrift['changed'] = [];

  for (const after of next) {
    const before = prevById.get(after.id);
    if (before && fieldSignature(before) !== fieldSignature(after)) {
      changed.push({ before, after });
    }
  }
  return { added, removed, changed };
}
