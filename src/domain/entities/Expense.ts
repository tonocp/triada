import type { BucketType } from './Bucket';

export interface Expense {
  id: string;
  budgetMonthId: string;
  bucket: BucketType;
  amount: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseInput {
  budgetMonthId: string;
  bucket: BucketType;
  amount: number;
  description: string;
}

export interface UpdateExpenseInput {
  expenseId: string;
  amount: number;
  description: string;
}
