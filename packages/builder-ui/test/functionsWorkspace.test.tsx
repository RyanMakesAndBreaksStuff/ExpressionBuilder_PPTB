// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PayloadReferenceRoot } from '@ryanmakes/eb_engine';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatPayloadRoot } from '@ryanmakes/eb_engine';
import { parsePayload } from '../src/importExport/jsonPayload';
import type { ParsedValueSource } from '../src/workbench/jsonPayloadSession';
import { FunctionsWorkspace } from '../src/workbench/FunctionsWorkspace';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function createAdapter(): PlatformAdapter {
  return {
    copyToClipboard: vi.fn(async () => undefined),
    notify: vi.fn(async () => undefined),
    getTheme: vi.fn(async () => 'dark' as const),
    onThemeChanged: vi.fn(() => () => undefined),
    settings: {
      get: vi.fn(async () => null),
      set: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    },
    getDataverseFields: vi.fn(async () => []),
  };
}

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

const referenceRoot: PayloadReferenceRoot = { kind: 'triggerBody' };
const sources = [fixture({ Name: 'Ada' }, referenceRoot)];

describe('FunctionsWorkspace', () => {
  it('starts on concat, validates typed arguments, and shows the expression', async () => {
    const user = userEvent.setup();
    render(<FunctionsWorkspace adapter={createAdapter()} sources={[]} />);

    expect(screen.getByRole('button', { name: 'String 20' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'concat' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Arguments concat' })).toBeInTheDocument();
    expect(screen.getByLabelText('text1')).toBeInTheDocument();
    expect(screen.getByLabelText('text2')).toBeInTheDocument();
    expect(screen.getByLabelText('text3')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Status' })).toHaveTextContent('Invalid');

    fireEvent.change(screen.getByLabelText('text1'), { target: { value: "triggerBody()?['Name']" } });
    await user.type(screen.getByLabelText('text2'), "' - '");
    expect(screen.getByRole('region', { name: 'Status' })).toHaveTextContent('Valid');
    expect(screen.getByLabelText('Generated expression')).toHaveTextContent(
      "concat(triggerBody()?['Name'], ' - ')"
    );
  });

  it('inserts Parsed Value into the focused argument and returns focus after double-click or Enter', async () => {
    const user = userEvent.setup();
    render(
      <FunctionsWorkspace adapter={createAdapter()} sources={sources} />
    );
    await user.click(screen.getByRole('button', { name: 'Fixture 1' }));

    const text2 = screen.getByLabelText('text2');
    await user.click(text2);
    await user.dblClick(screen.getByRole('button', { name: 'Name' }));
    expect(text2).toHaveValue("triggerBody()?['Name']");
    expect(text2).toHaveFocus();

    await user.clear(text2);
    await user.click(screen.getByRole('button', { name: 'Name' }));
    await user.keyboard('{Enter}');
    expect(text2).toHaveValue("triggerBody()?['Name']");
    expect(text2).toHaveFocus();
  });

  it('inserts an expanded array leaf and returns focus for both activation paths', async () => {
    const user = userEvent.setup();
    render(<FunctionsWorkspace
      adapter={createAdapter()}
      sources={[fixture({ body: { value: [{ Name: 'Ada' }, { Name: 'Grace' }] } }, referenceRoot)]}
    />);
    await user.click(screen.getByRole('button', { name: 'Fixture 2' }));
    const first = screen.getByText('body.value[0]', { selector: 'summary' });
    const second = screen.getByText('body.value[1]', { selector: 'summary' });
    expect((first.parentElement as HTMLDetailsElement).open).toBe(false);
    expect((second.parentElement as HTMLDetailsElement).open).toBe(false);
    await user.click(first);
    expect((second.parentElement as HTMLDetailsElement).open).toBe(false);

    const text2 = screen.getByLabelText('text2');
    const leaf = screen.getByRole('button', { name: 'body.value[0].Name', exact: true });
    const expression = "triggerBody()?['body']?['value'][0]?['Name']";
    await user.click(text2);
    await user.dblClick(leaf);
    expect(text2).toHaveValue(expression);
    expect(text2).toHaveFocus();
    await user.clear(text2);
    await user.click(leaf);
    await user.keyboard('{Enter}');
    expect(text2).toHaveValue(expression);
    expect(text2).toHaveFocus();
  });

  describe('Alt+ArrowDown from an argument', () => {
    it('expands the first source group, focuses its first reference and inserts into the held argument', async () => {
      const user = userEvent.setup();
      render(<FunctionsWorkspace adapter={createAdapter()} sources={sources} />);
      const toggle = screen.getByRole('button', { name: 'Fixture 1' });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      const text1 = screen.getByLabelText('text1');
      const text2 = screen.getByLabelText('text2');
      expect(text2).toHaveAttribute('aria-keyshortcuts', 'Alt+ArrowDown');
      expect(text2).toHaveAccessibleDescription(/Alt\+Down to pick a parsed value/);

      await user.click(text2);
      await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('button', { name: 'Name' })).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(text2).toHaveValue("triggerBody()?['Name']");
      expect(text1).toHaveValue('');
      expect(text2).toHaveFocus();

      // Already expanded: focuses the reference straight away.
      await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
      expect(screen.getByRole('button', { name: 'Name' })).toHaveFocus();
    });

    it('focuses the Parsed Value toggle when there is nothing to insert', async () => {
      const user = userEvent.setup();
      render(<FunctionsWorkspace adapter={createAdapter()} sources={[]} />);
      await user.click(screen.getByLabelText('text2'));
      await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
      const toggle = screen.getByRole('button', { name: 'Parsed Value 0' });
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(toggle).toHaveFocus();
    });

    it('opens only the first source group and focuses its first reference', async () => {
      const user = userEvent.setup();
      const two = [...sources, { ...sources[0], id: 'fixture-2', label: 'Other' }];
      render(<FunctionsWorkspace adapter={createAdapter()} sources={two} />);
      await user.click(screen.getByLabelText('text2'));
      await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
      expect(screen.getByRole('button', { name: 'Fixture 1' })).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('button', { name: 'Other 1' })).toHaveAttribute('aria-expanded', 'false');
      expect(screen.getByRole('button', { name: 'Name' })).toHaveFocus();
    });

    it('leaves plain ArrowDown alone', async () => {
      const user = userEvent.setup();
      render(<FunctionsWorkspace adapter={createAdapter()} sources={sources} />);
      const text2 = screen.getByLabelText('text2');
      await user.click(text2);
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('button', { name: 'Fixture 1' })).toHaveAttribute('aria-expanded', 'false');
      expect(text2).toHaveFocus();
    });
  });

  it('wraps the focused argument repeatedly, while searching selects without wrapping', async () => {
    const user = userEvent.setup();
    render(<FunctionsWorkspace adapter={createAdapter()} sources={[]} />);
    await user.click(screen.getByRole('button', { name: 'String 20' }));
    const text1 = screen.getByLabelText('text1');
    fireEvent.change(text1, { target: { value: "triggerBody()?['Name']" } });
    await user.click(text1);
    await user.click(screen.getByRole('button', { name: 'toUpper' }));
    expect(text1).toHaveValue("toUpper(triggerBody()?['Name'])");
    expect(text1).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'trim' }));
    expect(text1).toHaveValue("trim(toUpper(triggerBody()?['Name']))");
    expect(text1).toHaveFocus();

    const search = screen.getByRole('searchbox', { name: 'Search functions' });
    await user.click(search);
    await user.type(search, 'toUpper');
    await user.click(screen.getByRole('button', { name: 'toUpper' }));
    expect(screen.getByRole('button', { name: 'toUpper' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('heading', { name: 'Arguments toUpper' })).toBeInTheDocument();
    expect(screen.getByLabelText('text')).toHaveValue('');
  });

  it('copies bare and wrapped expressions', async () => {
    const user = userEvent.setup();
    const adapter = createAdapter();
    render(<FunctionsWorkspace adapter={adapter} sources={[]} />);
    fireEvent.change(screen.getByLabelText('text1'), { target: { value: "triggerBody()?['Name']" } });
    await user.type(screen.getByLabelText('text2'), "' - '");

    await user.click(screen.getByRole('button', { name: 'Copy expression' }));
    expect(adapter.copyToClipboard).toHaveBeenLastCalledWith("concat(triggerBody()?['Name'], ' - ')");
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copy as @{…}' }));
    expect(adapter.copyToClipboard).toHaveBeenLastCalledWith("@{concat(triggerBody()?['Name'], ' - ')}");
  });

  it('reports clipboard failures without changing the copy label', async () => {
    const user = userEvent.setup();
    const adapter = createAdapter();
    vi.mocked(adapter.copyToClipboard).mockRejectedValue(new Error('denied'));
    render(<FunctionsWorkspace adapter={adapter} sources={[]} />);
    fireEvent.change(screen.getByLabelText('text1'), { target: { value: "triggerBody()?['Name']" } });
    await user.type(screen.getByLabelText('text2'), "' - '");

    await user.click(screen.getByRole('button', { name: 'Copy expression' }));
    expect(adapter.notify).toHaveBeenCalledWith(expect.stringContaining('Could not copy'), 'error');
    expect(screen.getByRole('button', { name: 'Copy expression' })).toBeInTheDocument();
  });

  it('resets the copied label 1500ms after the latest copy and clears its timer on unmount', async () => {
    vi.useFakeTimers();
    const adapter = createAdapter();
    const { unmount } = render(
      <FunctionsWorkspace adapter={adapter} sources={[]} />
    );
    fireEvent.change(screen.getByLabelText('text1'), { target: { value: "triggerBody()?['Name']" } });
    fireEvent.change(screen.getByLabelText('text2'), { target: { value: "' - '" } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy expression' }));
    });
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(1000); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copied' })); });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(500); });
    expect(screen.getByRole('button', { name: 'Copy expression' })).toBeInTheDocument();

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy expression' })); });
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('inserts each own source expression for equal paths and keeps arguments after sources change', async () => {
    const user = userEvent.setup();
    const one = fixture({ rows: [{ id: 1 }] }, { kind: 'body', actionName: 'One' }, 'p1', 'One');
    const two = fixture({ rows: [{ id: 2 }] }, { kind: 'body', actionName: 'Two' }, 'p2', 'Two');
    const { rerender } = render(<FunctionsWorkspace adapter={createAdapter()} sources={[one, two]} />);
    await user.click(screen.getByRole('button', { name: 'One 1' }));
    await user.click(screen.getByRole('button', { name: 'Two 1' }));
    const items = screen.getAllByText('rows[0]', { selector: 'summary' });
    await user.click(items[0]);
    await user.click(items[1]);
    expect((items[0].parentElement as HTMLDetailsElement).open).toBe(true);
    expect((items[1].parentElement as HTMLDetailsElement).open).toBe(true);

    const [idOne, idTwo] = screen.getAllByRole('button', { name: 'rows[0].id', exact: true });
    const text1 = screen.getByLabelText('text1');
    const text2 = screen.getByLabelText('text2');
    await user.click(text1);
    await user.dblClick(idOne);
    expect(text1).toHaveValue("body('One')?['rows'][0]?['id']");
    await user.click(text2);
    await user.dblClick(idTwo);
    expect(text2).toHaveValue("body('Two')?['rows'][0]?['id']");

    rerender(<FunctionsWorkspace adapter={createAdapter()} sources={[two]} />);
    expect(text1).toHaveValue("body('One')?['rows'][0]?['id']");
    expect(text2).toHaveValue("body('Two')?['rows'][0]?['id']");
  });

  it('shows the missing-name message inside that source\'s own group', async () => {
    const user = userEvent.setup();
    const unnamed: ParsedValueSource = { ...fixture({ a: 1 }, null, 'p1', 'Payload 1'), referenceRoot: null };
    render(<FunctionsWorkspace
      adapter={createAdapter()}
      sources={[unnamed, fixture({ b: 1 }, { kind: 'body', actionName: 'Two' }, 'p2', 'Two')]}
    />);
    expect(screen.getByRole('button', { name: 'Two 1' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Payload 1 0' }));
    expect(screen.getByText('Set an action name in JSON reference')).toBeInTheDocument();
  });

  it('shows Conversion after the existing groups and supports keyboard operation', async () => {
    const user = userEvent.setup();
    render(<FunctionsWorkspace adapter={createAdapter()} sources={[]} />);
    const nav = within(screen.getByRole('navigation', { name: 'Functions' }));
    const groups = nav.getAllByRole('button', {
      name: /^(String|Collection|Logical|Math|Date and time|Conversion) \d+$/,
    });
    expect(groups.map((button) => button.getAttribute('aria-label')))
      .toEqual(['String 20', 'Collection 14', 'Logical 12', 'Math 10', 'Date and time 23', 'Conversion 24']);
    expect(groups.every((button) => button.getAttribute('aria-expanded') === 'false')).toBe(true);
    expect(screen.getByRole('heading', { name: 'Arguments concat' })).toBeInTheDocument();
    const conversion = nav.getByRole('button', { name: 'Conversion 24' });
    conversion.focus();
    await user.keyboard('{Enter}');
    expect(conversion).toHaveAttribute('aria-expanded', 'true');
    await user.tab();
    expect(nav.getByRole('button', { name: 'array', exact: true })).toHaveFocus();
    const int = nav.getByRole('button', { name: 'int', exact: true });
    int.focus();
    await user.keyboard(' ');
    expect(int).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('heading', { name: 'Arguments int' })).toBeInTheDocument();
    expect(screen.getByLabelText('value')).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText('value')).toHaveAccessibleDescription(/STRING/);
    expect(nav.queryByRole('button', { name: 'decodeBase64', exact: true })).toBeNull();
    expect(nav.queryByRole('button', { name: 'parse', exact: true })).toBeNull();
    conversion.focus();
    await user.keyboard('{Enter}');
    expect(conversion).toHaveAttribute('aria-expanded', 'false');
    expect(nav.queryByRole('button', { name: 'int', exact: true })).toBeNull();
  });

  it('builds and copies int with a payload reference', async () => {
    const user = userEvent.setup();
    const adapter = createAdapter();
    render(<FunctionsWorkspace adapter={adapter} sources={[]} />);
    await user.click(screen.getByRole('button', { name: 'Conversion 24' }));
    await user.click(screen.getByRole('button', { name: 'int', exact: true }));
    const status = screen.getByRole('region', { name: 'Status' });
    expect(status).toHaveTextContent('Invalid');
    expect(screen.getByRole('button', { name: 'Copy expression', exact: true })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Copy as @{…}' })).toBeDisabled();
    const value = screen.getByLabelText('value');
    fireEvent.change(value, { target: { value: "triggerBody()?['Qty']" } });
    expect(status).toHaveTextContent('Valid');
    expect(status).not.toHaveTextContent('Invalid');
    expect(status).toHaveTextContent('1 of 1 required set');
    expect(screen.getByLabelText('Generated expression')).toHaveTextContent("int(triggerBody()?['Qty'])");
    await user.click(screen.getByRole('button', { name: 'Copy expression', exact: true }));
    expect(adapter.copyToClipboard).toHaveBeenLastCalledWith("int(triggerBody()?['Qty'])");
    await user.click(screen.getByRole('button', { name: 'Copy as @{…}' }));
    expect(adapter.copyToClipboard).toHaveBeenLastCalledWith("@{int(triggerBody()?['Qty'])}");
    fireEvent.change(value, { target: { value: '' } });
    expect(status).toHaveTextContent('Invalid');
    expect(screen.getByRole('button', { name: 'Copy expression', exact: true })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Copy as @{…}' })).toBeDisabled();
  });

  it('omits an empty float locale and includes a filled locale', async () => {
    const user = userEvent.setup();
    render(<FunctionsWorkspace adapter={createAdapter()} sources={[]} />);
    await user.click(screen.getByRole('button', { name: 'Conversion 24' }));
    await user.click(screen.getByRole('button', { name: 'float', exact: true }));
    const value = screen.getByLabelText('value');
    const locale = screen.getByLabelText('locale');
    expect(value).toHaveAttribute('aria-required', 'true');
    expect(locale).toHaveAttribute('aria-required', 'false');
    fireEvent.change(value, { target: { value: "'1.5'" } });
    const status = screen.getByRole('region', { name: 'Status' });
    expect(status).not.toHaveTextContent('Invalid');
    expect(status).toHaveTextContent('1 of 1 required set');
    expect(screen.getByLabelText('Generated expression')).toHaveTextContent("float('1.5')");
    fireEvent.change(locale, { target: { value: "'en-US'" } });
    expect(screen.getByLabelText('Generated expression')).toHaveTextContent("float('1.5', 'en-US')");
    expect(status).not.toHaveTextContent('Invalid');
  });

  it('requires two createArray values and extends the repeating tail', async () => {
    const user = userEvent.setup();
    render(<FunctionsWorkspace adapter={createAdapter()} sources={[]} />);
    await user.click(screen.getByRole('button', { name: 'Conversion 24' }));
    await user.click(screen.getByRole('button', { name: 'createArray', exact: true }));
    fireEvent.change(screen.getByLabelText('object1'), { target: { value: "'a'" } });
    const status = screen.getByRole('region', { name: 'Status' });
    expect(status).toHaveTextContent('Invalid');
    expect(status).toHaveTextContent('object2 is required.');
    expect(screen.getByRole('button', { name: 'Copy expression', exact: true })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('object2'), { target: { value: "'b'" } });
    expect(status).not.toHaveTextContent('Invalid');
    expect(status).toHaveTextContent('2 of 2 required set');
    expect(screen.getByLabelText('Generated expression')).toHaveTextContent("createArray('a', 'b')");
    expect(screen.getByLabelText('object3')).toHaveValue('');
    expect(screen.getByLabelText('object3')).toHaveAttribute('aria-required', 'false');
    fireEvent.change(screen.getByLabelText('object3'), { target: { value: "'c'" } });
    expect(screen.getByLabelText('object4')).toHaveValue('');
    expect(screen.getByLabelText('object4')).toHaveAttribute('aria-required', 'false');
    expect(screen.getByLabelText('Generated expression')).toHaveTextContent("createArray('a', 'b', 'c')");
    expect(status).toHaveTextContent('2 of 2 required set');
  });

  it('validates nested conversions and keeps existing errors', async () => {
    const user = userEvent.setup();
    render(<FunctionsWorkspace adapter={createAdapter()} sources={[]} />);
    await user.click(screen.getByRole('button', { name: 'Math 10' }));
    await user.click(screen.getByRole('button', { name: 'add', exact: true }));
    const first = screen.getByLabelText('summand1');
    fireEvent.change(screen.getByLabelText('summand2'), { target: { value: '1' } });
    for (const expression of ["int(triggerBody()?['Qty'])", 'string(item())', "json(body('Get_item'))", 'bool(1)']) {
      fireEvent.change(first, { target: { value: expression } });
      const status = screen.getByRole('region', { name: 'Status' });
      expect(status, expression).not.toHaveTextContent('Invalid');
      expect(status).toHaveTextContent('2 of 2 required set');
      expect(screen.getByLabelText('Generated expression')).toHaveTextContent(`add(${expression}, 1)`);
    }
    for (const [expression, message] of [
      ["int('1', '2')", 'int takes at most 1 argument.'],
      ["createArray('a')", 'createArray needs at least 2 arguments.'],
      ["decodeBase64('aGk=')", '"decodeBase64" is not a known function.'],
      ["parse('{}')", '"parse" is not a known function.'],
    ]) {
      fireEvent.change(first, { target: { value: expression } });
      expect(screen.getByRole('region', { name: 'Status' })).toHaveTextContent(`summand1: ${message}`);
      expect(screen.getByRole('button', { name: 'Copy expression', exact: true })).toBeDisabled();
    }
  });
});
