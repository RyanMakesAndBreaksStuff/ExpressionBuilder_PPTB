import { describe, expect, it } from 'vitest';
import type { PlatformSettings } from '@ryanmakes/eb_platformadapter';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import {
  deleteProfile,
  listProfiles,
  loadProfile,
  saveProfile,
  sweepOrphanedProfiles,
} from '../src/importExport/fieldProfiles';

// A minimal in-memory PlatformSettings implementation that honors the real
// contract (get/set/remove), independent of any platform adapter. Good
// enough to exercise fieldProfiles' index/blob bookkeeping.
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

describe('fieldProfiles', () => {
  it('saves, lists, and loads a profile round-trip', async () => {
    const settings = createFakeSettings();

    await saveProfile(settings, { name: 'my-profile', fields });

    await expect(listProfiles(settings)).resolves.toEqual(['my-profile']);
    await expect(loadProfile(settings, 'my-profile')).resolves.toEqual({
      name: 'my-profile',
      fields,
    });
  });

  it('deleteProfile observably removes both the index entry and the blob', async () => {
    const settings = createFakeSettings();
    await saveProfile(settings, { name: 'keep-me', fields });
    await saveProfile(settings, { name: 'delete-me', fields });

    await deleteProfile(settings, 'delete-me');

    await expect(listProfiles(settings)).resolves.toEqual(['keep-me']);
    await expect(loadProfile(settings, 'delete-me')).resolves.toBeNull();
    // Sibling profile survives the delete-modify-write untouched.
    await expect(loadProfile(settings, 'keep-me')).resolves.toEqual({
      name: 'keep-me',
      fields,
    });
  });

  it('writes the index before removing the blob, so a remove() throw never orphans an index entry', async () => {
    const settings = createFakeSettings();
    await saveProfile(settings, { name: 'flaky', fields });

    const failingRemove: PlatformSettings = {
      ...settings,
      remove: async () => {
        throw new Error('host write failed');
      },
    };

    await expect(deleteProfile(failingRemove, 'flaky')).rejects.toThrow('host write failed');

    // The index no longer lists the profile, even though the blob remove failed
    // (an orphaned blob is harmless; a dangling index entry would not be).
    await expect(listProfiles(settings)).resolves.toEqual([]);
  });
});

// A fake PlatformSettings backed by a plain object, supporting the optional
// bulk getAll/setAll surface sweepOrphanedProfiles depends on.
function createBulkFakeSettings(initial: Record<string, string> = {}): {
  settings: PlatformSettings;
  store: Record<string, string>;
} {
  const store: Record<string, string> = { ...initial };
  const settings: PlatformSettings = {
    async get(key) {
      return key in store ? store[key] : null;
    },
    async set(key, value) {
      store[key] = value;
    },
    async remove(key) {
      delete store[key];
    },
    async getAll() {
      return { ...store };
    },
    async setAll(values) {
      for (const key of Object.keys(store)) delete store[key];
      Object.assign(store, values);
    },
  };
  return { settings, store };
}

describe('sweepOrphanedProfiles', () => {
  it('removes orphaned profile blobs absent from the current index', async () => {
    const { settings, store } = createBulkFakeSettings({
      'eb.profiles.index.v1': JSON.stringify(['keep-me']),
      'eb.profile.v1.keep-me': JSON.stringify([]),
      'eb.profile.v1.orphan': JSON.stringify([]),
    });

    await sweepOrphanedProfiles(settings);

    expect(store['eb.profile.v1.orphan']).toBeUndefined();
    expect(store['eb.profile.v1.keep-me']).toBeDefined();
  });

  it('retains profiles present in both storage and the index', async () => {
    const { settings, store } = createBulkFakeSettings({
      'eb.profiles.index.v1': JSON.stringify(['a', 'b']),
      'eb.profile.v1.a': JSON.stringify([]),
      'eb.profile.v1.b': JSON.stringify([]),
    });

    await sweepOrphanedProfiles(settings);

    expect(store['eb.profile.v1.a']).toBeDefined();
    expect(store['eb.profile.v1.b']).toBeDefined();
  });

  it('leaves unrelated keys (metadata cache, onboarding flag) untouched', async () => {
    const { settings, store } = createBulkFakeSettings({
      'eb.profiles.index.v1': JSON.stringify(['keep-me']),
      'eb.profile.v1.keep-me': JSON.stringify([]),
      'eb.profile.v1.orphan': JSON.stringify([]),
      'eb.metadata.v1.foo': JSON.stringify({ cached: true }),
      'eb.onboarding.seen.v1': 'true',
    });

    await sweepOrphanedProfiles(settings);

    expect(store['eb.metadata.v1.foo']).toBe(JSON.stringify({ cached: true }));
    expect(store['eb.onboarding.seen.v1']).toBe('true');
    expect(store['eb.profile.v1.orphan']).toBeUndefined();
  });

  it('is a no-op when the index is present but unparseable (corrupt)', async () => {
    const { settings, store } = createBulkFakeSettings({
      'eb.profiles.index.v1': '{not valid json',
      'eb.profile.v1.orphan': JSON.stringify([]),
    });
    const before = { ...store };

    await sweepOrphanedProfiles(settings);

    expect(store).toEqual(before);
  });

  it('is a no-op when the index key is entirely absent', async () => {
    const { settings, store } = createBulkFakeSettings({
      'eb.profile.v1.orphan': JSON.stringify([]),
    });
    const before = { ...store };

    await sweepOrphanedProfiles(settings);

    expect(store).toEqual(before);
  });

  it('treats a valid-but-empty index ([]) as trustworthy and sweeps all profile blobs', async () => {
    const { settings, store } = createBulkFakeSettings({
      'eb.profiles.index.v1': JSON.stringify([]),
      'eb.profile.v1.orphan-a': JSON.stringify([]),
      'eb.profile.v1.orphan-b': JSON.stringify([]),
      'eb.metadata.v1.foo': JSON.stringify({ cached: true }),
    });

    await sweepOrphanedProfiles(settings);

    expect(store['eb.profile.v1.orphan-a']).toBeUndefined();
    expect(store['eb.profile.v1.orphan-b']).toBeUndefined();
    expect(store['eb.metadata.v1.foo']).toBe(JSON.stringify({ cached: true }));
  });

  it('no-ops when the settings implementation lacks getAll/setAll', async () => {
    const store = {
      'eb.profiles.index.v1': JSON.stringify([]),
      'eb.profile.v1.orphan': JSON.stringify([]),
    };
    const settings: PlatformSettings = {
      async get(key) {
        return key in store ? (store as Record<string, string>)[key] : null;
      },
      async set(key, value) {
        (store as Record<string, string>)[key] = value;
      },
      async remove(key) {
        delete (store as Record<string, string>)[key];
      },
    };

    await sweepOrphanedProfiles(settings);

    expect(store['eb.profile.v1.orphan']).toBeDefined();
  });
});
