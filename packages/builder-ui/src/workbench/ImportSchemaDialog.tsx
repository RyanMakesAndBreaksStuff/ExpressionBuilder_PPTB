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
  Tab,
  TabList,
  Text,
  Textarea,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import { parseFieldImport, type FieldImportDiagnostic } from '../importExport/fieldImport';
import { parseSampleRecord } from '../importExport/inferFromSample';
import { importJsonSchema } from '../importExport/jsonSchemaImport';
import { importCsv } from '../importExport/csvImport';

export interface ImportSchemaDialogProps {
  open: boolean;
  onDismiss: () => void;
  onImport: (fields: FieldDefinition[], label: string) => void;
}

type ImportMode = 'native' | 'sample' | 'jsonSchema' | 'csv';

const MODE_LABELS: Record<ImportMode, string> = {
  native: 'Field JSON',
  sample: 'Sample Record',
  jsonSchema: 'JSON Schema',
  csv: 'CSV Headers',
};

const MODE_PLACEHOLDERS: Record<ImportMode, string> = {
  native:
    '[{ "id": "Status", "label": "Status", "type": "choice", "path": ["Status"], "choices": ["Open","Closed"] }]',
  sample: '{ "name": "Alice", "age": 30, "active": true, "createdAt": "2024-01-15T08:00:00Z" }',
  jsonSchema:
    '{ "properties": { "name": { "type": "string", "title": "Name" }, "status": { "type": "string", "enum": ["open","closed"] } } }',
  csv: 'Name,Age,Status\nAlice,30,active',
};

const MODE_HINTS: Record<ImportMode, string> = {
  native: 'Paste a JSON array of FieldDefinition objects.',
  sample: 'Paste a sample record — types are inferred from the values.',
  jsonSchema: 'Paste a JSON Schema object with a "properties" key.',
  csv: 'Paste CSV with a header row; types inferred from the first data row.',
};

interface ParseResult {
  fields: FieldDefinition[];
  warnings: FieldImportDiagnostic[];
}

type ParseForModeResult = ParseResult | { errors: FieldImportDiagnostic[] };

const useStyles = makeStyles({
  editor: {
    width: '100%',
    minHeight: '160px',
    fontFamily: tokens.fontFamilyMonospace,
  },
  preview: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    marginTop: tokens.spacingVerticalS,
    maxHeight: '160px',
    overflowY: 'auto',
  },
  diag: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    marginTop: tokens.spacingVerticalS,
  },
  hint: {
    color: tokens.colorNeutralForeground3,
    marginBottom: tokens.spacingVerticalXS,
  },
});

function parseForMode(mode: ImportMode, text: string): ParseForModeResult {
  if (!text.trim()) return { errors: [] };

  if (mode === 'native') {
    const result = parseFieldImport(text);
    if (!result.ok) return { errors: result.diagnostics };
    return { fields: result.fields, warnings: result.warnings };
  }

  if (mode === 'sample') {
    const result = parseSampleRecord(text);
    if ('error' in result) return { errors: [{ severity: 'error', message: result.error }] };
    return { fields: result, warnings: [] };
  }

  if (mode === 'jsonSchema') {
    const result = importJsonSchema(text);
    if ('error' in result) return { errors: [{ severity: 'error', message: result.error }] };
    return {
      fields: result.fields,
      warnings: result.warnings.map((m) => ({ severity: 'warning' as const, message: m })),
    };
  }

  // csv
  const result = importCsv(text);
  if ('error' in result) return { errors: [{ severity: 'error', message: result.error }] };
  return { fields: result, warnings: [] };
}
const IMPORT_LABELS: Record<ImportMode, string> = {
  native: 'Imported JSON',
  sample: 'Sample Record',
  jsonSchema: 'JSON Schema',
  csv: 'CSV Import',
};

export function ImportSchemaDialog({ open, onDismiss, onImport }: ImportSchemaDialogProps) {
  const styles = useStyles();
  const [mode, setMode] = useState<ImportMode>('native');
  const [text, setText] = useState('');

  const parsed = useMemo(() => parseForMode(mode, text), [mode, text]);
  const isOk = 'fields' in parsed;
  const fields = isOk ? parsed.fields : [];
  const diagnostics: FieldImportDiagnostic[] = isOk
    ? parsed.warnings
    : parsed.errors;

  const reset = () => {
    setText('');
  };

  const handleDismiss = () => {
    reset();
    onDismiss();
  };

  const handleModeChange = (_: unknown, data: { value: unknown }) => {
    setMode(data.value as ImportMode);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => (!data.open ? handleDismiss() : undefined)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Import field schema</DialogTitle>
          <DialogContent>
            <TabList
              selectedValue={mode}
              onTabSelect={handleModeChange}
              size="small"
            >
              {(Object.keys(MODE_LABELS) as ImportMode[]).map((m) => (
                <Tab key={m} value={m}>
                  {MODE_LABELS[m]}
                </Tab>
              ))}
            </TabList>

            <Text className={styles.hint} size={200} block>
              {MODE_HINTS[mode]}
            </Text>

            <Textarea
              className={styles.editor}
              value={text}
              onChange={(_, data) => setText(data.value)}
              placeholder={MODE_PLACEHOLDERS[mode]}
              aria-label={`${MODE_LABELS[mode]} input`}
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

            {isOk && fields.length > 0 ? (
              <div className={styles.preview} aria-label="Import preview">
                {fields.map((f) => (
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
              disabled={!isOk || fields.length === 0}
              onClick={() => {
                if (isOk && fields.length > 0) {
                  onImport(fields, IMPORT_LABELS[mode]);
                  reset();
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
