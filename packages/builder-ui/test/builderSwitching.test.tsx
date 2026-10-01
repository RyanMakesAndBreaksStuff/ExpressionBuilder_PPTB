// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExpressionBuilderShell } from '../src/app/ExpressionBuilderShell';
import { sampleDocument } from '../src/app/sampleData';
import { fixtureA1 } from './fixtures/jsonReferenceFixtures';

afterEach(() => cleanup());

function createAdapter(): PlatformAdapter {
	return {
		copyToClipboard: vi.fn(async () => undefined),
		notify: vi.fn(async () => undefined),
		getTheme: vi.fn(async () => 'light' as const),
		onThemeChanged: vi.fn(() => () => undefined),
		settings: {
			// Onboarding already seen, so its modal does not take focus mid-test.
			get: vi.fn(async (key: string) =>
				key === 'eb.onboarding.seen.v1' ? '1' : null,
			),
			set: vi.fn(async () => undefined),
			remove: vi.fn(async () => undefined),
		},
		getDataverseFields: vi.fn(async () => []),
	};
}

const screenChip = () => screen.getByRole('button', { name: /^Screen:/ });

async function goTo(user: UserEvent, label: string) {
	await user.click(screenChip());
	await user.click(screen.getByRole('menuitemradio', { name: label }));
}

async function exerciseJsonReference(user: UserEvent) {
	await goTo(user, 'JSON reference');
	await user.type(screen.getByLabelText('Action name'), 'Get items');
	await user.click(screen.getByLabelText('Sample JSON'));
	await user.paste(fixtureA1);
	await user.click(screen.getByRole('button', { name: 'Parse' }));
	await user.click(screen.getByRole('treeitem', { name: /^body, object$/ }));
	await user.click(screen.getByRole('button', { name: 'Copy @{}' }));
}

describe('builder switching', () => {
	it('shows one screen and exactly one main landmark at a time (FR-005)', async () => {
		const user = userEvent.setup();
		render(<ExpressionBuilderShell adapter={createAdapter()} />);

		expect(screen.getAllByRole('main')).toHaveLength(1);
		expect(
			[...document.querySelectorAll<HTMLElement>('.eb-builder-panel')]
				.filter((panel) => !panel.hidden)
				.map((panel) => panel.getAttribute('aria-label')),
		).toEqual(['Trigger / Filter']);

		await goTo(user, 'JSON reference');
		expect(screen.getAllByRole('main')).toHaveLength(1);
		expect(
			[...document.querySelectorAll<HTMLElement>('.eb-builder-panel')]
				.filter((panel) => !panel.hidden)
				.map((panel) => panel.getAttribute('aria-label')),
		).toEqual(['JSON reference']);
		expect(
			screen.queryByRole('heading', { name: /condition builder/i }),
		).not.toBeInTheDocument();
	});

	it('swaps the mode switch, Import and Export for the privacy sentence (FR-006)', async () => {
		const user = userEvent.setup();
		render(<ExpressionBuilderShell adapter={createAdapter()} />);
		const privacy =
			'Pasted JSON is processed locally and is not uploaded or saved in any way.';

		expect(
			screen.getByRole('radiogroup', { name: 'Expression mode' }),
		).toBeInTheDocument();
		expect(screen.queryByText(privacy)).not.toBeInTheDocument();

		await goTo(user, 'JSON reference');
		expect(
			screen.queryByRole('radiogroup', { name: 'Expression mode' }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: 'Import' }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: 'Export' }),
		).not.toBeInTheDocument();
		expect(screen.getByText(privacy)).toBeInTheDocument();

		await goTo(user, 'Trigger / Filter');
		expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
	});

	it('keeps JSON reference state while switching, but not the copied status (FR-008)', async () => {
		const user = userEvent.setup();
		const adapter = createAdapter();
		render(<ExpressionBuilderShell adapter={adapter} />);
		await exerciseJsonReference(user);
		expect(vi.mocked(adapter.notify)).toHaveBeenCalledWith(
			'Expression copied',
			'success',
		);

		await goTo(user, 'Trigger / Filter');
		await goTo(user, 'JSON reference');

		expect(screen.getByLabelText('Action name')).toHaveValue('Get items');
		expect(screen.getByLabelText('Sample JSON')).toHaveValue(fixtureA1);
		expect(
			screen.getByRole('treeitem', { name: /^body, object$/ }),
		).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByLabelText('Reference expression')).toHaveTextContent(
			"outputs('Get_items')?['body']",
		);
		expect(
			screen.queryByText('Paste into the expression editor'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText('Inline text: use inside a string'),
		).not.toBeInTheDocument();
	});

	it('leaves the document, mode, predicate and Export output unchanged (FR-009, SC-003)', async () => {
		const user = userEvent.setup();
		const adapter = createAdapter();
		render(
			<ExpressionBuilderShell
				adapter={adapter}
				initialDocument={sampleDocument}
			/>,
		);
		const exportJson = async () => {
			await user.click(screen.getByRole('button', { name: 'Export' }));
			return vi.mocked(adapter.copyToClipboard).mock.lastCall?.[0];
		};

		const expressionBefore = within(
			screen.getByLabelText('Trigger / Filter'),
		).getByLabelText('Generated expression').textContent;
		const exportBefore = await exportJson();
		await exerciseJsonReference(user);
		await goTo(user, 'Trigger / Filter');

		expect(
			within(screen.getByLabelText('Trigger / Filter')).getByLabelText(
				'Generated expression',
			).textContent,
		).toBe(expressionBefore);
		expect(
			screen.getByRole('radio', { name: 'Trigger condition' }),
		).toHaveAttribute('aria-checked', 'true');
		expect(await exportJson()).toBe(exportBefore);
		expect(adapter.settings.set).not.toHaveBeenCalled();
		expect(adapter.settings.remove).not.toHaveBeenCalled();
	});

	it('opens on Trigger / Filter with an empty JSON reference after a reload (user story 3, scenario 3)', async () => {
		const user = userEvent.setup();
		const { unmount } = render(
			<ExpressionBuilderShell adapter={createAdapter()} />,
		);
		await exerciseJsonReference(user);
		unmount();

		render(<ExpressionBuilderShell adapter={createAdapter()} />);
		expect(screenChip()).toHaveAccessibleName('Screen: Trigger / Filter');
		await goTo(user, 'JSON reference');
		expect(screen.getByLabelText('Sample JSON')).toHaveValue('');
		expect(screen.getByText('No sample yet')).toBeInTheDocument();
	});
});
