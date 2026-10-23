// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { navGroups, initialFunctionsState } from '../src/workbench/functionsState';
import { FunctionsNav } from '../src/workbench/FunctionsNav';
import { buildParsedValueList, PARSED_VALUE_PLACEHOLDER_ID } from '../src/workbench/parsedValueModel';
import { formatPayloadRoot, type FunctionGroup, type PayloadReferenceRoot } from '@ryanmakes/eb_engine';
import { parsePayload } from '../src/importExport/jsonPayload';
import type { ParsedValueSource } from '../src/workbench/jsonPayloadSession';

function fixture(
  value: unknown,
  root: PayloadReferenceRoot | null,
  id = 'fixture-1',
  label = 'Fixture',
): ParsedValueSource {
  const result = parsePayload(JSON.stringify(value));
  if (!result.ok) throw new Error(result.message);
  return {
    id,
    label,
    rootCaption: formatPayloadRoot(root ?? { kind: 'triggerBody' }),
    parsed: result.payload,
    referenceRoot: root,
  };
}

const triggerBody: PayloadReferenceRoot = { kind: 'triggerBody' };
const stringOpen = { ...initialFunctionsState, expandedGroups: new Set<FunctionGroup>(['String']) };
const parsedValue = buildParsedValueList(
  [fixture({ Name: 'Ada', tags: ['a'] }, triggerBody)], '',
);

function renderNav(overrides: Partial<ComponentProps<typeof FunctionsNav>> = {}) {
  const props: ComponentProps<typeof FunctionsNav> = {
    groups: navGroups(stringOpen),
    selectedFunction: 'concat',
    search: '',
    parsedValue,
    expandedSources: new Set(['fixture-1']),
    onSearchChange: vi.fn(),
    onToggleGroup: vi.fn(),
    onToggleSource: vi.fn(),
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
    const groups = navGroups(stringOpen).map((group) => ({
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
          groups={navGroups(stringOpen)} selectedFunction="concat" search=""
          parsedValue={parsedValue} expandedSources={new Set()}
          onSearchChange={vi.fn()} onToggleGroup={vi.fn()} onToggleSource={vi.fn()}
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
          groups={navGroups(stringOpen)} selectedFunction="concat" search=""
          parsedValue={parsedValue} expandedSources={new Set()}
          onSearchChange={vi.fn()} onToggleGroup={vi.fn()} onToggleSource={vi.fn()}
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
          groups={navGroups(stringOpen)} selectedFunction="concat" search=""
          parsedValue={parsedValue} expandedSources={new Set()}
          onSearchChange={vi.fn()} onToggleGroup={vi.fn()} onToggleSource={vi.fn()}
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
    const [stringGroup] = navGroups(stringOpen);
    renderNav({ groups: [stringGroup] });
    expect(screen.getByRole('button', { name: 'String 20' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Collection/ })).toBeNull();
  });

  it('makes each function row draggable', () => {
    renderNav();
    expect(screen.getByRole('button', { name: 'concat' })).toHaveAttribute('draggable', 'true');
  });

  it('renders each source as a top-level group named after its payload and toggles it', async () => {
    const user = userEvent.setup();
    const onToggleSource = vi.fn();
    const { rerender, props } = renderNav({ expandedSources: new Set(), onToggleSource });
    const group = screen.getByRole('button', { name: 'Fixture 2' });
    expect(group).toHaveAttribute('aria-expanded', 'false');
    expect(group).toHaveAttribute('title', 'triggerBody()');
    expect(screen.queryByRole('button', { name: /^Parsed Value/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Name' })).toBeNull();
    await user.click(group);
    expect(onToggleSource).toHaveBeenCalledWith('fixture-1');
    rerender(<FunctionsNav {...props} expandedSources={new Set(['fixture-1'])} />);
    expect(screen.getByRole('button', { name: 'Name' })).toBeInTheDocument();
  });

  it('shows a Parsed Value placeholder group when nothing is parsed', async () => {
    const user = userEvent.setup();
    const onToggleSource = vi.fn();
    const { rerender, props } = renderNav({
      parsedValue: buildParsedValueList([], ''), expandedSources: new Set(), onToggleSource,
    });
    await user.click(screen.getByRole('button', { name: 'Parsed Value 0' }));
    expect(onToggleSource).toHaveBeenCalledWith(PARSED_VALUE_PLACEHOLDER_ID);
    rerender(<FunctionsNav {...props} expandedSources={new Set([PARSED_VALUE_PLACEHOLDER_ID])} />);
    expect(screen.getByText('Parse a sample in JSON reference')).toBeInTheDocument();
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
      [fixture({ rows: [{ Name: 'Ada', tags: ['a'] }, { Name: 'Grace' }] }, triggerBody)], '',
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
        visibleCount: 0, hiddenCount: 0, emptyMessage: null,
      },
    });
    expect(screen.getByText('No paths match this search')).toBeInTheDocument();
    rerender(
      <FunctionsNav
        groups={navGroups(stringOpen)} selectedFunction="concat" search=""
        parsedValue={(() => {
          const rows = [parsedValue.sources[0].rows[0]];
          const entries = [{ kind: 'row' as const, row: rows[0] }];
          return {
            sources: [{
              id: 'fixture-1', label: 'Fixture', rootCaption: 'triggerBody()',
              matchingCount: rows.length, rows, entries, emptyMessage: null,
            }],
            visibleCount: rows.length, hiddenCount: 3, emptyMessage: null,
          };
        })()}
        expandedSources={new Set(['fixture-1'])}
        onSearchChange={vi.fn()} onToggleGroup={vi.fn()} onToggleSource={vi.fn()}
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

  it('lists several sources as separate top-level groups with their own match counts', async () => {
    const user = userEvent.setup();
    const list = buildParsedValueList([
      fixture({ id: 1, tags: ['a'] }, { kind: 'body', actionName: 'One' }, 'p1', 'One'),
      fixture({ id: 2 }, { kind: 'body', actionName: 'Two' }, 'p2', 'Two'),
    ], '');
    const { props } = renderNav({ parsedValue: list, expandedSources: new Set(['p1', 'p2']) });
    expect(screen.getByRole('button', { name: 'One 2' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Two 1' })).toHaveAttribute('aria-expanded', 'true');
    expect(document.querySelector('details.eb-pv-source')).toBeNull();

    // Equal paths stay separate: each id button inserts its own source's expression.
    const [idOne, idTwo] = screen.getAllByRole('button', { name: 'id' });
    expect(idOne).toHaveAccessibleDescription("One, body('One'). body('One')?['id']");
    await user.dblClick(idOne);
    expect(props.onInsertReference).toHaveBeenLastCalledWith("body('One')?['id']");
    await user.dblClick(idTwo);
    expect(props.onInsertReference).toHaveBeenLastCalledWith("body('Two')?['id']");
  });

  it('keeps array accordions independent between sources with equal item paths', async () => {
    const user = userEvent.setup();
    renderNav({ parsedValue: buildParsedValueList([
      fixture({ rows: [{ a: 1 }] }, { kind: 'body', actionName: 'One' }, 'p1', 'One'),
      fixture({ rows: [{ a: 2 }] }, { kind: 'body', actionName: 'Two' }, 'p2', 'Two'),
    ], ''), expandedSources: new Set(['p1', 'p2']) });
    const items = screen.getAllByText('rows[0]', { selector: 'summary' });
    expect(items).toHaveLength(2);
    await user.click(items[0]);
    expect((items[0].parentElement as HTMLDetailsElement).open).toBe(true);
    expect((items[1].parentElement as HTMLDetailsElement).open).toBe(false);
  });
});