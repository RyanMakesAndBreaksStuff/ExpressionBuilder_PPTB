// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWebAdapter } from '../src/webAdapter';

describe('createWebAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('copies text with the browser clipboard API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    stubLocalStorage();
    stubMatchMedia(false);

    await createWebAdapter().copyToClipboard('@equals(true, true)');

    expect(writeText).toHaveBeenCalledWith('@equals(true, true)');
  });

  it('persists settings in localStorage', async () => {
    const storage = stubLocalStorage();
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } });
    stubMatchMedia(false);

    const adapter = createWebAdapter();

    await adapter.settings.set('draft', 'value');
    await expect(adapter.settings.get('draft')).resolves.toBe('value');
    await adapter.settings.remove('draft');

    expect(storage.setItem).toHaveBeenCalledWith('draft', 'value');
    expect(storage.removeItem).toHaveBeenCalledWith('draft');
    await expect(adapter.settings.get('draft')).resolves.toBeNull();
  });

  it('reads and subscribes to browser color scheme changes', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } });
    stubLocalStorage();
    const mediaQuery = stubMatchMedia(true);
    const adapter = createWebAdapter();
    const handler = vi.fn();

    await expect(adapter.getTheme()).resolves.toBe('dark');
    const unsubscribe = adapter.onThemeChanged(handler);
    mediaQuery.dispatch(false);
    unsubscribe();
    mediaQuery.dispatch(true);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('light');
    expect(mediaQuery.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it('shows a toast notification without host dependencies', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } });
    stubLocalStorage();
    stubMatchMedia(false);
    document.body.innerHTML = '';

    await createWebAdapter().notify('Saved', 'success');

    expect(document.body.textContent).toContain('Saved');
  });

  it('exposes empty discovery results without throwing', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } });
    stubLocalStorage();
    stubMatchMedia(false);
    const adapter = createWebAdapter();
    expect(await adapter.listDataSources?.()).toEqual([]);
    expect(await adapter.getTables?.()).toEqual([]);
    expect(await adapter.discoverFields?.()).toEqual({ fields: [] });
  });
});

function stubLocalStorage() {
  const values = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
  };

  vi.stubGlobal('localStorage', storage);

  return storage;
}

function stubMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaQuery = {
    matches,
    addEventListener: vi.fn(
      (_eventName: 'change', listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener);
      },
    ),
    removeEventListener: vi.fn(
      (
        _eventName: 'change',
        listener: (event: MediaQueryListEvent) => void,
      ) => {
        listeners.delete(listener);
      },
    ),
    dispatch(nextMatches: boolean) {
      for (const listener of listeners) {
        listener({ matches: nextMatches } as MediaQueryListEvent);
      }
    },
  };

  vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));

  return mediaQuery;
}
