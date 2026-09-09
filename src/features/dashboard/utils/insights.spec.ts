import type { Expense } from '@/domain/entities';
import { describe, expect, it } from 'vitest';
import { topCategories } from './insights';

function expense(partial: Partial<Expense>): Expense {
  return {
    id: 'e',
    budgetMonthId: 'm',
    group: 'needs',
    categoryId: 'housing',
    amount: 0,
    description: '',
    recurringRuleId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('topCategories', () => {
  it('should sum spend per category and rank highest first', () => {
    const result = topCategories(
      [
        expense({ categoryId: 'housing', group: 'needs', amount: 30_000 }),
        expense({ categoryId: 'food', group: 'needs', amount: 12_000 }),
        expense({ categoryId: 'housing', group: 'needs', amount: 20_000 }),
        expense({ categoryId: 'dining', group: 'wants', amount: 8_000 }),
      ],
      5,
    );

    expect(result).toEqual([
      { categoryId: 'housing', group: 'needs', spent: 50_000 },
      { categoryId: 'food', group: 'needs', spent: 12_000 },
      { categoryId: 'dining', group: 'wants', spent: 8_000 },
    ]);
  });

  it('should cap the list at the limit', () => {
    const result = topCategories(
      [
        expense({ categoryId: 'housing', amount: 40_000 }),
        expense({ categoryId: 'food', amount: 30_000 }),
        expense({ categoryId: 'transport', amount: 20_000 }),
      ],
      2,
    );

    expect(result.map((entry) => entry.categoryId)).toEqual(['housing', 'food']);
  });

  it('should drop categories with no spend and handle an empty list', () => {
    expect(topCategories([expense({ categoryId: 'housing', amount: 0 })], 5)).toEqual([]);
    expect(topCategories([], 5)).toEqual([]);
    expect(topCategories([expense({ amount: 100 })], 0)).toEqual([]);
  });
});
