import { webDarkTheme, webLightTheme, type Theme } from '@fluentui/react-components';

export const builderLightTheme: Theme = {
  ...webLightTheme,
  colorBrandBackground: '#3e6fa8',
  colorBrandBackgroundHover: '#345f91',
  colorBrandForeground1: '#345f91',
  colorNeutralBackground1: '#ffffff',
  colorNeutralBackground2: '#eceff3',
  colorNeutralForeground1: '#151a21',
  colorNeutralForeground2: '#364250',
  colorNeutralStroke1: '#d3d9e1',
  fontFamilyBase:
    '"Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, system-ui, "Helvetica Neue", sans-serif',
};

export const builderDarkTheme: Theme = {
  ...webDarkTheme,
  colorBrandBackground: '#78a6d8',
  colorBrandBackgroundHover: '#96b9e0',
  colorBrandForeground1: '#96b9e0',
  colorNeutralBackground1: '#202733',
  colorNeutralBackground2: '#171c23',
  colorNeutralForeground1: '#e2e7ee',
  colorNeutralForeground2: '#c3ccd8',
  colorNeutralStroke1: '#303a49',
  fontFamilyBase:
    '"Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, system-ui, "Helvetica Neue", sans-serif',
};
