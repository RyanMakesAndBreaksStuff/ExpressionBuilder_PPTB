// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JsonReferenceWorkspace } from '../src/workbench/JsonReferenceWorkspace';
import { composeSample, fixtureA1, triggerBodySample, triggerFullSample } from './fixtures/jsonReferenceFixtures';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function createAdapter(copy: PlatformAdapter['copyToClipboard'] = vi.fn(async () => undefined)): PlatformAdapter {
  return {
    copyToClipboard: vi.fn(copy),
    notify: vi.fn(async () => undefined),
    getTheme: vi.fn(async () => 'light' as const),
    onThemeChanged: vi.fn(() => () => undefined),
    settings: {
      get: vi.fn(async () => null),
      set: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    },
    getDataverseFields: vi.fn(async () => []),
  };
}

const EMAIL_REFERENCE = "outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']";

const row = (name: RegExp) => screen.getByRole('treeitem', { name });
const expression = () => screen.getByLabelText('Reference expression');
const copyStatus = () => screen.getAllByRole('status')[1];

async function pasteAndParse(user: UserEvent, sample: string, actionName?: string) {
  if (actionName !== undefined) await user.type(screen.getByLabelText('Action name'), actionName);
  await user.click(screen.getByLabelText('Sample JSON'));
  await user.paste(sample);
  await user.click(screen.getByRole('button', { name: 'Parse' }));
}

async function expand(user: UserEvent, name: RegExp) {
  await user.click(row(name).querySelector('[data-chevron]') as Element);
}

async function selectEmail(user: UserEvent) {
  await expand(user, /^body, object$/);
  await expand(user, /^value, array$/);
  await expand(user, /^\[0\], object$/);
  await expand(user, /^Requester, object$/);
  await user.click(row(/^Email, string/));
}

