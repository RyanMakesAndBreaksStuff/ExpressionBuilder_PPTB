import { useState } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  Dropdown,
  Option,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import type { QueryRule, RulePatch } from '../composer/querySchema';
import { remapRulePatch } from '../app/builderState';

export interface RemapFieldDialogProps {
  open: boolean;
  rule: QueryRule | null;
  fields: FieldDefinition[];
  onDismiss: () => void;
  onRemap: (ruleId: string, patch: RulePatch) => void;
}

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, minWidth: '360px' },
});

export function RemapFieldDialog({ open, rule, fields, onDismiss, onRemap }: RemapFieldDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(_, d) => (!d.open ? onDismiss() : undefined)}>
      <DialogSurface>
        {open && (
          <RemapFieldDialogBody
            key={rule?.id}
            rule={rule}
            fields={fields}
            onDismiss={onDismiss}
            onRemap={onRemap}
          />
        )}
      </DialogSurface>
    </Dialog>
  );
}

// ponytail: mounted fresh per rule?.id (via key), so targetId starts clean without a useEffect reset.
function RemapFieldDialogBody({
  rule,
  fields,
  onDismiss,
  onRemap,
}: {
  rule: QueryRule | null;
  fields: FieldDefinition[];
  onDismiss: () => void;
  onRemap: (ruleId: string, patch: RulePatch) => void;
}) {
  const styles = useStyles();
  const [targetId, setTargetId] = useState<string | null>(null);

  const target = fields.find((f) => f.id === targetId) ?? null;

  return (
    <DialogBody>
      <DialogTitle>Remap field</DialogTitle>
      <DialogContent className={styles.body}>
        <Text size={200}>
          Rule references <strong>{rule?.fieldId}</strong>, which is not in the active source. Choose a
          replacement field.
        </Text>
        <Dropdown
          placeholder="Select a field"
          selectedOptions={targetId ? [targetId] : []}
          onOptionSelect={(_, d) => setTargetId(d.optionValue ?? null)}
        >
          {fields.map((f) => (
            <Option key={f.id} value={f.id} text={`${f.label} (${f.type})`}>
              {f.label} · {f.type}
            </Option>
          ))}
        </Dropdown>
      </DialogContent>
      <DialogActions>
        <Button appearance="secondary" onClick={onDismiss}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          disabled={!rule || !target}
          onClick={() => {
            if (rule && target) {
              onRemap(rule.id, remapRulePatch(target, rule.operator));
              setTargetId(null);
            }
          }}
        >
          Remap
        </Button>
      </DialogActions>
    </DialogBody>
  );
}
