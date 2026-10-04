import { describe, expect, it } from 'vitest';
import {
	argKind,
	argTypeLabel,
	deriveFunctions,
	functionsReducer,
	initialFunctionsState,
	insertTarget,
	navGroups,
	type FunctionsAction,
	type FunctionsState,
} from '../src/workbench/functionsState';

function run(...actions: FunctionsAction[]): FunctionsState {
	return actions.reduce(functionsReducer, initialFunctionsState);
}

/** concat as the mock has it: text1 = reference, text2 = ' - ', text3 empty. */
const mock = run(
	{ type: 'setArg', name: 'text1', value: "triggerBody()?['Name']" },
	{ type: 'setArg', name: 'text2', value: "' - '" },
);

describe('functions state', () => {
	it('opens on String with concat selected (FR-10, AC-10.1)', () => {
		expect(initialFunctionsState.selectedFunction).toBe('concat');
		expect([...initialFunctionsState.expandedGroups]).toEqual(['String']);
		expect(deriveFunctions(initialFunctionsState).fn.name).toBe('concat');
	});

	it('counts and filters nav groups (FR-11, AC-11.1)', () => {
		const all = navGroups(initialFunctionsState);
		expect(all.map((group) => group.group))
			.toEqual(['String', 'Collection', 'Logical', 'Math', 'Date and time']);
		expect(all[0].total).toBe(20);
		expect(all[0].expanded).toBe(true);
		expect(all[1].expanded).toBe(false);

		const filtered = navGroups(run({ type: 'setSearch', value: 'upper' }));
		expect(filtered).toHaveLength(1);
		expect(filtered[0].group).toBe('String');
		expect(filtered[0].functions.map((fn) => fn.name)).toEqual(['toUpper']);
		expect(filtered[0].expanded).toBe(true);

		expect(navGroups(run({ type: 'setSearch', value: '' }))).toHaveLength(5);
	});

	it('builds a slot per argument, required first (FR-12, AC-12.1)', () => {
		const state = run({ type: 'selectFunction', name: 'substring' });
		expect(deriveFunctions(state).slots.map((slot) => [slot.name, slot.required]))
			.toEqual([['text', true], ['startIndex', true], ['length', false]]);
	});

	it('offers one more slot once a variadic argument is filled (D9)', () => {
		const state = functionsReducer(mock, { type: 'setArg', name: 'text3', value: "'x'" });
		expect(deriveFunctions(state).slots.map((slot) => slot.name))
			.toEqual(['text1', 'text2', 'text3', 'text4']);
	});

	it('wraps the named argument and keeps the selection (FR-15, AC-15.1)', () => {
		const state = run(
			{ type: 'setArg', name: 'text1', value: "triggerBody()?['Name']" },
			{ type: 'wrapArg', arg: 'text1', fn: 'toUpper' },
		);
		expect(state.selectedFunction).toBe('concat');
		expect(state.args.text1).toBe("toUpper(triggerBody()?['Name'])");
		expect(state.lastFocusedArg).toBe('text1');
	});

	// An earlier focus that has since ended must not turn the next pick into a
	// wrap. Whether focus is live is the nav's call, made at mousedown (T10).
	it('selects a function even after an argument was focused (FR-15)', () => {
		const state = run(
			{ type: 'setArg', name: 'text1', value: "'a'" },
			{ type: 'focusArg', name: 'text1' },
			{ type: 'selectFunction', name: 'toUpper' },
		);
		expect(state.selectedFunction).toBe('toUpper');
		expect(state.args).toEqual({});
		expect(state.lastFocusedArg).toBeNull();
	});

	it('reports validity and the card counts (FR-17, FR-18, AC-17.1, AC-18.1)', () => {
		expect(deriveFunctions(mock)).toMatchObject({
			valid: true, error: null, requiredSet: 2, requiredTotal: 2,
			setCount: 2, shownCount: 3, optionalEmpty: 1,
		});

		const cleared = deriveFunctions(
			functionsReducer(mock, { type: 'setArg', name: 'text2', value: '' }),
		);
		expect(cleared.valid).toBe(false);
		expect(cleared.error).toBe('text2 is required.');
		expect(cleared.requiredSet).toBe(1);
	});

	it('surfaces a parse error against its argument (FR-13, FR-17)', () => {
		const derived = deriveFunctions(
			functionsReducer(mock, { type: 'setArg', name: 'text2', value: 'Ada' }),
		);
		expect(derived.error).toBe("text2: Wrap text in single quotes: 'Ada'.");
	});

	it('rejects a gap before a filled argument (FR-20)', () => {
		const state = run(
			{ type: 'selectFunction', name: 'substring' },
			{ type: 'setArg', name: 'text', value: "'abc'" },
			{ type: 'setArg', name: 'length', value: '2' },
		);
		expect(deriveFunctions(state).error).toBe('startIndex is required.');
	});

	it('builds the expression and its wrapped form (FR-20, AC-20.1)', () => {
		const derived = deriveFunctions(mock);
		expect(derived.expression).toBe("concat(triggerBody()?['Name'], ' - ')");
		expect(derived.wrapped).toBe("@{concat(triggerBody()?['Name'], ' - ')}");
	});

	it('drops trailing empty optionals from the expression (FR-20)', () => {
		expect(deriveFunctions(run({ type: 'selectFunction', name: 'utcNow' })).expression)
			.toBe('utcNow()');
	});

	it('labels the breadcrumb by argument kind (FR-19, AC-19.1)', () => {
		expect(deriveFunctions(mock).crumbs).toEqual([
			{ label: 'concat', tone: 'fn' },
			{ label: 'JSON reference', tone: 'ref' },
			{ label: 'text', tone: 'value' },
		]);
	});

	it('shows a single error crumb when invalid (FR-19)', () => {
		const derived = deriveFunctions(
			functionsReducer(mock, { type: 'setArg', name: 'text2', value: 'Ada' }),
		);
		expect(derived.crumbs).toEqual([
			{ label: 'concat', tone: 'fn' },
			{ label: 'error', tone: 'error' },
		]);
	});

	it('classifies a slot for its input color (FR-14)', () => {
		const slots = deriveFunctions(mock).slots;
		expect(argKind(slots[0])).toBe('reference');
		expect(argKind(slots[1])).toBe('literal');
		expect(argKind(slots[2])).toBe('empty');
		const bad = deriveFunctions(
			functionsReducer(mock, { type: 'setArg', name: 'text2', value: 'Ada' }),
		).slots[1];
		expect(argKind(bad)).toBe('invalid');
	});

	it('inserts a reference into the focused argument, else the first empty one (FR-22, AC-22.1)', () => {
		const focusedText2 = functionsReducer(mock, { type: 'focusArg', name: 'text2' });
		expect(insertTarget(focusedText2)).toBe('text2');
		const focused = functionsReducer(focusedText2, {
			type: 'insertReference',
			expression: "triggerBody()?['Other']",
		});
		expect(focused.args.text2).toBe("triggerBody()?['Other']");

		expect(insertTarget(initialFunctionsState)).toBe('text1');
		const unfocused = functionsReducer(initialFunctionsState, {
			type: 'insertReference',
			expression: "triggerBody()?['Name']",
		});
		expect(unfocused.args.text1).toBe("triggerBody()?['Name']");
		expect(unfocused.lastFocusedArg).toBe('text1');
	});

	it('labels each argument type, shortening integer to INT', () => {
		expect(argTypeLabel('string')).toBe('STRING');
		expect(argTypeLabel('integer')).toBe('INT');
		expect(argTypeLabel('number')).toBe('NUMBER');
		expect(argTypeLabel('boolean')).toBe('BOOLEAN');
		expect(argTypeLabel('any')).toBe('ANY');
		expect(argTypeLabel('collection')).toBe('COLLECTION');
		expect(argTypeLabel('object')).toBe('OBJECT');
		expect(argTypeLabel('timestamp')).toBe('TIMESTAMP');
	});

	it('copies a timestamp sample onto its slot and leaves other slots without one', () => {
		const addDays = deriveFunctions(run({ type: 'selectFunction', name: 'addDays' })).slots;
		expect(addDays.map((slot) => [slot.name, slot.sample])).toEqual([
			['timestamp', '2018-03-15T00:00:00Z'],
			['days', undefined],
			['format', undefined],
		]);
		const substring = deriveFunctions(run({ type: 'selectFunction', name: 'substring' })).slots;
		expect(substring.every((slot) => slot.sample === undefined)).toBe(true);
	});

	it('clears arguments and focus when the selection changes', () => {
		const state = functionsReducer(mock, { type: 'selectFunction', name: 'toUpper' });
		expect(state.args).toEqual({});
		expect(state.lastFocusedArg).toBeNull();
	});
});
