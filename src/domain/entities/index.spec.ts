import { describe, expect, it } from 'vitest';
import { GROUP_ORDER, GROUP_PERCENTAGES, GroupType, compareGroups } from './index';

describe('domain/entities index exports', () => {
  it('should re-export group domain members', () => {
    expect(GroupType.NEEDS).toBe('needs');
    expect(GROUP_ORDER).toEqual(['needs', 'wants', 'savings']);
    expect(GROUP_PERCENTAGES.savings).toBe(20);
    expect(compareGroups('needs', 'savings')).toBeLessThan(0);
  });
});
