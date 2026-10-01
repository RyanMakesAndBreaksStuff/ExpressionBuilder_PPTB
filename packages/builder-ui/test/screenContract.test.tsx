// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExpressionBuilderShell } from '../src/app/ExpressionBuilderShell';

afterEach(() => cleanup());

function createAdapter(): PlatformAdapter {
  return {
    copyToClipboard: vi.fn(async () => undefined),
    notify: vi.fn(async () => undefined),
    getTheme: vi.fn(async () => 'dark' as const),
    onThemeChanged: vi.fn(() => () => undefined),
    settings: {
      // Onboarding already seen, so its modal does not take focus mid-test.
      get: vi.fn(async (key: string) => (key === 'eb.onboarding.seen.v1' ? '1' : null)),
      set: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    },
    getDataverseFields: vi.fn(async () => []),
  };
}

const chip = () => screen.getByRole('button', { name: /^Screen:/ });

async function goTo(user: UserEvent, label: string) {
  await user.click(chip());
  await user.click(screen.getByRole('menuitemradio', { name: label }));
}

describe('screen contract', () => {
  it('shows the pill title and the active screen in the chip (FR-2, AC-2.1)', () => {
    render(<ExpressionBuilderShell adapter={createAdapter()} />);
    expect(screen.getByText('Expression Builder')).toBeInTheDocument();
    expect(chip()).toHaveAccessibleName('Screen: Trigger / Filter');
  });

  it('lists all three screens in order and switches (FR-3, AC-3.1)', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);
    await user.click(chip());
    expect(screen.getAllByRole('menuitemradio').map((item) => item.textContent))
      .toEqual(['Functions', 'Trigger / Filter', 'JSON reference']);

    await user.click(screen.getByRole('menuitemradio', { name: 'JSON reference' }));
    expect(chip()).toHaveAccessibleName('Screen: JSON reference');
    expect(screen.getByLabelText('Sample JSON')).toBeInTheDocument();
  });

  it('keeps each screen’s state across switches (FR-4, AC-4.1)', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    await goTo(user, 'JSON reference');
    await user.type(screen.getByLabelText('Action name'), 'Get items');

    await goTo(user, 'Functions');
    await user.type(screen.getByLabelText('text2'), "' - '");

    await goTo(user, 'Trigger / Filter');
    await goTo(user, 'Functions');
    expect(screen.getByLabelText('text2')).toHaveValue("' - '");

    await goTo(user, 'JSON reference');
    expect(screen.getByLabelText('Action name')).toHaveValue('Get items');
  });

  it('shows mode, Import and Export only on Trigger / Filter (FR-5, AC-5.1, AC-5.2)', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);
    expect(screen.getByRole('radiogroup', { name: 'Expression mode' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'More actions' }));
    expect(screen.getByRole('menuitem', { name: 'Import' })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await goTo(user, 'Functions');
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Expression mode' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Sample result/i)).not.toBeInTheDocument();

    await goTo(user, 'JSON reference');
    expect(
      screen.getByText('Pasted JSON is processed locally and is not uploaded or saved in any way.'),
    ).toBeInTheDocument();
  });
});
