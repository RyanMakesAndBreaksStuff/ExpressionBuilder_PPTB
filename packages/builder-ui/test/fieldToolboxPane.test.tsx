// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
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
  it('creates a rule when a field row is double-clicked', async () => {
    const onCreateRuleFromField = vi.fn();
    render(
      <FieldToolboxPane {...baseProps()} activeTab="dynamicContent" onCreateRuleFromField={onCreateRuleFromField} />,
    );

    const list = screen.getByRole('list', { name: 'Dynamic content fields' });
    const firstRow = list.querySelector('.eb-field-row') as HTMLElement;
    await userEvent.dblClick(firstRow);

    expect(onCreateRuleFromField).toHaveBeenCalledTimes(1);
    expect(onCreateRuleFromField.mock.calls[0][0].id).toBe(sampleFields[0].id);
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
