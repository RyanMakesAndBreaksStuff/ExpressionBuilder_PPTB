// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../src/app/ErrorBoundary';

let shouldThrow = true;
function Bomb() {
  if (shouldThrow) throw new Error('boom');
  return <p>healthy</p>;
}

beforeEach(() => {
  shouldThrow = true;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('shows an alert fallback for the failing child only', () => {
    render(<><ErrorBoundary><Bomb /></ErrorBoundary><ErrorBoundary><p>sibling</p></ErrorBoundary></>);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByText('sibling')).toBeInTheDocument();
  });

  it('remounts the children when Reset is pressed', async () => {
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    shouldThrow = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText('healthy')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
