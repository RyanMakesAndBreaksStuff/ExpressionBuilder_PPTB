// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlatformSettings } from '@ryanmakes/eb_platformadapter';
import { OnboardingPanel } from '../src/workbench/OnboardingPanel';

afterEach(() => cleanup());

const unhandled = vi.fn();
process.on('unhandledRejection', unhandled);

describe('OnboardingPanel store failures', () => {
  it('stays closed and does not throw when settings.get rejects', async () => {
    const get = vi.fn(async () => { throw new Error('store broken'); });
    const settings: PlatformSettings = { get, set: vi.fn(async () => undefined), remove: vi.fn(async () => undefined) };
    render(<OnboardingPanel settings={settings} />);
    await waitFor(() => expect(get).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('dismisses without an unhandled rejection when settings.set rejects', async () => {
    const set = vi.fn(async () => { throw new Error('write refused'); });
    const settings: PlatformSettings = { get: vi.fn(async () => null), set, remove: vi.fn(async () => undefined) };
    render(<OnboardingPanel settings={settings} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Get started' }));
    await waitFor(() => expect(set).toHaveBeenCalledWith('eb.onboarding.seen.v1', '1'));
    await new Promise((r) => setTimeout(r, 0));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(unhandled).not.toHaveBeenCalled();
  });
});
