import { useSyncExternalStore } from 'react';
import { Button } from '@fluentui/react-components';
import { ExpressionBuilderShell } from '@ryanmakes/eb_builder-ui';
import type { PlatformTheme, WebPlatformAdapter } from '@ryanmakes/eb_platformadapter';

export interface WebAppProps {
  adapter: WebPlatformAdapter;
  initialTheme: PlatformTheme;
}

export function WebApp({ adapter, initialTheme }: WebAppProps) {
  const theme = useSyncExternalStore(
    adapter.onThemeChanged, adapter.getThemeSnapshot, adapter.getThemeSnapshot,
  );
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const switchTheme = () => {
    try {
      adapter.setTheme(nextTheme);
    } catch {
      void adapter.notify('Theme preference could not be saved.', 'error');
    }
  };
  return (
    <ExpressionBuilderShell
      adapter={adapter}
      initialTheme={initialTheme}
      platform="web"
      hostActions={
        <Button
          appearance="subtle"
          size="small"
          aria-label={`Switch to ${nextTheme} theme`}
          onClick={switchTheme}
        >
          {nextTheme === 'dark' ? 'Dark theme' : 'Light theme'}
        </Button>
      }
    />
  );
}
