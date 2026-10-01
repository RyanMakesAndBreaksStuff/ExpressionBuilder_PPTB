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
      .toEqual(['Functions', 'Trigger / Filter', 'JSON reference']);
  });

  it('shows the title and the active screen (FR-2, AC-2.1)', () => {
    renderHeader();
    expect(screen.getByText('Expression Builder')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Screen: Trigger / Filter' })).toBeInTheDocument();
  });

  it('switches screens from the chip menu (FR-3, AC-3.1)', async () => {
    const user = userEvent.setup();
    const props = renderHeader();
    await user.click(screen.getByRole('button', { name: 'Screen: Trigger / Filter' }));

    const items = screen.getAllByRole('menuitemradio');
    expect(items.map((item) => item.textContent))
      .toEqual(['Functions', 'Trigger / Filter', 'JSON reference']);
    expect(items[1]).toHaveAttribute('aria-checked', 'true');

    await user.click(items[0]);
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
});
