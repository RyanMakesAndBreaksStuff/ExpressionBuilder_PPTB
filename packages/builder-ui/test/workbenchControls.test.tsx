// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DockPane } from '../src/workbench/controls/DockPane';
import { TabStrip } from '../src/workbench/controls/TabStrip';

afterEach(() => cleanup());

describe('workbench shared controls', () => {
  it('renders a dock pane with accurate expanded state', async () => {
    const onToggle = vi.fn();

    render(
      <DockPane title="Docked Toolbox" side="left" collapsed={false} onToggleCollapsed={onToggle}>
        <p>Dynamic content body</p>
      </DockPane>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Collapse Docked Toolbox' }));

    expect(screen.getByRole('button', { name: 'Collapse Docked Toolbox' })).toHaveAttribute('aria-expanded', 'true');
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('keeps collapsed dock toggle names accessible without visible label text', () => {
    render(
      <DockPane title="Support Pane" side="right" collapsed={true} onToggleCollapsed={vi.fn()}>
        <p>Support content</p>
      </DockPane>,
    );

    expect(screen.getByRole('button', { name: /expand support pane/i })).toBeInTheDocument();
    expect(screen.queryByText(/expand support pane/i)).not.toBeInTheDocument();
  });

  it('renders real tabs with aria-selected state', async () => {
    const onChange = vi.fn();

    render(
      <TabStrip
        label="Toolbox tabs"
        activeTab="dynamicContent"
        tabs={[
          { id: 'dynamicContent', label: 'Dynamic Content' },
          { id: 'wrappers', label: 'Wrappers' },
        ]}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Dynamic Content' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: 'Wrappers' }));
    expect(onChange).toHaveBeenCalledWith('wrappers');
  });
});
