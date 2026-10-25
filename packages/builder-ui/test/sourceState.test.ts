import { describe, expect, it, vi } from 'vitest';
import { applySource, discoverCached, discoverThroughAdapter, resolveOrphans } from '../src/app/sourceState';
import type { QueryDocument, QueryGroup } from '../src/composer/querySchema';
import type { PlatformAdapter, PlatformSettings } from '@ryanmakes/eb_platformadapter';
import type { FieldDefinition } from '@ryanmakes/eb_engine';

const root: QueryGroup = {
  id: 'root',
  kind: 'group',
  conjunction: 'and',
  children: [{ id: 'r1', kind: 'rule', fieldId: 'Amount', operator: 'greater', value: 1 }],
};

const doc: QueryDocument = { version: 2, mode: 'triggerCondition', fields: [], root };

describe('sourceState', () => {
  it('applySource records provenance + fetchedAt', () => {
    const next = applySource(doc, { kind: 'import', label: 'JSON' }, [
      { id: 'Amount', label: 'Amount', type: 'number', path: ['Amount'] },
    ]);
    expect(next.source?.kind).toBe('import');
    expect(typeof next.source?.fetchedAt).toBe('number');
    expect(next.fields).toHaveLength(1);
  });

  it('discoverThroughAdapter prefers discoverFields', async () => {
    const adapter = {
      discoverFields: vi.fn().mockResolvedValue({ fields: [{ id: 'x' }] }),
      getDataverseFields: vi.fn(),
    } as unknown as PlatformAdapter;
    const result = await discoverThroughAdapter(adapter, 'account');
    expect(result.fields).toHaveLength(1);
    expect(adapter.getDataverseFields).not.toHaveBeenCalled();
  });

  it('discoverThroughAdapter falls back to getDataverseFields', async () => {
    const adapter = {
      getDataverseFields: vi.fn().mockResolvedValue([{ id: 'y', label: 'Y', type: 'string', path: ['y'] }]),
    } as unknown as PlatformAdapter;
    const result = await discoverThroughAdapter(adapter, 'account');
    expect(result.fields).toHaveLength(1);
  });

  it('resolveOrphans flags referenced-but-missing fields', () => {
    expect([...resolveOrphans(root, [])]).toEqual(['Amount']);
    expect([...resolveOrphans(root, [{ id: 'Amount', label: 'A', type: 'number', path: ['Amount'] }])]).toEqual([]);
  });

  describe('discoverCached scoping', () => {
    function sharedStore(): PlatformSettings & { store: Map<string, string> } {
      const store = new Map<string, string>();
      return {
        store,
        get: async (k) => store.get(k) ?? null,
        set: async (k, v) => void store.set(k, v),
        remove: async (k) => void store.delete(k),
      };
    }
    function deferred<T>() {
      let resolve!: (v: T) => void;
      const promise = new Promise<T>((r) => (resolve = r));
      return { promise, resolve };
    }
    const f = (id: string): FieldDefinition => ({ id, label: id, type: 'string', path: [id] });
    function adapterFor(scope: () => Promise<string | null> | string | null, id: string) {
      return {
        getMetadataCacheScope: vi.fn(async () => scope()),
        discoverFields: vi.fn(async () => ({ fields: [f(id)] })),
      } as unknown as PlatformAdapter & { discoverFields: ReturnType<typeof vi.fn> };
    }

    it('A and B sharing one store and table never reuse each other', async () => {
      const settings = sharedStore();
      const a = adapterFor(() => 'envA', 'a');
      const b = adapterFor(() => 'envB', 'b');
      expect(await discoverCached(a, settings, 'account', false, false)).toEqual([f('a')]);
      expect(await discoverCached(b, settings, 'account', false, false)).toEqual([f('b')]);
      expect(await discoverCached(a, settings, 'account', false, false)).toEqual([f('a')]);
      expect(a.discoverFields).toHaveBeenCalledTimes(1);
    });

    it('never caches an empty result; the next call discovers again and caches', async () => {
      const settings = sharedStore();
      const set = vi.spyOn(settings, 'set');
      const a = adapterFor(() => 'envA', 'a');
      a.discoverFields.mockResolvedValueOnce({ fields: [] });
      expect(await discoverCached(a, settings, 'account', false, false)).toEqual([]);
      expect(set).not.toHaveBeenCalled();
      expect(await discoverCached(a, settings, 'account', false, false)).toEqual([f('a')]);
      expect(set).toHaveBeenCalledTimes(1);
      expect(await discoverCached(a, settings, 'account', false, false)).toEqual([f('a')]);
      expect(a.discoverFields).toHaveBeenCalledTimes(2);
    });

    it('refresh bypasses the cache within scope', async () => {
      const settings = sharedStore();
      const a = adapterFor(() => 'envA', 'a');
      await discoverCached(a, settings, 'account', false, false);
      await discoverCached(a, settings, 'account', false, true);
      expect(a.discoverFields).toHaveBeenCalledTimes(2);
    });

    it.each([
      ['missing', undefined],
      ['null', () => null],
      ['throwing', () => Promise.reject(new Error('x'))],
    ])('without identity (%s) discovers fresh and persists nothing', async (_n, scope) => {
      const settings = sharedStore();
      settings.store.set('eb.metadata.v1.account.flat', JSON.stringify({ fields: [f('old')], fetchedAt: Date.now() }));
      const adapter = adapterFor(scope ?? (() => null), 'fresh');
      if (!scope) delete (adapter as { getMetadataCacheScope?: unknown }).getMetadataCacheScope;
      expect(await discoverCached(adapter, settings, 'account', false, false)).toEqual([f('fresh')]);
      expect(await discoverCached(adapter, settings, 'account', false, false)).toEqual([f('fresh')]);
      expect(adapter.discoverFields).toHaveBeenCalledTimes(2);
      expect([...settings.store.keys()]).toEqual(['eb.metadata.v1.account.flat']);
    });

    it('scope change during discovery discards with a retry error', async () => {
      const settings = sharedStore();
      let scope = 'envA';
      const gate = deferred<void>();
      const adapter = adapterFor(() => scope, 'a');
      adapter.discoverFields.mockImplementation(async () => {
        await gate.promise;
        return { fields: [f('a')] };
      });
      const run = discoverCached(adapter, settings, 'account', false, false);
      await Promise.resolve();
      scope = 'envB';
      gate.resolve();
      await expect(run).rejects.toThrow(/environment changed.*retry/i);
      expect(settings.store.size).toBe(0);
    });

    it('scope change during cache read discards with a retry error', async () => {
      const settings = sharedStore();
      let scope = 'envA';
      const a = adapterFor(() => scope, 'a');
      await discoverCached(a, settings, 'account', false, false);
      const gate = deferred<void>();
      const get = settings.get;
      settings.get = async (k) => {
        await gate.promise;
        return get(k);
      };
      const run = discoverCached(a, settings, 'account', false, false);
      await Promise.resolve();
      scope = 'envB';
      gate.resolve();
      await expect(run).rejects.toThrow(/environment changed/i);
    });

    it('scope change during write discards with a retry error', async () => {
      const settings = sharedStore();
      let scope = 'envA';
      const a = adapterFor(() => scope, 'a');
      const set = settings.set;
      settings.set = async (k, v) => {
        await set(k, v);
        scope = 'envB';
      };
      await expect(discoverCached(a, settings, 'account', false, false)).rejects.toThrow(/environment changed/i);
    });
  });
});
