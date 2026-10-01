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
  copyFormat = 'expression',
  copyState = 'idle',
}: { valid?: boolean; copyFormat?: CopyFormat; copyState?: 'idle' | 'copied' } = {}) {
  const props = {
    derived: deriveWith(
      { type: 'setArg', name: 'text1', value: "triggerBody()?['Name']" },
      { type: 'setArg', name: 'text2', value: "' - '" },
    ),
    copyFormat,
    copyState,
    onCopyFormatChange: vi.fn<(format: CopyFormat) => void>(),
    onCopy: vi.fn<(format: CopyFormat) => void>(),
  };
  if (!valid) props.derived = deriveWith();
  const view = render(<FunctionsDock {...props} />);
  return { ...props, ...view };
}

describe('FunctionsDock', () => {
  it('shows its label, validity, expression and accessible format choices', () => {
    renderDock();

    expect(screen.getAllByText('Expression')).toHaveLength(2);
    expect(screen.getByText('Valid')).toBeInTheDocument();
    const formats = screen.getByRole('radiogroup', { name: 'Expression format' });
    expect(within(formats).getByRole('radio', { name: 'Expression' })).toBeInTheDocument();
    expect(within(formats).getByRole('radio', { name: '@{…}' })).toBeInTheDocument();
    expect(screen.getByLabelText('Generated expression')).toHaveTextContent("concat(triggerBody()?['Name'], ' - ')");
  });

  it('shows the wrapped expression when that format is active', () => {
    const { derived } = renderDock({ copyFormat: 'wrapped' });

    expect(screen.getByLabelText('Generated expression')).toHaveTextContent(derived.wrapped);
  });

  it('reports format selection from click and supports arrow-key radio navigation', async () => {
    const user = userEvent.setup();
    const props = renderDock();
    const expressionRadio = screen.getByRole('radio', { name: 'Expression' });
    const wrappedRadio = screen.getByRole('radio', { name: '@{…}' });

    await user.click(wrappedRadio);
    expect(props.onCopyFormatChange).toHaveBeenLastCalledWith('wrapped');

    expressionRadio.focus();
    fireEvent.keyDown(expressionRadio, { key: 'ArrowRight' });
    expect(props.onCopyFormatChange).toHaveBeenLastCalledWith('wrapped');
    expect(wrappedRadio).toHaveFocus();
  });

  it('renders crumbs in order with their matching tones', () => {
    const { derived } = renderDock();
    const crumbs = document.querySelectorAll('.eb-fn-crumb');

    expect(Array.from(crumbs, (crumb) => crumb.textContent)).toEqual(derived.crumbs.map((crumb) => crumb.label));
    expect(Array.from(crumbs, (crumb) => crumb.getAttribute('data-tone'))).toEqual(derived.crumbs.map((crumb) => crumb.tone));
  });

  it('copies the active format, shows copied state, and always offers wrapped copy', async () => {
    const user = userEvent.setup();
    const expressionDock = renderDock({ copyState: 'copied' });
    const copyExpression = screen.getByRole('button', { name: 'Copied' });
    await user.click(copyExpression);
    expect(expressionDock.onCopy).toHaveBeenCalledWith('expression');
    await user.click(screen.getByRole('button', { name: 'Copy as @{…}' }));
    expect(expressionDock.onCopy).toHaveBeenCalledWith('wrapped');

    cleanup();
    const wrappedDock = renderDock({ copyFormat: 'wrapped' });
    await user.click(screen.getByRole('button', { name: 'Copy as @{…}' }));
    expect(wrappedDock.onCopy).toHaveBeenCalledWith('wrapped');
    await user.click(screen.getByRole('button', { name: 'Copy expression' }));
    expect(wrappedDock.onCopy).toHaveBeenCalledWith('wrapped');
  });

  it('disables both copy actions when the expression is invalid', () => {
    renderDock({ valid: false });

    expect(screen.getByText('Invalid')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy expression' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Copy as @{…}' })).toBeDisabled();
  });

  it('does not show a sample result', () => {
    renderDock();

    expect(screen.queryByText(/Sample result/i)).not.toBeInTheDocument();
  });
});



