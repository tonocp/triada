import { describe, expect, it } from 'vitest';
import { GROUP_ORDER, GroupType, compareGroups } from './Group';

describe('domain/entities - Group', () => {
  describe('GroupType', () => {
    it('should have needs, wants, savings values', () => {
      expect(GroupType.NEEDS).toBe('needs');
      expect(GroupType.WANTS).toBe('wants');
      expect(GroupType.SAVINGS).toBe('savings');
    });
  });

  describe('GROUP_ORDER', () => {
    it('should preserve needs wants savings order', () => {
      expect(GROUP_ORDER).toEqual([GroupType.NEEDS, GroupType.WANTS, GroupType.SAVINGS]);
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
