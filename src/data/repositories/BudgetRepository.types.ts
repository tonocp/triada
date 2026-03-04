import type {
  BudgetAllocation,
  BudgetMonth,
  BudgetYear,
  CreateBudgetAllocationInput,
  CreateBudgetMonthInput,
  CreateBudgetYearInput,
} from '@/domain/entities';
import type { SupportedCurrency } from '@/shared/composables/useCurrency';

export interface BudgetRepository {
  createBudgetYear(input: CreateBudgetYearInput): Promise<BudgetYear>;
  getLatestBudgetYear(): Promise<BudgetYear | null>;
  createBudgetMonth(input: CreateBudgetMonthInput): Promise<BudgetMonth>;
  getBudgetMonth(budgetYearId: string, month: number): Promise<BudgetMonth | null>;
  createBudgetAllocation(input: CreateBudgetAllocationInput): Promise<BudgetAllocation>;
  getAllocationsByMonth(budgetMonthId: string): Promise<BudgetAllocation[]>;
  createYearWithAllocations(
    monthlyIncome: number,
    year: number,
    currency: SupportedCurrency,
  ): Promise<{ budgetYear: BudgetYear; months: BudgetMonth[] }>;
}
