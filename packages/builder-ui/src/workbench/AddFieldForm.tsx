import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  Input,
  Option,
  Switch,
  Textarea,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import type { FieldDefinition, FieldType } from '@ryanmakes/eb_engine';
import { buildUserField } from '../app/sourceState';

export interface AddFieldFormProps {
  open: boolean;
  existing: FieldDefinition[];
  onDismiss: () => void;
  onAdd: (field: FieldDefinition) => void;
}

const TYPES: FieldType[] = ['string', 'number', 'boolean', 'dateTime', 'choice'];

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
});

export function AddFieldForm({ open, existing, onDismiss, onAdd }: AddFieldFormProps) {
  const styles = useStyles();
  const [label, setLabel] = useState('');
  const [type, setType] = useState<FieldType>('string');
  const [choicesText, setChoicesText] = useState('');
  const [nullable, setNullable] = useState(false);
  const [idOverride, setIdOverride] = useState('');

  const reset = () => {
    setLabel('');
    setType('string');
    setChoicesText('');
    setNullable(false);
    setIdOverride('');
  };

  const choices = choicesText
    .split('\n')
    .map((c) => c.trim())
    .filter(Boolean);

  const candidate = buildUserField(
    { label, type, choices, nullable, idOverride: idOverride || undefined },
    existing,
  );

  const invalidReason = !label.trim()
    ? 'Label is required.'
    : candidate === null
      ? 'Field id is empty or already exists.'
      : undefined;

  const handleDismiss = () => {
    reset();
    onDismiss();
  };

  return (
    <Dialog open={open} onOpenChange={(_, d) => (!d.open ? handleDismiss() : undefined)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Add field</DialogTitle>
          <DialogContent className={styles.body}>
            <Field
              label="Label"
              required
              validationMessage={invalidReason}
              validationState={invalidReason ? 'error' : 'none'}
            >
              <Input value={label} onChange={(_, d) => setLabel(d.value)} />
            </Field>
            <Field label="Type">
              <Dropdown
                value={type}
                selectedOptions={[type]}
                onOptionSelect={(_, d) => setType((d.optionValue as FieldType) ?? 'string')}
              >
                {TYPES.map((t) => (
                  <Option key={t} value={t}>
                    {t}
                  </Option>
                ))}
              </Dropdown>
            </Field>
            {type === 'choice' ? (
              <Field label="Choices (one per line)">
                <Textarea value={choicesText} onChange={(_, d) => setChoicesText(d.value)} />
              </Field>
            ) : null}
            <Switch label="Nullable" checked={nullable} onChange={(_, d) => setNullable(d.checked)} />
            <Field label="Advanced: id override">
              <Input
                value={idOverride}
                onChange={(_, d) => setIdOverride(d.value)}
                placeholder="auto from label"
              />
            </Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={handleDismiss}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              disabled={candidate === null}
              onClick={() => {
                if (candidate) {
                  onAdd(candidate);
                  reset();
                }
              }}
            >
              Add field
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
