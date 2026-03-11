import { GROUP_ORDER, type BudgetMonth, type GroupType } from '@/domain/entities';
import { describe, expect, it } from 'vitest';
import { buildYearSummary } from './yearSummary';

function createMonth(
  month: number,
  year: number,
  values: Record<GroupType, { allocated: number; spent: number }>,
): BudgetMonth {
  const now = new Date().toISOString();

  return {
    id: `month-${year}-${month}`,
    budgetYearId: `year-${year}`,
    month,
    year,
    monthlyIncome: 100_000,
    allocations: GROUP_ORDER.map((group) => ({
      id: `allocation-${year}-${month}-${group}`,
      budgetMonthId: `month-${year}-${month}`,
      group,
      allocated: values[group].allocated,
      spent: values[group].spent,
      createdAt: now,
      updatedAt: now,
    })),
    createdAt: now,
    updatedAt: now,
  };
}

describe('buildYearSummary', () => {
  it('should always return 12 month slots in order', () => {
    const outOfYearMonth = createMonth(12, 2025, {
      needs: { allocated: 40_000, spent: 10_000 },
      wants: { allocated: 30_000, spent: 5_000 },
      savings: { allocated: 30_000, spent: 2_000 },
    });

    const summary = buildYearSummary([null, outOfYearMonth], 2026);

    expect(summary.months).toHaveLength(12);
    expect(summary.months.map((month) => month.month)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  });

  it('should aggregate annual totals by bucket using minor units', () => {
    const january = createMonth(1, 2026, {
      needs: { allocated: 50_000, spent: 32_500 },
      wants: { allocated: 30_000, spent: 11_000 },
      savings: { allocated: 20_000, spent: 2_000 },
    });
    const february = createMonth(2, 2026, {
      needs: { allocated: 50_000, spent: 30_000 },
      wants: { allocated: 30_000, spent: 18_500 },
      savings: { allocated: 20_000, spent: 0 },
    });

    const summary = buildYearSummary([january, february], 2026);

    expect(summary.totalsByGroup).toEqual([
      {
        group: 'needs',
        allocated: 100_000,
        spent: 62_500,
        remaining: 37_500,
      },
      {
        group: 'wants',
        allocated: 60_000,
        spent: 29_500,
        remaining: 30_500,
      },
      {
        group: 'savings',
        allocated: 40_000,
        spent: 2_000,
        remaining: 38_000,
      },
    ]);
  });

  it('should keep missing months with hasBudget false and zero buckets', () => {
    const march = createMonth(3, 2026, {
      needs: { allocated: 50_000, spent: 20_000 },
      wants: { allocated: 30_000, spent: 10_000 },
      savings: { allocated: 20_000, spent: 5_000 },
    });

    const summary = buildYearSummary([march], 2026);
    const january = summary.months[0];
    const marchSummary = summary.months[2];

    expect(january).toBeDefined();
    expect(marchSummary).toBeDefined();

    expect(january).toEqual({
      month: 1,
      year: 2026,
      hasBudget: false,
      monthlyIncome: 0,
      buckets: {
        needs: { allocated: 0, spent: 0, remaining: 0 },
        wants: { allocated: 0, spent: 0, remaining: 0 },
        savings: { allocated: 0, spent: 0, remaining: 0 },
      },
    });

    expect(marchSummary?.hasBudget).toBe(true);
    expect(marchSummary?.monthlyIncome).toBe(100_000);
    expect(marchSummary?.buckets.needs).toEqual({
      allocated: 50_000,
      spent: 20_000,
      remaining: 30_000,
    });
  });
});
