import { GROUP_ORDER, type GroupType } from './Group';

export type BudgetSplit = Record<GroupType, number>;

export const DEFAULT_GROUP_SPLIT: BudgetSplit = {
  needs: 50,
  wants: 30,
  savings: 20,
};

export function isValidBudgetSplit(split: BudgetSplit): boolean {
  let total = 0;
  for (const group of GROUP_ORDER) {
    const share = split[group];
    if (!Number.isInteger(share) || share < 0 || share > 100) {
      return false;
    }
    total += share;
  }
  return total === 100;
}

export function parseBudgetSplit(raw: unknown): BudgetSplit {
  const source: unknown = typeof raw === 'string' ? safeParse(raw) : raw;
  const record = (source ?? {}) as Record<string, unknown>;
  const share = (value: unknown, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return {
    needs: share(record.needs, DEFAULT_GROUP_SPLIT.needs),
    wants: share(record.wants, DEFAULT_GROUP_SPLIT.wants),
    savings: share(record.savings, DEFAULT_GROUP_SPLIT.savings),
  };
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function allocateBudget(
  monthlyIncome: number,
  split: BudgetSplit,
): Record<GroupType, number> {
  const allocations = {} as Record<GroupType, number>;
  for (const group of GROUP_ORDER) {
    allocations[group] = Math.floor((monthlyIncome * split[group]) / 100);
  }
  return allocations;
}

export function groupShares(
  buckets: { group: GroupType; allocated: number }[],
): Record<GroupType, number> | null {
  const total = buckets.reduce((sum, bucket) => sum + Math.max(bucket.allocated, 0), 0);
  if (total <= 0) {
    return null;
  }
  const byGroup = new Map(buckets.map((bucket) => [bucket.group, bucket]));
  const shares = {} as Record<GroupType, number>;
  for (const group of GROUP_ORDER) {
    shares[group] = (Math.max(byGroup.get(group)?.allocated ?? 0, 0) / total) * 100;
  }
  return shares;
}
