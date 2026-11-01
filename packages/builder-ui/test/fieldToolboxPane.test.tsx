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
  it('uses the type badge as the only type marker in each field row', () => {
    render(<FieldToolboxPane {...baseProps()} />);

    const firstFieldAction = screen.getByRole('button', {
      name: `Add a rule for ${sampleFields[0].label}, ${sampleFields[0].type}`,
    });
    const typeBadge = firstFieldAction.querySelector('.eb-field-type-badge');

    expect(firstFieldAction.querySelector('.eb-type')).not.toBeInTheDocument();
    expect(typeBadge).toHaveClass('choice');
    expect(typeBadge).toHaveTextContent('choice');
  });

  it('renders a separately named drag handle for every field', () => {
    render(<FieldToolboxPane {...baseProps()} />);

    expect(screen.getAllByRole('button', { name: /^Drag .+ to insert$/ })).toHaveLength(
      sampleFields.length,
    );
  });

  it('creates a rule when a field row is clicked', async () => {
    const onCreateRuleFromField = vi.fn();
    render(
      <FieldToolboxPane {...baseProps()} onCreateRuleFromField={onCreateRuleFromField} />,
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
});

describe('FieldToolboxPane related sections', () => {
  const sections = [{ navigationProperty: 'ownerid', displayName: 'Owner' }];

  it('requests an idle section from the keyboard and shows loading while pending', async () => {
    const onExpandRelated = vi.fn();
    const user = userEvent.setup();
    const view = render(
      <FieldToolboxPane {...baseProps()} relatedSections={sections} onExpandRelated={onExpandRelated} />,
    );
    screen.getByRole('button', { name: /Owner/ }).focus();
    await user.keyboard('{Enter}');
    expect(onExpandRelated).toHaveBeenCalledExactlyOnceWith('ownerid');

    view.rerender(
      <FieldToolboxPane
        {...baseProps()}
        relatedSections={sections}
        relatedStatus={{ ownerid: 'pending' }}
        onExpandRelated={onExpandRelated}
      />,
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    await user.keyboard('{Enter}');
    await user.keyboard('{Enter}');
    expect(onExpandRelated).toHaveBeenCalledTimes(1);
  });

  it('exposes a keyboard retry for a failed section', async () => {
    const onExpandRelated = vi.fn();
    const user = userEvent.setup();
    render(
      <FieldToolboxPane
        {...baseProps()}
        relatedSections={sections}
        relatedStatus={{ ownerid: 'failed' }}
        onExpandRelated={onExpandRelated}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Owner/ }));
    expect(onExpandRelated).not.toHaveBeenCalled();
    expect(screen.getByText('Could not load fields.')).toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry loading Owner fields' }).focus();
    await user.keyboard('{Enter}');
    expect(onExpandRelated).toHaveBeenCalledExactlyOnceWith('ownerid');
  });

  it('shows the empty state, not failure, for a successful empty section', async () => {
    const onExpandRelated = vi.fn();
    render(
      <FieldToolboxPane
        {...baseProps()}
        relatedSections={sections}
        relatedStatus={{ ownerid: 'succeeded' }}
        onExpandRelated={onExpandRelated}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Owner/ }));
    expect(screen.getByText('No fields.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Retry/ })).not.toBeInTheDocument();
    expect(onExpandRelated).not.toHaveBeenCalled();
  });
});
