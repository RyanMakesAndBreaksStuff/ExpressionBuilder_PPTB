import type {
  NotificationLevel,
  PlatformAdapter,
  PlatformTheme,
} from './PlatformAdapter';

type MaybePromise<T> = T | Promise<T>;

interface PptbClipboardApi {
  writeText?: (text: string) => MaybePromise<void>;
  copy?: (text: string) => MaybePromise<void>;
}

interface PptbSettingsApi {
  get?: (key: string) => MaybePromise<string | null | undefined>;
  set?: (key: string, value: string) => MaybePromise<void>;
  remove?: (key: string) => MaybePromise<void>;
}

export interface PptbToolboxApi {
  clipboard?: PptbClipboardApi;
  settings?: PptbSettingsApi;
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
): PlatformAdapter {
  const api = toolboxApi;

  const adapter: PlatformAdapter = {
    async copyToClipboard(text) {
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
      if (api?.notify) {
        await api.notify(message, level);
        return;
      }

      if (api?.showNotification) {
        await api.showNotification(message, level);
      }
    },

    async getTheme() {
      if (api?.getTheme) {
        return normalizeTheme(await api.getTheme());
      }

      return normalizeTheme(api?.theme);
    },

    onThemeChanged(handler) {
      const wrappedHandler = (theme: string) => {
        handler(normalizeTheme(theme));
      };

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

    async getDataverseFields() {
      const fields = api?.getDataverseFields
        ? await api.getDataverseFields()
        : await api?.listDataverseFields?.();

      if (Array.isArray(fields)) {
        return fields;
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
