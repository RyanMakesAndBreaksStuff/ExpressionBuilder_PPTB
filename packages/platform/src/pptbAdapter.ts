import type ToolBoxAPI from '@pptb/types/toolboxAPI';

import type {
  NotificationLevel,
  PlatformAdapter,
  PlatformTheme,
  TableRef,
  RelatedTableRef,
  DiscoverFieldsOptions,
  DiscoverFieldsResult,
} from './PlatformAdapter';
import type {
  DataverseApi,
  DataverseEntityMetadata,
  DataverseRelationshipMetadata,
} from './dataverseApi';
import { mapDataverseAttributes, type DataverseAttributeMetadata } from './dataverseMetadata';

type MaybePromise<T> = T | Promise<T>;

/**
 * Cast segment per Dataverse choice attribute type. OptionSet is a navigation
 * property that lives on these DERIVED AttributeMetadata subtypes, not on the base
 * type — so it can only be reached by casting into the subtype and navigating to
 * OptionSet. The host's getEntityRelatedMetadata 3rd arg maps to OData $select, which
 * CANNOT pull a navigation property (proven: `['OptionSet']` → host error 0x80060888
 * "Could not find a property named 'OptionSet' on type ...AttributeMetadata"). So we
 * fetch each choice column's OptionSet with a separate path-navigation call instead.
 */
const OPTIONSET_CAST_BY_TYPE: Record<string, string> = {
  Picklist: 'PicklistAttributeMetadata',
  State: 'StateAttributeMetadata',
  Status: 'StatusAttributeMetadata',
  MultiSelectPicklist: 'MultiSelectPicklistAttributeMetadata',
};

/**
 * Local mirror of the real `@pptb/types` API surface (1.2.5), narrowed to the
 * three namespaces this adapter actually uses (`utils`, `settings`, `events`)
 * and with every member made optional. Optionality matters for two reasons:
 * tests construct partial fakes, and the adapter must degrade gracefully when
 * running off-host (e.g. in a browser during local dev) where `toolboxAPI` is
 * entirely absent. There must be no members here beyond what `ToolBoxAPI.API`
 * actually declares — a fabricated fallback arm is exactly how the
 * `settings.remove` bug happened (it silently absorbed a real-API miss).
 */
export interface PptbToolboxApi {
  utils?: Partial<ToolBoxAPI.UtilsAPI>;
  settings?: Partial<ToolBoxAPI.SettingsAPI>;
  events?: Partial<ToolBoxAPI.EventsAPI>;
}

function getWindowToolboxApi(): PptbToolboxApi | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  // Not `window as Window` — importing `@pptb/types/toolboxAPI` merges a
  // `declare global { interface Window { toolboxAPI: ToolBoxAPI.API } }`
  // augmentation (required, real API) into this file's ambient scope, which
  // would conflict with our optional/narrowed `PptbToolboxApi` shape if we
  // extended `Window` directly. Casting through `unknown` sidesteps that.
  return (window as unknown as { toolboxAPI?: PptbToolboxApi }).toolboxAPI;
}

function getWindowDataverseApi(): DataverseApi | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return (window as Window & { dataverseAPI?: DataverseApi }).dataverseAPI;
}

function entityToTableRef(entity: DataverseEntityMetadata): TableRef {
  return {
    logicalName: entity.LogicalName,
    displayName: entity.DisplayName?.UserLocalizedLabel?.Label?.trim() || entity.LogicalName,
    entitySetName: entity.EntitySetName,
    isSystem: entity.IsCustomEntity === false || entity.IsManaged === true,
  };
}

function normalizeTheme(theme: string | null | undefined): PlatformTheme {
  const normalized = theme?.toLowerCase();

  if (normalized === 'dark') {
    return 'dark';
  }

  // PPTB's real `utils.getCurrentTheme()` only ever resolves "light" | "dark"
  // (see @pptb/types 1.2.5) — it never emits a high-contrast value. This
  // branch is kept anyway because `PlatformTheme` is a port-level type shared
  // with `webAdapter.ts` and any future adapter; normalizing here means the
  // port's `highContrast` value stays reachable without every call site
  // re-deriving it, even though no current adapter actually produces it.
  if (
    normalized === 'highcontrast' ||
    normalized === 'high-contrast' ||
    normalized === 'contrast'
  ) {
    return 'highContrast';
  }

  return 'light';
}

