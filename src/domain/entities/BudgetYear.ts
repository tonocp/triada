import type { SupportedCurrency } from '@/shared/composables/useCurrency';
import type { BudgetSplit } from './BudgetSplit';

export interface BudgetYear {
  id: string;
  monthlyIncome: number;
  year: number;
  currency: SupportedCurrency;
  split: BudgetSplit;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetYearInput {
  monthlyIncome: number;
  year: number;
  currency: SupportedCurrency;
  split?: BudgetSplit;
}

export interface UpdateMonthlyIncomeFromMonthInput {
  budgetYearId: string;
  fromMonth: number;
  monthlyIncome: number;
  split: BudgetSplit;
}

export interface UpdateBudgetSplitInput {
  budgetYearId: string;
  split: BudgetSplit;
}
