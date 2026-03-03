import type { SupportedCurrency } from '@/shared/composables/useCurrency';

export interface BudgetYear {
  id: string;
  monthlyIncome: number;
  year: number;
  currency: SupportedCurrency;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetYearInput {
  monthlyIncome: number;
  year: number;
  currency: SupportedCurrency;
}
