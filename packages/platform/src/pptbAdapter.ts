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

interface PptbClipboardApi {
  writeText?: (text: string) => MaybePromise<void>;
  copy?: (text: string) => MaybePromise<void>;
}

interface PptbNotificationOptions {
  title: string;
  body: string;
  type?: NotificationLevel;
  duration?: number;
}

interface PptbSettingsApi {
  get?: (key: string) => MaybePromise<string | null | undefined>;
  set?: (key: string, value: string) => MaybePromise<void>;
  remove?: (key: string) => MaybePromise<void>;
}

interface PptbUtilsApi {
  copyToClipboard?: (text: string) => MaybePromise<void>;
  showNotification?: (options: PptbNotificationOptions) => MaybePromise<void>;
  getCurrentTheme?: () => MaybePromise<string | null | undefined>;
}

interface PptbEventPayload {
  event: string;
  data?: unknown;
}

interface PptbEventsApi {
  on?: (handler: (details: unknown, payload: PptbEventPayload) => void) => MaybePromise<void>;
  off?: (handler: (details: unknown, payload: PptbEventPayload) => void) => MaybePromise<void>;
}

export interface PptbToolboxApi {
  clipboard?: PptbClipboardApi;
  utils?: PptbUtilsApi;
  settings?: PptbSettingsApi;
  events?: PptbEventsApi;
  copyToClipboard?: (text: string) => MaybePromise<void>;
  notify?: (message: string, level: NotificationLevel) => MaybePromise<void>;
  showNotification?: (
    message: string,
    level: NotificationLevel,
  ) => MaybePromise<void>;
  getTheme?: () => MaybePromise<string | null | undefined>;
  theme?: string | null;
  onThemeChanged?: (handler: (theme: string) => void) => MaybePromise<() => void>;
  addThemeChangedListener?: (
    handler: (theme: string) => void,
  ) => MaybePromise<() => void>;
  getSetting?: (key: string) => MaybePromise<string | null | undefined>;
  setSetting?: (key: string, value: string) => MaybePromise<void>;
  removeSetting?: (key: string) => MaybePromise<void>;
  getDataverseFields?: () => MaybePromise<unknown[] | null | undefined>;
  listDataverseFields?: () => MaybePromise<unknown[] | null | undefined>;
}

interface PptbWindow extends Window {
  toolboxAPI?: PptbToolboxApi;
}

function getWindowToolboxApi(): PptbToolboxApi | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return (window as PptbWindow).toolboxAPI;
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
      if (api?.utils?.copyToClipboard) {
        await api.utils.copyToClipboard(text);
        return;
      }

      if (api?.copyToClipboard) {
        await api.copyToClipboard(text);
        return;
      }

      if (api?.clipboard?.writeText) {
        await api.clipboard.writeText(text);
        return;
      }

      if (api?.clipboard?.copy) {
        await api.clipboard.copy(text);
      }
    },

    async notify(message, level) {
      if (api?.utils?.showNotification) {
        await api.utils.showNotification({
          title: levelLabel(level),
          body: message,
          type: level,
        });
        return;
      }

      if (api?.notify) {
        await api.notify(message, level);
        return;
      }

      if (api?.showNotification) {
        await api.showNotification(message, level);
      }
    },

    async getTheme() {
      if (api?.utils?.getCurrentTheme) {
        return normalizeTheme(await api.utils.getCurrentTheme());
      }

      if (api?.getTheme) {
        return normalizeTheme(await api.getTheme());
      }

      return normalizeTheme(api?.theme);
    },

    onThemeChanged(handler) {
      const wrappedHandler = (theme: string) => {
        handler(normalizeTheme(theme));
      };

      if (api?.events?.on) {
        const eventHandler = (_details: unknown, payload: PptbEventPayload) => {
          if (payload.event === 'settings:updated' && isThemePayload(payload.data)) {
            handler(normalizeTheme(payload.data.theme));
          }
        };

        void api.events.on(eventHandler);
        return () => {
          void api.events?.off?.(eventHandler);
        };
      }

      const unsubscribe =
        api?.onThemeChanged?.(wrappedHandler) ??
        api?.addThemeChangedListener?.(wrappedHandler);

      if (typeof unsubscribe === 'function') {
        return unsubscribe;
      }

      return () => undefined;
    },

    settings: {
      async get(key) {
        const value = api?.settings?.get
          ? await api.settings.get(key)
          : await api?.getSetting?.(key);

        return value ?? null;
      },

      async set(key, value) {
        if (api?.settings?.set) {
          await api.settings.set(key, value);
          return;
        }

        await api?.setSetting?.(key, value);
      },

      async remove(key) {
        if (api?.settings?.remove) {
          await api.settings.remove(key);
          return;
        }

        await api?.removeSetting?.(key);
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
        table: { logicalName: table, displayName: table },
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

      const legacy = api?.getDataverseFields
        ? await api.getDataverseFields()
        : await api?.listDataverseFields?.();

      if (Array.isArray(legacy)) {
        return legacy;
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
async function enrichOptionSets(
  dv: DataverseApi,
  table: string,
  attrs: DataverseAttributeMetadata[],
): Promise<void> {
  const fetch = dv.getEntityRelatedMetadata;
  if (!fetch) return;

  await Promise.all(
    attrs.map(async (attr) => {
      // ponytail: inline type read vs exporting attrTypeOf — single call site.
      const dvType = attr.AttributeTypeName?.Value?.replace(/Type$/, '') ?? attr.AttributeType;
      const cast = dvType ? OPTIONSET_CAST_BY_TYPE[dvType] : undefined;
      if (!cast || attr.OptionSet?.Options?.length) return;

      try {
        const raw = (await fetch(
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
    }),
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
