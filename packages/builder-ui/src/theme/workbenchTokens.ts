import { webDarkTheme, webLightTheme, type Theme } from '@fluentui/react-components';

export type PorcelainThemeMode = 'light' | 'dark';

type PorcelainTokenSet = Partial<Theme> & {
  colorBrandBackground: string;
  colorBrandBackgroundHover: string;
  colorBrandForeground1: string;
  cssVariables: Record<`--porcelain-${string}`, string>;
};

const fontFamilyBase =
  '"Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, system-ui, "Helvetica Neue", sans-serif';

export const porcelainTokens = {
  light: {
    colorBrandBackground: '#2b74d4',
    colorBrandBackgroundHover: '#2568bf',
    colorBrandForeground1: '#2b74d4',
    colorNeutralBackground1: '#ffffff',
    colorNeutralBackground2: '#eef3f8',
    colorNeutralForeground1: '#151a21',
    colorNeutralForeground2: '#364250',
    colorNeutralStroke1: '#d5dee8',
    fontFamilyBase,
    cssVariables: {
      '--porcelain-bg': '#f4f7fb',
      '--porcelain-bg2': '#eef3f8',
      '--porcelain-surface': '#ffffff',
      '--porcelain-surface-hover': '#f8fbff',
      '--porcelain-surface-pressed': '#e7edf5',
      '--porcelain-surface2': '#eef3f8',
      '--porcelain-surface3': '#e3ebf4',
      '--porcelain-panel': 'rgba(255, 255, 255, 0.92)',
      '--porcelain-border': '#d5dee8',
      '--porcelain-border-muted': '#e5ebf2',
      '--porcelain-border-strong': '#b8c5d5',
      '--porcelain-text': '#151a21',
      '--porcelain-text2': '#364250',
      '--porcelain-text3': '#65758b',
      '--porcelain-text4': '#7b899b',
      '--porcelain-on-accent': '#ffffff',
      '--porcelain-accent': '#2b74d4',
      '--porcelain-accent-hover': '#2568bf',
      '--porcelain-accent-pressed': '#1f5ba8',
      '--porcelain-accent-soft': 'rgba(62, 141, 245, 0.14)',
      '--porcelain-accent-2': '#0f9f91',
      '--porcelain-danger': '#b94836',
      '--porcelain-danger-soft': '#fff1ee',
      '--porcelain-danger-stroke': '#f2b8af',
      '--porcelain-warn': '#9a650f',
      '--porcelain-warn-soft': '#fff7e7',
      '--porcelain-warn-stroke': '#ecd19b',
      '--porcelain-good': '#1f7a58',
      '--porcelain-good-soft': '#e9f8f1',
      '--porcelain-good-stroke': '#a8dcc6',
      '--porcelain-info': '#2b74d4',
      '--porcelain-info-soft': 'rgba(62, 141, 245, 0.14)',
      '--porcelain-shadow-sm': '0 1px 2px rgba(17, 25, 39, 0.12)',
      '--porcelain-shadow-md': '0 18px 48px rgba(17, 25, 39, 0.12)',
      '--porcelain-ring': '0 0 0 3px rgba(62, 141, 245, 0.22)',
      '--porcelain-radius': '20px',
      '--porcelain-radius-md': '12px',
      '--porcelain-radius-sm': '10px',
      '--porcelain-brand-glow': 'rgba(62, 141, 245, 0.12)',
    },
  },
  dark: {
    colorBrandBackground: '#3e8df5',
    colorBrandBackgroundHover: '#58a8ff',
    colorBrandForeground1: '#58a8ff',
    colorNeutralBackground1: '#161e29',
    colorNeutralBackground2: '#131a22',
    colorNeutralForeground1: '#e7edf6',
    colorNeutralForeground2: '#bac5d4',
    colorNeutralStroke1: '#2d394a',
    fontFamilyBase,
    cssVariables: {
      '--porcelain-bg': '#0f1319',
      '--porcelain-bg2': '#131a22',
      '--porcelain-surface': '#161e29',
      '--porcelain-surface-hover': '#1d2734',
      '--porcelain-surface-pressed': '#111821',
      '--porcelain-surface2': '#1d2734',
      '--porcelain-surface3': '#263140',
      '--porcelain-panel': 'rgba(18, 24, 34, 0.92)',
      '--porcelain-border': '#2d394a',
      '--porcelain-border-muted': '#263140',
      '--porcelain-border-strong': '#39485d',
      '--porcelain-text': '#e7edf6',
      '--porcelain-text2': '#bac5d4',
      '--porcelain-text3': '#8292a8',
      '--porcelain-text4': '#6e7d90',
      '--porcelain-on-accent': '#ffffff',
      '--porcelain-accent': '#3e8df5',
      '--porcelain-accent-hover': '#58a8ff',
      '--porcelain-accent-pressed': '#2b74d4',
      '--porcelain-accent-soft': 'rgba(62, 141, 245, 0.14)',
      '--porcelain-accent-2': '#14b8a6',
      '--porcelain-danger': '#f97360',
      '--porcelain-danger-soft': 'rgba(249, 115, 96, 0.14)',
      '--porcelain-danger-stroke': 'rgba(249, 115, 96, 0.44)',
      '--porcelain-warn': '#f5b641',
      '--porcelain-warn-soft': 'rgba(245, 182, 65, 0.14)',
      '--porcelain-warn-stroke': 'rgba(245, 182, 65, 0.44)',
      '--porcelain-good': '#35c58a',
      '--porcelain-good-soft': 'rgba(53, 197, 138, 0.14)',
      '--porcelain-good-stroke': 'rgba(53, 197, 138, 0.44)',
      '--porcelain-info': '#58a8ff',
      '--porcelain-info-soft': 'rgba(88, 168, 255, 0.14)',
      '--porcelain-shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.22)',
      '--porcelain-shadow-md': '0 18px 48px rgba(0, 0, 0, 0.24)',
      '--porcelain-ring': '0 0 0 3px rgba(62, 141, 245, 0.24)',
      '--porcelain-radius': '20px',
      '--porcelain-radius-md': '12px',
      '--porcelain-radius-sm': '10px',
      '--porcelain-brand-glow': 'rgba(62, 141, 245, 0.12)',
    },
  },
} as const satisfies Record<PorcelainThemeMode, PorcelainTokenSet>;

export function createPorcelainFluentTheme(mode: PorcelainThemeMode): Theme {
  const { cssVariables, ...fluentTokens } = porcelainTokens[mode];
  const baseTheme = mode === 'dark' ? webDarkTheme : webLightTheme;
  void cssVariables;

  return {
    ...baseTheme,
    ...fluentTokens,
  };
}
