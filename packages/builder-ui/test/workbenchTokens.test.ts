import { describe, expect, it } from 'vitest';

import { builderDarkTheme, builderLightTheme } from '../src/theme/fluentTheme';
import {
  createGraphiteFluentTheme,
  graphiteTokens,
  migratePaletteId,
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

describe('workbench Graphite tokens', () => {
  it('matches the explorer Graphite palette exactly in both modes', () => {
    expect(graphiteTokens.graphiteLight.swatches).toEqual(['#F6F8FA', '#FDFEFF', '#155EEF', '#087D78']);
    expect(graphiteTokens.graphiteLight.cssVariables).toMatchObject({
      '--bg': '#F6F8FA',
      '--bg2': '#FBFCFD',
      '--surface': '#FDFEFF',
      '--surface2': '#EEF2F5',
      '--surface3': '#E1E7EC',
      '--border': '#D2DCE5',
      '--border-strong': '#AEBDCA',
      '--text': '#18212B',
      '--text2': '#41505F',
      '--text3': '#647484',
      '--accent': '#155EEF',
      '--accent-strong': '#004EEB',
      '--accent-ink': '#F7FAFF',
      '--accent-2': '#087D78',
      '--danger': '#BE4540',
      '--warn': '#8B6414',
      '--good': '#237754',
      '--info': '#1E65C2',
    });

    expect(graphiteTokens.graphiteDark.swatches).toEqual(['#12161A', '#1B2228', '#77A7FF', '#55C5BB']);
    expect(graphiteTokens.graphiteDark.cssVariables).toMatchObject({
      '--bg': '#12161A',
      '--bg2': '#161C21',
      '--surface': '#1B2228',
      '--surface2': '#232D35',
      '--surface3': '#2D3943',
      '--border': '#394955',
      '--border-strong': '#526776',
      '--text': '#EDF3F7',
      '--text2': '#C8D3DC',
      '--text3': '#9EADB9',
      '--accent': '#77A7FF',
      '--accent-strong': '#5690F4',
      '--accent-ink': '#0C1A34',
      '--accent-2': '#55C5BB',
      '--danger': '#FF978D',
      '--warn': '#EFC56E',
      '--good': '#63C99B',
      '--info': '#9ABEFF',
    });
  });

  it('keeps derived alpha values and Fluent aliases aligned with Graphite', () => {
    expect(graphiteTokens.graphiteLight.cssVariables).toMatchObject({
      '--panel': 'rgba(253, 254, 255, 0.95)',
      '--accent-soft': 'rgba(21, 94, 239, 0.12)',
      '--danger-soft': 'rgba(190, 69, 64, 0.12)',
      '--warn-soft': 'rgba(139, 100, 20, 0.12)',
      '--good-soft': 'rgba(35, 119, 84, 0.12)',
      '--info-soft': 'rgba(30, 101, 194, 0.12)',
    });
    expect(graphiteTokens.graphiteDark.cssVariables).toMatchObject({
      '--panel': 'rgba(27, 34, 40, 0.94)',
      '--accent-soft': 'rgba(119, 167, 255, 0.16)',
      '--danger-soft': 'rgba(255, 151, 141, 0.14)',
      '--warn-soft': 'rgba(239, 197, 110, 0.14)',
      '--good-soft': 'rgba(99, 201, 155, 0.14)',
      '--info-soft': 'rgba(154, 190, 255, 0.14)',
    });
    expect(createGraphiteFluentTheme('graphiteLight')).toMatchObject({
      colorBrandBackground: '#155EEF',
      colorNeutralForegroundOnBrand: '#F7FAFF',
      colorNeutralStrokeAccessible: '#647484',
    });
    expect(createGraphiteFluentTheme('graphiteDark')).toMatchObject({
      colorBrandBackground: '#77A7FF',
      colorNeutralForegroundOnBrand: '#0C1A34',
      colorNeutralStrokeAccessible: '#9EADB9',
    });
  });

  it.each(['graphiteLight', 'graphiteDark'] satisfies PaletteId[])(
    'meets text, on-brand, and interactive-stroke contrast in %s',
    (paletteId) => {
      const vars = graphiteTokens[paletteId].cssVariables;
      expect(contrastRatio(vars['--text'], vars['--surface'])).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(vars['--text2'], vars['--surface'])).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(vars['--text3'], vars['--surface'])).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(vars['--accent-ink'], vars['--accent'])).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(vars['--interactive-stroke'], vars['--surface'])).toBeGreaterThanOrEqual(3);
    },
  );

  it('migrates legacy IDs and rejects unknown saved values', () => {
    expect(migratePaletteId('porcelainLight')).toBe('graphiteLight');
    expect(migratePaletteId('porcelainDark')).toBe('graphiteDark');
    expect(migratePaletteId('graphiteLight')).toBe('graphiteLight');
    expect(migratePaletteId('graphiteDark')).toBe('graphiteDark');
    expect(migratePaletteId('unknown')).toBeNull();
    expect(migratePaletteId(null)).toBeNull();
  });

  it('keeps compatibility theme exports aligned with the live Graphite palette', () => {
    expect(builderLightTheme).toMatchObject(createGraphiteFluentTheme('graphiteLight'));
    expect(builderDarkTheme).toMatchObject(createGraphiteFluentTheme('graphiteDark'));
  });
});
