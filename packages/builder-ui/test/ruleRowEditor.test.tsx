// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import { RuleRowEditor } from '../src/workbench/RuleRowEditor';
import type { QueryRule } from '../src/composer/querySchema';

afterEach(() => cleanup());

const fields: FieldDefinition[] = [
  { id: 'name', label: 'Name', type: 'string', path: ['name'] },
  { id: 'ownerid.fullname', label: 'Owner Name', type: 'string', path: ['ownerid', 'fullname'], group: 'Owner' },
  { id: 'statuscode', label: 'Status', type: 'choice', path: ['statuscode'], options: [{ label: 'Active', value: 1 }], choices: ['Active'] },
];

const baseRule: QueryRule = { id: 'rule-1', kind: 'rule', fieldId: 'name', operator: 'equals', value: 'Bob' };

function renderRow(rule: QueryRule, extra: Record<string, unknown> = {}) {
  const onUpdate = vi.fn();
  render(
    <RuleRowEditor
      rule={rule}
      fields={fields}
      selected
      onSelect={vi.fn()}
      onUpdate={onUpdate}
      onDuplicate={vi.fn()}
      onDelete={vi.fn()}
      {...extra}
    />,
  );
  return { onUpdate };
}

describe('RuleRowEditor', () => {
  it('groups related fields under an optgroup', () => {
    renderRow(baseRule);
    const select = screen.getByLabelText('Field for Name') as HTMLSelectElement;
    const optgroup = select.querySelector('optgroup');
    expect(optgroup).not.toBeNull();
    expect(optgroup?.label).toBe('Owner');
  });

  it('stores the numeric option value for a choice field', async () => {
    const choiceRule: QueryRule = { id: 'rule-1', kind: 'rule', fieldId: 'statuscode', operator: 'equals', value: 1 };
    const { onUpdate } = renderRow(choiceRule);
    const valueSelect = screen.getByLabelText('Value for Status') as HTMLSelectElement;
    expect(within(valueSelect).getByText('Active')).toBeInTheDocument();
    // selecting an option reports a number
    await userEvent.selectOptions(valueSelect, '1');
    expect(onUpdate).toHaveBeenCalledWith('rule-1', { value: 1 });
  });

  it('applies a wrapper from the per-row menu', async () => {
    const { onUpdate } = renderRow(baseRule);
    await userEvent.click(screen.getByRole('button', { name: 'Wrappers for Name' }));
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: /toLower/ }));
    expect(onUpdate).toHaveBeenCalledWith('rule-1', { wrappers: ['toLower'] });
  });

  it('removes a wrapper by unchecking it in the menu', async () => {
    const wrappedRule: QueryRule = { ...baseRule, wrappers: ['toLower'] };
    const { onUpdate } = renderRow(wrappedRule);
    await userEvent.click(screen.getByRole('button', { name: 'Wrappers for Name' }));
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: /toLower/ }));
    expect(onUpdate).toHaveBeenCalledWith('rule-1', { wrappers: [] });
  });

  it('shows existing wrappers pre-checked in the menu', async () => {
    const wrappedRule: QueryRule = { ...baseRule, wrappers: ['toLower', 'trim'] };
    renderRow(wrappedRule);
    await userEvent.click(screen.getByRole('button', { name: 'Wrappers for Name' }));
    expect(screen.getByRole('menuitemcheckbox', { name: /toLower/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemcheckbox', { name: /trim/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemcheckbox', { name: /toUpper/ })).toHaveAttribute('aria-checked', 'false');
  });

  it('appends a newly checked wrapper after existing ones (nesting order)', async () => {
    const wrappedRule: QueryRule = { ...baseRule, wrappers: ['trim'] };
    const { onUpdate } = renderRow(wrappedRule);
    await userEvent.click(screen.getByRole('button', { name: 'Wrappers for Name' }));
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: /toLower/ }));
    expect(onUpdate).toHaveBeenCalledWith('rule-1', { wrappers: ['trim', 'toLower'] });
  });

  it('unchecking one wrapper leaves the rest in place', async () => {
    const wrappedRule: QueryRule = { ...baseRule, wrappers: ['trim', 'toLower'] };
    const { onUpdate } = renderRow(wrappedRule);
    await userEvent.click(screen.getByRole('button', { name: 'Wrappers for Name' }));
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: /trim/ }));
    expect(onUpdate).toHaveBeenCalledWith('rule-1', { wrappers: ['toLower'] });
  });
});
