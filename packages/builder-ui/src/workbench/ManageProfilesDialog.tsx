import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Input,
  MessageBar,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { DeleteRegular } from '@fluentui/react-icons';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import type { PlatformSettings } from '@ryanmakes/eb_platformadapter';
import {
  deleteProfile,
  listProfiles,
  loadProfile,
  saveProfile,
} from '../importExport/fieldProfiles';

export interface ManageProfilesDialogProps {
  open: boolean;
  settings: PlatformSettings;
  currentFields: FieldDefinition[];
  onDismiss: () => void;
  onLoad: (name: string, fields: FieldDefinition[]) => void;
}

const useStyles = makeStyles({
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    minWidth: '360px',
  },
  row: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS },
  list: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  saveRow: { display: 'flex', gap: tokens.spacingHorizontalS },
  grow: { flexGrow: 1 },
  confirmRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
  },
});

export function ManageProfilesDialog({
  open,
  settings,
  currentFields,
  onDismiss,
  onLoad,
}: ManageProfilesDialogProps) {
  const styles = useStyles();
  const [names, setNames] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refresh = () => {
    void listProfiles(settings).then(setNames);
  };

  useEffect(() => {
    if (open) {
      refresh();
      setConfirmDelete(null);
      setNewName('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const trimmedNew = newName.trim();
  const overwrites = trimmedNew.length > 0 && names.includes(trimmedNew);

  return (
    <Dialog open={open} onOpenChange={(_, d) => (!d.open ? onDismiss() : undefined)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Field profiles</DialogTitle>
          <DialogContent className={styles.body}>
            <div className={styles.saveRow}>
              <Input
                className={styles.grow}
                value={newName}
                placeholder="New profile name"
                onChange={(_, d) => setNewName(d.value)}
              />
              <Button
                appearance="primary"
                disabled={!trimmedNew || currentFields.length === 0}
                onClick={async () => {
                  await saveProfile(settings, { name: trimmedNew, fields: currentFields });
                  setNewName('');
                  refresh();
                }}
              >
                {overwrites ? 'Overwrite' : 'Save current'}
              </Button>
            </div>
            {overwrites ? (
              <MessageBar intent="warning">
                A profile named "{trimmedNew}" already exists. Saving will overwrite it.
              </MessageBar>
            ) : null}
            <div className={styles.list}>
              {names.length === 0 ? <Text size={200}>No saved profiles.</Text> : null}
              {names.map((name) =>
                confirmDelete === name ? (
                  <div key={name} className={styles.confirmRow} role="alert">
                    <Text className={styles.grow}>Delete "{name}"?</Text>
                    <Button
                      size="small"
                      appearance="primary"
                      onClick={async () => {
                        await deleteProfile(settings, name);
                        setConfirmDelete(null);
                        refresh();
                      }}
                    >
                      Delete
                    </Button>
                    <Button
                      size="small"
                      appearance="secondary"
                      onClick={() => setConfirmDelete(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div key={name} className={styles.row}>
                    <Text className={styles.grow}>{name}</Text>
                    <Button
                      size="small"
                      onClick={async () => {
                        const profile = await loadProfile(settings, name);
                        if (profile) onLoad(profile.name, profile.fields);
                      }}
                    >
                      Load
                    </Button>
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<DeleteRegular />}
                      aria-label={`Delete ${name}`}
                      onClick={() => setConfirmDelete(name)}
                    />
                  </div>
                ),
              )}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onDismiss}>
              Close
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