export function createPptbAdapter(
  toolboxApi: PptbToolboxApi | undefined = getWindowToolboxApi(),
  dataverseApi: DataverseApi | undefined = getWindowDataverseApi(),
): PlatformAdapter {
  const api = toolboxApi;
  const dv = dataverseApi;

  const adapter: PlatformAdapter = {
    async copyToClipboard(text) {
      await api?.utils?.copyToClipboard?.(text);
    },

    async notify(message, level) {
      await api?.utils?.showNotification?.({
        title: levelLabel(level),
        body: message,
        type: level,
      });
    },

    async getTheme() {
      return normalizeTheme(await api?.utils?.getCurrentTheme?.());
    },

    onThemeChanged(handler) {
      // Sanctioned pattern per docs/api-info/events-api: there is no
      // dedicated theme-change event, so we listen for "settings:updated"
      // and read the theme back out of its payload.
      if (api?.events?.on) {
        const eventHandler = (_details: unknown, payload: ToolBoxAPI.ToolBoxEventPayload) => {
          if (payload.event === 'settings:updated' && isThemePayload(payload.data)) {
            handler(normalizeTheme(payload.data.theme));
          }
        };

        api.events.on(eventHandler);
        return () => {
          // events.off exists on the real API but is undocumented in
          // docs/api-info/ — keep it behind optional chaining.
          api?.events?.off?.(eventHandler);
        };
      }

      return () => undefined;
    },

    settings: {
      async get(key) {
        const value = await api?.settings?.get?.(key);
        // The real host's `settings.get` returns `Promise<any>`; coerce
        // rather than assert, since PlatformSettings.get is typed `string |
        // null` (see PlatformAdapter.ts) — a deliberate narrowing kept even
        // though the host itself is untyped here.
        return typeof value === 'string' ? value : null;
      },

      async set(key, value) {
        await api?.settings?.set?.(key, value);
      },

      async remove(key) {
        // The real PPTB host settings API (v1.2.5) exposes only
        // getAll/get/set/setAll — there is no settings.remove. Emulate
        // deletion via read-modify-write. This is not atomic: a concurrent
        // write landing between getAll and setAll would be lost
        // (last-writer-wins), which is acceptable for a single host /
        // single tool instance — no locking is implemented here.
        const all = (await api?.settings?.getAll?.()) ?? {};
        if (!(key in all)) return;
        const { [key]: _removed, ...rest } = all;
        await api?.settings?.setAll?.(rest);
      },

      async getAll() {
        return (await api?.settings?.getAll?.()) ?? null;
      },

      async setAll(values) {
        await api?.settings?.setAll?.(values);
      },
    },

    async getTables() {
      if (!dv?.getAllEntitiesMetadata) {
        return [];
      }
      const raw = await dv.getAllEntitiesMetadata([
        'LogicalName',
        'DisplayName',
        'EntitySetName',
        'IsCustomEntity',
        'IsManaged',
      ]);
      const entities = Array.isArray(raw) ? raw : (raw?.value ?? []);
      return entities.map(entityToTableRef);
    },

    async discoverFields(options: DiscoverFieldsOptions = {}): Promise<DiscoverFieldsResult> {
      const table = options.table;
      if (!dv?.getEntityRelatedMetadata || !table) {
        await adapter.notify(
          'Using sample fields because no Dataverse connection is available.',
          'info',
        );
        return { fields: [] };
      }

      let attrs: DataverseAttributeMetadata[];
      try {
        const raw = (await dv.getEntityRelatedMetadata(table, 'Attributes')) as
          | { value?: DataverseAttributeMetadata[] }
          | DataverseAttributeMetadata[]
          | undefined;
        attrs = Array.isArray(raw) ? raw : (raw?.value ?? []);
      } catch {
        await adapter.notify(`Could not load fields for ${table}.`, 'error');
        return { fields: [] };
      }

      await enrichOptionSets(dv, table, attrs);
      const fields = mapDataverseAttributes(attrs);

      return {
        fields,
        // ponytail: omit table when only logicalName is known; caller falls back to a generic label
        // rather than displaying the logical name. Add real DisplayName lookup if a friendlier chip is needed.
        fetchedAt: Date.now(),
      };
    },

    async getRelatedTables(table: string): Promise<RelatedTableRef[]> {
      if (!dv?.getEntityRelatedMetadata) return [];
      const raw = (await dv.getEntityRelatedMetadata(table, 'ManyToOneRelationships')) as
        | { value?: DataverseRelationshipMetadata[] }
        | DataverseRelationshipMetadata[]
        | undefined;
      const rels = Array.isArray(raw) ? raw : (raw?.value ?? []);
      return rels
        .filter((r) => r.ReferencingEntityNavigationPropertyName && r.ReferencedEntity)
        .map((r) => ({
          navigationProperty: r.ReferencingEntityNavigationPropertyName as string,
          table: r.ReferencedEntity as string,
          displayName: r.ReferencedEntity as string,
          relationshipType: 'ManyToOne' as const,
        }));
    },

    async discoverRelatedFields(table: string, navigationProperty: string): Promise<DiscoverFieldsResult> {
      const related = (await adapter.getRelatedTables?.(table))?.find(
        (r) => r.navigationProperty === navigationProperty,
      );
      if (!related || !dv?.getEntityRelatedMetadata) return { fields: [] };
      let attrs: DataverseAttributeMetadata[];
      try {
        const raw = (await dv.getEntityRelatedMetadata(related.table, 'Attributes')) as
          | { value?: DataverseAttributeMetadata[] }
          | DataverseAttributeMetadata[]
          | undefined;
        attrs = Array.isArray(raw) ? raw : (raw?.value ?? []);
      } catch {
        return { fields: [] };
      }
      await enrichOptionSets(dv, related.table, attrs);
      const fields = mapDataverseAttributes(attrs, [navigationProperty]).map((f) => ({
        ...f,
        group: related.displayName,
      }));
      return { fields, fetchedAt: Date.now() };
    },

    /** @deprecated shim over discoverFields */
    async getDataverseFields() {
      if (dv?.getEntityRelatedMetadata) {
        const result = await adapter.discoverFields?.({});
        return result?.fields ?? [];
      }

      await adapter.notify(
        'Using sample fields because no Dataverse connection is available.',
        'info',
      );
      return [];
    },
  };

  return adapter;
}

