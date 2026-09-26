import {
  formatPayloadReference,
  formatPayloadRoot,
  type PayloadPath,
  type PayloadReferenceRoot,
} from '@ryanmakes/eb_engine';
import { isJsonObject, keyToPath, parsePayload, pathKey, valueAtPath, type ParsedPayload } from '../importExport/jsonPayload';
import { countLabel } from './payloadTreeModel';

export type OutputFrom = 'action' | 'trigger';
export type PayloadShape = 'full' | 'body';
export type CopyFormat = 'bare' | 'inline';
export type CopyStatus = { kind: 'idle' } | { kind: 'copied' } | { kind: 'error'; reason: string };
export type StatusTone = 'muted' | 'good' | 'warn' | 'danger';

/**
 * Everything the user entered or chose in JSON reference (FR-008). It lives in
 * memory only: nothing here is ever serialised, stored or sent anywhere.
 */
export interface JsonReferenceState {
  outputFrom: OutputFrom;
  shape: PayloadShape;
  actionName: string;
  /** Set once the user types a name or selects Parse; a missing name only shows as invalid after that. */
  actionNameTouched: boolean;
  text: string;
  parsed: ParsedPayload | null;
  error: string | null;
  selectedPath: PayloadPath;
  expanded: ReadonlySet<string>;
  showAll: ReadonlySet<string>;
  copyFormat: CopyFormat;
  copyStatus: CopyStatus;
}

export type JsonReferenceAction =
  | { type: 'setOutputFrom'; value: OutputFrom }
  | { type: 'setShape'; value: PayloadShape }
  | { type: 'setActionName'; value: string }
  | { type: 'setText'; value: string }
  | { type: 'parse' }
  | { type: 'select'; path: PayloadPath }
  | { type: 'toggleExpanded'; key: string }
  | { type: 'showAll'; key: string }
  | { type: 'setCopyFormat'; value: CopyFormat }
  | { type: 'copySucceeded' }
  | { type: 'copyFailed'; reason: string }
  | { type: 'resetCopyStatus' };

export const ACTION_NAME_PLACEHOLDER = 'Action_name';

const IDLE: CopyStatus = { kind: 'idle' };

export const initialJsonReferenceState: JsonReferenceState = {
  outputFrom: 'action',
  shape: 'full',
  actionName: '',
  actionNameTouched: false,
  text: '',
  parsed: null,
  error: null,
  selectedPath: [],
  expanded: new Set<string>(),
  showAll: new Set<string>(),
  copyFormat: 'bare',
  copyStatus: IDLE,
};

export function jsonReferenceReducer(state: JsonReferenceState, action: JsonReferenceAction): JsonReferenceState {
  switch (action.type) {
    // A source change only re-roots the reference (FR-016): no parse, and the
    // tree, its expansion and the selection stay as they are.
    case 'setOutputFrom':
      return { ...state, outputFrom: action.value, copyStatus: IDLE };
    case 'setShape':
      return { ...state, shape: action.value, copyStatus: IDLE };
    case 'setActionName':
      return { ...state, actionName: action.value, actionNameTouched: true, copyStatus: IDLE };
    // Editing keeps the last parsed tree usable; the status turns stale (FR-027).
    case 'setText':
      return { ...state, text: action.value };
    case 'parse':
      return parseSample(state);
    case 'select':
      return { ...state, selectedPath: action.path, copyStatus: IDLE };
    case 'toggleExpanded': {
      const expanded = new Set(state.expanded);
      if (!expanded.delete(action.key)) expanded.add(action.key);
      return { ...state, expanded };
    }
    case 'showAll':
      return { ...state, showAll: new Set(state.showAll).add(action.key) };
    case 'setCopyFormat':
      return { ...state, copyFormat: action.value, copyStatus: IDLE };
    case 'copySucceeded':
      return { ...state, copyStatus: { kind: 'copied' } };
    case 'copyFailed':
      return { ...state, copyStatus: { kind: 'error', reason: action.reason } };
    case 'resetCopyStatus':
      return state.copyStatus.kind === 'idle' ? state : { ...state, copyStatus: IDLE };
  }
}

