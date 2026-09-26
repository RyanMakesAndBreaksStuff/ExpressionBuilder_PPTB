// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ChoiceGroup } from '../src/workbench/controls/ChoiceGroup';

afterEach(() => cleanup());

function Harness() {
  const [value, setValue] = useState<'action' | 'trigger'>('action');
  return (
    <>
      <button type="button">Before</button>
      <ChoiceGroup
        className="eb-choice-pill"
        ariaLabel="Output from"
        value={value}
        onChange={setValue}
        options={[
          { value: 'action', label: 'Action' },
          { value: 'trigger', label: 'Trigger' },
        ]}
      />
      <button type="button">After</button>
    </>
  );
}

describe('ChoiceGroup (FR-081)', () => {
  it('is one tab stop, on the checked option', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Before' }));
    await user.tab();
    expect(screen.getByRole('radio', { name: 'Action' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
  });

  it('moves the choice and the focus with the arrow keys, wrapping around', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('radio', { name: 'Action' }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Trigger' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Trigger' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Action' })).toHaveAttribute('tabindex', '-1');

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Action' })).toBeChecked();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Trigger' })).toBeChecked();
  });

  it('is named by its label', () => {
    render(<Harness />);

    expect(screen.getByRole('radiogroup', { name: 'Output from' })).toBeInTheDocument();
  });
});
