// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExpressionBuilderShell } from '../src/app/ExpressionBuilderShell';
import { sampleDocument } from '../src/app/sampleData';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import type { ReactNode } from 'react';
import { PointerSensor } from '@dnd-kit/react';
import { Accessibility } from '@dnd-kit/dom';

type DragEndInput = {
  operation: {
    source?: { data: unknown };
    target?: { data: unknown };
  };
  canceled: boolean;
};

type DragStartInput = {
  operation: {
    source?: { handle?: Element; data?: unknown };
  };
};

type DragOverInput = {
  operation: {
    source?: { data: unknown };
    target?: { data: unknown };
  };
};

const dragDropHarness = vi.hoisted(() => ({
  onDragStart: undefined as ((event: DragStartInput) => void) | undefined,
  onDragOver: undefined as ((event: DragOverInput) => void) | undefined,
  onDragEnd: undefined as ((event: DragEndInput) => void) | undefined,
  plugins: undefined as ((defaults: unknown[]) => unknown[]) | undefined,
  sensors: undefined as ((defaults: unknown[]) => unknown[]) | undefined,
}));

vi.mock('@dnd-kit/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/react')>();
  return {
    ...actual,
    DragDropProvider: ({
      children,
      onDragStart,
      onDragOver,
      onDragEnd,
      plugins,
      sensors,
    }: {
      children: ReactNode;
      onDragStart?: (event: DragStartInput) => void;
      onDragOver?: (event: DragOverInput) => void;
      onDragEnd?: (event: DragEndInput) => void;
      plugins?: (defaults: unknown[]) => unknown[];
      sensors?: (defaults: unknown[]) => unknown[];
    }) => {
      dragDropHarness.onDragStart = onDragStart;
      dragDropHarness.onDragOver = onDragOver;
      dragDropHarness.onDragEnd = onDragEnd;
      dragDropHarness.plugins = plugins;
      dragDropHarness.sensors = sensors;
      return children;
    },
  };
});

function createAdapter(savedPalette: string | null = null): PlatformAdapter {
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
      get: vi.fn(async (key: string) => {
        if (key === 'eb.onboarding.seen.v1') return '1';
        if (key === 'eb.workbench.palette') return savedPalette;
        return null;
      }),
      set: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    },
    getDataverseFields: vi.fn(async () => []),
  };
}

