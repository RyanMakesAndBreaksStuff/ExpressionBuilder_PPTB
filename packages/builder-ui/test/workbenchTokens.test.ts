import { describe, expect, it } from 'vitest';

import { builderDarkTheme, builderLightTheme } from '../src/theme/fluentTheme';
import { createPorcelainFluentTheme, porcelainTokens } from '../src/theme/workbenchTokens';

describe('workbench porcelain tokens', () => {
  it('exposes the finalized porcelain palette for light and dark themes', () => {
    expect(porcelainTokens.porcelainLight.swatches).toEqual(['#faf7f4', '#ffffff', '#7458d8', '#287d7a']);
    expect(porcelainTokens.porcelainLight.cssVariables).toMatchObject({
      '--bg': '#f7f3f0',
      '--surface2': '#f8f4f1',
      '--accent': '#7458d8',
      '--accent-2': '#287d7a',
    });
    expect(porcelainTokens.porcelainDark.swatches).toEqual(['#1b171b', '#241f25', '#9f8cff', '#47b7a8']);
    expect(porcelainTokens.porcelainDark.cssVariables).toMatchObject({
      '--bg': '#161216',
      '--surface2': '#2a222c',
      '--accent': '#9f8cff',
      '--accent-2': '#47b7a8',
    });
    expect(createPorcelainFluentTheme('porcelainLight')).toMatchObject({
      colorBrandBackground: porcelainTokens.porcelainLight.colorBrandBackground,
    });
  });

  it('keeps fluentTheme exports aligned with the live porcelain palette', () => {
    expect(builderLightTheme).toMatchObject(createPorcelainFluentTheme('porcelainLight'));
    expect(builderDarkTheme).toMatchObject(createPorcelainFluentTheme('porcelainDark'));
  });
});
