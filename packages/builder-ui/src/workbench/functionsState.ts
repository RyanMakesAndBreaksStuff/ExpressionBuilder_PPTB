import {
	FUNCTION_CATALOG,
	FUNCTION_GROUPS,
	findFunction,
	parseArgument,
	type ArgType,
	type CatalogFunction,
	type FunctionGroup,
	type ParseArgumentResult,
} from '@ryanmakes/eb_engine';

export type CopyFormat = 'expression' | 'wrapped';

/** Everything the Functions screen holds. In memory only: nothing persists (FR-4). */
export interface FunctionsState {
	search: string;
	expandedGroups: ReadonlySet<FunctionGroup>;
	parsedValueExpanded: boolean;
	selectedFunction: string;
	/** Argument values by name, for the selected function only. */
	args: Readonly<Record<string, string>>;
	/** Last argument the user focused; Parsed Value inserts here (FR-22). */
	lastFocusedArg: string | null;
	copyFormat: CopyFormat;
	copyState: 'idle' | 'copied';
}

export type FunctionsAction =
	| { type: 'setSearch'; value: string }
	| { type: 'toggleGroup'; group: FunctionGroup }
	| { type: 'toggleParsedValue' }
	| { type: 'selectFunction'; name: string }
	/** FR-15: the caller saw `arg` focused when the pick of `fn` began. */
	| { type: 'wrapArg'; arg: string; fn: string }
	| { type: 'setArg'; name: string; value: string }
	| { type: 'focusArg'; name: string }
	| { type: 'insertReference'; expression: string }
	| { type: 'setCopyFormat'; value: CopyFormat }
	| { type: 'copySucceeded' }
	| { type: 'resetCopyState' };

export const initialFunctionsState: FunctionsState = {
	search: '',
	expandedGroups: new Set<FunctionGroup>(['String']),
	parsedValueExpanded: false,
	selectedFunction: 'concat',
	args: {},
	lastFocusedArg: null,
	copyFormat: 'expression',
	copyState: 'idle',
};

export function functionsReducer(state: FunctionsState, action: FunctionsAction): FunctionsState {
	switch (action.type) {
		case 'setSearch':
			return { ...state, search: action.value };

		case 'toggleGroup': {
			const expandedGroups = new Set(state.expandedGroups);
			if (!expandedGroups.delete(action.group)) expandedGroups.add(action.group);
			return { ...state, expandedGroups };
		}

		case 'toggleParsedValue':
			return { ...state, parsedValueExpanded: !state.parsedValueExpanded };

		// lastFocusedArg outlives the focus itself (FR-22 needs it after a blur), so
		// it cannot decide a wrap; the nav dispatches wrapArg instead (FR-15).
		case 'selectFunction':
			if (action.name === state.selectedFunction) return state;
			return {
				...state,
				selectedFunction: action.name,
				args: {},
				lastFocusedArg: null,
				copyState: 'idle',
			};

		case 'wrapArg': {
			const current = state.args[action.arg] ?? '';
			return {
				...state,
				args: { ...state.args, [action.arg]: `${action.fn}(${current})` },
				lastFocusedArg: action.arg,
				copyState: 'idle',
			};
		}

		case 'setArg':
			return { ...state, args: { ...state.args, [action.name]: action.value }, copyState: 'idle' };

		case 'focusArg':
			return { ...state, lastFocusedArg: action.name };

		case 'insertReference': {
			const target = insertTarget(state);
			if (target === null) return state;
			return {
				...state,
				args: { ...state.args, [target]: action.expression },
				lastFocusedArg: target,
				copyState: 'idle',
			};
		}

		case 'setCopyFormat':
			return { ...state, copyFormat: action.value, copyState: 'idle' };

		case 'copySucceeded':
			return { ...state, copyState: 'copied' };

		case 'resetCopyState':
			return { ...state, copyState: 'idle' };

		default:
			return state;
	}
}

function selectedFunctionOf(state: FunctionsState): CatalogFunction {
	return findFunction(state.selectedFunction) ?? FUNCTION_CATALOG[0];
}

/**
 * Where Parsed Value inserts (FR-22): the last-focused argument, else the
 * first empty one. Exported so the workspace can return focus to it.
 */
export function insertTarget(state: FunctionsState): string | null {
	if (state.lastFocusedArg !== null) return state.lastFocusedArg;
	const slots = buildSlots(selectedFunctionOf(state), state.args);
	return slots.find((slot) => slot.value.trim() === '')?.name ?? slots[0]?.name ?? null;
}

export interface ArgumentSlot {
	name: string;
	type: ArgType;
	required: boolean;
	value: string;
	parsed: ParseArgumentResult;
}

/**
 * Declared arguments, plus one more empty slot after a filled variadic one so
 * another can always be added (D9). Required arguments come first because the
 * catalog already orders them that way.
 */
