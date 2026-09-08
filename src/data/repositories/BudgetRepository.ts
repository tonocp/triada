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
import { Capacitor } from '@capacitor/core';
import { indexedDbBudgetRepository } from './BudgetRepository.indexeddb';
import type { BudgetDatabaseSnapshot } from './BudgetRepository.snapshot';
import { sqliteBudgetRepository } from './BudgetRepository.sqlite';
import type { BudgetRepository } from './BudgetRepository.types';

let repository: BudgetRepository | null = null;

function isNativeRuntime(): boolean {
  const platform = Capacitor.getPlatform();
  return platform === 'ios' || platform === 'android';
}

function getRepository(): BudgetRepository {
  if (repository) {
    return repository;
  }

  repository = isNativeRuntime() ? sqliteBudgetRepository : indexedDbBudgetRepository;
  return repository;
}

export async function createBudgetYear(input: CreateBudgetYearInput): Promise<BudgetYear> {
  return getRepository().createBudgetYear(input);
}

export async function getLatestBudgetYear(): Promise<BudgetYear | null> {
  return getRepository().getLatestBudgetYear();
}

export async function getBudgetYearByYear(year: number): Promise<BudgetYear | null> {
  return getRepository().getBudgetYearByYear(year);
}

export async function createBudgetMonth(input: CreateBudgetMonthInput): Promise<BudgetMonth> {
  return getRepository().createBudgetMonth(input);
}

export async function getBudgetMonth(
  budgetYearId: string,
  month: number,
): Promise<BudgetMonth | null> {
  return getRepository().getBudgetMonth(budgetYearId, month);
}

export async function createBudgetAllocation(
  input: CreateBudgetAllocationInput,
): Promise<BudgetAllocation> {
  return getRepository().createBudgetAllocation(input);
}

export async function addExpenseToAllocation(
  input: AddExpenseToAllocationInput,
): Promise<BudgetAllocation> {
  return getRepository().addExpenseToAllocation(input);
}

export async function addExpense(input: CreateExpenseInput): Promise<Expense> {
  return getRepository().addExpense(input);
}

export async function updateExpense(input: UpdateExpenseInput): Promise<Expense> {
  return getRepository().updateExpense(input);
}

export async function deleteExpense(input: DeleteExpenseInput): Promise<void> {
  return getRepository().deleteExpense(input);
}

export async function updateMonthlyIncomeFromMonth(
  input: UpdateMonthlyIncomeFromMonthInput,
): Promise<void> {
  return getRepository().updateMonthlyIncomeFromMonth(input);
}

export async function getExpensesByMonthAndGroup(
  budgetMonthId: string,
  group: GroupType,
): Promise<Expense[]> {
  return getRepository().getExpensesByMonthAndGroup(budgetMonthId, group);
}

export async function getCategoriesByGroup(
  group: GroupType,
  options?: { includeInactive?: boolean },
): Promise<Category[]> {
  return getRepository().getCategoriesByGroup(group, options);
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  return getRepository().createCategory(input);
}

export async function updateCategoryName(input: UpdateCategoryNameInput): Promise<void> {
  return getRepository().updateCategoryName(input);
}

export async function softDeleteCategoryAndReassign(input: {
  group: GroupType;
  categoryId: CategoryId;
  replacementCategoryId: CategoryId;
}): Promise<void> {
  return getRepository().softDeleteCategoryAndReassign(input);
}

export async function getAllocationsByMonth(budgetMonthId: string): Promise<BudgetAllocation[]> {
  return getRepository().getAllocationsByMonth(budgetMonthId);
}

export async function createYearWithAllocations(
  monthlyIncome: number,
  year: number,
  currency: SupportedCurrency,
): Promise<{ budgetYear: BudgetYear; months: BudgetMonth[] }> {
  return getRepository().createYearWithAllocations(monthlyIncome, year, currency);
}

/**
 * Whether a usable budget already exists. `getLatestBudgetYear()` only resolves
 * a year that has at least one month, so its presence is the full answer. Used
 * by the router first-run guard and to skip the setup screen.
 */
export async function budgetExists(): Promise<boolean> {
  return (await getLatestBudgetYear()) !== null;
}

export async function exportDatabase(): Promise<BudgetDatabaseSnapshot> {
  return getRepository().exportDatabase();
}

export async function importDatabase(snapshot: unknown): Promise<void> {
  return getRepository().importDatabase(snapshot);
}
