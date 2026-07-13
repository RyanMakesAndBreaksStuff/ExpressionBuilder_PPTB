import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Input,
  Spinner,
  Switch,
  Text,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import type { TableRef } from '@ryanmakes/eb_platformadapter';

export interface TablePickerDialogProps {
  open: boolean;
  /** Resolves the table list lazily on open. */
  loadTables: () => Promise<TableRef[]>;
  onDismiss: () => void;
  onConfirm: (table: TableRef, includeRelated: boolean) => void;
}

const useStyles = makeStyles({
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    minWidth: '420px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    maxHeight: '320px',
    overflowY: 'auto',
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
  },
  selected: { backgroundColor: tokens.colorBrandBackground2 },
  logical: { color: tokens.colorNeutralForeground3 },
});

/**
 * Stateful body - mounted fresh each time the dialog opens, so state
 * initialises to defaults without needing a useEffect reset.
 */
function TablePickerBody({
  loadTables,
  onDismiss,
  onConfirm,
}: {
  loadTables: () => Promise<TableRef[]>;
  onDismiss: () => void;
  onConfirm: (table: TableRef, includeRelated: boolean) => void;
}) {
  const styles = useStyles();
  const [tables, setTables] = useState<TableRef[] | null>(null);
  const [search, setSearch] = useState('');
  const [showSystem, setShowSystem] = useState(false);
  const [includeRelated, setIncludeRelated] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void loadTables().then(setTables);
  }, [loadTables]);

  const filtered = useMemo(() => {
    const list = tables ?? [];
    const needle = search.trim().toLowerCase();
    return list.filter((t) => {
      if (!showSystem && t.isSystem) return false;
      if (!needle) return true;
      return `${t.displayName} ${t.logicalName}`.toLowerCase().includes(needle);
    });
  }, [tables, search, showSystem]);

  const selectedTable = filtered.find((t) => t.logicalName === selected) ?? null;

  // ponytail: clamp for render instead of a useEffect reset, so a shrinking filter can't leave activeIndex out of bounds.
  const boundedActiveIndex = Math.min(activeIndex, Math.max(filtered.length - 1, 0));

  const focusIndex = (index: number) => {
    setActiveIndex(index);
    const el = listRef.current?.querySelectorAll<HTMLDivElement>('[role="option"]')[index];
    el?.focus();
  };

  const onListKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusIndex((activeIndex + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusIndex((activeIndex - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusIndex(filtered.length - 1);
    }
  };

  return (
    <DialogBody>
      <DialogTitle>Select a table</DialogTitle>
      <DialogContent className={styles.body}>
        <Input
          value={search}
          onChange={(_, d) => setSearch(d.value)}
          placeholder="Search tables..."
          aria-label="Search tables"
        />
        <Switch
          label="Show system tables"
          checked={showSystem}
          onChange={(_, d) => setShowSystem(d.checked)}
        />
        <Switch
          label="Include related (one hop)"
          checked={includeRelated}
          onChange={(_, d) => setIncludeRelated(d.checked)}
        />
        {tables === null ? (
          <Spinner size="tiny" label="Loading tables..." />
        ) : filtered.length === 0 ? (
          <Text size={200}>No tables match.</Text>
        ) : (
          <div
            className={styles.list}
            role="listbox"
            aria-label="Tables"
            aria-activedescendant={filtered[boundedActiveIndex] ? `tbl-${filtered[boundedActiveIndex].logicalName}` : undefined}
            ref={listRef}
            onKeyDown={onListKeyDown}
          >
            {filtered.map((t, index) => (
              <div
                key={t.logicalName}
                id={`tbl-${t.logicalName}`}
                role="option"
                aria-selected={selected === t.logicalName}
                tabIndex={index === boundedActiveIndex ? 0 : -1}
                className={mergeClasses(
                  styles.row,
                  selected === t.logicalName && styles.selected,
                )}
                onClick={() => {
                  setSelected(t.logicalName);
                  setActiveIndex(index);
                }}
                onFocus={() => setActiveIndex(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected(t.logicalName);
                  }
                }}
              >
                <Text weight="semibold">{t.displayName}</Text>
                <Text className={styles.logical} size={100}>
                  {t.logicalName}
                </Text>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button appearance="secondary" onClick={onDismiss}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          disabled={!selectedTable}
          onClick={() => selectedTable && onConfirm(selectedTable, includeRelated)}
        >
          Connect
        </Button>
      </DialogActions>
    </DialogBody>
  );
}

export function TablePickerDialog({
  open,
  loadTables,
  onDismiss,
  onConfirm,
}: TablePickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(_, d) => (!d.open ? onDismiss() : undefined)}>
      <DialogSurface>
        {open && (
          <TablePickerBody
            loadTables={loadTables}
            onDismiss={onDismiss}
            onConfirm={onConfirm}
          />
        )}
      </DialogSurface>
    </Dialog>
  );
}
