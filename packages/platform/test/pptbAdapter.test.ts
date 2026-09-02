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

  it('is a safe no-op off-host (no toolboxAPI at all)', async () => {
    const api: PptbToolboxApi = {};
    const adapter = createPptbAdapter(api);
    const observedTheme = vi.fn();

    await expect(adapter.copyToClipboard('text')).resolves.toBeUndefined();
    await expect(adapter.notify('Heads up', 'warning')).resolves.toBeUndefined();
    await expect(adapter.getTheme()).resolves.toBe('light');
    const unsubscribe = adapter.onThemeChanged(observedTheme);
    expect(() => unsubscribe()).not.toThrow();
    await expect(adapter.settings.get('missing')).resolves.toBeNull();
    await expect(adapter.settings.set('draft', 'value')).resolves.toBeUndefined();
    await expect(adapter.settings.remove('draft')).resolves.toBeUndefined();
  });

  it('falls back to sample fields notification when no Dataverse connection exists', async () => {
    const api: PptbToolboxApi = {
      utils: {
        showNotification: vi.fn().mockResolvedValue(undefined),
      },
    };
    const adapter = createPptbAdapter(api);

    await expect(adapter.getDataverseFields()).resolves.toEqual([]);

    expect(api.utils?.showNotification).toHaveBeenCalledWith({
      title: 'Info',
      body: 'Using sample fields because no Dataverse connection is available.',
      type: 'info',
    });
  });

  describe('settings.remove', () => {
    it('deletes the key via read-modify-write, preserving every sibling key', async () => {
      const api: PptbToolboxApi = {
        settings: {
          getAll: vi.fn().mockResolvedValue({
            'eb.profile.v1.a': '{}',
            'eb.profile.v1.b': '{}',
            'eb.profiles.index.v1': '["a","b"]',
          }),
          setAll: vi.fn().mockResolvedValue(undefined),
        },
      };
      const adapter = createPptbAdapter(api);

      await adapter.settings.remove('eb.profile.v1.a');

      expect(api.settings?.setAll).toHaveBeenCalledTimes(1);
      expect(api.settings?.setAll).toHaveBeenCalledWith({
        'eb.profile.v1.b': '{}',
        'eb.profiles.index.v1': '["a","b"]',
      });
    });

    it('short-circuits without calling setAll when the key is absent', async () => {
      const api: PptbToolboxApi = {
        settings: {
          getAll: vi.fn().mockResolvedValue({ 'eb.profile.v1.b': '{}' }),
          setAll: vi.fn().mockResolvedValue(undefined),
        },
      };
      const adapter = createPptbAdapter(api);

      await adapter.settings.remove('eb.profile.v1.missing');

      expect(api.settings?.setAll).not.toHaveBeenCalled();
    });

    it('is a safe no-op when the settings namespace is entirely absent', async () => {
      const api: PptbToolboxApi = {};
      const adapter = createPptbAdapter(api);

      await expect(adapter.settings.remove('anything')).resolves.toBeUndefined();
    });

    it('propagates a throw from the host instead of swallowing it', async () => {
      const api: PptbToolboxApi = {
        settings: {
          getAll: vi.fn().mockResolvedValue({ key: 'value' }),
          setAll: vi.fn().mockRejectedValue(new Error('host write failed')),
        },
      };
      const adapter = createPptbAdapter(api);

      await expect(adapter.settings.remove('key')).rejects.toThrow('host write failed');
    });
  });
});
