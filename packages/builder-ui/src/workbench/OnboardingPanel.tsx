import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import type { PlatformSettings } from '@ryanmakes/eb_platformadapter';

const SEEN_KEY = 'eb.onboarding.seen.v1';

export interface OnboardingPanelProps {
  settings: PlatformSettings;
}

const useStyles = makeStyles({
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    maxWidth: '440px',
  },
});

export function OnboardingPanel({ settings }: OnboardingPanelProps) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void settings.get(SEEN_KEY).then((seen) => {
      if (active && !seen) setOpen(true);
    });
    return () => {
      active = false;
    };
  }, [settings]);

  const dismiss = () => {
    setOpen(false);
    void settings.set(SEEN_KEY, '1');
  };

  return (
    <Dialog open={open} onOpenChange={(_, d) => (!d.open ? dismiss() : undefined)}>
      <DialogSurface aria-describedby="eb-onboarding-desc">
        <DialogBody>
          <DialogTitle>Welcome to the Expression Builder</DialogTitle>
          <DialogContent className={styles.body} id="eb-onboarding-desc">
            <Text>
              Pick a data source to begin: connect a Dataverse table, import a schema, add fields
              manually, or load samples.
            </Text>
            <Text size={200}>
              You can switch sources anytime from the source menu in the toolbox.
            </Text>
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={dismiss}>
              Get started
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
