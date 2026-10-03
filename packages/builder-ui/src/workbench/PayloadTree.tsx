import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import type { PayloadPath } from '@ryanmakes/eb_engine';
import { pathKey } from '../importExport/jsonPayload';
import {
  ROOT_KEY,
  buildVisibleRows,
  firstHiddenChildKey,
  type PayloadMoreRow,
  type PayloadTreeRow,
} from './payloadTreeModel';
import { ChevronRightIcon } from './icons/BuilderIcons';

interface PayloadTreeProps {
  /** Id of the Payload heading, which names the tree (FR-084). */
  labelledBy: string;
  value: unknown;
  /** The live root expression, shown as the root row's label (FR-031). */
  rootLabel: string;
  expanded: ReadonlySet<string>;
  showAll: ReadonlySet<string>;
  selectedPath: PayloadPath;
  onSelect: (path: PayloadPath) => void;
  onToggle: (key: string) => void;
  onShowAll: (key: string) => void;
}

/**
 * A flat WAI-ARIA tree view with single selection (FR-036): one tab stop that
 * roves between rows, the chevron toggles without selecting (FR-034), and
 * sample content is only ever rendered as text (FR-038).
 */
export function PayloadTree({
  expanded,
  labelledBy,
  onSelect,
  onShowAll,
  onToggle,
  rootLabel,
  selectedPath,
  showAll,
  value,
}: PayloadTreeProps) {
  const rows = useMemo(() => buildVisibleRows(value, expanded, showAll), [value, expanded, showAll]);
  const indexByKey = useMemo(() => new Map(rows.map((row, index) => [row.key, index])), [rows]);
  const selectedKey = pathKey(selectedPath);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const rowElements = useRef(new Map<string, HTMLDivElement>());
  const focusPending = useRef(false);

  const tabStopKey =
    focusedKey !== null && indexByKey.has(focusedKey) ? focusedKey : nearestVisibleKey(indexByKey, selectedPath);

  useEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    rowElements.current.get(tabStopKey)?.focus();
  }, [rows, tabStopKey]);

  const registerRow = useCallback((key: string, element: HTMLDivElement | null) => {
    if (element) rowElements.current.set(key, element);
    else rowElements.current.delete(key);
  }, []);

  const moveFocus = (key: string) => {
    focusPending.current = true;
    setFocusedKey(key);
  };

  const revealAll = (row: PayloadMoreRow) => {
    onShowAll(row.parentKey);
    moveFocus(firstHiddenChildKey(value, row) ?? row.parentKey);
  };

  const rowFor = (target: EventTarget): PayloadTreeRow | undefined => {
    const element = (target as Element).closest<HTMLElement>('[data-row-key]');
    const index = element ? indexByKey.get(element.dataset.rowKey ?? '') : undefined;
    return index === undefined ? undefined : rows[index];
  };

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const row = rowFor(event.target);
    if (!row) return;
    if (row.kind === 'more') {
      revealAll(row);
    } else if (row.expandable && (event.target as Element).closest('[data-chevron]')) {
      onToggle(row.key);
      moveFocus(row.key);
    } else if (row.expandable) {
      onToggle(row.key);
      setFocusedKey(row.key);
      onSelect(row.path);
    } else {
      setFocusedKey(row.key);
      onSelect(row.path);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const row = rowFor(event.target);
    const index = row ? indexByKey.get(row.key) : undefined;
    if (!row || index === undefined) return;

    switch (event.key) {
      case 'ArrowDown':
        moveFocus(rows[Math.min(index + 1, rows.length - 1)].key);
        break;
      case 'ArrowUp':
        moveFocus(rows[Math.max(index - 1, 0)].key);
        break;
      case 'Home':
        moveFocus(rows[0].key);
        break;
      case 'End':
        moveFocus(rows[rows.length - 1].key);
        break;
      case 'ArrowRight':
        if (row.kind === 'value' && row.expandable) {
          if (row.expanded) moveFocus(rows[index + 1].key);
          else onToggle(row.key);
        }
        break;
      case 'ArrowLeft':
        if (row.kind === 'value' && row.expanded) onToggle(row.key);
        else if (row.parentKey !== null) moveFocus(row.parentKey);
        break;
      case 'Enter':
      case ' ':
        if (row.kind === 'more') revealAll(row);
        else onSelect(row.path);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <div
      className="eb-payload-tree"
      role="tree"
      aria-labelledby={labelledBy}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {rows.map((row) => (
        <PayloadTreeRowView
          key={row.key}
          row={row}
          rootLabel={row.kind === 'value' && row.labelKind === 'root' ? rootLabel : undefined}
          selected={row.key === selectedKey}
          tabStop={row.key === tabStopKey}
          register={registerRow}
        />
      ))}
    </div>
  );
}

/** The tab stop sits on the selected row, or on its nearest visible ancestor (FR-036). */
function nearestVisibleKey(indexByKey: ReadonlyMap<string, number>, selectedPath: PayloadPath): string {
  for (let length = selectedPath.length; length > 0; length -= 1) {
    const key = pathKey(selectedPath.slice(0, length));
    if (indexByKey.has(key)) return key;
  }
  return ROOT_KEY;
}

interface PayloadTreeRowViewProps {
  row: PayloadTreeRow;
  rootLabel: string | undefined;
  selected: boolean;
  tabStop: boolean;
  register: (key: string, element: HTMLDivElement | null) => void;
}

/** Memoised so moving focus or selection re-renders two rows, not the whole tree. */
const PayloadTreeRowView = memo(function PayloadTreeRowView({
  register,
  rootLabel,
  row,
  selected,
  tabStop,
}: PayloadTreeRowViewProps) {
  const indent = { '--eb-tree-level': row.level } as CSSProperties;
  const common = {
    ref: (element: HTMLDivElement | null) => register(row.key, element),
    'data-row-key': row.key,
    role: 'treeitem',
    'aria-level': row.level,
    'aria-posinset': row.posInSet,
    'aria-setsize': row.setSize,
    tabIndex: tabStop ? 0 : -1,
    style: indent,
  };

  if (row.kind === 'more') {
    return (
      <div {...common} className="eb-tree-row eb-tree-more">
        <span className="eb-tree-chevron" aria-hidden="true" />
        <span className="eb-tree-label">Show {row.hiddenCount} more</span>
      </div>
    );
  }

  const label = row.labelKind === 'root' ? (rootLabel ?? '') : row.label;
  return (
    <div
      {...common}
      className="eb-tree-row"
      aria-selected={selected}
      aria-expanded={row.expandable ? row.expanded : undefined}
      aria-label={row.expandable ? `${label}, ${row.type}` : `${label}, ${row.type}, ${row.preview}`}
    >
      <span
        className={`eb-tree-chevron${row.expanded ? ' is-expanded' : ''}`}
        data-chevron={row.expandable ? '' : undefined}
        aria-hidden="true"
      >
        {row.expandable ? <ChevronRightIcon /> : null}
      </span>
      <span className={`eb-tree-label is-${row.labelKind}`}>{label}</span>
      <span className={`eb-field-type-badge ${row.type}`}>{row.type}</span>
      <span className="eb-tree-preview">{row.preview}</span>
    </div>
  );
});
