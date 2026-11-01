import type { PayloadPath, PayloadReferenceRoot } from '@ryanmakes/eb_engine';
import { isJsonObject, pathKey, valueAtPath, type ParsedPayload } from '../importExport/jsonPayload';
import {
  initialJsonReferenceState, jsonReferenceReducer, rootExpression,
  currentReferenceRoot, type JsonReferenceState, type JsonReferenceAction,
} from './jsonReferenceState';
import { ARRAY_PAGE_SIZE, OBJECT_PAGE_SIZE } from './payloadTreeModel';

export interface PayloadTab {
  id: string;
  state: JsonReferenceState;
}

export interface PayloadReveal {
  sequence: number;
  payloadId: string;
  path: PayloadPath;
}

export interface JsonPayloadSession {
  payloads: PayloadTab[];
  activeId: string;
  nextId: number;
  revealSequence: number;
  reveal: PayloadReveal | null;
}

export interface PayloadSearchMatch {
  payloadId: string;
  parsed: ParsedPayload;
  path: PayloadPath;
  payloadLabel: string;
  pathLabel: string;
  preview: string;
}

export interface ParsedValueSource {
  id: string;
  label: string;
  rootCaption: string;
  parsed: ParsedPayload;
  referenceRoot: PayloadReferenceRoot | null;
}

export type JsonPayloadAction =
  | { type: 'add' }
  | { type: 'activate'; payloadId: string }
  | { type: 'close'; payloadId: string }
  | {
      type: 'edit';
      payloadId: string;
      action: JsonReferenceAction;
    }
  | { type: 'reveal'; match: PayloadSearchMatch };

function freshJsonState(): JsonReferenceState {
  return {
    ...initialJsonReferenceState,
    expanded: new Set<string>(),
    showAll: new Set<string>(),
  };
}

export function createJsonPayloadSession(): JsonPayloadSession {
  return {
    payloads: [{ id: 'payload-1', state: freshJsonState() }],
    activeId: 'payload-1',
    nextId: 2,
    revealSequence: 0,
    reveal: null,
  };
}

export function payloadLabel(
  payloads: readonly PayloadTab[],
  index: number,
): string {
  const state = payloads[index].state;
  if (state.outputFrom === 'action') {
    return state.actionName.trim() || `Payload ${index + 1}`;
  }
  const ordinal = payloads.slice(0, index + 1)
    .filter((payload) => payload.state.outputFrom === 'trigger').length;
  return ordinal === 1 ? 'Trigger' : `Trigger ${ordinal}`;
}

export function getParsedSources(
  payloads: readonly PayloadTab[],
): ParsedValueSource[] {
  return payloads.flatMap((payload, index) => {
    const parsed = payload.state.parsed;
    if (parsed === null) return [];
    return [{
      id: payload.id,
      label: payloadLabel(payloads, index),
      rootCaption: rootExpression(payload.state),
      parsed,
      referenceRoot: currentReferenceRoot(payload.state),
    }];
  });
}

export function jsonPayloadSessionReducer(
  session: JsonPayloadSession,
  action: JsonPayloadAction,
): JsonPayloadSession {
  if (action.type === 'add') {
    if (session.payloads.length >= 5) return session;
    const id = `payload-${session.nextId}`;
    return {
      ...session,
      payloads: [...session.payloads, { id, state: freshJsonState() }],
      activeId: id,
      nextId: session.nextId + 1,
    };
  }

  if (action.type === 'activate') {
    if (!session.payloads.some((payload) =>
      payload.id === action.payloadId)) return session;
    return session.activeId === action.payloadId
      ? session
      : { ...session, activeId: action.payloadId };
  }

  if (action.type === 'close') {
    const index = session.payloads.findIndex((payload) =>
      payload.id === action.payloadId);
    if (index < 0 || session.payloads.length === 1) return session;
    const payloads = session.payloads.filter((payload) =>
      payload.id !== action.payloadId);
    return {
      ...session,
      payloads,
      activeId: session.activeId === action.payloadId
        ? payloads[Math.min(index, payloads.length - 1)].id
        : session.activeId,
      reveal: session.reveal?.payloadId === action.payloadId
        ? null
        : session.reveal,
    };
  }

  if (action.type === 'reveal') {
    const payload = session.payloads.find((candidate) =>
      candidate.id === action.match.payloadId);
    const parsed = payload?.state.parsed;
    if (!payload || !parsed || parsed !== action.match.parsed) {
      return session;
    }
    if (!valueAtPath(parsed.value, action.match.path).found) {
      return session;
    }

    const expanded = new Set(payload.state.expanded);
    const showAll = new Set(payload.state.showAll);
    for (let length = 0; length < action.match.path.length; length += 1) {
      const parentPath = action.match.path.slice(0, length);
      const parent = valueAtPath(parsed.value, parentPath);
      if (!parent.found) return session;
      const key = pathKey(parentPath);
      const segment = action.match.path[length];
      expanded.add(key);

      if (Array.isArray(parent.value) &&
          typeof segment === 'number' &&
          segment >= ARRAY_PAGE_SIZE) {
        showAll.add(key);
      } else if (isJsonObject(parent.value) &&
          typeof segment === 'string' &&
          Object.keys(parent.value).indexOf(segment) >= OBJECT_PAGE_SIZE) {
        showAll.add(key);
      }
    }

    const state = {
      ...jsonReferenceReducer(payload.state, {
        type: 'select',
        path: action.match.path,
      }),
      expanded,
      showAll,
    };
    const sequence = session.revealSequence + 1;
    return {
      ...session,
      payloads: session.payloads.map((candidate) =>
        candidate.id === payload.id ? { ...candidate, state } : candidate),
      activeId: payload.id,
      revealSequence: sequence,
      reveal: {
        sequence,
        payloadId: payload.id,
        path: action.match.path,
      },
    };
  }

  const payload = session.payloads.find((candidate) =>
    candidate.id === action.payloadId);
  if (!payload) return session;

  if (action.action.type === 'autoParse' &&
      (session.activeId !== payload.id ||
       action.action.expectedText !== payload.state.text ||
       payload.state.lastAttemptedText === payload.state.text)) {
    return session;
  }

  const state = jsonReferenceReducer(payload.state, action.action);
  if (state === payload.state) return session;
  return {
    ...session,
    payloads: session.payloads.map((candidate) =>
      candidate.id === payload.id ? { ...candidate, state } : candidate),
    reveal: session.reveal?.payloadId === payload.id
      ? null
      : session.reveal,
  };
}
