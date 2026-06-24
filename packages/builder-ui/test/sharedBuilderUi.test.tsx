// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExpressionBuilderShell } from '../src/app/ExpressionBuilderShell';
import { sampleDocument } from '../src/app/sampleData';
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
  it('renders the production shell with correct headings and tabs', () => {
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    expect(screen.getByRole('heading', { name: /condition builder/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /expression preview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /dynamic content/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /wrappers/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /diagnostics/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /mode context/i })).toBeInTheDocument();
  });

  it('does not default production state to sample data', () => {
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    expect(screen.queryByDisplayValue('Approved')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('finance')).not.toBeInTheDocument();
    expect(screen.queryByText(/approver/i)).not.toBeInTheDocument();
  });

  it('keyboard can switch the mode selector and update field reference context', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} initialDocument={sampleDocument} />);

    const triggerMode = screen.getByRole('radio', { name: 'Trigger condition' });
    triggerMode.focus();
    expect(screen.getByLabelText('Generated expression')).toHaveTextContent("triggerBody()?['Status']");

    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('radio', { name: 'Filter array' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Generated expression')).toHaveTextContent("item()?['Status']");
  });

  it('search filters fields by label', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} initialDocument={sampleDocument} />);

    await user.type(screen.getByLabelText('Search dynamic content fields'), 'due');

    const fields = screen.getByRole('list', { name: 'Dynamic content fields' });
    expect(within(fields).getByText('Due date')).toBeInTheDocument();
    expect(within(fields).queryByText('Status')).not.toBeInTheDocument();
  });

  it('changing a value updates the generated expression', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} initialDocument={sampleDocument} />);

    const approverRow = screen.getByRole('group', { name: /Approver contains finance/i });
    const valueInput = within(approverRow).getByLabelText('Value for Approver');
    await user.clear(valueInput);
    await user.type(valueInput, 'director');

    expect(screen.getByLabelText('Generated expression')).toHaveTextContent("'director'");
  });

  it('case-insensitive fix wraps both sides in toLower()', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} initialDocument={sampleDocument} />);

    const approverRow = screen.getByRole('group', { name: /Approver contains finance/i });
    await user.click(within(approverRow).getByRole('button', { name: 'Wrap both sides in toLower()' }));

    expect(screen.getByLabelText('Generated expression')).toHaveTextContent('toLower(coalesce(');
    expect(screen.getByLabelText('Generated expression')).toHaveTextContent("toLower('finance')");
  });

  it('import and export round-trip without expression drift', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} initialDocument={sampleDocument} />);

    const expressionBefore = screen.getByLabelText('Generated expression').textContent;
    await user.click(screen.getByRole('button', { name: 'Export' }));
    await user.click(screen.getByRole('button', { name: 'Import' }));

    expect(screen.getByLabelText('Generated expression').textContent).toBe(expressionBefore);
    expect(screen.queryByText(/Import failed/i)).not.toBeInTheDocument();
  });

  it('left dock collapse exposes aria-expanded false', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    await user.click(screen.getByRole('button', { name: 'Collapse Toolbox' }));

    expect(screen.getByRole('complementary', { name: 'Toolbox' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByText('Toolbox')).toHaveLength(1);
  });

  it('right dock collapse exposes aria-expanded false', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    await user.click(screen.getByRole('button', { name: 'Collapse Details' }));

    expect(screen.getByRole('complementary', { name: 'Details' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('preview collapse preserves the generated expression after re-expand', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} initialDocument={sampleDocument} />);

    const expressionBefore = screen.getByLabelText('Generated expression').textContent;
    await user.click(screen.getByRole('button', { name: 'Collapse expression preview' }));
    expect(screen.getByRole('region', { name: 'Expression Preview' })).toHaveAttribute('aria-expanded', 'false');

    await user.click(screen.getByRole('button', { name: 'Expand expression preview' }));
    expect(screen.getByLabelText('Generated expression').textContent).toBe(expressionBefore);
  });

  it('keeps import, export, and copy commands in the header without the saved JSON panel', () => {
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    expect(screen.getByRole('button', { name: /^import$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy expression/i })).toBeInTheDocument();
    expect(screen.queryByText(/saved expression json/i)).not.toBeInTheDocument();
  });

  it('removes the palette bench and keeps a working icon theme toggle', async () => {
    const user = userEvent.setup();
    const adapter = createAdapter();
    vi.mocked(adapter.getTheme).mockResolvedValue('dark');
    render(<ExpressionBuilderShell adapter={adapter} />);

    expect(screen.queryByText('Atlas')).not.toBeInTheDocument();
    expect(screen.queryByText('Sandstone')).not.toBeInTheDocument();

    const toggle = await screen.findByRole('button', { name: 'Switch to light theme' });
    await user.click(toggle);

    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument();
  });
});
