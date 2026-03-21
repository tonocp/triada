import type { GroupType } from './Group';

export interface BudgetAllocation {
  id: string;
  budgetMonthId: string;
  group: GroupType;
  allocated: number;
  spent: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetAllocationInput {
  budgetMonthId: string;
  group: GroupType;
  allocated: number;
}

export interface AddExpenseToAllocationInput {
  budgetMonthId: string;
  group: GroupType;
  amount: number;
}
