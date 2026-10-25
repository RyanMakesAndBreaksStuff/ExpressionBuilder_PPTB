// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExpressionBuilderShell } from '../src/app/ExpressionBuilderShell';
import { sampleDocument } from '../src/app/sampleData';
import { fixtureA1 } from './fixtures/jsonReferenceFixtures';

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	workspaceMount.key = 0;
});

const workspaceMount = vi.hoisted(() => ({ key: 0 }));

vi.mock('../src/workbench/JsonReferenceWorkspace', async (importOriginal) => {
	const actual = await importOriginal<
		typeof import('../src/workbench/JsonReferenceWorkspace')
	>();
	return {
		...actual,
		JsonReferenceWorkspace: (
			props: Parameters<typeof actual.JsonReferenceWorkspace>[0],
		) => <actual.JsonReferenceWorkspace key={workspaceMount.key} {...props} />,
	};
});

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

const screenTab = (label: string) =>
	within(screen.getByRole('tablist', { name: 'Screen' })).getByRole('tab', { name: label });

async function goTo(user: UserEvent, label: string) {
	await user.click(screenTab(label));
}

const sampleBox = () =>
	screen.getByRole('textbox', { name: 'Sample JSON', exact: true });

function editSample(text: string) {
	fireEvent.input(sampleBox(), {
		target: { value: text },
	});
}

function pasteSample(text: string) {
	fireEvent.input(sampleBox(), {
		target: { value: text },
		inputType: 'insertFromPaste',
	});
}

