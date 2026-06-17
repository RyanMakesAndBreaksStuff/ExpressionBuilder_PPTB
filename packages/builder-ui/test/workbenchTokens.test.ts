import { describe, expect, it } from 'vitest';

import { createPorcelainFluentTheme, porcelainTokens } from '../src/theme/workbenchTokens';

describe('workbench porcelain tokens', () => {
  it('exposes brand tokens for light and dark Fluent themes', () => {
    expect(porcelainTokens.light.colorBrandBackground).toBeTruthy();
    expect(porcelainTokens.dark.colorBrandBackground).toBeTruthy();
    expect(createPorcelainFluentTheme('light')).toMatchObject({
      colorBrandBackground: porcelainTokens.light.colorBrandBackground,
    });
  });
});
