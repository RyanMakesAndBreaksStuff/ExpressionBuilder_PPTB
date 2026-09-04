import { useState } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  RadioGroup,
  Radio,
  Text,
  MessageBar,
  MessageBarBody,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import type { SourceSwitchDiff } from '../app/sourceState';

export interface SwitchSourceDialogProps {
  open: boolean;
  diff: SourceSwitchDiff;
  targetLabel: string;
  onDismiss: () => void;
  onConfirm: (mode: 'keep' | 'remove') => void;
}

const useStyles = makeStyles({
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    minWidth: 0,
    maxWidth: '100%',
  },
  messageBar: { minWidth: 0, maxWidth: '100%', whiteSpace: 'normal' },
  radioGroup: { minWidth: 0, width: '100%' },
  radio: { minWidth: 0, maxWidth: '100%', whiteSpace: 'normal' },
});

export function SwitchSourceDialog({ open, diff, targetLabel, onDismiss, onConfirm }: SwitchSourceDialogProps) {
  const styles = useStyles();
  const [mode, setMode] = useState<'keep' | 'remove'>('keep');
  const affected = diff.affectedRuleIds.length;

  return (
    <Dialog open={open} onOpenChange={(_, d) => (!d.open ? onDismiss() : undefined)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Switch source to {targetLabel}</DialogTitle>
          <DialogContent className={styles.body}>
            {affected === 0 ? (
              <Text>No existing rules reference fields missing from the new source.</Text>
            ) : (
              <>
                <MessageBar className={styles.messageBar} intent="warning">
                  <MessageBarBody>
                    {affected} rule{affected === 1 ? '' : 's'} reference{affected === 1 ? 's' : ''} fields that
                    don't exist in {targetLabel}.
                  </MessageBarBody>
                </MessageBar>
                <RadioGroup
                  className={styles.radioGroup}
                  value={mode}
                  onChange={(_, d) => setMode(d.value as 'keep' | 'remove')}
                >
                  <Radio
                    className={styles.radio}
                    value="keep"
                    label="Keep rules and flag unknown fields (recommended)"
                  />
                  <Radio className={styles.radio} value="remove" label="Remove the affected rules" />
                </RadioGroup>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onDismiss}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={() => onConfirm(mode)}>
              Switch
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
