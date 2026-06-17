import { webDarkTheme, webLightTheme, type Theme } from '@fluentui/react-components';

export type PorcelainThemeMode = 'light' | 'dark';

type PorcelainTokenSet = Partial<Theme> & {
  mode: PorcelainThemeMode;
  label: string;
  swatches: readonly string[];
  cssVariables: Record<`--${string}`, string>;
};

const fontFamilyBase =
  '"Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, system-ui, "Helvetica Neue", sans-serif';

export const porcelainTokens = {
  light: {
    mode: 'light',
    label: 'Porcelain',
    swatches: ['#faf7f4', '#ffffff', '#7458d8', '#287d7a'],
    colorBrandBackground: '#7458d8',
    colorBrandBackgroundHover: '#6046c3',
    colorBrandForeground1: '#7458d8',
    colorNeutralBackground1: '#ffffff',
    colorNeutralBackground2: '#f8f4f1',
    colorNeutralForeground1: '#2a1f22',
    colorNeutralForeground2: '#5b4a52',
    colorNeutralStroke1: '#e2d7cf',
    fontFamilyBase,
    cssVariables: {
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
      '--text3': '#8a7680',
      '--accent': '#7458d8',
      '--accent-strong': '#6046c3',
      '--accent-soft': 'rgba(116, 88, 216, 0.12)',
      '--accent-2': '#287d7a',
      '--danger': '#cb6454',
      '--danger-soft': 'rgba(203, 100, 84, 0.12)',
      '--warn': '#c28b2f',
      '--warn-soft': 'rgba(194, 139, 47, 0.13)',
      '--good': '#2f9372',
      '--good-soft': 'rgba(47, 147, 114, 0.12)',
      '--info': '#5f79db',
      '--info-soft': 'rgba(95, 121, 219, 0.12)',
    },
  },
  dark: {
    mode: 'dark',
    label: 'Porcelain Dark',
    swatches: ['#1b171b', '#241f25', '#9f8cff', '#47b7a8'],
    colorBrandBackground: '#9f8cff',
    colorBrandBackgroundHover: '#8671ea',
    colorBrandForeground1: '#9f8cff',
    colorNeutralBackground1: '#211b22',
    colorNeutralBackground2: '#1d1820',
    colorNeutralForeground1: '#f3eaf0',
    colorNeutralForeground2: '#d2c0ca',
    colorNeutralStroke1: '#463a48',
    fontFamilyBase,
    cssVariables: {
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
    },
  },
} as const satisfies Record<PorcelainThemeMode, PorcelainTokenSet>;

export function createPorcelainFluentTheme(mode: PorcelainThemeMode): Theme {
  const { cssVariables, mode: _mode, label: _label, swatches: _swatches, ...fluentTokens } = porcelainTokens[mode];
  const baseTheme = mode === 'dark' ? webDarkTheme : webLightTheme;
  void cssVariables;
  void _mode;
  void _label;
  void _swatches;

  return {
    ...baseTheme,
    ...fluentTokens,
  };
}
