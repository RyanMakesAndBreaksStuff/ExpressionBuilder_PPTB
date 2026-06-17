import { describe, expect, it } from 'vitest';

import { createPorcelainFluentTheme, porcelainTokens } from '../src/theme/workbenchTokens';

describe('workbench porcelain tokens', () => {
  it('exposes the finalized porcelain palette for light and dark themes', () => {
    expect(porcelainTokens.light.swatches).toEqual(['#faf7f4', '#ffffff', '#7458d8', '#287d7a']);
    expect(porcelainTokens.light.cssVariables).toMatchObject({
      '--bg': '#f7f3f0',
      '--surface2': '#f8f4f1',
      '--accent': '#7458d8',
      '--accent-2': '#287d7a',
    });
    expect(porcelainTokens.dark.swatches).toEqual(['#1b171b', '#241f25', '#9f8cff', '#47b7a8']);
    expect(porcelainTokens.dark.cssVariables).toMatchObject({
      '--bg': '#161216',
      '--surface2': '#2a222c',
      '--accent': '#9f8cff',
      '--accent-2': '#47b7a8',
    });
    expect(createPorcelainFluentTheme('light')).toMatchObject({
      colorBrandBackground: porcelainTokens.light.colorBrandBackground,
    });
  });
});