function buildSlots(fn: CatalogFunction, args: Readonly<Record<string, string>>): ArgumentSlot[] {
	const slots = fn.args.map((arg) => slotFor(arg.name, arg.type, arg.required, args));

	const tail = fn.args.at(-1);
	if (tail?.variadic === true) {
		// `text3` -> text4, text5 … while the one before it is filled.
		const base = tail.name.replace(/\d+$/, '');
		let index = Number.parseInt(tail.name.slice(base.length), 10);
		if (!Number.isFinite(index)) index = fn.args.length;
		while ((args[`${base}${index}`] ?? '').trim() !== '') {
			index += 1;
			slots.push(slotFor(`${base}${index}`, tail.type, false, args));
		}
	}

	return slots;
}

function slotFor(
	name: string,
	type: ArgType,
	required: boolean,
	args: Readonly<Record<string, string>>,
): ArgumentSlot {
	const value = args[name] ?? '';
	return { name, type, required, value, parsed: parseArgument(value) };
}

/** Drives the input's `data-kind`, and so its color (FR-14). */
export function argKind(slot: ArgumentSlot): 'empty' | 'literal' | 'reference' | 'invalid' {
	if (slot.value.trim() === '') return 'empty';
	if (!slot.parsed.ok) return 'invalid';
	return slot.parsed.value.kind === 'reference' ? 'reference' : 'literal';
}

export interface NavGroup {
	group: FunctionGroup;
	/** Functions after the search filter. */
	functions: CatalogFunction[];
	/** Functions in the group before filtering, for the count badge. */
	total: number;
	expanded: boolean;
}

/** Nav groups; a search hides empty groups and expands matching ones (FR-11). */
export function navGroups(state: FunctionsState): NavGroup[] {
	const needle = state.search.trim().toLowerCase();
	return FUNCTION_GROUPS.flatMap((group) => {
		const all = FUNCTION_CATALOG.filter((fn) => fn.group === group);
		const functions = needle === ''
			? all
			: all.filter((fn) => fn.name.toLowerCase().includes(needle));
		if (functions.length === 0) return [];
		return [{
			group,
			functions,
			total: all.length,
			expanded: needle === '' ? state.expandedGroups.has(group) : true,
		}];
	});
}

export type CrumbTone = 'fn' | 'ref' | 'value' | 'error';

export interface FunctionsDerived {
	fn: CatalogFunction;
	slots: ArgumentSlot[];
	valid: boolean;
	/** First problem found, shown on the status card (FR-17). */
	error: string | null;
	requiredSet: number;
	requiredTotal: number;
	setCount: number;
	shownCount: number;
	optionalEmpty: number;
	expression: string;
	wrapped: string;
	crumbs: Array<{ label: string; tone: CrumbTone }>;
}

export function deriveFunctions(state: FunctionsState): FunctionsDerived {
	const fn = selectedFunctionOf(state);
	const slots = buildSlots(fn, state.args);
	const values = slots.map((slot) => slot.value.trim());
	const lastSet = values.reduce((last, value, index) => (value === '' ? last : index), -1);

	let error: string | null = null;
	const note = (message: string) => {
		error ??= message;
	};
	slots.forEach((slot, index) => {
		if (values[index] === '') {
			if (slot.required) note(`${slot.name} is required.`);
			else if (index < lastSet) note(`Fill ${slot.name} first.`);
			return;
		}
		if (!slot.parsed.ok) note(`${slot.name}: ${slot.parsed.message}`);
	});

	const expression = `${fn.name}(${values.slice(0, lastSet + 1).join(', ')})`;

	return {
		fn,
		slots,
		valid: error === null,
		error,
		requiredSet: slots.filter((slot, index) => slot.required && values[index] !== '').length,
		requiredTotal: slots.filter((slot) => slot.required).length,
		setCount: values.filter((value) => value !== '').length,
		shownCount: slots.length,
		optionalEmpty: slots.filter((slot, index) => !slot.required && values[index] === '').length,
		expression,
		wrapped: `@{${expression}}`,
		crumbs: [
			{ label: fn.name, tone: 'fn' as CrumbTone },
			...(error !== null
				? [{ label: 'error', tone: 'error' as CrumbTone }]
				: slots.flatMap((slot, index) => (values[index] === '' ? [] : [crumbFor(slot.parsed)]))),
		],
	};
}

function crumbFor(parsed: ParseArgumentResult): { label: string; tone: CrumbTone } {
	if (!parsed.ok) return { label: 'error', tone: 'error' };
	switch (parsed.value.kind) {
		case 'reference':
			return { label: 'JSON reference', tone: 'ref' };
		case 'string':
			return { label: 'text', tone: 'value' };
		case 'number':
			return { label: 'number', tone: 'value' };
		case 'boolean':
			return { label: 'boolean', tone: 'value' };
		case 'null':
			return { label: 'null', tone: 'value' };
		case 'call':
			return { label: parsed.value.name, tone: 'fn' };
		default:
			return { label: 'empty', tone: 'value' };
	}
}
