import type { FieldDefinition } from '@ryanmakes/eb_engine';
import type { PlatformSettings } from '@ryanmakes/eb_platformadapter';

const INDEX_KEY = 'eb.profiles.index.v1';
const PROFILE_KEY_PREFIX = 'eb.profile.v1.';
const profileKey = (name: string) => `${PROFILE_KEY_PREFIX}${name}`;

export interface FieldProfile {
  name: string;
  fields: FieldDefinition[];
}

async function readIndex(settings: PlatformSettings): Promise<string[]> {
  const raw = await settings.get(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((n): n is string => typeof n === 'string')
      : [];
  } catch {
    return [];
  }
}

export async function listProfiles(settings: PlatformSettings): Promise<string[]> {
  return readIndex(settings);
}

export async function saveProfile(
  settings: PlatformSettings,
  profile: FieldProfile,
): Promise<void> {
  await settings.set(profileKey(profile.name), JSON.stringify(profile.fields));
  const index = await readIndex(settings);
  if (!index.includes(profile.name)) {
    await settings.set(INDEX_KEY, JSON.stringify([...index, profile.name]));
  }
}

export async function loadProfile(
  settings: PlatformSettings,
  name: string,
): Promise<FieldProfile | null> {
  const raw = await settings.get(profileKey(name));
  if (!raw) return null;
  try {
    const fields = JSON.parse(raw) as FieldDefinition[];
    return Array.isArray(fields) ? { name, fields } : null;
  } catch {
    return null;
  }
}

export async function deleteProfile(settings: PlatformSettings, name: string): Promise<void> {
  // Write the index first, then remove the blob. If the remove() call throws
  // (it now makes a real host round-trip instead of being a no-op), the
  // profile is already gone from the index — the user sees it disappear and
  // no stale reference to loadProfile() remains. The worst case is an
  // orphaned `eb.profile.v1.<name>` blob left behind, which is harmless.
  // Doing it in the other order (remove blob, then rewrite index) would risk
  // the opposite: an index entry pointing at a blob that's already gone.
  const index = await readIndex(settings);
  await settings.set(INDEX_KEY, JSON.stringify(index.filter((n) => n !== name)));
  await settings.remove(profileKey(name));
}
