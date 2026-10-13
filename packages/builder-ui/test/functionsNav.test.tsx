// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { navGroups, initialFunctionsState } from '../src/workbench/functionsState';
import { FunctionsNav } from '../src/workbench/FunctionsNav';
import { buildParsedValueList } from '../src/workbench/parsedValueModel';
import type { ParsedValueSource } from '../src/workbench/jsonPayloadSession';
import { parsePayload } from '../src/importExport/jsonPayload';
import { formatPayloadRoot, type PayloadReferenceRoot } from '@ryanmakes/eb_engine';

function fixture(value: unknown, root: PayloadReferenceRoot): ParsedValueSource[] {
  const result = parsePayload(JSON.stringify(value));
  if (!result.ok) throw new Error(result.message);
  return [{
    id: 'fixture-1',
    label: 'Fixture',
    rootCaption: formatPayloadRoot(root),
    parsed: result.payload,
    referenceRoot: root,
  }];
}

const parsedValue = buildParsedValueList(
  fixture({ Name: 'Ada', tags: ['a'] }, { kind: 'triggerBody' }), '',
);
const parsedRows = parsedValue.sources[0].rows;

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
  it('renders Parsed Value rows with their expression as the accessible description', async () => {
    const user = userEvent.setup();
    renderNav();
    expect(screen.getByRole('button', { name: 'Name' }))
      .toHaveAccessibleDescription("triggerBody()?['Name']");
    const summary = screen.getByText('tags[0]', { selector: 'summary' });
    await user.click(summary);
    const leaf = summary.parentElement!.querySelector<HTMLButtonElement>('.eb-pv-row')!;
    expect(leaf).toHaveAccessibleDescription("triggerBody()?['tags'][0]");
  });

  it('starts every item closed and toggles sibling and nested items independently', async () => {
    const user = userEvent.setup();
    renderNav({ parsedValue: buildParsedValueList(
      fixture({ rows: [{ Name: 'Ada', tags: ['a'] }, { Name: 'Grace' }] }, { kind: 'triggerBody' }), '',
    ) });
    const first = screen.getByText('rows[0]', { selector: 'summary' });
    const second = screen.getByText('rows[1]', { selector: 'summary' });
    const firstDetails = first.parentElement as HTMLDetailsElement;
    const secondDetails = second.parentElement as HTMLDetailsElement;
    const nested = firstDetails.querySelector<HTMLDetailsElement>('details')!;
    expect(firstDetails.open).toBe(false);
    expect(secondDetails.open).toBe(false);
    expect(nested.open).toBe(false);
    await user.click(first);
    expect(firstDetails.open).toBe(true);
    expect(secondDetails.open).toBe(false);
    expect(nested.open).toBe(false);
    await user.click(nested.querySelector('summary')!);
    expect(nested.open).toBe(true);
    expect(firstDetails.open).toBe(true);
    await user.click(first);
    expect(firstDetails.open).toBe(false);
    expect(secondDetails.open).toBe(false);
  });

  it('renders the Parsed Value empty message and hidden row count', () => {
    const { rerender } = renderNav({
      parsedValue: {
        sources: [{
          id: 'fixture-1', label: 'Fixture', rootCaption: 'triggerBody()', matchingCount: 0,
          rows: [], entries: [], emptyMessage: 'No paths match this search',
        }],
        visibleCount: 0,
        hiddenCount: 0,
        emptyMessage: null,
      },
    });
    expect(screen.getByText('No paths match this search')).toBeInTheDocument();
    rerender(
      <FunctionsNav
        groups={navGroups(initialFunctionsState)} selectedFunction="concat" search=""
        parsedValue={{
          sources: [{
            id: 'fixture-1', label: 'Fixture', rootCaption: 'triggerBody()', matchingCount: 1,
            rows: [parsedRows[0]], entries: [{ kind: 'row', row: parsedRows[0] }], emptyMessage: null,
          }],
          visibleCount: 1,
          hiddenCount: 3,
          emptyMessage: null,
        }}
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

  it('groups equal paths by source, inserts each source expression and keeps accordions independent', async () => {
    const user = userEvent.setup();
    const sources = [
      ...fixture({ Name: 'Ada' }, { kind: 'body', actionName: 'First' }),
      ...fixture({ Name: 'Grace' }, { kind: 'body', actionName: 'Second' }),
    ].map((item, index) => ({ ...item, id: 'p' + index, label: 'Payload ' + (index + 1) }));
    const { props } = renderNav({ parsedValue: buildParsedValueList(sources, '') });
    const groups = screen.getAllByText(/^Payload \d · /, { selector: 'summary' });
    expect(groups).toHaveLength(2);
    const [first, second] = groups.map((summary) => summary.parentElement as HTMLDetailsElement);
    expect(first.open).toBe(false);
    expect(second.open).toBe(false);
    await user.click(groups[0]);
    expect(first.open).toBe(true);
    expect(second.open).toBe(false);
    await user.click(groups[1]);

    const [one, two] = screen.getAllByRole('button', { name: 'Name' });
    expect(one).toHaveAccessibleDescription("Payload 1, body('First'). body('First')?['Name']");
    await user.dblClick(one);
    expect(props.onInsertReference).toHaveBeenLastCalledWith("body('First')?['Name']");
    await user.dblClick(two);
    expect(props.onInsertReference).toHaveBeenLastCalledWith("body('Second')?['Name']");
  });
});
