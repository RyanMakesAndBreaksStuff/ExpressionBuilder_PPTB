// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  deriveFunctions,
  functionsReducer,
  initialFunctionsState,
  type CopyFormat,
  type FunctionsAction,
  type FunctionsState,
} from '../src/workbench/functionsState';
import { FunctionsDock } from '../src/workbench/FunctionsDock';

afterEach(cleanup);

function deriveWith(...actions: FunctionsAction[]) {
  return deriveFunctions(actions.reduce<FunctionsState>(functionsReducer, initialFunctionsState));
}

function renderDock({
  valid = true,
  copyState = 'idle',
}: { valid?: boolean; copyState?: 'idle' | 'copied' } = {}) {
  const props = {
    derived: deriveWith(
      { type: 'setArg', name: 'text1', value: "triggerBody()?['Name']" },
      { type: 'setArg', name: 'text2', value: "' - '" },
    ),
    copyState,
    onCopy: vi.fn<(format: CopyFormat) => void>(),
  };
  if (!valid) props.derived = deriveWith();
  const view = render(<FunctionsDock {...props} />);
  return { ...props, ...view };
}

describe('FunctionsDock', () => {
  it('shows its label, validity and the bare expression without a format toggle', () => {
    renderDock();

    expect(screen.getByText('Expression')).toBeInTheDocument();
    expect(screen.getByText('Valid')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getByLabelText('Generated expression')).toHaveTextContent("concat(triggerBody()?['Name'], ' - ')");
  });

  it('renders crumbs in order with their matching tones', () => {
    const { derived } = renderDock();
    const crumbs = document.querySelectorAll('.eb-fn-crumb');

    expect(Array.from(crumbs, (crumb) => crumb.textContent)).toEqual(derived.crumbs.map((crumb) => crumb.label));
    expect(Array.from(crumbs, (crumb) => crumb.getAttribute('data-tone'))).toEqual(derived.crumbs.map((crumb) => crumb.tone));
  });

  it('copies the bare expression from the primary button and shows copied state', async () => {
    const user = userEvent.setup();
    const props = renderDock({ copyState: 'copied' });

    await user.click(screen.getByRole('button', { name: 'Copied' }));
    expect(props.onCopy).toHaveBeenCalledWith('expression');
  });

  it('opens a menu that shows the exact text of each format and copies the chosen one', async () => {
    const user = userEvent.setup();
    const props = renderDock();
    const chevron = screen.getByRole('button', { name: 'More copy formats' });
    expect(chevron).toHaveAttribute('aria-expanded', 'false');

    await user.click(chevron);
    expect(chevron).toHaveAttribute('aria-expanded', 'true');
    const items = screen.getAllByRole('menuitem');
    expect(items[0]).toHaveTextContent(props.derived.expression);
    expect(items[1]).toHaveTextContent(props.derived.wrapped);
    expect(items[0]).toHaveFocus();

    await user.click(screen.getByRole('menuitem', { name: /^Copy with @\{ \}/ }));
    expect(props.onCopy).toHaveBeenCalledWith('wrapped');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(chevron).toHaveFocus();
  });

  it('supports arrow keys, Escape with focus return, and outside click', async () => {
    const user = userEvent.setup();
    renderDock();
    const chevron = screen.getByRole('button', { name: 'More copy formats' });
    chevron.focus();
    fireEvent.keyDown(chevron, { key: 'ArrowDown' });
    const items = screen.getAllByRole('menuitem');
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(items[0], { key: 'ArrowDown' });
    expect(items[1]).toHaveFocus();
    fireEvent.keyDown(items[1], { key: 'ArrowDown' });
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(items[0], { key: 'ArrowUp' });
    expect(items[1]).toHaveFocus();

    fireEvent.keyDown(items[1], { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(chevron).toHaveFocus();

    await user.click(chevron);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.click(screen.getByText('Valid'));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('disables both copy controls when the expression is invalid', () => {
    renderDock({ valid: false });

    expect(screen.getByText('Invalid')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy expression' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'More copy formats' })).toBeDisabled();
  });

  it('does not show a sample result', () => {
    renderDock();

    expect(screen.queryByText(/Sample result/i)).not.toBeInTheDocument();
  });

  it('keeps the split copy button inline in the expression controls', () => {
    renderDock();
    const controls = screen.getByRole('group', { name: 'Expression controls' });
    expect(within(controls).getByRole('button', { name: 'Copy expression' })).toBeEnabled();
    expect(within(controls).getByRole('button', { name: 'More copy formats' })).toBeEnabled();
    expect(document.querySelector('.eb-fn-dock-side')).toBeNull();
  });
});
