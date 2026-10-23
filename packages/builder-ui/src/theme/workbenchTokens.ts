import { webDarkTheme, webLightTheme, type Theme } from '@fluentui/react-components';

export type PorcelainThemeMode = 'light' | 'dark';
export type PaletteId = 'porcelainLight' | 'porcelainDark';

// Runtime theme source of truth (ui-ux/theme/porcelain.txt). Keep raw theme colors
// in this file so both Fluent aliases and the workbench CSS consume the same palette.
type PorcelainTokenSet = Partial<Theme> & {
  mode: PorcelainThemeMode;
  label: string;
  swatches: readonly string[];
  cssVariables: Record<`--${string}`, string>;
};

const fontFamilyBase = '"Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, system-ui, "Helvetica Neue", sans-serif';

// The code well is dark in both palettes; its foregrounds are Porcelain Dark's and must stay readable.
const codeForegroundVariables = {
  '--code': '#120e13',
  '--code-text': '#f3eaf0',
  '--code-text2': '#d2c0ca',
  '--code-text3': '#a58f9a',
  '--code-accent': '#9f8cff',
  '--code-good': '#4bbd97',
  '--code-warn': '#e4ad56',
  '--code-danger': '#ef7f72',
  '--code-seg-track': 'rgba(243, 234, 240, 0.08)',
  '--code-seg-selected': 'rgba(243, 234, 240, 0.16)',
} as const;

