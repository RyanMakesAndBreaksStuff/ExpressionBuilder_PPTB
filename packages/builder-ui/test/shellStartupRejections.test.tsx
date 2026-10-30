// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import { ExpressionBuilderShell } from '../src/app/ExpressionBuilderShell';

afterEach(() => cleanup());

const unhandled = vi.fn();
process.on('unhandledRejection', unhandled);

function createAdapter(): PlatformAdapter {
  return {
    copyToClipboard: vi.fn(async () => undefined),
    notify: vi.fn(async () => undefined),
    getTheme: vi.fn(async () => { throw new Error('theme unavailable'); }),
    onThemeChanged: vi.fn(() => () => undefined),
    settings: {
      get: vi.fn(async (key: string) => (key === 'eb.onboarding.seen.v1' ? '1' : null)),
      set: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    },
    getDataverseFields: vi.fn(async () => []),
  };
}

describe('shell startup rejections', () => {
  it('renders when getTheme rejects, without an unhandled rejection', async () => {
    const adapter = createAdapter();
    render(<ExpressionBuilderShell adapter={adapter} />);
    await waitFor(() => expect(adapter.getTheme).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText('Expression Builder')).toBeInTheDocument();
    expect(unhandled).not.toHaveBeenCalled();
  });
});
