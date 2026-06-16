// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExpressionBuilderShell } from '../src/app/ExpressionBuilderShell';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';

function createAdapter(): PlatformAdapter {
  return {
    copyToClipboard: vi.fn(),
    notify: vi.fn(),
    getTheme: vi.fn(async () => 'light'),
    onThemeChanged: vi.fn((handler) => {
      void handler;
      return () => {
        return undefined;
      };
    }),
    settings: {
      get: vi.fn(async () => null),
      set: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    },
    getDataverseFields: vi.fn(async () => []),
  };
}

afterEach(() => {
  cleanup();
});

describe('shared builder UI', () => {
  it('keyboard can switch the mode selector and update field reference context', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    const triggerMode = screen.getByRole('radio', { name: 'Trigger condition' });
    triggerMode.focus();
    expect(screen.getByLabelText('Generated expression')).toHaveTextContent("triggerBody()?['Status']");

    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('radio', { name: 'Filter array' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Generated expression')).toHaveTextContent("item()?['Status']");
  });

  it('search filters fields by label', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    await user.type(screen.getByLabelText('Search dynamic content'), 'due');

    const fields = screen.getByRole('list', { name: 'Dynamic content fields' });
    expect(within(fields).getByText('Due date')).toBeInTheDocument();
    expect(within(fields).queryByText('Status')).not.toBeInTheDocument();
  });

  it('changing a value updates the generated expression', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    const approverRow = screen.getByRole('group', { name: /Approver contains finance/i });
    const valueInput = within(approverRow).getByLabelText('Value for Approver');
    await user.clear(valueInput);
    await user.type(valueInput, 'director');

    expect(screen.getByLabelText('Generated expression')).toHaveTextContent("'director'");
  });

  it('case-insensitive fix wraps both sides in toLower()', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    const approverRow = screen.getByRole('group', { name: /Approver contains finance/i });
    await user.click(within(approverRow).getByRole('button', { name: 'Wrap both sides in toLower()' }));

    expect(screen.getByLabelText('Generated expression')).toHaveTextContent('toLower(coalesce(');
    expect(screen.getByLabelText('Generated expression')).toHaveTextContent("toLower('finance')");
  });

  it('import and export round-trip without expression drift', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    const expressionBefore = screen.getByLabelText('Generated expression').textContent;
    await user.click(screen.getByRole('button', { name: 'Export' }));
    await user.click(screen.getByRole('button', { name: 'Import' }));

    expect(screen.getByLabelText('Generated expression').textContent).toBe(expressionBefore);
    expect(screen.queryByText(/Import failed/i)).not.toBeInTheDocument();
  });

  it('left dock collapse exposes aria-expanded false', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    await user.click(screen.getByRole('button', { name: 'Collapse Docked Toolbox' }));

    expect(screen.getByRole('complementary', { name: 'Docked Toolbox' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('right dock collapse exposes aria-expanded false', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    await user.click(screen.getByRole('button', { name: 'Collapse Support Pane' }));

    expect(screen.getByRole('complementary', { name: 'Support Pane' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('preview collapse preserves the generated expression after re-expand', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    const expressionBefore = screen.getByLabelText('Generated expression').textContent;
    await user.click(screen.getByRole('button', { name: 'Collapse expression preview' }));
    expect(screen.getByRole('region', { name: 'Expression Preview' })).toHaveAttribute('aria-expanded', 'false');

    await user.click(screen.getByRole('button', { name: 'Expand expression preview' }));
    expect(screen.getByLabelText('Generated expression').textContent).toBe(expressionBefore);
  });

  it('diagnostics use aria-live and invalid imports are announced', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    const json = screen.getByLabelText('Saved expression JSON');
    fireEvent.change(json, { target: { value: '{"version":2}' } });
    await user.click(screen.getByRole('button', { name: 'Import saved expression' }));

    const diagnostics = screen.getByRole('status', { name: 'warnings/errors' });
    expect(diagnostics).toHaveAttribute('aria-live', 'polite');
    expect(diagnostics).toHaveTextContent('Import failed');
  });
});
