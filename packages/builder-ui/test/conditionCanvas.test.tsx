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
    ...overrides,
  };

  render(<ConditionCanvas {...props} />);
  return props;
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
});
