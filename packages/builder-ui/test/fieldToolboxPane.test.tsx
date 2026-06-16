// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleFields } from '../src/app/sampleData';
import { FieldToolboxPane } from '../src/workbench/FieldToolboxPane';

afterEach(() => cleanup());

describe('FieldToolboxPane', () => {
  it('filters dynamic content rows by visible label', async () => {
    render(
      <FieldToolboxPane
        fields={sampleFields}
        activeTab="dynamicContent"
        collapsed={false}
        onTabChange={vi.fn()}
        onToggleCollapsed={vi.fn()}
        onConnect={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText('Search dynamic content'), 'due');

    const list = screen.getByRole('list', { name: 'Dynamic content fields' });
    expect(within(list).getByText('Due date')).toBeInTheDocument();
    expect(within(list).queryByText('Status')).not.toBeInTheDocument();
  });

  it('renders wrapper chips when the wrappers tab is active', () => {
    render(
      <FieldToolboxPane
        fields={sampleFields}
        activeTab="wrappers"
        collapsed={false}
        onTabChange={vi.fn()}
        onToggleCollapsed={vi.fn()}
        onConnect={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Use toLower wrapper' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use addDays wrapper' })).toBeInTheDocument();
  });
});
