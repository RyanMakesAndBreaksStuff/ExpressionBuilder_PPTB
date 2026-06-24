import type { PlatformAdapter, PlatformTheme } from './PlatformAdapter';

const darkSchemeQuery = '(prefers-color-scheme: dark)';

function getThemeFromMediaQuery(): PlatformTheme {
  return matchMedia(darkSchemeQuery).matches ? 'dark' : 'light';
}

export function createWebAdapter(): PlatformAdapter {
  return {
    async copyToClipboard(text) {
      await navigator.clipboard.writeText(text);
    },

    async notify(message, level) {
      console[level === 'error' ? 'error' : 'log'](`[${level}] ${message}`);
    },

    async getTheme() {
      return getThemeFromMediaQuery();
    },

    onThemeChanged(handler) {
      const mediaQuery = matchMedia(darkSchemeQuery);
      const listener = (event: MediaQueryListEvent) => {
        handler(event.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', listener);

      return () => {
        mediaQuery.removeEventListener('change', listener);
      };
    },

    settings: {
      async get(key) {
        return localStorage.getItem(key);
      },

      async set(key, value) {
        localStorage.setItem(key, value);
      },

      async remove(key) {
        localStorage.removeItem(key);
      },
    },

    async listDataSources() {
      return [];
    },

    async getTables() {
      return [];
    },

    async discoverFields() {
      return { fields: [] };
    },

    async getDataverseFields() {
      return [];
    },
  };
}
