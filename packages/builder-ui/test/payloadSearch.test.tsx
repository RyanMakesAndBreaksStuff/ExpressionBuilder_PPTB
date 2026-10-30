// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PayloadSearch } from '../src/workbench/PayloadSearch';
import { createJsonPayloadSession, jsonPayloadSessionReducer } from '../src/workbench/jsonPayloadSession';

afterEach(cleanup);

function fixture() {
  const initial = createJsonPayloadSession();
  return jsonPayloadSessionReducer(initial, {
    type: 'edit', payloadId: initial.activeId,
    action: { type: 'pasteAndParse', defaultActionName: 'Action', text: JSON.stringify(Object.fromEntries(Array.from({ length: 10 }, (_, i) => ['Email' + i, i]))) },
  });
}

it('caps options, wraps keyboard selection and clears after reveal', () => {
  const dispatch = vi.fn();
  render(<PayloadSearch payloads={fixture().payloads} dispatch={dispatch} />);
  const input = screen.getByRole('combobox', { name: 'Search all payloads' });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: 'email' } });
  expect(screen.getAllByRole('option')).toHaveLength(8);
  expect(screen.getByRole('status')).toHaveTextContent('10 matches');
  fireEvent.keyDown(input, { key: 'ArrowUp' });
  expect(screen.getAllByRole('option')[7]).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(dispatch.mock.calls[0][0].match.path).toEqual(['Email7']);
  expect(input).toHaveValue('');
  expect(screen.queryByRole('listbox')).toBeNull();
});

it('Escape clears without dispatching and removed sources disappear', () => {
  const dispatch = vi.fn();
  const view = render(<PayloadSearch payloads={fixture().payloads} dispatch={dispatch} />);
  const input = screen.getByRole('combobox');
  input.focus();
  fireEvent.change(input, { target: { value: 'email' } });
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(input).toHaveValue('');
  expect(input).toHaveFocus();
  expect(dispatch).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: 'email' } });
  view.rerender(<PayloadSearch payloads={[]} dispatch={dispatch} />);
  expect(screen.queryByRole('option')).toBeNull();
  expect(screen.getByText('No matches in parsed payloads.')).toBeVisible();
});
