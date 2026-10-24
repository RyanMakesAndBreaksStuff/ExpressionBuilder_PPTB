// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useReducer } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { PayloadStrip } from '../src/workbench/PayloadStrip';
import { createJsonPayloadSession, jsonPayloadSessionReducer } from '../src/workbench/jsonPayloadSession';

afterEach(cleanup);

function Harness() {
  const [session, dispatch] = useReducer(jsonPayloadSessionReducer, undefined, createJsonPayloadSession);
  return <PayloadStrip baseId="test" session={session} dispatch={dispatch} searchControl={null} />;
}

it('roves tabs, wraps arrows and focuses the surviving tab on close', () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: '+ Add' }));
  const second = screen.getByRole('tab', { name: 'Payload 2, payload 2' });
  expect(second).toHaveFocus();
  fireEvent.keyDown(second, { key: 'ArrowRight' });
  const first = screen.getByRole('tab', { name: 'Payload 1, payload 1' });
  expect(first).toHaveFocus();
  fireEvent.keyDown(first, { key: 'End' });
  expect(second).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Close Payload 2, payload 2' }));
  expect(first).toHaveFocus();
  expect(screen.queryByRole('button', { name: /^Close / })).toBeNull();
});

it('disables adding at five and exposes only one tab stop', () => {
  render(<Harness />);
  for (let i = 0; i < 4; i += 1) fireEvent.click(screen.getByRole('button', { name: '+ Add' }));
  expect(screen.getByRole('button', { name: '+ Add' })).toBeDisabled();
  expect(screen.getAllByRole('tab').filter((tab) => tab.tabIndex === 0)).toHaveLength(1);
});

it('shows only the root function under the tab name, with the full root as its tooltip', () => {
  let session = createJsonPayloadSession();
  const payloadId = session.payloads[0].id;
  session = jsonPayloadSessionReducer(session, { type: 'edit', payloadId, action: { type: 'setActionName', value: 'Get items' } });
  const roots = [
    ['action', 'full', 'outputs()', "outputs('Get_items')"],
    ['action', 'body', 'body()', "body('Get_items')"],
    ['trigger', 'full', 'triggerOutputs()', 'triggerOutputs()'],
    ['trigger', 'body', 'triggerBody()', 'triggerBody()'],
  ] as const;
  for (const [outputFrom, shape, shown, tooltip] of roots) {
    const state = jsonPayloadSessionReducer(session, {
      type: 'edit', payloadId, action: { type: 'setReferenceRoot', outputFrom, shape },
    });
    const { container, unmount } = render(
      <PayloadStrip baseId="test" session={state} dispatch={() => undefined} searchControl={null} />,
    );
    const root = container.querySelector('.eb-payload-root');
    expect(root).toHaveTextContent(new RegExp(`^${shown.replace(/[()]/g, '\\$&')}$`));
    expect(root).toHaveAttribute('title', tooltip);
    unmount();
  }
});
