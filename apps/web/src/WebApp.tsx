import { useState, useSyncExternalStore } from 'react';
import { Button } from '@fluentui/react-components';
import { ExpressionBuilderShell } from '@ryanmakes/eb_builder-ui';
import { createWebAdapter } from '@ryanmakes/eb_platformadapter';

export function WebApp() {
  const [adapter] = useState(createWebAdapter);
  const theme = useSyncExternalStore(
    adapter.onThemeChanged, adapter.getThemeSnapshot, adapter.getThemeSnapshot,
  );
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  return (
    <ExpressionBuilderShell
      adapter={adapter}
      platform="web"
      hostActions={
        <Button
          appearance="subtle"
          size="small"
          aria-label={`Switch to ${nextTheme} theme`}
          onClick={() => adapter.setTheme(nextTheme)}
        >
          {nextTheme === 'dark' ? 'Dark theme' : 'Light theme'}
        </Button>
      }
    />
  );
}
