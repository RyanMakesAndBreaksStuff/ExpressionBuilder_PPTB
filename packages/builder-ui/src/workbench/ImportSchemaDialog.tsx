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
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import { parseFieldImport, type FieldImportDiagnostic } from '../importExport/fieldImport';

export interface ImportSchemaDialogProps {
  open: boolean;
  onDismiss: () => void;
  onImport: (fields: FieldDefinition[], label: string) => void;
}

const useStyles = makeStyles({
  editor: {
    width: '100%',
    minHeight: '180px',
    fontFamily: tokens.fontFamilyMonospace,
  },
  preview: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    marginTop: tokens.spacingVerticalS,
    maxHeight: '180px',
    overflowY: 'auto',
  },
  diag: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    marginTop: tokens.spacingVerticalS,
  },
});

export function ImportSchemaDialog({ open, onDismiss, onImport }: ImportSchemaDialogProps) {
  const styles = useStyles();
  const [text, setText] = useState('');
  const result = useMemo(() => (text.trim() ? parseFieldImport(text) : null), [text]);
  const diagnostics: FieldImportDiagnostic[] =
    result == null ? [] : result.ok ? result.warnings : result.diagnostics;

  const handleDismiss = () => {
    setText('');
    onDismiss();
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => (!data.open ? handleDismiss() : undefined)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Import field schema</DialogTitle>
          <DialogContent>
            <Text size={200}>Paste a JSON array of field definitions.</Text>
            <Textarea
              className={styles.editor}
              value={text}
              onChange={(_, data) => setText(data.value)}
              placeholder={
                '[{ "id": "Status", "label": "Status", "type": "choice", "path": ["Status"], "choices": ["Open","Closed"] }]'
              }
              aria-label="Field definition JSON"
            />
            {diagnostics.length > 0 ? (
              <div className={styles.diag}>
                {diagnostics.map((d, i) => (
                  <MessageBar key={i} intent={d.severity === 'error' ? 'error' : 'warning'}>
                    <MessageBarBody>{d.message}</MessageBarBody>
                  </MessageBar>
                ))}
              </div>
            ) : null}
            {result?.ok ? (
              <div className={styles.preview} aria-label="Import preview">
                {result.fields.map((f) => (
                  <Text key={f.id} size={200}>
                    {f.label} · {f.type}
                    {f.choices ? ` (${f.choices.join(', ')})` : ''}
                  </Text>
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
              disabled={!result?.ok || result.fields.length === 0}
              onClick={() => {
                if (result?.ok) {
                  onImport(result.fields, 'Imported JSON');
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
