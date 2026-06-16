// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SupportPane } from '../src/workbench/SupportPane';

afterEach(() => cleanup());

describe('SupportPane', () => {
  it('renders diagnostics in a polite live region', () => {
    render(
      <SupportPane
        mode="triggerCondition"
        diagnostics={[{ severity: 'warning', message: 'Value may be incomplete' }]}
        activeTab="diagnostics"
        collapsed={false}
        onTabChange={vi.fn()}
        onToggleCollapsed={vi.fn()}
      />,
    );

    const diagnostics = screen.getByRole('status', { name: 'warnings/errors' });
    expect(diagnostics).toHaveAttribute('aria-live', 'polite');
    expect(diagnostics).toHaveTextContent('Value may be incomplete');
  });

  it('shows filter array context when mode context tab is active', () => {
    render(
      <SupportPane
        mode="filterArray"
        diagnostics={[]}
        activeTab="modeContext"
        collapsed={false}
        onTabChange={vi.fn()}
        onToggleCollapsed={vi.fn()}
      />,
    );

    expect(screen.getByText("item()?['FieldName']")).toBeInTheDocument();
  });

  it('changes support tabs through real tab buttons', async () => {
    const onTabChange = vi.fn();

    render(
      <SupportPane
        mode="triggerCondition"
        diagnostics={[]}
        activeTab="diagnostics"
        collapsed={false}
        onTabChange={onTabChange}
        onToggleCollapsed={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('tab', { name: 'Mode Context' }));
    expect(onTabChange).toHaveBeenCalledWith('modeContext');
  });
});
