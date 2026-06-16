export type PlatformTheme = 'light' | 'dark' | 'highContrast';
export type NotificationLevel = 'success' | 'info' | 'warning' | 'error';

export interface PlatformSettings {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface PlatformAdapter {
  copyToClipboard(text: string): Promise<void>;
  notify(message: string, level: NotificationLevel): Promise<void>;
  getTheme(): Promise<PlatformTheme>;
  onThemeChanged(handler: (theme: PlatformTheme) => void): () => void;
  settings: PlatformSettings;
  getDataverseFields(): Promise<unknown[]>;
}