function parseSample(state: JsonReferenceState): JsonReferenceState {
  const result = parsePayload(state.text);
  if (!result.ok) {
    // FR-026: the tree, the value count and the selection go.
    return {
      ...state,
      actionNameTouched: true,
      parsed: null,
      error: result.message,
      selectedPath: [],
      expanded: new Set<string>(),
      showAll: new Set<string>(),
      copyStatus: IDLE,
    };
  }
  // FR-025: keep what still applies to the new sample, expand the root and
  // hide elements that "Show N more" revealed.
  const { value } = result.payload;
  const expanded = new Set([...state.expanded].filter((key) => valueAtPath(value, keyToPath(key)).found));
  expanded.add(pathKey([]));
  return {
    ...state,
    actionNameTouched: true,
    parsed: result.payload,
    error: null,
    selectedPath: valueAtPath(value, state.selectedPath).found ? state.selectedPath : [],
    expanded,
    showAll: new Set<string>(),
    copyStatus: IDLE,
  };
}

/** Empty or whitespace-only while Output from is Action (FR-012). */
export function isActionNameMissing(state: JsonReferenceState): boolean {
  return state.outputFrom === 'action' && state.actionName.trim() === '';
}

export function showActionNameInvalid(state: JsonReferenceState): boolean {
  return isActionNameMissing(state) && state.actionNameTouched;
}

function referenceRoot(state: JsonReferenceState, shape: PayloadShape, actionName: string): PayloadReferenceRoot {
  if (state.outputFrom === 'trigger') return { kind: shape === 'full' ? 'triggerOutputs' : 'triggerBody' };
  return { kind: shape === 'full' ? 'outputs' : 'body', actionName };
}

/** The root to display for a shape; a missing name shows as Action_name (FR-014). */
export function rootExpression(state: JsonReferenceState, shape: PayloadShape = state.shape): string {
  const actionName = isActionNameMissing(state) ? ACTION_NAME_PLACEHOLDER : state.actionName;
  return formatPayloadRoot(referenceRoot(state, shape, actionName));
}

export function canCopy(state: JsonReferenceState): boolean {
  return state.parsed !== null && !isActionNameMissing(state);
}

/** Exactly what Copy writes and the expression area shows (FR-046, FR-050, FR-051). */
export function copyText(state: JsonReferenceState): string | null {
  if (!canCopy(state)) return null;
  const reference = formatPayloadReference({
    root: referenceRoot(state, state.shape, state.actionName),
    path: state.selectedPath,
  });
  return state.copyFormat === 'inline' ? `@{${reference}}` : reference;
}

/** FR-044. */
export function expressionPlaceholder(state: JsonReferenceState): string | null {
  if (canCopy(state)) return null;
  return isActionNameMissing(state) ? 'Enter an action name' : 'Parse a sample and select a value';
}

/** FR-029. */
export function parseStatus(state: JsonReferenceState): { text: string; tone: StatusTone } {
  if (state.error !== null) return { text: 'Could not parse', tone: 'danger' };
  if (state.parsed === null) return { text: 'Nothing parsed yet', tone: 'muted' };
  if (state.text !== state.parsed.text) return { text: 'Sample changed. Parse again to update.', tone: 'warn' };
  return { text: `Parsed · ${countLabel(state.parsed.valueCount, 'value')}`, tone: 'good' };
}

/** FR-045. */
export function fixedPositionNote(state: JsonReferenceState): string | null {
  if (state.parsed === null) return null;
  const indices = state.selectedPath.filter((segment): segment is number => typeof segment === 'number');
  if (indices.length === 0) return null;
  return `Fixed position ${indices.map((index) => `[${index}]`).join('')}: reads that item only, not each item in a loop.`;
}

/** FR-015: a hint only; the builder never changes the source on its own. */
export function showBodyHint(state: JsonReferenceState): boolean {
  return (
    state.shape === 'body' &&
    state.parsed !== null &&
    isJsonObject(state.parsed.value) &&
    Object.hasOwn(state.parsed.value, 'body')
  );
}

/** FR-050, FR-053, FR-054. */
export function copyStatusView(state: JsonReferenceState): { text: string; tone: StatusTone } {
  switch (state.copyStatus.kind) {
    case 'copied':
      return { text: 'Expression copied', tone: 'good' };
    case 'error':
      return { text: `Could not copy expression: ${state.copyStatus.reason}`, tone: 'danger' };
    case 'idle':
      return {
        text: state.copyFormat === 'inline' ? 'Inline text: use inside a string' : 'Paste into the expression editor',
        tone: 'muted',
      };
  }
}