export const porcelainTokens = {
  porcelainLight: {
    mode: 'light' as const,
    label: 'Porcelain',
    swatches: ['#faf7f4', '#ffffff', '#7458d8', '#287d7a'] as const,
    colorBrandBackground: '#7458d8',
    colorBrandBackgroundHover: '#6046c3',
    colorBrandBackgroundPressed: '#6046c3',
    colorBrandBackgroundSelected: '#6046c3',
    colorBrandForeground1: '#7458d8',
    colorBrandStroke1: '#7458d8',
    colorNeutralBackground1: '#ffffff',
    colorNeutralBackground2: '#f8f4f1',
    colorNeutralBackground3: '#eee6e0',
    colorNeutralForeground1: '#2a1f22',
    colorNeutralForeground2: '#5b4a52',
    colorNeutralForeground3: '#7e6b74',
    colorNeutralForegroundOnBrand: '#ffffff',
    colorNeutralStroke1: '#e2d7cf',
    colorNeutralStroke2: '#cab9ad',
    colorNeutralStrokeAccessible: '#7e6b74',
    colorPaletteRedBackground1: 'rgba(203, 100, 84, 0.12)',
    colorPaletteRedForeground1: '#af5648',
    colorPaletteRedBorder1: '#af5648',
    colorPaletteYellowBackground1: 'rgba(194, 139, 47, 0.13)',
    colorPaletteYellowForeground1: '#916823',
    colorPaletteYellowBorder1: '#916823',
    colorPaletteGreenBackground1: 'rgba(47, 147, 114, 0.12)',
    colorPaletteGreenForeground1: '#287e62',
    colorPaletteGreenBorder1: '#287e62',
    colorPaletteBlueBackground2: 'rgba(95, 121, 219, 0.12)',
    colorPaletteBlueForeground2: '#546bc2',
    colorPaletteBlueBorderActive: '#546bc2',
    fontFamilyBase,
    cssVariables: {
      ...codeForegroundVariables,
      '--bg': '#f7f3f0',
      '--bg2': '#fcfaf8',
      '--surface': '#ffffff',
      '--surface2': '#f8f4f1',
      '--surface3': '#eee6e0',
      '--panel': 'rgba(255, 252, 250, 0.95)',
      '--border': '#e2d7cf',
      '--border-strong': '#cab9ad',
      '--interactive-stroke': '#8a7680',
      '--text': '#2a1f22',
      '--text2': '#5b4a52',
      // porcelain.txt values darkened to 4.5:1 on --surface2 (user decision 2026-10-23).
      '--text3': '#7e6b74',
      '--accent': '#7458d8',
      '--accent-strong': '#6046c3',
      '--accent-ink': '#ffffff',
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
      '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.14)',
      '--shadow-md': '0 18px 48px rgba(0, 0, 0, 0.22)',
      '--header-glass': 'rgba(248, 244, 241, 0.92)',
      '--panel-glass': 'rgba(255, 255, 255, 0.85)',
      '--glow-1': 'rgba(116, 88, 216, 0.14)',
      '--glow-2': 'rgba(40, 125, 122, 0.12)',
      '--panel-shadow': '0 4px 16px rgba(0, 0, 0, 0.14)',
      '--dock-shadow': '0 4px 16px rgba(0, 0, 0, 0.18)',
      '--seg-track': 'rgba(42, 31, 34, 0.06)',
      '--seg-selected': 'rgba(42, 31, 34, 0.12)',
    },
  },
  porcelainDark: {
    mode: 'dark' as const,
    label: 'Porcelain Dark',
    swatches: ['#1b171b', '#241f25', '#9f8cff', '#47b7a8'] as const,
    colorBrandBackground: '#9f8cff',
    colorBrandBackgroundHover: '#8671ea',
    colorBrandBackgroundPressed: '#8671ea',
    colorBrandBackgroundSelected: '#8671ea',
    colorBrandForeground1: '#9f8cff',
    colorBrandStroke1: '#9f8cff',
    colorNeutralBackground1: '#211b22',
    colorNeutralBackground2: '#2a222c',
    colorNeutralBackground3: '#362d38',
    colorNeutralForeground1: '#f3eaf0',
    colorNeutralForeground2: '#d2c0ca',
    colorNeutralForeground3: '#a58f9a',
    colorNeutralForegroundOnBrand: '#161216',
    colorNeutralStroke1: '#463a48',
    colorNeutralStroke2: '#5a4b5d',
    colorNeutralStrokeAccessible: '#a58f9a',
    colorPaletteRedBackground1: 'rgba(239, 127, 114, 0.14)',
    colorPaletteRedForeground1: '#ef7f72',
    colorPaletteRedBorder1: '#ef7f72',
    colorPaletteYellowBackground1: 'rgba(228, 173, 86, 0.14)',
    colorPaletteYellowForeground1: '#e4ad56',
    colorPaletteYellowBorder1: '#e4ad56',
    colorPaletteGreenBackground1: 'rgba(75, 189, 151, 0.14)',
    colorPaletteGreenForeground1: '#4bbd97',
    colorPaletteGreenBorder1: '#4bbd97',
    colorPaletteBlueBackground2: 'rgba(142, 164, 255, 0.14)',
    colorPaletteBlueForeground2: '#8ea4ff',
    colorPaletteBlueBorderActive: '#8ea4ff',
    fontFamilyBase,
    cssVariables: {
      ...codeForegroundVariables,
      '--bg': '#161216',
      '--bg2': '#1d1820',
      '--surface': '#211b22',
      '--surface2': '#2a222c',
      '--surface3': '#362d38',
      '--panel': 'rgba(31, 25, 32, 0.92)',
      '--border': '#463a48',
      '--border-strong': '#5a4b5d',
      '--interactive-stroke': '#a58f9a',
      '--text': '#f3eaf0',
      '--text2': '#d2c0ca',
      '--text3': '#a58f9a',
      '--accent': '#9f8cff',
      '--accent-strong': '#8671ea',
      '--accent-ink': '#161216',
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
      '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.22)',
      '--shadow-md': '0 18px 48px rgba(0, 0, 0, 0.22)',
      '--header-glass': 'rgba(42, 34, 44, 0.92)',
      '--panel-glass': 'rgba(33, 27, 34, 0.85)',
      '--glow-1': 'rgba(159, 140, 255, 0.2)',
      '--glow-2': 'rgba(71, 183, 168, 0.16)',
      '--panel-shadow': '0 4px 16px rgba(0, 0, 0, 0.3)',
      '--dock-shadow': '0 4px 16px rgba(0, 0, 0, 0.35)',
      '--seg-track': 'rgba(243, 234, 240, 0.08)',
      '--seg-selected': 'rgba(243, 234, 240, 0.16)',
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