afterEach(() => {
  cleanup();
  dragDropHarness.onDragStart = undefined;
  dragDropHarness.onDragOver = undefined;
  dragDropHarness.onDragEnd = undefined;
  dragDropHarness.plugins = undefined;
  dragDropHarness.sensors = undefined;
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

  it('replaces only the default pointer sensor and accessibility plugin', () => {
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    const otherSensor = class OtherSensor {};
    const sensors = dragDropHarness.sensors?.([PointerSensor, otherSensor]);
    expect(sensors).toHaveLength(2);
    expect(sensors).toContain(otherSensor);
    expect(sensors).not.toContain(PointerSensor);

    const otherPlugin = class OtherPlugin {};
    const plugins = dragDropHarness.plugins?.([Accessibility, otherPlugin]);
    expect(plugins).toHaveLength(2);
    expect(plugins).toContain(otherPlugin);
    expect(plugins).not.toContain(Accessibility);
  });

  it('keeps accessibility announcements current and rejects stale drop data', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    const dueDateSource = {
      operation: {
        source: {
          data: { kind: 'toolbox-field', fieldId: 'DueDate' },
        },
      },
    };

    act(() => {
      dragDropHarness.onDragStart?.(dueDateSource);
    });
    expect(screen.getByTestId('builder-drag-status')).toHaveTextContent(
      'Picked up field DueDate.',
    );

    await user.click(
      screen.getByRole('button', { name: 'Load sample fields' }),
    );

    act(() => {
      dragDropHarness.onDragStart?.(dueDateSource);
      dragDropHarness.onDragOver?.({
        operation: {
          source: dueDateSource.operation.source,
          target: {
            data: { kind: 'condition-position', groupId: 'root', index: 0 },
          },
        },
      });
    });
    expect(screen.getByTestId('builder-drag-status')).toHaveTextContent(
      'field Due date is over position 1 of 1 in AND group root.',
    );

    act(() => {
      dragDropHarness.onDragEnd?.({
        operation: {
          source: {
            data: { kind: 'toolbox-field', fieldId: 'RemovedField' },
          },
          target: {
            data: { kind: 'condition-position', groupId: 'root', index: 0 },
          },
        },
        canceled: false,
      });
    });
    expect(screen.getByTestId('builder-drag-status')).toHaveTextContent(
      'Could not drop field RemovedField at that position. No changes were made.',
    );
  });

  it('keeps the configured accessibility plugin stable and restores focus after reorder', async () => {
    render(<ExpressionBuilderShell adapter={createAdapter()} initialDocument={sampleDocument} />);

    const configuredPlugin = dragDropHarness.plugins?.([Accessibility])[0];
    const handle = screen.getByRole('button', { name: 'Reorder condition Status' });
    handle.focus();
    act(() => {
      dragDropHarness.onDragStart?.({
        operation: { source: { handle } },
      });
    });
    screen.getByRole('button', { name: 'Clear all conditions' }).focus();

    await act(async () => {
      dragDropHarness.onDragEnd?.({
        operation: {
          source: {
            data: {
              kind: 'condition-node',
              nodeId: 'rule-status',
              parentGroupId: 'root',
              sourceIndex: 0,
            },
          },
          target: {
            data: { kind: 'condition-position', groupId: 'root', index: 3 },
          },
        },
        canceled: false,
      });
      await Promise.resolve();
    });

    expect(handle).toHaveFocus();
    expect(dragDropHarness.plugins?.([Accessibility])[0]).toBe(configuredPlugin);
    expect(screen.getByTestId('builder-drag-status')).toHaveTextContent(
      'Moved Status to position 4 of 4 in AND group root.',
    );
  });

  it.each([
    ['cancelled', true],
    ['outside', false],
  ])(
    'restores focus and leaves order unchanged after an %s drop',
    async (_description, canceled) => {
      render(
        <ExpressionBuilderShell
          adapter={createAdapter()}
          initialDocument={sampleDocument}
        />,
      );

      const rootGroup = screen.getByRole('group', { name: 'AND group root' });
      const rootChildren = rootGroup.querySelector(':scope > .eb-group-children');
      const childOrder = () =>
        Array.from(rootChildren?.children ?? [])
          .filter((element) => element.hasAttribute('data-node-id'))
          .map((element) => element.getAttribute('data-node-id'));
      const initialOrder = childOrder();
      const handle = screen.getByRole('button', {
        name: 'Reorder condition Status',
      });
      handle.focus();
      act(() => {
        dragDropHarness.onDragStart?.({
          operation: { source: { handle } },
        });
      });
      screen.getByRole('button', { name: 'Clear all conditions' }).focus();

      await act(async () => {
        dragDropHarness.onDragEnd?.({
          operation: {
            source: {
              data: {
                kind: 'condition-node',
                nodeId: 'rule-status',
                parentGroupId: 'root',
                sourceIndex: 0,
              },
            },
          },
          canceled,
        });
        await Promise.resolve();
      });

      expect(childOrder()).toEqual(initialOrder);
      expect(handle).toHaveFocus();
      expect(screen.getByTestId('builder-drag-status')).toHaveTextContent(
        canceled
          ? 'Cancelled dragging Status. No changes were made.'
          : 'Could not drop Status at that position. No changes were made.',
      );
    },
  );

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

  it('clicking a field after focusing a nested group adds the rule there, not root', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} initialDocument={sampleDocument} />);

    // Focus the existing nested "group-routing" group by clicking its toolbar.
    const routingGroup = screen.getByRole('group', { name: 'OR group group-routing' });
    await user.click(within(routingGroup).getByText('Match any of the following'));

    // Click a field that isn't already in any rule.
    const fieldList = screen.getByRole('list', { name: 'Dynamic content fields' });
    await user.click(within(fieldList).getByText('Due date'));

    // The new rule lands inside the focused nested group, not appended to root.
    // (Query by the rule row's group role/aria-label, not text, since every
    // other row's field dropdown also renders a "Due date" <option>.)
    const canvas = screen.getByRole('region', { name: 'Condition Builder' });
    const dueDateRows = within(canvas).getAllByRole('group', { name: /^Due date/ });
    expect(dueDateRows).toHaveLength(1);
    expect(routingGroup).toContainElement(dueDateRows[0]);
  });

  it('pressing Enter on a field after focusing a nested group keeps the append path unchanged', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} initialDocument={sampleDocument} />);

    const routingGroup = screen.getByRole('group', { name: 'OR group group-routing' });
    await user.click(within(routingGroup).getByText('Match any of the following'));
    const dueDateAction = screen.getByRole('button', {
      name: 'Add a rule for Due date, dateTime',
    });
    dueDateAction.focus();
    await user.keyboard('{Enter}');

    const dueDateRow = within(routingGroup).getByRole('group', { name: /^Due date/ });
    expect(routingGroup).toContainElement(dueDateRow);
    expect(
      Array.from(routingGroup.querySelectorAll('.eb-rule-row-editor')).at(-1),
    ).toBe(dueDateRow);
  });

  it('applies a resolved field-drop command at an exact nested-group index', () => {
    render(<ExpressionBuilderShell adapter={createAdapter()} initialDocument={sampleDocument} />);

    act(() => {
      dragDropHarness.onDragEnd?.({
        operation: {
          source: { data: { kind: 'toolbox-field', fieldId: 'DueDate' } },
          target: {
            data: { kind: 'condition-position', groupId: 'group-routing', index: 1 },
          },
        },
        canceled: false,
      });
    });

    const routingGroup = screen.getByRole('group', { name: 'OR group group-routing' });
    expect(
      Array.from(routingGroup.querySelectorAll('.eb-rule-row-editor')).map((row) =>
        row.getAttribute('data-node-id'),
      ),
    ).toEqual(['rule-region-emea', 'rule-1', 'rule-amount']);
    expect(within(routingGroup).getByRole('group', { name: /^Due date/ })).toHaveClass(
      'is-selected',
    );
    expect(routingGroup).toHaveClass('is-focused');

    const expression = screen.getByLabelText('Generated expression').textContent ?? '';
    expect(expression.indexOf("['DueDate']")).toBeLessThan(expression.indexOf("['Amount']"));
  });

  it('applies a sibling-reorder command to rendered and generated-expression order', () => {
    render(<ExpressionBuilderShell adapter={createAdapter()} initialDocument={sampleDocument} />);

    act(() => {
      dragDropHarness.onDragEnd?.({
        operation: {
          source: {
            data: {
              kind: 'condition-node',
              nodeId: 'rule-status',
              parentGroupId: 'root',
              sourceIndex: 0,
            },
          },
          target: {
            data: { kind: 'condition-position', groupId: 'root', index: 3 },
          },
        },
        canceled: false,
      });
    });

    const rootGroup = screen.getByRole('group', { name: 'AND group root' });
    const rootChildren = rootGroup.querySelector(':scope > .eb-group-children');
    expect(
      Array.from(rootChildren?.children ?? [])
        .filter((element) => element.hasAttribute('data-node-id'))
        .map((element) => element.getAttribute('data-node-id')),
    ).toEqual(['rule-approver', 'group-routing', 'rule-status']);

    const expression = screen.getByLabelText('Generated expression').textContent ?? '';
    expect(expression.indexOf("['Approver']")).toBeLessThan(expression.indexOf("['Status']"));
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

  it('keeps import and export commands in the header without the saved JSON panel', () => {
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    expect(screen.getByRole('button', { name: /^import$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
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
    expect(adapter.settings.set).toHaveBeenCalledWith('eb.workbench.palette', 'graphiteLight');
  });

  it.each([
    ['porcelainLight', 'graphiteLight', 'light'],
    ['porcelainDark', 'graphiteDark', 'dark'],
  ] as const)('migrates the legacy %s preference to %s', async (legacyId, graphiteId, mode) => {
    const adapter = createAdapter(legacyId);
    const { container } = render(<ExpressionBuilderShell adapter={adapter} />);

    await waitFor(() => {
      expect(container.querySelector('.eb-root')).toHaveAttribute('data-theme', mode);
      expect(adapter.settings.set).toHaveBeenCalledWith('eb.workbench.palette', graphiteId);
    });
  });

  it('uses a saved Graphite preference without rewriting it', async () => {
    const adapter = createAdapter('graphiteLight');
    const { container } = render(<ExpressionBuilderShell adapter={adapter} />);

    await waitFor(() => expect(container.querySelector('.eb-root')).toHaveAttribute('data-theme', 'light'));
    expect(adapter.settings.set).not.toHaveBeenCalledWith('eb.workbench.palette', 'graphiteLight');
  });

  it('falls back to the host theme for an unknown saved preference', async () => {
    const adapter = createAdapter('unknown-palette');
    vi.mocked(adapter.getTheme).mockResolvedValue('highContrast');
    const { container } = render(<ExpressionBuilderShell adapter={adapter} />);

    await waitFor(() => expect(container.querySelector('.eb-root')).toHaveAttribute('data-theme', 'dark'));
  });
});
