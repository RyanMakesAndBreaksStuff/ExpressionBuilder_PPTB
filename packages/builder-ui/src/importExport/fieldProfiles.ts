import type { FieldDefinition } from '@ryanmakes/eb_engine';
import type { PlatformSettings } from '@ryanmakes/eb_platformadapter';

const INDEX_KEY = 'eb.profiles.index.v1';
const profileKey = (name: string) => `eb.profile.v1.${name}`;

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
  await settings.remove(profileKey(name));
  const index = await readIndex(settings);
  await settings.set(INDEX_KEY, JSON.stringify(index.filter((n) => n !== name)));
}
