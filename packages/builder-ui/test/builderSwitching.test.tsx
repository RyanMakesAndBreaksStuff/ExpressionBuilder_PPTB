// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExpressionBuilderShell } from '../src/app/ExpressionBuilderShell';
import { sampleDocument } from '../src/app/sampleData';
import type { QueryDocument } from '../src/composer/querySchema';
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

// Three rules spread across nested groups (user story 3, scenario 5).
const threeRuleDocument: QueryDocument = {
	...sampleDocument,
	root: {
		...sampleDocument.root,
		children: [
			sampleDocument.root.children[0],
			{
				id: 'group-outer',
				kind: 'group',
				conjunction: 'or',
				children: [
					{
						id: 'rule-a',
						kind: 'rule',
						fieldId: 'Approver',
						operator: 'contains',
						value: 'finance',
					},
					{
						id: 'group-inner',
						kind: 'group',
						conjunction: 'and',
						children: [
							{
								id: 'rule-b',
								kind: 'rule',
								fieldId: 'Amount',
								operator: 'greater',
								value: 10,
							},
						],
					},
				],
			},
		],
	},
};

const conditionTab = () =>
	screen.getByRole('tab', { name: /^Condition builder/ });
const jsonTab = () => screen.getByRole('tab', { name: 'JSON reference' });

async function exerciseJsonReference(user: UserEvent) {
	await user.click(jsonTab());
	await user.type(screen.getByLabelText('Action name'), 'Get items');
	await user.click(screen.getByLabelText('Sample JSON'));
	await user.paste(fixtureA1);
	await user.click(screen.getByRole('treeitem', { name: /^body, object$/ }));
	await user.click(screen.getByRole('button', { name: 'Copy @{}' }));
}

describe('builder switching', () => {
	it('opens on the Condition builder with two tabs after the brand (FR-001, FR-002)', () => {
		render(<ExpressionBuilderShell adapter={createAdapter()} />);

		const tablist = screen.getByRole('tablist', { name: 'Builders' });
		expect(
			within(tablist)
				.getAllByRole('tab')
				.map((tab) => tab.textContent),
		).toEqual(['Condition builder0', 'JSON reference']);
		expect(conditionTab()).toHaveAttribute('aria-selected', 'true');
		expect(jsonTab()).toHaveAttribute('aria-selected', 'false');
		expect(
			screen.getByRole('heading', { level: 1 }).parentElement?.parentElement
				?.nextElementSibling,
		).toBe(tablist);
	});

	it('counts rules at every nesting level in the tab and its name (FR-003)', () => {
		render(
			<ExpressionBuilderShell
				adapter={createAdapter()}
				initialDocument={threeRuleDocument}
			/>,
		);

		expect(
			screen.getByRole('tab', { name: 'Condition builder, 3 rules' }),
		).toHaveTextContent('3');
	});

	it("says '1 rule' for a single rule", () => {
		render(
			<ExpressionBuilderShell
				adapter={createAdapter()}
				initialDocument={{
					...sampleDocument,
					root: {
						...sampleDocument.root,
						children: [sampleDocument.root.children[0]],
					},
				}}
			/>,
		);

		expect(
			screen.getByRole('tab', { name: 'Condition builder, 1 rule' }),
		).toBeInTheDocument();
	});

	it('follows the tabs pattern with automatic activation (FR-004)', async () => {
		const user = userEvent.setup();
		render(<ExpressionBuilderShell adapter={createAdapter()} />);

		for (const tab of [conditionTab(), jsonTab()]) {
			const panel = document.getElementById(
				tab.getAttribute('aria-controls') ?? '',
			);
			expect(panel).toHaveAttribute('role', 'tabpanel');
			expect(panel).toHaveAttribute('aria-labelledby', tab.id);
		}
		expect(conditionTab()).toHaveAttribute('tabindex', '0');
		expect(jsonTab()).toHaveAttribute('tabindex', '-1');

		conditionTab().focus();
		await user.keyboard('{ArrowRight}');
		expect(jsonTab()).toHaveFocus();
		expect(jsonTab()).toHaveAttribute('aria-selected', 'true');
		await user.keyboard('{ArrowRight}');
		expect(conditionTab()).toHaveAttribute('aria-selected', 'true');
		await user.keyboard('{End}');
		expect(jsonTab()).toHaveAttribute('aria-selected', 'true');
		await user.keyboard('{Home}');
		expect(conditionTab()).toHaveFocus();
		await user.keyboard('{ArrowLeft}');
		expect(jsonTab()).toHaveAttribute('aria-selected', 'true');
	});

	it('shows one panel and exactly one main landmark at a time (FR-005)', async () => {
		const user = userEvent.setup();
		render(<ExpressionBuilderShell adapter={createAdapter()} />);

		expect(screen.getAllByRole('main')).toHaveLength(1);
		expect(screen.getByRole('tabpanel')).toHaveAccessibleName(
			'Condition builder, 0 rules',
		);

		await user.click(jsonTab());
		expect(screen.getAllByRole('main')).toHaveLength(1);
		expect(screen.getByRole('tabpanel')).toHaveAccessibleName('JSON reference');
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

		await user.click(jsonTab());
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

		await user.click(conditionTab());
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

		await user.click(conditionTab());
		await user.click(jsonTab());

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

		const expressionBefore = screen.getByLabelText(
			'Generated expression',
		).textContent;
		const exportBefore = await exportJson();
		await exerciseJsonReference(user);
		await user.click(conditionTab());

		expect(screen.getByLabelText('Generated expression').textContent).toBe(
			expressionBefore,
		);
		expect(
			screen.getByRole('radio', { name: 'Trigger condition' }),
		).toHaveAttribute('aria-checked', 'true');
		expect(await exportJson()).toBe(exportBefore);
		expect(adapter.settings.set).not.toHaveBeenCalled();
		expect(adapter.settings.remove).not.toHaveBeenCalled();
	});

	it('opens on the Condition builder with an empty JSON reference after a reload (user story 3, scenario 3)', async () => {
		const user = userEvent.setup();
		const { unmount } = render(
			<ExpressionBuilderShell adapter={createAdapter()} />,
		);
		await exerciseJsonReference(user);
		unmount();

		render(<ExpressionBuilderShell adapter={createAdapter()} />);
		expect(conditionTab()).toHaveAttribute('aria-selected', 'true');
		await user.click(jsonTab());
		expect(screen.getByLabelText('Sample JSON')).toHaveValue('');
		expect(screen.getByText('No sample yet')).toBeInTheDocument();
	});
});
