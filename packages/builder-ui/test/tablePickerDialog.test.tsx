// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TablePickerDialog } from '../src/workbench/TablePickerDialog';

beforeEach(() => {
  // jsdom has no layout; Tabster treats a zero-sized body as a hidden frame.
  vi.spyOn(document.body, 'getBoundingClientRect')
    .mockReturnValue(new DOMRect(0, 0, 1280, 800));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TablePickerDialog', () => {
  it('reports a rejected table load and lists tables after retry', async () => {
    const user = userEvent.setup();
    const loadTables = vi.fn()
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValue([{ logicalName: 'account', displayName: 'Account' }]);
    render(
      <TablePickerDialog open loadTables={loadTables} onDismiss={vi.fn()} onConfirm={vi.fn()} />,
    );

    expect(await screen.findByText(/Could not load tables/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText(/Account/)).toBeInTheDocument();
    expect(loadTables).toHaveBeenCalledTimes(2);
  });
});
