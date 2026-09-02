import { describe, expect, it } from 'vitest';
import type { PlatformSettings } from '@ryanmakes/eb_platformadapter';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import { invalidate, readCache, writeCache } from '../src/importExport/metadataCache';

function createFakeSettings(): PlatformSettings {
  const store = new Map<string, string>();
  return {
    async get(key) {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    async set(key, value) {
      store.set(key, value);
    },
    async remove(key) {
      store.delete(key);
    },
  };
}

const fields: FieldDefinition[] = [
  { id: 'Status', label: 'Status', path: 'Status', type: 'string' } as FieldDefinition,
];

describe('metadataCache', () => {
  it('invalidate observably clears a previously written cache entry', async () => {
    const settings = createFakeSettings();
    await writeCache(settings, 'account', false, fields);

    await expect(readCache(settings, 'account', false)).resolves.toEqual(fields);

    await invalidate(settings, 'account', false);

    await expect(readCache(settings, 'account', false)).resolves.toBeNull();
  });

  it('invalidate is a no-op when nothing was cached', async () => {
    const settings = createFakeSettings();

    await expect(invalidate(settings, 'account', false)).resolves.toBeUndefined();
  });
});
