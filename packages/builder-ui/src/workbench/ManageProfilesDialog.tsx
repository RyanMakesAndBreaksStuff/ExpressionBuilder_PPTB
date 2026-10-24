import { useEffect, useRef, useState } from 'react';
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
import type { NotificationLevel, PlatformSettings } from '@ryanmakes/eb_platformadapter';
import {
  deleteProfile,
  listProfiles,
  loadProfile,
  saveProfile,
  sweepOrphanedProfiles,
} from '../importExport/fieldProfiles';

export interface ManageProfilesDialogProps {
  open: boolean;
  settings: PlatformSettings;
  currentFields: FieldDefinition[];
  onDismiss: () => void;
  onLoad: (name: string, fields: FieldDefinition[]) => void;
  onNotify: (message: string, level: NotificationLevel) => void;
}

const useStyles = makeStyles({
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    minWidth: 0,
    maxWidth: '100%',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    minWidth: 0,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    minWidth: 0,
  },
  saveRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
    alignItems: 'center',
    minWidth: 0,
  },
  grow: { flexGrow: 1, minWidth: 0 },
  confirmRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
    minWidth: 0,
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
  onNotify,
}: ManageProfilesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(_, d) => (!d.open ? onDismiss() : undefined)}>
      <DialogSurface>
        {open && (
          <ManageProfilesDialogBody
            settings={settings}
            currentFields={currentFields}
            onDismiss={onDismiss}
            onLoad={onLoad}
            onNotify={onNotify}
          />
        )}
      </DialogSurface>
    </Dialog>
  );
}

// ponytail: mounted fresh each time the dialog opens, so confirmDelete/newName start clean without a useEffect reset.
function ManageProfilesDialogBody({
  settings,
  currentFields,
  onDismiss,
  onLoad,
  onNotify,
}: Omit<ManageProfilesDialogProps, 'open'>) {
  const styles = useStyles();
  const [names, setNames] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  // One profile call at a time, so a double-click cannot fire a second save/load/delete.
  const [pending, setPending] = useState(false);
  const runExclusive = async (work: () => Promise<void>) => {
    if (pending) return;
    setPending(true);
    try {
      await work();
    } finally {
      setPending(false);
    }
  };

  // Bumped per listing and on unmount so a late older/dismissed completion is ignored.
  const listGeneration = useRef(0);
  const refresh = () => {
    const generation = ++listGeneration.current;
    listProfiles(settings).then(
      (listed) => {
        if (generation === listGeneration.current) setNames(listed);
      },
      () => {
        if (generation === listGeneration.current) onNotify('Could not list field profiles.', 'error');
      },
    );
  };

  useEffect(() => {
    // Sweep once per dialog open (this component is mounted fresh each time
    // the dialog opens — see the comment above) rather than on every
    // listProfiles() call, so the rare cleanup write doesn't run on every
    // list read or app init.
    const generationRef = listGeneration;
    void sweepOrphanedProfiles(settings).then(refresh, refresh);
    return () => {
      generationRef.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trimmedNew = newName.trim();
  const overwrites = trimmedNew.length > 0 && names.includes(trimmedNew);

  return (
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
            disabled={pending || !trimmedNew || currentFields.length === 0}
            onClick={() => runExclusive(async () => {
              try {
                await saveProfile(settings, { name: trimmedNew, fields: currentFields });
              } catch {
                onNotify(`Could not save profile "${trimmedNew}".`, 'error');
                return;
              }
              setNewName('');
              refresh();
            })}
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
                  disabled={pending}
                  onClick={() => runExclusive(async () => {
                    try {
                      await deleteProfile(settings, name);
                      setConfirmDelete(null);
                      refresh();
                    } catch {
                      onNotify(`Could not delete profile "${name}".`, 'error');
                    }
                  })}
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
                  disabled={pending}
                  onClick={() => runExclusive(async () => {
                    let profile: Awaited<ReturnType<typeof loadProfile>>;
                    try {
                      profile = await loadProfile(settings, name);
                    } catch {
                      onNotify(`Could not load profile "${name}".`, 'error');
                      return;
                    }
                    if (profile) onLoad(profile.name, profile.fields);
                  })}
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
  );
}
