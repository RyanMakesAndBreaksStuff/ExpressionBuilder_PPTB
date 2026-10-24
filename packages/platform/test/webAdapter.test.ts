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

  it('rejects with a readable reason when the browser has no clipboard API', async () => {
    vi.stubGlobal('navigator', {});
    stubLocalStorage();
    stubMatchMedia(false);

    await expect(createWebAdapter().copyToClipboard('text')).rejects.toThrow(
      'the browser clipboard is not available here',
    );
  });

  it('passes a refused clipboard write through to the caller', async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException('Write permission denied.', 'NotAllowedError'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    stubLocalStorage();
    stubMatchMedia(false);

    await expect(createWebAdapter().copyToClipboard('text')).rejects.toThrow('Write permission denied.');
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

  it('persists manual themes and notifies only subscribed consumers', async () => {
    const storage = stubLocalStorage();
    const mediaQuery = stubMatchMedia(false);
    const adapter = createWebAdapter();
    const handler = vi.fn();
    const unsubscribe = adapter.onThemeChanged(handler);

    expect(adapter.getThemeSnapshot()).toBe('light');
    adapter.setTheme('dark');
    expect(storage.setItem).toHaveBeenCalledWith('eb.web.theme.override.v1', 'dark');
    expect(handler).toHaveBeenLastCalledWith('dark');
    expect(adapter.getThemeSnapshot()).toBe('dark');
    await expect(createWebAdapter().getTheme()).resolves.toBe('dark');

    mediaQuery.dispatch(true);
    mediaQuery.dispatch(false);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(adapter.getThemeSnapshot()).toBe('dark');

    adapter.setTheme('light');
    expect(handler).toHaveBeenLastCalledWith('light');
    unsubscribe();
    adapter.setTheme('dark');
    expect(handler).toHaveBeenCalledTimes(2);
    expect(mediaQuery.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it('uses browser preference for absent or invalid overrides', async () => {
    const storage = stubLocalStorage();
    const mediaQuery = stubMatchMedia(false);
    storage.setItem('eb.web.theme.override.v1', 'invalid');
    const adapter = createWebAdapter();
    const handler = vi.fn();
    const unsubscribe = adapter.onThemeChanged(handler);

    expect(adapter.getThemeSnapshot()).toBe('light');
    mediaQuery.dispatch(true);
    expect(adapter.getThemeSnapshot()).toBe('dark');
    await expect(adapter.getTheme()).resolves.toBe('dark');
    expect(handler).toHaveBeenLastCalledWith('dark');
    unsubscribe();
  });

  it('uses both system schemes when storage access or getItem throws', async () => {
    await withBlockedStorage('access', async () => {
      await expectBothSystemSchemes();
    });
    await withBlockedStorage('getItem', async () => {
      await expectBothSystemSchemes();
    });
  });

  it('does not swallow a rejected theme or settings write', async () => {
    const storage = stubLocalStorage();
    storage.setItem.mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    stubMatchMedia(false);
    const quotaAdapter = createWebAdapter();
    const quotaHandler = vi.fn();
    quotaAdapter.onThemeChanged(quotaHandler);

    expect(quotaAdapter.getThemeSnapshot()).toBe('light');
    expect(() => quotaAdapter.setTheme('dark')).toThrow('quota exceeded');
    expect(quotaHandler).not.toHaveBeenCalled();
    expect(quotaAdapter.getThemeSnapshot()).toBe('light');
    await expect(quotaAdapter.settings.set('draft', 'value')).rejects.toThrow('quota exceeded');
    await expect(quotaAdapter.settings.get('draft')).resolves.toBeNull();

    vi.unstubAllGlobals();
    stubMatchMedia(true);
    const restore = blockStorageAccess();
    try {
      const adapter = createWebAdapter();
      const handler = vi.fn();
      adapter.onThemeChanged(handler);

      await expect(adapter.getTheme()).resolves.toBe('dark');
      expect(() => adapter.setTheme('light')).toThrow('Access is denied for this document.');
      expect(handler).not.toHaveBeenCalled();
      expect(adapter.getThemeSnapshot()).toBe('dark');
      await expect(adapter.settings.set('draft', 'value')).rejects.toThrow(
        'Access is denied for this document.',
      );
    } finally {
      restore();
    }
  });
});

const storageAccessDenied =
  "Failed to read the 'localStorage' property from 'Window': Access is denied for this document.";

async function expectBothSystemSchemes() {
  for (const prefersDark of [false, true]) {
    const mediaQuery = stubMatchMedia(prefersDark);
    const adapter = createWebAdapter();
    const handler = vi.fn();
    const unsubscribe = adapter.onThemeChanged(handler);
    const initial = prefersDark ? 'dark' : 'light';
    const next = prefersDark ? 'light' : 'dark';

    expect(adapter.getThemeSnapshot()).toBe(initial);
    await expect(adapter.getTheme()).resolves.toBe(initial);

    mediaQuery.dispatch(!prefersDark);
    expect(adapter.getThemeSnapshot()).toBe(next);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(next);
    await expect(adapter.getTheme()).resolves.toBe(next);

    mediaQuery.dispatch(prefersDark);
    expect(adapter.getThemeSnapshot()).toBe(initial);
    expect(handler).toHaveBeenLastCalledWith(initial);

    unsubscribe();
    mediaQuery.dispatch(!prefersDark);
    expect(handler).toHaveBeenCalledTimes(2);
  }
}

async function withBlockedStorage(mode: 'access' | 'getItem', run: () => Promise<void>) {
  if (mode === 'getItem') {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    try {
      await run();
    } finally {
      vi.unstubAllGlobals();
    }
    return;
  }

  const restore = blockStorageAccess();
  try {
    await run();
  } finally {
    restore();
  }
}

function blockStorageAccess() {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException(storageAccessDenied, 'SecurityError');
    },
  });
  return () => {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  };
}

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
      mediaQuery.matches = nextMatches;
      for (const listener of listeners) {
        listener({ matches: nextMatches } as MediaQueryListEvent);
      }
    },
  };

  vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));

  return mediaQuery;
}