describe('JSON reference workspace', () => {
  it('builds, shows and copies the reference to Email (user story 1, scenarios 1 and 2)', async () => {
    const user = userEvent.setup();
    const adapter = createAdapter();
    render(<JsonReferenceWorkspace adapter={adapter} active />);

    await pasteAndParse(user, fixtureA1, 'Get items');
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Parsed · 25 values');
    expect(screen.getByText('25 values')).toBeInTheDocument();

    await selectEmail(user);
    expect(expression()).toHaveTextContent(EMAIL_REFERENCE);
    expect(screen.getByRole('navigation', { name: 'Selected path' })).toHaveTextContent(
      "outputs('Get_items')›body›value›[0]›Requester›Email",
    );
    expect(screen.getByText('string · "dana@contoso.com"')).toBeInTheDocument();
    expect(screen.getByText('Fixed position [0]: reads that item only, not each item in a loop.')).toBeInTheDocument();
    expect(copyStatus()).toHaveTextContent('Paste into the expression editor');

    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(adapter.copyToClipboard).toHaveBeenCalledWith(EMAIL_REFERENCE);
    expect(copyStatus()).toHaveTextContent('Expression copied');
  });

  it('shows "Expression copied" for 1.2 s and restarts the timer on a second copy (FR-053)', async () => {
    const user = userEvent.setup();
    render(<JsonReferenceWorkspace adapter={createAdapter()} active />);
    await pasteAndParse(user, fixtureA1, 'Get items');
    vi.useFakeTimers();
    const copy = screen.getByRole('button', { name: 'Copy' });

    await act(async () => fireEvent.click(copy));
    await act(async () => vi.advanceTimersByTime(1_000));
    await act(async () => fireEvent.click(copy));
    await act(async () => vi.advanceTimersByTime(1_000));
    expect(copyStatus()).toHaveTextContent('Expression copied');
    await act(async () => vi.advanceTimersByTime(200));
    expect(copyStatus()).toHaveTextContent('Paste into the expression editor');
  });

  it('clears the timer on unmount and drops "Expression copied" when the builder is left (FR-053)', async () => {
    const user = userEvent.setup();
    const adapter = createAdapter();
    const { rerender, unmount } = render(<JsonReferenceWorkspace adapter={adapter} active />);
    await pasteAndParse(user, fixtureA1, 'Get items');
    vi.useFakeTimers();
    const copy = screen.getByRole('button', { name: 'Copy' });

    await act(async () => fireEvent.click(copy));
    rerender(<JsonReferenceWorkspace adapter={adapter} active={false} />);
    rerender(<JsonReferenceWorkspace adapter={adapter} active />);
    expect(copyStatus()).toHaveTextContent('Paste into the expression editor');

    await act(async () => fireEvent.click(copy));
    expect(copyStatus()).toHaveTextContent('Expression copied');
    const pendingTimers = vi.getTimerCount();
    unmount();
    expect(vi.getTimerCount()).toBe(pendingTimers - 1);
  });

  it('references containers, nulls and the root (user story 1, scenario 3)', async () => {
    const user = userEvent.setup();
    const adapter = createAdapter();
    render(<JsonReferenceWorkspace adapter={adapter} active />);
    await pasteAndParse(user, fixtureA1, 'Get items');
    await expand(user, /^body, object$/);

    for (const [name, reference] of [
      [/^value, array$/, "outputs('Get_items')?['body']?['value']"],
      [/^@odata\.nextLink, null, null$/, "outputs('Get_items')?['body']?['@odata.nextLink']"],
      [/^outputs\('Get_items'\), object$/, "outputs('Get_items')"],
    ] as const) {
      await user.click(row(name));
      expect(expression()).toHaveTextContent(reference);
      await user.click(screen.getByRole('button', { name: 'Copy' }));
      expect(adapter.copyToClipboard).toHaveBeenLastCalledWith(reference);
    }
  });

  it('references a Compose output with Action and Full output (user story 1, scenario 4)', async () => {
    const user = userEvent.setup();
    render(<JsonReferenceWorkspace adapter={createAdapter()} active />);
    await pasteAndParse(user, composeSample, 'Compose');

    await user.click(row(/^customer, object$/));
    expect(expression()).toHaveTextContent("outputs('Compose')?['customer']");
  });

  it('copies the inline form (user story 1, scenario 5)', async () => {
    const user = userEvent.setup();
    const adapter = createAdapter();
    render(<JsonReferenceWorkspace adapter={adapter} active />);
    await pasteAndParse(user, fixtureA1, 'Get items');
    await selectEmail(user);

    await user.click(screen.getByRole('radio', { name: 'Inside text @{…}' }));
    expect(copyStatus()).toHaveTextContent('Inline text: use inside a string');
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(adapter.copyToClipboard).toHaveBeenCalledWith(`@{${EMAIL_REFERENCE}}`);
  });

  it('hints at a top-level body key under Body only and still roots at body() (user story 1, scenario 6)', async () => {
    const user = userEvent.setup();
    render(<JsonReferenceWorkspace adapter={createAdapter()} active />);
    await pasteAndParse(user, fixtureA1, 'Get items');

    await user.click(screen.getByRole('radio', { name: /^Body only/ }));
    expect(screen.getByText(/This sample has a top-level/)).toHaveTextContent(
      'This sample has a top-level body key. If you pasted the full output, choose Full output.',
    );
    await user.click(row(/^body, object$/));
    expect(expression()).toHaveTextContent("body('Get_items')?['body']");
  });

  it('references trigger payloads without an action name (user story 2)', async () => {
    const user = userEvent.setup();
    render(<JsonReferenceWorkspace adapter={createAdapter()} active />);

    await user.click(screen.getByRole('radio', { name: 'Trigger' }));
    expect(screen.queryByLabelText('Action name')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Full output' })).toHaveAccessibleDescription('triggerOutputs()');
    expect(screen.getByRole('radio', { name: 'Body only' })).toHaveAccessibleDescription('triggerBody()');

    await user.click(screen.getByRole('radio', { name: /^Body only/ }));
    await pasteAndParse(user, triggerBodySample);
    await expand(user, /^customer, object$/);
    await user.click(row(/^name, string/));
    expect(expression()).toHaveTextContent("triggerBody()?['customer']?['name']");

    await user.clear(screen.getByLabelText('Sample JSON'));
    await user.click(screen.getByRole('radio', { name: /^Full output/ }));
    await pasteAndParse(user, triggerFullSample);
    await expand(user, /^headers, object$/);
    await user.click(row(/^content-type, string/));
    expect(expression()).toHaveTextContent("triggerOutputs()?['headers']?['content-type']");
    expect(screen.getByRole('button', { name: 'Copy' })).toBeEnabled();
  });

  it('asks for a sample before parsing (user story 4, scenario 1)', async () => {
    const user = userEvent.setup();
    render(<JsonReferenceWorkspace adapter={createAdapter()} active />);

    await user.click(screen.getByRole('button', { name: 'Parse' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Paste a sample before parsing.');
  });

  it('reports invalid JSON and clears the tree (user story 4, scenario 2)', async () => {
    const user = userEvent.setup();
    render(<JsonReferenceWorkspace adapter={createAdapter()} active />);
    await pasteAndParse(user, fixtureA1, 'Get items');

    await user.clear(screen.getByLabelText('Sample JSON'));
    await pasteAndParse(user, '{"a": 1,}');

    expect(screen.getByRole('alert')).toHaveTextContent(/^Not valid JSON: /);
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    expect(screen.getByText('No sample yet')).toBeInTheDocument();
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Could not parse');
    expect(screen.getByLabelText('Sample JSON')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
  });

  it('shows the limit message and no tree (user story 4, scenario 3)', async () => {
    const user = userEvent.setup();
    render(<JsonReferenceWorkspace adapter={createAdapter()} active />);

    await pasteAndParse(user, JSON.stringify(new Array(10_000).fill(0)));
    expect(screen.getByRole('alert')).toHaveTextContent('Sample has more than 10,000 values. Trim it to the part you need.');
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
  });

  it('keeps the old tree after an edit and says the sample changed (user story 4, scenario 4)', async () => {
    const user = userEvent.setup();
    render(<JsonReferenceWorkspace adapter={createAdapter()} active />);
    await pasteAndParse(user, fixtureA1, 'Get items');

    await user.type(screen.getByLabelText('Sample JSON'), ' ');
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Sample changed. Parse again to update.');
    expect(screen.getByRole('tree')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeEnabled();
  });

  it('blocks Copy and flags the field when the action name is blank (user story 4, scenario 5)', async () => {
    const user = userEvent.setup();
    render(<JsonReferenceWorkspace adapter={createAdapter()} active />);
    const name = screen.getByLabelText('Action name');

    expect(name).toHaveAccessibleDescription('As shown in the flow designer. Spaces become underscores.');
    expect(name).toHaveAttribute('aria-invalid', 'false');
    await pasteAndParse(user, fixtureA1);

    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Enter the action name to build the reference.');
    expect(screen.getByText('Enter an action name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
    expect(row(/^outputs\('Action_name'\), object$/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Full output (also Compose)' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Full output (also Compose)' })).toHaveAccessibleDescription(
      "outputs('Action_name')",
    );
  });

  it('never claims a copy the host refused (user story 4, scenario 6)', async () => {
    const user = userEvent.setup();
    render(
      <JsonReferenceWorkspace
        adapter={createAdapter(async () => {
          throw new Error('the host does not provide a clipboard API');
        })}
        active
      />,
    );
    await pasteAndParse(user, fixtureA1, 'Get items');

    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(copyStatus()).toHaveTextContent('Could not copy expression: the host does not provide a clipboard API');
    expect(screen.queryByText('Expression copied')).not.toBeInTheDocument();
  });

  it('labels its panels and fields for assistive technology (FR-082, FR-084)', () => {
    render(<JsonReferenceWorkspace adapter={createAdapter()} active />);

    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Source',
      'Payload',
      'Reference',
    ]);
    expect(screen.getByRole('radiogroup', { name: 'Output from' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'The pasted JSON is' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Copy format' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Payload' })).getByText('No sample yet')).toBeInTheDocument();
  });

  it('turns off spell checking, autocorrect, capitalisation and autocomplete (FR-062)', () => {
    render(<JsonReferenceWorkspace adapter={createAdapter()} active />);

    for (const field of [screen.getByLabelText('Action name'), screen.getByLabelText('Sample JSON')]) {
      expect(field).toHaveAttribute('spellcheck', 'false');
      expect(field).toHaveAttribute('autocorrect', 'off');
      expect(field).toHaveAttribute('autocapitalize', 'off');
      expect(field).toHaveAttribute('autocomplete', 'off');
    }
  });
});
