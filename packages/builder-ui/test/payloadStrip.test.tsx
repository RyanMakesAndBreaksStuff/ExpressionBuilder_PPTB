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
