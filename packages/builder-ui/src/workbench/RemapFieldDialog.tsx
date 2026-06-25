import { useMemo, useState } from 'react';
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
  /** The orphaned rule's last-known type, if recoverable; used to order compatible candidates first. */
  preferredType?: FieldDefinition['type'];
  onDismiss: () => void;
  onRemap: (ruleId: string, patch: RulePatch) => void;
}

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, minWidth: '360px' },
});

export function RemapFieldDialog({ open, rule, fields, preferredType, onDismiss, onRemap }: RemapFieldDialogProps) {
  const styles = useStyles();
  const [targetId, setTargetId] = useState<string | null>(null);

  // Type-compatible candidates first.
  const ordered = useMemo(() => {
    if (!preferredType) return fields;
    return [...fields].sort((a, b) => {
      const aMatch = a.type === preferredType ? 0 : 1;
      const bMatch = b.type === preferredType ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [fields, preferredType]);

  const target = ordered.find((f) => f.id === targetId) ?? null;

  return (
    <Dialog open={open} onOpenChange={(_, d) => (!d.open ? onDismiss() : undefined)}>
      <DialogSurface>
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
              {ordered.map((f) => (
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
      </DialogSurface>
    </Dialog>
  );
}
