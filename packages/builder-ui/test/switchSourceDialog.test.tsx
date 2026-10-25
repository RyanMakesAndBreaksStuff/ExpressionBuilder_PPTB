// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SwitchSourceDialog } from '../src/workbench/SwitchSourceDialog';

afterEach(cleanup);

const diff = { affectedRuleIds: ['r1'] } as never;

describe('SwitchSourceDialog', () => {
  it.each(['Cancel', 'Switch'])('resets to Keep after %s and reopen', async (button) => {
    const user = userEvent.setup();
    const props = { diff, targetLabel: 'T', onDismiss: vi.fn(), onConfirm: vi.fn() };
    const { rerender } = render(<SwitchSourceDialog open {...props} />);
    await user.click(screen.getByRole('radio', { name: /Remove the affected/ }));
    expect(screen.getByRole('radio', { name: /Remove the affected/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: button }));
    rerender(<SwitchSourceDialog open={false} {...props} />);
    rerender(<SwitchSourceDialog open {...props} />);
    expect(screen.getByRole('radio', { name: /Keep rules/ })).toBeChecked();
  });
});
