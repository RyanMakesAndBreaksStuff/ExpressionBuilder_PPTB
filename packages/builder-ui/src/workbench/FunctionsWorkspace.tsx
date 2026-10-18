import { useEffect, useMemo, useReducer, useRef } from 'react';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import {
  deriveFunctions,
  functionsReducer,
  initialFunctionsState,
  insertTarget,
  navGroups,
} from './functionsState';
import type { ParsedValueSource } from './jsonPayloadSession';
import { buildParsedValueList } from './parsedValueModel';
import { ArgumentsPanel } from './ArgumentsPanel';
import { FunctionsDock } from './FunctionsDock';
import { FunctionsNav } from './FunctionsNav';
import { FunctionsStatusCards } from './FunctionsStatusCards';

export interface FunctionsWorkspaceProps {
  adapter: PlatformAdapter;
  /** Every successfully parsed JSON reference payload; empty before a parse. */
  sources: readonly ParsedValueSource[];
}

export function FunctionsWorkspace({ adapter, sources }: FunctionsWorkspaceProps) {
  const [state, dispatch] = useReducer(functionsReducer, initialFunctionsState);
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingPick = useRef(false);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const derived = useMemo(() => deriveFunctions(state), [state]);
  const groups = useMemo(() => navGroups(state), [state]);
  const parsedValue = useMemo(
    () => buildParsedValueList(sources, state.search),
    [sources, state.search],
  );

  useEffect(() => () => {
    if (copyResetTimer.current !== undefined) clearTimeout(copyResetTimer.current);
  }, []);

  function focusArg(name: string | null) {
    if (name === null) return;
    rootRef.current?.querySelector<HTMLInputElement>(`[data-arg="${name}"]`)?.focus();
  }

  // Reference buttons are always in the DOM, even inside a closed <details>; a closed one
  // can't take focus, so land on the outermost closed summary that hides the first reference.
  function focusParsedValue() {
    const root = rootRef.current;
    if (root === null) return;
    const row = root.querySelector<HTMLElement>('.eb-pv-row');
    if (row === null) {
      root.querySelector<HTMLElement>('[data-pv-toggle]')?.focus();
      return;
    }
    let target: HTMLElement = row;
    for (let el = row.parentElement; el !== null && el !== root; el = el.parentElement) {
      if (el instanceof HTMLDetailsElement && !el.open) {
        target = el.querySelector<HTMLElement>(':scope > summary') ?? target;
      }
    }
    target.focus();
  }

  function pickParsedValue(name: string) {
    dispatch({ type: 'focusArg', name });
    if (state.parsedValueExpanded) {
      focusParsedValue();
      return;
    }
    pendingPick.current = true;
    dispatch({ type: 'toggleParsedValue' });
  }

  useEffect(() => {
    if (!pendingPick.current || !state.parsedValueExpanded) return;
    pendingPick.current = false;
    focusParsedValue();
  }, [state.parsedValueExpanded]);

  function selectFunction(name: string, wrapArg: string | null) {
    if (wrapArg === null) {
      dispatch({ type: 'selectFunction', name });
      return;
    }
    dispatch({ type: 'wrapArg', arg: wrapArg, fn: name });
    focusArg(wrapArg);
  }

  function insertReference(expression: string) {
    const target = insertTarget(state);
    dispatch({ type: 'insertReference', expression });
    focusArg(target);
  }

  async function copy(format: 'expression' | 'wrapped') {
    try {
      await adapter.copyToClipboard(format === 'wrapped' ? derived.wrapped : derived.expression);
      dispatch({ type: 'copySucceeded' });
      if (copyResetTimer.current !== undefined) clearTimeout(copyResetTimer.current);
      copyResetTimer.current = setTimeout(() => {
        copyResetTimer.current = undefined;
        dispatch({ type: 'resetCopyState' });
      }, 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void adapter.notify(`Could not copy expression: ${message}`, 'error');
    }
  }

  return (
    <div className="eb-fn-workspace" ref={rootRef}>
      <FunctionsNav
        groups={groups}
        selectedFunction={state.selectedFunction}
        search={state.search}
        parsedValue={parsedValue}
        parsedValueExpanded={state.parsedValueExpanded}
        onSearchChange={(value) => dispatch({ type: 'setSearch', value })}
        onToggleGroup={(group) => dispatch({ type: 'toggleGroup', group })}
        onToggleParsedValue={() => dispatch({ type: 'toggleParsedValue' })}
        onSelectFunction={selectFunction}
        onInsertReference={insertReference}
      />
      <div className="eb-fn-grid">
        <ArgumentsPanel
          functionName={derived.fn.name}
          slots={derived.slots}
          onArgChange={(name, value) => dispatch({ type: 'setArg', name, value })}
          onArgFocus={(name) => dispatch({ type: 'focusArg', name })}
          onPickParsedValue={pickParsedValue}
        />
        <FunctionsStatusCards derived={derived} />
        <FunctionsDock
          derived={derived}
          copyFormat={state.copyFormat}
          copyState={state.copyState}
          onCopyFormatChange={(format) => dispatch({ type: 'setCopyFormat', value: format })}
          onCopy={copy}
        />
      </div>
    </div>
  );
}
