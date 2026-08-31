export type WrapperDef = { id: string; label: string; detail: string };

export const WRAPPERS: WrapperDef[] = [
  { id: 'toLower', label: 'toLower', detail: 'Normalize text before comparing.' },
  { id: 'toUpper', label: 'toUpper', detail: 'Uppercase text before comparing.' },
  { id: 'trim', label: 'trim', detail: 'Remove leading and trailing spaces.' },
  { id: 'length', label: 'length', detail: 'Compare string length.' },
  { id: 'coalesce', label: 'coalesce', detail: 'Fall back to empty when null.' },
];