/**
 * Best-effort: inline each choice column's OptionSet.Options via a separate
 * path-navigation fetch. The host's getEntityRelatedMetadata 3rd arg is $select-only
 * (cannot pull the OptionSet navigation property), so we navigate straight to it:
 *   EntityDefinitions(LogicalName='<table>')/Attributes(LogicalName='<attr>')
 *     /Microsoft.Dynamics.CRM.<Cast>/OptionSet
 * The host validates only the base path segment ('Attributes'), so the deeper cast +
 * /OptionSet navigation passes. Any per-attribute failure is swallowed — the column
 * still maps as a choice, just without a labeled picker, rather than crashing discovery.
 */
// ponytail: fixed pool size vs a queue dependency — one call site, throughput never varies at runtime.
const OPTIONSET_FETCH_CONCURRENCY = 4;

async function enrichOptionSets(
  dv: DataverseApi,
  table: string,
  attrs: DataverseAttributeMetadata[],
): Promise<void> {
  const fetchMetadata = dv.getEntityRelatedMetadata;
  if (!fetchMetadata) return;

  const pending = attrs.filter((attr) => {
    const dvType = attr.AttributeTypeName?.Value?.replace(/Type$/, '') ?? attr.AttributeType;
    const cast = dvType ? OPTIONSET_CAST_BY_TYPE[dvType] : undefined;
    return cast && !attr.OptionSet?.Options?.length;
  });

  let cursor = 0;
  const worker = async () => {
    while (cursor < pending.length) {
      const attr = pending[cursor++];
      const dvType = attr.AttributeTypeName?.Value?.replace(/Type$/, '') ?? attr.AttributeType;
      const cast = OPTIONSET_CAST_BY_TYPE[dvType as string];

      try {
        const raw = (await fetchMetadata(
          table,
          `Attributes(LogicalName='${attr.LogicalName}')/Microsoft.Dynamics.CRM.${cast}/OptionSet`,
        )) as { value?: { Options?: unknown } } | { Options?: unknown } | undefined;
        const optionSet = raw && 'value' in raw ? raw.value : raw;
        if (optionSet && typeof optionSet === 'object' && 'Options' in optionSet) {
          attr.OptionSet = optionSet as DataverseAttributeMetadata['OptionSet'];
        }
      } catch {
        // Best-effort: leave attr without options.
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(OPTIONSET_FETCH_CONCURRENCY, pending.length) }, worker),
  );
}

function levelLabel(level: NotificationLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function isThemePayload(value: unknown): value is { theme: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'theme' in value &&
    typeof value.theme === 'string'
  );
}
