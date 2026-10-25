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

describe('workbench Graphite tokens', () => {
  it('uses assets/graphtokenss graphite-tokens.json under the existing palette ids', () => {
    expect(porcelainTokens.porcelainLight.label).toBe('Graphite');
    expect(porcelainTokens.porcelainLight.swatches).toEqual(['#f6f6f6', '#ffffff', '#111111', '#0a5aa8']);
    expect(porcelainTokens.porcelainLight.cssVariables).toMatchObject({
      '--bg': '#f6f6f6',
      '--bg2': '#fbfbfb',
      '--surface': '#ffffff',
      '--surface2': '#eeeeee',
      '--surface3': '#e0e0e0',
      '--border': '#cfcfcf',
      '--border-strong': '#9c9c9c',
      '--interactive-stroke': '#666666',
      '--text': '#0a0a0a',
      '--text2': '#333333',
      '--text3': '#555555',
      '--accent': '#111111',
      '--accent-strong': '#000000',
      '--accent-ink': '#ffffff',
      '--accent-soft': 'rgba(17, 17, 17, 0.12)',
      '--accent-2': '#0a5aa8',
      '--danger': '#a8281f',
      '--danger-soft': 'rgba(168, 40, 31, 0.12)',
      '--warn': '#7a4d00',
      '--warn-soft': 'rgba(122, 77, 0, 0.12)',
      '--good': '#17663f',
      '--good-soft': 'rgba(23, 102, 63, 0.12)',
      '--info': '#2a4bb0',
      '--info-soft': 'rgba(42, 75, 176, 0.12)',
    });

    expect(porcelainTokens.porcelainDark.label).toBe('Graphite Dark');
    expect(porcelainTokens.porcelainDark.swatches).toEqual(['#000000', '#0f0f0f', '#f2f2f2', '#8ec5ff']);
    expect(porcelainTokens.porcelainDark.cssVariables).toMatchObject({
      '--bg': '#000000',
      '--bg2': '#060606',
      '--surface': '#0f0f0f',
      '--surface2': '#191919',
      '--surface3': '#262626',
      '--border': '#3a3a3a',
      '--border-strong': '#595959',
      '--interactive-stroke': '#a0a0a0',
      '--text': '#fafafa',
      '--text2': '#d4d4d4',
      '--text3': '#a5a5a5',
      '--accent': '#f2f2f2',
      '--accent-strong': '#ffffff',
      '--accent-ink': '#0a0a0a',
      '--accent-soft': 'rgba(242, 242, 242, 0.16)',
      '--accent-2': '#8ec5ff',
      '--danger': '#ff8f86',
      '--danger-soft': 'rgba(255, 143, 134, 0.16)',
      '--warn': '#f0c460',
      '--warn-soft': 'rgba(240, 196, 96, 0.16)',
      '--good': '#62d69b',
      '--good-soft': 'rgba(98, 214, 155, 0.16)',
      '--info': '#92b2ff',
      '--info-soft': 'rgba(146, 178, 255, 0.16)',
    });
  });

  it('keeps Fluent aliases aligned with Graphite', () => {
    expect(createPorcelainFluentTheme('porcelainLight')).toMatchObject({
      colorBrandBackground: '#111111',
      colorNeutralForegroundOnBrand: '#ffffff',
      colorNeutralStrokeAccessible: '#666666',
    });
    expect(createPorcelainFluentTheme('porcelainDark')).toMatchObject({
      colorBrandBackground: '#f2f2f2',
      colorNeutralForegroundOnBrand: '#0a0a0a',
      colorNeutralStrokeAccessible: '#a0a0a0',
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

  it('keeps compatibility theme exports aligned with the live Graphite palette', () => {
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

  it('derives glass and glow from the Graphite surfaces and accents', () => {
    expect(porcelainTokens.porcelainDark.cssVariables).toMatchObject({
      '--code': '#000000',
      '--header-glass': 'rgba(25, 25, 25, 0.92)',
      '--panel-glass': 'rgba(15, 15, 15, 0.85)',
      '--glow-1': 'rgba(242, 242, 242, 0.2)',
      '--glow-2': 'rgba(142, 197, 255, 0.16)',
    });
    expect(porcelainTokens.porcelainLight.cssVariables).toMatchObject({
      '--code': '#0f0f0f',
      '--header-glass': 'rgba(238, 238, 238, 0.92)',
      '--panel-glass': 'rgba(255, 255, 255, 0.85)',
      '--glow-1': 'rgba(17, 17, 17, 0.14)',
      '--glow-2': 'rgba(10, 90, 168, 0.12)',
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
