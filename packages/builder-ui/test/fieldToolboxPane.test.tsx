// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleFields } from '../src/app/sampleData';
import { FieldToolboxPane } from '../src/workbench/FieldToolboxPane';
import type { DataSourceDescriptor } from '../src/composer/querySchema';

const source: DataSourceDescriptor = { kind: 'sample', label: 'Sample fields' };

afterEach(() => cleanup());

function baseProps() {
  return {
    fields: sampleFields,
    source,
    collapsed: false,
    onTabChange: vi.fn(),
    onToggleCollapsed: vi.fn(),
    onSwitchTable: vi.fn(),
    onImport: vi.fn(),
    onAddField: vi.fn(),
    onLoadSamples: vi.fn(),
    onManageProfiles: vi.fn(),
    onRefresh: vi.fn(),
  };
}

describe('FieldToolboxPane', () => {
  it('renders a separately named drag handle for every field', () => {
    render(<FieldToolboxPane {...baseProps()} activeTab="dynamicContent" />);

    expect(screen.getAllByRole('button', { name: /^Drag .+ to insert$/ })).toHaveLength(
      sampleFields.length,
    );
  });

  it('creates a rule when a field row is clicked', async () => {
    const onCreateRuleFromField = vi.fn();
    render(
      <FieldToolboxPane {...baseProps()} activeTab="dynamicContent" onCreateRuleFromField={onCreateRuleFromField} />,
    );

    const list = screen.getByRole('list', { name: 'Dynamic content fields' });
    const firstAction = within(list).getByRole('button', {
      name: `Add a rule for ${sampleFields[0].label}, ${sampleFields[0].type}`,
    });
    await userEvent.click(firstAction);

    expect(onCreateRuleFromField).toHaveBeenCalledTimes(1);
    expect(onCreateRuleFromField.mock.calls[0][0].id).toBe(sampleFields[0].id);
  });

  it.each(['{Enter}', ' '])(
    'creates exactly one rule when a field action receives %s',
    async (key) => {
      const onCreateRuleFromField = vi.fn();
      const user = userEvent.setup();
      render(
        <FieldToolboxPane
          {...baseProps()}
          activeTab="dynamicContent"
          onCreateRuleFromField={onCreateRuleFromField}
        />,
      );

      const fieldAction = screen.getByRole('button', {
        name: `Add a rule for ${sampleFields[0].label}, ${sampleFields[0].type}`,
      });
      fieldAction.focus();
      await user.keyboard(key);

      expect(onCreateRuleFromField).toHaveBeenCalledTimes(1);
      expect(onCreateRuleFromField).toHaveBeenCalledWith(sampleFields[0]);
    },
  );

  it('does not insert a field when its drag handle is focused or operated', async () => {
    const onCreateRuleFromField = vi.fn();
    const user = userEvent.setup();
    render(
      <FieldToolboxPane
        {...baseProps()}
        activeTab="dynamicContent"
        onCreateRuleFromField={onCreateRuleFromField}
      />,
    );

    const handle = screen.getByRole('button', {
      name: `Drag ${sampleFields[0].label} to insert`,
    });
    handle.focus();
    await user.click(handle);

    expect(handle).toHaveFocus();
    expect(onCreateRuleFromField).not.toHaveBeenCalled();
  });

  it('toggles wrapper selection from the wrappers tab', async () => {
    const onToggleWrapper = vi.fn();
    render(
      <FieldToolboxPane
        {...baseProps()}
        activeTab="wrappers"
        selectedWrappers={[]}
        onToggleWrapper={onToggleWrapper}
        onClearWrapperSelection={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Select toLower/ }));
    expect(onToggleWrapper).toHaveBeenCalledWith('toLower');
  });
});
