import { webDarkTheme, webLightTheme, type Theme } from '@fluentui/react-components';

export type PorcelainThemeMode = 'light' | 'dark';
export type PaletteId = 'porcelainLight' | 'porcelainDark';

// Graphite replaces Porcelain's values under the existing palette ids, so persistence,
// the theme switcher and Fluent wiring are unchanged. Raw colors live here so Fluent aliases
// and the workbench CSS consume the same palette.
type PorcelainTokenSet = Partial<Theme> & {
  mode: PorcelainThemeMode;
  label: string;
  swatches: readonly string[];
  cssVariables: Record<`--${string}`, string>;
};

const fontFamilyBase = '"Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, system-ui, "Helvetica Neue", sans-serif';

export const porcelainTokens = {
  porcelainLight: {
    mode: 'light' as const,
    label: 'Graphite',
    swatches: ['#f6f6f6', '#ffffff', '#111111', '#0a5aa8'] as const,
    colorBrandBackground: '#111111',
    colorBrandBackgroundHover: '#000000',
    colorBrandBackgroundPressed: '#000000',
    colorBrandBackgroundSelected: '#000000',
    colorBrandForeground1: '#111111',
    colorBrandStroke1: '#111111',
    colorNeutralBackground1: '#ffffff',
    colorNeutralBackground2: '#eeeeee',
    colorNeutralBackground3: '#e0e0e0',
    colorNeutralForeground1: '#0a0a0a',
    colorNeutralForeground2: '#333333',
    colorNeutralForeground3: '#555555',
    colorNeutralForegroundOnBrand: '#ffffff',
    colorNeutralStroke1: '#cfcfcf',
    colorNeutralStroke2: '#9c9c9c',
    colorNeutralStrokeAccessible: '#666666',
    colorPaletteRedBackground1: 'rgba(168, 40, 31, 0.12)',
    colorPaletteRedForeground1: '#a8281f',
    colorPaletteRedBorder1: '#a8281f',
    colorPaletteYellowBackground1: 'rgba(122, 77, 0, 0.12)',
    colorPaletteYellowForeground1: '#7a4d00',
    colorPaletteYellowBorder1: '#7a4d00',
    colorPaletteGreenBackground1: 'rgba(23, 102, 63, 0.12)',
    colorPaletteGreenForeground1: '#17663f',
    colorPaletteGreenBorder1: '#17663f',
    colorPaletteBlueBackground2: 'rgba(42, 75, 176, 0.12)',
    colorPaletteBlueForeground2: '#2a4bb0',
    colorPaletteBlueBorderActive: '#2a4bb0',
    fontFamilyBase,
    cssVariables: {
      '--code': '#0f0f0f',
      '--code-text': '#fafafa',
      '--code-text2': '#d4d4d4',
      '--code-text3': '#a5a5a5',
      '--code-accent': '#f2f2f2',
      '--code-good': '#62d69b',
      '--code-warn': '#f0c460',
      '--code-danger': '#ff8f86',
      '--code-info': '#8ec5ff',
      '--code-seg-track': 'rgba(250, 250, 250, 0.08)',
      '--code-seg-selected': 'rgba(250, 250, 250, 0.16)',
      '--bg': '#f6f6f6',
      '--bg2': '#fbfbfb',
      '--surface': '#ffffff',
      '--surface2': '#eeeeee',
      '--surface3': '#e0e0e0',
      '--panel': 'rgba(255, 255, 255, 0.94)',
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
      '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.14)',
      '--shadow-md': '0 18px 48px rgba(0, 0, 0, 0.22)',
      '--header-glass': 'rgba(238, 238, 238, 0.92)',
      '--panel-glass': 'rgba(255, 255, 255, 0.85)',
      '--glow-1': 'rgba(17, 17, 17, 0.14)',
      '--glow-2': 'rgba(10, 90, 168, 0.12)',
      '--panel-shadow': '0 4px 16px rgba(0, 0, 0, 0.14)',
      '--dock-shadow': '0 4px 16px rgba(0, 0, 0, 0.18)',
      '--seg-track': 'rgba(10, 10, 10, 0.06)',
      '--seg-selected': 'rgba(10, 10, 10, 0.12)',
    },
  },
  porcelainDark: {
    mode: 'dark' as const,
    label: 'Graphite Dark',
    swatches: ['#000000', '#0f0f0f', '#f2f2f2', '#8ec5ff'] as const,
    colorBrandBackground: '#f2f2f2',
    colorBrandBackgroundHover: '#ffffff',
    colorBrandBackgroundPressed: '#ffffff',
    colorBrandBackgroundSelected: '#ffffff',
    colorBrandForeground1: '#f2f2f2',
    colorBrandStroke1: '#f2f2f2',
    colorNeutralBackground1: '#0f0f0f',
    colorNeutralBackground2: '#191919',
    colorNeutralBackground3: '#262626',
    colorNeutralForeground1: '#fafafa',
    colorNeutralForeground2: '#d4d4d4',
    colorNeutralForeground3: '#a5a5a5',
    colorNeutralForegroundOnBrand: '#0a0a0a',
    colorNeutralStroke1: '#3a3a3a',
    colorNeutralStroke2: '#595959',
    colorNeutralStrokeAccessible: '#a0a0a0',
    colorPaletteRedBackground1: 'rgba(255, 143, 134, 0.16)',
    colorPaletteRedForeground1: '#ff8f86',
    colorPaletteRedBorder1: '#ff8f86',
    colorPaletteYellowBackground1: 'rgba(240, 196, 96, 0.16)',
    colorPaletteYellowForeground1: '#f0c460',
    colorPaletteYellowBorder1: '#f0c460',
    colorPaletteGreenBackground1: 'rgba(98, 214, 155, 0.16)',
    colorPaletteGreenForeground1: '#62d69b',
    colorPaletteGreenBorder1: '#62d69b',
    colorPaletteBlueBackground2: 'rgba(146, 178, 255, 0.16)',
    colorPaletteBlueForeground2: '#92b2ff',
    colorPaletteBlueBorderActive: '#92b2ff',
    fontFamilyBase,
    cssVariables: {
      '--code': '#000000',
      '--code-text': '#fafafa',
      '--code-text2': '#d4d4d4',
      '--code-text3': '#a5a5a5',
      '--code-accent': '#f2f2f2',
      '--code-good': '#62d69b',
      '--code-warn': '#f0c460',
      '--code-danger': '#ff8f86',
      '--code-info': '#8ec5ff',
      '--code-seg-track': 'rgba(250, 250, 250, 0.08)',
      '--code-seg-selected': 'rgba(250, 250, 250, 0.16)',
      '--bg': '#000000',
      '--bg2': '#060606',
      '--surface': '#0f0f0f',
      '--surface2': '#191919',
      '--surface3': '#262626',
      '--panel': 'rgba(15, 15, 15, 0.94)',
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
      '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.22)',
      '--shadow-md': '0 18px 48px rgba(0, 0, 0, 0.22)',
      '--header-glass': 'rgba(25, 25, 25, 0.92)',
      '--panel-glass': 'rgba(15, 15, 15, 0.85)',
      '--glow-1': 'rgba(242, 242, 242, 0.2)',
      '--glow-2': 'rgba(142, 197, 255, 0.16)',
      '--panel-shadow': '0 4px 16px rgba(0, 0, 0, 0.3)',
      '--dock-shadow': '0 4px 16px rgba(0, 0, 0, 0.35)',
      '--seg-track': 'rgba(250, 250, 250, 0.08)',
      '--seg-selected': 'rgba(250, 250, 250, 0.16)',
    },
  },
} as const satisfies Record<PaletteId, PorcelainTokenSet>;

export function createPorcelainFluentTheme(paletteId: PaletteId): Theme {
  const { cssVariables, mode: _mode, label: _label, swatches: _swatches, ...fluentTokens } = porcelainTokens[paletteId];
  const baseTheme = porcelainTokens[paletteId].mode === 'dark' ? webDarkTheme : webLightTheme;
  void cssVariables;
  void _mode;
  void _label;
  void _swatches;

  return {
    ...baseTheme,
    ...fluentTokens,
  };
}

export function migratePaletteId(value: string | null): PaletteId | null {
  if (value === 'porcelainLight' || value === 'porcelainDark') return value;
  if (value === 'graphiteLight') return 'porcelainLight';
  if (value === 'graphiteDark') return 'porcelainDark';
  return null;
}
