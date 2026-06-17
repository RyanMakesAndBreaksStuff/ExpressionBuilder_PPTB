import type { Theme } from '@fluentui/react-components';

import { createPorcelainFluentTheme } from './workbenchTokens';

// Compatibility exports only. Runtime theme edits belong in workbenchTokens.ts.
export const builderLightTheme: Theme = createPorcelainFluentTheme('light');
export const builderDarkTheme: Theme = createPorcelainFluentTheme('dark');
