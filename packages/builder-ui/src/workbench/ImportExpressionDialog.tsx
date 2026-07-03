import { useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  MessageBar,
  MessageBarBody,
  Text,
  Textarea,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { parseSavedExpression } from '../importExport/savedExpressionSchema';

export interface ImportExpressionDialogProps {
  open: boolean;
  onDismiss: () => void;
  /** Parses and applies the pasted saved-expression JSON. */
  onImport: (source: string) => void;
}

const useStyles = makeStyles({
  editor: {
    width: '100%',
    minHeight: '200px',
    fontFamily: tokens.fontFamilyMonospace,
  },
  hint: {
    color: tokens.colorNeutralForeground3,
    marginBottom: tokens.spacingVerticalXS,
  },
  diag: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    marginTop: tokens.spacingVerticalS,
  },
});

/**
 * Paste-in dialog for the header's "Import" command (round-trips a full saved
 * expression — fields + rules — as opposed to ImportSchemaDialog, which only
 * imports field definitions). Export copies this same JSON shape to the
 * clipboard; there is no shared textarea between the two commands.
 */
export function ImportExpressionDialog({ open, onDismiss, onImport }: ImportExpressionDialogProps) {
  const styles = useStyles();
  const [text, setText] = useState('');

  const parsed = useMemo(() => (text.trim() ? parseSavedExpression(text) : null), [text]);

  const handleDismiss = () => {
    setText('');
    onDismiss();
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => (!data.open ? handleDismiss() : undefined)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Import saved expression</DialogTitle>
          <DialogContent>
            <Text className={styles.hint} size={200} block>
              Paste JSON previously copied with "Export".
            </Text>
            <Textarea
              className={styles.editor}
              value={text}
              onChange={(_, data) => setText(data.value)}
              placeholder='{ "version": 2, "mode": "triggerCondition", "fields": [...], "root": {...} }'
              aria-label="Saved expression JSON to import"
            />
            {parsed && !parsed.ok ? (
              <div className={styles.diag}>
                {parsed.errors.map((message, index) => (
                  <MessageBar key={index} intent="error">
                    <MessageBarBody>{message}</MessageBarBody>
                  </MessageBar>
                ))}
              </div>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={handleDismiss}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              disabled={!parsed || !parsed.ok}
              onClick={() => {
                if (parsed?.ok) {
                  onImport(text);
                  setText('');
                }
              }}
            >
              Import
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
