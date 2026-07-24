import type { Theme } from '@fluentui/react-components';

import { createGraphiteFluentTheme } from './workbenchTokens';

// Compatibility exports only. Runtime theme edits belong in workbenchTokens.ts.
export const builderLightTheme: Theme = createGraphiteFluentTheme('graphiteLight');
export const builderDarkTheme: Theme = createGraphiteFluentTheme('graphiteDark');
