import { describe, expect, it } from 'vitest';

import { builderDarkTheme, builderLightTheme } from '../src/theme/fluentTheme';
import {
  createPorcelainFluentTheme,
  migratePaletteId,
  porcelainTokens,
  type PaletteId,
} from '../src/theme/workbenchTokens';

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

const PALETTES = ['porcelainLight', 'porcelainDark'] satisfies PaletteId[];

describe('workbench Porcelain tokens', () => {
  it('uses ui-ux/theme/porcelain.txt, with light-mode foregrounds darkened to AA', () => {
    expect(porcelainTokens.porcelainLight.swatches).toEqual(['#faf7f4', '#ffffff', '#7458d8', '#287d7a']);
    expect(porcelainTokens.porcelainLight.cssVariables).toMatchObject({
      '--bg': '#f7f3f0',
      '--bg2': '#fcfaf8',
      '--surface': '#ffffff',
      '--surface2': '#f8f4f1',
      '--surface3': '#eee6e0',
      '--panel': 'rgba(255, 252, 250, 0.95)',
      '--border': '#e2d7cf',
      '--border-strong': '#cab9ad',
      '--text': '#2a1f22',
      '--text2': '#5b4a52',
      '--text3': '#7e6b74',
      '--accent': '#7458d8',
      '--accent-strong': '#6046c3',
      '--accent-soft': 'rgba(116, 88, 216, 0.12)',
      '--accent-2': '#287d7a',
      '--danger': '#af5648',
      '--danger-soft': 'rgba(203, 100, 84, 0.12)',
      '--warn': '#916823',
      '--warn-soft': 'rgba(194, 139, 47, 0.13)',
      '--good': '#287e62',
      '--good-soft': 'rgba(47, 147, 114, 0.12)',
      '--info': '#546bc2',
      '--info-soft': 'rgba(95, 121, 219, 0.12)',
    });

    expect(porcelainTokens.porcelainDark.swatches).toEqual(['#1b171b', '#241f25', '#9f8cff', '#47b7a8']);
    expect(porcelainTokens.porcelainDark.cssVariables).toMatchObject({
      '--bg': '#161216',
      '--bg2': '#1d1820',
      '--surface': '#211b22',
      '--surface2': '#2a222c',
      '--surface3': '#362d38',
      '--panel': 'rgba(31, 25, 32, 0.92)',
      '--border': '#463a48',
      '--border-strong': '#5a4b5d',
      '--text': '#f3eaf0',
      '--text2': '#d2c0ca',
      '--text3': '#a58f9a',
      '--accent': '#9f8cff',
      '--accent-strong': '#8671ea',
      '--accent-soft': 'rgba(159, 140, 255, 0.14)',
      '--accent-2': '#47b7a8',
      '--danger': '#ef7f72',
      '--danger-soft': 'rgba(239, 127, 114, 0.14)',
      '--warn': '#e4ad56',
      '--warn-soft': 'rgba(228, 173, 86, 0.14)',
      '--good': '#4bbd97',
      '--good-soft': 'rgba(75, 189, 151, 0.14)',
      '--info': '#8ea4ff',
      '--info-soft': 'rgba(142, 164, 255, 0.14)',
    });
  });

  it('keeps Fluent aliases aligned with Porcelain', () => {
    expect(createPorcelainFluentTheme('porcelainLight')).toMatchObject({
      colorBrandBackground: '#7458d8',
      colorNeutralForegroundOnBrand: '#ffffff',
      colorNeutralStrokeAccessible: '#7e6b74',
    });
    expect(createPorcelainFluentTheme('porcelainDark')).toMatchObject({
      colorBrandBackground: '#9f8cff',
      colorNeutralForegroundOnBrand: '#161216',
      colorNeutralStrokeAccessible: '#a58f9a',
    });
  });

  it.each(PALETTES)('meets text, status, on-brand, and interactive-stroke contrast in %s', (paletteId) => {
    const vars = porcelainTokens[paletteId].cssVariables;
    for (const name of ['--text', '--text2', '--text3', '--danger', '--warn', '--good', '--info'] as const) {
      expect(contrastRatio(vars[name], vars['--surface']), name).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(vars[name], vars['--surface2']), `${name} on surface2`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrastRatio(vars['--accent-ink'], vars['--accent'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(vars['--interactive-stroke'], vars['--surface'])).toBeGreaterThanOrEqual(3);
  });

  it('migrates legacy IDs and rejects unknown saved values', () => {
    expect(migratePaletteId('graphiteLight')).toBe('porcelainLight');
    expect(migratePaletteId('graphiteDark')).toBe('porcelainDark');
    expect(migratePaletteId('porcelainLight')).toBe('porcelainLight');
    expect(migratePaletteId('porcelainDark')).toBe('porcelainDark');
    expect(migratePaletteId('unknown')).toBeNull();
    expect(migratePaletteId(null)).toBeNull();
  });

  it('keeps compatibility theme exports aligned with the live Porcelain palette', () => {
    expect(builderLightTheme).toMatchObject(createPorcelainFluentTheme('porcelainLight'));
    expect(builderDarkTheme).toMatchObject(createPorcelainFluentTheme('porcelainDark'));
  });
});

describe('11a shell tokens (FR-7)', () => {
  it('defines every shell variable in both palettes (AC-7.1)', () => {
    const names = [
      '--code', '--header-glass', '--panel-glass', '--glow-1', '--glow-2',
      '--panel-shadow', '--dock-shadow', '--seg-track', '--seg-selected',
    ] as const;
    for (const paletteId of PALETTES) {
      for (const name of names) {
        expect(porcelainTokens[paletteId].cssVariables[name], `${paletteId} ${name}`).toBeTruthy();
      }
    }
  });

  it('derives glass and glow from the Porcelain surfaces and accents', () => {
    expect(porcelainTokens.porcelainDark.cssVariables).toMatchObject({
      '--code': '#120e13',
      '--header-glass': 'rgba(42, 34, 44, 0.92)',
      '--panel-glass': 'rgba(33, 27, 34, 0.85)',
      '--glow-1': 'rgba(159, 140, 255, 0.2)',
      '--glow-2': 'rgba(71, 183, 168, 0.16)',
    });
    expect(porcelainTokens.porcelainLight.cssVariables).toMatchObject({
      '--code': '#120e13',
      '--header-glass': 'rgba(248, 244, 241, 0.92)',
      '--panel-glass': 'rgba(255, 255, 255, 0.85)',
      '--glow-1': 'rgba(116, 88, 216, 0.14)',
      '--glow-2': 'rgba(40, 125, 122, 0.12)',
    });
  });
});

describe('Functions dark code well', () => {
  it.each(PALETTES)('keeps code text and syntax readable against the code background in %s', (paletteId) => {
    const vars: Record<string, string> = porcelainTokens[paletteId].cssVariables;
    for (const name of ['--code-text', '--code-text2', '--code-text3', '--code-accent', '--code-good', '--code-warn', '--code-danger']) {
      expect(vars[name], name).toMatch(/^#[0-9a-f]{6}$/i);
      expect(contrastRatio(vars[name], vars['--code']), name).toBeGreaterThanOrEqual(4.5);
    }
    expect(vars['--code-seg-track']).toBeTruthy();
    expect(vars['--code-seg-selected']).toBeTruthy();
  });
});
