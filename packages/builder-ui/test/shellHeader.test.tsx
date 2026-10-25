// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SCREENS } from '../src/workbench/screens';
import { ShellHeader, type ShellHeaderProps } from '../src/workbench/ShellHeader';

afterEach(() => cleanup());

function renderHeader(overrides: Partial<ShellHeaderProps> = {}) {
  const props: ShellHeaderProps = {
    screen: 'condition',
    onScreenChange: vi.fn(),
    mode: 'triggerCondition',
    onModeChange: vi.fn(),
    onImport: vi.fn(),
    onExport: vi.fn(),
    ...overrides,
  };
  render(<ShellHeader {...props} />);
  return props;
}

describe('ShellHeader', () => {
  it('names all three screens once, in design order (FR-3)', () => {
    expect(SCREENS.map((entry) => entry.label))
      .toEqual(['Trigger / Filter', 'JSON reference', 'Functions']);
  });

  it('shows the title and the active screen (FR-2, AC-2.1)', () => {
    renderHeader();
    expect(screen.getByText('Expression Builder')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Trigger / Filter' })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches screens from the tab list (FR-3, AC-3.1)', async () => {
    const user = userEvent.setup();
    const props = renderHeader();

    const items = screen.getAllByRole('tab');
    expect(screen.getByRole('tablist', { name: 'Screen' })).toBeInTheDocument();
    expect(items.map((item) => item.textContent))
      .toEqual(['Trigger / Filter', 'JSON reference', 'Functions']);
    expect(items[0]).toHaveAttribute('aria-selected', 'true');

    await user.click(items[2]);
    expect(props.onScreenChange).toHaveBeenCalledWith('functions');
  });

  it('offers mode, Import and Export on Trigger / Filter only (FR-5, AC-5.1)', async () => {
    const user = userEvent.setup();
    const props = renderHeader();
    expect(screen.getByRole('radiogroup', { name: 'Expression mode' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Export' }));
    expect(props.onExport).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'More actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Import' }));
    expect(props.onImport).toHaveBeenCalled();
  });

  it('shows no actions on Functions and the privacy note on JSON reference (AC-5.2)', () => {
    renderHeader({ screen: 'functions' });
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More actions' })).not.toBeInTheDocument();
    cleanup();

    renderHeader({ screen: 'jsonReference' });
    expect(
      screen.getByText('Pasted JSON is processed locally and is not uploaded or saved in any way.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument();
  });

  it.each(SCREENS.map((entry) => entry.id))('renders an injected host action on %s', (screenId) => {
    renderHeader({ screen: screenId, hostActions: <button type="button">Host action</button> });
    expect(screen.getByRole('button', { name: 'Host action' })).toBeInTheDocument();
  });
});
