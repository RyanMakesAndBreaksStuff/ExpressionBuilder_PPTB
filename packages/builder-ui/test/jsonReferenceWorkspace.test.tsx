// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
	cleanup,
	render,
	screen,
	within,
} from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JsonReferenceWorkspace } from '../src/workbench/JsonReferenceWorkspace';
import {
	composeSample,
	fixtureA1,
	triggerBodySample,
	triggerFullSample,
} from './fixtures/jsonReferenceFixtures';

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

function createAdapter(
	copy: PlatformAdapter['copyToClipboard'] = vi.fn(async () => undefined),
): PlatformAdapter {
	return {
		copyToClipboard: vi.fn(copy),
		notify: vi.fn(async () => undefined),
		getTheme: vi.fn(async () => 'light' as const),
		onThemeChanged: vi.fn(() => () => undefined),
		settings: {
			get: vi.fn(async () => null),
			set: vi.fn(async () => undefined),
			remove: vi.fn(async () => undefined),
		},
		getDataverseFields: vi.fn(async () => []),
	};
}

const EMAIL_REFERENCE =
	'outputs("Get_items")?["body"]?["value"][0]?["Requester"]?["Email"]';

const row = (name: RegExp) => screen.getByRole('treeitem', { name });
const expression = () => screen.getByLabelText('Reference expression');

async function pasteAndParse(
	user: UserEvent,
	sample: string,
	actionName?: string,
) {
	if (actionName !== undefined)
		await user.type(screen.getByLabelText('Action name'), actionName);
	await user.click(screen.getByLabelText('Sample JSON'));
	await user.paste(sample);
	await user.click(screen.getByRole('button', { name: 'Parse' }));
}

async function expand(user: UserEvent, name: RegExp) {
	await user.click(row(name).querySelector('[data-chevron]') as Element);
}

async function selectEmail(user: UserEvent) {
	await expand(user, /^body, object$/);
	await expand(user, /^value, array$/);
	await expand(user, /^\[0\], object$/);
	await expand(user, /^Requester, object$/);
	await user.click(row(/^Email, string/));
}

