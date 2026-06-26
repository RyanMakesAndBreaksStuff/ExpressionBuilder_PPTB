// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WrapperChips } from '../src/workbench/WrapperChips';

afterEach(() => cleanup());

describe('WrapperChips', () => {
  it('shows selected state and toggles via callback', async () => {
    const onToggle = vi.fn();
    render(<WrapperChips selected={['toLower']} onToggle={onToggle} onClearSelection={vi.fn()} />);

    expect(screen.getByRole('button', { name: /toLower/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /toUpper/ })).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(screen.getByRole('button', { name: /trim/ }));
    expect(onToggle).toHaveBeenCalledWith('trim');
  });

  it('does not offer value-generator wrappers', () => {
    render(<WrapperChips selected={[]} onToggle={vi.fn()} onClearSelection={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /addDays/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /utcNow/ })).not.toBeInTheDocument();
  });

  it('clears the selection with one click', async () => {
    const onClearSelection = vi.fn();
    render(<WrapperChips selected={['toLower', 'trim']} onToggle={vi.fn()} onClearSelection={onClearSelection} />);
    await userEvent.click(screen.getByRole('button', { name: /clear selection/i }));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });
});
