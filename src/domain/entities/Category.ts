import type { GroupType } from './Group';

export const CategoryId = {
  HOUSING: 'housing',
  FOOD: 'food',
  TRANSPORT: 'transport',
  DINING: 'dining',
  ENTERTAINMENT: 'entertainment',
  SHOPPING: 'shopping',
  EMERGENCY_FUND: 'emergency_fund',
  INVESTMENTS: 'investments',
  FINANCIAL_GOALS: 'financial_goals',
} as const;

export type CategoryId = (typeof CategoryId)[keyof typeof CategoryId];

export interface Category {
  id: CategoryId;
  group: GroupType;
  order: number;
  isDefault: boolean;
  isActive: boolean;
  deletedAt: string | null;
}

export const DEFAULT_CATEGORIES_BY_GROUP: Record<GroupType, readonly CategoryId[]> = {
  needs: [CategoryId.HOUSING, CategoryId.FOOD, CategoryId.TRANSPORT],
  wants: [CategoryId.DINING, CategoryId.ENTERTAINMENT, CategoryId.SHOPPING],
  savings: [CategoryId.EMERGENCY_FUND, CategoryId.INVESTMENTS, CategoryId.FINANCIAL_GOALS],
};

export const DEFAULT_CATEGORIES: readonly Category[] = [
  {
    id: CategoryId.HOUSING,
    group: 'needs',
    order: 0,
    isDefault: true,
    isActive: true,
    deletedAt: null,
  },
  {
    id: CategoryId.FOOD,
    group: 'needs',
    order: 1,
    isDefault: true,
    isActive: true,
    deletedAt: null,
  },
  {
    id: CategoryId.TRANSPORT,
    group: 'needs',
    order: 2,
    isDefault: true,
    isActive: true,
    deletedAt: null,
  },
  {
    id: CategoryId.DINING,
    group: 'wants',
    order: 0,
    isDefault: true,
    isActive: true,
    deletedAt: null,
  },
  {
    id: CategoryId.ENTERTAINMENT,
    group: 'wants',
    order: 1,
    isDefault: true,
    isActive: true,
    deletedAt: null,
  },
  {
    id: CategoryId.SHOPPING,
    group: 'wants',
    order: 2,
    isDefault: true,
    isActive: true,
    deletedAt: null,
  },
  {
    id: CategoryId.EMERGENCY_FUND,
    group: 'savings',
    order: 0,
    isDefault: true,
    isActive: true,
    deletedAt: null,
  },
  {
    id: CategoryId.INVESTMENTS,
    group: 'savings',
    order: 1,
    isDefault: true,
    isActive: true,
    deletedAt: null,
  },
  {
    id: CategoryId.FINANCIAL_GOALS,
    group: 'savings',
    order: 2,
    isDefault: true,
    isActive: true,
    deletedAt: null,
  },
];

export function isValidCategoryForGroup(group: GroupType, categoryId: CategoryId): boolean {
  return DEFAULT_CATEGORIES_BY_GROUP[group].includes(categoryId);
}
