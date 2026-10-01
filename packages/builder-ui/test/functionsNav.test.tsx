// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { navGroups, initialFunctionsState } from '../src/workbench/functionsState';
import { FunctionsNav } from '../src/workbench/FunctionsNav';
import type { ParsedValueList } from '../src/workbench/parsedValueModel';

const parsedValue: ParsedValueList = {
  rows: [
    { label: 'Name', expression: "triggerBody()?['Name']", path: ['Name'] },
    { label: 'tags[0]', expression: "triggerBody()?['tags'][0]", path: ['tags', 0] },
  ],
  hiddenCount: 0,
  emptyMessage: null,
};

function renderNav(overrides: Partial<ComponentProps<typeof FunctionsNav>> = {}) {
  const props: ComponentProps<typeof FunctionsNav> = {
    groups: navGroups(initialFunctionsState),
    selectedFunction: 'concat',
    search: '',
    parsedValue,
    parsedValueExpanded: true,
    onSearchChange: vi.fn(),
    onToggleGroup: vi.fn(),
    onToggleParsedValue: vi.fn(),
    onSelectFunction: vi.fn(),
    onInsertReference: vi.fn(),
    ...overrides,
  };
  return { ...render(<FunctionsNav {...props} />), props };
}

describe('FunctionsNav', () => {
  afterEach(cleanup);

  it('labels the search box and reports typed search text', () => {
    const { props } = renderNav();
    fireEvent.change(screen.getByLabelText('Search functions'), { target: { value: 'upper' } });
    expect(props.onSearchChange).toHaveBeenCalledWith('upper');
  });

  it('renders expandable groups with their function counts', async () => {
    const user = userEvent.setup();
    const { props } = renderNav();
    const group = screen.getByRole('button', { name: 'String 20' });
    expect(group).toHaveAttribute('aria-expanded', 'true');
    await user.click(group);
    expect(props.onToggleGroup).toHaveBeenCalledWith('String');
  });

  it('shows rows only for expanded groups and marks the selected function', () => {
    const groups = navGroups(initialFunctionsState).map((group) => ({
      ...group,
      expanded: group.group === 'String',
    }));
    renderNav({ groups });
    expect(screen.getByRole('button', { name: 'concat' })).toHaveAttribute('aria-current', 'true');
    expect(screen.queryByRole('button', { name: 'add' })).toBeNull();
  });

  it('selects a row with null wrapping when the nav has no focused argument input', async () => {
    const user = userEvent.setup();
    const { props } = renderNav();
    await user.click(screen.getByRole('button', { name: 'toUpper' }));
    expect(props.onSelectFunction).toHaveBeenCalledWith('toUpper', null);
  });

  it('captures the focused argument at mousedown, before the row takes focus', async () => {
    const user = userEvent.setup();
    const onSelectFunction = vi.fn();
    render(
      <>
        <input data-arg="text1" aria-label="text1" />
        <FunctionsNav
          groups={navGroups(initialFunctionsState)} selectedFunction="concat" search=""
          parsedValue={parsedValue} parsedValueExpanded={false}
          onSearchChange={vi.fn()} onToggleGroup={vi.fn()} onToggleParsedValue={vi.fn()}
          onSelectFunction={onSelectFunction} onInsertReference={vi.fn()}
        />
      </>,
    );
    await user.click(screen.getByLabelText('text1'));
    await user.click(screen.getByRole('button', { name: 'toUpper' }));
    expect(onSelectFunction).toHaveBeenCalledWith('toUpper', 'text1');
  });

  it('does not wrap after focus moves from the argument input to search', async () => {
    const user = userEvent.setup();
    const onSelectFunction = vi.fn();
    render(
      <>
        <input data-arg="text1" aria-label="text1" />
        <FunctionsNav
          groups={navGroups(initialFunctionsState)} selectedFunction="concat" search=""
          parsedValue={parsedValue} parsedValueExpanded={false}
          onSearchChange={vi.fn()} onToggleGroup={vi.fn()} onToggleParsedValue={vi.fn()}
          onSelectFunction={onSelectFunction} onInsertReference={vi.fn()}
        />
      </>,
    );
    await user.click(screen.getByLabelText('text1'));
    await user.click(screen.getByLabelText('Search functions'));
    await user.click(screen.getByRole('button', { name: 'toUpper' }));
    expect(onSelectFunction).toHaveBeenCalledWith('toUpper', null);
  });

  it('clears a captured wrap target during drag and writes the function expression', () => {
    const onSelectFunction = vi.fn();
    render(
      <>
        <input data-arg="text1" aria-label="text1" />
        <FunctionsNav
          groups={navGroups(initialFunctionsState)} selectedFunction="concat" search=""
          parsedValue={parsedValue} parsedValueExpanded={false}
          onSearchChange={vi.fn()} onToggleGroup={vi.fn()} onToggleParsedValue={vi.fn()}
          onSelectFunction={onSelectFunction} onInsertReference={vi.fn()}
        />
      </>,
    );
    const row = screen.getByRole('button', { name: 'toUpper' });
    screen.getByLabelText('text1').focus();
    fireEvent.mouseDown(row);
    const setData = vi.fn();
    fireEvent.dragStart(row, { dataTransfer: { setData } });
    fireEvent.click(row);
    expect(setData).toHaveBeenCalledWith('text/plain', 'toUpper()');
    expect(onSelectFunction).toHaveBeenCalledWith('toUpper', null);
  });

  it('uses null wrapping when a function row is picked by keyboard', async () => {
    const user = userEvent.setup();
    const { props } = renderNav();
    const row = screen.getByRole('button', { name: 'toUpper' });
    row.focus();
    await user.keyboard('{Enter}');
    expect(props.onSelectFunction).toHaveBeenCalledWith('toUpper', null);
  });

  it('renders only the groups supplied by the caller', () => {
    const [stringGroup] = navGroups(initialFunctionsState);
    renderNav({ groups: [stringGroup] });
    expect(screen.getByRole('button', { name: 'String 20' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Collection/ })).toBeNull();
  });

  it('makes each function row draggable', () => {
    renderNav();
    expect(screen.getByRole('button', { name: 'concat' })).toHaveAttribute('draggable', 'true');
  });

  it('toggles the Parsed Value group and hides its rows while collapsed', async () => {
    const user = userEvent.setup();
    const onToggleParsedValue = vi.fn();
    const { rerender } = renderNav({ parsedValueExpanded: false, onToggleParsedValue });
    const group = screen.getByRole('button', { name: 'Parsed Value 2' });
    expect(group).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Name' })).toBeNull();
    await user.click(group);
    expect(onToggleParsedValue).toHaveBeenCalledOnce();
    rerender(
      <FunctionsNav
        groups={navGroups(initialFunctionsState)} selectedFunction="concat" search=""
        parsedValue={parsedValue} parsedValueExpanded
        onSearchChange={vi.fn()} onToggleGroup={vi.fn()} onToggleParsedValue={onToggleParsedValue}
        onSelectFunction={vi.fn()} onInsertReference={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Name' })).toBeInTheDocument();
  });
  it('renders Parsed Value rows with their expression as the accessible description', () => {
    renderNav();
    expect(screen.getByRole('button', { name: 'Name' }))
      .toHaveAccessibleDescription("triggerBody()?['Name']");
    expect(screen.getByRole('button', { name: 'tags[0]' }))
      .toHaveAccessibleDescription("triggerBody()?['tags'][0]");
  });

  it('renders the Parsed Value empty message and hidden row count', () => {
    const { rerender } = renderNav({
      parsedValue: { rows: [], hiddenCount: 0, emptyMessage: 'No paths match this search' },
    });
    expect(screen.getByText('No paths match this search')).toBeInTheDocument();
    rerender(
      <FunctionsNav
        groups={navGroups(initialFunctionsState)} selectedFunction="concat" search=""
        parsedValue={{ rows: [parsedValue.rows[0]], hiddenCount: 3, emptyMessage: null }}
        parsedValueExpanded
        onSearchChange={vi.fn()} onToggleGroup={vi.fn()} onToggleParsedValue={vi.fn()}
        onSelectFunction={vi.fn()} onInsertReference={vi.fn()}
      />,
    );
    expect(screen.getByText('+3 more — narrow with search')).toBeInTheDocument();
  });

  it('inserts a Parsed Value reference on double-click and Enter', async () => {
    const user = userEvent.setup();
    const { props } = renderNav();
    const row = screen.getByRole('button', { name: 'Name' });
    await user.dblClick(row);
    expect(props.onInsertReference).toHaveBeenLastCalledWith("triggerBody()?['Name']");
    row.focus();
    await user.keyboard('{Enter}');
    expect(props.onInsertReference).toHaveBeenLastCalledWith("triggerBody()?['Name']");
    expect(props.onInsertReference).toHaveBeenCalledTimes(2);
  });
});