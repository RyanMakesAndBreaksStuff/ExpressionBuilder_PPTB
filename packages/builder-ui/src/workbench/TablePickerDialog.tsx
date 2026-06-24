import { useEffect, useMemo, useState } from 'react';
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

export function TablePickerDialog({
  open,
  loadTables,
  onDismiss,
  onConfirm,
}: TablePickerDialogProps) {
  const styles = useStyles();
  const [tables, setTables] = useState<TableRef[] | null>(null);
  const [search, setSearch] = useState('');
  const [showSystem, setShowSystem] = useState(false);
  const [includeRelated, setIncludeRelated] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTables(null);
    setSelected(null);
    setSearch('');
    void loadTables().then(setTables);
  }, [open, loadTables]);

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

  return (
    <Dialog open={open} onOpenChange={(_, d) => (!d.open ? onDismiss() : undefined)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Select a table</DialogTitle>
          <DialogContent className={styles.body}>
            <Input
              value={search}
              onChange={(_, d) => setSearch(d.value)}
              placeholder="Search tables…"
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
              <Spinner size="tiny" label="Loading tables…" />
            ) : filtered.length === 0 ? (
              <Text size={200}>No tables match.</Text>
            ) : (
              <div className={styles.list} role="listbox" aria-label="Tables">
                {filtered.map((t) => (
                  <div
                    key={t.logicalName}
                    role="option"
                    aria-selected={selected === t.logicalName}
                    tabIndex={0}
                    className={mergeClasses(
                      styles.row,
                      selected === t.logicalName && styles.selected,
                    )}
                    onClick={() => setSelected(t.logicalName)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelected(t.logicalName);
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
      </DialogSurface>
    </Dialog>
  );
}
