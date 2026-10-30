// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { PayloadTree } from '../src/workbench/PayloadTree';
import {
  initialJsonReferenceState,
  jsonReferenceReducer,
  type JsonReferenceState,
} from '../src/workbench/jsonReferenceState';
import {
  createJsonPayloadSession,
  jsonPayloadSessionReducer,
} from '../src/workbench/jsonPayloadSession';
import { fixtureA1 } from './fixtures/jsonReferenceFixtures';

afterEach(() => cleanup());

function parsedState(text: string): JsonReferenceState {
  return jsonReferenceReducer(
    { ...initialJsonReferenceState, outputFrom: 'trigger', shape: 'body', text },
    { type: 'parse' },
  );
}

function TreeHarness({ text }: { text: string }) {
  const [state, dispatch] = useReducer(jsonReferenceReducer, text, parsedState);
  if (!state.parsed) return <p>{state.error}</p>;
  return (
    <>
      <button type="button">Before</button>
      <h2 id="payload-heading">Payload</h2>
      <PayloadTree
        labelledBy="payload-heading"
        value={state.parsed.value}
        rootLabel="triggerBody()"
        expanded={state.expanded}
        showAll={state.showAll}
        selectedPath={state.selectedPath}
        onSelect={(path) => dispatch({ type: 'select', path })}
        onToggle={(key) => dispatch({ type: 'toggleExpanded', key })}
        onShowAll={(key) => dispatch({ type: 'showAll', key })}
      />
      <output aria-label="Selected path">{JSON.stringify(state.selectedPath)}</output>
    </>
  );
}

const item = (name: RegExp) => screen.getByRole('treeitem', { name });
const selectedPath = () => screen.getByLabelText('Selected path').textContent;

