import type { BucketType } from './Bucket';

export interface BudgetAllocation {
  id: string;
  budgetMonthId: string;
  bucket: BucketType;
  allocated: number;
  spent: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetAllocationInput {
  budgetMonthId: string;
  bucket: BucketType;
  allocated: number;
}
