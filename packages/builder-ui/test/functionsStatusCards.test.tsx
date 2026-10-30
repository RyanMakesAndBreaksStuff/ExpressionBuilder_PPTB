// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  deriveFunctions,
  functionsReducer,
  initialFunctionsState,
  type FunctionsAction,
  type FunctionsState,
} from '../src/workbench/functionsState';
import { FunctionsStatusCards } from '../src/workbench/FunctionsStatusCards';

afterEach(cleanup);

function deriveWith(...actions: FunctionsAction[]) {
  const state = actions.reduce<FunctionsState>(functionsReducer, initialFunctionsState);
  return deriveFunctions(state);
}

describe('FunctionsStatusCards', () => {
  it('shows a valid status and the argument counts', () => {
    const derived = deriveWith(
      { type: 'setArg', name: 'text1', value: "triggerBody()?['Name']" },
      { type: 'setArg', name: 'text2', value: "' - '" },
    );

    render(<FunctionsStatusCards derived={derived} />);

    const statusCard = screen.getByRole('region', { name: 'Status' });
    expect(within(statusCard).getByText('Status')).toBeTruthy();
    expect(within(statusCard).getByText('Valid')).toBeTruthy();
    expect(statusCard.getAttribute('data-tone')).toBe('good');
    expect(within(statusCard).getByText('2 of 2 required set')).toBeTruthy();

    const infoCard = screen.getByRole('region', { name: 'Arguments set' });
    expect(within(infoCard).getByText('Arguments set')).toBeTruthy();
    expect(within(infoCard).getByText('2 / 3')).toBeTruthy();
    expect(within(infoCard).getByText('1 optional left empty')).toBeTruthy();
  });

  it('shows an invalid status with the derived error', () => {
    const derived = deriveWith(
      { type: 'setArg', name: 'text1', value: "triggerBody()?['Name']" },
      { type: 'setArg', name: 'text2', value: 'Ada' },
    );

    render(<FunctionsStatusCards derived={derived} />);

    const statusCard = screen.getByRole('region', { name: 'Status' });
    expect(within(statusCard).getByText('Invalid')).toBeTruthy();
    expect(statusCard.getAttribute('data-tone')).toBe('danger');
    expect(within(statusCard).getByText(derived.error!)).toBeTruthy();
  });

  it.each([
    { optionalEmpty: 0, expected: '0 optionals left empty' },
    { optionalEmpty: 2, expected: '2 optionals left empty' },
  ])('pluralizes the optional count for $optionalEmpty', ({ optionalEmpty, expected }) => {
    const derived = {
      ...deriveWith(
        { type: 'setArg', name: 'text1', value: "triggerBody()?['Name']" },
        { type: 'setArg', name: 'text2', value: "' - '" },
      ),
      optionalEmpty,
    };

    render(<FunctionsStatusCards derived={derived} />);

    expect(screen.getByText(expected)).toBeTruthy();
  });
});