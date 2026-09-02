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

/**
 * One-time cleanup for `eb.profile.v1.<name>` blobs left behind by historical
 * deletes performed while `settings.remove` was a no-op (see deleteProfile's
 * comment / project history). Removes only blobs whose name is absent from
 * the CURRENT index, then writes the survivors back with a single setAll().
 *
 * Deliberately does NOT use readIndex() to decide what's orphaned: readIndex
 * collapses "no index key", "empty string", "invalid JSON", and "not an
 * array" all down to `[]`, which is indistinguishable from a genuinely empty
 * — but valid — profile list. Trusting that collapsed `[]` here would delete
 * every profile blob in storage the moment the index was merely unreadable.
 * Instead the raw INDEX_KEY value is read directly from getAll() and only
 * treated as trustworthy when it parses to an actual array; any other case
 * (key absent, unparseable, non-array) is a no-op — sweeping nothing is
 * always safe, whereas sweeping on a false negative is not.
 *
 * Call this once when something explicitly triggers a sweep (e.g. the
 * profiles-management dialog opening) — never from listProfiles/app init —
 * so a rare read-triggered cleanup doesn't become a write on every launch.
 */
export async function sweepOrphanedProfiles(settings: PlatformSettings): Promise<void> {
  if (!settings.getAll || !settings.setAll) return;

  const all = await settings.getAll();
  if (!all) return;

  const rawIndex = all[INDEX_KEY];
  if (rawIndex === undefined) return;

  let parsedIndex: unknown;
  try {
    parsedIndex = JSON.parse(rawIndex);
  } catch {
    return;
  }
  if (!Array.isArray(parsedIndex)) return;

  const liveNames = new Set(parsedIndex.filter((n): n is string => typeof n === 'string'));

  let removedAny = false;
  const survivors: Record<string, string> = {};
  for (const [key, value] of Object.entries(all)) {
    if (key.startsWith(PROFILE_KEY_PREFIX)) {
      const name = key.slice(PROFILE_KEY_PREFIX.length);
      if (!liveNames.has(name)) {
        removedAny = true;
        continue;
      }
    }
    survivors[key] = value;
  }

  if (!removedAny) return;

  await settings.setAll(survivors);
}
