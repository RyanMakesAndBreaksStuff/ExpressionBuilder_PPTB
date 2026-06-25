import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import type { FieldDrift } from '../importExport/metadataCache';

export interface SourceUpdatedDialogProps {
  open: boolean;
  drift: FieldDrift;
  /** Removed fields that are referenced by rules (become orphans). */
  removedInUse: string[];
  onClose: () => void;
}

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, minWidth: '360px' },
  line: { color: tokens.colorNeutralForeground2 },
});

export function SourceUpdatedDialog({ open, drift, removedInUse, onClose }: SourceUpdatedDialogProps) {
  const styles = useStyles();
  return (
    <Dialog open={open} onOpenChange={(_, d) => (!d.open ? onClose() : undefined)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Source updated</DialogTitle>
          <DialogContent className={styles.body}>
            <Text className={styles.line}>{drift.added.length} field{drift.added.length === 1 ? '' : 's'} added</Text>
            <Text className={styles.line}>{drift.changed.length} field{drift.changed.length === 1 ? '' : 's'} changed</Text>
            <Text className={styles.line}>{drift.removed.length} field{drift.removed.length === 1 ? '' : 's'} removed</Text>
            {removedInUse.length > 0 ? (
              <Text>
                {removedInUse.length} removed field{removedInUse.length === 1 ? '' : 's'} are used by rules and
                are now flagged as unknown: {removedInUse.join(', ')}.
              </Text>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={onClose}>
              Got it
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