describe('JSON reference workspace', () => {
	it('builds, shows and copies the reference to Email (user story 1, scenarios 1 and 2)', async () => {
		const user = userEvent.setup();
		const adapter = createAdapter();
		render(<JsonReferenceWorkspace adapter={adapter} active />);

		await pasteAndParse(user, fixtureA1, 'Get items');
		expect(adapter.notify).toHaveBeenCalledWith(
			'Parsed · 25 values',
			'success',
		);
		expect(screen.getByText('25 values')).toBeInTheDocument();

		await selectEmail(user);
		expect(expression()).toHaveTextContent(EMAIL_REFERENCE);
		expect(
			screen.getByRole('navigation', { name: 'Selected path' }),
		).toHaveTextContent('outputs("Get_items")');
		expect(
			screen.getByText(
				'Fixed position [0]: reads that item only.',
			),
		).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Copy' }));
		expect(adapter.copyToClipboard).toHaveBeenCalledWith(EMAIL_REFERENCE);
		expect(adapter.notify).toHaveBeenLastCalledWith('Expression copied', 'success');
	});

	it('notifies the host on copy success (FR-053)', async () => {
		const user = userEvent.setup();
		const adapter = createAdapter();
		render(<JsonReferenceWorkspace adapter={adapter} active />);
		await pasteAndParse(user, fixtureA1, 'Get items');

		await user.click(screen.getByRole('button', { name: 'Copy' }));
		expect(adapter.notify).toHaveBeenLastCalledWith('Expression copied', 'success');
	});

	it('references containers, nulls and the root (user story 1, scenario 3)', async () => {
		const user = userEvent.setup();
		const adapter = createAdapter();
		render(<JsonReferenceWorkspace adapter={adapter} active />);
		await pasteAndParse(user, fixtureA1, 'Get items');
		await expand(user, /^body, object$/);

		for (const [name, reference] of [
			[/^value, array$/, 'outputs("Get_items")?["body"]?["value"]'],
			[
				/^@odata\.nextLink, null, null$/,
				'outputs("Get_items")?["body"]?["@odata.nextLink"]',
			],
			[/^outputs\("Get_items"\), object$/, 'outputs("Get_items")'],
		] as const) {
			await user.click(row(name));
			expect(expression()).toHaveTextContent(reference);
			await user.click(screen.getByRole('button', { name: 'Copy' }));
			expect(adapter.copyToClipboard).toHaveBeenLastCalledWith(reference);
		}
	});

	it('references a Compose output with Action and Full output (user story 1, scenario 4)', async () => {
		const user = userEvent.setup();
		render(<JsonReferenceWorkspace adapter={createAdapter()} active />);
		await pasteAndParse(user, composeSample, 'Compose');

		await user.click(row(/^customer, object$/));
		expect(expression()).toHaveTextContent('outputs("Compose")?["customer"]');
	});

	it('copies the inline form (user story 1, scenario 5)', async () => {
		const user = userEvent.setup();
		const adapter = createAdapter();
		render(<JsonReferenceWorkspace adapter={adapter} active />);
		await pasteAndParse(user, fixtureA1, 'Get items');
		await selectEmail(user);

		await user.click(screen.getByRole('button', { name: 'Copy @{}' }));
		expect(adapter.copyToClipboard).toHaveBeenCalledWith(
			`@{${EMAIL_REFERENCE}}`,
		);
	});

	it('shows and copies item() and items() loop references for array selections', async () => {
		const user = userEvent.setup();
		const adapter = createAdapter();
		render(<JsonReferenceWorkspace adapter={adapter} active />);
		await pasteAndParse(user, fixtureA1, 'Get items');
		await selectEmail(user);

		expect(screen.getByLabelText('Loop item() reference')).toHaveTextContent(
			'item()?["Requester"]?["Email"]',
		);
		expect(screen.getByLabelText('Loop items() reference')).toHaveTextContent(
			'items("Get_items")?["Requester"]?["Email"]',
		);

		await user.click(screen.getByRole('button', { name: 'Copy item()' }));
		expect(adapter.copyToClipboard).toHaveBeenLastCalledWith(
			'item()?["Requester"]?["Email"]',
		);
		await user.click(screen.getByRole('button', { name: 'Copy items()' }));
		expect(adapter.copyToClipboard).toHaveBeenLastCalledWith(
			'items("Get_items")?["Requester"]?["Email"]',
		);
	});

	it('hints at a top-level body key under Body only and still roots at body() (user story 1, scenario 6)', async () => {
		const user = userEvent.setup();
		render(<JsonReferenceWorkspace adapter={createAdapter()} active />);
		await pasteAndParse(user, fixtureA1, 'Get items');

		await user.click(screen.getByRole('radio', { name: /Action.*Body only/ }));
		expect(screen.getByText(/This sample has a top-level/)).toHaveTextContent(
			'This sample has a top-level body key. If you pasted the full output, choose Full output.',
		);
		await user.click(row(/^body, object$/));
		expect(expression()).toHaveTextContent('body("Get_items")?["body"]');
	});

	it('references trigger payloads without an action name (user story 2)', async () => {
		const user = userEvent.setup();
		render(<JsonReferenceWorkspace adapter={createAdapter()} active />);

		await user.click(
			screen.getByRole('radio', { name: /Trigger.*Full output/ }),
		);
		expect(screen.queryByLabelText('Action name')).not.toBeInTheDocument();
		expect(
			screen.getByRole('radio', { name: /Trigger.*Full output/ }),
		).toHaveAccessibleDescription('triggerOutputs()');
		expect(
			screen.getByRole('radio', { name: /Trigger.*Body only/ }),
		).toHaveAccessibleDescription('triggerBody()');

		await user.click(screen.getByRole('radio', { name: /Trigger.*Body only/ }));
		await pasteAndParse(user, triggerBodySample);
		await expand(user, /^customer, object$/);
		await user.click(row(/^name, string/));
		expect(expression()).toHaveTextContent(
			'triggerBody()?["customer"]?["name"]',
		);

		await user.clear(screen.getByLabelText('Sample JSON'));
		await user.click(
			screen.getByRole('radio', { name: /Trigger.*Full output/ }),
		);
		await pasteAndParse(user, triggerFullSample);
		await expand(user, /^headers, object$/);
		await user.click(row(/^content-type, string/));
		expect(expression()).toHaveTextContent(
			'triggerOutputs()?["headers"]?["content-type"]',
		);
		expect(screen.getByRole('button', { name: 'Copy' })).toBeEnabled();
	});

	it('asks for a sample before parsing (user story 4, scenario 1)', async () => {
		const user = userEvent.setup();
		render(<JsonReferenceWorkspace adapter={createAdapter()} active />);

		await user.click(screen.getByRole('button', { name: 'Parse' }));
		expect(screen.getByRole('alert')).toHaveTextContent(
			'Paste a sample before parsing.',
		);
	});

	it('reports invalid JSON and clears the tree (user story 4, scenario 2)', async () => {
		const user = userEvent.setup();
		render(<JsonReferenceWorkspace adapter={createAdapter()} active />);
		await pasteAndParse(user, fixtureA1, 'Get items');

		await user.clear(screen.getByLabelText('Sample JSON'));
		await pasteAndParse(user, "{'a': 1,}");

		expect(screen.getByRole('alert')).toHaveTextContent(/^Not valid JSON: /);
		expect(screen.queryByRole('tree')).not.toBeInTheDocument();
		expect(screen.getByText('No sample yet')).toBeInTheDocument();
		expect(screen.getByLabelText('Sample JSON')).toHaveAttribute(
			'aria-invalid',
			'true',
		);
	});

	it('shows the limit message and no tree (user story 4, scenario 3)', async () => {
		const user = userEvent.setup();
		render(<JsonReferenceWorkspace adapter={createAdapter()} active />);

		await pasteAndParse(user, JSON.stringify(new Array(10_000).fill(0)));
		expect(screen.getByRole('alert')).toHaveTextContent(
			'Sample has more than 10,000 values. Trim it to the part you need.',
		);
		expect(screen.queryByRole('tree')).not.toBeInTheDocument();
	});

	it('keeps the old tree after an edit and says the sample changed (user story 4, scenario 4)', async () => {
		const user = userEvent.setup();
		render(<JsonReferenceWorkspace adapter={createAdapter()} active />);
		await pasteAndParse(user, fixtureA1, 'Get items');

		await user.type(screen.getByLabelText('Sample JSON'), ' ');
		expect(screen.getByRole('tree')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Copy' })).toBeEnabled();
	});

	it('blocks Copy and flags the field when the action name is blank (user story 4, scenario 5)', async () => {
		const user = userEvent.setup();
		render(<JsonReferenceWorkspace adapter={createAdapter()} active />);
		const name = screen.getByLabelText('Action name');

		expect(name).toHaveAccessibleDescription(
			'As shown in the flow designer. Spaces become underscores.',
		);
		expect(name).toHaveAttribute('aria-invalid', 'false');
		await pasteAndParse(user, fixtureA1); // paste auto-fills name to "Action"
		await user.clear(name); // clear to reach the blank-name state

		expect(name).toHaveAttribute('aria-invalid', 'true');
		expect(name).toHaveAccessibleDescription(
			'Enter the action name to build the reference.',
		);
		expect(row(/^outputs\("Action"\), object$/)).toBeInTheDocument();
		expect(
			screen.getByRole('radio', { name: /Action.*Full output/ }),
		).toBeChecked();
		expect(
			screen.getByRole('radio', { name: /Action.*Full output/ }),
		).toHaveAccessibleDescription('outputs("Action")');
	});

	it('never claims a copy the host refused (user story 4, scenario 6)', async () => {
		const user = userEvent.setup();
		const adapter = createAdapter(async () => {
			throw new Error('the host does not provide a clipboard API');
		});
		render(<JsonReferenceWorkspace adapter={adapter} active />);
		await pasteAndParse(user, fixtureA1, 'Get items');

		await user.click(screen.getByRole('button', { name: 'Copy' }));
		expect(adapter.notify).toHaveBeenLastCalledWith(
			'Could not copy expression: the host does not provide a clipboard API',
			'error',
		);
	});

	it('labels its panels and fields for assistive technology (FR-082, FR-084)', () => {
		render(<JsonReferenceWorkspace adapter={createAdapter()} active />);

		expect(
			screen
				.getAllByRole('heading', { level: 2 })
				.map((heading) => heading.textContent),
		).toEqual(['Source', 'Payload', 'Reference']);
		expect(
			screen.getByRole('radiogroup', { name: 'Reference root' }),
		).toBeInTheDocument();
		expect(
			within(screen.getByRole('region', { name: 'Payload' })).getByText(
				'No sample yet',
			),
		).toBeInTheDocument();
	});

	it('turns off spell checking, autocorrect, capitalisation and autocomplete (FR-062)', () => {
		render(<JsonReferenceWorkspace adapter={createAdapter()} active />);

		for (const field of [
			screen.getByLabelText('Action name'),
			screen.getByLabelText('Sample JSON'),
		]) {
			expect(field).toHaveAttribute('spellcheck', 'false');
			expect(field).toHaveAttribute('autocorrect', 'off');
			expect(field).toHaveAttribute('autocapitalize', 'off');
			expect(field).toHaveAttribute('autocomplete', 'off');
		}
	});
});
