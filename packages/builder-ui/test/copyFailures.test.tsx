// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExpressionBuilderShell } from '../src/app/ExpressionBuilderShell';
import { sampleDocument } from '../src/app/sampleData';

afterEach(() => cleanup());

/** A host whose clipboard write always fails, like PPTB without a clipboard API. */
function createRefusingAdapter(): PlatformAdapter {
  return {
    copyToClipboard: vi.fn(async () => {
      throw new Error('the host does not provide a clipboard API');
    }),
    notify: vi.fn(async () => undefined),
    getTheme: vi.fn(async () => 'light' as const),
    onThemeChanged: vi.fn(() => () => undefined),
    settings: {
      // Onboarding already seen, so its modal does not take focus mid-test.
      get: vi.fn(async (key: string) => (key === 'eb.onboarding.seen.v1' ? '1' : null)),
      set: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    },
    getDataverseFields: vi.fn(async () => []),
  };
}

describe('copy failures in the Condition builder (FR-072)', () => {
  it('reports an Export the host refused instead of claiming success (FR-072)', async () => {
    const user = userEvent.setup();
    const adapter = createRefusingAdapter();
    render(<ExpressionBuilderShell adapter={adapter} initialDocument={sampleDocument} />);

    await user.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() =>
      expect(adapter.notify).toHaveBeenCalledWith(
        'Could not copy expression JSON: the host does not provide a clipboard API',
        'error',
      ),
    );
    expect(adapter.notify).not.toHaveBeenCalledWith('Expression JSON copied to clipboard.', 'success');
  });

  it('keeps the Condition Copy error notification (FR-072)', async () => {
    const user = userEvent.setup();
    const adapter = createRefusingAdapter();
    render(<ExpressionBuilderShell adapter={adapter} initialDocument={sampleDocument} />);

    await user.click(within(screen.getByRole('region', { name: 'Expression Preview' })).getByRole('button', { name: 'Copy' }));

    await waitFor(() =>
      expect(adapter.notify).toHaveBeenCalledWith(
        'Could not copy expression: the host does not provide a clipboard API',
        'error',
      ),
    );
    expect(screen.queryByText('Expression copied')).not.toBeInTheDocument();
  });
});
