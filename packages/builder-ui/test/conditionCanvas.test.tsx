// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleDocument } from '../src/app/sampleData';
import { ConditionCanvas } from '../src/workbench/ConditionCanvas';

afterEach(() => cleanup());

function renderCanvas(overrides = {}) {
  const props = {
    root: sampleDocument.root,
    fields: sampleDocument.fields,
    mode: sampleDocument.mode,
    selectedRuleId: sampleDocument.selectedRuleId,
    activeGroupId: 'root',
    onSelectRule: vi.fn(),
    onAddRule: vi.fn(),
    onAddGroup: vi.fn(),
    onFocusGroup: vi.fn(),
    onChangeGroupConjunction: vi.fn(),
    onUpdateRule: vi.fn(),
    onDuplicateRule: vi.fn(),
    onDeleteNode: vi.fn(),
    onReorderNode: vi.fn(),
    onClear: vi.fn(),
    ...overrides,
  };

  const view = render(<ConditionCanvas {...props} />);
  return { ...props, ...view };
}

describe('ConditionCanvas', () => {
  it('renders the root group as a condition builder canvas', () => {
    renderCanvas();

    expect(screen.getByRole('region', { name: 'Condition Builder' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'AND group root' })).toBeInTheDocument();
  });

  it('updates a rule value from an inline row', async () => {
    const props = renderCanvas();

    const approverRow = screen.getByRole('group', { name: /Approver contains finance/i });
    const value = within(approverRow).getByLabelText('Value for Approver');
    // The input is controlled (value driven by rule.value from props). fireEvent.change
    // directly triggers the onChange handler without a re-render loop.
    fireEvent.change(value, { target: { value: 'director' } });

    expect(props.onUpdateRule).toHaveBeenLastCalledWith('rule-approver', { value: 'director' });
  });

  it('changes a nested group conjunction', async () => {
    const props = renderCanvas();

    await userEvent.click(screen.getByRole('button', { name: 'Set group-routing conjunction to AND' }));

    expect(props.onChangeGroupConjunction).toHaveBeenCalledWith('group-routing', 'and');
  });

  it('focuses a group when its toolbar is clicked, and shows the active group as focused', () => {
    const props = renderCanvas();

    const routingGroup = screen.getByRole('group', { name: 'OR group group-routing' });
    fireEvent.click(within(routingGroup).getByText('Match any of the following'));

    expect(props.onFocusGroup).toHaveBeenCalledWith('group-routing');
    expect(screen.getByRole('group', { name: 'AND group root' })).toHaveClass('is-focused');
    expect(routingGroup).not.toHaveClass('is-focused');
  });

  it('renders named reorder handles for every rule and non-root group, but not the root', () => {
    renderCanvas();

    expect(screen.getByRole('button', { name: 'Reorder condition Status' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reorder condition Approver' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reorder condition Region' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reorder condition Amount' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reorder group group-routing' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reorder group root' })).not.toBeInTheDocument();
  });

  it('renders a reorder handle for an orphan rule', () => {
    renderCanvas({
      root: {
        ...sampleDocument.root,
        children: [
          {
            id: 'rule-legacy',
            kind: 'rule',
            fieldId: 'LegacyStatus',
            operator: 'equals',
            value: 'Old',
          },
        ],
      },
    });

    expect(
      screen.getByRole('button', { name: 'Reorder condition unknown field LegacyStatus' }),
    ).toBeInTheDocument();
  });

  it('exposes before, between, after, and empty-group insertion positions', () => {
    const { container, unmount } = render(
      <ConditionCanvas
        {...renderCanvasProps()}
        root={sampleDocument.root}
      />,
    );

    expect(container.querySelectorAll('[data-drop-position]')).toHaveLength(7);
    const firstPosition = container.querySelector(
      '[data-drop-position="0"][data-group-id="root"]',
    );
    expect(firstPosition).toHaveAttribute(
      'aria-label',
      'Insert at position 1 of 4 in AND group root',
    );
    const lastPosition = container.querySelector(
      '[data-drop-position="3"][data-group-id="root"]',
    );
    expect(lastPosition).toHaveAttribute(
      'aria-label',
      'Insert at position 4 of 4 in AND group root',
    );

    unmount();
    const { container: emptyContainer } = render(
      <ConditionCanvas
        {...renderCanvasProps()}
        root={{ id: 'root', kind: 'group', conjunction: 'and', children: [] }}
      />,
    );
    const emptyPosition = emptyContainer.querySelector(
      '[data-drop-position="0"][data-group-id="root"]',
    );
    expect(emptyPosition).toHaveAttribute(
      'aria-label',
      'Insert at position 1 of 1 in AND group root',
    );
  });

  it('keeps editable controls and actions outside the drag activator', () => {
    renderCanvas();

    const row = screen.getByRole('group', { name: /Approver contains finance/i });
    const handle = within(row).getByRole('button', { name: 'Reorder condition Approver' });
    const fieldSelect = within(row).getByLabelText('Field for Approver');
    const deleteButton = within(row).getByRole('button', { name: 'Delete rule' });

    expect(handle).not.toContainElement(fieldSelect);
    expect(handle).not.toContainElement(deleteButton);
  });

  it('does not mark inactive insertion positions as valid drops', () => {
    const { container } = renderCanvas();

    for (const target of container.querySelectorAll('[data-drop-position]')) {
      expect(target).not.toHaveClass('is-valid-drop');
      expect(target).not.toHaveClass('is-invalid-drop');
      expect(target).not.toHaveClass('is-drop-target');
    }
  });

  it('supports non-drag Move up and Move down actions with a polite announcement', async () => {
    const props = renderCanvas();
    const statusRow = screen.getByRole('group', { name: /Status equals Approved/i });

    expect(within(statusRow).getByRole('button', { name: 'Move Status up' })).toBeDisabled();
    await userEvent.click(within(statusRow).getByRole('button', { name: 'Move Status down' }));

    expect(props.onReorderNode).toHaveBeenCalledWith('rule-status', 'root', 1);
    expect(screen.getByTestId('condition-reorder-status')).toHaveTextContent(
      'Moved Status to position 2 of 3.',
    );

    const routingGroup = screen.getByRole('group', { name: 'OR group group-routing' });
    expect(
      within(routingGroup).getByRole('button', { name: 'Move group group-routing down' }),
    ).toBeDisabled();
  });
});

function renderCanvasProps() {
  return {
    fields: sampleDocument.fields,
    mode: sampleDocument.mode,
    selectedRuleId: sampleDocument.selectedRuleId,
    activeGroupId: 'root',
    onSelectRule: vi.fn(),
    onAddRule: vi.fn(),
    onAddGroup: vi.fn(),
    onFocusGroup: vi.fn(),
    onChangeGroupConjunction: vi.fn(),
    onUpdateRule: vi.fn(),
    onDuplicateRule: vi.fn(),
    onDeleteNode: vi.fn(),
    onReorderNode: vi.fn(),
    onClear: vi.fn(),
  };
}
