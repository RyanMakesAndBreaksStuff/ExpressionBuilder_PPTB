import type { Theme } from '@fluentui/react-components';

import { createPorcelainFluentTheme } from './workbenchTokens';

// Compatibility exports only. Runtime theme edits belong in workbenchTokens.ts.
export const builderLightTheme: Theme = createPorcelainFluentTheme('porcelainLight');
export const builderDarkTheme: Theme = createPorcelainFluentTheme('porcelainDark');
