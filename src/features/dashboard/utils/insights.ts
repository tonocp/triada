import type { CategoryId, Expense, GroupType } from '@/domain/entities';

export interface CategorySpend {
  categoryId: CategoryId;
  group: GroupType;
  spent: number;
}

/**
 * Total spend per category across the given expenses, highest first, capped at
 * `limit`. Categories with no spend are dropped.
 */
export function topCategories(expenses: Expense[], limit: number): CategorySpend[] {
  const byCategory = new Map<CategoryId, CategorySpend>();

  for (const expense of expenses) {
    const entry = byCategory.get(expense.categoryId) ?? {
      categoryId: expense.categoryId,
      group: expense.group,
      spent: 0,
    };
    entry.spent += expense.amount;
    byCategory.set(expense.categoryId, entry);
  }

  return [...byCategory.values()]
    .filter((entry) => entry.spent > 0)
    .sort((left, right) => right.spent - left.spent)
    .slice(0, Math.max(limit, 0));
}
