import type { PlatformAdapter, PlatformTheme } from './PlatformAdapter';

const darkSchemeQuery = '(prefers-color-scheme: dark)';

function getThemeFromMediaQuery(): PlatformTheme {
  return matchMedia(darkSchemeQuery).matches ? 'dark' : 'light';
}

const TOAST_COLORS: Record<string, string> = {
  error: '#c4314b',
  warning: '#c19c00',
  info: '#323130',
  success: '#0f7b0f',
};

// ponytail: no dependency for a toast — plain DOM element, auto-dismiss, no queue/stacking.
function showToast(message: string, level: string) {
  if (typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.textContent = message;
  el.setAttribute('role', level === 'error' ? 'alert' : 'status');
  Object.assign(el.style, {
    position: 'fixed',
    bottom: '16px',
    right: '16px',
    zIndex: '9999',
    padding: '8px 16px',
    borderRadius: '4px',
    color: '#fff',
    background: TOAST_COLORS[level] ?? TOAST_COLORS.info,
    fontFamily: 'sans-serif',
    fontSize: '13px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), level === 'error' ? 8000 : 4000);
}

export function createWebAdapter(): PlatformAdapter {
  return {
    async copyToClipboard(text) {
      await navigator.clipboard.writeText(text);
    },

    async notify(message, level) {
      showToast(message, level);
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
