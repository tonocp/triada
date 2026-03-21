import type { BudgetAllocation } from './BudgetAllocation';

export interface BudgetMonth {
  id: string;
  budgetYearId: string;
  month: number;
  year: number;
  monthlyIncome: number;
  allocations: BudgetAllocation[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetMonthInput {
  budgetYearId: string;
  month: number;
  year: number;
  monthlyIncome?: number;
}
