// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlatformSettings } from '@ryanmakes/eb_platformadapter';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import {
  ManageProfilesDialog,
  type ManageProfilesDialogProps,
} from '../src/workbench/ManageProfilesDialog';

beforeEach(() => {
  // jsdom has no layout; Tabster treats a zero-sized body as a hidden frame.
  vi.spyOn(document.body, 'getBoundingClientRect')
    .mockReturnValue(new DOMRect(0, 0, 1280, 800));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const fields: FieldDefinition[] = [
  { id: 'Status', label: 'Status', path: 'Status', type: 'string' } as FieldDefinition,
];

function createFakeSettings(initial: Record<string, string> = {}): PlatformSettings {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    async get(key) {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    async set(key, value) {
      store.set(key, value);
    },
    async remove(key) {
      store.delete(key);
    },
  };
}

function baseProps(overrides: Partial<ManageProfilesDialogProps> = {}): ManageProfilesDialogProps {
  return {
    open: true,
    settings: createFakeSettings(),
    currentFields: fields,
    onDismiss: vi.fn(),
    onLoad: vi.fn(),
    onNotify: vi.fn(),
    ...overrides,
  };
}

describe('ManageProfilesDialog', () => {
  it('deletes a profile via the confirm row and refreshes the list', async () => {
    const user = userEvent.setup();
    const settings = createFakeSettings({
      'eb.profiles.index.v1': JSON.stringify(['saved-profile']),
      'eb.profile.v1.saved-profile': JSON.stringify(fields),
    });
    render(<ManageProfilesDialog {...baseProps({ settings })} />);

    expect(await screen.findByText('saved-profile')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete saved-profile' }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('No saved profiles.')).toBeInTheDocument();
    expect(screen.queryByText('saved-profile')).not.toBeInTheDocument();
  });

  it('calls onNotify with an error level and keeps the profile listed when delete fails', async () => {
    const user = userEvent.setup();
    const settings = createFakeSettings({
      'eb.profiles.index.v1': JSON.stringify(['saved-profile']),
      'eb.profile.v1.saved-profile': JSON.stringify(fields),
    });
    const failingSettings: PlatformSettings = {
      ...settings,
      remove: async () => {
        throw new Error('host write failed');
      },
    };
    const onNotify = vi.fn();
    render(<ManageProfilesDialog {...baseProps({ settings: failingSettings, onNotify })} />);

    expect(await screen.findByText('saved-profile')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete saved-profile' }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(onNotify).toHaveBeenCalledWith(
      'Could not delete profile "saved-profile".',
      'error',
    );
    // Dialog stays open with the profile still listed (in its confirm row,
    // since confirmDelete state was never cleared) — the delete didn't happen.
    expect(screen.getByText(/saved-profile/)).toBeInTheDocument();
  });

  it('reports a failed listing and lists again on retry', async () => {
    const user = userEvent.setup();
    const settings = createFakeSettings({
      'eb.profiles.index.v1': JSON.stringify(['saved-profile']),
      'eb.profile.v1.saved-profile': JSON.stringify(fields),
    });
    let failIndex = true;
    const flaky: PlatformSettings = {
      ...settings,
      get: async (key) => {
        if (key === 'eb.profiles.index.v1' && failIndex) throw new Error('read failed');
        return settings.get(key);
      },
    };
    const onNotify = vi.fn();
    render(<ManageProfilesDialog {...baseProps({ settings: flaky, onNotify })} />);

    await vi.waitFor(() =>
      expect(onNotify).toHaveBeenCalledWith('Could not list field profiles.', 'error'),
    );
    failIndex = false;
    await user.type(screen.getByPlaceholderText('New profile name'), 'next');
    await user.click(screen.getByRole('button', { name: 'Save current' }));
    expect(await screen.findByText('saved-profile')).toBeInTheDocument();
  });

  it('disables Save while a save is in flight so a double-click writes once', async () => {
    const user = userEvent.setup();
    const base = createFakeSettings();
    let release!: () => void;
    const set = vi.fn((key: string, value: string) =>
      key === 'eb.profile.v1.mine'
        ? new Promise<void>((resolve) => { release = () => resolve(base.set(key, value)); })
        : base.set(key, value),
    );
    render(<ManageProfilesDialog {...baseProps({ settings: { ...base, set } })} />);

    await user.type(screen.getByPlaceholderText('New profile name'), 'mine');
    const save = screen.getByRole('button', { name: 'Save current' });
    await user.click(save);
    expect(save).toBeDisabled();
    await user.click(save);
    release();

    expect(await screen.findByText('mine')).toBeInTheDocument();
    expect(set.mock.calls.filter(([key]) => key === 'eb.profile.v1.mine')).toHaveLength(1);
  });

  it('keeps the entered name and reports no success when save fails', async () => {
    const user = userEvent.setup();
    const settings: PlatformSettings = {
      ...createFakeSettings(),
      set: async () => {
        throw new Error('write failed');
      },
    };
    const onNotify = vi.fn();
    render(<ManageProfilesDialog {...baseProps({ settings, onNotify })} />);

    const input = screen.getByPlaceholderText('New profile name');
    await user.type(input, 'mine');
    await user.click(screen.getByRole('button', { name: 'Save current' }));

    await vi.waitFor(() =>
      expect(onNotify).toHaveBeenCalledWith('Could not save profile "mine".', 'error'),
    );
    expect(onNotify).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('mine');
    expect(screen.getByRole('button', { name: 'Save current' })).toBeEnabled();
  });

  it('does not call onLoad and reports the failure when load rejects', async () => {
    const user = userEvent.setup();
    const settings = createFakeSettings({
      'eb.profiles.index.v1': JSON.stringify(['saved-profile']),
      'eb.profile.v1.saved-profile': JSON.stringify(fields),
    });
    const failing: PlatformSettings = {
      ...settings,
      get: async (key) => {
        if (key === 'eb.profile.v1.saved-profile') throw new Error('read failed');
        return settings.get(key);
      },
    };
    const onNotify = vi.fn();
    const onLoad = vi.fn();
    render(<ManageProfilesDialog {...baseProps({ settings: failing, onNotify, onLoad })} />);

    await user.click(await screen.findByRole('button', { name: 'Load' }));

    await vi.waitFor(() =>
      expect(onNotify).toHaveBeenCalledWith('Could not load profile "saved-profile".', 'error'),
    );
    expect(onLoad).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Load' })).toBeEnabled();
  });

  it('ignores an older listing that resolves after a newer one', async () => {
    const user = userEvent.setup();
    const settings = createFakeSettings();
    const pending: Array<(v: string | null) => void> = [];
    const deferred: PlatformSettings = {
      ...settings,
      get: (key) =>
        key === 'eb.profiles.index.v1'
          ? new Promise((resolve) => pending.push(resolve))
          : settings.get(key),
    };
    render(<ManageProfilesDialog {...baseProps({ settings: deferred })} />);

    await vi.waitFor(() => expect(pending).toHaveLength(1));
    await user.type(screen.getByPlaceholderText('New profile name'), 'x');
    await user.click(screen.getByRole('button', { name: 'Save current' }));
    // save reads the index too, then refresh lists again
    await vi.waitFor(() => expect(pending).toHaveLength(2));
    pending[1](null);
    await vi.waitFor(() => expect(pending).toHaveLength(3));
    pending[2](JSON.stringify(['newer']));
    expect(await screen.findByText('newer')).toBeInTheDocument();
    pending[0](JSON.stringify(['older']));
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText('older')).not.toBeInTheDocument();
    expect(screen.getByText('newer')).toBeInTheDocument();
  });

  it('ignores a listing failure that completes after dismissal', async () => {
    const pending: Array<(v: string | null) => void> = [];
    const rejecters: Array<(e: Error) => void> = [];
    const settings: PlatformSettings = {
      ...createFakeSettings(),
      get: () =>
        new Promise((resolve, reject) => {
          pending.push(resolve);
          rejecters.push(reject);
        }),
    };
    const onNotify = vi.fn();
    const { rerender } = render(<ManageProfilesDialog {...baseProps({ settings, onNotify })} />);
    await vi.waitFor(() => expect(rejecters).toHaveLength(1));
    rerender(<ManageProfilesDialog {...baseProps({ settings, onNotify, open: false })} />);
    rejecters[0](new Error('late'));
    await new Promise((r) => setTimeout(r, 20));
    expect(onNotify).not.toHaveBeenCalled();
  });
});
