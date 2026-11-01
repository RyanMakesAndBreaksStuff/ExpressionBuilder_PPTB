import { describe, expect, it } from 'vitest';
import { nextTabIndex } from '../src/workbench/payloadTreeModel';

describe('nextTabIndex', () => {
  it('jumps to the ends and wraps the arrows', () => {
    expect(nextTabIndex('Home', 2, 4)).toBe(0);
    expect(nextTabIndex('End', 0, 4)).toBe(3);
    expect(nextTabIndex('ArrowRight', 3, 4)).toBe(0);
    expect(nextTabIndex('ArrowLeft', 0, 4)).toBe(3);
  });

  it('ignores other keys', () => {
    expect(nextTabIndex('a', 1, 4)).toBeNull();
  });
});
