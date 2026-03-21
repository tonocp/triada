import { describe, expect, it } from 'vitest';
import { GROUP_ICONS, GROUP_ORDER, GROUP_PERCENTAGES, GroupType, compareGroups } from './Group';

describe('domain/entities - Group', () => {
  describe('GroupType', () => {
    it('should have needs, wants, savings values', () => {
      expect(GroupType.NEEDS).toBe('needs');
      expect(GroupType.WANTS).toBe('wants');
      expect(GroupType.SAVINGS).toBe('savings');
    });
  });

  describe('GROUP_PERCENTAGES', () => {
    it('should have correct percentages for 50/30/20 rule', () => {
      expect(GROUP_PERCENTAGES[GroupType.NEEDS]).toBe(50);
      expect(GROUP_PERCENTAGES[GroupType.WANTS]).toBe(30);
      expect(GROUP_PERCENTAGES[GroupType.SAVINGS]).toBe(20);
    });

    it('should total 100', () => {
      const total =
        GROUP_PERCENTAGES[GroupType.NEEDS] +
        GROUP_PERCENTAGES[GroupType.WANTS] +
        GROUP_PERCENTAGES[GroupType.SAVINGS];
      expect(total).toBe(100);
    });
  });

  describe('GROUP_ORDER', () => {
    it('should preserve needs wants savings order', () => {
      expect(GROUP_ORDER).toEqual([GroupType.NEEDS, GroupType.WANTS, GroupType.SAVINGS]);
    });
  });

  describe('GROUP_ICONS', () => {
    it('should have icons for each group', () => {
      expect(GROUP_ICONS[GroupType.NEEDS]).toBe('pi pi-home');
      expect(GROUP_ICONS[GroupType.WANTS]).toBe('pi pi-shopping-bag');
      expect(GROUP_ICONS[GroupType.SAVINGS]).toBe('pi pi-wallet');
    });
  });

  describe('compareGroups', () => {
    it('should sort groups using domain order', () => {
      const unordered = [GroupType.SAVINGS, GroupType.NEEDS, GroupType.WANTS];
      const sorted = [...unordered].sort(compareGroups);
      expect(sorted).toEqual([GroupType.NEEDS, GroupType.WANTS, GroupType.SAVINGS]);
    });
  });
});
