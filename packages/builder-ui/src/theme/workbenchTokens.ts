import { webDarkTheme, webLightTheme, type Theme } from '@fluentui/react-components';

export type GraphiteThemeMode = 'light' | 'dark';
export type PaletteId = 'graphiteLight' | 'graphiteDark';

// Runtime theme source of truth. Keep raw theme colors in this file so both
// Fluent aliases and the workbench CSS consume the same semantic palette.
type GraphiteTokenSet = Partial<Theme> & {
  mode: GraphiteThemeMode;
  label: string;
  swatches: readonly string[];
  cssVariables: Record<`--${string}`, string>;
};

const fontFamilyBase = '"Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, system-ui, "Helvetica Neue", sans-serif';

export const graphiteTokens = {
  graphiteLight: {
    mode: 'light' as const,
    label: 'Graphite',
    swatches: ['#F6F8FA', '#FDFEFF', '#155EEF', '#087D78'] as const,
    colorBrandBackground: '#155EEF',
    colorBrandBackgroundHover: '#004EEB',
    colorBrandBackgroundPressed: '#004EEB',
    colorBrandBackgroundSelected: '#004EEB',
    colorBrandForeground1: '#155EEF',
    colorBrandStroke1: '#155EEF',
    colorNeutralBackground1: '#FDFEFF',
    colorNeutralBackground2: '#EEF2F5',
    colorNeutralBackground3: '#E1E7EC',
    colorNeutralForeground1: '#18212B',
    colorNeutralForeground2: '#41505F',
    colorNeutralForeground3: '#647484',
    colorNeutralForegroundOnBrand: '#F7FAFF',
    colorNeutralStroke1: '#D2DCE5',
    colorNeutralStroke2: '#AEBDCA',
    colorNeutralStrokeAccessible: '#647484',
    colorPaletteRedBackground1: 'rgba(190, 69, 64, 0.12)',
    colorPaletteRedForeground1: '#BE4540',
    colorPaletteRedBorder1: '#BE4540',
    colorPaletteYellowBackground1: 'rgba(139, 100, 20, 0.12)',
    colorPaletteYellowForeground1: '#8B6414',
    colorPaletteYellowBorder1: '#8B6414',
    colorPaletteGreenBackground1: 'rgba(35, 119, 84, 0.12)',
    colorPaletteGreenForeground1: '#237754',
    colorPaletteGreenBorder1: '#237754',
    colorPaletteBlueBackground2: 'rgba(30, 101, 194, 0.12)',
    colorPaletteBlueForeground2: '#1E65C2',
    colorPaletteBlueBorderActive: '#1E65C2',
    fontFamilyBase,
    cssVariables: {
      '--bg': '#F6F8FA',
      '--bg2': '#FBFCFD',
      '--surface': '#FDFEFF',
      '--surface2': '#EEF2F5',
      '--surface3': '#E1E7EC',
      '--panel': 'rgba(253, 254, 255, 0.95)',
      '--border': '#D2DCE5',
      '--border-strong': '#AEBDCA',
      '--interactive-stroke': '#647484',
      '--text': '#18212B',
      '--text2': '#41505F',
      '--text3': '#647484',
      '--accent': '#155EEF',
      '--accent-strong': '#004EEB',
      '--accent-ink': '#F7FAFF',
      '--accent-soft': 'rgba(21, 94, 239, 0.12)',
      '--accent-2': '#087D78',
      '--danger': '#BE4540',
      '--danger-soft': 'rgba(190, 69, 64, 0.12)',
      '--warn': '#8B6414',
      '--warn-soft': 'rgba(139, 100, 20, 0.12)',
      '--good': '#237754',
      '--good-soft': 'rgba(35, 119, 84, 0.12)',
      '--info': '#1E65C2',
      '--info-soft': 'rgba(30, 101, 194, 0.12)',
      '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.14)',
      '--shadow-md': '0 18px 48px rgba(0, 0, 0, 0.22)',
    },
  },
  graphiteDark: {
    mode: 'dark' as const,
    label: 'Graphite Dark',
    swatches: ['#12161A', '#1B2228', '#77A7FF', '#55C5BB'] as const,
    colorBrandBackground: '#77A7FF',
    colorBrandBackgroundHover: '#5690F4',
    colorBrandBackgroundPressed: '#5690F4',
    colorBrandBackgroundSelected: '#5690F4',
    colorBrandForeground1: '#77A7FF',
    colorBrandStroke1: '#77A7FF',
    colorNeutralBackground1: '#1B2228',
    colorNeutralBackground2: '#232D35',
    colorNeutralBackground3: '#2D3943',
    colorNeutralForeground1: '#EDF3F7',
    colorNeutralForeground2: '#C8D3DC',
    colorNeutralForeground3: '#9EADB9',
    colorNeutralForegroundOnBrand: '#0C1A34',
    colorNeutralStroke1: '#394955',
    colorNeutralStroke2: '#526776',
    colorNeutralStrokeAccessible: '#9EADB9',
    colorPaletteRedBackground1: 'rgba(255, 151, 141, 0.14)',
    colorPaletteRedForeground1: '#FF978D',
    colorPaletteRedBorder1: '#FF978D',
    colorPaletteYellowBackground1: 'rgba(239, 197, 110, 0.14)',
    colorPaletteYellowForeground1: '#EFC56E',
    colorPaletteYellowBorder1: '#EFC56E',
    colorPaletteGreenBackground1: 'rgba(99, 201, 155, 0.14)',
    colorPaletteGreenForeground1: '#63C99B',
    colorPaletteGreenBorder1: '#63C99B',
    colorPaletteBlueBackground2: 'rgba(154, 190, 255, 0.14)',
    colorPaletteBlueForeground2: '#9ABEFF',
    colorPaletteBlueBorderActive: '#9ABEFF',
    fontFamilyBase,
    cssVariables: {
      '--bg': '#12161A',
      '--bg2': '#161C21',
      '--surface': '#1B2228',
      '--surface2': '#232D35',
      '--surface3': '#2D3943',
      '--panel': 'rgba(27, 34, 40, 0.94)',
      '--border': '#394955',
      '--border-strong': '#526776',
      '--interactive-stroke': '#9EADB9',
      '--text': '#EDF3F7',
      '--text2': '#C8D3DC',
      '--text3': '#9EADB9',
      '--accent': '#77A7FF',
      '--accent-strong': '#5690F4',
      '--accent-ink': '#0C1A34',
      '--accent-soft': 'rgba(119, 167, 255, 0.16)',
      '--accent-2': '#55C5BB',
      '--danger': '#FF978D',
      '--danger-soft': 'rgba(255, 151, 141, 0.14)',
      '--warn': '#EFC56E',
      '--warn-soft': 'rgba(239, 197, 110, 0.14)',
      '--good': '#63C99B',
      '--good-soft': 'rgba(99, 201, 155, 0.14)',
      '--info': '#9ABEFF',
      '--info-soft': 'rgba(154, 190, 255, 0.14)',
      '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.22)',
      '--shadow-md': '0 18px 48px rgba(0, 0, 0, 0.22)',
    },
  },
} as const satisfies Record<PaletteId, GraphiteTokenSet>;

export function createGraphiteFluentTheme(paletteId: PaletteId): Theme {
  const { cssVariables, mode: _mode, label: _label, swatches: _swatches, ...fluentTokens } = graphiteTokens[paletteId];
  const baseTheme = graphiteTokens[paletteId].mode === 'dark' ? webDarkTheme : webLightTheme;
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
  if (value === 'graphiteLight' || value === 'graphiteDark') return value;
  if (value === 'porcelainLight') return 'graphiteLight';
  if (value === 'porcelainDark') return 'graphiteDark';
  return null;
}
