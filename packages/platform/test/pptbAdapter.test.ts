import { describe, expect, it, vi } from 'vitest';

import { createPptbAdapter, type PptbToolboxApi } from '../src/pptbAdapter';

describe('createPptbAdapter', () => {
  it('uses documented PPTB utils, settings, and events APIs', async () => {
    let eventHandler: ((details: unknown, payload: { event: string; data?: unknown }) => void) | undefined;
    const api: PptbToolboxApi = {
      utils: {
        copyToClipboard: vi.fn().mockResolvedValue(undefined),
        showNotification: vi.fn().mockResolvedValue(undefined),
        getCurrentTheme: vi.fn().mockResolvedValue('dark'),
      },
      settings: {
        get: vi.fn().mockResolvedValue('stored'),
        set: vi.fn().mockResolvedValue(undefined),
      },
      events: {
        on: vi.fn((handler) => {
          eventHandler = handler;
        }),
        off: vi.fn(),
      },
    };
    const adapter = createPptbAdapter(api);
    const observedTheme = vi.fn();

    await adapter.copyToClipboard('@equals(true, true)');
    await adapter.notify('Saved', 'success');
    await expect(adapter.getTheme()).resolves.toBe('dark');
    const unsubscribe = adapter.onThemeChanged(observedTheme);
    eventHandler?.(undefined, { event: 'settings:updated', data: { theme: 'light' } });
    unsubscribe();
    await expect(adapter.settings.get('draft')).resolves.toBe('stored');
    await adapter.settings.set('draft', 'value');
    await adapter.settings.remove('draft');

    expect(api.utils?.copyToClipboard).toHaveBeenCalledWith('@equals(true, true)');
    expect(api.utils?.showNotification).toHaveBeenCalledWith({
      title: 'Success',
      body: 'Saved',
      type: 'success',
    });
    expect(observedTheme).toHaveBeenCalledWith('light');
    expect(api.events?.off).toHaveBeenCalledWith(eventHandler);
    expect(api.settings?.get).toHaveBeenCalledWith('draft');
    expect(api.settings?.set).toHaveBeenCalledWith('draft', 'value');
  });

  it('uses common PPTB clipboard, notification, theme, and settings methods', async () => {
    let themeHandler: ((theme: string) => void) | undefined;
    const unsubscribe = vi.fn();
    const api: PptbToolboxApi = {
      copyToClipboard: vi.fn().mockResolvedValue(undefined),
      notify: vi.fn().mockResolvedValue(undefined),
      getTheme: vi.fn().mockResolvedValue('high-contrast'),
      onThemeChanged: vi.fn((handler) => {
        themeHandler = handler;
        return unsubscribe;
      }),
      getSetting: vi.fn().mockResolvedValue('stored'),
      setSetting: vi.fn().mockResolvedValue(undefined),
      removeSetting: vi.fn().mockResolvedValue(undefined),
      getDataverseFields: vi.fn().mockResolvedValue([{ id: 'Status' }]),
    };
    const adapter = createPptbAdapter(api);
    const observedTheme = vi.fn();

    await adapter.copyToClipboard('@equals(true, true)');
    await adapter.notify('Saved', 'success');
    await expect(adapter.getTheme()).resolves.toBe('highContrast');
    const removeListener = adapter.onThemeChanged(observedTheme);
    themeHandler?.('dark');
    removeListener();
    await expect(adapter.settings.get('draft')).resolves.toBe('stored');
    await adapter.settings.set('draft', 'value');
    await adapter.settings.remove('draft');
    await expect(adapter.getDataverseFields()).resolves.toEqual([
      { id: 'Status' },
    ]);

    expect(api.copyToClipboard).toHaveBeenCalledWith('@equals(true, true)');
    expect(api.notify).toHaveBeenCalledWith('Saved', 'success');
    expect(observedTheme).toHaveBeenCalledWith('dark');
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(api.getSetting).toHaveBeenCalledWith('draft');
    expect(api.setSetting).toHaveBeenCalledWith('draft', 'value');
    expect(api.removeSetting).toHaveBeenCalledWith('draft');
  });

  it('supports nested optional API methods', async () => {
    const api: PptbToolboxApi = {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      showNotification: vi.fn().mockResolvedValue(undefined),
      theme: 'dark',
      addThemeChangedListener: vi.fn((handler) => {
        handler('highContrast');
        return vi.fn();
      }),
      settings: {
        get: vi.fn().mockResolvedValue(undefined),
        set: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
      },
      listDataverseFields: vi.fn().mockResolvedValue([{ id: 'Amount' }]),
    };
    const adapter = createPptbAdapter(api);
    const observedTheme = vi.fn();

    await adapter.copyToClipboard('text');
    await adapter.notify('Heads up', 'warning');
    await expect(adapter.getTheme()).resolves.toBe('dark');
    adapter.onThemeChanged(observedTheme);
    await expect(adapter.settings.get('missing')).resolves.toBeNull();
    await adapter.settings.set('draft', 'value');
    await adapter.settings.remove('draft');
    await expect(adapter.getDataverseFields()).resolves.toEqual([
      { id: 'Amount' },
    ]);

    expect(api.clipboard?.writeText).toHaveBeenCalledWith('text');
    expect(api.showNotification).toHaveBeenCalledWith('Heads up', 'warning');
    expect(observedTheme).toHaveBeenCalledWith('highContrast');
  });

  it('falls back to sample fields notification when no Dataverse connection exists', async () => {
    const api: PptbToolboxApi = {
      notify: vi.fn().mockResolvedValue(undefined),
    };
    const adapter = createPptbAdapter(api);

    await expect(adapter.getDataverseFields()).resolves.toEqual([]);

    expect(api.notify).toHaveBeenCalledWith(
      'Using sample fields because no Dataverse connection is available.',
      'info',
    );
  });
});
