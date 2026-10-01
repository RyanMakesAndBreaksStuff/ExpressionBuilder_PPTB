import { useEffect, useMemo, useReducer, useRef } from 'react';
import type { PayloadReferenceRoot } from '@ryanmakes/eb_engine';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import {
  deriveFunctions,
  functionsReducer,
  initialFunctionsState,
  insertTarget,
  navGroups,
} from './functionsState';
import { buildParsedValueList } from './parsedValueModel';
import { ArgumentsPanel } from './ArgumentsPanel';
import { FunctionsDock } from './FunctionsDock';
import { FunctionsNav } from './FunctionsNav';
import { FunctionsStatusCards } from './FunctionsStatusCards';

export interface FunctionsWorkspaceProps {
  adapter: PlatformAdapter;
  /** Parsed JSON reference sample, or null before a successful parse. */
  sample: unknown;
  /** Reference root from JSON reference, or null while an action name is needed. */
  referenceRoot: PayloadReferenceRoot | null;
}

export function FunctionsWorkspace({ adapter, sample, referenceRoot }: FunctionsWorkspaceProps) {
  const [state, dispatch] = useReducer(functionsReducer, initialFunctionsState);
  const rootRef = useRef<HTMLDivElement>(null);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const derived = useMemo(() => deriveFunctions(state), [state]);
  const groups = useMemo(() => navGroups(state), [state]);
  const parsedValue = useMemo(
    () => buildParsedValueList(sample, referenceRoot, state.search),
    [sample, referenceRoot, state.search],
  );

  useEffect(() => () => {
    if (copyResetTimer.current !== undefined) clearTimeout(copyResetTimer.current);
  }, []);

  function focusArg(name: string | null) {
    if (name === null) return;
    rootRef.current?.querySelector<HTMLInputElement>(`[data-arg="${name}"]`)?.focus();
  }

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
