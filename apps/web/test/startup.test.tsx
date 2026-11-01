// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const themeOverrideKey = 'eb.web.theme.override.v1';
const onboardingSeenKey = 'eb.onboarding.seen.v1';
const darkSchemeQuery = '(prefers-color-scheme: dark)';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
  document.body.innerHTML = '';
});

describe('web entry when the theme preference cannot be read', () => {
  it('renders the pre-read light system theme when the preference read throws', async () => {
    const storage = await importBlockedEntry(false);

    await waitFor(() => {
      expect(document.querySelector('#root .eb-root')).toHaveAttribute('data-theme', 'light');
    });
    expect(screen.getByText('Expression Builder')).toBeInTheDocument();
    expect(storage.getItem).toHaveBeenCalledWith(themeOverrideKey);
  });

  it('renders the pre-read dark system theme when the preference read throws', async () => {
    const storage = await importBlockedEntry(true);

    await waitFor(() => {
      expect(document.querySelector('#root .eb-root')).toHaveAttribute('data-theme', 'dark');
    });
    expect(screen.getByText('Expression Builder')).toBeInTheDocument();
    expect(storage.getItem).toHaveBeenCalledWith(themeOverrideKey);
  });
});

const createWebAdapterCalls = vi.hoisted(() => ({ count: 0, rejectTheme: false }));
vi.mock('@ryanmakes/eb_platformadapter', async (importActual) => {
  const actual = await importActual<typeof import('@ryanmakes/eb_platformadapter')>();
  return {
    ...actual,
    createWebAdapter: () => {
      createWebAdapterCalls.count += 1;
      const real = actual.createWebAdapter();
      return createWebAdapterCalls.rejectTheme
        ? { ...real, getTheme: () => Promise.reject(new Error('theme unavailable')) }
        : real;
    },
  };
});

describe('web entry wiring', () => {
  it('renders WebApp with one shared adapter, the pre-read theme and the switch', async () => {
    createWebAdapterCalls.count = 0;
    document.body.innerHTML = '<div id="root"></div>';
    const values = new Map([[onboardingSeenKey, '1'], [themeOverrideKey, 'dark']]);
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(() => null),
      length: 0,
    });
    stubColorScheme(false);
    await act(async () => {
      await import('../src/main.tsx');
    });

    // The first committed frame already carries the stored override, not the light system scheme.
    expect(document.querySelector('#root .eb-root')).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
    expect(createWebAdapterCalls.count).toBe(1);

    await act(async () => {
      screen.getByRole('button', { name: 'Switch to light theme' }).click();
    });
    expect(values.get(themeOverrideKey)).toBe('light');
    expect(document.querySelector('#root .eb-root')).toHaveAttribute('data-theme', 'light');
  });

  it('reports a refused theme write without switching', async () => {
    const storage = await importBlockedEntry(false);
    storage.setItem.mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();
    });

    await act(async () => {
      screen.getByRole('button', { name: 'Switch to dark theme' }).click();
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Theme preference could not be saved.');
    expect(document.querySelector('#root .eb-root')).toHaveAttribute('data-theme', 'light');
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();
  });
});

async function importBlockedEntry(prefersDark: boolean) {
  vi.resetModules();
  document.body.innerHTML = '<div id="root"></div>';
  const storage = stubBlockedThemePreference();
  stubColorScheme(prefersDark);
  await act(async () => {
    await import('../src/main.tsx');
  });
  return storage;
}

function stubBlockedThemePreference() {
  const storage = {
    getItem: vi.fn((key: string) => {
      if (key === themeOverrideKey) {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      }
      // Onboarding already seen, so its modal does not take focus mid-test.
      return key === onboardingSeenKey ? '1' : null;
    }),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(() => null),
    length: 0,
  };
  vi.stubGlobal('localStorage', storage);
  return storage;
}

function stubColorScheme(prefersDark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query === darkSchemeQuery ? prefersDark : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    })),
  );
}

describe('web entry when getTheme rejects', () => {
  it('still renders the app with the light fallback', async () => {
    createWebAdapterCalls.rejectTheme = true;
    try {
      await importBlockedEntry(true);
      await waitFor(() => {
        expect(document.querySelector('#root .eb-root')).toHaveAttribute('data-theme', 'light');
      });
      expect(screen.getByText('Expression Builder')).toBeInTheDocument();
    } finally {
      createWebAdapterCalls.rejectTheme = false;
    }
  });
});
