import { describe, expect, it } from 'vitest';
import { pathKey } from '../src/importExport/jsonPayload';
import {
	canCopy,
	copyStatusView,
	copyText,
	expressionPlaceholder,
	fixedPositionNote,
	initialJsonReferenceState,
	jsonReferenceReducer,
	loopItemExpression,
	parseStatus,
	rootExpression,
	showActionNameInvalid,
	showBodyHint,
	type JsonReferenceAction,
	type JsonReferenceState,
} from '../src/workbench/jsonReferenceState';
import { composeSample, fixtureA1 } from './fixtures/jsonReferenceFixtures';

function run(...actions: JsonReferenceAction[]): JsonReferenceState {
	return actions.reduce(jsonReferenceReducer, initialJsonReferenceState);
}

const email = ['body', 'value', 0, 'Requester', 'Email'];
const parsedA1: JsonReferenceAction[] = [
	{ type: 'setActionName', value: 'Get items' },
	{ type: 'setText', value: fixtureA1 },
	{ type: 'parse' },
];

describe('JSON reference state', () => {
	it('starts on Action, Full output, an empty name and the bare format', () => {
		expect(initialJsonReferenceState).toMatchObject({
			outputFrom: 'action',
			shape: 'full',
			actionName: '',
			copyFormat: 'bare',
			copyStatus: { kind: 'idle' },
		});
		expect(parseStatus(initialJsonReferenceState)).toEqual({
			text: 'Nothing parsed yet',
			tone: 'muted',
		});
		expect(expressionPlaceholder(initialJsonReferenceState)).toBe(
			'Enter an action name',
		);
	});

	it('parses fixture A1, selects the root and expands it (FR-025)', () => {
		const state = run(...parsedA1);

		expect(parseStatus(state)).toEqual({
			text: 'Parsed · 25 values',
			tone: 'good',
		});
		expect(state.selectedPath).toEqual([]);
		expect(state.expanded).toEqual(new Set([pathKey([])]));
		expect(copyText(state)).toBe("outputs('Get_items')");
	});

	it('builds the spec reference for Email and notes the fixed index (user story 1, scenario 1)', () => {
		const state = run(...parsedA1, { type: 'select', path: email });

		expect(copyText(state)).toBe(
			"outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']",
		);
		expect(fixedPositionNote(state)).toBe(
			'Fixed position [0] reads that item only.',
		);
	});

	it('wraps the reference for the inline format (Appendix A case 23)', () => {
		const state = run(
			...parsedA1,
			{ type: 'select', path: email },
			{ type: 'setCopyFormat', value: 'inline' },
		);

		expect(copyText(state)).toBe(
			"@{outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']}",
		);
		expect(copyStatusView(state)).toEqual({ text: '', tone: 'muted' });
	});

	it('blocks Copy for a blank name and shows Action as the root (Appendix A case 24)', () => {
		const state = run(
			{ type: 'setText', value: fixtureA1 },
			{ type: 'parse' },
			{ type: 'setActionName', value: '   ' },
		);

		expect(canCopy(state)).toBe(false);
		expect(copyText(state)).toBeNull();
		expect(expressionPlaceholder(state)).toBe('Enter an action name');
		expect(rootExpression(state)).toBe("outputs('Action')");
		expect(rootExpression(state, 'body')).toBe("body('Action')");
		expect(showActionNameInvalid(state)).toBe(true);
	});

	it('marks a missing name invalid only after typing or parsing (FR-012)', () => {
		expect(showActionNameInvalid(initialJsonReferenceState)).toBe(false);
		expect(showActionNameInvalid(run({ type: 'parse' }))).toBe(true);
		expect(
			showActionNameInvalid(run({ type: 'setActionName', value: '' })),
		).toBe(true);
		expect(
			showActionNameInvalid(
				run({ type: 'setOutputFrom', value: 'trigger' }, { type: 'parse' }),
			),
		).toBe(false);
	});

	it('re-roots without re-parsing when the source changes (FR-016)', () => {
		const selected = run(
			...parsedA1,
			{ type: 'select', path: email },
			{ type: 'toggleExpanded', key: pathKey(['body']) },
		);
		const copied = jsonReferenceReducer(selected, { type: 'copySucceeded' });
		const trigger = jsonReferenceReducer(copied, {
			type: 'setOutputFrom',
			value: 'trigger',
		});

		expect(trigger.parsed).toBe(selected.parsed);
		expect(trigger.expanded).toBe(selected.expanded);
		expect(trigger.selectedPath).toBe(selected.selectedPath);
		expect(trigger.copyStatus).toEqual({ kind: 'idle' });
		expect(copyText(trigger)).toBe(
			"triggerOutputs()?['body']?['value'][0]?['Requester']?['Email']",
		);
		expect(
			copyText(
				jsonReferenceReducer(trigger, { type: 'setShape', value: 'body' }),
			),
		).toBe("triggerBody()?['body']?['value'][0]?['Requester']?['Email']");
	});

	it('keeps the action name when switching to Trigger and back (FR-011)', () => {
		const state = run(
			...parsedA1,
			{ type: 'setOutputFrom', value: 'trigger' },
			{ type: 'setOutputFrom', value: 'action' },
		);

		expect(state.actionName).toBe('Get items');
		expect(rootExpression(state)).toBe("outputs('Get_items')");
	});

	it('references a Compose output with Action and Full output (user story 1, scenario 4)', () => {
		const state = run(
			{ type: 'setActionName', value: 'Compose' },
			{ type: 'setText', value: composeSample },
			{ type: 'parse' },
			{ type: 'select', path: ['customer'] },
		);

		expect(copyText(state)).toBe("outputs('Compose')?['customer']");
	});

	it('hints at a top-level body key under Body only, but never changes the root (FR-015)', () => {
		const body = run(
			...parsedA1,
			{ type: 'setShape', value: 'body' },
			{ type: 'select', path: ['body'] },
		);

		expect(showBodyHint(body)).toBe(true);
		expect(copyText(body)).toBe("body('Get_items')?['body']");
		expect(
			showBodyHint(
				jsonReferenceReducer(body, { type: 'setShape', value: 'full' }),
			),
		).toBe(false);
	});

	it('marks the sample stale after an edit and keeps the old tree usable (FR-027)', () => {
		const edited = run(
			...parsedA1,
			{ type: 'select', path: email },
			{ type: 'setText', value: `${fixtureA1} ` },
		);

		expect(parseStatus(edited)).toEqual({
			text: 'Sample changed. Parse again to update.',
			tone: 'warn',
		});
		expect(copyText(edited)).toBe(
			"outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']",
		);
	});

	it('clears the tree and the selection when a parse fails (FR-026)', () => {
		const failed = run(
			...parsedA1,
			{ type: 'select', path: email },
			{ type: 'setText', value: '{' },
			{ type: 'parse' },
		);

		expect(failed.parsed).toBeNull();
		expect(failed.selectedPath).toEqual([]);
		expect(failed.error).toMatch(/^Not valid JSON: /);
		expect(parseStatus(failed)).toEqual({
			text: 'Could not parse',
			tone: 'danger',
		});
		expect(expressionPlaceholder(failed)).toBe(
			'Parse a sample and select a value',
		);
	});

	it('keeps a selection whose path survives a re-parse, and otherwise selects the root (FR-025)', () => {
		const kept = run(
			...parsedA1,
			{ type: 'select', path: ['statusCode'] },
			{ type: 'setText', value: '{"statusCode": 201}' },
			{ type: 'parse' },
		);
		const reset = run(
			...parsedA1,
			{ type: 'select', path: email },
			{ type: 'setText', value: '{"statusCode": 201}' },
			{ type: 'parse' },
		);

		expect(kept.selectedPath).toEqual(['statusCode']);
		expect(reset.selectedPath).toEqual([]);
	});

	it('keeps surviving expansion, drops the rest and hides revealed elements on re-parse (FR-025)', () => {
		const state = run(
			...parsedA1,
			{ type: 'toggleExpanded', key: pathKey(['body']) },
			{ type: 'toggleExpanded', key: pathKey(['headers']) },
			{ type: 'showAll', key: pathKey(['body', 'value']) },
			{ type: 'setText', value: '{"body": {"value": []}}' },
			{ type: 'parse' },
		);

		expect(state.expanded).toEqual(new Set([pathKey([]), pathKey(['body'])]));
		expect(state.showAll.size).toBe(0);
	});

	it('resets the copy status when the selection or the format changes (FR-055)', () => {
		const copied = jsonReferenceReducer(run(...parsedA1), {
			type: 'copySucceeded',
		});

		expect(copyStatusView(copied)).toEqual({
			text: 'Expression copied',
			tone: 'good',
		});
		expect(
			jsonReferenceReducer(copied, { type: 'select', path: ['statusCode'] })
				.copyStatus,
		).toEqual({ kind: 'idle' });
		expect(
			jsonReferenceReducer(copied, { type: 'setCopyFormat', value: 'inline' })
				.copyStatus,
		).toEqual({ kind: 'idle' });
	});

	it('reports a failed copy with its reason (FR-054)', () => {
		const failed = jsonReferenceReducer(run(...parsedA1), {
			type: 'copyFailed',
			reason: 'the host does not provide a clipboard API',
		});

		expect(copyStatusView(failed)).toEqual({
			text: 'Could not copy expression: the host does not provide a clipboard API',
			tone: 'danger',
		});
	});

	it('lists every index of the path in the fixed-position note', () => {
		const state = run(
			{ type: 'setActionName', value: 'Compose' },
			{ type: 'setText', value: composeSample },
			{ type: 'parse' },
			{ type: 'select', path: ['matrix', 0, 1] },
		);

		expect(copyText(state)).toBe("outputs('Compose')?['matrix'][0][1]");
		expect(fixedPositionNote(state)).toBe(
			'Fixed position [0][1] reads that item only.',
		);
	});

	it('keeps item() relative to the loop while the payload root names the source action', () => {
		const state = run(...parsedA1, { type: 'select', path: email });

		expect(copyText(state)).toBe(
			"outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']",
		);
		expect(loopItemExpression(state)).toBe("item()?['Requester']?['Email']");

		const renamedSource = jsonReferenceReducer(state, {
			type: 'setActionName',
			value: 'Another source',
		});
		expect(copyText(renamedSource)).toBe(
			"outputs('Another_source')?['body']?['value'][0]?['Requester']?['Email']",
		);
		expect(loopItemExpression(renamedSource)).toBe(
			"item()?['Requester']?['Email']",
		);
	});

	it('offers item() only for array selections, including trigger payloads', () => {
		const noIndex = run(...parsedA1, { type: 'select', path: ['statusCode'] });
		const trigger = run(
			{ type: 'setOutputFrom', value: 'trigger' },
			{ type: 'setText', value: fixtureA1 },
			{ type: 'parse' },
			{ type: 'select', path: email },
		);

		expect(loopItemExpression(noIndex)).toBeNull();
		expect(loopItemExpression(trigger)).toBe("item()?['Requester']?['Email']");
	});

	it('pasteAndParse auto-fills an empty action name with the placeholder and parses in one step', () => {
		const state = run({
			type: 'pasteAndParse',
			text: fixtureA1,
			defaultActionName: 'Action',
		});

		expect(state.actionName).toBe('Action');
		expect(state.parsed).not.toBeNull();
		expect(parseStatus(state)).toEqual({
			text: 'Parsed · 25 values',
			tone: 'good',
		});
		expect(copyText(state)).toBe("outputs('Action')");
	});

	it('pasteAndParse keeps an existing action name', () => {
		const state = run(
			{ type: 'setActionName', value: 'My Action' },
			{ type: 'pasteAndParse', text: fixtureA1, defaultActionName: 'Action' },
		);

		expect(state.actionName).toBe('My Action');
		expect(copyText(state)).toBe("outputs('My_Action')");
	});
});