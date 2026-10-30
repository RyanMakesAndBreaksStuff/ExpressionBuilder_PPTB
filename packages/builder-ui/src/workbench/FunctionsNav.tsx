import { useId, useRef } from 'react';
import { ChevronRightRegular } from '@fluentui/react-icons';
import type { FunctionGroup } from '@ryanmakes/eb_engine';
import type { NavGroup } from './functionsState';
import { PARSED_VALUE_PLACEHOLDER_ID, type ParsedValueList } from './parsedValueModel';
import { ParsedValueEntries } from './ParsedValueEntries';

export interface FunctionsNavProps {
  groups: NavGroup[];
  selectedFunction: string;
  search: string;
  parsedValue: ParsedValueList;
  expandedSources: ReadonlySet<string>;
  onSearchChange: (value: string) => void;
  onToggleGroup: (group: FunctionGroup) => void;
  onToggleSource: (id: string) => void;
  /** The argument input focused when the pick began, else null (FR-15). */
  onSelectFunction: (name: string, wrapArg: string | null) => void;
  onInsertReference: (expression: string) => void;
}

function ParsedValueGroups({
  list,
  expandedSources,
  baseId,
  onToggleSource,
  onInsertReference,
}: {
  list: ParsedValueList;
  expandedSources: ReadonlySet<string>;
  baseId: string;
  onToggleSource: (id: string) => void;
  onInsertReference: (expression: string) => void;
}) {
  if (list.sources.length === 0) {
    const expanded = expandedSources.has(PARSED_VALUE_PLACEHOLDER_ID);
    return (
      <div className="eb-fn-group" data-pv-group={PARSED_VALUE_PLACEHOLDER_ID}>
        <button
          className="eb-fn-group-row"
          type="button"
          aria-expanded={expanded}
          aria-label="Parsed Value 0"
          data-pv-toggle=""
          onClick={() => onToggleSource(PARSED_VALUE_PLACEHOLDER_ID)}
        >
          <ChevronRightRegular aria-hidden="true" />
          <span>Parsed Value</span>
          <span>0</span>
        </button>
        {expanded ? <div>{list.emptyMessage}</div> : null}
      </div>
    );
  }

  return (
    <>
      {list.sources.map((source) => {
        const expanded = expandedSources.has(source.id);
        return (
          <div className="eb-fn-group" key={source.id} data-pv-group={source.id}>
            <button
              className="eb-fn-group-row"
              type="button"
              aria-expanded={expanded}
              aria-label={source.label + ' ' + source.matchingCount}
              title={source.rootCaption}
              data-pv-toggle=""
              onClick={() => onToggleSource(source.id)}
            >
              <ChevronRightRegular aria-hidden="true" />
              <span>{source.label}</span>
              <span>{source.matchingCount}</span>
            </button>
            {expanded ? (
              <>
                <ParsedValueEntries
                  entries={source.entries}
                  baseId={`${baseId}-${source.id}`}
                  descriptionPrefix={list.sources.length > 1
                    ? `${source.label}, ${source.rootCaption}`
                    : undefined}
                  onInsertReference={onInsertReference}
                />
                {source.emptyMessage ? <div>{source.emptyMessage}</div> : null}
              </>
            ) : null}
          </div>
        );
      })}
      {list.hiddenCount > 0
        ? <div>+{list.hiddenCount} more — narrow with search</div>
        : null}
    </>
  );
}

export function FunctionsNav({
  groups,
  selectedFunction,
  search,
  parsedValue,
  expandedSources,
  onSearchChange,
  onToggleGroup,
  onToggleSource,
  onSelectFunction,
  onInsertReference,
}: FunctionsNavProps) {
  const wrapArg = useRef<string | null>(null);
  const baseId = useId();

  return (
    <nav className="eb-fn-nav" aria-label="Functions">
      <input
        className="eb-fn-search"
        type="search"
        aria-label="Search functions"
        value={search}
        onChange={(event) => onSearchChange(event.currentTarget.value)}
      />

      {groups.map(({ group, functions, total, expanded }) => (
        <div className="eb-fn-group" key={group}>
          <button
            className="eb-fn-group-row"
            type="button"
            aria-expanded={expanded}
            aria-label={group + ' ' + total}
            onClick={() => onToggleGroup(group)}
          >
            <ChevronRightRegular aria-hidden="true" />
            <span>{group}</span>
            <span>{total}</span>
          </button>
          {expanded
            ? functions.map((fn) => (
              <button
                className="eb-fn-row"
                type="button"
                key={fn.name}
                aria-current={fn.name === selectedFunction}
                draggable
                onMouseDown={() => {
                  const active = document.activeElement;
                  wrapArg.current = active instanceof HTMLElement ? (active.dataset.arg ?? null) : null;
                }}
                onKeyDown={() => {
                  wrapArg.current = null;
                }}
                onDragStart={(event) => {
                  wrapArg.current = null;
                  event.dataTransfer.setData('text/plain', fn.name + '()');
                }}
                onClick={() => {
                  onSelectFunction(fn.name, wrapArg.current);
                  wrapArg.current = null;
                }}
              >
                {fn.name}
              </button>
            ))
            : null}
        </div>
      ))}

      <ParsedValueGroups
        list={parsedValue}
        expandedSources={expandedSources}
        baseId={baseId}
        onToggleSource={onToggleSource}
        onInsertReference={onInsertReference}
      />
    </nav>
  );
}