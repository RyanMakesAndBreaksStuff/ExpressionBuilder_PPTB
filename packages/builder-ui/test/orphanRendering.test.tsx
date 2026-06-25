// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleRowEditor } from '../src/workbench/RuleRowEditor';

afterEach(() => cleanup());

const noop = vi.fn();

describe('orphan rule rendering', () => {
  it('renders an Unknown field row when the fieldId is missing', () => {
    render(
      <RuleRowEditor
        rule={{ id: 'r1', kind: 'rule', fieldId: 'Ghost', operator: 'equals', value: 'x' }}
        fields={[]}
        selected={false}
        onSelect={noop}
        onUpdate={noop}
        onDuplicate={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText('Ghost')).toBeTruthy();
    expect(screen.getByLabelText('Unknown field')).toBeTruthy();
  });

  it('does not render field-select for an orphan', () => {
    render(
      <RuleRowEditor
        rule={{ id: 'r1', kind: 'rule', fieldId: 'Ghost', operator: 'equals', value: 'x' }}
        fields={[]}
        selected={false}
        onSelect={noop}
        onUpdate={noop}
        onDuplicate={noop}
        onDelete={noop}
      />,
    );
    expect(screen.queryByTitle('Select field')).toBeNull();
  });

  it('shows Remap button when onRequestRemap is provided', () => {
    const onRequestRemap = vi.fn();
    render(
      <RuleRowEditor
        rule={{ id: 'r1', kind: 'rule', fieldId: 'Ghost', operator: 'equals', value: 'x' }}
        fields={[]}
        selected={false}
        onSelect={noop}
        onUpdate={noop}
        onDuplicate={noop}
        onDelete={noop}
        onRequestRemap={onRequestRemap}
      />,
    );
    expect(screen.getByText('Remap…')).toBeTruthy();
  });

  it('calls onRequestRemap when Remap button is clicked', async () => {
    const onRequestRemap = vi.fn();
    const onSelect = vi.fn();
    render(
      <RuleRowEditor
        rule={{ id: 'r1', kind: 'rule', fieldId: 'Ghost', operator: 'equals', value: 'x' }}
        fields={[]}
        selected={false}
        onSelect={onSelect}
        onUpdate={noop}
        onDuplicate={noop}
        onDelete={noop}
        onRequestRemap={onRequestRemap}
      />,
    );
    await userEvent.click(screen.getByText('Remap…'));
    expect(onSelect).toHaveBeenCalledWith('r1');
    expect(onRequestRemap).toHaveBeenCalledWith('r1');
  });

  it('renders a normal row when the field is found', () => {
    const fields = [
      { id: 'Status', label: 'Status', type: 'choice' as const, path: ['Status'], choices: ['Open', 'Closed'] },
    ];
    render(
      <RuleRowEditor
        rule={{ id: 'r1', kind: 'rule', fieldId: 'Status', operator: 'equals', value: 'Open' }}
        fields={fields}
        selected={false}
        onSelect={noop}
        onUpdate={noop}
        onDuplicate={noop}
        onDelete={noop}
      />,
    );
    expect(screen.queryByLabelText('Unknown field')).toBeNull();
    expect(screen.getByTitle('Select field')).toBeTruthy();
  });
});
