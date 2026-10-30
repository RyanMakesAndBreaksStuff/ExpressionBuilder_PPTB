import { describe, expect, it } from 'vitest';
import type { PlatformSettings } from '@ryanmakes/eb_platformadapter';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import {
  deleteProfile,
  listProfiles,
  loadProfile,
  saveProfile,
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
