import { describe, expect, it } from 'vitest';
import {
  CategoryId,
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORIES_BY_GROUP,
  isValidCategoryForGroup,
} from './Category';

describe('domain/entities - Category', () => {
  it('should define three default categories per group', () => {
    expect(DEFAULT_CATEGORIES_BY_GROUP.needs).toEqual(['housing', 'food', 'transport']);
    expect(DEFAULT_CATEGORIES_BY_GROUP.wants).toEqual(['dining', 'entertainment', 'shopping']);
    expect(DEFAULT_CATEGORIES_BY_GROUP.savings).toEqual([
      'emergency_fund',
      'investments',
      'financial_goals',
    ]);
  });

  it('should keep category catalog with stable ids', () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(9);
    expect(DEFAULT_CATEGORIES.map((item) => item.id)).toContain(CategoryId.FINANCIAL_GOALS);
  });

  it('should validate category ownership by group', () => {
    expect(isValidCategoryForGroup('needs', CategoryId.FOOD)).toBe(true);
    expect(isValidCategoryForGroup('needs', CategoryId.SHOPPING)).toBe(false);
  });
});
