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
      // Report the first-run onboarding as already seen so its modal Dialog does not
      // auto-open and trap focus mid-test (it would steal focus from the mode radios
      // and break keyboard-navigation assertions). Other keys still resolve to null.
      get: vi.fn(async (key: string) => (key === 'eb.onboarding.seen.v1' ? '1' : null)),
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

  it('double-clicking a field after focusing a nested group adds the rule there, not root', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} initialDocument={sampleDocument} />);

    // Focus the existing nested "group-routing" group by clicking its toolbar.
    const routingGroup = screen.getByRole('group', { name: 'OR group group-routing' });
    await user.click(within(routingGroup).getByText('Match any of the following'));

    // Double-click a field that isn't already in any rule.
    const fieldList = screen.getByRole('list', { name: 'Dynamic content fields' });
    await user.dblClick(within(fieldList).getByText('Due date'));

    // The new rule lands inside the focused nested group, not appended to root.
    // (Query by the rule row's group role/aria-label, not text, since every
    // other row's field dropdown also renders a "Due date" <option>.)
    const canvas = screen.getByRole('region', { name: 'Condition Builder' });
    const dueDateRows = within(canvas).getAllByRole('group', { name: /^Due date/ });
    expect(dueDateRows).toHaveLength(1);
    expect(routingGroup).toContainElement(dueDateRows[0]);
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

  it('applies a selected toLower wrapper to both sides of a rule', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} initialDocument={sampleDocument} />);

    const approverRow = screen.getByRole('group', { name: /Approver contains finance/i });
    await user.click(approverRow);

    // Select the toLower wrapper in the Wrappers tab.
    await user.click(screen.getByRole('tab', { name: /wrappers/i }));
    await user.click(screen.getByRole('button', { name: /Select toLower/ }));

    // Apply it from the rule row.
    await user.click(within(approverRow).getByRole('button', { name: 'Apply Wrap' }));

    expect(screen.getByLabelText('Generated expression')).toHaveTextContent('toLower(');
    expect(screen.getByLabelText('Generated expression')).toHaveTextContent("toLower('finance')");
  });

  it('import and export round-trip without expression drift', async () => {
    const user = userEvent.setup();
    const adapter = createAdapter();
    render(<ExpressionBuilderShell adapter={adapter} initialDocument={sampleDocument} />);

    const expressionBefore = screen.getByLabelText('Generated expression').textContent;

    // Export copies the saved-expression JSON to the clipboard (T-import-export-fix).
    await user.click(screen.getByRole('button', { name: 'Export' }));
    expect(adapter.copyToClipboard).toHaveBeenCalledTimes(1);
    const exportedJson = vi.mocked(adapter.copyToClipboard).mock.calls[0][0];

    // Import opens a paste dialog; paste the exported JSON back in and confirm.
    // Note: clicking Export first leaves Fluent's dialog surface aria-hidden under
    // jsdom (its inert manager relies on real focus/motion events jsdom lacks), so
    // query the surface and its Import button with { hidden: true }. The dialog is
    // fully accessible in the real browser.
    await user.click(screen.getByRole('button', { name: 'Import' }));
    const dialog = await screen.findByRole('dialog', { hidden: true });
    await user.click(within(dialog).getByLabelText('Saved expression JSON to import'));
    await user.paste(exportedJson);
    await user.click(within(dialog).getByRole('button', { name: 'Import', hidden: true }));

    expect(screen.getByLabelText('Generated expression').textContent).toBe(expressionBefore);
    expect(screen.queryByText(/Import failed/i)).not.toBeInTheDocument();
  });

  it('hides the "Connect a table" entry points in the web build', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} platform="web" />);

    expect(screen.queryByRole('button', { name: 'Connect a table' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Data source menu' }));
    expect(screen.queryByRole('menuitem', { name: /switch table/i })).not.toBeInTheDocument();
  });

  it('keeps the "Connect a table" entry points in the pptb build (default)', () => {
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    expect(screen.getByRole('button', { name: 'Connect a table' })).toBeInTheDocument();
  });

  it('left dock collapse exposes aria-expanded false', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    await user.click(screen.getByRole('button', { name: 'Collapse Toolbox' }));

    expect(screen.getByRole('button', { name: 'Expand Toolbox' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByText('Toolbox')).toHaveLength(1);
  });

  it('right dock collapse exposes aria-expanded false', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    await user.click(screen.getByRole('button', { name: 'Collapse Details' }));

    expect(screen.getByRole('button', { name: 'Expand Details' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('preview collapse preserves the generated expression after re-expand', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} initialDocument={sampleDocument} />);

    const expressionBefore = screen.getByLabelText('Generated expression').textContent;
    await user.click(screen.getByRole('button', { name: 'Collapse expression preview' }));
    expect(screen.getByRole('button', { name: 'Expand expression preview' })).toHaveAttribute('aria-expanded', 'false');

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
