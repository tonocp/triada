import type {
  AddExpenseToAllocationInput,
  BudgetAllocation,
  BudgetMonth,
  BudgetYear,
  Category,
  CategoryId,
  CreateBudgetAllocationInput,
  CreateBudgetMonthInput,
  CreateBudgetYearInput,
  CreateCategoryInput,
  CreateExpenseInput,
  DeleteExpenseInput,
  Expense,
  GroupType,
  UpdateCategoryNameInput,
  UpdateExpenseInput,
  UpdateMonthlyIncomeFromMonthInput,
} from '@/domain/entities';
import type { SupportedCurrency } from '@/shared/composables/useCurrency';
import type { BudgetDatabaseSnapshot } from './BudgetRepository.snapshot';

export interface BudgetRepository {
  createBudgetYear(input: CreateBudgetYearInput): Promise<BudgetYear>;
  getLatestBudgetYear(): Promise<BudgetYear | null>;
  getBudgetYearByYear(year: number): Promise<BudgetYear | null>;
  createBudgetMonth(input: CreateBudgetMonthInput): Promise<BudgetMonth>;
  getBudgetMonth(budgetYearId: string, month: number): Promise<BudgetMonth | null>;
  createBudgetAllocation(input: CreateBudgetAllocationInput): Promise<BudgetAllocation>;
  addExpenseToAllocation(input: AddExpenseToAllocationInput): Promise<BudgetAllocation>;
  addExpense(input: CreateExpenseInput): Promise<Expense>;
  updateExpense(input: UpdateExpenseInput): Promise<Expense>;
  deleteExpense(input: DeleteExpenseInput): Promise<void>;
  updateMonthlyIncomeFromMonth(input: UpdateMonthlyIncomeFromMonthInput): Promise<void>;
  getExpensesByMonthAndGroup(budgetMonthId: string, group: GroupType): Promise<Expense[]>;
  getCategoriesByGroup(
    group: GroupType,
    options?: { includeInactive?: boolean },
  ): Promise<Category[]>;
  createCategory(input: CreateCategoryInput): Promise<Category>;
  updateCategoryName(input: UpdateCategoryNameInput): Promise<void>;
  softDeleteCategoryAndReassign(input: {
    group: GroupType;
    categoryId: CategoryId;
    replacementCategoryId: CategoryId;
  }): Promise<void>;
  getAllocationsByMonth(budgetMonthId: string): Promise<BudgetAllocation[]>;
  createYearWithAllocations(
    monthlyIncome: number,
    year: number,
    currency: SupportedCurrency,
  ): Promise<{ budgetYear: BudgetYear; months: BudgetMonth[] }>;
  exportDatabase(): Promise<BudgetDatabaseSnapshot>;
  importDatabase(snapshot: unknown): Promise<void>;
}
