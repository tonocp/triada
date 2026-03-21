import { GROUP_ORDER, type BudgetMonth, type GroupType } from '@/domain/entities';

export interface BucketTotals {
  group: GroupType;
  allocated: number;
  spent: number;
  remaining: number;
}

export interface MonthBucketSummary {
  allocated: number;
  spent: number;
  remaining: number;
}

export interface YearMonthSummary {
  month: number;
  year: number;
  hasBudget: boolean;
  monthlyIncome: number;
  buckets: Record<GroupType, MonthBucketSummary>;
}

export interface YearSummary {
  months: YearMonthSummary[];
  totalsByGroup: BucketTotals[];
}

function createEmptyBucketSummary(): MonthBucketSummary {
  return {
    allocated: 0,
    spent: 0,
    remaining: 0,
  };
}

function createEmptyMonthBuckets(): Record<GroupType, MonthBucketSummary> {
  return {
    needs: createEmptyBucketSummary(),
    wants: createEmptyBucketSummary(),
    savings: createEmptyBucketSummary(),
  };
}

export function buildYearSummary(months: Array<BudgetMonth | null>, year: number): YearSummary {
  const monthByNumber = new Map<number, BudgetMonth>();

  for (const month of months) {
    if (month === null) {
      continue;
    }

    if (month.year !== year) {
      continue;
    }

    monthByNumber.set(month.month, month);
  }

  const totalsByGroupMap = new Map<GroupType, BucketTotals>(
    GROUP_ORDER.map((group) => [
      group,
      {
        group,
        allocated: 0,
        spent: 0,
        remaining: 0,
      },
    ]),
  );

  const monthSummaries: YearMonthSummary[] = [];

  for (let month = 1; month <= 12; month++) {
    const budgetMonth = monthByNumber.get(month);

    if (!budgetMonth) {
      monthSummaries.push({
        month,
        year,
        hasBudget: false,
        monthlyIncome: 0,
        buckets: createEmptyMonthBuckets(),
      });
      continue;
    }

    const bucketSummaries = createEmptyMonthBuckets();

    for (const allocation of budgetMonth.allocations) {
      const remaining = allocation.allocated - allocation.spent;
      bucketSummaries[allocation.group] = {
        allocated: allocation.allocated,
        spent: allocation.spent,
        remaining,
      };

      const totals = totalsByGroupMap.get(allocation.group);
      if (totals) {
        totals.allocated += allocation.allocated;
        totals.spent += allocation.spent;
        totals.remaining += remaining;
      }
    }

    monthSummaries.push({
      month,
      year,
      hasBudget: true,
      monthlyIncome: budgetMonth.monthlyIncome,
      buckets: bucketSummaries,
    });
  }

  return {
    months: monthSummaries,
    totalsByGroup: GROUP_ORDER.map((group) => totalsByGroupMap.get(group)).filter(
      (value): value is BucketTotals => value !== undefined,
    ),
  };
}
