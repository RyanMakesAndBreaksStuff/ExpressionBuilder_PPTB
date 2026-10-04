// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseArgument } from '@ryanmakes/eb_engine';
import { argKind, type ArgumentSlot } from '../src/workbench/functionsState';
import { ArgumentsPanel } from '../src/workbench/ArgumentsPanel';

afterEach(() => cleanup());

const slots: ArgumentSlot[] = [
  { name: 'text', type: 'string', required: true, value: '', parsed: parseArgument('') },
  { name: 'separator', type: 'string', required: false, value: "'-'", parsed: parseArgument("'-'") },
];

function renderPanel() {
  const props = {
    functionName: 'join',
    slots,
    onArgChange: vi.fn(),
    onArgFocus: vi.fn(),
  };
  const view = render(<ArgumentsPanel {...props} />);
  return { ...props, ...view };
}

describe('ArgumentsPanel', () => {
  it('shows the Arguments heading with the selected function name (AC-10.1)', () => {
    renderPanel();
    const heading = screen.getByRole('heading', { name: 'Arguments join' });
    expect(heading).toBeInTheDocument();
  });

  it('renders one input per slot in order with required and optional indicators (AC-12.1)', () => {
    renderPanel();
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(slots.length);
    expect(inputs[0]).toBe(screen.getByLabelText('text'));
    expect(inputs[1]).toBe(screen.getByLabelText('separator'));
    expect(screen.getByText('required')).toBeInTheDocument();
    expect(screen.getByText('optional')).toBeInTheDocument();
  });

  it('reports typing and focus with the slot name', () => {
    const props = renderPanel();
    const input = screen.getByLabelText('text');

    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.focus(input);

    expect(props.onArgChange).toHaveBeenLastCalledWith('text', 'hello');
    expect(props.onArgFocus).toHaveBeenCalledWith('text');
  });

  it('sets each input kind, placeholder, text-assistance attributes, and data-arg (FR-14, FR-15, FR-062)', () => {
    renderPanel();
    const inputs = screen.getAllByRole('textbox');

    slots.forEach((slot, index) => {
      expect(inputs[index]).toHaveAttribute('data-kind', argKind(slot));
      expect(inputs[index]).toHaveAttribute('placeholder', 'Type a value or pick a function');
      expect(inputs[index]).toHaveAttribute('spellcheck', 'false');
      expect(inputs[index]).toHaveAttribute('autocomplete', 'off');
      expect(inputs[index]).toHaveAttribute('data-arg', slot.name);
    });
  });

  it('shows the expected type for each substring argument (AC-12.1)', () => {
    render(
      <ArgumentsPanel
        functionName="substring"
        slots={[
          { name: 'text', type: 'string', required: true, value: '', parsed: parseArgument('') },
          { name: 'startIndex', type: 'integer', required: true, value: '', parsed: parseArgument('') },
          { name: 'length', type: 'integer', required: false, value: '', parsed: parseArgument('') },
        ]}
        onArgChange={vi.fn()}
        onArgFocus={vi.fn()}
      />,
    );

    expect(screen.getByText('(STRING)')).toBeInTheDocument();
    expect(screen.getAllByText('(INT)')).toHaveLength(2);
    const text = screen.getByLabelText('text');
    const typeId = text.getAttribute('aria-describedby');
    expect(typeId).toBeTruthy();
    expect(document.getElementById(typeId ?? '')).toHaveTextContent('(STRING)');
    for (const input of screen.getAllByRole('textbox')) {
      expect(input).toHaveAttribute('placeholder', 'Type a value or pick a function');
    }
  });

  it('uses the timestamp sample as the placeholder and leaves format generic', () => {
    render(
      <ArgumentsPanel
        functionName="addDays"
        slots={[
          {
            name: 'timestamp',
            type: 'timestamp',
            required: true,
            value: '',
            sample: '2018-03-15T00:00:00Z',
            parsed: parseArgument(''),
          },
          { name: 'days', type: 'integer', required: true, value: '', parsed: parseArgument('') },
          { name: 'format', type: 'string', required: false, value: '', parsed: parseArgument('') },
        ]}
        onArgChange={vi.fn()}
        onArgFocus={vi.fn()}
      />,
    );

    expect(screen.getByText('(TIMESTAMP)')).toBeInTheDocument();
    expect(screen.getByLabelText('timestamp')).toHaveAttribute('placeholder', '2018-03-15T00:00:00Z');
    expect(screen.getByLabelText('format')).toHaveAttribute('placeholder', 'Type a value or pick a function');
  });

  it('accepts a dropped text/plain reference and enables native dropping (FR-16)', () => {
    const props = renderPanel();
    const input = screen.getByLabelText('text');
    const dataTransfer = {
      getData: vi.fn(() => "body('Get_record')?['id']"),
      types: ['text/plain'],
    };
    const dragOver = new Event('dragover', { bubbles: true, cancelable: true });

    fireEvent(input, dragOver);
    fireEvent.drop(input, { dataTransfer });

    expect(dragOver.defaultPrevented).toBe(true);
    expect(dataTransfer.getData).toHaveBeenCalledWith('text/plain');
    expect(props.onArgChange).toHaveBeenCalledWith('text', "body('Get_record')?['id']");
  });
});
