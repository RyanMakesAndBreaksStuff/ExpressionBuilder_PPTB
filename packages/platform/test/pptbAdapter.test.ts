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

  it('is a safe no-op off-host (no toolboxAPI at all), except that copying fails', async () => {
    const api: PptbToolboxApi = {};
    const adapter = createPptbAdapter(api);
    const observedTheme = vi.fn();

    await expect(adapter.copyToClipboard('text')).rejects.toThrow('the host does not provide a clipboard API');
    await expect(adapter.notify('Heads up', 'warning')).resolves.toBeUndefined();
    await expect(adapter.getTheme()).resolves.toBe('light');
    const unsubscribe = adapter.onThemeChanged(observedTheme);
    expect(() => unsubscribe()).not.toThrow();
    await expect(adapter.settings.get('missing')).resolves.toBeNull();
    await expect(adapter.settings.set('draft', 'value')).resolves.toBeUndefined();
    await expect(adapter.settings.remove('draft')).resolves.toBeUndefined();
  });

  it('rejects a copy when the host utils namespace has no clipboard API', async () => {
    const api: PptbToolboxApi = { utils: { showNotification: vi.fn().mockResolvedValue(undefined) } };

    await expect(createPptbAdapter(api).copyToClipboard('text')).rejects.toThrow(
      'the host does not provide a clipboard API',
    );
  });

  it('passes a host clipboard rejection through to the caller', async () => {
    const api: PptbToolboxApi = {
      utils: { copyToClipboard: vi.fn().mockRejectedValue(new Error('clipboard is busy')) },
    };

    await expect(createPptbAdapter(api).copyToClipboard('text')).rejects.toThrow('clipboard is busy');
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

  describe('getMetadataCacheScope', () => {
    type ActiveConnectionRead = NonNullable<PptbToolboxApi['connections']>['getActiveConnection'];

    function adapterReading(read: () => unknown) {
      return createPptbAdapter({
        connections: { getActiveConnection: read as ActiveConnectionRead },
      });
    }

    function connection(id: string, url: string) {
      return {
        id,
        name: 'Contoso',
        url,
        environment: 'Dev' as const,
        isActive: false,
      };
    }

    it('is stable for an unchanged connection and changes when id or environment URL changes', async () => {
      const read = vi.fn().mockImplementation(async () => connection('conn-1', 'https://Contoso.CRM.dynamics.com/orgs/contoso/'));
      const adapter = adapterReading(read);
      const again = adapterReading(async () => connection('  conn-1  ', 'https://contoso.crm.dynamics.com:443/orgs/contoso'));

      const first = await adapter.getMetadataCacheScope?.();
      const second = await adapter.getMetadataCacheScope?.();
      const normalized = await again.getMetadataCacheScope?.();
      const otherId = await adapterReading(async () => connection('conn-2', 'https://contoso.crm.dynamics.com/orgs/contoso')).getMetadataCacheScope?.();
      const otherHost = await adapterReading(async () => connection('conn-1', 'https://fabrikam.crm.dynamics.com/orgs/contoso')).getMetadataCacheScope?.();
      const otherPath = await adapterReading(async () => connection('conn-1', 'https://contoso.crm.dynamics.com/orgs/fabrikam')).getMetadataCacheScope?.();
      const encodedSlash = await adapterReading(async () => connection('conn-1', 'https://contoso.crm.dynamics.com/orgs%2Fcontoso')).getMetadataCacheScope?.();
      const otherPort = await adapterReading(async () => connection('conn-1', 'https://contoso.crm.dynamics.com:8443/orgs/contoso')).getMetadataCacheScope?.();
      const otherScheme = await adapterReading(async () => connection('conn-1', 'http://contoso.crm.dynamics.com/orgs/contoso')).getMetadataCacheScope?.();
      const dotted = await adapterReading(async () => connection('conn-1', 'https://contoso.crm.dynamics.com/orgs/../orgs/contoso')).getMetadataCacheScope?.();
      const smashed = await adapterReading(async () => connection('conn-1","https://contoso.crm.dynamics.com/orgs/contoso', 'https://other.example/path')).getMetadataCacheScope?.();

      const expected = 'env:["conn-1","https://contoso.crm.dynamics.com/orgs/contoso"]';
      expect(first).toBe(expected);
      expect(second).toBe(expected);
      expect(normalized).toBe(expected);
      expect(dotted).toBe(expected);
      expect(read).toHaveBeenCalledTimes(2);
      expect(otherId).not.toBe(expected);
      expect(otherHost).not.toBe(expected);
      expect(otherPath).not.toBe(expected);
      expect(encodedSlash).toBe('env:["conn-1","https://contoso.crm.dynamics.com/orgs%2Fcontoso"]');
      expect(encodedSlash).not.toBe(expected);
      expect(otherPort).toBe('env:["conn-1","https://contoso.crm.dynamics.com:8443/orgs/contoso"]');
      expect(otherScheme).not.toBe(expected);
      expect(smashed).not.toBe(expected);
      expect(first).not.toContain('Contoso');
    });

    it('drops query and fragment so tokens stay out of the scope', async () => {
      const clean = await adapterReading(async () => connection('conn-1', 'https://contoso.crm.dynamics.com/org')).getMetadataCacheScope?.();
      const withSecret = await adapterReading(async () =>
        connection('conn-1', 'https://contoso.crm.dynamics.com/org?access_token=s3cr3t#session'),
      ).getMetadataCacheScope?.();

      expect(withSecret).toBe(clean);
      expect(withSecret).toBe('env:["conn-1","https://contoso.crm.dynamics.com/org"]');
      expect(withSecret).not.toContain('s3cr3t');
      expect(withSecret).not.toContain('access_token');
    });

    it('returns null when capability, identity, or the scope read is unavailable', async () => {
      await expect(createPptbAdapter({}).getMetadataCacheScope?.()).resolves.toBeNull();
      await expect(createPptbAdapter({ connections: {} }).getMetadataCacheScope?.()).resolves.toBeNull();
      await expect(adapterReading(async () => null).getMetadataCacheScope?.()).resolves.toBeNull();
      await expect(adapterReading(async () => undefined).getMetadataCacheScope?.()).resolves.toBeNull();
      await expect(adapterReading(async () => 'conn-1').getMetadataCacheScope?.()).resolves.toBeNull();
      await expect(adapterReading(async () => ['conn-1']).getMetadataCacheScope?.()).resolves.toBeNull();
      await expect(adapterReading(async () => connection('   ', 'https://contoso.crm.dynamics.com')).getMetadataCacheScope?.()).resolves.toBeNull();
      await expect(adapterReading(async () => connection('conn-1', '   ')).getMetadataCacheScope?.()).resolves.toBeNull();
      await expect(adapterReading(async () => connection('conn-1', 'not a url')).getMetadataCacheScope?.()).resolves.toBeNull();
      await expect(adapterReading(async () => connection('conn-1', '/orgs/contoso')).getMetadataCacheScope?.()).resolves.toBeNull();
      await expect(adapterReading(async () => connection('conn-1', 'javascript:alert(1)')).getMetadataCacheScope?.()).resolves.toBeNull();
      await expect(adapterReading(async () => connection('conn-1', 'https://user:s3cr3t@contoso.crm.dynamics.com/org')).getMetadataCacheScope?.()).resolves.toBeNull();
      await expect(adapterReading(() => {
        throw new Error('connections unavailable');
      }).getMetadataCacheScope?.()).resolves.toBeNull();
      await expect(adapterReading(() => Promise.reject(new Error('connections unavailable'))).getMetadataCacheScope?.()).resolves.toBeNull();
      await expect(adapterReading(async () => ({ ...connection('conn-1', 'https://contoso.crm.dynamics.com'), id: 12 })).getMetadataCacheScope?.()).resolves.toBeNull();
      await expect(adapterReading(async () => ({ ...connection('conn-1', 'https://contoso.crm.dynamics.com'), url: 12 })).getMetadataCacheScope?.()).resolves.toBeNull();
    });

    it('does not log the connection id, environment url, or embedded secrets', async () => {
      const methods = ['log', 'info', 'warn', 'error', 'debug'] as const;
      const spies = methods.map((method) => vi.spyOn(console, method).mockImplementation(() => undefined));
      try {
        const scope = await adapterReading(async () =>
          connection('private-connection-id', 'https://contoso.crm.dynamics.com/org?access_token=s3cr3t'),
        ).getMetadataCacheScope?.();
        const credentialed = await adapterReading(async () =>
          connection('private-connection-id', 'https://user:s3cr3t@contoso.crm.dynamics.com/org'),
        ).getMetadataCacheScope?.();
        const logged = spies.flatMap((spy) => spy.mock.calls.flat().map((part) => String(part))).join('\n');

        expect(scope).toBe('env:["private-connection-id","https://contoso.crm.dynamics.com/org"]');
        expect(credentialed).toBeNull();
        expect(logged).not.toContain('private-connection-id');
        expect(logged).not.toContain('contoso.crm.dynamics.com');
        expect(logged).not.toContain('s3cr3t');
        expect(logged).not.toContain('access_token');
      } finally {
        for (const spy of spies) spy.mockRestore();
      }
    });
  });
});