describe('PayloadTree (FR-030 to FR-039)', () => {
  it('is a tree named by the Payload heading, with level, position, size and state on each row', () => {
    render(<TreeHarness text={fixtureA1} />);

    expect(screen.getByRole('tree', { name: 'Payload' })).toBeInTheDocument();
    expect(item(/^triggerBody\(\), object$/)).toHaveAttribute('aria-level', '1');
    expect(item(/^triggerBody\(\), object$/)).toHaveAttribute('aria-expanded', 'true');
    expect(item(/^triggerBody\(\), object$/)).toHaveAttribute('aria-selected', 'true');
    expect(item(/^statusCode, number, 200$/)).toHaveAttribute('aria-level', '2');
    expect(item(/^statusCode, number, 200$/)).toHaveAttribute('aria-posinset', '1');
    expect(item(/^statusCode, number, 200$/)).toHaveAttribute('aria-setsize', '3');
    expect(item(/^statusCode, number, 200$/)).not.toHaveAttribute('aria-expanded');
    expect(item(/^body, object$/)).toHaveAttribute('aria-expanded', 'false');
  });

  it('has one tab stop, on the selected row', async () => {
    const user = userEvent.setup();
    render(<TreeHarness text={fixtureA1} />);

    expect(screen.getAllByRole('treeitem').filter((row) => row.tabIndex === 0)).toEqual([item(/^triggerBody\(\)/)]);
    await user.click(screen.getByRole('button', { name: 'Before' }));
    await user.tab();
    expect(item(/^triggerBody\(\)/)).toHaveFocus();
  });

  it('follows the APG keyboard model', async () => {
    const user = userEvent.setup();
    render(<TreeHarness text={fixtureA1} />);
    await user.click(screen.getByRole('button', { name: 'Before' }));
    await user.tab();

    await user.keyboard('{End}');
    expect(item(/^body, object$/)).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(item(/^body, object$/)).toHaveAttribute('aria-expanded', 'true');
    expect(item(/^body, object$/)).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(item(/^value, array$/)).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(item(/^body, object$/)).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(item(/^body, object$/)).toHaveAttribute('aria-expanded', 'false');
    await user.keyboard('{ArrowUp}');
    expect(item(/^headers, object$/)).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(selectedPath()).toBe('["headers"]');
    await user.keyboard('{ArrowUp}{ }');
    expect(selectedPath()).toBe('["statusCode"]');
    await user.keyboard('{Home}');
    expect(item(/^triggerBody\(\)/)).toHaveFocus();
  });

  it('toggles from the chevron without selecting, and selects and toggles from the rest of the row (FR-034)', async () => {
    const user = userEvent.setup();
    const { container } = render(<TreeHarness text={fixtureA1} />);
    const bodyChevron = item(/^body, object$/).querySelector('[data-chevron]') as Element;

    await user.click(bodyChevron);
    expect(item(/^body, object$/)).toHaveAttribute('aria-expanded', 'true');
    expect(selectedPath()).toBe('[]');

    await user.click(item(/^value, array$/));
    expect(selectedPath()).toBe('["body","value"]');
    expect(item(/^value, array$/)).toHaveAttribute('aria-selected', 'true');
    expect(item(/^value, array$/)).toHaveAttribute('aria-expanded', 'true');
    expect(container.querySelectorAll('[aria-selected="true"]')).toHaveLength(1);

    await user.click(item(/^value, array$/));
    expect(item(/^value, array$/)).toHaveAttribute('aria-expanded', 'false');
    expect(selectedPath()).toBe('["body","value"]');
  });

  it('keeps the selection when an ancestor collapses, and focuses the collapsed row', async () => {
    const user = userEvent.setup();
    render(<TreeHarness text={fixtureA1} />);

    await user.click(item(/^body, object$/).querySelector('[data-chevron]') as Element);
    await user.click(item(/^value, array$/));
    await user.click(item(/^body, object$/).querySelector('[data-chevron]') as Element);

    expect(selectedPath()).toBe('["body","value"]');
    expect(item(/^body, object$/)).toHaveFocus();
    expect(item(/^body, object$/)).toHaveAttribute('tabindex', '0');
  });

  it('pages arrays after 20 elements and reveals the rest from "Show N more" (FR-035)', async () => {
    const user = userEvent.setup();
    render(<TreeHarness text={JSON.stringify(Array.from({ length: 25 }, (_, index) => index))} />);

    expect(screen.getAllByRole('treeitem')).toHaveLength(1 + 20 + 1);
    const more = screen.getByRole('treeitem', { name: 'Show 5 more' });
    expect(more).toHaveAttribute('aria-setsize', '21');

    more.focus();
    await user.keyboard('{Enter}');

    expect(screen.getAllByRole('treeitem')).toHaveLength(1 + 25);
    expect(item(/^\[20\], number, 20$/)).toHaveFocus();
  });

  it('marks every row selectable: root, containers, empty containers and nulls (FR-033)', async () => {
    const user = userEvent.setup();
    render(<TreeHarness text='{"list": [], "map": {}, "none": null}' />);

    for (const [name, path] of [
      [/^list, array, 0 items$/, '["list"]'],
      [/^map, object, \{0\}$/, '["map"]'],
      [/^none, null, null$/, '["none"]'],
      [/^triggerBody\(\), object$/, '[]'],
    ] as const) {
      await user.click(item(name));
      expect(selectedPath()).toBe(path);
    }
  });

  it('renders sample content as text only (FR-038)', () => {
    const { container } = render(
      <TreeHarness text='{"html": "<img src=x onerror=alert(1)>", "link": "https://contoso.com"}' />,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
    expect(screen.getByText('"<img src=x onerror=alert(1)>"')).toBeInTheDocument();
  });

  it('lists built-in object names like any other key (FR-037)', () => {
    render(<TreeHarness text='{"__proto__": 1, "constructor": 2, "hasOwnProperty": 3}' />);

    expect(screen.getAllByRole('treeitem').slice(1).map((row) => row.getAttribute('aria-label'))).toEqual([
      '__proto__, number, 1',
      'constructor, number, 2',
      'hasOwnProperty, number, 3',
    ]);
  });

  it('focuses and selects a revealed row past the array page, once per sequence', () => {
    const initial = createJsonPayloadSession();
    const pasted = jsonPayloadSessionReducer(initial, {
      type: 'edit',
      payloadId: initial.activeId,
      action: {
        type: 'pasteAndParse',
        defaultActionName: 'Action',
        text: JSON.stringify(Array.from({ length: 30 }, (_, index) => index)),
      },
    });
    const parsed = pasted.payloads[0].state.parsed!;
    const session = jsonPayloadSessionReducer(pasted, {
      type: 'reveal',
      match: {
        payloadId: initial.activeId,
        parsed,
        path: [24],
        payloadLabel: 'Payload 1',
        pathLabel: '[24]',
        preview: '24',
      },
    });
    const state = session.payloads[0].state;
    const tree = (reveal: typeof session.reveal) => (
      <>
        <button type="button">Elsewhere</button>
        <h2 id="payload-heading">Payload</h2>
        <PayloadTree
          labelledBy="payload-heading"
          value={parsed.value}
          rootLabel="triggerBody()"
          expanded={state.expanded}
          showAll={state.showAll}
          selectedPath={state.selectedPath}
          onSelect={() => undefined}
          onToggle={() => undefined}
          onShowAll={() => undefined}
          reveal={reveal}
        />
      </>
    );
    const view = render(tree(null));
    const row = () => item(/^\[24\], number, 24$/);
    expect(row()).toHaveAttribute('aria-selected', 'true');
    expect(row()).not.toHaveFocus();

    view.rerender(tree(session.reveal));
    expect(row()).toHaveFocus();

    screen.getByRole('button', { name: 'Elsewhere' }).focus();
    view.rerender(tree(session.reveal));
    expect(row()).not.toHaveFocus();
  });
});
