import type { CategoryId } from './Category';
import type { GroupType } from './Group';

export interface Expense {
  id: string;
  budgetMonthId: string;
  group: GroupType;
  categoryId: CategoryId;
  amount: number;
  description: string;
  recurringRuleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseInput {
  budgetMonthId: string;
  group: GroupType;
  categoryId?: CategoryId;
  amount: number;
  description: string;
  isRecurring?: boolean;
}

export interface UpdateExpenseInput {
  expenseId: string;
  amount: number;
  description: string;
  applyToFuture?: boolean;
}

export interface DeleteExpenseInput {
  expenseId: string;
  applyToFuture?: boolean;
}
