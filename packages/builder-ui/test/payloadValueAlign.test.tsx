// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExpressionBuilderShell } from '../src/app/ExpressionBuilderShell';

afterEach(cleanup);

function createAdapter(storedAlign: string | null = null): PlatformAdapter {
	return {
		copyToClipboard: vi.fn(async () => undefined),
		notify: vi.fn(async () => undefined),
		getTheme: vi.fn(async () => 'light' as const),
		onThemeChanged: vi.fn(() => () => undefined),
		settings: {
			get: vi.fn(async (key: string) =>
				key === 'eb.onboarding.seen.v1' ? '1'
					: key === 'eb.json.valueAlign.v1' ? storedAlign
					: null,
			),
			set: vi.fn(async () => undefined),
			remove: vi.fn(async () => undefined),
		},
		getDataverseFields: vi.fn(async () => []),
	};
}

async function openParsedPayload(adapter: PlatformAdapter) {
	const user = userEvent.setup();
	render(<ExpressionBuilderShell adapter={adapter} />);
	await user.click(
		within(screen.getByRole('tablist', { name: 'Screen' })).getByRole('tab', { name: 'JSON reference' }),
	);
	fireEvent.input(screen.getByRole('textbox', { name: 'Sample JSON', exact: true }), {
		target: { value: '{"a":1}' },
		inputType: 'insertFromPaste',
	});
	return user;
}

const payloadCard = () => screen.getByRole('region', { name: 'Payload' });
const alignToggle = () => within(payloadCard()).getByRole('radiogroup', { name: 'Value alignment' });

describe('payload value alignment', () => {
	it('hides the toggle until a payload is parsed', async () => {
		const user = userEvent.setup();
		render(<ExpressionBuilderShell adapter={createAdapter()} />);
		await user.click(
			within(screen.getByRole('tablist', { name: 'Screen' })).getByRole('tab', { name: 'JSON reference' }),
		);
		expect(within(payloadCard()).queryByRole('radiogroup', { name: 'Value alignment' })).not.toBeInTheDocument();
	});

	it('defaults to right and switches to left, remembering the choice', async () => {
		const adapter = createAdapter();
		const user = await openParsedPayload(adapter);

		expect(within(alignToggle()).getByRole('radio', { name: 'Right' })).toHaveAttribute('aria-checked', 'true');
		expect(payloadCard()).toHaveClass('is-values-right');
		// Icon buttons: no visible text, the name doubles as the tooltip.
		for (const radio of within(alignToggle()).getAllByRole('radio')) {
			expect(radio).toHaveTextContent(/^$/);
			expect(radio).toHaveAttribute('title', radio.getAttribute('aria-label'));
		}

		await user.click(within(alignToggle()).getByRole('radio', { name: 'Left' }));
		expect(within(alignToggle()).getByRole('radio', { name: 'Left' })).toHaveAttribute('aria-checked', 'true');
		expect(payloadCard()).toHaveClass('is-values-left');
		expect(adapter.settings.set).toHaveBeenCalledWith('eb.json.valueAlign.v1', 'left');
	});

	it('opens with the stored choice', async () => {
		await openParsedPayload(createAdapter('left'));
		await waitFor(() => expect(payloadCard()).toHaveClass('is-values-left'));
		expect(within(alignToggle()).getByRole('radio', { name: 'Left' })).toHaveAttribute('aria-checked', 'true');
	});

	it('ignores an unknown stored value', async () => {
		const adapter = createAdapter('center');
		await openParsedPayload(adapter);
		await waitFor(() => expect(adapter.settings.get).toHaveBeenCalledWith('eb.json.valueAlign.v1'));
		expect(payloadCard()).toHaveClass('is-values-right');
	});
});