async function advanceParse(ms = 600) {
	await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

async function exerciseJsonReference(user: UserEvent) {
	await goTo(user, 'JSON reference');
	await user.type(screen.getByLabelText('Action name'), 'Get items');
	await user.click(sampleBox());
	await user.paste(fixtureA1);
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
		expect(sampleBox()).toHaveValue(fixtureA1);
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
		expect(screenTab('Trigger / Filter')).toHaveAttribute('aria-selected', 'true');
		await goTo(user, 'JSON reference');
		expect(sampleBox()).toHaveValue('');
		expect(screen.getByText('No sample yet')).toBeInTheDocument();
	});

	it('announces valid auto changes at 600ms and keeps formatting quiet', async () => {
		const user = userEvent.setup();
		const adapter = createAdapter();
		render(<ExpressionBuilderShell adapter={adapter} />);
		await goTo(user, 'JSON reference');
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		editSample('{"a":1}');
		await advanceParse(599);
		expect(adapter.notify).not.toHaveBeenCalled();
		await advanceParse(1);
		expect(adapter.notify).toHaveBeenCalledExactlyOnceWith('Parsed · 2 values', 'success');
		editSample('{ "a": 1 }');
		await advanceParse();
		expect(adapter.notify).toHaveBeenCalledTimes(1);
		// Shown in the editor status and on the payload card.
		expect(screen.getAllByText('Parsed · 2 values')).toHaveLength(2);
		editSample('{"a":2}');
		await advanceParse();
		expect(adapter.notify).toHaveBeenCalledTimes(2);
		expect(adapter.notify).toHaveBeenLastCalledWith('Payload updated · 2 values', 'success');
		expect(screen.getByRole('treeitem', { name: /^a, number, 2$/ })).toBeInTheDocument();
	});

	it('retains good output during invalid auto input without notifying on recovery', async () => {
		const user = userEvent.setup();
		const adapter = createAdapter();
		render(<ExpressionBuilderShell adapter={adapter} />);
		await goTo(user, 'JSON reference');
		pasteSample('{"a":1}');
		await user.click(screen.getByRole('treeitem', { name: /^a, number, 1$/ }));
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		editSample('{"a":');
		await advanceParse();
		expect(screen.getByRole('treeitem', { name: /^a, number, 1$/ })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getAllByText(
			'Could not parse. Showing last successful payload.',
		)).toHaveLength(2);
		expect(adapter.notify).toHaveBeenCalledTimes(1);
		editSample('{"a":1}');
		await advanceParse();
		expect(sampleBox()).toHaveAttribute('aria-invalid', 'false');
		expect(adapter.notify).toHaveBeenCalledTimes(1);
	});

	it('announces each successful paste once and cancels pending automatic work', async () => {
		const user = userEvent.setup();
		const adapter = createAdapter();
		render(<ExpressionBuilderShell adapter={adapter} />);
		await goTo(user, 'JSON reference');
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		editSample('{"a":0}');
		await advanceParse(300);
		pasteSample('{"a":1}');
		expect(adapter.notify).toHaveBeenCalledExactlyOnceWith('Parsed · 2 values', 'success');
		await advanceParse();
		expect(adapter.notify).toHaveBeenCalledTimes(1);
		pasteSample('{"a":1}');
		expect(adapter.notify).toHaveBeenCalledTimes(2);
		expect(adapter.notify).toHaveBeenLastCalledWith('Parsed · 2 values', 'success');
	});

	it('does not replay across a real workspace remount or adapter replacement in StrictMode', async () => {
		const user = userEvent.setup();
		const adapter = createAdapter();
		const tree = (target: PlatformAdapter) => (
			<StrictMode><ExpressionBuilderShell adapter={target} /></StrictMode>
		);
		const view = render(tree(adapter));
		await goTo(user, 'JSON reference');
		pasteSample('{"a":1}');
		expect(adapter.notify).toHaveBeenCalledTimes(1);
		await user.click(screen.getByRole('button', { name: '+ New payload' }));
		pasteSample('{"b":1}');
		expect(adapter.notify).toHaveBeenCalledTimes(2);
		workspaceMount.key += 1;
		view.rerender(tree(adapter));
		expect(adapter.notify).toHaveBeenCalledTimes(2);
		const replacement = createAdapter();
		view.rerender(tree(replacement));
		expect(replacement.notify).not.toHaveBeenCalled();
		await user.click(screen.getByRole('tab', { name: /^Action, payload 1$/ }));
		expect(replacement.notify).not.toHaveBeenCalled();
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		editSample('{"a":2}');
		await advanceParse();
		expect(replacement.notify).toHaveBeenCalledExactlyOnceWith(
			'Payload updated · 2 values', 'success',
		);
	});

	it('cancels automatic work while inactive and resumes an unvalidated edit on return', async () => {
		const user = userEvent.setup();
		const adapter = createAdapter();
		render(<ExpressionBuilderShell adapter={adapter} />);
		await goTo(user, 'JSON reference');
		pasteSample('{"a":1}');
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		editSample('{"a":2}');
		await advanceParse(300);
		fireEvent.click(screenTab('Trigger / Filter'));
		await advanceParse();
		expect(adapter.notify).toHaveBeenCalledTimes(1);
		fireEvent.click(screenTab('JSON reference'));
		await advanceParse(599);
		expect(adapter.notify).toHaveBeenCalledTimes(1);
		await advanceParse(1);
		expect(adapter.notify).toHaveBeenCalledTimes(2);
	});

	it('cancels pending validation on switching and restarts on return', async () => {
		const user = userEvent.setup();
		const adapter = createAdapter();
		render(<ExpressionBuilderShell adapter={adapter} />);

		await goTo(user, 'JSON reference');
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		editSample('{"a":1}');
		await advanceParse(300);

		fireEvent.click(screen.getByRole('button', {
			name: '+ New payload',
			exact: true,
		}));
		await advanceParse(600);
		expect(screen.queryByRole('tree')).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole('tab', {
			name: /^Payload 1, payload 1$/,
		}));
		await advanceParse(599);
		expect(screen.queryByRole('tree')).not.toBeInTheDocument();

		await advanceParse(1);
		expect(screen.getByRole('tree')).toBeInTheDocument();
		expect(adapter.notify).toHaveBeenCalledWith(
			'Parsed · 2 values',
			'success',
		);
	});

	it('drops stale search results once a payload changes', async () => {
		const user = userEvent.setup();
		render(<ExpressionBuilderShell adapter={createAdapter()} />);
		await goTo(user, 'JSON reference');
		pasteSample('{"email":1}');
		const search = screen.getByRole('combobox', { name: 'Search all payloads' });
		await user.type(search, 'email');
		expect(screen.getAllByRole('option')).toHaveLength(1);
		pasteSample('{"other":1}');
		expect(screen.queryByRole('option')).not.toBeInTheDocument();
		expect(screen.getByText('No matches in parsed payloads.')).toBeInTheDocument();
	});

	it('keeps inserted Functions argument text after the JSON source is renamed, re-rooted or closed', async () => {
		const user = userEvent.setup();
		render(<ExpressionBuilderShell adapter={createAdapter()} />);
		await goTo(user, 'JSON reference');
		await user.type(screen.getByLabelText('Action name'), 'Get items');
		pasteSample('{"a":1}');

		await goTo(user, 'Functions');
		await user.click(screen.getByRole('button', { name: 'Get items 1' }));
		const text1 = screen.getByLabelText('text1');
		await user.click(text1);
		await user.dblClick(screen.getByRole('button', { name: 'a' }));
		const inserted = "outputs('Get_items')?['a']";
		expect(text1).toHaveValue(inserted);

		await goTo(user, 'JSON reference');
		await user.clear(screen.getByLabelText('Action name'));
		await user.type(screen.getByLabelText('Action name'), 'Renamed');
		await goTo(user, 'Functions');
		expect(text1).toHaveValue(inserted);
		expect(screen.getByRole('button', { name: 'Renamed 1' })).toBeInTheDocument();

		await goTo(user, 'JSON reference');
		await user.click(screen.getByRole('radio', { name: /Trigger.*Full output/ }));
		await goTo(user, 'Functions');
		expect(text1).toHaveValue(inserted);
		expect(screen.getByRole('button', { name: 'a' })).toHaveAccessibleDescription("triggerOutputs()?['a']");

		await goTo(user, 'JSON reference');
		await user.click(screen.getByRole('button', { name: '+ New payload' }));
		await user.click(screen.getByRole('button', { name: /^Close Trigger, payload 1$/ }));
		await goTo(user, 'Functions');
		expect(text1).toHaveValue(inserted);
		expect(screen.getByRole('button', { name: 'Parsed Value 0' })).toBeInTheDocument();
	});
});
