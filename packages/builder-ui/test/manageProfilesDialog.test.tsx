// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlatformSettings } from '@ryanmakes/eb_platformadapter';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import {
  ManageProfilesDialog,
  type ManageProfilesDialogProps,
} from '../src/workbench/ManageProfilesDialog';

afterEach(() => cleanup());

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
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.queryByText('saved-profile')).not.toBeInTheDocument();
    expect(screen.getByText('No saved profiles.')).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onNotify).toHaveBeenCalledWith(
      'Could not delete profile "saved-profile".',
      'error',
    );
    // Dialog stays open with the profile still listed (in its confirm row,
    // since confirmDelete state was never cleared) — the delete didn't happen.
    expect(screen.getByText(/saved-profile/)).toBeInTheDocument();
  });
});
