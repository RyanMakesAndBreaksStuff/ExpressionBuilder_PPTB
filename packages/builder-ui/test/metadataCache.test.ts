import { describe, expect, it } from 'vitest';
import type { PlatformSettings } from '@ryanmakes/eb_platformadapter';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import { cacheKey, invalidate, readCache, writeCache } from '../src/importExport/metadataCache';

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
    await writeCache(settings, 'envA', 'account', false, fields);

    await expect(readCache(settings, 'envA', 'account', false)).resolves.toEqual(fields);

    await invalidate(settings, 'envA', 'account', false);

    await expect(readCache(settings, 'envA', 'account', false)).resolves.toBeNull();
  });

  it('invalidate is a no-op when nothing was cached', async () => {
    const settings = createFakeSettings();

    await expect(invalidate(settings, 'envA', 'account', false)).resolves.toBeUndefined();
  });

  it('keys are v2, scoped, and collision-free for delimiter-like names', () => {
    expect(cacheKey('envA', 'account', false).startsWith('eb.metadata.v2')).toBe(true);
    expect(cacheKey('a.b', 'c', false)).not.toBe(cacheKey('a', 'b.c', false));
    expect(cacheKey('a', 'b.flat', true)).not.toBe(cacheKey('a', 'b', false));
    expect(cacheKey('a","b', 'c', false)).not.toBe(cacheKey('a', 'b","c', false));
  });

  it('separates scopes and ignores legacy v1 entries', async () => {
    const settings = createFakeSettings();
    await settings.set('eb.metadata.v1.account.flat', JSON.stringify({ fields, fetchedAt: Date.now() }));
    await expect(readCache(settings, 'envA', 'account', false)).resolves.toBeNull();

    await writeCache(settings, 'envA', 'account', false, fields);
    await expect(readCache(settings, 'envB', 'account', false)).resolves.toBeNull();
    await invalidate(settings, 'envB', 'account', false);
    await expect(readCache(settings, 'envA', 'account', false)).resolves.toEqual(fields);
  });

  it('expires entries after the TTL', async () => {
    const settings = createFakeSettings();
    await settings.set(
      cacheKey('envA', 'account', false),
      JSON.stringify({ fields, fetchedAt: Date.now() - 6 * 60 * 1000 }),
    );
    await expect(readCache(settings, 'envA', 'account', false)).resolves.toBeNull();
  });
});
