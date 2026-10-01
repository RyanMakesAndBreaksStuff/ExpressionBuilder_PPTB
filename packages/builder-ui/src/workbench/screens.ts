/** The three screens the pill's mode chip switches between, in design order (FR-3). */
export type ScreenId = 'functions' | 'condition' | 'jsonReference';

export const SCREENS: ReadonlyArray<{ id: ScreenId; label: string }> = [
  { id: 'functions', label: 'Functions' },
  { id: 'condition', label: 'Trigger / Filter' },
  { id: 'jsonReference', label: 'JSON reference' },
];
