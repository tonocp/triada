import type {
  AddExpenseToAllocationInput,
  BucketType,
  BudgetAllocation,
  BudgetMonth,
  BudgetYear,
  CreateBudgetAllocationInput,
  CreateBudgetMonthInput,
  CreateBudgetYearInput,
  CreateExpenseInput,
  Expense,
} from '@/domain/entities';
import type { SupportedCurrency } from '@/shared/composables/useCurrency';

export interface BudgetRepository {
  createBudgetYear(input: CreateBudgetYearInput): Promise<BudgetYear>;
  getLatestBudgetYear(): Promise<BudgetYear | null>;
  getBudgetYearByYear(year: number): Promise<BudgetYear | null>;
  createBudgetMonth(input: CreateBudgetMonthInput): Promise<BudgetMonth>;
  getBudgetMonth(budgetYearId: string, month: number): Promise<BudgetMonth | null>;
  createBudgetAllocation(input: CreateBudgetAllocationInput): Promise<BudgetAllocation>;
  addExpenseToAllocation(input: AddExpenseToAllocationInput): Promise<BudgetAllocation>;
  addExpense(input: CreateExpenseInput): Promise<Expense>;
  getExpensesByMonthAndBucket(budgetMonthId: string, bucket: BucketType): Promise<Expense[]>;
  getAllocationsByMonth(budgetMonthId: string): Promise<BudgetAllocation[]>;
  createYearWithAllocations(
    monthlyIncome: number,
    year: number,
    currency: SupportedCurrency,
  ): Promise<{ budgetYear: BudgetYear; months: BudgetMonth[] }>;
}
