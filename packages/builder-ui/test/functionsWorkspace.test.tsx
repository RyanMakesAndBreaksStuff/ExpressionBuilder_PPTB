// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PayloadReferenceRoot } from '@ryanmakes/eb_engine';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

const sample = { Name: 'Ada' };
const referenceRoot: PayloadReferenceRoot = { kind: 'triggerBody' };

describe('FunctionsWorkspace', () => {
  it('starts on concat, validates typed arguments, and shows the expression', async () => {
    const user = userEvent.setup();
    render(<FunctionsWorkspace adapter={createAdapter()} sample={null} referenceRoot={null} />);

    expect(screen.getByRole('button', { name: 'String 20' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'concat' })).toHaveAttribute('aria-current', 'true');
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
      <FunctionsWorkspace
        adapter={createAdapter()}
        sample={sample}
        referenceRoot={referenceRoot}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Parsed Value 1' }));

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
      sample={{ body: { value: [{ Name: 'Ada' }, { Name: 'Grace' }] } }}
      referenceRoot={referenceRoot}
    />);
    await user.click(screen.getByRole('button', { name: 'Parsed Value 2' }));
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

  it('wraps the focused argument repeatedly, while searching selects without wrapping', async () => {
    const user = userEvent.setup();
    render(<FunctionsWorkspace adapter={createAdapter()} sample={null} referenceRoot={null} />);
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
    render(<FunctionsWorkspace adapter={adapter} sample={null} referenceRoot={null} />);
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
    render(<FunctionsWorkspace adapter={adapter} sample={null} referenceRoot={null} />);
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
      <FunctionsWorkspace adapter={adapter} sample={null} referenceRoot={null} />
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
});
