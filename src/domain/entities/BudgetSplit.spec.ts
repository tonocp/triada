import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GROUP_SPLIT,
  allocateBudget,
  groupShares,
  isValidBudgetSplit,
  parseBudgetSplit,
} from './BudgetSplit';

describe('domain/entities - BudgetSplit', () => {
  describe('DEFAULT_GROUP_SPLIT', () => {
    it('should be the 50/30/20 rule', () => {
      expect(DEFAULT_GROUP_SPLIT).toEqual({ needs: 50, wants: 30, savings: 20 });
    });

    it('should be a valid split', () => {
      expect(isValidBudgetSplit(DEFAULT_GROUP_SPLIT)).toBe(true);
    });
  });

  describe('isValidBudgetSplit', () => {
    it('should accept any three whole shares that sum to 100', () => {
      expect(isValidBudgetSplit({ needs: 60, wants: 25, savings: 15 })).toBe(true);
      expect(isValidBudgetSplit({ needs: 100, wants: 0, savings: 0 })).toBe(true);
    });

    it('should reject shares that do not sum to 100', () => {
      expect(isValidBudgetSplit({ needs: 50, wants: 30, savings: 19 })).toBe(false);
      expect(isValidBudgetSplit({ needs: 50, wants: 30, savings: 21 })).toBe(false);
    });

    it('should reject negative or out-of-range shares', () => {
      expect(isValidBudgetSplit({ needs: 110, wants: -5, savings: -5 })).toBe(false);
      expect(isValidBudgetSplit({ needs: -10, wants: 60, savings: 50 })).toBe(false);
    });

    it('should reject non-integer shares', () => {
      expect(isValidBudgetSplit({ needs: 33.3, wants: 33.3, savings: 33.4 })).toBe(false);
    });
  });

  describe('parseBudgetSplit', () => {
    it('should read a split-shaped object', () => {
      expect(parseBudgetSplit({ needs: 60, wants: 25, savings: 15 })).toEqual({
        needs: 60,
        wants: 25,
        savings: 15,
      });
    });

    it('should parse a JSON string', () => {
      expect(parseBudgetSplit('{"needs":40,"wants":40,"savings":20}')).toEqual({
        needs: 40,
        wants: 40,
        savings: 20,
      });
    });

    it('should default each missing or non-finite share', () => {
      expect(parseBudgetSplit(null)).toEqual(DEFAULT_GROUP_SPLIT);
      expect(parseBudgetSplit('not json')).toEqual(DEFAULT_GROUP_SPLIT);
      expect(parseBudgetSplit({ needs: 70 })).toEqual({ needs: 70, wants: 30, savings: 20 });
      expect(parseBudgetSplit({ needs: Number.NaN, wants: 30, savings: 20 })).toEqual(
        DEFAULT_GROUP_SPLIT,
      );
    });
  });

  describe('groupShares', () => {
    it('should return each group percentage of the total allocated', () => {
      expect(
        groupShares([
          { group: 'needs', allocated: 600 },
          { group: 'wants', allocated: 300 },
          { group: 'savings', allocated: 100 },
        ]),
      ).toEqual({ needs: 60, wants: 30, savings: 10 });
    });

    it('should ignore negative allocations and missing groups', () => {
      expect(
        groupShares([
          { group: 'needs', allocated: 50 },
          { group: 'wants', allocated: -20 },
        ]),
      ).toEqual({ needs: 100, wants: 0, savings: 0 });
    });

    it('should return null when nothing is allocated', () => {
      expect(groupShares([])).toBeNull();
      expect(groupShares([{ group: 'needs', allocated: 0 }])).toBeNull();
    });
  });

  describe('allocateBudget', () => {
    it('should floor each group share of the monthly income', () => {
      expect(allocateBudget(100_000, DEFAULT_GROUP_SPLIT)).toEqual({
        needs: 50_000,
        wants: 30_000,
        savings: 20_000,
      });
    });

    it('should apply a custom split', () => {
      expect(allocateBudget(200_000, { needs: 60, wants: 25, savings: 15 })).toEqual({
        needs: 120_000,
        wants: 50_000,
        savings: 30_000,
      });
    });

    it('should floor uneven divisions', () => {
      expect(allocateBudget(333, DEFAULT_GROUP_SPLIT)).toEqual({
        needs: 166,
        wants: 99,
        savings: 66,
      });
    });

    it('should return zeros for zero income', () => {
      expect(allocateBudget(0, DEFAULT_GROUP_SPLIT)).toEqual({ needs: 0, wants: 0, savings: 0 });
    });
  });
});
